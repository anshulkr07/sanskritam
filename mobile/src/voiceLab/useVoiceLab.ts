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
  const [bargeAvailable, setBargeAvailable] = useState(false);
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
  const supportsPlaybackFeedback = useRef(false);
  const playbackReported = useRef(false);
  const supportsBargeIn = useRef(false);
  const bargePending = useRef(false);
  const bargeFrames = useRef<ArrayBuffer[]>([]);
  const ignoreReplyAudio = useRef(false);
  const interruptionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const responseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      if (playbackReported.current) { playbackReported.current = false; send({ type: "playback", busy: false }); }
    }, 500);
  }, [send]);
  const onPlaybackBusy = useCallback((busy: boolean) => {
    if (busy && ignoreReplyAudio.current) return;
    playbackBusy.current = busy;
    if (busy) {
      if (echoTimer.current !== null) clearTimeout(echoTimer.current);
      const began = !speakerActive.current;
      echoTimer.current = null; speakerActive.current = true;
      if (began) input.current.reset();
      setSpeaking(true);
      if (supportsPlaybackFeedback.current && !playbackReported.current) {
        playbackReported.current = true; send({ type: "playback", busy: true });
      }
    } else releaseMicrophone();
  }, [releaseMicrophone, send]);
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
    supportsPlaybackFeedback.current = false; playbackReported.current = false;
    supportsBargeIn.current = false; bargePending.current = false;
    if (interruptionTimer.current !== null) clearTimeout(interruptionTimer.current);
    interruptionTimer.current = null;
    if (responseTimer.current !== null) clearTimeout(responseTimer.current);
    responseTimer.current = null;
    bargeFrames.current = []; ignoreReplyAudio.current = false; setBargeAvailable(false);
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
  const beginBargeIn = useCallback((frames: ArrayBuffer[] = []) => {
    if (!supportsBargeIn.current || bargePending.current) return;
    bargePending.current = true; bargeFrames.current = frames;
    ignoreReplyAudio.current = true;
    if (echoTimer.current !== null) clearTimeout(echoTimer.current);
    echoTimer.current = null; replyPending.current = false;
    playbackBusy.current = false; speakerActive.current = false;
    input.current.reset(); setSpeaking(false); setThinking(false);
    sink.current?.send({ type: "stop" }); send({ type: "barge_in" });
    if (responseTimer.current !== null) clearTimeout(responseTimer.current);
    responseTimer.current = null;
    interruptionTimer.current = setTimeout(() => {
      if (!bargePending.current) return;
      setError("The voice service did not resume listening. Please start another call."); stop();
    }, 5000);
  }, [send, sink, stop]);
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
        ws.send(JSON.stringify({ ticket: ticket.ticket, config: applied.current, capabilities: { playback_feedback: true, barge_in: true, client_endpointing: true } }));
      };
      ws.onmessage = e => {
        if (epoch !== generation.current) return;
        let msg: any;
        try { msg = JSON.parse(String(e.data)); } catch { return; }
        if (msg.type === "ready") {
          if (ready.current) return;
          ready.current = true;
          supportsPlaybackFeedback.current = msg.capabilities?.playback_feedback === true;
          supportsBargeIn.current = msg.capabilities?.barge_in === true;
          setConnectionStatus("Starting microphone…");
          sink.current?.send({ type: "settings", pitch: currentConfig.current.pipeline === 3 ? 0 : currentConfig.current.pitch, loudness: currentConfig.current.loudness });
          void (async () => {
            try {
            const mic = await startMicrophone(buffer => {
              if (epoch !== generation.current || !ready.current || mutedRef.current || ws.readyState !== WebSocket.OPEN) return;
              if (ws.bufferedAmount > 128000) { setError("Network is too slow for live audio."); stop(); return; }
              setBargeAvailable(supportsBargeIn.current && buffer.echoCancelled === true);
              const frame = input.current.process(buffer, speakerActive.current);
              setMicLevel(frame.level);
              if (bargePending.current) {
                bargeFrames.current.push(frame.pcm);
                if (bargeFrames.current.reduce((size, data) => size + data.byteLength, 0) > 128000) {
                  setError("The voice connection is too slow to interrupt. Start another call."); stop();
                }
                return;
              }
              if (frame.bargeIn && supportsBargeIn.current) { beginBargeIn(frame.bargeIn); return; }
              // Capture still runs for interruption, but don't send speaker
              // silence to STT or charge the learner while the AI is talking.
              if (!speakerActive.current && frame.pcm.byteLength) ws.send(frame.pcm);
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
          if (ignoreReplyAudio.current) return;
          // Gate capture before the WebView decodes/schedules the first sound.
          replyPending.current = true; onPlaybackBusy(true); setThinking(false);
          sink.current?.send(msg);
        }
        else if (msg.type === "response_started") {
          if (bargePending.current) return;
          ignoreReplyAudio.current = false; replyPending.current = true; setThinking(true); setError("");
          if (responseTimer.current !== null) clearTimeout(responseTimer.current);
          responseTimer.current = setTimeout(() => {
            responseTimer.current = null;
            replyPending.current = false; setThinking(false); releaseMicrophone();
            setError("The reply service took too long. You can interrupt and try again.");
          }, 90000);
        }
        else if (msg.type === "barge_in_ready" && bargePending.current) {
          if (interruptionTimer.current !== null) clearTimeout(interruptionTimer.current);
          interruptionTimer.current = null;
          bargePending.current = false;
          const frames = bargeFrames.current; bargeFrames.current = [];
          if (playbackReported.current) { playbackReported.current = false; send({ type: "playback", busy: false }); }
          input.current.reset();
          if (!mutedRef.current) {
            let ended = false;
            for (const data of frames) {
              ws.send(data);
              ended = input.current.process({ data, sampleRate: 16000, channels: 1 }).endTurn || ended;
            }
            if (ended) send({ type: "end_audio" });
          }
        }
        else if (msg.type === "interrupted") {
          if (responseTimer.current !== null) clearTimeout(responseTimer.current);
          responseTimer.current = null;
          replyPending.current = false; setThinking(false);
          sink.current?.send({ type: "stop" }); onPlaybackBusy(false); activeRole.current = null;
        }
        else if (msg.type === "turn_complete") {
          if (responseTimer.current !== null) clearTimeout(responseTimer.current);
          responseTimer.current = null;
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
          if (responseTimer.current !== null) clearTimeout(responseTimer.current);
          responseTimer.current = null; replyPending.current = false;
          setError(msg.message); setThinking(false); releaseMicrophone(); if (msg.type === "fatal") stop();
        }
      };
      ws.onerror = () => { if (epoch === generation.current) { setError("Cannot connect to Voice Lab."); stop(); } };
      ws.onclose = () => { if (epoch === generation.current) { setError("Voice connection closed. Start another call."); stop(); } };
    } catch (e) {
      if (epoch === generation.current) { setError(e instanceof Error ? e.message : "Could not start call."); stop(); }
    }
  }, [sink, stop, send, onPlaybackBusy, releaseMicrophone, beginBargeIn]);

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
    if (supportsBargeIn.current) { beginBargeIn(); return; }
    replyPending.current = false; setThinking(false);
    sink.current?.send({ type: "stop" }); onPlaybackBusy(false); send({ type: "interrupt" });
  };
  const onAudioError = useCallback((message: string) => { setError(message); stop(); }, [stop]);
  return { state, connectionStatus, error, setError, onAudioError, onPlaybackBusy, speaking, thinking, micLevel, bargeAvailable, transcripts, muted, settingsStatus, notice, start, stop, toggleMute, interrupt, endAudio, send };
}
