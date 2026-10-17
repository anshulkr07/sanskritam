import { AudioModule, requestRecordingPermissionsAsync, setAudioModeAsync } from "expo-audio";
import { Platform } from "react-native";
import { startCallAudio } from "./callAudio";
import type { AudioSinkHandle } from "./audioRuntime";

export type Microphone = { stop: () => void };
export type MicBuffer = { data: ArrayBuffer; sampleRate: number; channels: number; echoCancelled?: boolean };
export async function microphonePermission(): Promise<void> {
  if (typeof AudioModule.AudioStream !== "function") {
    throw new Error("This app build does not support live microphone streaming. Install a new app build to use Voice Lab.");
  }
  if (!(await requestRecordingPermissionsAsync()).granted) throw new Error("Allow microphone access to start a voice call.");
}
export async function startMicrophone(onBuffer: (buffer: MicBuffer) => void, sink?: AudioSinkHandle | null): Promise<Microphone> {
  await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
  let releaseCallAudio: (() => void) | undefined;
  let mic: InstanceType<typeof AudioModule.AudioStream> | undefined;
  let sub: { remove: () => void } | undefined;
  let duplexMic: Microphone | undefined;
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    try { duplexMic?.stop(); sub?.remove(); mic?.stop(); }
    finally {
      try { mic?.release(); }
      finally {
        try { releaseCallAudio?.(); }
        finally { void setAudioModeAsync({ allowsRecording: false }).catch(() => {}); }
      }
    }
  };
  try {
    // Expo's default Android audio mode selects MODE_NORMAL. Acquire the call
    // session AFTER that call, so it cannot undo communication routing/AEC.
    releaseCallAudio = await startCallAudio();
    if (Platform.OS === "android") {
      if (!sink?.startCapture) throw new Error("Speakerphone audio is not ready. Reopen the voice call and try again.");
      duplexMic = await sink.startCapture(onBuffer);
      return { stop };
    }
    const options = { sampleRate: 16000, channels: 1, encoding: "int16", echoCancellation: true };
    mic = new AudioModule.AudioStream(options);
    sub = mic.addListener("audioStreamBuffer", onBuffer);
    await mic.start();
    return { stop };
  }
  catch (e) { stop(); throw e; }
}
