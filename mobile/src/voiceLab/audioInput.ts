import type { MicBuffer } from "./microphone";

// Audio-time endpointing: a quiet pause flushes STT even if upstream VAD waits.
// Every frame is still delivered, including soft speech and leading consonants.
export class VoiceInput {
  private speechMs = 0;
  private silenceMs = 0;
  private bargeMs = 0;
  private bargeGapMs = 0;
  private preRoll: Int16Array[] = [];
  private preRollMs = 0;
  reset() { this.speechMs = 0; this.silenceMs = 0; this.resetBarge(); }
  private resetBarge() { this.bargeMs = 0; this.bargeGapMs = 0; this.preRoll = []; this.preRollMs = 0; }
  process(buffer: MicBuffer, suppressed = false) {
    const input = new Int16Array(buffer.data);
    const channels = buffer.channels || 1, rate = buffer.sampleRate || 16000;
    const count = Math.floor(input.length / channels);
    const pcm = new Int16Array(Math.round(count * 16000 / rate));
    let sum = 0;
    for (let i = 0; i < pcm.length; i++) {
      const pos = i * rate / 16000, a = Math.min(Math.floor(pos), count - 1), b = Math.min(a + 1, count - 1);
      pcm[i] = Math.round(input[a * channels] * (1 - (pos - a)) + input[b * channels] * (pos - a));
      sum += pcm[i] * pcm[i];
    }
    const rms = pcm.length ? Math.sqrt(sum / pcm.length) / 32768 : 0;
    let endTurn = false;
    let bargeIn: ArrayBuffer[] | null = null;
    if (suppressed) {
      this.speechMs = 0; this.silenceMs = 0;
      // Never enable loudspeaker barge-in on an unprocessed capture stream.
      if (buffer.echoCancelled && pcm.length) {
        const duration = pcm.length / 16;
        this.preRoll.push(pcm.slice()); this.preRollMs += duration;
        while (this.preRollMs > 1200 && this.preRoll.length > 1) this.preRollMs -= this.preRoll.shift()!.length / 16;
        if (rms >= 0.012) { this.bargeMs += duration; this.bargeGapMs = 0; }
        else {
          this.bargeGapMs += duration;
          if (this.bargeGapMs >= 200) this.bargeMs = 0;
        }
        if (this.bargeMs >= 350) { bargeIn = this.preRoll.map(frame => frame.buffer as ArrayBuffer); this.resetBarge(); }
      } else this.resetBarge();
      pcm.fill(0);
    }
    else if (rms >= 0.008) {
      this.resetBarge();
      this.speechMs += pcm.length / 16; this.silenceMs = 0;
    } else if (this.speechMs) {
      this.silenceMs += pcm.length / 16;
      if (this.silenceMs >= 900) { endTurn = this.speechMs >= 160; this.reset(); }
    }
    // Show capture even while speaker echo is withheld from recognition. A
    // forced zero here made an active microphone look muted during replies.
    return { pcm: pcm.buffer, level: Math.min(1, rms * 8), endTurn, bargeIn };
  }
}
