import { AudioModule, requestRecordingPermissionsAsync, setAudioModeAsync } from "expo-audio";

export type Microphone = { stop: () => void };
export type MicBuffer = { data: ArrayBuffer; sampleRate: number; channels: number; echoCancelled?: boolean };
export async function microphonePermission(): Promise<void> {
  if (typeof AudioModule.AudioStream !== "function") {
    throw new Error("This app build does not support live microphone streaming. Install a new app build to use Voice Lab.");
  }
  if (!(await requestRecordingPermissionsAsync()).granted) throw new Error("Allow microphone access to start a voice call.");
}
export async function startMicrophone(onBuffer: (buffer: MicBuffer) => void): Promise<Microphone> {
  await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
  const options = { sampleRate: 16000, channels: 1, encoding: "int16", echoCancellation: true };
  const mic = new AudioModule.AudioStream(options);
  const sub = mic.addListener("audioStreamBuffer", onBuffer);
  const stop = () => { sub.remove(); mic.stop(); mic.release(); void setAudioModeAsync({ allowsRecording: false }).catch(() => {}); };
  try { await mic.start(); return { stop }; }
  catch (e) { stop(); throw e; }
}
