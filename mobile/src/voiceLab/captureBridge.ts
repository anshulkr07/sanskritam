import type { MicBuffer, Microphone } from "./microphone";

// No audio is stored: 100 ms PCM packets cross the local WebView bridge and
// are immediately forwarded through the existing call transport.
function decodePcm(encoded: string): ArrayBuffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const bytes = new Uint8Array(Math.floor(encoded.length * 3 / 4) - (encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0));
  let bits = 0, count = 0, offset = 0;
  for (const char of encoded) {
    if (char === "=") break;
    const value = alphabet.indexOf(char);
    if (value < 0) throw new Error("Invalid microphone audio packet.");
    bits = (bits << 6) | value; count += 6;
    if (count >= 8) { count -= 8; bytes[offset++] = (bits >>> count) & 255; }
  }
  return bytes.buffer;
}

type Capture = {
  id: number; started: boolean; onBuffer: (buffer: MicBuffer) => void;
  resolve: (mic: Microphone) => void; reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

export class CaptureBridge {
  private generation = 0;
  private capture: Capture | null = null;
  constructor(private command: (message: object) => void, private onError: (message: string) => void) {}

  start(onBuffer: (buffer: MicBuffer) => void): Promise<Microphone> {
    this.stop();
    const id = ++this.generation;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.capture?.id === id) this.fail("Speakerphone audio took too long to start. Check microphone access and try again.");
      }, 10000);
      this.capture = { id, onBuffer, resolve, reject, timer, started: false };
      try { this.command({ type: "capture_start", id }); }
      catch (error) { this.fail(error instanceof Error ? error.message : "Speakerphone audio could not start."); }
    });
  }

  stop(id?: number) {
    const capture = this.capture;
    if (!capture || (id !== undefined && capture.id !== id)) return;
    this.capture = null; clearTimeout(capture.timer);
    try { this.command({ type: "capture_stop", id: capture.id }); } catch { /* view already unmounted */ }
    if (!capture.started) capture.reject(new Error("Microphone startup was cancelled."));
  }

  private fail(message: string) {
    const capture = this.capture;
    if (!capture) return;
    this.capture = null; clearTimeout(capture.timer);
    try { this.command({ type: "capture_stop", id: capture.id }); } catch { /* view already unmounted */ }
    if (capture.started) this.onError(message);
    else capture.reject(new Error(message));
  }

  handle(message: any) {
    const capture = this.capture;
    if (!capture) return;
    if (message.voiceLabCaptureStarted === capture.id && !capture.started) {
      if (message.echoCancelled !== true) { this.fail("Speakerphone voice processing did not activate."); return; }
      capture.started = true; clearTimeout(capture.timer);
      capture.resolve({ stop: () => this.stop(capture.id) });
    } else if (message.voiceLabCaptureError === capture.id) this.fail(String(message.message || "Speakerphone audio failed."));
    else if (message.voiceLabCaptureFrame === capture.id && capture.started) {
      try {
        capture.onBuffer({ data: decodePcm(message.data), sampleRate: 16000, channels: 1, echoCancelled: true });
      } catch (error) { this.fail(error instanceof Error ? error.message : "Invalid microphone audio."); }
    }
  }
}
