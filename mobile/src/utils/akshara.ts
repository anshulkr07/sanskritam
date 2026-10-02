// Akshara helpers: first letter and safe split for highlighting.
//
// Intl.Segmenter is not reliable on Hermes, so walk code points: leading
// consonants joined by virama, then one consonant or independent vowel,
// then any vowel sign and any of anusvara, visarga, candrabindu.

const VIRAMA = "्";
const VOWEL_SIGNS = /[ा-ौॢॣ]/u;
const MARKS = new Set(["ं", "ः", "ँ"]);

export function firstAkshara(titleSa: string): string {
  const text = (titleSa || "").trim();
  if (!text) return "";
  const chars = Array.from(text);
  let i = 0;
  // Leading consonants joined by virama stay together.
  let out = "";
  while (i < chars.length) {
    const ch = chars[i];
    out += ch;
    if (ch === VIRAMA && i + 1 < chars.length) {
      i++;
      out += chars[i];
      i++;
      continue;
    }
    // After one full consonant or vowel, collect signs and marks.
    if (i + 1 < chars.length && (VOWEL_SIGNS.test(chars[i + 1]) || MARKS.has(chars[i + 1]))) {
      // Keep collecting trailing signs.
      i++;
      while (i < chars.length && (VOWEL_SIGNS.test(chars[i]) || MARKS.has(chars[i]) || chars[i] === VIRAMA)) {
        // Stop if virama starts a new conjunct beyond the first akshara.
        if (chars[i] === VIRAMA) break;
        out += chars[i];
        i++;
      }
      break;
    }
    i++;
    // Stop after the first base character unless it was a virama join.
    if (ch !== VIRAMA) {
      // Collect one vowel sign run.
      while (i < chars.length && (VOWEL_SIGNS.test(chars[i]) || MARKS.has(chars[i]))) {
        out += chars[i];
        i++;
      }
      break;
    }
  }
  return out || chars[0] || "";
}

const DEVA_COMBINING = /^[\u0900-\u0903\u093A-\u094F\u0951-\u0957\u0962\u0963]/u;
const DEVA_COMBINING_ONE = /[\u0900-\u0903\u093A-\u094F\u0951-\u0957\u0962\u0963]/u;

export function splitAtAkshara(head: string, tail: string): [string, string] {
  // When tail starts with a combining mark, move the last akshara of head
  // onto the front of tail, so ["राम", "ः"] becomes ["रा", "मः"] and Android
  // never shapes a run starting with a combining mark (dotted circle).
  if (!head || !tail) return [head, tail];
  const first = Array.from(tail)[0];
  if (!first || !DEVA_COMBINING.test(first)) return [head, tail];
  const hChars = Array.from(head);
  // Find the last akshara boundary: walk back over signs and marks, then one base.
  let i = hChars.length - 1;
  while (i >= 0 && (DEVA_COMBINING_ONE.test(hChars[i]) || VOWEL_SIGNS.test(hChars[i]) || MARKS.has(hChars[i]))) {
    i--;
  }
  // Include virama-joined consonants.
  while (i - 1 >= 0 && hChars[i - 1] === VIRAMA) {
    i -= 2;
    while (i >= 0 && DEVA_COMBINING_ONE.test(hChars[i])) i--;
  }
  const cut = Math.max(0, i);
  const moved = hChars.slice(cut).join("");
  return [hChars.slice(0, cut).join(""), moved + tail];
}
