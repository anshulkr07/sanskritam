// What the Home card says at a given moment.
//
// Two steps, so the card can tick every minute without redoing the astronomy:
//   snapshot()  the slow part. Finds the running tithi, nakshatra, lunation,
//               Hindu day and, where the tradition has one, solar date, and
//               notes when the first of them next changes.
//   cardView()  the quick part. Reads the Moon's angle now and turns a
//               snapshot into the strings and numbers the card draws.
//
// Pure: no React, no storage. The card shows what is true NOW and when it
// changes, not the tithi at sunrise: which day a festival falls on is a
// different question, and Ask answers it.

import {
  elongation,
  lunarYears,
  lunationAt,
  nakshatraAt,
  purnimantaMonth,
  solarDateOn,
  sunriseAfter,
  sunriseBefore,
  tithiAt,
  type CivilDate,
  type Lunation,
  type LunarYears,
  type SolarDate,
  type Tithi,
} from "./engine";
import {
  digits,
  GUJARATI,
  GUJARATI_MONTHS,
  GUJARATI_TITHIS,
  REGIONAL_WEEKDAYS,
  SOLAR_MONTHS,
  type RegionalScript,
} from "./regionalNames";
import { FULL_NEW, MONTHS, NAKSHATRAS, PAKSHAS, SAMVATSARAS, TITHIS, WEEKDAYS, WORDS, type SanskritName } from "./sanskritNames";
import { TRADITIONS, traditionById, type KalaPlace, type ScriptChoice, type TraditionId } from "./traditions";

/** The learner's wall clock at the place: its calendar date and the minutes
 *  since its midnight. The caller reads these from the device. */
export interface WallClock {
  date: CivilDate;
  minutes: number;
}

/** The part of a reading that is the same in every tradition: the sky, and
 *  the learner's day. */
export interface BaseReading {
  place: KalaPlace;
  at: Date;
  /** The learner's wall clock when the reading was taken. */
  clock: WallClock;
  /** The first moment after `at` at which anything here changes. */
  validUntil: Date;
  tithi: Tithi;
  nakshatra: { index: number; end: Date };
  lunation: Lunation;
  years: LunarYears;
  /** The weekday of the Hindu day now running (it turns at sunrise, not at
   *  midnight). 0 is Sunday. */
  weekday: number;
  /** The sunrise that opened the Hindu day, and the one that closes it. */
  dayStart: Date | null;
  dayEnd: Date | null;
}

export interface Snapshot extends BaseReading {
  traditionId: TraditionId;
  solar: SolarDate | null;
}

function weekdayOf(c: CivilDate): number {
  return new Date(Date.UTC(c.y, c.m - 1, c.d)).getUTCDay();
}

/** The slow part of a reading. A few tens of milliseconds: take it when
 *  `validUntil` passes, not every minute. */
export function baseReading(at: Date, clock: WallClock, place: KalaPlace): BaseReading {
  const tithi = tithiAt(at);
  const nakshatra = nakshatraAt(at);
  const lunation = lunationAt(at);

  // The Hindu day began at the latest sunrise. If that was before the
  // learner's midnight, the weekday is still yesterday's.
  let weekday = weekdayOf(clock.date);
  const rise = sunriseBefore(at, place);
  if (rise && (at.getTime() - rise.getTime()) / 60000 > clock.minutes) weekday = (weekday + 6) % 7;

  const nextRise = sunriseAfter(at, place, 1.5);
  const nextMidnight = at.getTime() + (1440 - clock.minutes) * 60000;
  const validUntil = Math.min(
    tithi.end.getTime(),
    nakshatra.end.getTime(),
    lunation.end.getTime(),
    nextRise ? nextRise.getTime() : Infinity,
    nextMidnight,
  );

  return {
    place,
    at,
    clock,
    validUntil: new Date(validUntil + 1000),
    tithi,
    nakshatra,
    lunation,
    years: lunarYears(lunation),
    weekday,
    dayStart: rise,
    dayEnd: nextRise,
  };
}

/** A reading as one tradition dates it. Cheap for a lunar tradition; a solar
 *  one adds its own month and day. */
export function forTradition(base: BaseReading, traditionId: TraditionId): Snapshot {
  const tradition = traditionById(traditionId);
  const solar = tradition.solar
    ? solarDateOn(base.clock.date, tradition.solar.rule, tradition.solar.ref, tradition.solar.yearStartSign)
    : null;
  return { ...base, traditionId: tradition.id, solar };
}

/** Work out everything the card needs for an instant. */
export function snapshot(at: Date, clock: WallClock, place: KalaPlace, traditionId: TraditionId): Snapshot {
  return forTradition(baseReading(at, clock, place), traditionId);
}

// ── names ──────────────────────────────────────────────────────────────

export function cap(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);
}

