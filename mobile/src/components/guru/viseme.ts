/**
 * Sanskritam — viseme lip sync
 *
 * The lips in the source art are painted shut, so the jaw rotation can never
 * read as speech (and tears a seam while trying). Real mouth motion comes from
 * swapping a small set of mouth plates over the face — the standard way 2D lip
 * sync is done. This module decides *which* plate and *when*.
 *
 * Sanskrit makes this unusually tractable. Devanagari is an abugida with a
 * near-transparent orthography: the written syllable tells you the mouth shape
 * directly, and vowel length is marked. So we do not need forced alignment or
 * a phoneme recogniser — we can read the shape sequence straight off the text
 * and stretch it over the clip's duration. For English or transliterated text
 * the mapping is rougher but the same machinery applies.
 *
 * Nothing here touches the .riv. It is inert until the plates exist and the
 * `viseme` input is added — see `icons/visemes/README.md`.
 */
import { useEffect, useRef } from 'react';
import type { GuruRig } from './rig';

/** Plate order is by aperture, smallest to largest, then the rounded pair.
 *  Adjacent indices are perceptually adjacent, so a fractional value between
 *  two of them cross-fades sensibly if you ever want that. */
export enum Viseme {
  Rest = 0, // lips together — the base art, no plate needed
  EE = 1,   // इ ई — wide, thin gap
  AA = 2,   // अ ए — medium open
  AAH = 3,  // आ ऐ — wide open
  OH = 4,   // ओ औ — rounded, medium
  OO = 5,   // उ ऊ व — pursed tight
  FV = 6,   // f, v — lower lip under teeth (optional plate)
}

export const VISEME_COUNT = 7;

// ── Devanagari ────────────────────────────────────────────────────────────
const V: Record<string, Viseme> = {
  // independent vowels
  'अ': Viseme.AA,   // अ
  'आ': Viseme.AAH,  // आ
  'इ': Viseme.EE,   // इ
  'ई': Viseme.EE,   // ई
  'उ': Viseme.OO,   // उ
  'ऊ': Viseme.OO,   // ऊ
  'ऋ': Viseme.AA,   // ऋ
  'ॠ': Viseme.AA,   // ॠ
  'ऌ': Viseme.AA,   // ऌ
  'ए': Viseme.AA,   // ए
  'ऐ': Viseme.AAH,  // ऐ
  'ओ': Viseme.OH,   // ओ
  'औ': Viseme.OH,   // औ
  // dependent vowel signs (matras)
  'ा': Viseme.AAH,  // ा
  'ि': Viseme.EE,   // ि
  'ी': Viseme.EE,   // ी
  'ु': Viseme.OO,   // ु
  'ू': Viseme.OO,   // ू
  'ृ': Viseme.AA,   // ृ
  'े': Viseme.AA,   // े
  'ै': Viseme.AAH,  // ै
  'ो': Viseme.OH,   // ो
  'ौ': Viseme.OH,   // ौ
  'ॉ': Viseme.OH,   // ॉ  candra o (loanwords)
  'ऑ': Viseme.OH,   // ऑ
  // ॐ is a syllable, not a letter, and it is everywhere in this app.
  'ॐ': Viseme.OH,   // ॐ
};

/** Long vowels hold roughly twice as long — Sanskrit's own laghu / guru
 *  distinction, which is exactly the weighting a timing model wants. */
const LONG = new Set([
  'आ', 'ई', 'ऊ', 'ॠ', 'ऐ', 'औ', 'ॐ',
  'ा', 'ी', 'ू', 'ै', 'ौ', 'ए', 'ओ', 'े', 'ो',
]);

const VIRAMA = '्';
/** प फ ब भ म — the lips physically close for these, and it reads. */
const LABIAL = new Set(['प', 'फ', 'ब', 'भ', 'म']);
const VA = 'व';    // व
const NUKTA = '़';  // ़  — फ़ is the only one that changes a mouth shape (f)
const isConsonant = (c: string) => c >= 'क' && c <= 'ह';
const isMatra = (c: string) => c in V && c >= 'ा';
const isDevanagari = (c: string) => c >= 'ऀ' && c <= 'ॿ';

