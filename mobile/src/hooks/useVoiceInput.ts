// useVoiceInput — the shared mic for Talk and Ask.
//
// The recorder preset (16 kHz mono 32 kbps AAC in .m4a, ~4x smaller than
// HIGH_QUALITY stereo) and the record, stop and transcribe flow used to live
// in Conversation.tsx. Talk and Ask both use this now: the result goes to the
// tutor in Talk and into the question box in Ask (`display || transcript` so
// the learner can read it and press send).
//
// Error lines are the existing ones: over 30 seconds (413), the voice limit
// (429) and a denied mic.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  useAudioRecorder,
} from "expo-audio";

import { ApiError, api } from "../api/client";
import { haptics } from "../services/haptics";
import { settledRecordingUri } from "../utils/recording";

export interface VoiceResult {
  transcript: string;
  display: string;
  language_code: string;
}

export type VoiceStage = "stop" | "flush" | "stt";

export function useVoiceInput({
  disabled,
  onResult,
  onError,
  onProgress,
}: {
  /** While true the mic cannot start (it can always stop). */
  disabled?: boolean;
  onResult: (r: VoiceResult) => void;
  /** One line: what happened and what to do. */
  onError: (message: string) => void;
  /** Telemetry hook: stop, flush, stt. */
  onProgress?: (stage: VoiceStage) => void;
}): {
  recording: boolean;
  busy: boolean;
  toggle: () => void;
} {
  // STT preset: 16kHz mono 32kbps AAC in the same .m4a container — ~4x
  // smaller than HIGH_QUALITY stereo 44.1kHz, same codec Saaras already
  // accepts. STT needs words, not fidelity (Varnamala keeps HIGH_QUALITY
  // because retroflex-vs-dental scoring does need it).
  const recorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 32000,
    ios: { ...RecordingPresets.HIGH_QUALITY.ios, audioQuality: 32 },
    android: {
      ...RecordingPresets.HIGH_QUALITY.android,
      outputFormat: "mpeg4",
      audioEncoder: "aac",
    },
    web: { ...RecordingPresets.HIGH_QUALITY.web, bitsPerSecond: 32000 },
  });

  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  useEffect(
    () => () => {
      busyRef.current = false;
    },
    [],
  );

  const toggle = useCallback(() => {
    if (busyRef.current) return;

    if (recording) {
      haptics.press();
      setRecording(false);
      busyRef.current = true;
      setBusy(true);
      (async () => {
        try {
          await recorder.stop();
          onProgressRef.current?.("stop");
          const uri = await settledRecordingUri(recorder);
          onProgressRef.current?.("flush");
          if (!uri) throw new Error("No recording URI — recorder.uri is null after stop()");

          // Auto-detect, NOT a pinned language. Pinning "sa-IN" forces a
          // Kannada or Telugu speaker through a Sanskrit model and gets
          // back mush; plain auto-detect fails the other way (v4 turns
          // spoken Sanskrit into English), so the server runs three passes
          // and keeps the faithful transcript plus the mix as it was said.
          const result = await api.stt(uri, "recording.m4a", "audio/m4a", "unknown");
          onProgressRef.current?.("stt");
          const transcript = result.transcript?.trim() ?? "";
          if (!transcript) {
            onErrorRef.current("I couldn't hear that clearly. Try again?");
            return;
          }
          onResultRef.current({
            transcript,
            display: result.display?.trim() ?? "",
            language_code: result.language_code || "",
          });
        } catch (err: unknown) {
          console.error("[STT] Error:", err);
          // A network failure is a SYSTEM failure, never a wrong answer.
          // Two refusals are not network failures: Saaras transcribes at
          // most 30 s (413), and the voice quota (429).
          haptics.near();
          const status = err instanceof ApiError ? err.status : 0;
          onErrorRef.current(
            status === 413
              ? "Too long. Keep it under 30 seconds."
              : status === 429
                ? "Voice limit reached. You can still type."
                : "Couldn't send that. Say it again?",
          );
        } finally {
          busyRef.current = false;
          setBusy(false);
        }
      })();
      return;
    }

    if (disabled) return;
    haptics.tap();
    (async () => {
      try {
        const perm = await requestRecordingPermissionsAsync();
        if (!perm.granted) {
          onErrorRef.current("Microphone access denied. Please allow it in settings.");
          return;
        }
        await recorder.prepareToRecordAsync();
        recorder.record();
        setRecording(true);
      } catch (err: unknown) {
        console.error("[MIC] Start error:", err);
        onErrorRef.current("The microphone did not start. Try again?");
      }
    })();
  }, [busyRef, disabled, recording, recorder]);

  return { recording, busy, toggle };
}
