// Cached calendars per (rounded place, tradition, lang, tz, window).
// Home/list render from cache first, so they work offline. Cached dates are
// reclassified against the current date on every read: an offline calendar
// from yesterday still labels today correctly, and stale timings are never
// presented as freshly verified.

import AsyncStorage from "@react-native-async-storage/async-storage";

import { parvaBasic, parvaCalendar, parvaPage, type ParvaBasic, type ParvaCalendar, type ParvaPageBody } from "./api";
import { cacheKey, round1, windowCovers, type ParvaCacheKey } from "./keys";

export { cacheKey, round1, windowCovers, type ParvaCacheKey };

interface Stored {
  fetched: string;
  fetchedAt?: number;
  tz: string;
  start: string;
  days: number;
  stale?: boolean;
  data: ParvaCalendar;
}

interface PageStored {
  fetchedAt: number;
  data: ParvaPageBody;
}

// Availability can change during the day when a festival page is published.
const FRESH_MS = 5 * 60 * 1000;
const PAGE_FRESH_MS = 30 * 60 * 1000;
const calendarRequests = new Map<string, Promise<ParvaCalendar | null>>();

export async function readParvaCache(
  k: ParvaCacheKey,
  opts: { tz: string; start: string; days: number },
): Promise<Stored | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(k, { tz: opts.tz, start: opts.start, days: opts.days }));
    if (!raw) {
      // Fall back to the legacy v1 key once, so existing installs keep
      // their dates across the upgrade (reclassified below).
      const legacy = await AsyncStorage.getItem(
        `shabd.parva.${round1(k.lat)}_${round1(k.lon)}_${k.tradition}_${k.lang}`,
      ).catch(() => null);
      if (!legacy) return null;
      const s = JSON.parse(legacy) as Stored;
      if (!s || !s.fetched || !s.data) return null;
      return s;
    }
    const s = JSON.parse(raw) as Stored;
    if (!s || !s.fetched || !s.data) return null;
    return s;
  } catch {
    return null;
  }
}

function todayKey(tz: string, at?: Date): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(at ?? new Date());
  } catch {
    return (at ?? new Date()).toISOString().slice(0, 10);
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
  const s: Stored = { fetched: todayKey(opts.tz), fetchedAt: Date.now(), tz: opts.tz, start: opts.start, days: opts.days, data };
  try {
    await AsyncStorage.setItem(cacheKey(k, { tz: opts.tz, start: opts.start, days: opts.days }), JSON.stringify(s));
  } catch {
    /* cache is best effort */
  }
  return data;
}

/** Cached calendar when fresh and covering, else refetched. Null when offline and empty. */
export async function getParvaCalendar(
  k: ParvaCacheKey,
  opts: { start: string; days: number; tz: string; label?: string },
): Promise<ParvaCalendar | null> {
  // Home, preference loading and the festival list can request the same
  // expensive calendar together, before any of them has populated storage.
  const key = cacheKey(k, opts);
  const running = calendarRequests.get(key);
  if (running) return running;
  const pending = loadParvaCalendar(k, opts);
  calendarRequests.set(key, pending);
  try {
    return await pending;
  } finally {
    calendarRequests.delete(key);
  }
}

async function loadParvaCalendar(
  k: ParvaCacheKey,
  opts: { start: string; days: number; tz: string; label?: string },
): Promise<ParvaCalendar | null> {
  const cached = await readParvaCache(k, { tz: opts.tz, start: opts.start, days: opts.days });
  const fresh =
    cached != null &&
    cached.fetched === todayKey(opts.tz) &&
    cached.fetchedAt != null &&
    Date.now() - cached.fetchedAt >= 0 &&
    Date.now() - cached.fetchedAt < FRESH_MS &&
    windowCovers({ start: cached.start || cached.fetched, days: cached.days || opts.days }, opts);
  if (cached && fresh) return cached.data;
  const wantFresh = await refreshParvaCache(k, opts);
  if (wantFresh) return wantFresh;
  // Offline: reclassify cached dates against today; callers rank by the
  // current date, so yesterday's payload still labels today correctly.
  // Timings older than today are kept but the page marks them stale.
  return cached?.data ?? null;
}

function pageKey(k: ParvaCacheKey & { slug: string; variant: string; date?: string; tz: string }): string {
  return `shabd.parva.page.v2.${round1(k.lat)}_${round1(k.lon)}_${k.tradition}_${k.lang}_${k.tz}_${k.slug}_${k.variant}_${k.date ?? ""}`;
}

/** Cached page body when fresh, else refetched. Null when offline and empty. */
export async function getParvaPage(
  k: ParvaCacheKey & { slug: string; variant: string; date?: string; tz: string; tradition: string },
  opts: { year?: number; lat: number; lon: number },
): Promise<ParvaPageBody | null> {
  try {
    const raw = await AsyncStorage.getItem(pageKey(k));
    if (raw) {
      const s = JSON.parse(raw) as PageStored;
      if (s?.data && s.fetchedAt && Date.now() - s.fetchedAt < PAGE_FRESH_MS) return s.data;
    }
  } catch {
    /* fall through to network */
  }
  const data = await parvaPage({
    slug: k.slug,
    variant: k.variant,
    lang: k.lang,
    year: opts.year,
    lat: opts.lat,
    lon: opts.lon,
    tz: k.tz,
    tradition: k.tradition,
    date: k.date,
  });
  if (!data) {
    try {
      const raw = await AsyncStorage.getItem(pageKey(k));
      if (raw) return (JSON.parse(raw) as PageStored).data ?? null;
    } catch {
      return null;
    }
    return null;
  }
  try {
    await AsyncStorage.setItem(pageKey(k), JSON.stringify({ fetchedAt: Date.now(), data } satisfies PageStored));
  } catch {
    /* best effort */
  }
  return data;
}

export async function getParvaBasic(opts: {
  slug: string;
  variant?: string;
  date?: string;
  year?: number;
  lat: number;
  lon: number;
  tz: string;
  tradition: string;
}): Promise<ParvaBasic | null> {
  return parvaBasic(opts);
}
