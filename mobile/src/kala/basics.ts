// The basics cards of Kāla, worked out from the engine.
//
// Pure: no React, no storage, no network. `node scripts/check-kala.mjs`
// holds all of it.
//
// Every Sanskrit string comes from sanskritNames.ts (made by Vidyut).
//
// Where each fact on the cards was read (2026-10-05), each at the source:
//   Surya Siddhanta (GRETIL's e-text of the 1854 Bibliotheca Indica edition):
//     1.10 two kinds of time, one that ends the worlds and one "of the nature
//     of counting" (kalanatmaka); 1.12-13 the day by sunrises, the lunar month
//     of thirty tithis, the solar month by the Sun's change of sign, twelve
//     months to a year; 1.15 the four-age cycle counted in the Sun's years;
//     1.16-17 the ages in tenths, 4, 3, 2 and 1, set out "by the feet of
//     dharma"; 1.18-23 a manvantara of 71 cycles with a junction as long as
//     the first age after it, fourteen Manus and a fifteenth junction to a
//     kalpa, a day of Brahma, his night as long, his life a hundred years,
//     half gone, this the first kalpa of the rest, six Manus gone and 27
//     cycles of Vaivasvata's; 2.64 a star's stretch 800 minutes of arc, a
//     tithi's 720; 12.31 the seven from the highest down, Saturn, Jupiter,
//     Mars, the Sun, Venus, Mercury, the Moon; 12.78-79 the lords of the days
//     each the fourth down that list from Saturn, the lords of the hours down
//     it in turn from Saturn.
//   Manusmrti (GRETIL): 1.61-62 the first seven Manus; 1.66 a month is a day
//     and night of the ancestors, the dark half their day; 1.67 a year is a
//     day and night of the gods, the northward course their day; 1.72 a
//     thousand ages a day of Brahma, his night as long; 1.79 71 ages to a
//     manvantara; 1.81-82 dharma four-footed in the Krta age, a foot less in
//     each age after.
//   Bhagavata Purana (vedabase.io): 3.11.33-34 Brahma's hundred years, the
//     first half over and the second running; 3.11.37 this kalpa, the first
//     of the second half, called Varaha, "in which Hari was a boar"; 8.1.23
//     and 8.13 the Manus; 8.13.36 fourteen Manus to a kalpa of a thousand
//     cycles.
//   Monier-Williams 1899 (University of Cologne): kala from kal, "to
//     calculate or enumerate"; kalpa "a day of Brahma ... we are now in the
//     svetavaraha-kalpa of the fifty-first" year of his life; svetavaraha
//     "the first day in the month of Brahma"; sveta "white"; varaha
//     "relating to the Boar form of Vishnu"; parardha; manu "the
//     representative man and father of the human race", fourteen to a kalpa;
//     vivasvat "the Sun"; krta, treta, dvapara and kali, the sides of a die
//     marked with four, three, two and one dots, and the four ages; the Kali
//     age beginning in February 3102 BC; ayana, uttarayana, daksinayana; rtu,
//     six seasons "in later time"; masa "the moon; a month", reckoned from the
//     new or from the full moon; the star of each month (MONTH_STARS); paksa
//     "a wing ... the half of a lunar month" of fifteen tithis; sukla, krsna;
//     the tithis as ordinals; amavasya, "when the sun and moon dwell
//     together"; vara and vasara; the seven planets; naksatra.
//   Panini 4.2.21 (GRETIL's Astadhyayi): sa 'smin paurnamasi iti sanjnayam, a
//     name meaning "that is the full moon in it".
//   Drik Panchang: "In Panchang day starts and ends with sunrise", and its
//     two ayanas, Drik and Vedic, on 1 and 20 January and 1 July 2027.

