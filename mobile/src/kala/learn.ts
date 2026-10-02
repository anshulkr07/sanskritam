// What the Kāla screens show, worked out from the engine.
//
// Pure: no React, no storage, no network. Each model is taken when a screen
// opens and again when it goes stale; the quick readers (limbsAt, ghatiAt)
// run on every tick. `node scripts/check-kala.mjs` holds all of it.
//
// Every Sanskrit string here is put together from sanskritNames.ts (made by
// Vidyut). Where two words are joined, the second begins with a consonant
// and the first is a stem, so no sandhi is written by hand.
//
// Where what is not astronomy was read (2026-10-02). Each was opened at the
// source: the text itself, or a dictionary of record.
//   Surya Siddhanta 1.11-23 and 2.64-69 (GRETIL's e-text of the Bibliotheca
//     Indica edition, 1854): six pranas to a vinadi, sixty of those to a
//     nadika, sixty nadikas to a day; the four ages as 4, 3, 2 and 1 tenths
//     of 4,320,000 years; 71 such cycles to a manvantara; fourteen Manus and
//     fifteen junctions to a kalpa of a thousand cycles, a day of Brahma; six
//     Manus gone, and 27 cycles of the seventh, Vaivasvata's. And the limbs
//     of the day: a star is 800 minutes of arc and a tithi 720 (12 degrees)
//     of the Moon's lead over the Sun, a yoga is 800 of their sum, a karana
//     is half a tithi, four of them fixed and seven recurring.
//   Bhagavata Purana 3.11.19, 3.11.22, 3.11.24, 3.11.37 and 8.13.1
//     (vedabase.io): the ages as 4,800, 3,600, 2,400 and 1,200 years of the
//     gods; a thousand cycles a day of Brahma; 71 cycles to a Manu; this
//     kalpa called Varaha; the son of Vivasvat the seventh Manu, the present.
//   Monier-Williams 1899 and the Vacaspatyam (University of Cologne): the
//     names of the yogas, karanas, signs, seasons and units, and what each
//     means. backend/scripts/gen_kala_names.py says which for each list.
//   Drik Panchang (drikpanchang.com): the good and avoided stretches of the
//     day, and which month, season and karana an almanac names on a given
//     day. scripts/check-kala.mjs keeps those readings.

import {
  ayanaAt,
  dayWindows,
  elongation,
  karanaAt,
  KALPA_YEARS,
  KALPA_YEARS_BEFORE_KALI,
  litFraction,
  lunarYearAt,
  lunarYears,
  MAHAYUGA_YEARS,
  MANVANTARA_YEARS,
  nextMoonPhase,
  nextSankranti,
  purnimantaMonth,
  rituOfMonth,
  siderealMoon,
  siderealSun,
  sunDay,
  sunriseTithis,
  sunsetAfter,
  tithiSlips,
  tithiSpans,
  yogaAt,
  YUGA_YEARS,
  addDays,
  type CivilDate,
  type DayWindow,
  type Lunation,
  type LunarYears,
  type SunDay,
  type Tithi,
  type TithiSlip,
} from "./engine";
import {
  AYANAS,
  FULL_NEW,
  KARANA_ORDER,
  KARANAS,
  MONTHS,
  NAKSHATRAS,
  PAKSHAS,
  RASHIS,
  RITUS,
  SPANS,
  TITHIS,
  UNITS,
  WEEKDAYS,
  WORDS,
  YOGAS,
  YUGAS,
  type SanskritName,
} from "./sanskritNames";
import {
  cap,
  cardView,
  forTradition,
  ordinal,
  romanName,
  tithiParts,
  WEEKDAYS_EN,
  type BaseReading,
  type Snapshot,
  type TextScript,
} from "./today";
import { TRADITIONS, traditionById, type TraditionId } from "./traditions";

const MINUTE_MS = 60000;
const DAY_MS = 86400000;
const NAKSHATRA_SPAN = 360 / 27;

