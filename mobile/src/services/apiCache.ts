// apiCache — the app's first data layer (Track C4).
//
// Every screen fetches with bare useState/useEffect/fetch: no caching, no
// dedupe, no refetch-on-focus, no unmount guard. The step player multiplies
// request count (lessons + steps + attempt per step), and vocab-500 /
// reader-150 will make every list heavier. This module fixes the caching
// half; useQuery.ts owns the lifecycle half.
//
// Scope, honestly: in-memory GET cache (60s TTL) + in-flight dedupe. True
// request cancellation is NOT here — api/client.ts request() takes no
// AbortSignal, so unmount safety is "never setState after unmount" in the
// hook, not an aborted fetch. Threading signals through every api function
// is the follow-up, not this pass.

interface Entry {
  at: number;
  data: unknown;
}

const cache = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

export const API_CACHE_TTL_MS = 60_000;

export async function cachedGet<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = API_CACHE_TTL_MS,
): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) {
    return hit.data as T;
  }
  const running = inflight.get(key);
  if (running) {
    return running as Promise<T>;
  }
  const p = fetcher().then(
    (data) => {
      cache.set(key, { at: Date.now(), data });
      inflight.delete(key);
      return data;
    },
    (err: unknown) => {
      inflight.delete(key);
      throw err;
    },
  );
  inflight.set(key, p);
  return p;
}

/** The cached value for `key` while it is still fresh — never fetches. */
export function peekCache<T>(key: string, ttlMs: number = API_CACHE_TTL_MS): T | undefined {
  const hit = cache.get(key);
  return hit && Date.now() - hit.at < ttlMs ? (hit.data as T) : undefined;
}

/** Drop cached entries. No prefix = drop everything (e.g. after login). */
export function invalidateCache(prefix?: string): void {
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}
