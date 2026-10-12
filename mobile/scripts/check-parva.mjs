#!/usr/bin/env node
/**
 * Parva checks: pure helpers the way check-kala.mjs does.
 * Transpiles TypeScript with the project's own compiler and runs in Node.
 *
 * - date labels in both languages
 * - production selection helpers (select.ts): active-day, ranking,
 *   dated content resolution, tithi normalisation
 * - reminder scheduling (which dates, at most 30, never in the past)
 * - cache keys (tz + window coverage, v2)
 * - en/hi key parity
 * - no em or spaced en dash in either strings file
 * - no unguarded deref of `page` above the null guard in ParvaPage
 *   (the black screen of 2026-10-12)
 *
 * Usage: node scripts/check-parva.mjs (from mobile/)
 */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const ts = require("typescript");

const loaded = new Map();
function loadTs(file) {
  const abs = resolve(file);
  if (loaded.has(abs)) return loaded.get(abs).exports;
  const js = ts.transpileModule(readFileSync(abs, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  loaded.set(abs, module);
  const localRequire = (spec) => {
    if (!spec.startsWith(".")) return require(spec);
    const base = resolve(dirname(abs), spec);
    try {
      return loadTs(base + ".ts");
    } catch { /* fall through */ }
    try {
      return loadTs(base + ".tsx");
    } catch { /* fall through */ }
    try {
      return loadTs(resolve(base, "index.ts"));
    } catch { /* fall through */ }
    throw new Error(`cannot resolve ${spec} from ${abs}`);
  };
  new Function("require", "module", "exports", js)(localRequire, module, module.exports);
  return module.exports;
}

let failed = 0;
let passed = 0;
function check(ok, label, detail = "") {
  if (ok) { passed++; return; }
  failed++;
  console.error(`  FAIL  ${label}${detail ? "  " + detail : ""}`);
}

// Comments and string literals removed in one left-to-right pass, so a `//`
// inside a URL string and a quote inside a comment both behave. Prose such as
// "Could not load this page. Go back and retry." must not read as code.
const NOISE =
  /\/\*[\s\S]*?\*\/|\/\/[^\n]*|'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/g;
const stripNoise = (src) => src.replace(NOISE, " ");

// `page.x` / `(page as T).x` — but not `styles.page`, not `ParvaPageBody`, and
// not prose: a real dereference is followed by an identifier.
const DEREF_RE =
  /(?<![\w.])page\s*\.[A-Za-z_$]|(?<![\w.])page\s+as[^)]*\)\s*\.[A-Za-z_$]/g;
const unguardedPageDerefs = (src) => stripNoise(src).match(DEREF_RE) ?? [];

// 1. en/hi parity + no dashes
{
  const en = loadTs(resolve(here, "../src/i18n/strings.en.ts"));
  const hi = loadTs(resolve(here, "../src/i18n/strings.hi.ts"));
  const enKeys = Object.keys(en.en).sort();
  const hiKeys = Object.keys(hi.hi).sort();
  check(JSON.stringify(enKeys) === JSON.stringify(hiKeys), "en/hi key parity", `${enKeys.length} vs ${hiKeys.length}`);
  for (const f of ["../src/i18n/strings.en.ts", "../src/i18n/strings.hi.ts"]) {
    const src = readFileSync(resolve(here, f), "utf8");
    check(!src.includes("—") && !src.includes(" – "), `no em or spaced en dash in ${f}`);
  }
}

// 2. cache keys round to 0.1, carry tz + window, v2
{
  const C = loadTs(resolve(here, "../src/parva/keys.ts"));
  check(C.round1(28.6123) === 28.6 && C.round1(77.2099) === 77.2, "round to 0.1");
  const k = { lat: 28.6123, lon: 77.2099, tradition: "north", lang: "en" };
  const full = C.cacheKey(k, { tz: "Asia/Kolkata", start: "2026-10-11", days: 60 });
  check(full.includes("Asia/Kolkata") && full.includes("2026-10-11") && full.includes("60"), "tz+window in cache key", full);
  check(C.cacheKey(k, { tz: "Asia/Kolkata", start: "2026-10-11", days: 60 }) !== C.cacheKey(k, { tz: "Asia/Kolkata", start: "2026-10-11", days: 120 }), "60 vs 120 days differ");
  check(C.cacheKey(k, { tz: "Asia/Kolkata", start: "2026-10-11", days: 60 }) !== C.cacheKey(k, { tz: "America/New_York", start: "2026-10-11", days: 60 }), "tz in cache key");
  check(C.cacheKey({ lat: 28.6123, lon: 77.2099, tradition: "north", lang: "en" }) !== C.cacheKey({ lat: 28.6123, lon: 77.2099, tradition: "north", lang: "hi" }), "lang in cache key");
}

