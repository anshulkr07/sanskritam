// Full-screen ads after games (owner, 2026-11-06): one after every second
// finished game, at least three minutes apart, shown when the player closes
// the results, never during a game. AdMob asks for no more than one
// interstitial per two user actions, at natural breaks; a finished game is
// the break its guidance names. Paying members and builds without an
// interstitial unit get none (loadInterstitial returns null).

import { loadInterstitial, type ShowableAd } from "./ads";
import { ADS_ENABLED } from "./adsState";

export const EVERY_GAMES = 2;
export const MIN_GAP_MS = 3 * 60_000;
const STALE_MS = 50 * 60_000; // Google: loaded ads expire after an hour
const RETRY_MS = 60_000;

let finished = 0;
let lastShownAt = 0;
let ready: { ad: ShowableAd; at: number } | null = null;
let loading = false;
let failedAt = 0;

const due = (now: number) => ADS_ENABLED && finished >= EVERY_GAMES && now - lastShownAt >= MIN_GAP_MS;

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

export const gameAds = {
  /** The results of a game are on screen. Loads an ad when the next close is due. */
  finished(now = Date.now()): void {
    finished += 1;
    if (due(now)) preload(now);
  },

  /** The player closed the results (Play again or Done): show the ad if one
   *  is due and loaded. Resolves when it closes, or at once when there is none. */
  async afterResults(now = Date.now()): Promise<void> {
    if (!due(now) || !ready || now - ready.at > STALE_MS) return;
    const { ad } = ready;
    ready = null;
    finished = 0;
    lastShownAt = now;
    await ad.show();
  },

  /** For tests. */
  resetForTest(): void {
    finished = 0; lastShownAt = 0; ready = null; loading = false; failedAt = 0;
  },
};
