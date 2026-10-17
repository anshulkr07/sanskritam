// Headless bindings avoid importing camera effects into the audio-only web app.
export {
  StreamVideoClient,
  OwnCapability,
  CallingState,
} from "@stream-io/video-client";
export {
  StreamVideoProvider as StreamVideo,
  StreamCallProvider as StreamCall,
  useCallStateHooks,
} from "@stream-io/video-react-bindings";
export type { Call } from "@stream-io/video-client";
import React, { useEffect, useRef, useState } from "react";
import { useCallStateHooks } from "@stream-io/video-react-bindings";
import type { StreamVideoParticipant } from "@stream-io/video-client";
export function RemoteAudio() {
  const { useParticipants } = useCallStateHooks();
  return (
    <>
      {useParticipants()
        .filter((p) => !p.isLocalParticipant)
        .map((p) => (
          <AudioTrack key={p.sessionId} participant={p} />
        ))}
    </>
  );
}
function AudioTrack({ participant }: { participant: StreamVideoParticipant }) {
  const ref = useRef<HTMLAudioElement>(null),
    [blocked, setBlocked] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = participant.audioStream || null;
    if (participant.audioStream) void el.play().catch(() => setBlocked(true));
    return () => {
      el.pause();
      el.srcObject = null;
    };
  }, [participant.audioStream]);
  return (
    <>
      <audio ref={ref} autoPlay />
      {blocked && (
        <button
          onClick={() => {
            void ref.current?.play().then(() => setBlocked(false));
          }}
        >
          Tap to hear {participant.name || "room audio"}
        </button>
      )}
    </>
  );
}
