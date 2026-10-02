// Word journey wording (handover_language.md 6.2). Pure: no React, no
// imports, so mobile/scripts/check-words.mjs can load it in plain Node.
//
// The relation of a route is worked out server-side (borrowed | travelled |
// related | traced) and never guessed here: an unknown relation renders no
// line. "traced" is a word checked against a page that names its Sanskrit
// source without the stops in between, so the line claims no more than that.

export const FEATURE_TITLE = "Word journey";

export interface HopLike {
  lang?: string | null;
  form?: string | null;
  roman?: string | null;
  gloss?: string | null;
}

export interface RouteLike {
  id?: string | null;
  lang?: string | null;
  lang_name?: string | null;
  word?: string | null;
  script?: string | null;
  roman?: string | null;
  gloss?: string | null;
  kind?: string | null;
  relation?: string | null;
  confidence?: string | null;
  hops?: HopLike[] | null;
  sources?: string[] | null;
  source_url?: string | null;
  source_site?: string | null;
}

export interface OriginLike {
  id?: string | null;
  sanskrit?: { dev?: string | null; iast?: string | null } | null;
  gloss?: string | null;
}

export type Join = "start" | "arrow" | "family";

export interface Stop {
  label: string;
  form: string;
  roman: string;
  gloss: string;
  script: string;
  join: Join;
}

function text(v: string | null | undefined): string {
  return (v ?? "").trim();
}

/** Missing or null hops read as an empty list. */
export function hopsOf(route: RouteLike | null | undefined): HopLike[] {
  const hops = route?.hops;
  return Array.isArray(hops) ? hops : [];
}

/** One line naming how the word connects to Sanskrit. "" when unknown. */
export function relationLine(route: RouteLike | null | undefined): string {
  const relation = text(route?.relation);
  if (relation === "borrowed") return "Borrowed from Sanskrit";
  if (relation === "related") return "Same family as Sanskrit";
  if (relation === "traced") return "Goes back to Sanskrit";
  if (relation === "travelled") {
    const n = hopsOf(route).length;
    return `From Sanskrit, through ${n} language${n === 1 ? "" : "s"}`;
  }
  return "";
}

/** The page a route was checked against, when the route carries one. */
export function sourcePage(route: RouteLike | null | undefined): { site: string; url: string } | null {
  const url = text(route?.source_url);
  if (!/^https?:\/\//i.test(url)) return null;
  return { site: text(route?.source_site) || url, url };
}

/** "Dictionaries say probably" for probable, else "". */
export function confidenceLine(route: RouteLike | null | undefined): string {
  return text(route?.confidence) === "probable" ? "Dictionaries say probably" : "";
}

/**
 * The rows of the ladder, Sanskrit first and the word last. A route with no
 * word is skipped: []. For a related route the join after the Sanskrit row
 * is "family"; every other join between rows is an arrow.
 */
export function stops(origin: OriginLike | null | undefined, route: RouteLike | null | undefined): Stop[] {
  if (!route || !text(route.word)) return [];
  const hops = hopsOf(route).filter((h) => text(h.form) !== "");
  const related = text(route.relation) === "related";
  const out: Stop[] = [
    {
      label: "Sanskrit",
      form: text(origin?.sanskrit?.dev),
      roman: text(origin?.sanskrit?.iast),
      gloss: text(origin?.gloss),
      script: "devanagari",
      join: "start",
    },
  ];
  hops.forEach((h, i) => {
    out.push({
      label: text(h.lang),
      form: text(h.form),
      roman: text(h.roman),
      gloss: text(h.gloss),
      script: "",
      join: related && i === 0 ? "family" : "arrow",
    });
  });
  out.push({
    label: text(route.lang_name),
    form: text(route.word),
    roman: text(route.roman),
    gloss: text(route.gloss),
    script: text(route.script),
    join: related && hops.length === 0 ? "family" : "arrow",
  });
  return out;
}

/** The headline route: the named id when it names a route with a word. */
export function headlineRoute(
  routes: RouteLike[] | null | undefined,
  headlineId: string | null | undefined,
): RouteLike | null {
  const list = Array.isArray(routes) ? routes.filter((r) => text(r?.word) !== "") : [];
  if (list.length === 0) return null;
  const want = text(headlineId);
  if (want) {
    const hit = list.find((r) => text(r?.id) === want);
    if (hit) return hit;
  }
  return list[0] ?? null;
}

/** The accessibility sentence for the Home card. */
export function cardSentence(origin: OriginLike | null | undefined, route: RouteLike | null | undefined): string {
  if (!route || !text(route.word)) return "";
  const head = [text(route.word), text(route.lang_name), text(route.gloss)]
    .filter((p) => p !== "")
    .join(", ");
  if (!head) return "";
  const relation = relationLine(route);
  if (!relation) return `${head}.`;
  const iast = text(origin?.sanskrit?.iast);
  return iast ? `${head}. ${relation}: ${iast}.` : `${head}. ${relation}.`;
}

/** The ladder read aloud as one sentence. */
export function journeySentence(origin: OriginLike | null | undefined, route: RouteLike | null | undefined): string {
  if (!route || !text(route.word)) return "";
  const sa = text(origin?.sanskrit?.iast);
  const saHead = sa ? `Sanskrit ${sa}` : "Sanskrit";
  const hops = hopsOf(route).filter((h) => text(h.form) !== "");
  const wordBits = [text(route.lang_name), text(route.word)].filter((p) => p !== "").join(" ");
  if (text(route.relation) === "related") {
    if (hops.length === 0) {
      return wordBits ? `${saHead} and ${wordBits} are relatives.` : `${saHead} has relatives.`;
    }
    const first = [text(hops[0].lang), text(hops[0].form)].filter((p) => p !== "").join(" ");
    const rest = hops
      .slice(1)
      .map((h) => [text(h.lang), text(h.form)].filter((p) => p !== "").join(" "))
      .filter((p) => p !== "");
    if (wordBits) rest.push(wordBits);
    const tail = rest.length > 0 ? ` Then ${rest.join(", then ")}.` : "";
    return first ? `${saHead} and ${first} are relatives.${tail}` : `${saHead} has relatives.${tail}`;
  }
  const parts = [saHead];
  for (const h of hops) {
    const bit = [text(h.lang), text(h.form)].filter((p) => p !== "").join(" ");
    if (bit) parts.push(`then ${bit}`);
  }
  if (wordBits) parts.push(`then ${wordBits}`);
  return `${parts.join(", ")}.`;
}
