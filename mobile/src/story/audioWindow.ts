// The audio rule for lessons: with a card on screen, its own clips and those of the three cards ahead and the three behind are already buffered, so a swipe never waits on the network.
export const AUDIO_AHEAD = 3;
export const AUDIO_BEHIND = 3;
/** Card positions to keep warm: the one on screen, then ahead (the way a learner mostly goes), then behind. */
export function audioWindow(index: number, total: number, ahead = AUDIO_AHEAD, behind = AUDIO_BEHIND): number[] {
  if (total <= 0) return [];
  const at = Math.min(Math.max(index, 0), total - 1), out = [at];
  for (let k = 1; k <= ahead && at + k < total; k++) out.push(at + k);
  for (let k = 1; k <= behind && at - k >= 0; k++) out.push(at - k);
  return out;
}
/** The clip URLs of those cards, nearest-first and without repeats. */
export function windowClips(cards: { audio?: string[] }[], index: number): string[] {
  const seen = new Set<string>(), urls: string[] = [];
  for (const i of audioWindow(index, cards.length)) for (const url of cards[i].audio ?? []) if (url && !seen.has(url)) { seen.add(url); urls.push(url); }
  return urls;
}
