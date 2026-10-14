import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { request } from "../api/client";
import { BASE_URL } from "../config";
import { AudioSinkHandle } from "./audioRuntime";
import { LabConfig } from "./config";
import { Microphone, microphonePermission, startMicrophone } from "./microphone";

export type Transcript = { role: "user" | "assistant"; text: string };
export function useVoiceLab(config: LabConfig, sink: React.RefObject<AudioSinkHandle | null>) {
  const [state, setState] = useState<"idle" | "connecting" | "live">("idle");
  const [error, setError] = useState("");
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [muted, setMuted] = useState(false);
  const [settingsStatus, setSettingsStatus] = useState("");
  const [notice, setNotice] = useState("");
  const socket = useRef<WebSocket | null>(null);
  const stream = useRef<Microphone | null>(null);
  const ready = useRef(false);
  const mutedRef = useRef(false);
  const generation = useRef(0);
  const currentConfig = useRef(config);
  const applied = useRef(config);
  const activeRole = useRef<string | null>(null);
  currentConfig.current = config;

  const send = useCallback((message: object) => {
    if (ready.current && socket.current?.readyState === WebSocket.OPEN) socket.current.send(JSON.stringify(message));
  }, []);
  const stop = useCallback(() => {
    generation.current++;
    ready.current = false;
    try { stream.current?.stop(); } catch { /* already stopped */ }
    stream.current = null;
    const ws = socket.current; socket.current = null;
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "stop" }));
    ws?.close();
    sink.current?.send({ type: "stop" });
    setState("idle"); setMuted(false); mutedRef.current = false;
  }, [sink]);
  const start = useCallback(async () => {
    if (socket.current || stream.current) return;
    const epoch = ++generation.current;
    setError(""); setNotice(""); setSettingsStatus(""); setState("connecting"); setTranscripts([]); activeRole.current = null;
    sink.current?.send({ type: "resume" });
    try {
      await microphonePermission();
      if (epoch !== generation.current) return;
      const ticket = await request<{ ticket: string }>("/voice-lab/ticket", { method: "POST" }, true);
      if (epoch !== generation.current) return;
      const url = `${BASE_URL.replace(/^http/, "ws").replace(/\/$/, "")}/ws/voice-lab`;
      const ws = new WebSocket(url); ws.binaryType = "arraybuffer"; socket.current = ws;
      ws.onopen = () => {
        applied.current = currentConfig.current;
        ws.send(JSON.stringify({ ticket: ticket.ticket, config: applied.current }));
      };
      ws.onmessage = e => {
        if (epoch !== generation.current) return;
        let msg: any;
        try { msg = JSON.parse(String(e.data)); } catch { return; }
        if (msg.type === "ready") {
          ready.current = true;
          sink.current?.send({ type: "settings", pitch: currentConfig.current.pipeline === 3 ? 0 : currentConfig.current.pitch, loudness: currentConfig.current.loudness });
          void (async () => {
            try {
            const mic = await startMicrophone(buffer => {
              if (!ready.current || mutedRef.current || ws.readyState !== WebSocket.OPEN) return;
              if (ws.bufferedAmount > 128000) { setError("Network is too slow for live audio."); stop(); return; }
              const input = new Int16Array(buffer.data);
              const channels = buffer.channels || 1;
              const rate = buffer.sampleRate || 16000;
              const count = Math.floor(input.length / channels);
              const output = new Int16Array(Math.round(count * 16000 / rate));
              for (let i = 0; i < output.length; i++) {
                const pos = i * rate / 16000, a = Math.min(Math.floor(pos), count - 1), b = Math.min(a + 1, count - 1);
                output[i] = Math.round(input[a * channels] * (1 - (pos - a)) + input[b * channels] * (pos - a));
              }
              ws.send(output.buffer);
            });
            if (epoch === generation.current) { stream.current = mic; setState("live"); } else mic.stop();
            }
            catch { if (epoch === generation.current) { setError("Microphone streaming failed. Use an Expo 57 build with audio support."); stop(); } }
          })();
        } else if (msg.type === "audio") sink.current?.send(msg);
        else if (msg.type === "interrupted") { sink.current?.send({ type: "stop" }); activeRole.current = null; }
        else if (msg.type === "turn_complete") activeRole.current = null;
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
          setError(msg.message); if (msg.type === "fatal") stop();
        }
      };
      ws.onerror = () => { if (epoch === generation.current) { setError("Cannot connect to Voice Lab."); stop(); } };
      ws.onclose = () => { if (epoch === generation.current) { setError("Voice connection closed. Start another call."); stop(); } };
    } catch (e) {
      if (epoch === generation.current) { setError(e instanceof Error ? e.message : "Could not start call."); stop(); }
    }
  }, [sink, stop]);

  useEffect(() => {
    sink.current?.send({ type: "settings", pitch: config.pipeline === 3 ? 0 : config.pitch, loudness: config.loudness });
    if (!ready.current || JSON.stringify(config) === JSON.stringify(applied.current)) return;
    setSettingsStatus("Applying settings…");
    const timer = setTimeout(() => send({ type: "config", config }), 350);
    return () => clearTimeout(timer);
  }, [config, send, sink, state]);
  useEffect(() => {
    const sub = AppState.addEventListener("change", value => { if (value !== "active") stop(); });
    return () => { sub.remove(); stop(); };
  }, [stop]);
  const toggleMute = () => { mutedRef.current = !mutedRef.current; setMuted(mutedRef.current); if (mutedRef.current) send({ type: "end_audio" }); };
  const interrupt = () => { sink.current?.send({ type: "stop" }); send({ type: "interrupt" }); };
  return { state, error, setError, transcripts, muted, settingsStatus, notice, start, stop, toggleMute, interrupt, send };
}