import {
  ayanaAt,
  KALPA_YEARS,
  KALPA_YEARS_BEFORE_KALI,
  MANVANTARA_YEARS,
  nextSankrantiInto,
  nextSolstice,
  tropicalSun,
  YUGA_YEARS,
  type Lunation,
} from "./engine";
import type { YearModel } from "./learn";
import { FULL_NEW, GRAHAS, MANUS, MONTHS, NAKSHATRAS, SPANS, TITHIS, UNITS, WORDS, YUGAS, type SanskritName } from "./sanskritNames";
import { cap, ordinal, romanName, tithiParts, type Snapshot } from "./today";

const DAY_MS = 86400000;

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

function mod(x: number, m: number): number {
  return ((x % m) + m) % m;
}

// ── time: where now falls in each cycle ────────────────────────────────

export type CycleKey = "day" | "month" | "year" | "age" | "kalpa";

export interface CycleRow {
  key: CycleKey;
  name: SanskritName;
  title: string;
  /** What one turn of it is. */
  span: string;
  /** How far through it the moment is, 0 to 1. Null for the day where the
   *  Sun does not rise. */
  fraction: number | null;
}

/** Five cycles, one inside the next, and how far through each the moment
 *  is: the day from sunrise, the month from the new moon, the year from the
 *  Caitra new moon, the Kali age and the kalpa in years. */
export function cycleRows(snap: Snapshot, at: Date, year: YearModel): CycleRow[] {
  const t = at.getTime();
  const day = snap.dayStart && snap.dayEnd ? clamp01((t - snap.dayStart.getTime()) / (snap.dayEnd.getTime() - snap.dayStart.getTime())) : null;
  const month = clamp01((t - snap.lunation.start.getTime()) / (snap.lunation.end.getTime() - snap.lunation.start.getTime()));
  const yearPart = clamp01((t - year.start.getTime()) / (year.end.getTime() - year.start.getTime()));
  const kali = snap.years.kali + yearPart;
  return [
    { key: "day", name: UNITS[5], title: "Day and night", span: "Sunrise to sunrise", fraction: day },
    { key: "month", name: WORDS.masa, title: "Month", span: "New moon to new moon", fraction: month },
    { key: "year", name: WORDS.samvatsara, title: "Year", span: `${cap(MONTHS[0].iast)} to ${cap(MONTHS[0].iast)}`, fraction: yearPart },
    { key: "age", name: YUGAS[3], title: "Kali age", span: "432,000 years", fraction: kali / YUGA_YEARS[3] },
    { key: "kalpa", name: SPANS[2], title: "Kalpa", span: "4,320,000,000 years", fraction: (KALPA_YEARS_BEFORE_KALI + kali) / KALPA_YEARS },
  ];
}

/** A share as a percentage with one decimal under 10, none above. */
export function percentText(fraction: number): string {
  const p = fraction * 100;
  return p < 10 ? `${(Math.round(p * 10) / 10).toFixed(1)}%` : `${Math.round(p)}%`;
}

// ── the kalpa: a day of Brahma ─────────────────────────────────────────

export interface KalpaPiece {
  kind: "junction" | "manu";
  /** 0 to 14 for a junction, 0 to 13 for a Manu. */
  index: number;
  /** Where it sits in the kalpa, 0 to 1. */
  from: number;
  to: number;
}

/** The kalpa as the Surya Siddhanta builds it (1.18-19): a junction as long
 *  as the first age at the start, then each Manu's 71 cycles with another
 *  such junction after it. Fifteen junctions and fourteen Manus. */
export function kalpaPieces(): KalpaPiece[] {
  const junction = YUGA_YEARS[0];
  const out: KalpaPiece[] = [{ kind: "junction", index: 0, from: 0, to: junction / KALPA_YEARS }];
  let years = junction;
  for (let m = 0; m < 14; m++) {
    out.push({ kind: "manu", index: m, from: years / KALPA_YEARS, to: (years + MANVANTARA_YEARS) / KALPA_YEARS });
    years += MANVANTARA_YEARS;
    out.push({ kind: "junction", index: m + 1, from: years / KALPA_YEARS, to: (years + junction) / KALPA_YEARS });
    years += junction;
  }
  return out;
}

