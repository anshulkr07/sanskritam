// hide: Tarteel-style word masking for practise. Words split on spaces only.

function firstAkshara(word: string): string {
  // Mirror gpu scoring aksharas: first base letter cluster.
  const m = word.match(/[\u0904-\u0939\u0958-\u0961\u0972-\u097F][\u093E-\u094D\u0900-\u0903\u0955-\u0957\u0962-\u0963]*/);
  return m ? m[0] : word.slice(0, 1);
}

export function mask(text: string, level: number): string {
  if (level <= 0) return text;
  if (level >= 3) return "";
  const words = text.split(" ");
  if (level === 1) {
    return words
      .map((w, i) => (i % 2 === 1 ? `${firstAkshara(w)}...` : w))
      .join(" ");
  }
  return words.map((w) => firstAkshara(w)).join(" ");
}
