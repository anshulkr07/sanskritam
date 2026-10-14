// useLiveRecitation: record a recitation with live, provisional captions
// (handover_games_daily_multiplayer §7 "Live STT and audio handling").
//
// The microphone is read as 16-bit PCM through expo-audio's AudioStream
// (present in the shipped build, expo-audio 57). Each buffer is resampled to
// 16 kHz, kept for the final file, and sent to /ws/recite/{ticket}, where
// the server relays it to Sarvam's streaming recogniser and sends captions
// back. Captions are coaching text only and never decide the score: on stop
// the whole recording is written as one WAV file and uploaded for scoring.
//
// If captions cannot start (no network, provider down, allowance used) the
// recording carries on and the screen says so. If the PCM stream itself is
// missing (web) or refuses to start, the ordinary m4a recorder takes over
// and there are no captions.

import { AudioModule, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "../api/client";
import { BASE_URL } from "../config";
import { wsUrl } from "../games/v2/client";
import { buildWav, firstChannel, joinCaptions, level as levelOf, resampleTo16k, toBase64, TARGET_RATE } from "./pcm";

export type CaptionState = "off" | "connecting" | "live" | "unavailable";

type StreamLike = {
  start: () => Promise<void>;
  stop: () => void;
  release?: () => void;
  addListener: (event: string, fn: (payload: never) => void) => { remove: () => void };
};

type Buffer = { data: ArrayBuffer; sampleRate: number; channels: number };

const MAX_SECONDS = 180;

export function useLiveRecitation(opts: { captions: boolean }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [lvl, setLvl] = useState(0);
  const [captionParts, setCaptionParts] = useState<string[]>([]);
  const [captionState, setCaptionState] = useState<CaptionState>("off");
  const [mode, setMode] = useState<"stream" | "recorder" | null>(null);

  const recorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 32000,
    android: { ...RecordingPresets.HIGH_QUALITY.android, outputFormat: "mpeg4", audioEncoder: "aac" },
  });

  const streamRef = useRef<StreamLike | null>(null);
  const subsRef = useRef<{ remove: () => void }[]>([]);
  const chunksRef = useRef<Int16Array[]>([]);
  const samplesRef = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);
  const readyRef = useRef(false);
  const backlogRef = useRef<Int16Array[]>([]);
  const lastLevelAt = useRef(0);
  const startedAt = useRef(0);
  const modeRef = useRef<"stream" | "recorder" | null>(null);

  const closeSocket = useCallback((graceMs = 0) => {
    const ws = wsRef.current;
    wsRef.current = null;
    readyRef.current = false;
    backlogRef.current = [];
    if (!ws) return;
    const close = () => { try { ws.close(); } catch { /* closed */ } };
    if (graceMs > 0) setTimeout(close, graceMs);
    else close();
  }, []);

  const openSocket = useCallback(async () => {
    setCaptionState("connecting");
    let ticket = "";
    try {
      ticket = (await api.reciteStreamTicket()).ticket;
    } catch {
      setCaptionState("unavailable");
      return;
    }
    if (modeRef.current !== "stream") return; // stopped meanwhile
    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl(BASE_URL, `/ws/recite/${ticket}`));
    } catch {
      setCaptionState("unavailable");
      return;
    }
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;
    ws.onmessage = (e) => {
      let msg: { type?: string; text?: string };
      try { msg = JSON.parse(String(e.data)); } catch { return; }
      if (msg.type === "ready") {
        readyRef.current = true;
        setCaptionState("live");
        for (const c of backlogRef.current) {
          try { ws.send(c.buffer.slice(c.byteOffset, c.byteOffset + c.byteLength) as ArrayBuffer); } catch { /* closed */ }
        }
        backlogRef.current = [];
      } else if (msg.type === "caption" && msg.text) {
        setCaptionParts((p) => [...p, msg.text as string]);
      } else if (msg.type === "unavailable") {
        readyRef.current = false;
        setCaptionState("unavailable");
      }
    };
    ws.onerror = () => { /* onclose follows */ };
    ws.onclose = () => {
      if (wsRef.current === ws && modeRef.current === "stream") setCaptionState("unavailable");
    };
  }, []);

  const onBuffer = useCallback((buf: Buffer) => {
    if (!buf?.data) return;
    const raw = new Int16Array(buf.data.slice(0));
    const mono = firstChannel(raw, buf.channels || 1);
    const chunk = resampleTo16k(mono, buf.sampleRate || TARGET_RATE);
    chunksRef.current.push(chunk);
    samplesRef.current += chunk.length;
    const now = Date.now();
    if (now - lastLevelAt.current > 120) {
      lastLevelAt.current = now;
      setLvl(levelOf(chunk));
    }
    const ws = wsRef.current;
    if (ws && readyRef.current) {
      try { ws.send(chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength) as ArrayBuffer); } catch { /* closed */ }
    } else if (ws) {
      backlogRef.current.push(chunk);
      if (backlogRef.current.length > 200) backlogRef.current.shift();
    }
  }, []);

  /** Ask for the microphone up front (preflight), never mid-countdown. */
  const preflight = useCallback(async (): Promise<boolean> => {
    try {
      const perm = await requestRecordingPermissionsAsync();
      return !!perm.granted;
    } catch {
      return true; // permission module missing: the start call will surface it
    }
  }, []);

  const start = useCallback(async (): Promise<boolean> => {
    chunksRef.current = [];
    samplesRef.current = 0;
    setCaptionParts([]);
    setSeconds(0);
    setLvl(0);
    try { await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true }); } catch { /* keep */ }
    const Ctor = (AudioModule as unknown as { AudioStream?: new (o: object) => StreamLike }).AudioStream;
    if (Ctor) {
      try {
        const stream = new Ctor({ sampleRate: TARGET_RATE, channels: 1, encoding: "int16" });
        subsRef.current = [stream.addListener("audioStreamBuffer", onBuffer as (p: never) => void)];
        streamRef.current = stream;
        await stream.start();
        modeRef.current = "stream";
        setMode("stream");
        startedAt.current = Date.now();
        setRecording(true);
        if (opts.captions) void openSocket();
        return true;
      } catch {
        subsRef.current.forEach((s) => s.remove());
        subsRef.current = [];
        try { streamRef.current?.release?.(); } catch { /* gone */ }
        streamRef.current = null;
      }
    }
    try {
      await recorder.prepareToRecordAsync();
      recorder.record();
      modeRef.current = "recorder";
      setMode("recorder");
      setCaptionState("off");
      startedAt.current = Date.now();
      setRecording(true);
      return true;
    } catch {
      modeRef.current = null;
      return false;
    }
  }, [onBuffer, openSocket, opts.captions, recorder]);

  /** Stop the microphone and return the recording's file. */
  const stop = useCallback(async (): Promise<{ uri: string | null; ms: number }> => {
    const ms = Date.now() - startedAt.current;
    const m = modeRef.current;
    modeRef.current = null;
    setRecording(false);
    setLvl(0);
    if (m === "stream") {
      try { streamRef.current?.stop(); } catch { /* stopped */ }
      subsRef.current.forEach((s) => s.remove());
      subsRef.current = [];
      try { streamRef.current?.release?.(); } catch { /* gone */ }
      streamRef.current = null;
      const ws = wsRef.current;
      if (ws && readyRef.current) {
        try { ws.send("stop"); } catch { /* closed */ }
        // Keep listening briefly for the last caption, then close.
        wsRef.current = null;
        readyRef.current = false;
        setTimeout(() => { try { ws.close(); } catch { /* closed */ } }, 3000);
      } else {
        closeSocket();
      }
      if (!samplesRef.current) return { uri: null, ms };
      const bytes = buildWav(chunksRef.current);
      chunksRef.current = [];
      const uri = `${FileSystem.cacheDirectory}recite-${Date.now()}.wav`;
      try {
        await FileSystem.writeAsStringAsync(uri, toBase64(bytes), { encoding: FileSystem.EncodingType.Base64 });
        return { uri, ms };
      } catch {
        return { uri: null, ms };
      }
    }
    if (m === "recorder") {
      try {
        await recorder.stop();
        return { uri: recorder.uri ?? null, ms };
      } catch {
        return { uri: null, ms };
      }
    }
    return { uri: null, ms };
  }, [closeSocket, recorder]);

  /** Abandon a recording (leaving the screen, reset). */
  const cancel = useCallback(() => {
    const m = modeRef.current;
    modeRef.current = null;
    setRecording(false);
    if (m === "stream") {
      try { streamRef.current?.stop(); } catch { /* stopped */ }
      subsRef.current.forEach((s) => s.remove());
      subsRef.current = [];
      try { streamRef.current?.release?.(); } catch { /* gone */ }
      streamRef.current = null;
    } else if (m === "recorder") {
      void recorder.stop().catch(() => {});
    }
    chunksRef.current = [];
    closeSocket();
  }, [closeSocket, recorder]);

  // Seconds counter + a hard cap so a forgotten recording cannot run on.
  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setSeconds(Math.floor((Date.now() - startedAt.current) / 1000)), 250);
    return () => clearInterval(t);
  }, [recording]);

  const cancelRef = useRef(cancel);
  cancelRef.current = cancel;
  useEffect(() => () => cancelRef.current(), []);

  return {
    recording,
    seconds,
    level: lvl,
    captions: joinCaptions(captionParts),
    captionState,
    mode,
    maxSeconds: MAX_SECONDS,
    preflight,
    start,
    stop,
    cancel,
  };
}
