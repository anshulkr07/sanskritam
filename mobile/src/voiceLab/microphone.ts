import { AudioModule, requestRecordingPermissionsAsync, setAudioModeAsync } from "expo-audio";

export type Microphone = { stop: () => void };
export type MicBuffer = { data: ArrayBuffer; sampleRate: number; channels: number };
export async function microphonePermission(): Promise<void> {
  if (!(await requestRecordingPermissionsAsync()).granted) throw new Error("Allow microphone access to start a voice call.");
}
export async function startMicrophone(onBuffer: (buffer: MicBuffer) => void): Promise<Microphone> {
  await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
  const mic = new AudioModule.AudioStream({ sampleRate: 16000, channels: 1, encoding: "int16" });
  const sub = mic.addListener("audioStreamBuffer", onBuffer);
  const stop = () => { sub.remove(); mic.stop(); mic.release(); void setAudioModeAsync({ allowsRecording: false }).catch(() => {}); };
  try { await mic.start(); return { stop }; }
  catch (e) { stop(); throw e; }
}
