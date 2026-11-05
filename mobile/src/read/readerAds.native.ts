// Ad pages between book pages (owner, 2026-11-05).
//
// An ad is its own page in the page-turn book, the way a painting gets its own
// page: never between a painting and its verse, never the page a reader is on
// or the one under it. When one is due is read/adRhythm.ts. Google allows
// full-screen native ads between content when they are labelled and the
// content already swipes (AdMob native ads policy).
//
// Nothing is placed until an ad has actually loaded, so a no-fill never leaves
// an empty page. The rhythm lives at module level: it carries across books.

import { useCallback, useEffect, useRef, useState } from "react";
import { useAdEligibility } from "../hooks/useAdEligibility";
import { loadNativeAd, type LoadedNativeAd } from "../services/ads.native";
import { nextAdPage } from "./adRhythm";

export type AdPlacement = { after: number; key: string };

const RETRY_MS = 60_000;
const STALE_MS = 50 * 60_000; // Google asks not to show a native ad loaded over an hour ago

const rhythm = { lastShownAt: 0, turnsSinceAd: 0, sessionTurns: 0 };
let pending: { ad: LoadedNativeAd; at: number } | null = null;
let loading = false;
let failedAt = 0;
let keySeq = 0;
const registry = new Map<string, { ad: LoadedNativeAd; shown: boolean }>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

/** The loaded ad behind an ad page, for SponsoredPage. */
export function getReaderAd(key: string): LoadedNativeAd | null {
  return registry.get(key)?.ad ?? null;
}

function free(key: string): void {
  const entry = registry.get(key);
  registry.delete(key);
  // A beat later: the page that showed it unmounts in the same commit.
  if (entry) setTimeout(() => { try { entry.ad.ad.destroy(); } catch { /* gone */ } }, 1000);
}

function preload(): void {
  if (pending && Date.now() - pending.at > STALE_MS) {
    try { pending.ad.ad.destroy(); } catch { /* gone */ }
    pending = null;
  }
  if (loading || pending || Date.now() - failedAt < RETRY_MS) return;
  loading = true;
  loadNativeAd()
    .then((ad) => {
      if (ad) pending = { ad, at: Date.now() };
      else failedAt = Date.now();
    })
    .catch(() => { failedAt = Date.now(); })
    .finally(() => { loading = false; notify(); });
}

export function useReaderAds({ titleId, chapterKey, at, pageCount, hasNext }: {
  titleId: string; chapterKey: string; at: number; pageCount: number; hasNext: boolean;
}): { placements: AdPlacement[]; onShown: (key: string | null) => void } {
  const policy = useAdEligibility(titleId);
  const [placements, setPlacements] = useState<AdPlacement[]>([]);
  const [tick, setTick] = useState(0);
  const placed = useRef<string[]>([]);
  const lastAt = useRef(at);

  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);

  // A new chapter (or book) starts without ad pages; the old ones are freed.
  useEffect(() => {
    setPlacements([]);
    lastAt.current = at;
    return () => {
      placed.current.forEach(free);
      placed.current = [];
    };
  }, [chapterKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (at === lastAt.current) return;
    lastAt.current = at;
    rhythm.sessionTurns += 1;
    rhythm.turnsSinceAd += 1;
  }, [at]);

  useEffect(() => {
    if (!policy?.allowed) return;
    const seen = placements.map((p) => ({ after: p.after, shown: !!registry.get(p.key)?.shown }));
    const next = nextAdPage(rhythm, at, pageCount, hasNext, seen, !!pending, Date.now());
    if (next.preload) preload();
    if (next.after === null || !pending) return;
    const key = `ad${++keySeq}`;
    registry.set(key, { ad: pending.ad, shown: false });
    pending = null;
    placed.current.push(key);
    const after = next.after;
    setPlacements((prev) => [...prev, { after, key }].sort((a, b) => a.after - b.after));
  }, [at, pageCount, hasNext, policy?.allowed, placements, tick]);

  const onShown = useCallback((key: string | null) => {
    const entry = key ? registry.get(key) : undefined;
    if (!entry || entry.shown) return;
    entry.shown = true;
    rhythm.lastShownAt = Date.now();
    rhythm.turnsSinceAd = 0;
  }, []);

  return { placements, onShown };
}