function mod(x: number, m: number): number {
  return ((x % m) + m) % m;
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

/** The seasons in English, Vasanta first, as Monier-Williams glosses them:
 *  spring, summer, the rains, autumn, winter, "the cool or dewy season". */
export const RITUS_EN = ["Spring", "Summer", "Rains", "Autumn", "Winter", "Cool season"];

/** What the signs' names mean, Mesha first, by Monier-Williams's glosses. */
export const RASHIS_EN = ["Ram", "Bull", "Twins", "Crab", "Lion", "Maiden", "Balance", "Scorpion", "Bow", "Sea monster", "Water pot", "Fish"];

// ── the hub: where this moment sits, largest span first ────────────────

export type ChapterId = "today" | "moon" | "clock" | "year" | "yugas" | "calendars";

export interface LadderRow {
  key: string;
  /** Sanskrit, in the seventh case: "in the Kali age". */
  sa: string;
  gloss: string;
  /** The chapter that explains this row. */
  chapter: ChapterId;
}

/** The month a tithi belongs to as the learner's tradition names it. */
export function traditionMonth(snap: Snapshot): { month: number; adhika: boolean } {
  return traditionById(snap.traditionId).monthEnd === "purnimanta"
    ? purnimantaMonth(snap.lunation, snap.tithi.number)
    : { month: snap.lunation.month, adhika: snap.lunation.adhika };
}

/** Ten rows from the kalpa down to the Moon's star: the same moment named
 *  at every scale. */
export function ladder(snap: Snapshot): LadderRow[] {
  const t = tithiParts(snap.tithi.number);
  const month = traditionMonth(snap);
  const monthName = MONTHS[month.month];
  const ritu = rituOfMonth(snap.lunation.month);
  const ayana = ayanaAt(snap.at);
  const star = NAKSHATRAS[snap.nakshatra.index];
  return [
    { key: "kalpa", sa: WORDS.shvetavarahakalpa.loc, gloss: `${cap(WORDS.shvetavarahakalpa.iast)}`, chapter: "yugas" },
    { key: "manvantara", sa: WORDS.vaivasvatamanvantara.loc, gloss: "7th manvantara of 14", chapter: "yugas" },
    { key: "yuga", sa: YUGAS[3].loc, gloss: `Kali age, year ${snap.years.kali}`, chapter: "yugas" },
    { key: "ayana", sa: AYANAS[ayana].loc, gloss: ayana === 0 ? "Sun heading north" : "Sun heading south", chapter: "year" },
    { key: "ritu", sa: RITUS[ritu].loc, gloss: RITUS_EN[ritu], chapter: "year" },
    {
      key: "masa",
      sa: `${month.adhika ? `${WORDS.adhika.dev} ` : ""}${monthName.dev}${WORDS.masa.loc}`,
      gloss: `${month.adhika ? "Added " : ""}${cap(monthName.iast)} month`,
      chapter: "year",
    },
    { key: "paksha", sa: `${PAKSHAS[t.half].dev}${WORDS.paksha.loc}`, gloss: t.half === 0 ? "Waxing half" : "Waning half", chapter: "moon" },
    {
      key: "tithi",
      sa: t.name.loc,
      gloss: t.day === 15 ? (t.half === 0 ? "Full moon" : "New moon") : `${ordinal(t.day)} tithi`,
      chapter: "moon",
    },
    { key: "vara", sa: WEEKDAYS[snap.weekday].loc, gloss: WEEKDAYS_EN[snap.weekday], chapter: "today" },
    { key: "nakshatra", sa: `${star.dev}${WORDS.nakshatra.loc}`, gloss: `Moon in ${cap(star.iast)}`, chapter: "moon" },
  ];
}

// ── today: the five limbs, the day's hours, the week ───────────────────

export type LimbKey = "vara" | "tithi" | "nakshatra" | "yoga" | "karana";

export interface Limb {
  key: LimbKey;
  /** The limb's own name: "tithi". */
  term: SanskritName;
  /** What it is now. */
  name: SanskritName;
  roman: string;
  gloss: string;
  /** When it gives way to the next. */
  end: Date | null;
  /** How far through it the moment is, 0 to 1. */
  progress: number;
}

export interface WeekCell {
  /** Days from today: 0 is today. */
  offset: number;
  date: CivilDate;
  /** 0 is Sunday. */
  weekday: number;
  sunrise: Date;
  /** The tithi running at that sunrise, 1 to 30, and the Moon's angle then. */
  tithi: number;
  elongation: number;
}

export type UpcomingKey = "purnima" | "amavasya" | "ekadashi" | "sankranti";

export interface Upcoming {
  key: UpcomingKey;
  at: Date;
  sa: string;
  title: string;
}

export interface TodayModel {
  /** The first moment at which the model should be taken again. */
  validUntil: Date;
  /** The Sun's day for the learner's civil date. Null near the poles. */
  sun: SunDay | null;
  /** The civil weekday the windows were worked out for, 0 Sunday. */
  civilWeekday: number;
  windows: DayWindow[];
  yoga: { index: number; end: Date };
  karana: { index: number; end: Date };
  week: WeekCell[];
  slips: TithiSlip[];
  upcoming: Upcoming[];
}

/** The instant the snapshot's civil date began at the place. */
export function midnightOf(snap: BaseReading): Date {
  return new Date(Math.floor(snap.at.getTime() / MINUTE_MS) * MINUTE_MS - snap.clock.minutes * MINUTE_MS);
}

function weekdayOf(c: CivilDate): number {
  return new Date(Date.UTC(c.y, c.m - 1, c.d)).getUTCDay();
}

/** A tithi in plain words: "5th of the waning half". */
export function tithiGloss(number: number): string {
  const t = tithiParts(number);
  if (t.day === 15) return t.half === 0 ? "Full moon" : "New moon";
  return `${ordinal(t.day)} of the ${t.half === 0 ? "waxing" : "waning"} half`;
}

/** What is coming: the next full and new moon, the next eleventh tithi and
 *  the Sun's next change of sign, soonest first. */
export function upcoming(at: Date): Upcoming[] {
  const out: Upcoming[] = [];
  const full = nextMoonPhase(at, 180);
  if (full) out.push({ key: "purnima", at: full, sa: FULL_NEW[0].nom, title: "Full moon" });
  const dark = nextMoonPhase(at, 0);
  if (dark) out.push({ key: "amavasya", at: dark, sa: FULL_NEW[1].nom, title: "New moon" });
  // The eleventh tithi of either half opens at 120 and at 300 degrees.
  const elevenths = [nextMoonPhase(at, 120), nextMoonPhase(at, 300)].filter((d): d is Date => d !== null);
  if (elevenths.length > 0) {
    const first = elevenths.reduce((a, b) => (a.getTime() <= b.getTime() ? a : b));
    out.push({ key: "ekadashi", at: first, sa: TITHIS[10].nom, title: `${cap(TITHIS[10].nomIast)} begins` });
  }
  const sk = nextSankranti(at);
  out.push({ key: "sankranti", at: sk.at, sa: RASHIS[sk.sign].nom, title: `Sun enters ${romanName(RASHIS[sk.sign])}` });
  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/** The slow part of the Today chapter, for an instant inside the snapshot's
 *  life. */
export function todayModel(snap: Snapshot, at: Date = snap.at): TodayModel {
  const midnight = midnightOf(snap);
  const sun = sunDay(midnight, snap.place);
  const civilWeekday = weekdayOf(snap.clock.date);
  const yoga = yogaAt(at);
  const k = karanaAt(at);
  const karana = { index: Math.max(0, KARANA_ORDER.indexOf(k.name)), end: k.end };
  const days = sunriseTithis(midnight, snap.place, -1, 5);
  const week: WeekCell[] = days.map((d) => {
    const date = addDays(snap.clock.date, d.offset);
    return { offset: d.offset, date, weekday: weekdayOf(date), sunrise: d.sunrise, tithi: d.tithi, elongation: d.elongation };
  });
  const validUntil = Math.min(snap.validUntil.getTime(), yoga.end.getTime() + 1000, karana.end.getTime() + 1000);
  return {
    validUntil: new Date(validUntil),
    sun,
    civilWeekday,
    windows: sun ? dayWindows(sun, civilWeekday) : [],
    yoga,
    karana,
    week,
    slips: tithiSlips(days),
    upcoming: upcoming(at),
  };
}

/** The five limbs at an instant. Quick: three longitudes. */
export function limbsAt(snap: Snapshot, model: TodayModel, at: Date): Limb[] {
  const t = tithiParts(snap.tithi.number);
  const tithiSpan = snap.tithi.end.getTime() - snap.tithi.start.getTime();
  const moon = siderealMoon(at);
  const star = NAKSHATRAS[snap.nakshatra.index];
  const yoga = YOGAS[model.yoga.index];
  const karana = KARANAS[model.karana.index];
  const daySpan = snap.dayStart && snap.dayEnd ? snap.dayEnd.getTime() - snap.dayStart.getTime() : 0;
  return [
    {
      key: "vara",
      term: WORDS.vara,
      name: WEEKDAYS[snap.weekday],
      roman: romanName(WEEKDAYS[snap.weekday]),
      gloss: `${WEEKDAYS_EN[snap.weekday]}, from sunrise`,
      end: snap.dayEnd,
      progress: snap.dayStart && daySpan > 0 ? clamp01((at.getTime() - snap.dayStart.getTime()) / daySpan) : 0,
    },
    {
      key: "tithi",
      term: WORDS.tithi,
      name: t.name,
      roman: romanName(t.name),
      gloss: tithiGloss(snap.tithi.number),
      end: snap.tithi.end,
      progress: tithiSpan > 0 ? clamp01((at.getTime() - snap.tithi.start.getTime()) / tithiSpan) : 0,
    },
    {
      key: "nakshatra",
      term: WORDS.nakshatra,
      name: star,
      roman: romanName(star),
      gloss: `The Moon's star, ${snap.nakshatra.index + 1} of 27`,
      end: snap.nakshatra.end,
      progress: clamp01(mod(moon, NAKSHATRA_SPAN) / NAKSHATRA_SPAN),
    },
    {
      key: "yoga",
      term: WORDS.yoga,
      name: yoga,
      roman: romanName(yoga),
      gloss: `Sun and Moon added, ${model.yoga.index + 1} of 27`,
      end: model.yoga.end,
      progress: clamp01(mod(siderealSun(at) + moon, NAKSHATRA_SPAN) / NAKSHATRA_SPAN),
    },
    {
      key: "karana",
      term: WORDS.karana,
      name: karana,
      roman: romanName(karana),
      gloss: "Half a tithi",
      end: model.karana.end,
      progress: clamp01(mod(elongation(at), 6) / 6),
    },
  ];
}

/** The window running at an instant, if any. */
export function windowAt(windows: DayWindow[], at: Date): DayWindow | null {
  const t = at.getTime();
  return windows.find((w) => t >= w.start.getTime() && t < w.end.getTime()) ?? null;
}

// ── the Moon ───────────────────────────────────────────────────────────

export interface MoonReading {
  /** 1 to 30. */
  tithi: number;
  /** 0 the bright half, 1 the dark half. */
  half: 0 | 1;
  /** 1 to 15 within the half. */
  day: number;
  name: SanskritName;
  /** The half's name as one word: "śuklapakṣaḥ". */
  pakshaSa: string;
  pakshaRoman: string;
  /** The lit share of the disc, 0 to 100. */
  litPercent: number;
}

/** What an angle between Moon and Sun means: the tithi it falls in and how
 *  much of the disc is lit. */
export function moonReading(elongationDeg: number): MoonReading {
  const e = mod(elongationDeg, 360);
  const tithi = (Math.floor(e / 12) % 30) + 1;
  const t = tithiParts(tithi);
  return {
    tithi,
    half: t.half,
    day: t.day,
    name: t.name,
    pakshaSa: `${PAKSHAS[t.half].dev}${WORDS.paksha.nom}`,
    pakshaRoman: `${cap(PAKSHAS[t.half].iast)} ${WORDS.paksha.iast}`,
    litPercent: Math.round(litFraction(e) * 100),
  };
}

export interface TithiBar {
  number: number;
  start: Date;
  end: Date;
  hours: number;
}

export interface MoonModel {
  /** The thirty tithis of the running lunation with their lengths. */
  bars: TithiBar[];
  shortest: number;
  longest: number;
}

export function moonModel(lunation: Lunation): MoonModel {
  const bars = tithiSpans(lunation).map((t: Tithi) => ({
    number: t.number,
    start: t.start,
    end: t.end,
    hours: (t.end.getTime() - t.start.getTime()) / 3600000,
  }));
  const hours = bars.map((b) => b.hours);
  return { bars, shortest: Math.min(...hours), longest: Math.max(...hours) };
}

/** The Moon's star at an instant: which of the 27, and how far through. */
export function starAt(at: Date): { index: number; fraction: number; longitude: number } {
  const longitude = siderealMoon(at);
  return {
    index: Math.floor(longitude / NAKSHATRA_SPAN) % 27,
    fraction: mod(longitude, NAKSHATRA_SPAN) / NAKSHATRA_SPAN,
    longitude,
  };
}

// ── the clock ──────────────────────────────────────────────────────────

/** A vipala in milliseconds: sixty to a pala, sixty palas to a ghatika,
 *  sixty ghatikas to a day and night. */
export const VIPALA_MS = 400;
export const PALA_MS = 60 * VIPALA_MS;
export const GHATIKA_MS = 60 * PALA_MS;
export const PRANA_MS = 10 * VIPALA_MS;

export interface GhatiTime {
  ghatika: number;
  pala: number;
  vipala: number;
  /** Breaths (prana) in all: one is ten vipalas, four seconds. */
  prana: number;
}

/** A length of time in the old units. */
export function ghatiOf(ms: number): GhatiTime {
  const span = Math.max(0, ms);
  const vipalas = Math.floor(span / VIPALA_MS);
  return {
    ghatika: Math.floor(vipalas / 3600),
    pala: Math.floor(vipalas / 60) % 60,
    vipala: vipalas % 60,
    prana: Math.floor(span / PRANA_MS),
  };
}

export interface UnitRow {
  unit: SanskritName;
  roman: string;
  /** What it is made of: "60 pala". Empty for the smallest. */
  made: string;
  seconds: number;
  /** In ordinary units: "24 min". */
  length: string;
  /** A few words on what it is, where the texts say. */
  note: string;
}

/** The ladder of small units, from the vipala up to the day and night.
 *  The breath is the Surya Siddhanta's unit (1.11): six make a vinadi, the
 *  pala here, sixty of those a nadika, the ghatika here, and sixty of those
 *  a day. Monier-Williams gives the breath as "the time requisite for the
 *  pronunciation of 10 long syllables", the vipala as a tenth of it, and the
 *  muhurta as the thirtieth part of a day. */
export function unitLadder(): UnitRow[] {
  const r = (i: number) => UNITS[i].iast;
  return [
    { unit: UNITS[0], roman: romanName(UNITS[0]), made: "", seconds: 0.4, length: "0.4 s", note: "" },
    { unit: UNITS[1], roman: romanName(UNITS[1]), made: `10 ${r(0)}`, seconds: 4, length: "4 s", note: "A breath: ten long syllables" },
    { unit: UNITS[2], roman: romanName(UNITS[2]), made: `6 ${r(1)}`, seconds: 24, length: "24 s", note: "" },
    { unit: UNITS[3], roman: romanName(UNITS[3]), made: `60 ${r(2)}`, seconds: 1440, length: "24 min", note: "" },
    { unit: UNITS[4], roman: romanName(UNITS[4]), made: `2 ${r(3)}`, seconds: 2880, length: "48 min", note: "" },
    { unit: UNITS[5], roman: romanName(UNITS[5]), made: `30 ${r(4)}`, seconds: 86400, length: "24 h", note: "A day and a night, sunrise to sunrise" },
  ];
}

// ── the year ───────────────────────────────────────────────────────────

export interface YearMonth {
  lunation: Lunation;
  /** Where the month sits in the year, 0 to 1. */
  from: number;
  to: number;
  /** The Sun's change of sign inside this month. None in an added month. */
  sankranti: { sign: number; at: Date } | null;
  /** 0 Vasanta to 5 Shishira. */
  ritu: number;
  days: number;
}

export interface YearModel {
  start: Date;
  end: Date;
  /** Length of this lunar year in days. */
  days: number;
  months: YearMonth[];
  /** The Sun's changes of sign across the year, as fractions of it. */
  ticks: { sign: number; at: Date; at01: number }[];
  /** The month an instant falls in, by index. */
  current: number;
  years: LunarYears;
  /** True when the year holds an added month. */
  hasAdhika: boolean;
}

let yearCache: YearModel | null = null;

/** The lunar year around an instant, Chaitra to Chaitra. Kept between
 *  screens: it only changes once a year. */
export function yearModel(at: Date): YearModel {
  const t = at.getTime();
  if (yearCache && t >= yearCache.start.getTime() && t < yearCache.end.getTime()) {
    const current = yearCache.months.findIndex((m) => t >= m.lunation.start.getTime() && t < m.lunation.end.getTime());
    return current === yearCache.current ? yearCache : { ...yearCache, current: Math.max(0, current) };
  }
  const year = lunarYearAt(at);
  const start = year.start.getTime();
  const span = year.end.getTime() - start;
  const at01 = (d: Date) => (d.getTime() - start) / span;
  const months: YearMonth[] = year.months.map((l) => {
    const inside = year.sankrantis.find((s) => s.at.getTime() >= l.start.getTime() && s.at.getTime() < l.end.getTime());
    return {
      lunation: l,
      from: at01(l.start),
      to: at01(l.end),
      sankranti: inside ?? null,
      ritu: rituOfMonth(l.month),
      days: (l.end.getTime() - l.start.getTime()) / DAY_MS,
    };
  });
  const current = months.findIndex((m) => t >= m.lunation.start.getTime() && t < m.lunation.end.getTime());
  yearCache = {
    start: year.start,
    end: year.end,
    days: span / DAY_MS,
    months,
    ticks: year.sankrantis.map((s) => ({ sign: s.sign, at: s.at, at01: at01(s.at) })),
    current: Math.max(0, current),
    years: lunarYears(year.months[0]),
    hasAdhika: year.months.some((l) => l.adhika),
  };
  return yearCache;
}

/** A month's name as the year wheel writes it. */
export function monthLabel(l: Lunation): { sa: string; roman: string } {
  const name = MONTHS[l.month];
  return {
    sa: l.adhika ? `${WORDS.adhika.dev} ${name.nom}` : name.nom,
    roman: `${l.adhika ? "Adhika " : ""}${cap(name.iast)}`,
  };
}

/** Twelve mean lunar months and the Sun's sidereal year, in days.
 *  scripts/check-kala.mjs holds both to the engine's own new moons and
 *  sankrantis over nineteen years. */
export const LUNAR_TWELVE_DAYS = 12 * 29.530589;
export const SOLAR_YEAR_DAYS = 365.25636;

// ── the yugas ──────────────────────────────────────────────────────────

export interface YugaRow {
  name: SanskritName;
  roman: string;
  years: number;
  /** Its share of the cycle in tenths: 4, 3, 2, 1. */
  share: number;
  /** Where it sits in the cycle, 0 to 1. */
  from: number;
  to: number;
}

export interface YugaModel {
  yugas: YugaRow[];
  /** Years of the Kali age gone, and left. */
  kali: number;
  kaliLeft: number;
  /** How far through the Kali age, the four-age cycle and the kalpa. */
  kali01: number;
  cycle01: number;
  kalpa01: number;
  /** Years of the present kalpa gone. */
  kalpaYears: number;
  /** Which cycle of the four ages this is within its manvantara, and which
   *  manvantara within the kalpa. */
  cycle: { at: number; of: number };
  manvantara: { at: number; of: number };
  spans: { name: SanskritName; roman: string; years: number; made: string }[];
}

export function yugaModel(kali: number): YugaModel {
  let from = 0;
  const yugas: YugaRow[] = YUGAS.map((name, i) => {
    const share = 4 - i;
    const row = { name, roman: romanName(name), years: YUGA_YEARS[i], share, from, to: from + share / 10 };
    from = row.to;
    return row;
  });
  const cycleYears = MAHAYUGA_YEARS - YUGA_YEARS[3] + kali;
  const kalpaYears = KALPA_YEARS_BEFORE_KALI + kali;
  return {
    yugas,
    kali,
    kaliLeft: YUGA_YEARS[3] - kali,
    kali01: kali / YUGA_YEARS[3],
    cycle01: cycleYears / MAHAYUGA_YEARS,
    kalpa01: kalpaYears / KALPA_YEARS,
    kalpaYears,
    cycle: { at: 28, of: 71 },
    manvantara: { at: 7, of: 14 },
    spans: [
      { name: SPANS[0], roman: romanName(SPANS[0]), years: MAHAYUGA_YEARS, made: "The four ages together" },
      { name: SPANS[1], roman: romanName(SPANS[1]), years: MANVANTARA_YEARS, made: "71 cycles of the four ages" },
      { name: SPANS[2], roman: romanName(SPANS[2]), years: KALPA_YEARS, made: "1,000 cycles, a day of Brahmā" },
    ],
  };
}

/** A whole number with commas: 1,972,949,127. */
export function grouped(n: number): string {
  const s = String(Math.round(Math.abs(n)));
  let out = "";
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) out += ",";
    out += s[i];
  }
  return n < 0 ? `-${out}` : out;
}