export interface BrahmaModel {
  /** Years of this kalpa gone, and how far through it that is. */
  yearsGone: number;
  day01: number;
  /** Years still to go to the middle of Brahma's day. */
  toNoon: number;
  pieces: KalpaPiece[];
}

export function brahmaModel(kali: number): BrahmaModel {
  const yearsGone = KALPA_YEARS_BEFORE_KALI + kali;
  return { yearsGone, day01: yearsGone / KALPA_YEARS, toNoon: KALPA_YEARS / 2 - yearsGone, pieces: kalpaPieces() };
}

// ── the manvantara ─────────────────────────────────────────────────────

/** The present Manu, Vaivasvata, is the seventh (Surya Siddhanta 1.22;
 *  Bhagavata Purana 8.13.1). */
export const MANU_NOW = 7;

export interface ManuRow {
  number: number;
  name: SanskritName;
  roman: string;
  state: "gone" | "now" | "coming";
}

export function manuRows(): ManuRow[] {
  return MANUS.map((name, i) => ({
    number: i + 1,
    name,
    roman: romanName(name),
    state: i + 1 < MANU_NOW ? "gone" : i + 1 === MANU_NOW ? "now" : "coming",
  }));
}

// ── the Sun's two halves ───────────────────────────────────────────────

/** The tilt of the Sun's path to the equator, in degrees: enough for the
 *  shape of the curve, which carries no numbers. */
const OBLIQUITY = 23.44;

/** How far north (positive) or south of the equator the Sun stands, in
 *  degrees, at a tropical longitude. */
export function declinationOf(tropicalLongitude: number): number {
  const r = Math.PI / 180;
  return Math.asin(Math.sin(OBLIQUITY * r) * Math.sin(tropicalLongitude * r)) / r;
}

export interface AyanaModel {
  /** The calendar year drawn: 1 January to 1 January, UTC. */
  start: Date;
  end: Date;
  /** The Sun's height north or south through the year. */
  curve: { at01: number; dec: number }[];
  /** The Sun's two turns in the year: `north` is the June one, where it
   *  stops going north. */
  turns: { north: boolean; at: Date; at01: number }[];
  /** The two sign entries that open the almanac's halves: Makara (9) and
   *  Karka (3). */
  entries: { sign: number; at: Date; at01: number }[];
  now01: number;
  /** The almanac's half now: 0 northward (uttarayana), 1 southward. */
  almanac: 0 | 1;
  /** Which way the Sun itself is going now: 0 north, 1 south. */
  sun: 0 | 1;
  /** Days from each solstice to the sign entry after it, this year,
   *  rounded. */
  lagDays: number;
  /** When each next turns. */
  nextAlmanac: { sign: number; at: Date };
  nextSun: { north: boolean; at: Date };
}

let ayanaCache: { year: number; model: Omit<AyanaModel, "now01" | "almanac" | "sun" | "nextAlmanac" | "nextSun"> } | null = null;

export function ayanaModel(at: Date): AyanaModel {
  const y = at.getUTCFullYear();
  if (!ayanaCache || ayanaCache.year !== y) {
    const start = new Date(Date.UTC(y, 0, 1));
    const end = new Date(Date.UTC(y + 1, 0, 1));
    const span = end.getTime() - start.getTime();
    const at01 = (d: Date) => (d.getTime() - start.getTime()) / span;
    const curve = Array.from({ length: 73 }, (_, i) => {
      const d = new Date(start.getTime() + (span * i) / 72);
      return { at01: i / 72, dec: declinationOf(tropicalSun(d)) };
    });
    const june = nextSolstice(start);
    const december = nextSolstice(new Date(june.at.getTime() + DAY_MS));
    const makara = nextSankrantiInto(start, 9);
    const karka = nextSankrantiInto(start, 3);
    const makaraAfter = nextSankrantiInto(december.at, 9);
    const lag = ((karka.getTime() - june.at.getTime()) + (makaraAfter.getTime() - december.at.getTime())) / 2 / DAY_MS;
    ayanaCache = {
      year: y,
      model: {
        start,
        end,
        curve,
        turns: [june, december].map((s) => ({ north: s.north, at: s.at, at01: at01(s.at) })),
        entries: [
          { sign: 9, at: makara, at01: at01(makara) },
          { sign: 3, at: karka, at01: at01(karka) },
        ],
        lagDays: Math.round(lag),
      },
    };
  }
  const base = ayanaCache.model;
  const almanac = ayanaAt(at);
  const lon = tropicalSun(at);
  const nextSign = almanac === 0 ? 3 : 9;
  return {
    ...base,
    now01: clamp01((at.getTime() - base.start.getTime()) / (base.end.getTime() - base.start.getTime())),
    almanac,
    sun: lon >= 270 || lon < 90 ? 0 : 1,
    nextAlmanac: { sign: nextSign, at: nextSankrantiInto(at, nextSign) },
    nextSun: nextSolstice(at),
  };
}