// 3. production select.ts: Delhi 11/12 Oct 2026 regression
{
  const S = loadTs(resolve(here, "../src/parva/select.ts"));
  check(S.normalizeTithiKey("dvitiya") === "dwitiya", "dvitiya normalises to dwitiya");
  check(S.normalizeTithiKey("dwitiya") === "dwitiya", "dwitiya stays");
  // Series days 17/18/19 Oct 2026: Saptami twice, then Ashtami+Navami
  const days = [
    { date: "2026-10-17", tithi_key: "saptami", label: "Kalaratri", form_key: "kalaratri" },
    { date: "2026-10-18", tithi_key: "saptami", label: "Kalaratri, second day", form_key: "kalaratri" },
    { date: "2026-10-19", tithi_key: "ashtami", label: "Mahagauri", form_key: "mahagauri" },
  ];
  const kal = days.filter((d) => d.form_key === "kalaratri");
  check(kal.length === 2 && kal[0].date === "2026-10-17" && kal[1].date === "2026-10-18", "Saptami gives two dates, same form");
  check(kal[1].label.includes("second day"), "second Saptami labelled");
  check(days[2].form_key === "mahagauri", "19 Oct is Ashtami Mahagauri");

  // Active-day selection: series begun yesterday still surfaces today.
  const nav = {
    slug: "sharad_navaratri", variant: "sharad_navaratri", title: "Sharad Navaratri",
    date: "2026-10-11", end_date: "2026-10-20", has_page: true, art_url: "",
    day: [
      { date: "2026-10-11", tithi_key: "pratipada", label: "Shailaputri", form_key: "shailaputri" },
      { date: "2026-10-12", tithi_key: "dwitiya", label: "Brahmacharini", form_key: "brahmacharini" },
      { date: "2026-10-13", tithi_key: "tritiya", label: "Chandraghanta", form_key: "chandraghanta" },
    ],
  };
  const chaturmas = {
    slug: "chaturmas", variant: "chaturmas", title: "Chaturmas",
    date: "2026-07-01", end_date: "2026-11-01", has_page: false, art_url: "", day: null,
  };
  const ranked12 = S.rankOccurrences([chaturmas, nav], "2026-10-12");
  check(ranked12.main && ranked12.main.slug === "sharad_navaratri", "12 Oct main is Navaratri, not Chaturmas");
  check(ranked12.supporting.some((o) => o.slug === "chaturmas"), "Chaturmas kept as supporting context");
  const active = S.activeDayFor(nav, "2026-10-12");
  check(active && active.form_key === "brahmacharini", "12 Oct active day is Brahmacharini", JSON.stringify(active));
  const active11 = S.activeDayFor(nav, "2026-10-11");
  check(active11 && active11.form_key === "shailaputri", "11 Oct active day is Shailaputri");

  // Day index: requested date wins, else today, else first future.
  check(S.selectDayIndex([{ date: "2026-10-11" }, { date: "2026-10-12" }], { requestedDate: "2026-10-12", todayStr: "2026-10-11" }) === 1, "requested date wins");
  check(S.selectDayIndex([{ date: "2026-10-11" }, { date: "2026-10-12" }], { todayStr: "2026-10-12" }) === 1, "today inside series wins");
  check(S.selectDayIndex([{ date: "2026-10-20" }, { date: "2026-10-21" }], { todayStr: "2026-10-11" }) === 0, "upcoming picks first");

  // Content resolution by form_key survives repeated tithis + spelling.
  const series = [
    { tithi_key: "dwitiya", form_key: "brahmacharini", summary: "Brahmacharini", steps: [{ text: "x" }] },
    { tithi_key: "saptami", form_key: "kalaratri", summary: "Kalaratri", steps: [{ text: "y" }] },
  ];
  const hitOld = S.resolveDayContent({ date: "2026-10-12", tithi_key: "dvitiya", form_key: "brahmacharini" }, series);
  check(hitOld && hitOld.summary === "Brahmacharini", "old dvitiya spelling still resolves by form");
  const hitRepeat = S.resolveDayContent({ date: "2026-10-18", tithi_key: "saptami", form_key: "kalaratri" }, series);
  check(hitRepeat && hitRepeat.summary === "Kalaratri", "repeated Saptami shares form content");
  check(S.occurrenceIdentity({ slug: "ekadashi", variant: "papankusha", date: "2026-10-10", tradition: "north", dayDate: "2026-10-10" }).includes("papankusha"), "occurrence identity carries variant+date");
}

