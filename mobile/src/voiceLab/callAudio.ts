import { NativeModules, Platform } from "react-native";

// Already included by the Group audio SDK in the shipped Android build.
// The SDK's public callManager.start() only stores config until a Stream call
// joins. Voice Lab has no Stream call, so explicitly acquire its native session.
type CallAudioManager = {
  setAudioRole: (role: string) => void;
  setDefaultAudioDeviceEndpointType: (endpoint: string) => void;
  start: () => void;
  stop: () => void;
  getAudioStateLog?: () => string;
};

export async function startCallAudio(): Promise<() => void> {
  if (Platform.OS !== "android") return () => {};
  const manager = NativeModules.StreamInCallManager as CallAudioManager | undefined;
  if (!manager || typeof manager.start !== "function" || typeof manager.stop !== "function" ||
      typeof manager.setAudioRole !== "function" || typeof manager.setDefaultAudioDeviceEndpointType !== "function") {
    throw new Error("This app build is missing Android call audio support. Install the latest app build.");
  }
  let active = true;
  const stop = () => { if (active) { active = false; manager.stop(); } };
  try {
    manager.setAudioRole("communicator");
    manager.setDefaultAudioDeviceEndpointType("speaker");
    manager.start();
    // Native routing is queued on the SDK's audio thread. Wait for the real
    // mode before creating AudioRecord/AEC, rather than racing that queue.
    if (typeof manager.getAudioStateLog === "function") {
      for (let attempt = 0; attempt < 20; attempt++) {
        if (manager.getAudioStateLog().includes("audio mode: MODE_IN_COMMUNICATION")) return stop;
        await new Promise<void>(resolve => setTimeout(resolve, 50));
      }
      throw new Error("Android call audio did not activate. Restart the app and try again.");
    }
    throw new Error("This app build cannot verify Android call audio. Install the latest app build.");
  } catch (error) {
    stop();
    throw error;
  }
}
