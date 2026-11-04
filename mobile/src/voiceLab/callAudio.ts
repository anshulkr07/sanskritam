import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo";

type CallAudio = { start(): void; stop(): void; isActive(): boolean };
export async function startCallAudio(): Promise<() => void> {
  if (Platform.OS !== "android") return () => {};
  const manager = requireOptionalNativeModule<CallAudio>("ShabdCallAudio");
  if (!manager) throw new Error("Install the new app build to use Guru voice.");
  let active = true;
  const stop = () => { if (active) { active = false; manager.stop(); } };
  try {
    manager.start();
    if (!manager.isActive()) throw new Error("Call audio did not activate. Please try again.");
    return stop;
  } catch (error) { stop(); throw error; }
}
