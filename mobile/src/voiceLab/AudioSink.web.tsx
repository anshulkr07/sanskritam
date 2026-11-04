import React, { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { AUDIO_HTML, AudioSinkHandle } from "./audioRuntime";

export default forwardRef<AudioSinkHandle, { onError: (message: string) => void; onPlaybackBusy: (busy: boolean) => void }>(function AudioSink({ onError, onPlaybackBusy }, ref) {
  const frame = useRef<HTMLIFrameElement>(null);
  useImperativeHandle(ref, () => ({ send: command => {
    // Invoke directly while the Start button's user activation is alive.
    // A postMessage alone loses that activation on Safari audio playback.
    const target = frame.current?.contentWindow as (Window & { voiceLabCommand?: (message: unknown) => void }) | null;
    if (target?.voiceLabCommand) target.voiceLabCommand(command);
    else target?.postMessage(command, "*");
  } }), []);
  useEffect(() => {
    const listener = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow) return;
      if (e.data?.voiceLabAudioError) onError(e.data.voiceLabAudioError);
      if (typeof e.data?.voiceLabPlaybackBusy === "boolean") onPlaybackBusy(e.data.voiceLabPlaybackBusy);
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [onError, onPlaybackBusy]);
  return <iframe ref={frame} title="Voice playback" srcDoc={AUDIO_HTML} allow="autoplay" style={{ width: 1, height: 1, border: 0, position: "absolute", opacity: 0 }} />;
});
