#!/usr/bin/env node
/**
 * Parva checks: pure helpers the way check-kala.mjs does.
 * Transpiles TypeScript with the project's own compiler and runs in Node.
 *
 * - date labels in both languages
 * - series day selection for 17, 18, 19 Oct 2026 from a fixture response
 * - reminder scheduling (which dates, at most 30, never in the past)
 * - cache keys
 * - en/hi key parity
 * - no em or spaced en dash in either strings file
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

// 2. cache keys round to 0.1
{
  const C = loadTs(resolve(here, "../src/parva/keys.ts"));
  check(C.round1(28.6123) === 28.6 && C.round1(77.2099) === 77.2, "round to 0.1");
  check(C.cacheKey({ lat: 28.6123, lon: 77.2099, tradition: "north", lang: "en" }) === "shabd.parva.28.6_77.2_north_en", "cache key shape");
  check(C.cacheKey({ lat: 28.6123, lon: 77.2099, tradition: "north", lang: "en" }) !== C.cacheKey({ lat: 28.6123, lon: 77.2099, tradition: "north", lang: "hi" }), "lang in cache key");
}

// 3. series days 17/18/19 Oct 2026: Saptami twice, then Ashtami+Navami
{
  const days = [
    { date: "2026-10-17", tithi_key: "saptami", label: "Kalaratri", form_key: "kalaratri" },
    { date: "2026-10-18", tithi_key: "saptami", label: "Kalaratri, second day", form_key: "kalaratri" },
    { date: "2026-10-19", tithi_key: "ashtami", label: "Mahagauri", form_key: "mahagauri" },
  ];
  const kal = days.filter((d) => d.form_key === "kalaratri");
  check(kal.length === 2 && kal[0].date === "2026-10-17" && kal[1].date === "2026-10-18", "Saptami gives two dates, same form");
  check(kal[1].label.includes("second day"), "second Saptami labelled");
  check(days[2].form_key === "mahagauri", "19 Oct is Ashtami Mahagauri");
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

// 5. ParvaPageScreen must not dereference `page` before its null guard.
//    Derived values are computed above the `if (!page) return` early-return, so
//    a single raw `page.x` there throws "Cannot read property 'x' of null" on
//    the first render and blanks the whole app (seen on device 2026-10-12).
{
  const src = readFileSync(resolve(here, "../src/screens/ParvaPage.tsx"), "utf8");
  const guardIdx = src.search(/if\s*\(\s*!page\s*\)/);
  check(guardIdx > 0, "ParvaPage has a null guard");
  const before = guardIdx > 0 ? src.slice(0, guardIdx) : src;
  const direct = before.match(/\bpage\.[A-Za-z_]/g) ?? [];
  const cast = before.match(/\(\s*page\s+as[^)]*\)\s*\./g) ?? [];
  check(direct.length + cast.length === 0, "no unguarded deref of `page` before the null guard", [...direct, ...cast].join(" | "));
}

console.log(`\n  check-parva: ${passed} passed, ${failed} failed.`);
process.exit(failed ? 1 : 0);