export interface VisemeStep {
  v: Viseme;
  /** Relative duration. 1 = a short syllable, 2 = a long one. */
  w: number;
}

/**
 * Read a mouth-shape sequence off Devanagari text.
 *
 * A consonant carries an inherent 'a' unless a matra or virama follows, so
 * `नमः` is na-ma-ḥ, not n-m-ḥ. Labials get an explicit closure *before* their
 * vowel, which is what makes "ma" look like "ma" rather than "aa".
 */
export function visemesForDevanagari(text: string): VisemeStep[] {
  const out: VisemeStep[] = [];
  const push = (v: Viseme, w = 1) => {
    const last = out[out.length - 1];
    if (last && last.v === v) last.w += w;   // hold, don't re-trigger
    else out.push({ v, w });
  };

  const s = Array.from(text);
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (!isDevanagari(c)) {
      // spaces and punctuation close the mouth briefly
      if (/\s|[।॥,.!?;:]/.test(c)) push(Viseme.Rest, 1);
      continue;
    }
    if (isConsonant(c)) {
      // फ़ (फ + nukta) is /f/, the one nukta form with its own mouth shape.
      if (c === 'फ' && s[i + 1] === NUKTA) {
        push(Viseme.FV, 1);
        i++;
        const after = s[i + 1];
        if (after === VIRAMA) { i++; continue; }
        if (after && isMatra(after)) { push(V[after], LONG.has(after) ? 2 : 1); i++; }
        else push(Viseme.AA, 1);
        continue;
      }
      if (LABIAL.has(c)) push(Viseme.Rest, 1);
      const next = s[i + 1];
      if (next === VIRAMA) { i++; continue; }          // cluster: no vowel yet
      if (next && isMatra(next)) {
        push(V[next], LONG.has(next) ? 2 : 1);
        i++;
      } else if (c === VA) {
        push(Viseme.OO, 1);                            // व rounds on its own
      } else {
        push(Viseme.AA, 1);                            // inherent अ
      }
      continue;
    }
    if (c in V) push(V[c], LONG.has(c) ? 2 : 1);        // independent vowel
    // anusvara / visarga / candrabindu ride the previous shape
  }
  if (!out.length) out.push({ v: Viseme.Rest, w: 1 });
  return out;
}

// ── Latin fallback ────────────────────────────────────────────────────────
const LATIN: Array<[RegExp, Viseme, number]> = [
  [/^(oo|ou|ew|u[bcdfgklmnprstvz]e)/i, Viseme.OO, 2],
  [/^(ee|ea|ie|y$|i[bcdfgklmnprstvz]e)/i, Viseme.EE, 2],
  [/^(oa|ow|oe|o)/i, Viseme.OH, 1],
  [/^(ai|ay|a[bcdfgklmnprstvz]e)/i, Viseme.AAH, 2],
  [/^(au|aw|ah|a)/i, Viseme.AA, 1],
  [/^(e|i)/i, Viseme.EE, 1],
  [/^u/i, Viseme.OO, 1],
  [/^[fv]/i, Viseme.FV, 1],
  [/^[mbp]/i, Viseme.Rest, 1],
  [/^(qu|w)/i, Viseme.OO, 1],
];

export function visemesForLatin(text: string): VisemeStep[] {
  const out: VisemeStep[] = [];
  const push = (v: Viseme, w = 1) => {
    const last = out[out.length - 1];
    if (last && last.v === v) last.w += w;
    else out.push({ v, w });
  };
  let rest = text;
  while (rest.length) {
    if (/^\s/.test(rest)) { push(Viseme.Rest, 1); rest = rest.slice(1); continue; }
    let hit = false;
    for (const [re, v, w] of LATIN) {
      const m = rest.match(re);
      if (m) { push(v, w); rest = rest.slice(m[0].length); hit = true; break; }
    }
    if (!hit) rest = rest.slice(1);   // a consonant with no shape of its own
  }
  if (!out.length) out.push({ v: Viseme.Rest, w: 1 });
  return out;
}

