// Pure Parva selection helpers: active-day, ranking, day-content.
// No native imports so check-parva.mjs can load them in Node.
// All joins use stable form/tithi identifiers, never array index.

import type { ParvaOccurrence, ParvaDay } from "./api";

export interface SeriesContent {
  tithi_key?: string;
  form_key?: string;
  summary?: string;
  steps?: { text?: string }[];
  [k: string]: unknown;
}

const TITHI_ALIASES: Record<string, string> = {
  dvitiya: "dwitiya",
  dwitiya: "dwitiya",
  dvadashi: "dwadashi",
  dwadashi: "dwadashi",
};

export function normalizeTithiKey(raw: string | undefined | null): string {
  const k = (raw ?? "").trim().toLowerCase();
  return TITHI_ALIASES[k] ?? k;
}

export function normalizeFormKey(raw: string | undefined | null): string {
  return (raw ?? "").trim().toLowerCase();
}

/** Long periods stay as supporting context, never the main festival card. */
const PERIOD_SLUGS = new Set(["chaturmas", "shravan", "adhika_masa", "kharmas", "holashtak"]);

export function isPeriodSlug(slug: string): boolean {
  return PERIOD_SLUGS.has(slug);
}

/** Deterministic priority: lower wins the main card. */
export function occurrencePriority(o: ParvaOccurrence, todayStr: string): number {
  const d = o.date ?? "";
  const end = o.end_date ?? o.date ?? "";
  const activeSeriesDay =
    o.day != null && o.day.some((x) => x.date === todayStr);
  const isToday = d === todayStr;
  const ongoing = d && end && d <= todayStr && todayStr <= end;
  if ((isToday || activeSeriesDay) && !isPeriodSlug(o.slug)) return 0;
  if (ongoing && !isPeriodSlug(o.slug)) return 1;
  if (isToday || activeSeriesDay) return 2;
  if (ongoing) return 3;
  if (d && d > todayStr && !isPeriodSlug(o.slug)) return 10;
  if (d && d > todayStr) return 20;
  return 30;
}

export interface RankedSelection {
  main: ParvaOccurrence | null;
  supporting: ParvaOccurrence[];
  upcoming: ParvaOccurrence[];
}

/** Split a calendar window into main / supporting / upcoming. */
export function rankOccurrences(occs: ParvaOccurrence[], todayStr: string): RankedSelection {
  const sorted = [...occs].sort((a, b) => {
    const pa = occurrencePriority(a, todayStr);
    const pb = occurrencePriority(b, todayStr);
    if (pa !== pb) return pa - pb;
    const da = a.date ?? "";
    const db = b.date ?? "";
    if (da !== db) return da < db ? -1 : 1;
    if (a.slug !== b.slug) return a.slug < b.slug ? -1 : 1;
    return (a.variant ?? "") < (b.variant ?? "") ? -1 : 1;
  });
  if (sorted.length === 0) return { main: null, supporting: [], upcoming: [] };
  const main = sorted[0];
  const rest = sorted.slice(1);
  const todaySet = new Set(
    sorted.filter((o) => (o.date ?? "") <= todayStr && todayStr <= (o.end_date ?? o.date ?? "")).map((o) => `${o.slug}|${o.variant}|${o.date}`),
  );
  const supporting = rest.filter(
    (o) => isPeriodSlug(o.slug) && (o.date ?? "") <= todayStr && todayStr <= (o.end_date ?? o.date ?? ""),
  );
  const upcoming = rest.filter((o) => !supporting.includes(o));
  void todaySet;
  return { main, supporting, upcoming };
}

/** Today's dated entry inside an ongoing series, else null. */
export function activeDayFor(o: ParvaOccurrence, todayStr: string): ParvaDay | null {
  if (!o.day) return null;
  return o.day.find((d) => d.date === todayStr) ?? null;
}

/** Index of the day to show: requested date/day, else today if active,
 *  else first day if upcoming, else matching date or 0. */
export function selectDayIndex(
  days: { date?: string }[],
  opts: { requestedDate?: string; todayStr: string },
): number {
  if (days.length === 0) return -1;
  if (opts.requestedDate) {
    const i = days.findIndex((d) => d.date === opts.requestedDate);
    if (i >= 0) return i;
  }
  const t = days.findIndex((d) => d.date === opts.todayStr);
  if (t >= 0) return t;
  const future = days.findIndex((d) => (d.date ?? "") > opts.todayStr);
  if (future >= 0) return future;
  return 0;
}

/** Resolve per-day content by stable form_key (fallback: normalised tithi).
 *  Repeated tithis share a form's content without losing dated entries. */
export function resolveDayContent(
  calDay: { date?: string; tithi_key?: string; form_key?: string; label?: string } | null | undefined,
  seriesDays: SeriesContent[],
): SeriesContent | null {
  if (!calDay) return null;
  const fk = normalizeFormKey(calDay.form_key);
  if (fk) {
    const hit = seriesDays.find((s) => normalizeFormKey(s.form_key) === fk);
    if (hit) return hit;
  }
  const tk = normalizeTithiKey(calDay.tithi_key);
  if (tk) {
    const hit = seriesDays.find((s) => normalizeTithiKey(s.tithi_key) === tk);
    if (hit) return hit;
  }
  return null;
}

/** Stable occurrence identity for share/Ask/reminder deep links. */
export function occurrenceIdentity(o: {
  slug: string;
  variant?: string;
  date?: string | null;
  tradition?: string;
  dayDate?: string | null;
}): string {
  return [o.slug, o.variant ?? "", o.date ?? "", o.tradition ?? "", o.dayDate ?? ""].join("|");
}

/** Festival day number (1-based) inside its series, from the dated entries. */
export function seriesDayNumber(days: { date?: string }[], dayDate: string): number {
  const i = days.findIndex((d) => d.date === dayDate);
  return i >= 0 ? i + 1 : 0;
}
