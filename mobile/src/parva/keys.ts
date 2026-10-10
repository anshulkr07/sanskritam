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

export function cacheKey(k: ParvaCacheKey): string {
  return `shabd.parva.${round1(k.lat)}_${round1(k.lon)}_${k.tradition}_${k.lang}`;
}