// ── the seasons ────────────────────────────────────────────────────────

export interface RituSpan {
  ritu: number;
  months: Lunation[];
  /** Where the season sits in this lunar year, 0 to 1. */
  from: number;
  to: number;
  start: Date;
  end: Date;
}

/** This lunar year's six seasons, each the run of months it takes. An added
 *  month falls in the season of the month it is named after, so that season
 *  holds three. */
export function rituSpans(year: YearModel): RituSpan[] {
  const out: RituSpan[] = [];
  for (const m of year.months) {
    const last = out[out.length - 1];
    if (last && last.ritu === m.ritu) {
      last.months.push(m.lunation);
      last.to = m.to;
      last.end = m.lunation.end;
    } else {
      out.push({ ritu: m.ritu, months: [m.lunation], from: m.from, to: m.to, start: m.lunation.start, end: m.lunation.end });
    }
  }
  return out;
}

// ── the months ─────────────────────────────────────────────────────────

/** The star, or pair of stars, each month is named after, by index into
 *  NAKSHATRAS, Caitra first. As Monier-Williams gives each: caitra, its full
 *  moon "standing in the constellation Citra"; vaisakha "fr. vi-sakha";
 *  jyaistha, "the full moon standing in the constellation Jyestha"; asadha,
 *  "the full moon is near the constellation Asadha" (two mansions, with
 *  purva and uttara); sravana, "relating to the Naksatra Sravana";
 *  bhadrapada "fr. bhadra-pada", a name "common to the 3rd and 4th
 *  Naksatras"; asvina, "the moon is near to the constellation Asvini";
 *  karttika "fr. krttika ... when the full moon is near the Pleiades";
 *  margasirsa, "the full moon enters the constellation Mrga-siras"; pausa,
 *  "the full moon is in the asterism Pusya"; magha, "has its full moon in
 *  the constellation Magha"; phalguna, "the full moon stands in the Naksatra
 *  Phalguni". */
export const MONTH_STARS: number[][] = [[13], [15], [17], [19, 20], [21], [24, 25], [0], [2], [4], [7], [9], [10, 11]];

const GREGORIAN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** About when each month falls, Caitra first: from the Gregorian month in
 *  which the full-moon reckoning opens it to the one holding the middle of
 *  the new-moon reckoning's. scripts/check-kala.mjs holds both ends to the
 *  engine over twenty years. They are the pairs Monier-Williams gives, where
 *  it gives one (vaisakha "April-May" to phalguna "February-March"). */
export const MONTH_ABOUT: [number, number][] = [[2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 11], [11, 0], [0, 1], [1, 2]];

export function aboutText(month: number): string {
  const [a, b] = MONTH_ABOUT[month];
  return `${GREGORIAN[a]} to ${GREGORIAN[b]}`;
}

/** A month's name in roman, as the year wheel writes it. */
export function monthRoman(month: number): string {
  return cap(MONTHS[month].iast);
}

