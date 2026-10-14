import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { WebView } from "react-native-webview";
import { AUDIO_HTML, AudioSinkHandle } from "./audioRuntime";

export default forwardRef<AudioSinkHandle, { onError: (message: string) => void }>(function AudioSink({ onError }, ref) {
  const view = useRef<WebView>(null);
  useImperativeHandle(ref, () => ({ send: command => view.current?.injectJavaScript(`window.voiceLabCommand(${JSON.stringify(command)});true;`) }), []);
  return <WebView ref={view} source={{ html: AUDIO_HTML }} style={{ width: 1, height: 1, opacity: 0 }}
    javaScriptEnabled mediaPlaybackRequiresUserAction={false} allowsInlineMediaPlayback
    onMessage={e => { try { const m = JSON.parse(e.nativeEvent.data); if (m.error) onError(m.error); } catch { /* malformed */ } }} />;
});
