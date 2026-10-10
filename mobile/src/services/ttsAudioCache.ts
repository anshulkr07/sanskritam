import type { TTSResponse } from "../api/client";

// Session-only audio: repeated verses and answers avoid a second server trip.
// Bound by encoded audio size as well as entry count; failures are never kept.
export class TtsAudioCache {
  private cache = new Map<string, TTSResponse>();
  private inflight = new Map<string, Promise<TTSResponse>>();
  private size = 0;

  constructor(private maxChars = 4 * 1024 * 1024, private maxEntries = 80) {}

  get(key: string, fetcher: () => Promise<TTSResponse>): Promise<TTSResponse> {
    const hit = this.cache.get(key);
    if (hit) {
      this.cache.delete(key);
      this.cache.set(key, hit);
      return Promise.resolve(hit);
    }
    const pending = this.inflight.get(key);
    if (pending) return pending;
    const request = Promise.resolve().then(fetcher).then((audio) => {
      const length = audio.audio_base64?.length ?? 0;
      if (length > 0 && length <= this.maxChars / 4 && this.maxEntries > 0) {
        this.cache.set(key, audio);
        this.size += length;
        while (this.size > this.maxChars || this.cache.size > this.maxEntries) {
          const oldest = this.cache.keys().next().value;
          if (oldest === undefined) break;
          this.size -= this.cache.get(oldest)!.audio_base64.length;
          this.cache.delete(oldest);
        }
      }
      return audio;
    }).finally(() => this.inflight.delete(key));
    this.inflight.set(key, request);
    return request;
  }
}
