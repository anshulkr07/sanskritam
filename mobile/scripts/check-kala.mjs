#!/usr/bin/env node
/**
 * Holds the phone's calendar engine (src/kala/engine.ts) to three authorities:
 *
 *  1. the server engine, backend/app/services/panchang.py, through
 *     scripts/kala-fixtures.json (written by backend/scripts/gen_kala_fixtures.py);
 *  2. Drik Panchang's day for New Delhi, 1 October 2026, the same fixture
 *     backend/tests/test_panchang.py uses;
 *  3. the engine itself: every boundary it reports must be a real boundary.
 *
 * mobile/ has no test runner, so this transpiles the TypeScript with the
 * project's own compiler and runs it in Node.
 *
 * Usage:  node scripts/check-kala.mjs
 * Exits 1 if any check fails.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const ts = require("typescript");

// ── a small TypeScript loader ───────────────────────────────────────────
const loadedModules = new Map();
function loadTs(file) {
  const abs = resolve(file);
  if (loadedModules.has(abs)) return loadedModules.get(abs).exports;
  const js = ts.transpileModule(readFileSync(abs, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  loadedModules.set(abs, module);
  const localRequire = (spec) => {
    if (!spec.startsWith(".")) return require(spec);
    const base = resolve(dirname(abs), spec);
    for (const ext of [".ts", ".tsx"]) if (existsSync(base + ext)) return loadTs(base + ext);
    if (existsSync(base)) return JSON.parse(readFileSync(base, "utf8"));
    throw new Error(`cannot resolve ${spec} from ${abs}`);
  };
  new Function("require", "module", "exports", js)(localRequire, module, module.exports);
  return module.exports;
}

const E = loadTs(resolve(here, "../src/kala/engine.ts"));
const K = loadTs(resolve(here, "../src/kala/today.ts"));
const fx = JSON.parse(readFileSync(resolve(here, "kala-fixtures.json"), "utf8"));

// ── bookkeeping ─────────────────────────────────────────────────────────
let failed = 0;
let passed = 0;
function check(ok, label, detail = "") {
  if (ok) {
    passed++;
    return;
  }
  failed++;
  console.error(`  FAIL  ${label}${detail ? "  " + detail : ""}`);
}
function section(title) {
  console.log(`\n  ${title}`);
}
const angleDiff = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
const ms = (iso) => new Date(iso).getTime();
const IST = 5.5 * 3600000;
const istClock = (d) => new Date(d.getTime() + IST).toISOString().slice(11, 16);
const clockMinutes = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const clockApart = (a, b) => {
  const d = Math.abs(clockMinutes(a) - clockMinutes(b));
  return Math.min(d, 1440 - d);
};

// ── 1. the server engine ────────────────────────────────────────────────
section(`Against the server engine (astronomy-engine ${fx.astronomy_engine}, ${fx.instants.length} instants)`);
let worstLon = 0;
let worstEnd = 0;
let pyNakWorst = 0;
let pyYogaWorst = 0;
for (const r of fx.instants) {
  const at = new Date(r.at);
  const dl = Math.max(
    angleDiff(E.elongation(at), r.elongation),
    angleDiff(E.siderealSun(at), r.sidereal_sun),
    angleDiff(E.siderealMoon(at), r.sidereal_moon),
  );
  worstLon = Math.max(worstLon, dl);
  check(dl < 2e-5, `longitudes at ${r.at}`, `off by ${dl} deg`);
  check(Math.abs(E.ayanamsa(at) - r.ayanamsa) < 1e-7, `ayanamsa at ${r.at}`);

  const t = E.tithiAt(at);
  check(t.number === r.tithi, `tithi at ${r.at}`, `${t.number} vs ${r.tithi}`);
  const dt = Math.abs(t.end.getTime() - ms(r.tithi_end));
  worstEnd = Math.max(worstEnd, dt);
  check(dt < 1000, `tithi end at ${r.at}`, `${dt} ms`);

  const k = E.karanaAt(at);
  check(k.name === r.karana, `karana at ${r.at}`, `${k.name} vs ${r.karana}`);
  check(Math.abs(k.end.getTime() - ms(r.karana_end)) < 1000, `karana end at ${r.at}`);

  const n = E.nakshatraAt(at);
  check(n.index === r.nakshatra, `nakshatra at ${r.at}`, `${n.index} vs ${r.nakshatra}`);
  const dn = Math.abs(n.end.getTime() - ms(r.nakshatra_end));
  if (r.nakshatra_approx) pyNakWorst = Math.max(pyNakWorst, dn);
  else {
    worstEnd = Math.max(worstEnd, dn);
    check(dn < 1000, `nakshatra end at ${r.at}`, `${dn} ms`);
  }

  const y = E.yogaAt(at);
  check(y.index === r.yoga, `yoga at ${r.at}`, `${y.index} vs ${r.yoga}`);
  const dy = Math.abs(y.end.getTime() - ms(r.yoga_end));
  if (r.yoga_approx) pyYogaWorst = Math.max(pyYogaWorst, dy);
  else {
    worstEnd = Math.max(worstEnd, dy);
    check(dy < 1000, `yoga end at ${r.at}`, `${dy} ms`);
  }
}
console.log(`    longitudes agree within ${worstLon.toExponential(1)} degrees, end times within ${worstEnd} ms`);
console.log(
  `    where the server takes its rough fallback it is off by up to ` +
    `${(pyNakWorst / 60000).toFixed(0)} min (nakshatra) and ${(pyYogaWorst / 60000).toFixed(0)} min (yoga); ` +
    `those rows are checked in part 3 instead`,
);

section(`Months against the server (${fx.months.length} dates, New Delhi)`);
for (const m of fx.months) {
  const [y, mo, d] = m.date.split("-").map(Number);
  // The server names the month from the new moons around local noon and
  // takes the half of the month from the tithi at sunrise.
  const noon = new Date(Date.UTC(y, mo - 1, d) - IST + 12 * 3600000);
  const l = E.lunationAt(noon);
  const name = (month, adhika) => (adhika ? "Adhika " : "") + fx.months_order[month];
  check(name(l.month, l.adhika) === m.amanta, `amanta month on ${m.date}`, `${name(l.month, l.adhika)} vs ${m.amanta}`);
  check(l.adhika === m.adhika, `adhika on ${m.date}`);
  const p = E.purnimantaMonth(l, m.tithi_at_sunrise);
  if (m.py_adhika_krishna) {
    // Known server slip: it gives the NEXT month's name here.
    check(name(p.month, p.adhika) === m.amanta, `purnimanta in the dark half of an added month, ${m.date}`);
  } else {
    check(name(p.month, p.adhika) === m.purnimanta, `purnimanta month on ${m.date}`, `${name(p.month, p.adhika)} vs ${m.purnimanta}`);
  }
}

section(`Sunrise and sunset against the server (${fx.rise.length} rows)`);
let worstRise = 0;
for (const r of fx.rise) {
  const [y, mo, d] = r.date.split("-").map(Number);
  const localMidnight = Date.UTC(y, mo - 1, d) - IST;
  const rise = E.sunriseAfter(new Date(localMidnight - 12 * 3600000), r, 1.5);
  const set = rise && E.sunsetAfter(rise, r, 1);
  const dr = rise ? Math.abs(rise.getTime() - ms(r.sunrise)) : Infinity;
  const ds = set ? Math.abs(set.getTime() - ms(r.sunset)) : Infinity;
  worstRise = Math.max(worstRise, dr, ds);
  check(dr < 1000 && ds < 1000, `sunrise and sunset, ${r.place} ${r.date}`, `${dr} ms, ${ds} ms`);
}
console.log(`    agree within ${worstRise} ms`);

// ── 2. Drik Panchang, New Delhi, 1 October 2026 ─────────────────────────
section("Against Drik Panchang, New Delhi, 1 October 2026");
{
  const dk = fx.drik;
  const tol = dk.tolerance_minutes;
  const localMidnight = Date.UTC(2026, 9, 1) - IST;
  const rise = E.sunriseAfter(new Date(localMidnight - 12 * 3600000), dk.place, 1.5);
  const set = E.sunsetAfter(rise, dk.place, 1);
  check(clockApart(istClock(rise), dk.sunrise) <= tol.sun, "sunrise", `${istClock(rise)} vs ${dk.sunrise}`);
  check(clockApart(istClock(set), dk.sunset) <= tol.sun, "sunset", `${istClock(set)} vs ${dk.sunset}`);
  const t = E.tithiAt(rise);
  check(t.number === dk.tithi, "tithi at sunrise", `${t.number} vs ${dk.tithi}`);
  check(clockApart(istClock(t.end), dk.tithi_end) <= tol.tithi, "tithi end", `${istClock(t.end)} vs ${dk.tithi_end}`);
  check(E.tithiAt(new Date(t.end.getTime() + 60000)).number === dk.tithi_next, "next tithi");
  const n = E.nakshatraAt(rise);
  check(fx.nakshatras[n.index] === dk.nakshatra, "nakshatra", fx.nakshatras[n.index]);
  check(clockApart(istClock(n.end), dk.nakshatra_end) <= tol.other, "nakshatra end", `${istClock(n.end)} vs ${dk.nakshatra_end}`);
  const y = E.yogaAt(rise);
  check(fx.yogas[y.index] === dk.yoga, "yoga", fx.yogas[y.index]);
  check(clockApart(istClock(y.end), dk.yoga_end) <= tol.other, "yoga end", `${istClock(y.end)} vs ${dk.yoga_end}`);
  const k = E.karanaAt(rise);
  check(k.name === dk.karana, "karana", k.name);
  check(clockApart(istClock(k.end), dk.karana_end) <= tol.other, "karana end", `${istClock(k.end)} vs ${dk.karana_end}`);
  const k2 = E.karanaAt(new Date(k.end.getTime() + 60000));
  check(k2.name === dk.karana_next, "next karana", k2.name);
  check(clockApart(istClock(k2.end), dk.karana_next_end) <= tol.other, "next karana end", `${istClock(k2.end)} vs ${dk.karana_next_end}`);
  const l = E.lunationAt(rise);
  check(fx.months_order[l.month] === dk.amanta && !l.adhika, "amanta month", fx.months_order[l.month]);
  const p = E.purnimantaMonth(l, t.number);
  check(fx.months_order[p.month] === dk.purnimanta, "purnimanta month", fx.months_order[p.month]);
  const yrs = E.lunarYears(l);
  check(yrs.vikrama === dk.vikram_samvat, "Vikrama year", String(yrs.vikrama));
  check(yrs.shaka === dk.shaka, "Shaka year", String(yrs.shaka));
}

// ── 3. the engine against itself ────────────────────────────────────────
section("Every reported boundary is a real boundary");
for (const r of fx.instants) {
  const at = new Date(r.at);
  const t = E.tithiAt(at);
  const before = E.tithiAt(new Date(t.start.getTime() - 20000)).number;
  const after = E.tithiAt(new Date(t.start.getTime() + 20000)).number;
  check(after === t.number && before === ((t.number + 28) % 30) + 1, `tithi start at ${r.at}`, `${before} -> ${after}, want ${t.number}`);
  check(t.start.getTime() <= at.getTime() && at.getTime() < t.end.getTime(), `tithi brackets ${r.at}`);
  const hours = (t.end.getTime() - t.start.getTime()) / 3600000;
  check(hours > 19 && hours < 27.5, `tithi length at ${r.at}`, `${hours.toFixed(2)} h`);

  const n = E.nakshatraAt(at);
  const nb = E.nakshatraAt(new Date(n.end.getTime() - 20000)).index;
  const na = E.nakshatraAt(new Date(n.end.getTime() + 20000)).index;
  check(nb === n.index && na === (n.index + 1) % 27, `nakshatra end at ${r.at}`, `${nb} -> ${na}`);

  const y = E.yogaAt(at);
  const yb = E.yogaAt(new Date(y.end.getTime() - 20000)).index;
  const ya = E.yogaAt(new Date(y.end.getTime() + 20000)).index;
  check(yb === y.index && ya === (y.index + 1) % 27, `yoga end at ${r.at}`, `${yb} -> ${ya}`);

  const l = E.lunationAt(at);
  check(l.start.getTime() <= at.getTime() && at.getTime() < l.end.getTime(), `lunation brackets ${r.at}`);
  check(E.elongation(new Date(l.start.getTime() + 60000)) < 1 && E.elongation(new Date(l.end.getTime() - 60000)) > 359, `lunation edges at ${r.at}`);

  const sk = E.lastSankranti(at);
  const sb = Math.floor(E.siderealSun(new Date(sk.at.getTime() - 60000)) / 30) % 12;
  const sa = Math.floor(E.siderealSun(new Date(sk.at.getTime() + 60000)) / 30) % 12;
  check(sa === sk.sign && sb === (sk.sign + 11) % 12 && sk.at.getTime() <= at.getTime(), `sankranti before ${r.at}`, `${sb} -> ${sa}`);

  const rise = E.sunriseBefore(at, { lat: 28.6, lon: 77.2 });
  const age = rise ? (at.getTime() - rise.getTime()) / 3600000 : -1;
  check(age >= 0 && age < 24.1, `latest sunrise before ${r.at}`, `${age.toFixed(2)} h ago`);
}

// ── 4. years ────────────────────────────────────────────────────────────
// Drik Panchang puts the Chaitra new year on 19 March 2026 and 7 April 2027
// (the Ugadi rows of backend/tests/test_panchang.py) and 1 October 2026 in
// Vikrama 2083. Gujarat's year turns the day after Diwali (8 November 2026).
section("Years");
for (const [iso, vikrama, kartikadi] of [
  ["2026-03-18T00:00:00Z", 2082, 2082],
  ["2026-03-20T00:00:00Z", 2083, 2082],
  ["2026-10-01T04:00:00Z", 2083, 2082],
  ["2026-11-08T12:00:00Z", 2083, 2082],
  ["2026-11-10T12:00:00Z", 2083, 2083],
  ["2026-12-20T00:00:00Z", 2083, 2083],
  ["2027-01-20T00:00:00Z", 2083, 2083],
  ["2027-03-01T00:00:00Z", 2083, 2083],
  ["2027-04-06T00:00:00Z", 2083, 2083],
  ["2027-04-08T00:00:00Z", 2084, 2083],
]) {
  const yrs = E.lunarYears(E.lunationAt(new Date(iso)));
  check(yrs.vikrama === vikrama, `Vikrama at ${iso}`, `${yrs.vikrama} vs ${vikrama}`);
  check(yrs.vikramaKartikadi === kartikadi, `Gujarat's Vikrama at ${iso}`, `${yrs.vikramaKartikadi} vs ${kartikadi}`);
  check(yrs.shaka === vikrama - 135 && yrs.kali === vikrama + 3044, `Shaka and Kali at ${iso}`);
}

// ── 5. solar months ─────────────────────────────────────────────────────
// Expected by the regional rule from the engine's own sankranti moments
// (14 April 09:21, 17 August 07:46, 17 September 07:41 and 17 October 19:40
// IST in 2026). Not an almanac: see the note on SolarRule in engine.ts.
section("Solar months, by rule");
const CHENNAI = { lat: 13.1, lon: 80.3 };
const KOCHI = { lat: 10.0, lon: 76.3 };
const KOLKATA = { lat: 22.6, lon: 88.4 };
const solarCases = [
  // [name, rule, ref, yearStartSign, [y, m, d], hour IST, sign, day, yearStartGregorian]
  ["Tamil", "sunset", CHENNAI, 0, [2026, 10, 1], 10, 5, 15, 2026],
  ["Tamil", "sunset", CHENNAI, 0, [2026, 10, 17], 22, 5, 31, 2026],
  ["Tamil", "sunset", CHENNAI, 0, [2026, 10, 18], 9, 6, 1, 2026],
  ["Tamil", "sunset", CHENNAI, 0, [2026, 4, 13], 12, 11, 30, 2025],
  ["Tamil", "sunset", CHENNAI, 0, [2026, 4, 14], 12, 0, 1, 2026],
  ["Kerala", "aparahna", KOCHI, 4, [2026, 10, 1], 10, 5, 15, 2026],
  ["Kerala", "aparahna", KOCHI, 4, [2026, 10, 17], 22, 5, 31, 2026],
  ["Kerala", "aparahna", KOCHI, 4, [2026, 10, 18], 9, 6, 1, 2026],
  ["Kerala", "aparahna", KOCHI, 4, [2026, 8, 16], 12, 3, 31, 2025],
  ["Kerala", "aparahna", KOCHI, 4, [2026, 8, 17], 12, 4, 1, 2026],
  ["Bengal", "nextDay", KOLKATA, 0, [2026, 10, 1], 10, 5, 14, 2026],
  ["Bengal", "nextDay", KOLKATA, 0, [2026, 10, 17], 22, 5, 30, 2026],
  ["Bengal", "nextDay", KOLKATA, 0, [2026, 10, 18], 9, 6, 1, 2026],
  ["Bengal", "nextDay", KOLKATA, 0, [2026, 4, 14], 12, 11, 30, 2025],
  ["Bengal", "nextDay", KOLKATA, 0, [2026, 4, 15], 12, 0, 1, 2026],
];
for (const [name, rule, ref, yearSign, [y, m, d], hourIst, sign, day, yearStart] of solarCases) {
  const at = new Date(Date.UTC(y, m - 1, d, hourIst) - IST);
  const s = E.solarDateOn({ y, m, d }, rule, ref, yearSign);
  const got = `sign ${s.sign} day ${s.day} year from ${s.yearStartGregorian}`;
  check(
    s.sign === sign && s.day === day && s.yearStartGregorian === yearStart,
    `${name} ${y}-${m}-${d} ${hourIst}:00 IST`,
    `${got}, want sign ${sign} day ${day} year from ${yearStart}`,
  );
}

// ── 6. the card's reading of a moment ───────────────────────────────────
// What the approved mock shows for 09:40 on 1 October 2026, plus the forms
// the mock did not draw (roman, full and new moon, an added month).
section("The card");
{
  const T = loadTs(resolve(here, "../src/kala/traditions.ts"));
  const cityOf = (id) => T.traditionById(id).city;
  const istAt = (y, m, d, hh, mm) => ({
    at: new Date(Date.UTC(y, m - 1, d, hh, mm) - IST),
    clock: { date: { y, m, d }, minutes: hh * 60 + mm },
  });
  const view = (id, scriptChoice, when) => K.cardView(K.snapshot(when.at, when.clock, cityOf(id), id), when.at, scriptChoice, istClock);
  const same = (got, want, label) => check(got === want, label, `"${got}" is not "${want}"`);

  const mock = istAt(2026, 10, 1, 9, 40);
  const north = view("north", "devanagari", mock);
  same(north.headline, "आश्विन कृष्ण पञ्चमी", "north headline");
  same(north.gloss, "Āśvina · waning fortnight · 5th day", "north gloss");
  same(north.until, "until 12:36", "north until");
  same(north.nextScript + " " + north.nextRoman, "षष्ठी Ṣaṣṭhī", "north next tithi");
  same(north.weekdayText, "गुरुवासरः", "north weekday");
  same(north.nakshatra, "Rohiṇī", "north nakshatra");
  same(north.year, "Vikrama 2083", "north year");
  same(north.eyebrow, "अद्य", "eyebrow");
  same(north.watermark, "५", "north watermark");
  check(north.tithiNumber === 20 && Math.abs(north.progress - 0.865) < 0.01, "tithi and progress", `${north.tithiNumber}, ${north.progress}`);
  check(Math.abs(north.elongation - 238.37) < 0.05, "elongation", String(north.elongation));
  check(north.weekday === 4, "weekday is Thursday", String(north.weekday));
  check(!/[—–]/.test(JSON.stringify(north)), "no dashes in anything the learner reads");

  const northRoman = view("north", "roman", mock);
  same(northRoman.headline, "Āśvina Kṛṣṇa Pañcamī", "north roman headline");
  same(northRoman.weekdayText, "Guruvāsaraḥ", "north roman weekday");
  same(northRoman.nextScript, "", "roman has no second script");

  const deccan = view("deccan", "devanagari", mock);
  same(deccan.headline, "भाद्रपद कृष्ण पञ्चमी", "deccan headline");
  same(deccan.year, "Śaka 1948", "deccan year");
  same(view("deccan", "regional", mock).headline, deccan.headline, "deccan: my script is Devanagari");

  const gujarat = view("gujarat", "regional", mock);
  same(gujarat.headline, "ભાદરવો, વદ પાંચમ", "gujarat headline");
  same(gujarat.sub, "भाद्रपदे कृष्णपक्षे पञ्चमी", "gujarat Sanskrit line");
  same(gujarat.weekdayText, "ગુરુવાર", "gujarat weekday");
  same(gujarat.year, "Vikrama 2082", "gujarat year");
  same(view("gujarat", "devanagari", mock).headline, "भाद्रपद कृष्ण पञ्चमी", "gujarat in Devanagari");

  const tamil = view("tamil", "regional", mock);
  same(tamil.headline, "புரட்டாசி 15", "tamil headline");
  same(tamil.sub, "कृष्णपक्षे पञ्चमी", "tamil Sanskrit line");
  same(tamil.gloss, "15th of Purattaasi · waning 5th day", "tamil gloss");
  same(tamil.weekdayText, "வியாழன்", "tamil weekday");
  same(tamil.year, "Parābhava", "tamil year");
  same(view("tamil", "devanagari", mock).headline, "भाद्रपद कृष्ण पञ्चमी", "tamil in Devanagari");

  const kerala = view("kerala", "regional", mock);
  same(kerala.headline, "കന്നി 15", "kerala headline");
  same(kerala.weekdayText, "വ്യാഴം", "kerala weekday");
  same(kerala.year, "Kollam 1202", "kerala year");

  const bengal = view("bengal", "regional", mock);
  same(bengal.headline, "১৪ আশ্বিন", "bengal headline");
  same(bengal.weekdayText, "বৃহস্পতিবার", "bengal weekday");
  same(bengal.year, "Baṅgābda 1433", "bengal year");
  same(bengal.gloss, "14th of Ashshin · waning 5th day", "bengal gloss");

  // Full moon: 26 October 2026, 09:42 IST. New moon: 10 October, 21:20 IST.
  const full = istAt(2026, 10, 26, 8, 0);
  same(view("north", "devanagari", full).headline, "आश्विन पूर्णिमा", "full moon headline");
  same(view("north", "devanagari", full).gloss, "Āśvina · full moon", "full moon gloss");
  same(view("gujarat", "regional", full).headline, "આસો, સુદ પૂનમ", "gujarat full moon");
  const dark = istAt(2026, 10, 10, 18, 0);
  same(view("north", "devanagari", dark).headline, "आश्विन अमावास्या", "new moon headline, north");
  same(view("deccan", "devanagari", dark).headline, "भाद्रपद अमावास्या", "new moon headline, deccan");
  same(view("gujarat", "regional", dark).headline, "ભાદરવો, વદ અમાસ", "gujarat new moon");
  same(view("north", "devanagari", dark).nextScript, "प्रतिपदा", "after the new moon comes the first");

  // The added month of 2026 ran from 17 May to 15 June.
  const added = istAt(2026, 6, 5, 12, 0);
  const addedNorth = view("north", "devanagari", added);
  check(addedNorth.headline.startsWith("अधिक ज्यैष्ठ कृष्ण "), "added month, dark half, north", addedNorth.headline);
  check(view("gujarat", "regional", added).headline.startsWith("જેઠ અધિક, વદ "), "added month, gujarat", view("gujarat", "regional", added).headline);

  // Before sunrise the Hindu day is still the one before.
  const early = istAt(2026, 10, 2, 4, 0);
  check(view("north", "devanagari", early).weekday === 4, "04:00 on Friday is still Thursday's day", String(view("north", "devanagari", early).weekday));
  check(view("north", "devanagari", istAt(2026, 10, 2, 7, 0)).weekday === 5, "07:00 on Friday is Friday");

  // A snapshot knows when it goes stale: here at the tithi's end, 12:36.
  const snap = K.snapshot(mock.at, mock.clock, cityOf("north"), "north");
  same(istClock(snap.validUntil), "12:36", "snapshot expiry");
  const t0 = Date.now();
  for (let i = 0; i < 20; i++) {
    const when = istAt(2026, 10, 1 + i, 9, 40);
    K.snapshot(when.at, when.clock, cityOf("tamil"), "tamil");
  }
  console.log(`    one snapshot takes about ${((Date.now() - t0) / 20).toFixed(1)} ms in Node`);
}

// ── 6b. the day's hours, against Drik Panchang for every weekday ────────
section("Good and avoided hours against Drik Panchang (New Delhi, 1 to 7 October 2026)");
{
  const DELHI = { lat: 28.6139, lon: 77.209 };
  const within = (d, hhmm, tol) => clockApart(istClock(d), hhmm) <= tol;
  for (const row of fx.drik_week) {
    const [y, m, d] = row.date.split("-").map(Number);
    const sun = E.sunDay(new Date(Date.UTC(y, m - 1, d) - IST), DELHI);
    check(!!sun, `Sun's day on ${row.date}`);
    if (!sun) continue;
    check(within(sun.sunrise, row.sunrise, 2) && within(sun.sunset, row.sunset, 2), `sunrise and sunset ${row.date}`, `${istClock(sun.sunrise)} ${istClock(sun.sunset)}`);
    const windows = E.dayWindows(sun, row.weekday);
    for (const key of ["rahu", "yamaganda", "gulika", "brahma", "abhijit"]) {
      const w = windows.find((x) => x.key === key);
      if (row[key] === null) {
        check(!w, `${key} is not counted on ${row.date}`);
      } else if (row[key]) {
        check(!!w && within(w.start, row[key][0], 2) && within(w.end, row[key][1], 2), `${key} on ${row.date}`, w ? `${istClock(w.start)} to ${istClock(w.end)}, Drik ${row[key].join(" to ")}` : "missing");
      }
    }
    check(windows.every((w) => w.good === (w.key === "brahma" || w.key === "abhijit")), `which stretches are good, ${row.date}`);
    if (row.tithi_at_sunrise) check(E.tithiNumberAt(sun.sunrise) === row.tithi_at_sunrise, `tithi at sunrise ${row.date}`, String(E.tithiNumberAt(sun.sunrise)));
  }

  // The week around 1 October: the eighth tithi meets no sunrise in Delhi.
  const days = E.sunriseTithis(new Date(Date.UTC(2026, 9, 1) - IST), DELHI, -3, 3);
  check(days.map((x) => x.tithi).join(",") === "17,18,19,20,21,22,24", "tithi at each sunrise, 28 September to 4 October", days.map((x) => x.tithi).join(","));
  const slips = E.tithiSlips(days);
  check(slips.length === 1 && slips[0].kind === "lost" && slips[0].tithi === 23 && slips[0].offset === 2, "the eighth is lost between Saturday and Sunday", JSON.stringify(slips.map((s) => [s.kind, s.tithi, s.offset])));
  check(slips.length === 1 && within(slips[0].start, "08:00", 2) && within(slips[0].end, "05:52", 2), "its span, 08:00 to 05:52");
  // In Kolkata the Sun rises in time to catch it (Drik: Ashtami upto 05:51).
  const kol = fx.drik_facts.kolkata_2026_10_04;
  const kolSun = E.sunDay(new Date(Date.UTC(2026, 9, 4) - IST), { lat: 22.6, lon: 88.4 });
  check(within(kolSun.sunrise, kol.sunrise, 2) && E.tithiNumberAt(kolSun.sunrise) === kol.tithi_at_sunrise, "Kolkata, 4 October: sunrise falls in the eighth", `${istClock(kolSun.sunrise)} tithi ${E.tithiNumberAt(kolSun.sunrise)}`);
  const che = fx.drik_facts.chennai_2026_10_01;
  const cheSun = E.sunDay(new Date(Date.UTC(2026, 9, 1) - IST), { lat: 13.1, lon: 80.3 });
  const cheNak = E.nakshatraAt(cheSun.sunrise);
  check(within(cheSun.sunrise, che.sunrise, 2) && cheNak.index === che.nakshatra_at_sunrise && within(cheNak.end, che.nakshatra_end, 3), "Chennai, 1 October: Krittika until 06:02", `${istClock(cheSun.sunrise)} ${cheNak.index} ${istClock(cheNak.end)}`);
}

// ── 6c. regional dates, against Drik Panchang's regional pages ──────────
section("Regional dates against Drik Panchang");
{
  const T = loadTs(resolve(here, "../src/kala/traditions.ts"));
  for (const row of fx.drik_regional) {
    const tr = T.traditionById(row.tradition);
    const [y, m, d] = row.date.split("-").map(Number);
    const at = new Date(Date.UTC(y, m - 1, d, 12) - IST);
    const s = E.solarDateOn({ y, m, d }, tr.solar.rule, tr.solar.ref, tr.solar.yearStartSign);
    check(s.sign === row.sign && s.day === row.day, `${row.tradition} ${row.date}: ${row.says}`, `sign ${s.sign} day ${s.day}`);
    if (row.year) {
      const year = row.tradition === "kerala" ? s.yearStartGregorian - 824 : s.yearStartGregorian - 593;
      check(year === row.year, `${row.tradition} year on ${row.date}`, String(year));
    }
  }
  const noon = (y, m, d) => new Date(Date.UTC(y, m - 1, d, 12) - IST);
  const guj = fx.drik_facts.gujarat_2026_10_01;
  const l = E.lunationAt(noon(2026, 10, 1));
  check(l.month === guj.month && E.tithiNumberAt(noon(2026, 10, 1)) === guj.tithi && E.lunarYears(l).vikramaKartikadi === guj.year, `gujarat 2026-10-01: ${guj.says}`);
  const yrs = E.lunarYears(l);
  const want = fx.drik_facts.years_2026_10_01;
  check(yrs.vikrama === want.vikrama && yrs.shaka === want.shaka && yrs.vikramaKartikadi === want.gujarati && yrs.kali === want.kali, "the four year counts on 1 October 2026", JSON.stringify(yrs));
  check(E.lunarYears(E.lunationAt(noon(2026, 1, 14))).kali === fx.drik_facts.kali_2026_01_14, "Kali 5126 on 14 January 2026");
  for (const r of fx.drik_facts.ritu) {
    const [y, m, d] = r.date.split("-").map(Number);
    check(E.rituOfMonth(E.lunationAt(noon(y, m, d)).month) === r.ritu, `season on ${r.date}: ${r.says}`);
  }
  check(E.ayanaAt(noon(2026, 10, 1)) === fx.drik_facts.ayana_2026_10_01 && E.ayanaAt(noon(2027, 2, 1)) === 0, "the Sun's southward and northward halves");
}

// ── 6d. the year and the ages ───────────────────────────────────────────
section("The lunar year and the ages");
{
  const year = E.lunarYearAt(new Date(Date.UTC(2026, 9, 1, 4)));
  const istDay = (d) => new Date(d.getTime() + IST).toISOString().slice(0, 10);
  check(year.months.length === 13, "Vikrama 2083 has thirteen months", String(year.months.length));
  check(istDay(year.start) === "2026-03-19" && istDay(year.end) === "2027-04-07", "it runs 19 March 2026 to 7 April 2027", `${istDay(year.start)} ${istDay(year.end)}`);
  check(year.months.map((m) => m.month).join(",") === "0,1,2,2,3,4,5,6,7,8,9,10,11" && year.months[2].adhika && year.months.filter((m) => m.adhika).length === 1, "the added month is the first of the two Jyaishthas");
  check(year.sankrantis.length === 12, "twelve sankrantis fall inside it", String(year.sankrantis.length));
  for (const m of year.months) {
    const inside = year.sankrantis.filter((s) => s.at >= m.start && s.at < m.end).length;
    check(inside === (m.adhika ? 0 : 1), `sankrantis inside the month opening ${istDay(m.start)}`, String(inside));
  }
  const next = E.lunarYearAt(new Date(Date.UTC(2027, 5, 1)));
  check(next.months.length === 12 && next.months.every((m) => !m.adhika) && istDay(next.start) === "2027-04-07", "Vikrama 2084 has twelve", `${next.months.length} from ${istDay(next.start)}`);
  check(E.KALPA_YEARS_BEFORE_KALI + 5127 === 1972949127 && E.KALPA_YEARS === 4320000000 && E.MANVANTARA_YEARS === 306720000, "years of the kalpa elapsed", String(E.KALPA_YEARS_BEFORE_KALI + 5127));
  check(14 * E.MANVANTARA_YEARS + 15 * E.YUGA_YEARS[0] === E.KALPA_YEARS, "fourteen manvantaras and fifteen junctions make a kalpa");
  check(E.YUGA_YEARS.reduce((a, b) => a + b, 0) === E.MAHAYUGA_YEARS && E.YUGA_YEARS.map((v) => v / 432000).join(":") === "4:3:2:1", "the four ages, 4:3:2:1");
}

// ── 7. the clock and the Moon's shape ───────────────────────────────────
section("Clock and Moon shape");
{
  const C = loadTs(resolve(here, "../src/kala/clock.ts"));
  const M = loadTs(resolve(here, "../src/kala/moonShape.ts"));
  const now = new Date("2026-10-01T04:10:00Z");
  const wall = C.wallClockAt(now, "Asia/Kolkata");
  check(wall.date.y === 2026 && wall.date.m === 10 && wall.date.d === 1 && wall.minutes === 580, "wall clock in India", JSON.stringify(wall));
  const west = C.wallClockAt(now, "America/Los_Angeles");
  check(west.date.d === 30 && west.date.m === 9 && west.minutes === 21 * 60 + 10, "wall clock in California", JSON.stringify(west));
  const text = C.clockTextFor("Asia/Kolkata", now);
  check(text(new Date("2026-10-01T07:06:12Z")) === "12:36", "a time today", text(new Date("2026-10-01T07:06:12Z")));
  check(text(new Date("2026-10-02T04:46:13Z")) === "10:16 Fri", "a time tomorrow names its day", text(new Date("2026-10-02T04:46:13Z")));
  check(C.wallClockAt(new Date("2026-09-30T18:30:00Z"), "Asia/Kolkata").minutes === 0, "midnight is minute 0");
  check(C.wallClockAt(now, "Not/AZone").date.y === now.getFullYear(), "an unknown zone falls back to the phone's own");

  // The mock's Moon, 09:40 on 1 October 2026: waning, a little over three quarters lit.
  check(M.litPath(238.37, 22, 0, 0) === "M 0 -22 A 22 22 0 0 0 0 22 A 11.54 22 0 0 0 0 -22 Z", "the mock's Moon", M.litPath(238.37, 22, 0, 0));
  // "M x y A r r 0 0 LIMB x y A rx r 0 0 TERMINATOR x y Z": the two sweep flags.
  const sweeps = (e) => {
    const tokens = M.litPath(e, 10, 0, 0).split(" ");
    return tokens[8] + tokens[16];
  };
  check(sweeps(45) === "10", "waxing crescent: lit on the right, hollow", sweeps(45));
  check(sweeps(135) === "11", "waxing gibbous: lit on the right, bulging left", sweeps(135));
  check(sweeps(225) === "00", "waning gibbous: lit on the left, bulging right", sweeps(225));
  check(sweeps(315) === "01", "waning crescent: lit on the left, hollow", sweeps(315));
  check(Math.abs(E.litFraction(238.37) - 0.762) < 0.001 && E.litFraction(0) === 0 && Math.abs(E.litFraction(180) - 1) < 1e-12, "lit share of the disc");

  const when = C.whenTextFor("Asia/Kolkata", now);
  check(when(new Date("2026-10-01T07:06:12Z")) === "12:36", "a moment today is a time", when(new Date("2026-10-01T07:06:12Z")));
  check(when(new Date("2026-10-17T13:35:00Z")) === "Sat 17 Oct, 19:05", "a moment on another day names it", when(new Date("2026-10-17T13:35:00Z")));
  const dateText = C.dateTextFor("Asia/Kolkata", now);
  check(dateText(new Date("2026-03-19T03:00:00Z")) === "19 Mar" && dateText(new Date("2027-04-07T03:00:00Z")) === "7 Apr 2027", "dates, with the year when it differs");
  check(C.spanText(11 * 3600000 + 53 * 60000) === "11 h 53 m" && C.spanText(45 * 60000) === "45 m" && C.spanText(3600000 * 2 + 5 * 60000) === "2 h 05 m", "lengths of time");
  check(Math.abs(C.minutesOfDayAt(new Date("2026-10-01T04:10:30Z"), "Asia/Kolkata") - 580.5) < 1e-9, "minutes of the day, with seconds");
  check(C.localMidnight(new Date("2026-10-01T04:10:30Z"), wall).toISOString() === "2026-09-30T18:30:00.000Z", "the place's midnight");
}

// ── 8. the Kāla screens ─────────────────────────────────────────────────
// What the hub and its six chapters show for 09:40 on 1 October 2026 in New
// Delhi. Times are Drik Panchang's for that day (section 2) where it gives
// them; the rest is the engine held to its own definitions.
section("The Kāla screens");
{
  const L = loadTs(resolve(here, "../src/kala/learn.ts"));
  const T = loadTs(resolve(here, "../src/kala/traditions.ts"));
  const N = loadTs(resolve(here, "../src/kala/sanskritNames.ts"));
  const same = (got, want, label) => check(got === want, label, `"${got}" is not "${want}"`);
  const DELHI = T.traditionById("north").city;
  const at = new Date(Date.UTC(2026, 9, 1, 9, 40) - IST);
  const clock = { date: { y: 2026, m: 10, d: 1 }, minutes: 9 * 60 + 40 };
  const base = K.baseReading(at, clock, DELHI);
  const north = K.forTradition(base, "north");
  const deccan = K.forTradition(base, "deccan");

  // The engine's new edges.
  const sk = E.nextSankranti(at);
  check(sk.sign === 6 && new Date(sk.at.getTime() + IST).toISOString().slice(0, 10) === "2026-10-17", "the Sun next enters Tula on 17 October", `${sk.sign} ${sk.at.toISOString()}`);
  check(angleDiff(E.siderealSun(sk.at), 180) < 1e-5 && E.siderealSun(new Date(sk.at.getTime() - 60000)) < 180, "that moment is the sign's edge");
  const back = E.lastSankranti(new Date(sk.at.getTime() + 3600000));
  check(back.sign === 6 && Math.abs(back.at.getTime() - sk.at.getTime()) < 2000, "the next sankranti, looked back on, is the same moment", String(back.at.getTime() - sk.at.getTime()));
  const spans = E.tithiSpans(base.lunation);
  check(spans.length === 30 && spans[0].start.getTime() === base.lunation.start.getTime() && spans[29].end.getTime() === base.lunation.end.getTime(), "thirty tithis fill the lunation");
  check(spans.every((s, i) => i === 0 || s.start.getTime() === spans[i - 1].end.getTime()), "with no gaps");
  check(spans.every((s) => (s.end - s.start) / 3600000 > 19 && (s.end - s.start) / 3600000 < 27), "each between 19 and 27 hours", spans.map((s) => ((s.end - s.start) / 3600000).toFixed(1)).join(" "));
  check(Math.abs(spans[19].start - base.tithi.start) < 1000 && Math.abs(spans[19].end - base.tithi.end) < 1000, "the twentieth is the one running");
  check(spans.every((s) => E.tithiNumberAt(new Date((s.start.getTime() + s.end.getTime()) / 2)) === s.number), "each holds its own number at its middle");

  // The hub's ladder.
  const rows = L.ladder(north);
  same(rows.map((r) => r.sa).join(" | "), "श्वेतवाराहकल्पे | वैवस्वतमन्वन्तरे | कलियुगे | दक्षिणायने | वर्षासु | आश्विनमासे | कृष्णपक्षे | पञ्चम्याम् | गुरुवासरे | रोहिणीनक्षत्रे", "the ladder, north");
  same(rows.map((r) => r.gloss).join(" | "), "Śvetavārāhakalpa | 7th manvantara of 14 | Kali age, year 5127 | Sun's southward half | Rains | Āśvina month | Waning half | 5th tithi | Thursday | Moon in Rohiṇī", "its glosses");
  same(L.ladder(deccan)[5].sa, "भाद्रपदमासे", "the ladder's month, deccan");
  const addedAt = new Date(Date.UTC(2026, 5, 5, 12, 0) - IST);
  const added = K.snapshot(addedAt, { date: { y: 2026, m: 6, d: 5 }, minutes: 720 }, DELHI, "deccan");
  same(L.ladder(added)[5].sa, "अधिक ज्यैष्ठमासे", "the ladder in an added month");
  same(L.ladder(added)[5].gloss, "Added Jyaiṣṭha month", "its gloss");
  const fullAt = new Date(Date.UTC(2026, 9, 26, 8, 0) - IST);
  const full = K.snapshot(fullAt, { date: { y: 2026, m: 10, d: 26 }, minutes: 480 }, DELHI, "north");
  same(L.ladder(full)[7].sa + " " + L.ladder(full)[7].gloss, "पूर्णिमायाम् Full moon", "the ladder at full moon");
  // After the new moon of 10 October the season turns (Drik: Sharad on the 12th).
  const autumn = K.snapshot(new Date(Date.UTC(2026, 9, 12, 12, 0) - IST), { date: { y: 2026, m: 10, d: 12 }, minutes: 720 }, DELHI, "north");
  same(L.ladder(autumn)[4].sa + " " + L.ladder(autumn)[4].gloss, "शरदि Autumn", "the season after the new moon");
  check(rows.every((r) => ["today", "moon", "clock", "year", "yugas", "calendars"].includes(r.chapter)), "each row opens a chapter");
  check(!/[—–]/.test(JSON.stringify(rows)), "no dashes on the ladder");

  // Today.
  const model = L.todayModel(north);
  check(model.sun && istClock(model.sun.sunrise) === "06:14" && istClock(model.sun.sunset) === "18:07", "sunrise 06:14, sunset 18:07", model.sun ? `${istClock(model.sun.sunrise)} ${istClock(model.sun.sunset)}` : "none");
  same(model.windows.map((w) => w.key).join(","), "brahma,yamaganda,gulika,abhijit,rahu", "the day's stretches in order");
  check(model.yoga.index === 15 && clockApart(istClock(model.yoga.end), "21:18") <= 2, "Siddhi until 21:18", `${model.yoga.index} ${istClock(model.yoga.end)}`);
  check(N.KARANA_ORDER[model.karana.index] === "Taitila" && clockApart(istClock(model.karana.end), "12:35") <= 2, "Taitila until 12:35", `${model.karana.index} ${istClock(model.karana.end)}`);
  same(model.week.map((c) => `${c.offset}:${c.date.d}:${c.weekday}:${c.tithi}`).join(" "), "-1:30:3:19 0:1:4:20 1:2:5:21 2:3:6:22 3:4:0:24 4:5:1:25 5:6:2:26", "the week from yesterday");
  check(model.slips.length === 1 && model.slips[0].kind === "lost" && model.slips[0].tithi === 23, "the lost eighth is in it", JSON.stringify(model.slips.map((s) => [s.kind, s.tithi])));
  same(istClock(model.validUntil), "12:36", "the model goes stale with the tithi");
  const limbs = L.limbsAt(north, model, at);
  same(limbs.map((l) => `${l.term.nom}:${l.name.nom}`).join(" "), "वारः:गुरुवासरः तिथिः:पञ्चमी नक्षत्रम्:रोहिणी योगः:सिद्धिः करणम्:तैतिलम्", "the five limbs");
  same(limbs.map((l) => l.roman).join(" "), "Guruvāsara Pañcamī Rohiṇī Siddhi Taitila", "in roman");
  same(limbs[1].gloss, "5th of the waning half", "the tithi's gloss");
  check(limbs.every((l) => l.progress >= 0 && l.progress <= 1 && l.end && l.end > at), "each has an end ahead and a place between 0 and 1", limbs.map((l) => l.progress.toFixed(2)).join(" "));
  check(Math.abs(limbs[1].progress - 0.865) < 0.01 && Math.abs(limbs[4].progress - (limbs[1].progress * 2 - 1)) < 0.02, "the karana is the tithi's second half", `${limbs[1].progress} ${limbs[4].progress}`);
  check(Math.abs(limbs[0].progress - (9 * 60 + 40 - (6 * 60 + 14)) / 1440) < 0.005, "the day is 206 minutes old", String(limbs[0].progress));
  const running = (hh, mm) => L.windowAt(model.windows, new Date(Date.UTC(2026, 9, 1, hh, mm) - IST))?.key ?? "none";
  same(`${running(5, 0)} ${running(8, 0)} ${running(9, 40)} ${running(12, 0)} ${running(14, 0)} ${running(15, 11)}`, "brahma none gulika abhijit rahu none", "which stretch is running, through the day");
  const up = L.upcoming(at);
  same(up.map((u) => u.key).join(","), "ekadashi,amavasya,sankranti,purnima", "what comes next, in order");
  same(up.map((u) => u.sa).join(" "), "एकादशी अमावास्या तुला पूर्णिमा", "in Sanskrit");
  same(up[2].title, "Sun enters Tulā", "the sankranti's title");
  check(clockApart(istClock(up[1].at), "21:20") <= 2 && clockApart(istClock(up[3].at), "09:42") <= 2, "new moon 21:20 on the 10th, full moon 09:42 on the 26th", `${istClock(up[1].at)} ${istClock(up[3].at)}`);
  check(angleDiff(E.elongation(up[0].at), 300) < 1e-3 && up.every((u) => u.at > at), "the eleventh tithi opens at 300 degrees");

  // The Moon.
  const reading = L.moonReading(238.37);
  check(reading.tithi === 20 && reading.half === 1 && reading.day === 5 && reading.litPercent === 76, "238 degrees is the waning fifth, 76% lit", JSON.stringify([reading.tithi, reading.half, reading.day, reading.litPercent]));
  same(`${reading.name.nom} ${reading.pakshaSa} ${reading.pakshaRoman}`, "पञ्चमी कृष्णपक्षः Kṛṣṇa pakṣa", "its names");
  same(`${L.moonReading(0).name.nom} ${L.moonReading(179.9).name.nom} ${L.moonReading(180).name.nom} ${L.moonReading(359.9).name.nom} ${L.moonReading(360).name.nom}`, "प्रतिपदा पूर्णिमा प्रतिपदा अमावास्या प्रतिपदा", "the ends of each half");
  const moon = L.moonModel(base.lunation);
  check(moon.bars.length === 30 && moon.shortest > 19 && moon.longest < 27 && moon.longest - moon.shortest > 2, "tithi lengths differ by hours", `${moon.shortest.toFixed(2)} to ${moon.longest.toFixed(2)}`);
  const star = L.starAt(at);
  check(star.index === 3 && star.fraction > 0 && star.fraction < 1, "the Moon is in Rohini", JSON.stringify(star));

  // The clock.
  same(JSON.stringify(L.ghatiOf(24 * 60000)), JSON.stringify({ ghatika: 1, pala: 0, vipala: 0, prana: 360 }), "24 minutes is one ghatika");
  same(JSON.stringify(L.ghatiOf(3600000)), JSON.stringify({ ghatika: 2, pala: 30, vipala: 0, prana: 900 }), "an hour is two and a half");
  same(JSON.stringify(L.ghatiOf(24 * 3600000 - 1)), JSON.stringify({ ghatika: 59, pala: 59, vipala: 59, prana: 21599 }), "a day is sixty, less a moment");
  same(JSON.stringify(L.ghatiOf(-5)), JSON.stringify({ ghatika: 0, pala: 0, vipala: 0, prana: 0 }), "never below nothing");
  const ladderUnits = L.unitLadder();
  same(ladderUnits.map((u) => u.unit.nom).join(" "), "विपलम् प्राणः पलम् घटिका मुहूर्तः अहोरात्रः", "the units, small to large");
  check(ladderUnits.every((u, i) => i === 0 || Math.abs(u.seconds - Number(u.made.split(" ")[0]) * ladderUnits[i - 1].seconds) < 1e-9), "each is its count of the one before", ladderUnits.map((u) => `${u.made}=${u.seconds}`).join("; "));
  same(ladderUnits.map((u) => u.made).join("; "), "; 10 vipala; 6 prāṇa; 60 pala; 2 ghaṭikā; 30 muhūrta", "and says so");
  check(L.VIPALA_MS * 60 * 60 * 60 === 86400000 && L.PRANA_MS === 4000, "sixty times sixty times sixty vipalas make a day");

  // The year.
  const year = L.yearModel(at);
  check(year.months.length === 13 && year.hasAdhika && year.current === 6 && Math.round(year.days) === 384, "thirteen months, 384 days, now in the seventh", `${year.months.length} ${year.days} ${year.current}`);
  check(year.months[0].from === 0 && Math.abs(year.months[12].to - 1) < 1e-12 && year.months.every((m, i) => i === 0 || Math.abs(m.from - year.months[i - 1].to) < 1e-12), "the months fill the wheel");
  check(year.months[2].sankranti === null && year.months.filter((m) => m.sankranti === null).length === 1 && year.ticks.length === 12, "one month has no sankranti");
  same(year.months.map((m) => m.sankranti ? m.sankranti.sign : "x").join(","), "0,1,x,2,3,4,5,6,7,8,9,10,11", "each other month takes the next sign");
  same(`${L.monthLabel(year.months[2].lunation).sa} / ${L.monthLabel(year.months[2].lunation).roman} / ${L.monthLabel(year.months[6].lunation).sa}`, "अधिक ज्यैष्ठः / Adhika Jyaiṣṭha / भाद्रपदः", "month names on the wheel");
  check(year.years.vikrama === 2083 && year.years.shaka === 1948 && year.years.kali === 5127, "the year's numbers");
  check(L.yearModel(new Date(at.getTime() + 20 * 86400000)).current === 7 && L.yearModel(new Date(Date.UTC(2027, 5, 1))).months.length === 12, "the wheel moves on, and next year has twelve");
  check(Math.abs(L.LUNAR_TWELVE_DAYS - 354.37) < 0.01 && Math.abs(L.SOLAR_YEAR_DAYS - L.LUNAR_TWELVE_DAYS - 10.89) < 0.01, "twelve moons fall eleven days short");

  // The yugas.
  const yugas = L.yugaModel(5127);
  check(yugas.kaliLeft === 426873 && yugas.kalpaYears === 1972949127 && Math.round(yugas.cycle01 * 4320000) === 3893127, "5,127 gone, 426,873 left; 1,972,949,127 of the kalpa", JSON.stringify([yugas.kaliLeft, yugas.kalpaYears]));
  same(yugas.yugas.map((y) => `${y.name.nom}:${y.years}:${y.share}`).join(" "), "कृतयुगम्:1728000:4 त्रेतायुगम्:1296000:3 द्वापरयुगम्:864000:2 कलियुगम्:432000:1", "the four ages");
  check(yugas.yugas.map((y) => y.to.toFixed(1)).join(",") === "0.4,0.7,0.9,1.0", "their places on the ring");
  check(Math.abs(yugas.kalpa01 - 0.4567) < 0.0001 && Math.abs(yugas.kali01 - 0.01187) < 0.00001, "45.67% of the kalpa, 1.19% of Kali");
  same(L.grouped(1972949127) + " " + L.grouped(432000) + " " + L.grouped(7), "1,972,949,127 432,000 7", "numbers with commas");

  // Six calendars.
  const dates = L.traditionDates(base, at, istClock);
  same(dates.map((d) => d.headline).join(" | "), "आश्विन कृष्ण पञ्चमी | भाद्रपद कृष्ण पञ्चमी | ભાદરવો, વદ પાંચમ | புரட்டாசி 15 | കന്നി 15 | ১৪ আশ্বিন", "one moment, six dates");
  same(dates.map((d) => d.year).join(" | "), "Vikrama 2083 | Śaka 1948 | Vikrama 2082 | Parābhava | Kollam 1202 | Baṅgābda 1433", "and six years");
  check(T.TRADITIONS.every((t) => t.knobs && t.knobs.months && t.knobs.monthEnd && t.knobs.yearStart && t.knobs.era), "each tradition names its four choices");

  // The hub's live lines.
  const stats = L.hubStats(north, at);
  check(stats.sunEvent.kind === "sunset" && istClock(stats.sunEvent.at) === "18:07" && stats.ghatika === 8 && stats.yearMonths === 13 && stats.kali === 5127 && stats.litPercent === 76, "sunset next, 8 ghatikas gone, 13 months, Kali 5127", JSON.stringify(stats));
  const night = new Date(Date.UTC(2026, 9, 1, 22, 0) - IST);
  const nightSnap = K.snapshot(night, { date: { y: 2026, m: 10, d: 1 }, minutes: 22 * 60 }, DELHI, "north");
  check(L.hubStats(nightSnap, night).sunEvent.kind === "sunrise", "at night the next event is sunrise");

  // The model's counts and the engine's sum say the same thing.
  check(
    E.KALPA_YEARS_BEFORE_KALI ===
      (yugas.manvantara.at - 1) * E.MANVANTARA_YEARS + yugas.manvantara.at * E.YUGA_YEARS[0] + (yugas.cycle.at - 1) * E.MAHAYUGA_YEARS + (E.MAHAYUGA_YEARS - E.YUGA_YEARS[3]) &&
      yugas.cycle.of === 71 &&
      yugas.manvantara.of === 14,
    "28th cycle of the 7th manvantara, as the years add up",
  );
  same(yugas.yugas.map((y) => y.roman).join(" ") + " " + yugas.spans.map((s) => s.roman).join(" "), "Kṛtayuga Tretāyuga Dvāparayuga Kaliyuga Mahāyuga Manvantara Kalpa", "ages and spans in roman, as stems");
  same(K.romanName(N.AYANAS[1]) + " " + K.romanName(N.YOGAS[2]) + " " + K.romanName(N.YOGAS[24]) + " " + K.romanName(N.RASHIS[8]) + " " + K.romanName(N.UNITS[3]), "Dakṣiṇāyana Āyuṣmān Brahmā Dhanu Ghaṭikā", "roman names: a neuter as its stem, the rest in the first case");

  // The charts' geometry: 0 degrees at the top, clockwise.
  const G = loadTs(resolve(here, "../src/kala/charts/geometry.ts"));
  const near = (p, x, y) => Math.abs(p.x - x) < 1e-9 && Math.abs(p.y - y) < 1e-9;
  check(near(G.polar(100, 100, 50, 0), 100, 50) && near(G.polar(100, 100, 50, 90), 150, 100) && near(G.polar(100, 100, 50, 180), 100, 150) && near(G.polar(100, 100, 50, 270), 50, 100), "top, right, bottom, left");
  same(G.arcPath(100, 100, 50, 0, 90), "M 100.00 50.00 A 50.00 50.00 0 0 1 150.00 100.00", "a quarter arc");
  same(G.arcPath(100, 100, 50, 0, 270).split(" ")[7], "1", "three quarters takes the long way round");
  check(G.arcPath(100, 100, 50, 0, 360) !== G.arcPath(100, 100, 50, 0, 0) && !G.arcPath(100, 100, 50, 0, 360).endsWith("100.00 50.00"), "a full turn does not close on itself");
  same(G.sectorPath(100, 100, 40, 50, 0, 90), "M 100.00 50.00 A 50.00 50.00 0 0 1 150.00 100.00 L 140.00 100.00 A 40.00 40.00 0 0 0 100.00 60.00 Z", "a piece of a ring");
  same(G.wedgePath(100, 100, 50, 0, 90), "M 100.00 100.00 L 100.00 50.00 A 50.00 50.00 0 0 1 150.00 100.00 Z", "a wedge");
  const ends = yugas.yugas.map((y) => y.to);
  same([0, 0.39, 0.4, 0.69, 0.7, 0.89, 0.9, 0.999, 1, -0.05].map((x) => G.segmentAt(ends, x)).join(""), "0011223303", "which piece a place on the ring falls in");

  // ── held to the sources, read 2026-10-02 ──────────────────────────────
  // The Surya Siddhanta's own total of years to the end of the first age of
  // this cycle (1.47, GRETIL's e-text): the engine's sum, less the next two
  // ages and the 17,064,000 years the text sets aside for creation (1.24).
  check(E.KALPA_YEARS_BEFORE_KALI - E.YUGA_YEARS[1] - E.YUGA_YEARS[2] - 17064000 === 1953720000, "the Surya Siddhanta's 1,953,720,000 years", String(E.KALPA_YEARS_BEFORE_KALI - E.YUGA_YEARS[1] - E.YUGA_YEARS[2] - 17064000));

  // Names as the dictionaries have them (see gen_kala_names.py for which).
  same(N.KARANAS.map((k) => k.nom).join(" "), "बवः बालवः कौलवः तैतिलम् गरम् वणिजः विष्टिः शकुनिः चतुष्पदम् नागम् किंस्तुघ्नम्", "the eleven karanas, each in its own gender");
  same(Object.values(N.WINDOWS).map((w) => w.nom).join(" "), "ब्राह्ममुहूर्तः अभिजित् यमगण्डः गुलिककालः राहुकालः", "the day's five stretches");
  same(N.RITUS.map((r) => `${r.nom}/${r.loc}`).join(" "), "वसन्तः/वसन्ते ग्रीष्मः/ग्रीष्मे वर्षाः/वर्षासु शरत्/शरदि हेमन्तः/हेमन्ते शिशिरः/शिशिरे", "the six seasons, the rains in the plural");
  same(N.WORDS.shvetavarahakalpa.loc + " " + N.WORDS.shvetavarahakalpa.iast, "श्वेतवाराहकल्पे śvetavārāhakalpa", "the kalpa's name has a long a");
  same(L.RITUS_EN.join(",") + " / " + L.RASHIS_EN.join(","), "Spring,Summer,Rains,Autumn,Winter,Cool season / Ram,Bull,Twins,Crab,Lion,Maiden,Balance,Scorpion,Bow,Sea monster,Water pot,Fish", "seasons and signs in English");

  // Drik Panchang, New Delhi, the new moon of 10 October 2026: Chatushpada
  // until 09:24, Naga until 21:19, then Kimstughna; Indra until 22:02, then
  // Vaidhriti. The fixed karanas run in the almanac's order here. (The Surya
  // Siddhanta's verse, as Ranganatha reads it, puts Naga before Catushpada.)
  const delhiAt = (d, hh, mm) => new Date(Date.UTC(2026, 9, d, hh, mm) - IST);
  const karanaName = (when) => E.karanaAt(when).name;
  same(`${karanaName(delhiAt(9, 20, 0))} ${karanaName(delhiAt(10, 8, 0))} ${karanaName(delhiAt(10, 12, 0))} ${karanaName(delhiAt(10, 22, 0))} ${karanaName(delhiAt(11, 12, 0))}`, "Shakuni Chatushpada Naga Kimstughna Bava", "the karanas round the new moon");
  check(clockApart(istClock(E.karanaAt(delhiAt(10, 8, 0)).end), "09:24") <= 2 && clockApart(istClock(E.karanaAt(delhiAt(10, 12, 0)).end), "21:19") <= 2, "Chatushpada until 09:24, Naga until 21:19", `${istClock(E.karanaAt(delhiAt(10, 8, 0)).end)} ${istClock(E.karanaAt(delhiAt(10, 12, 0)).end)}`);
  const indra = E.yogaAt(delhiAt(10, 12, 0));
  check(indra.index === 25 && clockApart(istClock(indra.end), "22:02") <= 2 && E.yogaAt(delhiAt(10, 23, 0)).index === 26, "Indra until 22:02, then Vaidhriti", `${indra.index} ${istClock(indra.end)}`);

  // Drik Panchang, New Delhi, at the two solstices, where a fixed-length rule
  // for the hour before dawn would differ from the one used here.
  const SOLSTICES = [
    { date: [2027, 1, 1], weekday: 5, sunrise: "07:14", sunset: "17:35", brahma: ["05:25", "06:19"], rahu: ["11:07", "12:25"], yamaganda: ["15:00", "16:18"], gulika: ["08:32", "09:49"], abhijitStart: "12:04" },
    { date: [2027, 6, 21], weekday: 1, sunrise: "05:24", sunset: "19:22", brahma: ["04:04", "04:44"], rahu: ["07:09", "08:53"], yamaganda: ["10:38", "12:23"], gulika: ["14:08", "15:52"], abhijitStart: null },
  ];
  for (const row of SOLSTICES) {
    const [y, m, d] = row.date;
    const sun = E.sunDay(new Date(Date.UTC(y, m - 1, d) - IST), { lat: 28.6139, lon: 77.209 });
    const tag = `${y}-${m}-${d}`;
    check(!!sun && clockApart(istClock(sun.sunrise), row.sunrise) <= 2 && clockApart(istClock(sun.sunset), row.sunset) <= 2, `sunrise and sunset ${tag}`, sun ? `${istClock(sun.sunrise)} ${istClock(sun.sunset)}` : "none");
    if (!sun) continue;
    const windows = E.dayWindows(sun, row.weekday);
    for (const key of ["brahma", "rahu", "yamaganda", "gulika"]) {
      const w = windows.find((x) => x.key === key);
      check(!!w && clockApart(istClock(w.start), row[key][0]) <= 2 && clockApart(istClock(w.end), row[key][1]) <= 2, `${key} on ${tag}`, w ? `${istClock(w.start)} to ${istClock(w.end)}, Drik ${row[key].join(" to ")}` : "missing");
    }
    if (row.abhijitStart) {
      const w = windows.find((x) => x.key === "abhijit");
      check(!!w && clockApart(istClock(w.start), row.abhijitStart) <= 2, `abhijit on ${tag}`, w ? istClock(w.start) : "missing");
    }
  }

  // Regional names, held to Drik Panchang's own pages in each language by a
  // hash of their code points taken in the page (lang=ta, ml, bn, gu).
  const R = loadTs(resolve(here, "../src/kala/regionalNames.ts"));
  const h = R.codePointHash;
  // The almanac prints Malayalam weekdays in the older spelling, a consonant
  // and a virama where the app has the chillu letter.
  const older = (w) => w.replace(/\u0D7C/g, "\u0D30\u0D4D").replace(/\u0D7E/g, "\u0D33\u0D4D").replace(/\u0D7B/g, "\u0D28\u0D4D");
  const DRIK = [
    ["Tamil months", h(R.SOLAR_MONTHS.tamil.native.join("")), "8689ee0b"],
    ["Tamil weekdays", h(R.REGIONAL_WEEKDAYS.tamil.join("|")), "d6ecfe3d"],
    ["Malayalam months", h(R.SOLAR_MONTHS.malayalam.native.join("")), "a973aa42"],
    ["Malayalam weekdays, in the almanac's spelling", h(R.REGIONAL_WEEKDAYS.malayalam.map(older).join("|")), "856088bd"],
    ["Bengali months", h(R.SOLAR_MONTHS.bengali.native.join("")), "119e0b58"],
    ["Bengali weekdays", h(R.REGIONAL_WEEKDAYS.bengali.join("|")), "3404f09f"],
    ["Gujarati months", h(R.GUJARATI_MONTHS.join("")), "7e2d1a94"],
    ["Gujarati weekdays", h(R.REGIONAL_WEEKDAYS.gujarati.join("|")), "87b3a9fa"],
    ["Gujarati tithis", h(R.GUJARATI_TITHIS.join("|")), "bda7026a"],
    ["Gujarati bright half", h(R.GUJARATI.sud), "b50cde88"],
    ["Gujarati dark half", h(R.GUJARATI.vad), "671839b6"],
    ["Gujarati new moon", h(R.GUJARATI.amas), "021e0728"],
    ["Gujarati added month", h(R.GUJARATI.adhik), "f42fd5e5"],
  ];
  for (const [label, got, want] of DRIK) check(got === want, `${label} as Drik Panchang prints them`, `${got} is not ${want}`);
  same(R.SOLAR_MONTHS.tamil.roman.join(" "), "Chithirai Vaikaasi Aani Aadi Aavani Purattaasi Aippasi Karthikai Maargazhi Thai Maasi Panguni", "Tamil months in roman, the almanac's spelling");
  same(R.SOLAR_MONTHS.malayalam.roman.join(" "), "Medam Edavam Mithunam Karkadakam Chingam Kanni Thulam Vrishchikam Dhanu Makaram Kumbham Meenam", "Malayalam months in roman");
  same(R.SOLAR_MONTHS.bengali.roman.join(" "), "Boishakh Joishtho Asharh Srabon Bhadro Ashshin Kartik Ogrohaeon Poush Magh Falgun Choitro", "Bengali months in roman");

  // The two lengths the Year chapter compares, from the engine's own new
  // moons and sankrantis over nineteen years.
  const moonA = E.lunationAt(new Date(Date.UTC(2026, 3, 20))).start;
  const moonB = E.lunationAt(new Date(moonA.getTime() + 235 * 29.53 * 86400000 + 3 * 86400000)).start;
  const lunations = Math.round((moonB - moonA) / 86400000 / 29.530589);
  const synodic = (moonB - moonA) / 86400000 / lunations;
  check(lunations >= 234 && lunations <= 236 && Math.abs(12 * synodic - L.LUNAR_TWELVE_DAYS) < 0.02, "twelve mean lunar months, by the engine's new moons", `${lunations} lunations, ${12 * synodic}`);
  const meshaA = E.lastSankranti(new Date(Date.UTC(2026, 3, 20))).at;
  const meshaB = E.lastSankranti(new Date(Date.UTC(2045, 3, 20))).at;
  check(Math.abs((meshaB - meshaA) / 86400000 / 19 - L.SOLAR_YEAR_DAYS) < 0.001, "the Sun's year, by nineteen returns to Mesha", String((meshaB - meshaA) / 86400000 / 19));
  // What the Year chapter says of them: about 11 days short, a month about
  // every 32.5 months.
  const shortBy = L.SOLAR_YEAR_DAYS - L.LUNAR_TWELVE_DAYS;
  check(Math.round(shortBy) === 11 && Math.abs((L.LUNAR_TWELVE_DAYS / 12 / shortBy) * 12 - 32.5) < 0.1, "eleven days a year, a month every 32.5 months", `${shortBy} ${(L.LUNAR_TWELVE_DAYS / 12 / shortBy) * 12}`);

  const t0 = Date.now();
  L.todayModel(K.snapshot(night, { date: { y: 2026, m: 10, d: 1 }, minutes: 22 * 60 }, DELHI, "north"));
  const t1 = Date.now();
  L.moonModel(base.lunation);
  const t2 = Date.now();
  E.lunarYearAt(new Date(Date.UTC(2031, 5, 1)));
  const t3 = Date.now();
  console.log(`    in Node: today ${t1 - t0} ms, tithi lengths ${t2 - t1} ms, a year ${t3 - t2} ms`);
}

// ── 9. the basics cards ─────────────────────────────────────────────────
// The eleven cards behind "Start here" and the lines of You are here. What
// they say was read at the sources listed in src/kala/basics.ts (2026-10-05).
section("The basics cards");
{
  const B = loadTs(resolve(here, "../src/kala/basics.ts"));
  const L = loadTs(resolve(here, "../src/kala/learn.ts"));
  const TP = loadTs(resolve(here, "../src/kala/topics.ts"));
  const T = loadTs(resolve(here, "../src/kala/traditions.ts"));
  const N = loadTs(resolve(here, "../src/kala/sanskritNames.ts"));
  const same = (got, want, label) => check(got === want, label, `"${got}" is not "${want}"`);
  const DELHI = T.traditionById("north").city;
  const at = new Date(Date.UTC(2026, 9, 1, 9, 40) - IST);
  const north = K.snapshot(at, { date: { y: 2026, m: 10, d: 1 }, minutes: 9 * 60 + 40 }, DELHI, "north");

  // The cards follow the ladder: time first, then one per line, in order.
  const ids = TP.TOPICS.map((t) => t.id);
  same(ids.join(" "), "kala kalpa manvantara yuga ayana ritu masa paksha tithi vara nakshatra", "eleven cards, in the ladder's order");
  same(L.ladder(north).map((r) => r.key).join(" "), ids.slice(1).join(" "), "each line of You are here opens its own card");
  check(new Set(ids).size === ids.length && TP.TOPICS.every((t) => t.word && t.word.nom && t.hook && t.meaning), "each card has a word, a meaning and a line");

  // Time: five cycles, inner to outer.
  const year = L.yearModel(at);
  const rows = B.cycleRows(north, at, year);
  same(rows.map((r) => r.key).join(" "), "day month year age kalpa", "five cycles, the day innermost");
  check(rows.every((r) => r.fraction === null || (r.fraction >= 0 && r.fraction <= 1)), "each fraction between 0 and 1");
  check(Math.abs(rows[0].fraction - (9 * 60 + 40 - (6 * 60 + 14)) / ((24 * 60) + 1)) < 0.01, "the day: 206 minutes after a 06:14 sunrise", String(rows[0].fraction));
  check(Math.abs(rows[4].fraction - 0.45670) < 0.0001 && rows[3].fraction > 5127 / 432000 && rows[3].fraction < 5128 / 432000, "the kalpa 45.67%, the Kali age 5,127 years and a part", `${rows[4].fraction} ${rows[3].fraction}`);
  same(`${B.percentText(0.4567)} ${B.percentText(0.01187)} ${B.percentText(0.08)}`, "46% 1.2% 8.0%", "shares as the cards write them");

  // The kalpa: fifteen junctions and fourteen Manus fill it exactly.
  const pieces = B.kalpaPieces();
  check(pieces.length === 29 && pieces.filter((p) => p.kind === "manu").length === 14 && pieces[0].from === 0 && Math.abs(pieces[28].to - 1) < 1e-12, "fifteen junctions and fourteen Manus fill the kalpa");
  check(pieces.every((p, i) => i === 0 || Math.abs(p.from - pieces[i - 1].to) < 1e-12), "with no gaps");
  const brahma = B.brahmaModel(5127);
  check(brahma.yearsGone === 1972949127 && brahma.toNoon === 187050873 && brahma.day01 < 0.5, "1,972,949,127 years gone, 187,050,873 to noon", JSON.stringify([brahma.yearsGone, brahma.toNoon]));
  const seventh = pieces.find((p) => p.kind === "manu" && p.index === 6);
  check(brahma.day01 > seventh.from && brahma.day01 < seventh.to, "now falls in the seventh Manu's piece");

  // The fourteen Manus, from the generator (Manusmrti 1.61-62, Bhagavata 8.13).
  const manus = B.manuRows();
  same(manus.map((m) => m.roman).join(" "), "Svāyambhuva Svārociṣa Uttama Tāmasa Raivata Cākṣuṣa Vaivasvata Sāvarṇi Dakṣasāvarṇi Brahmasāvarṇi Dharmasāvarṇi Rudrasāvarṇi Devasāvarṇi Indrasāvarṇi", "the fourteen Manus");
  same(manus.map((m) => m.state[0]).join(""), "ggggggnccccccc", "six gone, the seventh now, seven to come");
  same(N.MANUS[6].dev + N.SPANS[1].dev, N.WORDS.vaivasvatamanvantara.dev, "the seventh is the one the ladder's manvantara is named after");

  // The yugas' dice: four, three, two, one.
  same(L.yugaModel(5127).yugas.map((y) => y.share).join(""), "4321", "the ages are the dice 4, 3, 2, 1");

  // The Sun's two halves, held to Drik Panchang's two readings (read
  // 2026-10-05): on 1 January 2027 its Drik Ayana is Uttarayana and its
  // Vedic Ayana Dakshinayana; on 20 January both Uttarayana; on 1 July 2027
  // Drik Dakshinayana and Vedic Uttarayana.
  const ay = (y, m, d) => B.ayanaModel(new Date(Date.UTC(y, m - 1, d, 6, 30)));
  const jan1 = ay(2027, 1, 1);
  const jan20 = ay(2027, 1, 20);
  const jul1 = ay(2027, 7, 1);
  check(jan1.sun === 0 && jan1.almanac === 1, "1 January 2027: the Sun going north, the almanac still in Dakshinayana", JSON.stringify([jan1.sun, jan1.almanac]));
  check(jan20.sun === 0 && jan20.almanac === 0, "20 January 2027: both northward");
  check(jul1.sun === 1 && jul1.almanac === 0, "1 July 2027: the Sun going south, the almanac still in Uttarayana");
  const y26 = B.ayanaModel(at);
  check(y26.sun === 1 && y26.almanac === 1, "1 October 2026: both southward");
  const june = y26.turns.find((t) => t.north);
  const dec = y26.turns.find((t) => !t.north);
  check(angleDiff(E.tropicalSun(june.at), 90) < 1e-5 && angleDiff(E.tropicalSun(dec.at), 270) < 1e-5, "the turns are the solstices");
  same(`${june.at.toISOString().slice(0, 10)} ${dec.at.toISOString().slice(0, 10)}`, "2026-06-21 2026-12-21", "21 June and 21 December 2026 (UTC)");
  const mk = y26.entries.find((e) => e.sign === 9);
  const kk = y26.entries.find((e) => e.sign === 3);
  check(angleDiff(E.siderealSun(mk.at), 270) < 1e-5 && angleDiff(E.siderealSun(kk.at), 90) < 1e-5, "the almanac's halves turn at Makara and Karka");
  same(`${new Date(mk.at.getTime() + IST).toISOString().slice(0, 10)} ${new Date(kk.at.getTime() + IST).toISOString().slice(0, 10)}`, "2026-01-14 2026-07-16", "Makara on 14 January, Karka on 16 July 2026 (IST)");
  check(y26.lagDays >= 23 && y26.lagDays <= 26, "about 24 days after each turn", String(y26.lagDays));
  check(y26.curve.length === 73 && Math.max(...y26.curve.map((c) => c.dec)) > 23 && Math.min(...y26.curve.map((c) => c.dec)) < -23, "the curve swings 23 degrees each way");

  // The seasons of 2026-27: the added Jyaistha makes Grishma three months.
  const ritus = B.rituSpans(year);
  same(ritus.map((r) => `${r.ritu}:${r.months.length}`).join(" "), "0:2 1:3 2:2 3:2 4:2 5:2", "six seasons, one of three months");
  check(ritus[0].from === 0 && Math.abs(ritus[5].to - 1) < 1e-12 && ritus.every((r, i) => i === 0 || Math.abs(r.from - ritus[i - 1].to) < 1e-12), "they fill the year");

  // The months' stars, as Monier-Williams names them.
  same(B.MONTH_STARS.map((s) => s.map((i) => N.NAKSHATRAS[i].iast).join("+")).join(" "), "citrā viśākhā jyeṣṭhā pūrvāṣāḍhā+uttarāṣāḍhā śravaṇa pūrvabhādrapadā+uttarabhādrapadā aśvinī kṛttikā mṛgaśīrṣa puṣya maghā pūrvaphalgunī+uttaraphalgunī", "each month's star");
  const cards = B.monthCards(L.traditionMonth(north));
  check(cards.length === 12 && cards.filter((c) => c.now).length === 1 && cards[6].now && !cards[6].adhikaNow, "the twelve cards, Asvina now in the north on 1 October 2026");
  same(`${cards[0].starText} / ${cards[3].starText} / ${cards[0].about} / ${cards[9].about}`, "Citrā / Pūrvāṣāḍhā and Uttarāṣāḍhā / March to April / December to January", "how a card words them");
  check(cards.every((c) => c.ritu === E.rituOfMonth(c.index)), "each card's season is the engine's");
  // "About March to April": the first is the month a full-moon month of that
  // name most often opens in, the second the month the middle of a new-moon
  // month most often falls in, over twenty years of the engine's months.
  {
    const tally = Array.from({ length: 12 }, () => ({ open: {}, mid: {} }));
    const gm = (d) => new Date(d.getTime() + IST).getUTCMonth();
    const bump = (o, k) => (o[k] = (o[k] || 0) + 1);
    let t = new Date(Date.UTC(2026, 0, 1));
    while (t.getTime() < Date.UTC(2046, 0, 1)) {
      const l = E.lunationAt(t);
      if (!l.adhika) {
        bump(tally[l.month].mid, gm(new Date((l.start.getTime() + l.end.getTime()) / 2)));
        bump(tally[l.month].open, gm(E.nextMoonPhase(new Date(l.start.getTime() - 20 * 86400000), 180)));
      }
      t = new Date(l.end.getTime() + 86400000);
    }
    const top = (o) => Number(Object.entries(o).sort((a, b) => b[1] - a[1])[0][0]);
    const got = tally.map((x) => `${top(x.open)},${top(x.mid)}`).join(" ");
    same(got, B.MONTH_ABOUT.map((m) => m.join(",")).join(" "), "each month's 'about' pair, held over 2026 to 2045");
  }

  // The tithis: fourteen numbers, then the full and new moons.
  const tithis = B.tithiRows(20);
  same(tithis.map((r) => r.roman).join(" "), "Pratipadā Dvitīyā Tṛtīyā Caturthī Pañcamī Ṣaṣṭhī Saptamī Aṣṭamī Navamī Daśamī Ekādaśī Dvādaśī Trayodaśī Caturdaśī Pūrṇimā Amāvāsyā", "the sixteen names");
  check(tithis.filter((r) => r.now).map((r) => r.key).join() === "t5" && B.tithiRows(15).find((r) => r.now).key === "full" && B.tithiRows(30).find((r) => r.now).key === "new", "the one now, the full moon and the new moon");

  // The weekdays: the Surya Siddhanta's order by height (12.31) and its rule
  // for the days' lords (12.78) give the week; the hours (12.79) agree.
  same(B.BY_HEIGHT.map((w) => N.GRAHAS[w].iast).join(" "), "śani guru maṅgala ravi śukra budha soma", "the seven from the highest down");
  same(B.dayLords().join(""), "6012345", "every fourth from Saturn: the week");
  check([0, 1, 2, 3, 4, 5, 6].every((w) => B.hourLord(w, 0) === w && B.hourLord(w, 24) === (w + 1) % 7), "24 hours on, the hours' lord is the next day's");
  same(N.GRAHAS.map((g, i) => g.dev + N.WORDS.vasara.dev === N.WEEKDAYS[i].dev).join(), "true,true,true,true,true,true,true", "each weekday is its graha and vasara");

  // The Moon's time round the stars, from the engine's Moon over a hundred
  // rounds: the first crossing of 0 degrees after each of two instants.
  {
    const crossing = (from) => {
      let lo = from.getTime();
      let prev = E.siderealMoon(from);
      for (let i = 1; i < 30 * 24; i++) {
        const t = from.getTime() + i * 3600000;
        const v = E.siderealMoon(new Date(t));
        if (v < prev) {
          let a = t - 3600000;
          let b = t;
          for (let k = 0; k < 30; k++) {
            const m = (a + b) / 2;
            if (E.siderealMoon(new Date(m)) > 180) a = m;
            else b = m;
          }
          return b;
        }
        prev = v;
        lo = t;
      }
      return lo;
    };
    const c0 = crossing(new Date(Date.UTC(2026, 0, 1)));
    const c1 = crossing(new Date(c0 + 100 * 27.3 * 86400000 - 3 * 86400000));
    const mean = (c1 - c0) / 100 / 86400000;
    check(Math.abs(mean - B.SIDEREAL_MONTH_DAYS) < 0.01, "the Moon goes round the stars in 27.32 days", String(mean));
  }

  // Copy rule and the Sanskrit rule, over the new files: no dashes in what
  // is shown, and no Devanagari typed by hand (it all comes from
  // sanskritNames.ts).
  const files = ["src/kala/basics.ts", "src/kala/basicsUi.tsx", "src/kala/topics.ts", "src/kala/HubCards.tsx", "src/screens/KalaTopic.tsx", "src/kala/charts/TopicEmblem.tsx", "src/kala/charts/CycleRings.tsx", "src/kala/charts/BrahmaDay.tsx", "src/kala/charts/SunSwing.tsx", "src/kala/charts/WeekStar.tsx"];
  const topicDir = resolve(here, "../src/kala/topics");
  for (const f of readdirSync(topicDir)) if (f.endsWith(".tsx")) files.push(`src/kala/topics/${f}`);
  for (const f of files) {
    const code = readFileSync(resolve(here, "..", f), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      .map((l) => l.replace(/^\s*\/\/.*$/, "").replace(/\s\/\/ .*$/, ""))
      .join("\n");
    check(!/—|\s–\s/.test(code), `${f}: no em dash or spaced en dash`);
    check(!/[\u0900-\u097F]/.test(code), `${f}: no Devanagari typed by hand`);
  }
}

console.log("");
if (failed > 0) {
  console.error(`  ${failed} check(s) failed, ${passed} passed.\n`);
  process.exit(1);
}
console.log(`  All ${passed} checks pass.\n`);
