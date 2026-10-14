import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { request } from "../api/client";
import { BASE_URL } from "../config";
import { AudioSinkHandle } from "./audioRuntime";
import { LabConfig } from "./config";
import { VoiceInput } from "./audioInput";
import { Microphone, microphonePermission, startMicrophone } from "./microphone";

export type Transcript = { role: "user" | "assistant"; text: string };
const START_TIMEOUT_MS = 30_000;
export function useVoiceLab(config: LabConfig, sink: React.RefObject<AudioSinkHandle | null>) {
  const [state, setState] = useState<"idle" | "connecting" | "live">("idle");
  const [connectionStatus, setConnectionStatus] = useState("");
  const [error, setError] = useState("");
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [muted, setMuted] = useState(false);
  const [settingsStatus, setSettingsStatus] = useState("");
  const [notice, setNotice] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const socket = useRef<WebSocket | null>(null);
  const stream = useRef<Microphone | null>(null);
  const ready = useRef(false);
  const mutedRef = useRef(false);
  const generation = useRef(0);
  const starting = useRef(false);
  const permissionPending = useRef(false);
  const awaitingForeground = useRef<(() => void) | null>(null);
  const startTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ticketRequest = useRef<AbortController | null>(null);
  const currentConfig = useRef(config);
  const applied = useRef(config);
  const activeRole = useRef<string | null>(null);
  const input = useRef(new VoiceInput());
  const replyPending = useRef(false);
  const playbackBusy = useRef(false);
  const speakerActive = useRef(false);
  const echoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  currentConfig.current = config;

  const send = useCallback((message: object) => {
    if (ready.current && socket.current?.readyState === WebSocket.OPEN) socket.current.send(JSON.stringify(message));
  }, []);
  const releaseMicrophone = useCallback(() => {
    if (replyPending.current || playbackBusy.current || !speakerActive.current) return;
    if (echoTimer.current !== null) clearTimeout(echoTimer.current);
    // Let the last sound and the room's speaker echo fade before listening.
    echoTimer.current = setTimeout(() => {
      echoTimer.current = null; speakerActive.current = false;
      input.current.reset(); setSpeaking(false);
    }, 500);
  }, []);
  const onPlaybackBusy = useCallback((busy: boolean) => {
    playbackBusy.current = busy;
    if (busy) {
      if (echoTimer.current !== null) clearTimeout(echoTimer.current);
      echoTimer.current = null; speakerActive.current = true;
      input.current.reset(); setSpeaking(true); setMicLevel(0);
    } else releaseMicrophone();
  }, [releaseMicrophone]);
  const stop = useCallback(() => {
    generation.current++;
    starting.current = false;
    permissionPending.current = false;
    const resume = awaitingForeground.current; awaitingForeground.current = null;
    resume?.();
    if (startTimer.current !== null) clearTimeout(startTimer.current);
    startTimer.current = null;
    ticketRequest.current?.abort(); ticketRequest.current = null;
    ready.current = false;
    if (echoTimer.current !== null) clearTimeout(echoTimer.current);
    echoTimer.current = null; replyPending.current = false;
    playbackBusy.current = false; speakerActive.current = false;
    input.current.reset(); setSpeaking(false); setThinking(false); setMicLevel(0);
    try { stream.current?.stop(); } catch { /* already stopped */ }
    stream.current = null;
    const ws = socket.current; socket.current = null;
    try { if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "stop" })); } catch { /* transport failed */ }
    try { ws?.close(); } catch { /* already closed */ }
    try { sink.current?.send({ type: "stop" }); } catch { /* playback unavailable */ }
    setState("idle"); setConnectionStatus(""); setMuted(false); mutedRef.current = false;
  }, [sink]);
  const start = useCallback(async () => {
    if (starting.current || socket.current || stream.current) return;
    const epoch = ++generation.current;
    starting.current = true;
    setError(""); setNotice(""); setSettingsStatus(""); setState("connecting"); setTranscripts([]); activeRole.current = null;
    setConnectionStatus("Allow microphone access…");
    startTimer.current = setTimeout(() => {
      if (epoch !== generation.current) return;
      setError("Voice call took too long to start. Check microphone permission and your connection, then try again.");
      stop();
    }, START_TIMEOUT_MS);
    try {
      sink.current?.send({ type: "resume" });
      permissionPending.current = true;
      await microphonePermission();
      if (epoch !== generation.current) return;
      if (AppState.currentState === "background" || AppState.currentState === "inactive") {
        setConnectionStatus("Return to the app to start your call…");
        await new Promise<void>(resolve => { awaitingForeground.current = resolve; });
        if (epoch !== generation.current) return;
      }
      permissionPending.current = false;
      setConnectionStatus("Connecting to Voice Lab…");
      const controller = new AbortController(); ticketRequest.current = controller;
      const ticket = await request<{ ticket: string }>("/voice-lab/ticket", { method: "POST", signal: controller.signal }, true);
      if (epoch !== generation.current) return;
      ticketRequest.current = null;
      const url = `${BASE_URL.replace(/^http/, "ws").replace(/\/$/, "")}/ws/voice-lab`;
      const ws = new WebSocket(url); ws.binaryType = "arraybuffer"; socket.current = ws;
      ws.onopen = () => {
        if (epoch !== generation.current) { ws.close(); return; }
        setConnectionStatus("Connecting to your companion…");
        applied.current = currentConfig.current;
        ws.send(JSON.stringify({ ticket: ticket.ticket, config: applied.current }));
      };
      ws.onmessage = e => {
        if (epoch !== generation.current) return;
        let msg: any;
        try { msg = JSON.parse(String(e.data)); } catch { return; }
        if (msg.type === "ready") {
          if (ready.current) return;
          ready.current = true;
          setConnectionStatus("Starting microphone…");
          sink.current?.send({ type: "settings", pitch: currentConfig.current.pipeline === 3 ? 0 : currentConfig.current.pitch, loudness: currentConfig.current.loudness });
          void (async () => {
            try {
            const mic = await startMicrophone(buffer => {
              if (epoch !== generation.current || !ready.current || mutedRef.current || ws.readyState !== WebSocket.OPEN) return;
              if (ws.bufferedAmount > 128000) { setError("Network is too slow for live audio."); stop(); return; }
              const frame = input.current.process(buffer, speakerActive.current);
              setMicLevel(frame.level);
              if (frame.pcm.byteLength) ws.send(frame.pcm);
              if (frame.endTurn) send({ type: "end_audio" });
            });
            if (epoch === generation.current) {
              stream.current = mic; starting.current = false;
              if (startTimer.current !== null) clearTimeout(startTimer.current);
              startTimer.current = null; setConnectionStatus(""); setState("live");
            } else mic.stop();
            }
            catch (e) { if (epoch === generation.current) { setError(e instanceof Error ? e.message : "Microphone streaming failed. Check microphone access and try again."); stop(); } }
          })();
        } else if (msg.type === "audio") {
          // Gate capture before the WebView decodes/schedules the first sound.
          replyPending.current = true; onPlaybackBusy(true); setThinking(false);
          sink.current?.send(msg);
        }
        else if (msg.type === "response_started") { replyPending.current = true; setThinking(true); setError(""); }
        else if (msg.type === "interrupted") {
          replyPending.current = false; setThinking(false);
          sink.current?.send({ type: "stop" }); onPlaybackBusy(false); activeRole.current = null;
        }
        else if (msg.type === "turn_complete") {
          replyPending.current = false; setThinking(false); releaseMicrophone(); activeRole.current = null;
        }
        else if (msg.type === "config_applied") { applied.current = msg.config; setSettingsStatus("Settings applied"); }
        else if (msg.type === "notice") setNotice(msg.message);
        else if (msg.type === "transcript") {
          const append = activeRole.current === msg.role && !msg.final;
          activeRole.current = msg.final ? null : msg.role;
          setTranscripts(previous => {
            const next = [...previous];
            if (append && next.length) next[next.length - 1] = { role: msg.role, text: next[next.length - 1].text + msg.text };
            else next.push({ role: msg.role, text: msg.text });
            return next.slice(-60);
          });
        } else if (msg.type === "error" || msg.type === "fatal") {
          setError(msg.message); setThinking(false); if (msg.type === "fatal") stop();
        }
      };
      ws.onerror = () => { if (epoch === generation.current) { setError("Cannot connect to Voice Lab."); stop(); } };
      ws.onclose = () => { if (epoch === generation.current) { setError("Voice connection closed. Start another call."); stop(); } };
    } catch (e) {
      if (epoch === generation.current) { setError(e instanceof Error ? e.message : "Could not start call."); stop(); }
    }
  }, [sink, stop, send, onPlaybackBusy, releaseMicrophone]);

  useEffect(() => {
    sink.current?.send({ type: "settings", pitch: config.pipeline === 3 ? 0 : config.pitch, loudness: config.loudness });
    if (!ready.current || JSON.stringify(config) === JSON.stringify(applied.current)) return;
    setSettingsStatus("Applying settings…");
    const timer = setTimeout(() => send({ type: "config", config }), 350);
    return () => clearTimeout(timer);
  }, [config, send, sink, state]);
  useEffect(() => {
    // Permission UI can report inactive on iOS or background on Android. Wait
    // for foreground before connecting; subsequent backgrounding ends the call.
    const sub = AppState.addEventListener("change", value => {
      if (value === "active") {
        const resume = awaitingForeground.current; awaitingForeground.current = null;
        resume?.();
      } else if (value === "background" && !permissionPending.current) stop();
    });
    return () => { sub.remove(); stop(); };
  }, [stop]);
  const endAudio = () => { input.current.reset(); send({ type: "end_audio" }); };
  const toggleMute = () => { mutedRef.current = !mutedRef.current; setMuted(mutedRef.current); if (mutedRef.current) { setMicLevel(0); endAudio(); } };
  const interrupt = () => {
    replyPending.current = false; setThinking(false);
    sink.current?.send({ type: "stop" }); onPlaybackBusy(false); send({ type: "interrupt" });
  };
  const onAudioError = useCallback((message: string) => { setError(message); stop(); }, [stop]);
  return { state, connectionStatus, error, setError, onAudioError, onPlaybackBusy, speaking, thinking, micLevel, transcripts, muted, settingsStatus, notice, start, stop, toggleMute, interrupt, endAudio, send };
}