export function visemesFor(text: string): VisemeStep[] {
  return /[ऀ-ॿ]/.test(text)
    ? visemesForDevanagari(text)
    : visemesForLatin(text);
}

/**
 * Stretch a shape sequence over a clip, weighted by syllable length, and clamp
 * each shape to a sane hold time. Below ~55 ms a mouth shape is a flicker
 * nobody perceives as a shape; above ~260 ms it reads as a pause.
 */
export function scheduleVisemes(
  steps: VisemeStep[],
  durationMs: number,
  opts: { minMs?: number; maxMs?: number } = {},
): Array<{ at: number; v: Viseme }> {
  const { minMs = 55, maxMs = 260 } = opts;
  const total = steps.reduce((a, s) => a + s.w, 0) || 1;
  const unit = durationMs / total;
  const out: Array<{ at: number; v: Viseme }> = [];
  let t = 0;
  for (const s of steps) {
    out.push({ at: t, v: s.v });
    t += Math.max(minMs, Math.min(maxMs, unit * s.w));
  }
  return out;
}

/**
 * Drive the rig's mouth from a schedule.
 *
 * `amplitude`, when given, gates the shape by loudness — a scheduled AAH that
 * lands during a quiet moment opens only partway. That covers the drift
 * between the estimated timing and the real audio without needing alignment:
 * the *shapes* come from the text, the *energy* comes from the signal.
 */
export function useVisemeDriver(
  rig: GuruRig,
  opts: {
    speaking: boolean;
    text?: string;
    durationMs?: number;
    amplitude?: () => number;
    /** Shortest hold per shape, ms — comes from the presentation profile. */
    minMs?: number;
    /** Called with the viseme index. Wire to the `viseme` input once the
     *  plates are in the .riv; until then this is where it dead-ends. */
    onViseme?: (v: number) => void;
  },
) {
  const { speaking, text, durationMs, amplitude, minMs, onViseme } = opts;
  const ref = useRef({ rig, amplitude, onViseme });
  ref.current = { rig, amplitude, onViseme };

  useEffect(() => {
    if (!speaking || !rig.ready) { ref.current.onViseme?.(Viseme.Rest); return; }

    const schedule =
      text && durationMs
        ? scheduleVisemes(visemesFor(text), durationMs, { minMs })
        : null;

    const t0 = Date.now();
    let raf = 0;
    let idx = 0;
    let flutterUntil = 0;
    let flutterV: Viseme = Viseme.AA;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const t = Date.now() - t0;
      let v: Viseme;

      if (schedule) {
        while (idx + 1 < schedule.length && schedule[idx + 1].at <= t) idx++;
        if (t > (durationMs ?? 0)) v = Viseme.Rest;
        else v = schedule[idx].v;
      } else {
        // No text: fall back to an irregular shape walk at 6-9 Hz. Not lip
        // sync, but far better than a closed mouth, and never a fixed cycle.
        if (t > flutterUntil) {
          const pool = [Viseme.AA, Viseme.AAH, Viseme.EE, Viseme.OH, Viseme.OO, Viseme.AA];
          let next = pool[(Math.random() * pool.length) | 0];
          if (next === flutterV) next = Viseme.Rest;
          flutterV = next;
          flutterUntil = t + 1000 / (6 + Math.random() * 3);
        }
        v = flutterV;
      }

      const amp = ref.current.amplitude?.();
      if (amp !== undefined && v !== Viseme.Rest) {
        // Quiet moments close the mouth regardless of what the text expected.
        if (amp < 0.06) v = Viseme.Rest;
        else if (amp < 0.22 && (v === Viseme.AAH)) v = Viseme.AA;
      }

      ref.current.onViseme?.(v);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ref.current.onViseme?.(Viseme.Rest);
    };
  }, [speaking, text, durationMs, minMs, rig.ready]); // eslint-disable-line react-hooks/exhaustive-deps
}