// ── six calendars ──────────────────────────────────────────────────────

export interface TraditionDate {
  id: TraditionId;
  label: string;
  headline: string;
  headlineScript: TextScript;
  /** The Sanskrit tithi under a regional headline, or "". */
  sub: string;
  gloss: string;
  year: string;
}

/** The same moment as each of the six traditions dates it, each in its own
 *  script where it has one. */
export function traditionDates(base: BaseReading, at: Date, clockText?: (d: Date) => string): TraditionDate[] {
  return TRADITIONS.map((t) => {
    const view = cardView(forTradition(base, t.id), at, t.regional ? "regional" : "devanagari", clockText);
    return {
      id: t.id,
      label: t.label,
      headline: view.headline,
      headlineScript: view.headlineScript,
      sub: view.sub,
      gloss: view.gloss,
      year: view.year,
    };
  });
}

// ── the hub's live lines ───────────────────────────────────────────────

export interface HubStats {
  /** The Sun's next rising or setting. */
  sunEvent: { kind: "sunrise" | "sunset"; at: Date } | null;
  litPercent: number;
  /** Ghatikas gone since sunrise, 0 to 59. Null near the poles. */
  ghatika: number | null;
  yearMonths: number;
  kali: number;
}

export function hubStats(snap: Snapshot, at: Date): HubStats {
  const set = sunsetAfter(at, snap.place, 1);
  const rise = snap.dayEnd;
  let sunEvent: HubStats["sunEvent"] = null;
  if (set && (!rise || set.getTime() < rise.getTime())) sunEvent = { kind: "sunset", at: set };
  else if (rise) sunEvent = { kind: "sunrise", at: rise };
  return {
    sunEvent,
    litPercent: Math.round(litFraction(elongation(at)) * 100),
    ghatika: snap.dayStart ? Math.min(59, ghatiOf(at.getTime() - snap.dayStart.getTime()).ghatika) : null,
    yearMonths: yearModel(at).months.length,
    kali: snap.years.kali,
  };
}
