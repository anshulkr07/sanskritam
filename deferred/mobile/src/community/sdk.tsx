// Metro chooses this adapter only on native. SDK initializes its WebRTC globals.
export {
  StreamVideoClient,
  StreamVideo,
  StreamCall,
  OwnCapability,
  CallingState,
  useCallStateHooks,
} from "@stream-io/video-react-native-sdk";
export type { Call } from "@stream-io/video-client";
import React from "react";
export function RemoteAudio() {
  return null;
} // Native WebRTC plays remote audio.
