// Cached 60 day calendar per (rounded place, tradition, lang), refetched
// daily or when place, tradition or language changes. Home strip renders
// from cache first, so it works offline.

import AsyncStorage from "@react-native-async-storage/async-storage";

import { parvaCalendar, type ParvaCalendar } from "./api";
import { cacheKey, round1, type ParvaCacheKey } from "./keys";

export { cacheKey, round1, type ParvaCacheKey };

interface Stored {
  fetched: string;
  data: ParvaCalendar;
}

export async function readParvaCache(k: ParvaCacheKey): Promise<Stored | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(k));
    if (!raw) return null;
    const s = JSON.parse(raw) as Stored;
    if (!s || !s.fetched || !s.data) return null;
    return s;
  } catch {
    return null;
  }
}

function todayKey(tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export async function refreshParvaCache(
  k: ParvaCacheKey,
  opts: { start: string; days: number; tz: string; label?: string },
): Promise<ParvaCalendar | null> {
  const data = await parvaCalendar({
    start: opts.start,
    days: opts.days,
    lat: round1(k.lat),
    lon: round1(k.lon),
    tz: opts.tz,
    tradition: k.tradition,
    lang: k.lang,
    label: opts.label,
  });
  if (!data) return null;
  const s: Stored = { fetched: todayKey(opts.tz), data };
  try {
    await AsyncStorage.setItem(cacheKey(k), JSON.stringify(s));
  } catch {
    /* cache is best effort */
  }
  return data;
}

/** Cached calendar when fresh, else refetched. Null when offline and empty. */
export async function getParvaCalendar(
  k: ParvaCacheKey,
  opts: { start: string; days: number; tz: string; label?: string },
): Promise<ParvaCalendar | null> {
  const cached = await readParvaCache(k);
  if (cached && cached.fetched === todayKey(opts.tz)) return cached.data;
  const fresh = await refreshParvaCache(k, opts);
  return fresh ?? cached?.data ?? null;
}
