// Pure helpers for the word-bank exercise: tokenize a target sentence and
// draw a few plausible-but-wrong tiles from the rest of the register's
// vocabulary so the exercise tests word choice, not just re-typing.

export interface Tile {
  id: string;
  text: string;
}

export function tokenize(sentence: string): string[] {
  return sentence.trim().split(/\s+/).filter(Boolean);
}

/**
 * Build a shuffled tile set: every token from `target`, plus up to
 * `distractorCount` unique words pulled from `corpus` (typically every other
 * challenge's target_sanskrit in the same register) that don't already
 * appear in the target sentence.
 */
export function buildWordBank(target: string, corpus: string[], distractorCount = 3): Tile[] {
  const targetTokens = tokenize(target);
  const targetSet = new Set(targetTokens);

  const candidatePool = Array.from(new Set(corpus.flatMap(tokenize))).filter(
    (w) => !targetSet.has(w),
  );
  shuffle(candidatePool);
  const distractors = candidatePool.slice(0, Math.min(distractorCount, candidatePool.length));

  const tiles: Tile[] = [...targetTokens, ...distractors].map((text, i) => ({
    id: `${i}-${text}`,
    text,
  }));
  shuffle(tiles);
  return tiles;
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
