// When the reader gets an ad page (pure, so Node can test it: tests/adRhythm.test.cjs).
//
// One after every EVERY verse pages, and one before "Next chapter", at least
// MIN_GAP_MS apart and none in a session's first FIRST_AFTER turns. A page
// is placed at least two sheets ahead of the reader (after = at + 1 or later),
// so nothing changes under a turning leaf, and never as the last page of a
// book with nothing after it. Loading starts two turns early so the ad is
// ready when it is due; nothing is placed until an ad has loaded.

export const EVERY = 8;
export const MIN_GAP_MS = 3 * 60_000;
export const FIRST_AFTER = 3;

export type Rhythm = { lastShownAt: number; turnsSinceAd: number; sessionTurns: number };

export function nextAdPage(
  r: Rhythm,
  at: number,
  pageCount: number,
  hasNext: boolean,
  placements: { after: number; shown: boolean }[],
  loaded: boolean,
  now: number,
): { preload: boolean; after: number | null } {
  const none = { preload: false, after: null };
  if (pageCount <= 1 || r.sessionTurns < FIRST_AFTER - 1 || now - r.lastShownAt < MIN_GAP_MS) return none;
  // An unseen ad page already waits ahead.
  if (placements.some((p) => p.after >= at && !p.shown)) return none;
  const nearEnd = hasNext && at <= pageCount - 2 && at >= pageCount - 4;
  const preload = r.turnsSinceAd >= EVERY - 2 || nearEnd;
  if (r.sessionTurns < FIRST_AFTER || (r.turnsSinceAd < EVERY && !nearEnd) || !loaded) return { preload, after: null };
  const after = nearEnd ? pageCount - 1 : at + 1;
  if (after <= at || after > pageCount - 1 || (!hasNext && after >= pageCount - 1)) return { preload, after: null };
  if (placements.some((p) => p.after === after)) return { preload, after: null };
  return { preload, after };
}
