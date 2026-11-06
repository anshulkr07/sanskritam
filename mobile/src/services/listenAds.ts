// Full-screen ads in the audiobook player (owner, 2026-11-05/06).
//
// No audio ads: AdMob has no audio format and Google's audio ads need an Ad
// Manager account. Instead, after some listening, an interstitial (image or
// video) shows between two verses, the natural pause AdMob asks for. Only
// while the player screen is in front and the app is open: never over another
// screen, never with the phone locked (AdMob serves no ads in the background),
// so listening with the screen off has no ads at all.
//
// When: the first after half the server's interval (listen_ad_minutes,
// default 10), then every interval, counting time actually playing. It waits
// for a chapter end for up to LATE_MS, then takes any gap between verses. The
// player shows "A short ad, then the chant continues" for NOTICE_MS first, so
// the ad is never a surprise. The ad is loaded a minute before it is due.

import { AppState } from "react-native";
import type { Shloka } from "../api/client";
import { request } from "../api/client";
import { parseRef } from "../utils/verses";
import { loadInterstitial, type ShowableAd } from "./ads";
import { ADS_ENABLED } from "./adsState";

type Policy = { allowed: boolean; listen_ad_minutes?: number };

export const NOTICE_MS = 2_500;
export const LATE_MS = 3 * 60_000;
const REFRESH_MS = 30 * 60_000;
const STALE_MS = 50 * 60_000; // Google: loaded ads expire after an hour
const RETRY_MS = 60_000;
const LOAD_AHEAD_MS = 60_000;

let policy: Policy | null = null;
let policyFor = "";
let fetchedAt = 0;
let fetching = false;
let listenedMs = 0;
let playingSince: number | null = null;
let listenedAtAd = 0;
let shown = 0;
let ready: { ad: ShowableAd; at: number } | null = null;
let loading = false;
let failedAt = 0;
let visible = false;
let isActive = () => AppState.currentState === "active";
let wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function chapterOf(v: Shloka | undefined): number | null {
  if (!v) return null;
  const { nums } = parseRef(v.source_ref);
  return nums.length > 1 ? nums[0] : null;
}

function preload(now: number): void {
  if (ready && now - ready.at > STALE_MS) ready = null;
  if (loading || ready || now - failedAt < RETRY_MS) return;
  loading = true;
  loadInterstitial()
    .then((ad) => {
      if (ad) ready = { ad, at: Date.now() };
      else failedAt = Date.now();
    })
    .catch(() => { failedAt = Date.now(); })
    .finally(() => { loading = false; });
}

export const listenAds = {
  /** The audiobook player is (or is no longer) the screen in front. */
  setPlayerVisible(on: boolean): void {
    visible = on;
  },

  /** Learn (at most every 30 min per title) whether this listener gets ads. */
  prepare(titleId: string, now = Date.now()): void {
    if (!ADS_ENABLED || fetching || !titleId) return;
    if (policyFor === titleId && now - fetchedAt < REFRESH_MS) return;
    fetching = true;
    request<Policy>(`/commerce/ads/eligibility?title_id=${encodeURIComponent(titleId)}`, {}, true)
      .then((p) => { policy = p; })
      .catch(() => { policy = null; })
      .finally(() => { policyFor = titleId; fetchedAt = Date.now(); fetching = false; });
  },

  /** Listening time counts only while something is playing. */
  playing(on: boolean, now = Date.now()): void {
    if (on && playingSince === null) playingSince = now;
    if (!on && playingSince !== null) {
      listenedMs += now - playingSince;
      playingSince = null;
    }
  },

  listened(now = Date.now()): number {
    return listenedMs + (playingSince !== null ? now - playingSince : 0);
  },

  /** A break for an ad after verse `from`, before verse `to`, or null. */
  take(pages: Shloka[], titleId: string, from: number, to: number, now = Date.now()): Promise<void> | null {
    if (!ADS_ENABLED || !policy?.allowed || policyFor !== titleId) return null;
    if (!visible || !isActive()) return null;
    const every = Math.max(5, policy.listen_ad_minutes ?? 10) * 60_000;
    const due = shown === 0 ? every / 2 : every;
    const since = listenAds.listened(now) - listenedAtAd;
    if (since >= due - LOAD_AHEAD_MS) preload(now);
    if (since < due) return null;
    const chapterEnd = chapterOf(pages[from]) !== chapterOf(pages[to]);
    if (!chapterEnd && since < due + LATE_MS) return null;
    if (!ready || now - ready.at > STALE_MS) {
      preload(now);
      return null;
    }
    const taken = ready;
    const listenedNow = listenAds.listened(now); // nothing plays during the break
    ready = null;
    return (async () => {
      await wait(NOTICE_MS);
      // Left the player during the notice: keep the ad for the next gap.
      if (!visible || !isActive()) {
        ready = ready ?? taken;
        return;
      }
      listenedAtAd = listenedNow;
      shown += 1;
      await taken.ad.show();
    })();
  },

  /** For tests. */
  resetForTest(next: { policy?: Policy | null; policyFor?: string; visible?: boolean; active?: () => boolean; wait?: (ms: number) => Promise<void> } = {}): void {
    policy = next.policy ?? null; policyFor = next.policyFor ?? ""; fetchedAt = 0; fetching = false;
    listenedMs = 0; playingSince = null; listenedAtAd = 0; shown = 0;
    ready = null; loading = false; failedAt = 0;
    visible = next.visible ?? false;
    if (next.active) isActive = next.active;
    if (next.wait) wait = next.wait;
  },
};