export interface MonthCardModel {
  index: number;
  name: SanskritName;
  roman: string;
  stars: SanskritName[];
  /** "Citrā", or "Pūrvāṣāḍhā and Uttarāṣāḍhā". */
  starText: string;
  ritu: number;
  about: string;
  /** The month the learner's own calendar is in now. */
  now: boolean;
  /** True when now is the added month of this name. */
  adhikaNow: boolean;
}

/** The twelve months, Caitra first. `current` is the month the learner's
 *  calendar is in (learn.traditionMonth), if known. */
export function monthCards(current: { month: number; adhika: boolean } | null): MonthCardModel[] {
  return MONTHS.map((name, i) => {
    const stars = MONTH_STARS[i].map((s) => NAKSHATRAS[s]);
    return {
      index: i,
      name,
      roman: monthRoman(i),
      stars,
      starText: stars.map((s) => romanName(s)).join(" and "),
      ritu: Math.floor(i / 2),
      about: aboutText(i),
      now: current !== null && current.month === i,
      adhikaNow: current !== null && current.month === i && current.adhika,
    };
  });
}

// ── the tithis ─────────────────────────────────────────────────────────

export interface TithiRow {
  key: string;
  /** "1" to "14", or "15" for the full and new moons. */
  number: string;
  name: SanskritName;
  roman: string;
  gloss: string;
  now: boolean;
}

/** The sixteen names: the fourteen numbered tithis either half shares, then
 *  the full moon and the new moon. */
export function tithiRows(tithiNumber: number): TithiRow[] {
  const now = tithiParts(tithiNumber);
  const rows: TithiRow[] = TITHIS.map((name, i) => ({
    key: `t${i + 1}`,
    number: String(i + 1),
    name,
    roman: romanName(name),
    gloss: `The ${ordinal(i + 1)}`,
    now: now.day === i + 1,
  }));
  rows.push({ key: "full", number: "15", name: FULL_NEW[0], roman: romanName(FULL_NEW[0]), gloss: "Full moon", now: now.day === 15 && now.half === 0 });
  rows.push({ key: "new", number: "15", name: FULL_NEW[1], roman: romanName(FULL_NEW[1]), gloss: "New moon", now: now.day === 15 && now.half === 1 });
  return rows;
}

// ── the weekdays ───────────────────────────────────────────────────────

/** The seven from the highest down, as the Surya Siddhanta lists them
 *  (12.31), by weekday index (0 Sunday): Saturn, Jupiter, Mars, the Sun,
 *  Venus, Mercury, the Moon. */
export const BY_HEIGHT = [6, 4, 2, 0, 5, 3, 1];

/** What each graha is, Sunday's first (Monier-Williams). */
export const GRAHAS_EN = ["The Sun", "The Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];

/** The lords of the days, from Saturn's day on: each the fourth down the
 *  list from the one before, counting that one as the first (12.78). They
 *  come out in the order of the week. */
export function dayLords(): number[] {
  const out: number[] = [];
  let at = 0;
  for (let i = 0; i < 7; i++) {
    out.push(BY_HEIGHT[at]);
    at = (at + 3) % 7;
  }
  return out;
}

/** The lord of an hour counted from a day's first hour, whose lord is the
 *  day's: the hours run down the list in turn (12.79). */
export function hourLord(weekday: number, hoursOn: number): number {
  return BY_HEIGHT[mod(BY_HEIGHT.indexOf(weekday) + hoursOn, 7)];
}

export interface WeekdayRow {
  weekday: number;
  graha: SanskritName;
  grahaEn: string;
}

export function weekdayRows(): WeekdayRow[] {
  return GRAHAS.map((graha, i) => ({ weekday: i, graha, grahaEn: GRAHAS_EN[i] }));
}

// ── the stars ──────────────────────────────────────────────────────────

/** The Moon's mean time round the stars, in days. scripts/check-kala.mjs
 *  holds it to the engine's Moon over a hundred rounds. */
export const SIDEREAL_MONTH_DAYS = 27.3217;
