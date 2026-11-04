import React, { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Platform } from "react-native";
import { WebView } from "react-native-webview";
import { AUDIO_HTML, AudioSinkHandle } from "./audioRuntime";
import { DUPLEX_HTML } from "./duplexRuntime";
import { CaptureBridge } from "./captureBridge";
import { BASE_URL } from "../config";

const baseUrl = BASE_URL.replace(/^http:/, "https:").replace(/\/$/, "") + "/";
const source = { html: Platform.OS === "android" ? DUPLEX_HTML : AUDIO_HTML, baseUrl };
export default forwardRef<AudioSinkHandle, { onError: (message: string) => void; onPlaybackBusy: (busy: boolean) => void }>(function AudioSink({ onError, onPlaybackBusy }, ref) {
  const view = useRef<WebView>(null);
  const errorHandler = useRef(onError); errorHandler.current = onError;
  const capture = useRef<CaptureBridge | null>(null);
  if (!capture.current) capture.current = new CaptureBridge(command => {
    if (!view.current) throw new Error("Speakerphone audio is not ready.");
    view.current.injectJavaScript(`if(window.voiceLabDuplexCommand){window.voiceLabDuplexCommand(${JSON.stringify(command)});}true;`);
  }, message => errorHandler.current(message));
  useImperativeHandle(ref, () => ({
    send: command => view.current?.injectJavaScript(`window.voiceLabCommand(${JSON.stringify(command)});true;`),
    startCapture: Platform.OS === "android" ? onBuffer => capture.current!.start(onBuffer) : undefined,
  }), []);
  useEffect(() => () => capture.current?.stop(), []);
  return <WebView ref={view} source={source} style={{ width: 1, height: 1, opacity: 0 }}
    javaScriptEnabled mediaPlaybackRequiresUserAction={false} allowsInlineMediaPlayback
    onMessage={e => { try { const m = JSON.parse(e.nativeEvent.data); capture.current?.handle(m); if (m.error) onError(m.error); if (typeof m.voiceLabPlaybackBusy === "boolean") onPlaybackBusy(m.voiceLabPlaybackBusy); } catch { /* malformed */ } }} />;
});
