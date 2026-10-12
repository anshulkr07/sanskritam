// Pure cache key helpers, no native imports so check-parva can load them.

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export interface ParvaCacheKey {
  lat: number;
  lon: number;
  tradition: string;
  lang: string;
}

// v2: response shape gained `availability`; keys carry tz + window so a
// 60-day response never satisfies a 120-day request and one timezone's
// midnight never serves another's.
export const PARVA_CACHE_VERSION = "v2";

export function cacheKey(k: ParvaCacheKey, extra?: { tz?: string; start?: string; days?: number }): string {
  const base = `shabd.parva.${PARVA_CACHE_VERSION}.${round1(k.lat)}_${round1(k.lon)}_${k.tradition}_${k.lang}`;
  if (!extra) return base;
  return `${base}_${extra.tz ?? ""}_${extra.start ?? ""}_${extra.days ?? 0}`;
}

/** Coverage check: a cached window only satisfies a request it fully covers. */
export function windowCovers(cached: { start: string; days: number }, want: { start: string; days: number }): boolean {
  if (!cached.start || !want.start) return false;
  if (cached.start > want.start) return false;
  const end = (s: string, d: number): string => {
    const t = new Date(`${s}T00:00:00`);
    t.setDate(t.getDate() + d);
    return t.toISOString().slice(0, 10);
  };
  return end(cached.start, cached.days) >= end(want.start, want.days);
}
