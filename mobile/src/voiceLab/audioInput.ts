import type { MicBuffer } from "./microphone";

// Audio-time endpointing: a quiet pause flushes STT even if upstream VAD waits.
// Every frame is still delivered, including soft speech and leading consonants.
export class VoiceInput {
  private speechMs = 0;
  private silenceMs = 0;
  reset() { this.speechMs = 0; this.silenceMs = 0; }
  process(buffer: MicBuffer, suppressed = false) {
    const input = new Int16Array(buffer.data);
    const channels = buffer.channels || 1, rate = buffer.sampleRate || 16000;
    const count = Math.floor(input.length / channels);
    const pcm = new Int16Array(Math.round(count * 16000 / rate));
    let sum = 0;
    for (let i = 0; i < pcm.length; i++) {
      const pos = i * rate / 16000, a = Math.min(Math.floor(pos), count - 1), b = Math.min(a + 1, count - 1);
      pcm[i] = suppressed ? 0 : Math.round(input[a * channels] * (1 - (pos - a)) + input[b * channels] * (pos - a));
      sum += pcm[i] * pcm[i];
    }
    const rms = pcm.length ? Math.sqrt(sum / pcm.length) / 32768 : 0;
    let endTurn = false;
    if (suppressed) this.reset();
    else if (rms >= 0.008) {
      this.speechMs += pcm.length / 16; this.silenceMs = 0;
    } else if (this.speechMs) {
      this.silenceMs += pcm.length / 16;
      if (this.silenceMs >= 900) { endTurn = this.speechMs >= 160; this.reset(); }
    }
    return { pcm: pcm.buffer, level: Math.min(1, rms * 8), endTurn };
  }
}
