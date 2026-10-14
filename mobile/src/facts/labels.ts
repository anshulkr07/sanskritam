// Do you know: wording. Pure: no React, no imports, so
// mobile/scripts/check-facts.mjs can load it in plain Node.
//
// A fact rests on a verse the server found on a page of the text itself.
// Who says the fact is so (the text, its tradition, or a modern reading) is
// worked out server-side and never guessed here: an unknown kind renders no
// line.

export const FACT_TITLE = "Do you know";

export interface FactLike {
  id?: string | null;
  fact?: string | null;
  claim_kind?: string | null;
  text_name?: string | null;
  ref?: string | null;
  devanagari?: string | null;
  iast?: string | null;
  translation?: string | null;
  explanation?: string | null;
  source_url?: string | null;
  source_site?: string | null;
}

function text(v: string | null | undefined): string {
  return (v ?? "").trim();
}

/** One line saying who says so. "" when unknown. */
export function claimLine(fact: FactLike | null | undefined): string {
  const kind = text(fact?.claim_kind);
  if (kind === "text") return "The text says this";
  if (kind === "tradition") return "Tradition reads it this way";
  if (kind === "modern") return "Historical research";
  return "";
}

/** "Bhagavad-gītā 2.47": the text and where in it. */
export function refLine(fact: FactLike | null | undefined): string {
  return [text(fact?.text_name), text(fact?.ref)].filter((p) => p !== "").join(" ");
}

/** The page that carries the verse, when the address is a web address. */
export function sourcePage(fact: FactLike | null | undefined): { site: string; url: string } | null {
  const url = text(fact?.source_url);
  if (!/^https?:\/\//i.test(url)) return null;
  return { site: text(fact?.source_site) || url, url };
}

/** The verse as lines: where the text has line breaks, those; otherwise one
 *  line per danda, a closing "॥ २ ॥" staying with the line it ends. */
export function verseLines(devanagari: string | null | undefined): string[] {
  const src = text(devanagari);
  if (!src) return [];
  const byBreak = src.split(/\n+/).map((l) => l.trim()).filter((l) => l !== "");
  if (byBreak.length > 1) return byBreak;
  const parts = src.match(/[^।॥]+(?:[।॥][\s०-९0-9।॥]*)?/g) ?? [src];
  return parts.map((l) => l.trim()).filter((l) => l !== "");
}

/** The accessibility sentence for the Home card. */
export function cardSentence(fact: FactLike | null | undefined): string {
  const body = text(fact?.fact);
  if (!body) return "";
  const end = /[.!?]$/.test(body) ? "" : ".";
  const ref = refLine(fact);
  return ref ? `${FACT_TITLE}. ${body}${end} From ${ref}.` : `${FACT_TITLE}. ${body}${end}`;
}