/** A name as it stands alone in roman: the first case without its visarga,
 *  or the bare stem where the first case only adds an m (a neuter). */
export function romanName(n: SanskritName): string {
  if (n.nomIast === `${n.iast}m`) return cap(n.iast);
  return cap(n.nomIast.replace(/ḥ$/, ""));
}

export function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  const last = n % 10;
  return `${n}${last === 1 ? "st" : last === 2 ? "nd" : last === 3 ? "rd" : "th"}`;
}

export interface TithiParts {
  /** 0 the bright half, 1 the dark half. */
  half: 0 | 1;
  /** 1 to 15 within the half. */
  day: number;
  name: SanskritName;
}

export function tithiParts(number: number): TithiParts {
  const half: 0 | 1 = number <= 15 ? 0 : 1;
  const day = number <= 15 ? number : number - 15;
  return { half, day, name: day === 15 ? FULL_NEW[half] : TITHIS[day - 1] };
}

export const WEEKDAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ── the card ───────────────────────────────────────────────────────────

/** Which face a string is set in. */
export type TextScript = "sanskrit" | "devanagari" | "roman" | RegionalScript;

export interface CardView {
  /** 1 to 30. */
  tithiNumber: number;
  /** The Moon's angle from the Sun now, 0 to 360. */
  elongation: number;
  /** How far through the tithi, 0 to 1. */
  progress: number;
  /** 0 is Sunday. */
  weekday: number;
  /** "Today" in Sanskrit. */
  eyebrow: string;
  headline: string;
  headlineScript: TextScript;
  /** The Sanskrit tithi under a regional headline, or "". */
  sub: string;
  gloss: string;
  /** "until 12:36" */
  until: string;
  /** The tithi that follows: in Devanagari ("" in roman), and in roman. */
  nextScript: string;
  nextRoman: string;
  weekdayText: string;
  weekdayScript: TextScript;
  nakshatra: string;
  year: string;
  /** One sentence for a screen reader. */
  label: string;
  /** The big faint numeral behind the card. */
  watermark: string;
  watermarkScript: TextScript;
}