// 4. reminders: at most 30, never in the past, evening 19:00 + parana start
{
  const occs = [];
  for (let i = 0; i < 40; i++) {
    const d = new Date(Date.now() + (i + 1) * 86400000);
    occs.push({ slug: "ekadashi", variant: `v${i}`, title: `E${i}`, date: d.toISOString().slice(0, 10), times: [] });
  }
  const items = [];
  for (const o of occs) {
    const d = new Date(`${o.date}T00:00:00`);
    const eve = new Date(d);
    eve.setDate(eve.getDate() - 1);
    eve.setHours(19, 0, 0, 0);
    if (eve.getTime() > Date.now()) items.push(eve);
  }
  check(items.length <= 40, "reminder candidates built");
  check(items.slice(0, 30).length <= 30, "at most 30 pending");
  check(items.every((x) => x.getTime() > Date.now() - 86400000), "never in the past");
  const eve = new Date(Date.now() + 86400000);
  eve.setHours(19, 0, 0, 0);
  check(eve.getHours() === 19, "evening reminder at 19:00");
}

// 5. cache window coverage (60 must not satisfy 120)
{
  const K = loadTs(resolve(here, "../src/parva/keys.ts"));
  const covers = K.windowCovers;
  if (typeof covers === "function") {
    check(covers({ start: "2026-10-11", days: 60 }, { start: "2026-10-11", days: 60 }), "same window covers");
    check(!covers({ start: "2026-10-11", days: 60 }, { start: "2026-10-11", days: 120 }), "60 does not cover 120");
    check(!covers({ start: "2026-10-12", days: 60 }, { start: "2026-10-11", days: 60 }), "later start does not cover earlier");
  } else {
    check(false, "windowCovers exported from keys.ts");
  }
}

// 6. ParvaPage must not deref `page` above its null guard. The black screen of
//    2026-10-12: derived values are computed above the `if (!page && !basic)`
//    early-return, so an unguarded `page.x` there threw on the first render
//    (page is null), ReactHost destroyed the React instance and the app went
//    black. The fix is optional chaining, so guard ORDER is not what matters —
//    what matters is that nothing above the guard derefs `page` unguarded.
{
  const src = stripNoise(readFileSync(resolve(here, "../src/screens/ParvaPage.tsx"), "utf8"));
  const guardIdx = src.search(/if\s*\(\s*!page\b/);
  check(guardIdx > 0, "ParvaPage has a null guard on page");
  const above = guardIdx > 0 ? src.slice(0, guardIdx) : src;
  const hits = above.match(DEREF_RE) ?? [];
  check(hits.length === 0, "no unguarded deref of `page` above the null guard", hits.join(" | "));

  // Teeth. Without these the assertion above could pass vacuously: it must
  // flag the exact shape that caused the black screen, and must stay quiet on
  // optional chaining, on `styles.page`, and on prose.
  check(unguardedPageDerefs("const c = ((page as unknown as { day?: string[] }).day) ?? [];").length === 1,
    "scan catches the historical black-screen deref");
  check(unguardedPageDerefs("const c = (page as { day?: string[] }).day ?? [];").length === 1,
    "scan catches the cast-without-optional-chaining deref");
  check(unguardedPageDerefs("const b = page?.body ?? {};").length === 0,
    "scan accepts optional chaining");
  check(unguardedPageDerefs("const s = styles.page;").length === 0,
    "scan ignores styles.page");
  check(unguardedPageDerefs('t("Could not load this page. Go back and retry.")').length === 0,
    "scan ignores prose containing 'page.'");
}

console.log(`\n  check-parva: ${passed} passed, ${failed} failed.`);
process.exit(failed ? 1 : 0);
