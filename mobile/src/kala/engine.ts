// Kāla engine: the Hindu calendar, worked out on the phone.
//
// A port of backend/app/services/panchang.py onto the JavaScript build of the
// same astronomy-engine release (2.1.19, MIT), so the Home card and an Ask
// answer cannot disagree. `node scripts/check-kala.mjs` holds this file to the
// server's numbers (scripts/kala-fixtures.json) and to Drik Panchang's day for
// New Delhi, 1 October 2026. Never use Swiss Ephemeris here either: it is
// AGPL or commercial.
//
// Pure functions: no React, no storage, no network. Everything takes a UTC
// instant as a Date and gives UTC instants back.
//
// Conventions are the server's. Ayanamsa: Lahiri, 23.857 degrees at J2000
// plus 50.29 arcseconds a year. Tithi: the Moon's elongation from the Sun in
// steps of 12 degrees. Amanta months are named from the Sun's sidereal sign
// at the new moon that opens them: Mina gives Chaitra, Mesha gives Vaishakha.
//
// Three places where this file deliberately does NOT copy the server, each
// checked by scripts/check-kala.mjs:
//   - a nakshatra or yoga end is always bisected, where the server falls back
//     to a rough estimate if the longitude wraps past 360 within two days;
//   - the dark half of an added month keeps the added month's name in the
//     purnimanta reckoning, where the server names it after the next month;
//   - the year turns at the Chaitra new moon, where the server falls back to
//     a fixed 22 March.

import type * as AstronomyModule from "astronomy-engine";

type Astro = typeof AstronomyModule;

let loaded: Astro | null = null;

/** Loaded on first use. The library builds its tables on load, and Home must
 *  not wait for that before its first frame. */
function astro(): Astro {
  if (loaded === null) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    loaded = require("astronomy-engine") as Astro;
  }
  return loaded;
}

const HOUR_MS = 3600000;
const DAY_MS = 86400000;
/** 2000-01-01 12:00 UTC, and a Julian year, as the server counts them. */
const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);
const JULIAN_YEAR_MS = 31557600000;
const AYANAMSA_J2000 = 23.857;
const AYANAMSA_RATE = 50.29 / 3600;
/** Reference calendars are worked out for Indian Standard Time. */
const IST_MS = 5.5 * HOUR_MS;

function mod(x: number, m: number): number {
  return ((x % m) + m) % m;
}

// ── longitudes ─────────────────────────────────────────────────────────

/** Lahiri ayanamsa in degrees. */
export function ayanamsa(at: Date): number {
  return AYANAMSA_J2000 + ((at.getTime() - J2000_MS) / JULIAN_YEAR_MS) * AYANAMSA_RATE;
}

/** The Moon's sidereal longitude, 0 to 360. */
export function siderealMoon(at: Date): number {
  return mod(astro().EclipticGeoMoon(at).lon - ayanamsa(at), 360);
}

/** The Sun's sidereal longitude, 0 to 360. */
export function siderealSun(at: Date): number {
  const A = astro();
  return mod(A.EclipticLongitude(A.Body.Earth, at) + 180 - ayanamsa(at), 360);
}

/** The Moon's elongation from the Sun: 0 at new moon, 180 at full. */
export function elongation(at: Date): number {
  return mod(astro().MoonPhase(at), 360);
}

/** The lit share of the Moon's disc, 0 to 1, for an elongation in degrees. */
export function litFraction(elongationDeg: number): number {
  return (1 - Math.cos((elongationDeg * Math.PI) / 180)) / 2;
}

// ── tithi and karana ───────────────────────────────────────────────────

export interface Tithi {
  /** 1 to 30. 1 to 15 is the bright half ending in the full moon, 16 to 30
   *  the dark half ending in the new moon. */
  number: number;
  start: Date;
  end: Date;
}

/** The tithi running at an instant, with the instants it opens and closes. */
export function tithiAt(at: Date): Tithi {
  const A = astro();
  const idx = Math.floor(elongation(at) / 12) % 30;
  const endT = A.SearchMoonPhase(((idx + 1) * 12) % 360, at, 2);
  const end = endT ? endT.date : new Date(at.getTime() + 1.2 * DAY_MS);
  // A tithi never runs longer than 27 hours, so its opening edge lies inside
  // the 28 hours before `at`.
  const startT = A.SearchMoonPhase(idx * 12, new Date(at.getTime() - 28 * HOUR_MS), 2);
  const start = startT ? startT.date : new Date(end.getTime() - DAY_MS);
  return { number: idx + 1, start, end };
}