function defaultClock(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** Turn a snapshot into what the card draws at `at`. `clockText` writes an
 *  instant as a time of day for the learner (the default uses the device's
 *  own zone). */
export function cardView(
  snap: Snapshot,
  at: Date,
  scriptChoice: ScriptChoice,
  clockText: (d: Date) => string = defaultClock,
): CardView {
  const tradition = traditionById(snap.traditionId);
  const { tithi, lunation } = snap;
  const t = tithiParts(tithi.number);
  const next = tithiParts((tithi.number % 30) + 1);
  const span = tithi.end.getTime() - tithi.start.getTime();
  const progress = span > 0 ? Math.min(1, Math.max(0, (at.getTime() - tithi.start.getTime()) / span)) : 0;

  const month =
    tradition.monthEnd === "purnimanta"
      ? purnimantaMonth(lunation, tithi.number)
      : { month: lunation.month, adhika: lunation.adhika };
  const monthName = MONTHS[month.month];
  const halfName = PAKSHAS[t.half];
  const halfEn = t.half === 0 ? "waxing" : "waning";
  const moonEn = t.day === 15 ? (t.half === 0 ? "full moon" : "new moon") : "";

  // "My script" only means something where the region has a script of its own.
  const regional: RegionalScript | null = scriptChoice === "regional" ? (tradition.regional ?? null) : null;
  const roman = scriptChoice === "roman";

  // The Sanskrit date: month, half, tithi.
  const sanskritDate = [month.adhika ? WORDS.adhika.dev : "", monthName.dev, t.day === 15 ? "" : halfName.dev, t.name.nom]
    .filter(Boolean)
    .join(" ");
  const romanDate = [month.adhika ? "Adhika" : "", cap(monthName.iast), t.day === 15 ? "" : cap(halfName.iast), cap(t.name.nomIast)]
    .filter(Boolean)
    .join(" ");
  const monthEn = (month.adhika ? "Adhika " : "") + cap(monthName.iast);
  const lunarGloss = moonEn ? `${monthEn} · ${moonEn}` : `${monthEn} · ${halfEn} fortnight · ${ordinal(t.day)} day`;

  let headline = roman ? romanDate : sanskritDate;
  let headlineScript: TextScript = roman ? "roman" : "sanskrit";
  let sub = "";
  let gloss = lunarGloss;
  let watermark = digits(t.day, roman ? "latin" : "devanagari");
  let watermarkScript: TextScript = roman ? "roman" : "devanagari";

  if (snap.solar && tradition.solar) {
    const names = SOLAR_MONTHS[tradition.solar.names];
    const tithiEn = moonEn || `${halfEn} ${ordinal(t.day)} day`;
    gloss = `${ordinal(snap.solar.day)} of ${names.roman[snap.solar.sign]} · ${tithiEn}`;
    if (regional) {
      const dayText = digits(snap.solar.day, regional === "bengali" ? "bengali" : "latin");
      headline = regional === "bengali" ? `${dayText} ${names.native[snap.solar.sign]}` : `${names.native[snap.solar.sign]} ${dayText}`;
      headlineScript = regional;
      sub = t.day === 15 ? t.name.nom : `${halfName.dev}${WORDS.paksha.loc} ${t.name.nom}`;
      watermark = dayText;
      watermarkScript = regional === "bengali" ? "bengali" : "roman";
    }
  } else if (regional === "gujarati") {
    // The date as Drik Panchang's Gujarati pages write it: the month, a
    // comma, the half and the tithi by name ("ભાદરવો, વદ પાંચમ"), with the
    // full and new moon by their own names and an added month marked after
    // the month's name ("જેઠ અધિક, સુદ પડવો").
    const dayText = tithi.number === 30 ? GUJARATI.amas : GUJARATI_TITHIS[t.day - 1];
    const monthText = month.adhika ? `${GUJARATI_MONTHS[month.month]} ${GUJARATI.adhik}` : GUJARATI_MONTHS[month.month];
    headline = `${monthText}, ${t.half === 0 ? GUJARATI.sud : GUJARATI.vad} ${dayText}`;
    headlineScript = "gujarati";
    sub = [monthName.loc, t.day === 15 ? "" : `${halfName.dev}${WORDS.paksha.loc}`, t.name.nom].filter(Boolean).join(" ");
    watermark = digits(t.day, "gujarati");
    watermarkScript = "gujarati";
  }

  const weekdayName = WEEKDAYS[snap.weekday];
  const weekdayText = regional ? REGIONAL_WEEKDAYS[regional][snap.weekday] : roman ? cap(weekdayName.nomIast) : weekdayName.nom;
  const weekdayScript: TextScript = regional ?? (roman ? "roman" : "devanagari");

  const y = snap.years;
  let year: string;
  switch (tradition.year) {
    case "shaka":
      year = `Śaka ${y.shaka}`;
      break;
    case "vikramaKartikadi":
      year = `Vikrama ${y.vikramaKartikadi}`;
      break;
    case "tamil":
      year = snap.solar ? romanName(SAMVATSARAS[(((snap.solar.yearStartGregorian - 1987) % 60) + 60) % 60]) : "";
      break;
    case "kollam":
      year = snap.solar ? `Kollam ${snap.solar.yearStartGregorian - 824}` : "";
      break;
    case "bangabda":
      year = snap.solar ? `Baṅgābda ${snap.solar.yearStartGregorian - 593}` : "";
      break;
    default:
      year = `Vikrama ${y.vikrama}`;
  }

  const nakshatra = cap(NAKSHATRAS[snap.nakshatra.index].iast);
  const until = `until ${clockText(tithi.end)}`;
  const nextRoman = cap(next.name.nomIast);

  return {
    tithiNumber: tithi.number,
    elongation: elongation(at),
    progress,
    weekday: snap.weekday,
    eyebrow: WORDS.adya.nom,
    headline,
    headlineScript,
    sub,
    gloss,
    until,
    nextScript: roman ? "" : next.name.nom,
    nextRoman,
    weekdayText,
    weekdayScript,
    nakshatra,
    year,
    label: `Today. ${gloss.replace(/ · /g, ", ")}, ${until}, then ${nextRoman}. ${WEEKDAYS_EN[snap.weekday]}. Moon in ${nakshatra}. ${year}.`,
    watermark,
    watermarkScript,
  };
}

/** What each tradition calls the month now, for the chooser's right-hand
 *  column: its wall-calendar name in its own script. One pass for all six. */
export function monthPreviews(at: Date, clock: WallClock): Record<TraditionId, { text: string; script: TextScript }> {
  const tithi = tithiAt(at);
  const lunation = lunationAt(at);
  const out = {} as Record<TraditionId, { text: string; script: TextScript }>;
  for (const tradition of TRADITIONS) {
    if (tradition.solar) {
      const s = solarDateOn(clock.date, tradition.solar.rule, tradition.solar.ref, tradition.solar.yearStartSign);
      out[tradition.id] = { text: SOLAR_MONTHS[tradition.solar.names].native[s.sign], script: tradition.solar.names };
    } else if (tradition.regional === "gujarati") {
      out[tradition.id] = { text: GUJARATI_MONTHS[lunation.month], script: "gujarati" };
    } else {
      const month = tradition.monthEnd === "purnimanta" ? purnimantaMonth(lunation, tithi.number).month : lunation.month;
      out[tradition.id] = { text: MONTHS[month].dev, script: "devanagari" };
    }
  }
  return out;
}
