// pcm: plain helpers for the live recitation stream (no React, no native
// modules, so scripts/check-recite.mjs runs them in Node).
//
// The microphone stream (expo-audio AudioStream) hands over 16-bit PCM at
// whatever rate the hardware gives. Live captions and the uploaded file both
// want 16 kHz mono, so buffers are resampled here, sent to the server as raw
// bytes, kept, and written out as one WAV file when the recitation stops.

export const TARGET_RATE = 16000;

/** Linear resample of mono int16 samples to TARGET_RATE. */
export function resampleTo16k(input: Int16Array, rate: number): Int16Array {
  if (!rate || rate === TARGET_RATE || input.length === 0) return input;
  const outLen = Math.max(1, Math.round((input.length * TARGET_RATE) / rate));
  const out = new Int16Array(outLen);
  const step = rate / TARGET_RATE;
  for (let i = 0; i < outLen; i++) {
    const pos = i * step;
    const a = Math.floor(pos);
    const b = Math.min(a + 1, input.length - 1);
    const f = pos - a;
    out[i] = Math.round(input[a] * (1 - f) + input[b] * f);
  }
  return out;
}

/** Keep the first channel of interleaved int16 frames. */
export function firstChannel(input: Int16Array, channels: number): Int16Array {
  if (channels <= 1) return input;
  const out = new Int16Array(Math.floor(input.length / channels));
  for (let i = 0; i < out.length; i++) out[i] = input[i * channels];
  return out;
}

/** A 44-byte RIFF header for mono 16-bit PCM. */
export function wavHeader(dataBytes: number, rate = TARGET_RATE): Uint8Array {
  const h = new DataView(new ArrayBuffer(44));
  const text = (o: number, s: string) => { for (let i = 0; i < s.length; i++) h.setUint8(o + i, s.charCodeAt(i)); };
  text(0, "RIFF");
  h.setUint32(4, 36 + dataBytes, true);
  text(8, "WAVE");
  text(12, "fmt ");
  h.setUint32(16, 16, true);
  h.setUint16(20, 1, true); // PCM
  h.setUint16(22, 1, true); // mono
  h.setUint32(24, rate, true);
  h.setUint32(28, rate * 2, true);
  h.setUint16(32, 2, true);
  h.setUint16(34, 16, true);
  text(36, "data");
  h.setUint32(40, dataBytes, true);
  return new Uint8Array(h.buffer);
}

/** Join chunks into one WAV file's bytes. */
export function buildWav(chunks: Int16Array[], rate = TARGET_RATE): Uint8Array {
  const samples = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(44 + samples * 2);
  out.set(wavHeader(samples * 2, rate), 0);
  let o = 44;
  for (const c of chunks) {
    out.set(new Uint8Array(c.buffer, c.byteOffset, c.byteLength), o);
    o += c.byteLength;
  }
  return out;
}

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Base64 of raw bytes (no reliance on btoa or Buffer being present). */
export function toBase64(bytes: Uint8Array): string {
  const parts: string[] = [];
  const CHUNK = 3 * 4096;
  for (let start = 0; start < bytes.length; start += CHUNK) {
    let s = "";
    const end = Math.min(start + CHUNK, bytes.length);
    for (let i = start; i < end; i += 3) {
      const a = bytes[i];
      const b = i + 1 < end ? bytes[i + 1] : 0;
      const c = i + 2 < end ? bytes[i + 2] : 0;
      const n = (a << 16) | (b << 8) | c;
      s += B64[(n >> 18) & 63] + B64[(n >> 12) & 63]
        + (i + 1 < end ? B64[(n >> 6) & 63] : "=")
        + (i + 2 < end ? B64[n & 63] : "=");
    }
    parts.push(s);
  }
  return parts.join("");
}

/** Root-mean-square level of a chunk, 0..1 (drives the live level meter). */
export function level(chunk: Int16Array): number {
  if (!chunk.length) return 0;
  let sum = 0;
  for (let i = 0; i < chunk.length; i++) sum += chunk[i] * chunk[i];
  return Math.min(1, Math.sqrt(sum / chunk.length) / 8000);
}

/** Live captions arrive one spoken segment at a time; the sequence can
 *  repeat a few letters at a segment edge. Join for display only. */
export function joinCaptions(parts: string[]): string {
  return parts.map((p) => p.trim()).filter(Boolean).join(" ");
}