export const KARANAS_MOVABLE = ["Bava", "Balava", "Kaulava", "Taitila", "Garaja", "Vanija", "Vishti"] as const;

/** The karana (half tithi) running at an instant, by the server's names.
 *
 *  The four fixed ones run Shakuni, Chatushpada, Naga, Kimstughna from the
 *  second half of the dark fourteenth, as almanacs print them: Drik Panchang
 *  for New Delhi on 10 October 2026 has Chatushpada until 09:24, then Naga
 *  until 21:19, then Kimstughna (read 2026-10-02; scripts/check-kala.mjs
 *  keeps it). The Surya Siddhanta's verse (2.67), as Ranganatha's commentary
 *  reads it, puts Naga second and Catushpada third; the almanac's order is
 *  the one used here. */
export function karanaAt(at: Date): { name: string; end: Date } {
  const idx = Math.floor(elongation(at) / 6) % 60;
  let name: string;
  if (idx === 0) name = "Kimstughna";
  else if (idx <= 56) name = KARANAS_MOVABLE[(idx - 1) % 7];
  else if (idx === 57) name = "Shakuni";
  else if (idx === 58) name = "Chatushpada";
  else name = "Naga";
  const endT = astro().SearchMoonPhase(((idx + 1) * 6) % 360, at, 2);
  return { name, end: endT ? endT.date : new Date(at.getTime() + 13 * HOUR_MS) };
}

// ── nakshatra and yoga ─────────────────────────────────────────────────

/** The next time a rising longitude reaches `boundary`, by bisection. The
 *  distance run since `from` is taken modulo 360, so a wrap past 360 inside
 *  the window does not matter. `windowDays` must cover the crossing. */
function nextCrossing(from: Date, value: (d: Date) => number, boundary: number, windowDays: number): Date {
  const v0 = value(from);
  let span = mod(boundary - v0, 360);
  if (span < 1e-9) span = 360;
  let lo = from.getTime();
  let hi = lo + windowDays * DAY_MS;
  for (let i = 0; i < 44; i++) {
    const mid = (lo + hi) / 2;
    if (mod(value(new Date(mid)) - v0, 360) >= span) hi = mid;
    else lo = mid;
  }
  return new Date(hi);
}

const NAKSHATRA_SPAN = 360 / 27;

/** The nakshatra (0 = Ashwini) the Moon is in, and when it leaves. */
export function nakshatraAt(at: Date): { index: number; end: Date } {
  const index = Math.floor(siderealMoon(at) / NAKSHATRA_SPAN) % 27;
  // The Moon covers 13 degrees 20 minutes in at most about 27 hours.
  return { index, end: nextCrossing(at, siderealMoon, (index + 1) * NAKSHATRA_SPAN, 1.5) };
}

/** The yoga (0 = Vishkambha): the Sun's and Moon's longitudes added. */
export function yogaAt(at: Date): { index: number; end: Date } {
  const total = (d: Date) => mod(siderealSun(d) + siderealMoon(d), 360);
  const index = Math.floor(total(at) / NAKSHATRA_SPAN) % 27;
  return { index, end: nextCrossing(at, total, (index + 1) * NAKSHATRA_SPAN, 1.5) };
}

// ── the lunar month and its year ───────────────────────────────────────

export interface Lunation {
  /** The new moon that opens this lunation, and the one that closes it. */
  start: Date;
  end: Date;
  /** Amanta month, 0 = Chaitra to 11 = Phalguna. */
  month: number;
  /** An added (adhika) month: the Sun does not change sign while it runs. */
  adhika: boolean;
}

/** The lunation an instant falls in. */
export function lunationAt(at: Date): Lunation {
  const A = astro();
  const prev = A.SearchMoonPhase(0, at, -40);
  const next = A.SearchMoonPhase(0, at, 40);
  if (!prev || !next) throw new Error("no new moon found around " + at.toISOString());
  const start = prev.date;
  const end = next.date;
  const sign = Math.floor(siderealSun(start) / 30) % 12;
  const signNext = Math.floor(siderealSun(end) / 30) % 12;
  return { start, end, month: (sign + 1) % 12, adhika: signNext === sign };
}

/** The month a tithi belongs to in the purnimanta (full moon to full moon)
 *  reckoning, where the dark half takes the next month's name. An added
 *  month keeps its own name for both halves and sits between the two halves
 *  of the month it is named after. */
export function purnimantaMonth(l: Lunation, tithiNumber: number): { month: number; adhika: boolean } {
  if (tithiNumber <= 15 || l.adhika) return { month: l.month, adhika: l.adhika };
  return { month: (l.month + 1) % 12, adhika: false };
}

export interface LunarYears {
  /** Vikrama, turning at the Chaitra new moon (North India). */
  vikrama: number;
  /** Vikrama, turning at the Kartika new moon after Diwali (Gujarat). */
  vikramaKartikadi: number;
  /** Shaka, turning at the Chaitra new moon. */
  shaka: number;
  /** Kali years elapsed. */
  kali: number;
}

/** The year numbers a lunation carries. They turn at the new moon itself, so
 *  they stay true to the tithi the card shows rather than to the civil day.
 *
 *  Not verified against an almanac: a year whose Chaitra is an added month
 *  (next in 2029). Here the year turns at the first of the two Chaitras. */
export function lunarYears(l: Lunation): LunarYears {
  const y = l.start.getUTCFullYear();
  let vikrama: number;
  // Chaitra to Margashirsha open between mid-March and mid-December.
  if (l.month <= 8) vikrama = y + 57;
  // Pausha opens while the Sun is in Dhanu: late December, or early January.
  else if (l.month === 9) vikrama = l.start.getUTCMonth() >= 6 ? y + 57 : y + 56;
  // Magha and Phalguna open between mid-January and mid-March.
  else vikrama = y + 56;
  return {
    vikrama,
    vikramaKartikadi: l.month >= 7 ? vikrama : vikrama - 1,
    shaka: vikrama - 135,
    kali: vikrama + 3044,
  };
}

// ── sunrise and sunset ─────────────────────────────────────────────────

export interface Observer {
  lat: number;
  lon: number;
}

/** The first sunrise after `from`, within `limitDays` (null near the poles). */
export function sunriseAfter(from: Date, where: Observer, limitDays = 1.5): Date | null {
  const A = astro();
  const found = A.SearchRiseSet(A.Body.Sun, new A.Observer(where.lat, where.lon, 0), +1, from, limitDays);
  return found ? found.date : null;
}

/** The first sunset after `from`, within `limitDays`. */
export function sunsetAfter(from: Date, where: Observer, limitDays = 1): Date | null {
  const A = astro();
  const found = A.SearchRiseSet(A.Body.Sun, new A.Observer(where.lat, where.lon, 0), -1, from, limitDays);
  return found ? found.date : null;
}

/** The most recent sunrise at or before `at`. The Hindu day, and so the
 *  weekday, runs from this moment. Null near the poles. */
export function sunriseBefore(at: Date, where: Observer): Date | null {
  const first = sunriseAfter(new Date(at.getTime() - 26 * HOUR_MS), where, 1.5);
  if (!first || first.getTime() > at.getTime()) return null;
  const second = sunriseAfter(new Date(first.getTime() + HOUR_MS), where, 1.5);
  return second && second.getTime() <= at.getTime() ? second : first;
}

// ── solar months (Tamil, Malayalam, Bengali) ───────────────────────────

/** A calendar date with no time or zone: month is 1 to 12. */
export interface CivilDate {
  y: number;
  m: number;
  d: number;
}

function civilToUtcMs(c: CivilDate): number {
  return Date.UTC(c.y, c.m - 1, c.d);
}

export function addDays(c: CivilDate, n: number): CivilDate {
  const t = new Date(civilToUtcMs(c) + n * DAY_MS);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

/** Whole days from `a` to `b`. */
export function daysBetween(a: CivilDate, b: CivilDate): number {
  return Math.round((civilToUtcMs(b) - civilToUtcMs(a)) / DAY_MS);
}

/** The calendar date an instant falls on in Indian Standard Time. */
export function istDate(at: Date): CivilDate {
  const t = new Date(at.getTime() + IST_MS);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

/** The Sun's latest entry into a sidereal sign (a sankranti), 0 = Mesha. */
export function lastSankranti(at: Date): { sign: number; at: Date } {
  const sign = Math.floor(siderealSun(at) / 30) % 12;
  const edge = sign * 30;
  // Degrees past the sign's opening edge: negative before it.
  const past = (d: Date) => mod(siderealSun(d) - edge + 180, 360) - 180;
  // The Sun spends at most 32 days in a sign.
  let lo = at.getTime() - 33 * DAY_MS;
  let hi = at.getTime();
  for (let i = 0; i < 44; i++) {
    const mid = (lo + hi) / 2;
    if (past(new Date(mid)) >= 0) hi = mid;
    else lo = mid;
  }
  return { sign, at: new Date(hi) };
}

/** The Sun's next entry into a sign after `at`. */
export function nextSankranti(at: Date): { sign: number; at: Date } {
  const sign = (Math.floor(siderealSun(at) / 30) + 1) % 12;
  // The Sun spends at most 32 days in a sign.
  return { sign, at: nextCrossing(at, siderealSun, sign * 30, 33) };
}

/** Which civil day a solar month opens on, given the moment of sankranti.
 *  - "sunset" (Tamil Nadu): that day if the Sun enters the sign before
 *    sunset, the next day otherwise.
 *  - "aparahna" (Kerala): that day if it enters before three fifths of the
 *    daytime have passed, the next day otherwise.
 *  - "nextDay" (Bengal): always the day after.
 *  Days are civil dates in Indian Standard Time at the reference city.
 *
 *  Held against Drik Panchang's regional day pages (read 2026-10-01), at
 *  dates chosen so the rules disagree: 14 January 2026 is the first of Thai
 *  in Chennai and still the 30th of Dhanu in Kochi; 15 April 2026 is the
 *  first of Boishakh in Kolkata; 18 October 2026 opens Aippasi, Thulam and
 *  Kartik. scripts/check-kala.mjs keeps those. Drik's sankranti moments run
 *  about ten minutes later than this engine's (its ayanamsa is 25 arcseconds
 *  larger), so a sankranti within ten minutes of a cutoff could differ. */
export type SolarRule = "sunset" | "aparahna" | "nextDay";

export function solarMonthStart(sankranti: Date, rule: SolarRule, ref: Observer): CivilDate {
  const day = istDate(sankranti);
  if (rule === "nextDay") return addDays(day, 1);
  // That civil day's sunrise at the reference city: the first after the
  // previous local noon, as the server finds it.
  const localMidnight = civilToUtcMs(day) - IST_MS;
  const rise = sunriseAfter(new Date(localMidnight - 12 * HOUR_MS), ref, 1.5);
  const set = rise ? sunsetAfter(rise, ref, 1) : null;
  if (!rise || !set) return day;
  const cutoff = rule === "sunset" ? set.getTime() : rise.getTime() + 0.6 * (set.getTime() - rise.getTime());
  return sankranti.getTime() < cutoff ? day : addDays(day, 1);
}

export interface SolarDate {
  /** The Sun's sign for this month, 0 = Mesha. */
  sign: number;
  /** Day of the month, from 1. */
  day: number;
  /** The civil date the month opened on. */
  monthStart: CivilDate;
  /** The Gregorian year in which this calendar's year last began. */
  yearStartGregorian: number;
}

/** The solar month and day of a civil date, by a regional rule.
 *  `yearStartSign` is the sign whose month opens the year: 0 (Mesha) for the
 *  Tamil and Bengali years, 4 (Simha) for the Kollam year.
 *
 *  The whole civil day carries one date, so the Sun is looked up at the
 *  day's end: a sankranti that afternoon, before the rule's cutoff, makes the
 *  morning the first of the new month too. */
export function solarDateOn(today: CivilDate, rule: SolarRule, ref: Observer, yearStartSign: number): SolarDate {
  const dayEnd = new Date(civilToUtcMs(today) - IST_MS + DAY_MS - 1000);
  let sk = lastSankranti(dayEnd);
  let monthStart = solarMonthStart(sk.at, rule, ref);
  // The Sun changes sign today but past the cutoff, so the new month opens
  // tomorrow: name the day by the month before.
  for (let i = 0; i < 2 && daysBetween(monthStart, today) < 0; i++) {
    sk = lastSankranti(new Date(sk.at.getTime() - 2 * DAY_MS));
    monthStart = solarMonthStart(sk.at, rule, ref);
  }
  const monthsIntoYear = mod(sk.sign - yearStartSign, 12);
  const yearStart = new Date(civilToUtcMs(monthStart) - monthsIntoYear * 30.4369 * DAY_MS);
  return {
    sign: sk.sign,
    day: Math.max(1, daysBetween(monthStart, today) + 1),
    monthStart,
    yearStartGregorian: yearStart.getUTCFullYear(),
  };
}

// ── the day: its Sun, and its good and avoided hours ───────────────────

export interface SunDay {
  sunrise: Date;
  sunset: Date;
  /** The sunset before this sunrise, and the sunrise after this sunset. */
  prevSunset: Date;
  nextSunrise: Date;
}

/** The Sun's day for one civil date. `localMidnight` is the instant that
 *  date began at the place. Null near the poles. */
export function sunDay(localMidnight: Date, where: Observer): SunDay | null {
  const sunrise = sunriseAfter(new Date(localMidnight.getTime() - 12 * HOUR_MS), where, 1.5);
  if (!sunrise) return null;
  const sunset = sunsetAfter(sunrise, where, 1);
  const prevSunset = sunsetAfter(new Date(sunrise.getTime() - 23.5 * HOUR_MS), where, 1);
  const nextSunrise = sunset ? sunriseAfter(sunset, where, 1) : null;
  if (!sunset || !prevSunset || !nextSunrise || prevSunset.getTime() >= sunrise.getTime()) return null;
  return { sunrise, sunset, prevSunset, nextSunrise };
}

export type WindowKey = "brahma" | "abhijit" | "yamaganda" | "gulika" | "rahu";

export interface DayWindow {
  key: WindowKey;
  /** A good stretch, or one avoided for starting new work. */
  good: boolean;
  start: Date;
  end: Date;
}

// Which eighth of the daylight each avoided stretch takes, Sunday first.
// All three tables, and both good stretches, were held against Drik
// Panchang for New Delhi on 1 to 7 October 2026, one page per weekday
// (read 2026-10-01), and again at the two solstices, 1 January and 21 June
// 2027 (read 2026-10-02); scripts/check-kala.mjs keeps those readings.
const RAHU_EIGHTH = [8, 2, 7, 5, 6, 4, 3];
const YAMAGANDA_EIGHTH = [5, 4, 3, 2, 1, 7, 6];
const GULIKA_EIGHTH = [7, 6, 5, 4, 3, 2, 1];

/** The day's named stretches, in order. `weekday` is the civil weekday of
 *  the sunrise, 0 = Sunday.
 *  - Brahma muhurta: the fourteenth of the fifteen equal parts of the night
 *    before, so it ends one part before sunrise. Monier-Williams gives it in
 *    fixed units, from the fourth ghatika before sunrise to the second (96
 *    to 48 minutes); the two agree at the equinoxes. The almanac follows the
 *    night's own length (05:25 to 06:19 before a 07:14 sunrise on 1 January
 *    2027), and so does this.
 *  - Abhijit: the eighth of the fifteen equal parts of the daylight, around
 *    local noon ("the eighth muhurta of the day", Monier-Williams). Not
 *    counted on a Wednesday.
 *  - Rahu kala, Yamaganda and Gulika: one eighth of the daylight each. */
export function dayWindows(sun: SunDay, weekday: number): DayWindow[] {
  const rise = sun.sunrise.getTime();
  const day = sun.sunset.getTime() - rise;
  const night = rise - sun.prevSunset.getTime();
  const eighth = (key: WindowKey, n: number): DayWindow => ({
    key,
    good: false,
    start: new Date(rise + ((n - 1) * day) / 8),
    end: new Date(rise + (n * day) / 8),
  });
  const out: DayWindow[] = [
    { key: "brahma", good: true, start: new Date(rise - (2 * night) / 15), end: new Date(rise - night / 15) },
    eighth("yamaganda", YAMAGANDA_EIGHTH[weekday]),
    eighth("gulika", GULIKA_EIGHTH[weekday]),
    eighth("rahu", RAHU_EIGHTH[weekday]),
  ];
  if (weekday !== 3) {
    out.push({ key: "abhijit", good: true, start: new Date(rise + (7 * day) / 15), end: new Date(rise + (8 * day) / 15) });
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}

// ── tithis by the day ──────────────────────────────────────────────────

/** The tithi number (1 to 30) at an instant, without its edges. */
export function tithiNumberAt(at: Date): number {
  return (Math.floor(elongation(at) / 12) % 30) + 1;
}

export interface SunriseTithi {
  /** Days from the civil date given: 0 is that date. */
  offset: number;
  sunrise: Date;
  /** The tithi running at that sunrise: the one the day is named for. */
  tithi: number;
  elongation: number;
}

/** The tithi each day is named for, over a run of civil dates. */
export function sunriseTithis(localMidnight: Date, where: Observer, from: number, to: number): SunriseTithi[] {
  const out: SunriseTithi[] = [];
  for (let offset = from; offset <= to; offset++) {
    const sunrise = sunriseAfter(new Date(localMidnight.getTime() + offset * DAY_MS - 12 * HOUR_MS), where, 1.5);
    if (!sunrise) continue;
    const e = elongation(sunrise);
    out.push({ offset, sunrise, tithi: (Math.floor(e / 12) % 30) + 1, elongation: e });
  }
  return out;
}

export interface TithiSlip {
  /** "lost": no sunrise falls in the tithi, so no day is named for it.
   *  "doubled": two sunrises fall in it, so two days are. */
  kind: "lost" | "doubled";
  tithi: number;
  /** The first of the two days involved. */
  offset: number;
  start: Date;
  end: Date;
}

/** Tithis that lose their day or take two, in a run from sunriseTithis(). */
export function tithiSlips(days: SunriseTithi[]): TithiSlip[] {
  const out: TithiSlip[] = [];
  for (let i = 0; i + 1 < days.length; i++) {
    const a = days[i];
    const b = days[i + 1];
    if (b.offset !== a.offset + 1) continue;
    const step = mod(b.tithi - a.tithi, 30);
    if (step === 2) {
      const before = tithiAt(a.sunrise);
      const lost = tithiAt(new Date(before.end.getTime() + 60000));
      out.push({ kind: "lost", tithi: lost.number, offset: a.offset, start: lost.start, end: lost.end });
    } else if (step === 0) {
      const t = tithiAt(a.sunrise);
      out.push({ kind: "doubled", tithi: t.number, offset: a.offset, start: t.start, end: t.end });
    }
  }
  return out;
}

/** The thirty tithis of a lunation, in order, each with its edges. They are
 *  not equal: the Moon's speed changes through the month, so a tithi runs
 *  anywhere between about 19 and 26 hours. */
export function tithiSpans(l: Lunation): Tithi[] {
  const A = astro();
  const out: Tithi[] = [];
  let start = l.start;
  for (let n = 1; n <= 30; n++) {
    const found = n === 30 ? null : A.SearchMoonPhase(n * 12, start, 2);
    const end = n === 30 ? l.end : found ? found.date : new Date(start.getTime() + DAY_MS);
    out.push({ number: n, start, end });
    start = end;
  }
  return out;
}

/** The next time the Moon reaches a phase: 0 the new moon, 180 the full. */
export function nextMoonPhase(at: Date, phaseDeg: number): Date | null {
  const found = astro().SearchMoonPhase(phaseDeg, at, 40);
  return found ? found.date : null;
}

// ── the year ───────────────────────────────────────────────────────────

export interface LunarYear {
  /** Twelve lunations, or thirteen when one is added. Chaitra first. */
  months: Lunation[];
  start: Date;
  end: Date;
  /** The Sun's entries into a sign that fall inside the year, in order. */
  sankrantis: { sign: number; at: Date }[];
}

/** The lunar year an instant falls in, from the Chaitra new moon to the
 *  next. An added month is the one lunation with no sankranti inside it. */
export function lunarYearAt(at: Date): LunarYear {
  let first = lunationAt(at);
  for (let i = 0; i < 14; i++) {
    const before = lunationAt(new Date(first.start.getTime() - DAY_MS));
    if (first.month === 0 && before.month !== 0) break;
    first = before;
  }
  const months = [first];
  for (let i = 0; i < 14; i++) {
    const last = months[months.length - 1];
    const next = lunationAt(new Date(last.end.getTime() + DAY_MS));
    if (next.month === 0 && last.month !== 0) break;
    months.push(next);
  }
  const start = months[0].start;
  const end = months[months.length - 1].end;
  const sankrantis: { sign: number; at: Date }[] = [];
  let sk = lastSankranti(end);
  for (let i = 0; i < 15 && sk.at.getTime() >= start.getTime(); i++) {
    sankrantis.unshift(sk);
    sk = lastSankranti(new Date(sk.at.getTime() - 2 * DAY_MS));
  }
  return { months, start, end, sankrantis };
}

/** The season of an amanta month: 0 Vasanta, then Grishma, Varsha, Sharad,
 *  Hemanta, Shishira, two months each from Chaitra. Drik Panchang's "Vedic
 *  ritu" follows the same rule whatever the tradition (Varsha on 1 October
 *  2026, Sharad on the 12th, after the new moon: read 2026-10-01). */
export function rituOfMonth(amantaMonth: number): number {
  return Math.floor(mod(amantaMonth, 12) / 2);
}

/** 0 while the Sun is in Makara to Mithuna (its northward half), 1 while it
 *  is in Karka to Dhanu. Sidereal, as a sankalpa counts it. */
export function ayanaAt(at: Date): 0 | 1 {
  const sign = Math.floor(siderealSun(at) / 30) % 12;
  return sign >= 9 || sign <= 2 ? 0 : 1;
}

/** The Sun's tropical longitude, 0 to 360: 90 at the June solstice, 270 at
 *  the December one. */
export function tropicalSun(at: Date): number {
  const A = astro();
  return mod(A.EclipticLongitude(A.Body.Earth, at) + 180, 360);
}

/** The Sun's next solstice after `at`: the moment it stops going north
 *  (`north` true, tropical 90 degrees) or south (270). Drik Panchang's
 *  "Drik Ayana" turns here; its "Vedic Ayana" turns at the entry into
 *  Karka or Makara, as ayanaAt() does (read 2026-10-05 for 1 and 20
 *  January and 1 July 2027). */
export function nextSolstice(at: Date): { north: boolean; at: Date } {
  const north = tropicalSun(at) < 90 || tropicalSun(at) >= 270;
  return { north, at: nextCrossing(at, tropicalSun, north ? 90 : 270, 190) };
}

/** The Sun's next entry into one sign, 0 = Mesha. */
export function nextSankrantiInto(at: Date, sign: number): Date {
  return nextCrossing(at, siderealSun, mod(sign, 12) * 30, 370);
}

// ── the yugas ──────────────────────────────────────────────────────────
// Lengths and the present position as the Surya Siddhanta gives them
// (1.15-23; GRETIL's e-text of the 1854 Bibliotheca Indica edition, read
// 2026-10-02): a cycle of 4,320,000 years whose tenth part, taken four,
// three, two and one times, makes the four ages; 71 cycles to a manvantara,
// with a junction as long as the first age after it; fourteen Manus and a
// fifteenth junction at the start to a kalpa of a thousand cycles; and of
// this kalpa six Manus gone and 27 cycles of the seventh, with the first
// age of the 28th. The Bhagavata Purana gives the same ages (3.11.19) and
// calls the seventh Manu the present one (8.13.1). The text's own total to
// the end of that first age, 1,953,720,000 years (1.47), is the sum below
// less the 17,064,000 years it sets aside for creation (1.24):
// scripts/check-kala.mjs keeps that. Drik Panchang gives Kali 5127 for
// 1 October 2026, as lunarYears() does.

export const YUGA_YEARS = [1728000, 1296000, 864000, 432000] as const;
export const MAHAYUGA_YEARS = 4320000;
export const MANVANTARA_YEARS = 71 * MAHAYUGA_YEARS;
export const KALPA_YEARS = 1000 * MAHAYUGA_YEARS;

/** Years of the present kalpa that had passed when the Kali age began: six
 *  manvantaras, seven junctions, 27 four-age cycles and three ages. */
export const KALPA_YEARS_BEFORE_KALI =
  6 * MANVANTARA_YEARS + 7 * YUGA_YEARS[0] + 27 * MAHAYUGA_YEARS + (MAHAYUGA_YEARS - YUGA_YEARS[3]);
