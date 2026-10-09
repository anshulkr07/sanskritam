#!/usr/bin/env node
/**
 * Holds the phone's recite helpers (src/recite/*) to fixed cases.
 *
 * mobile/ has no test runner, so this transpiles the TypeScript with the
 * project's own compiler and runs it in Node.
 *
 * Usage:  node scripts/check-recite.mjs
 * Exits 1 if any check fails.
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
    try { return loadTs(base + ".ts"); } catch { /* next */ }
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

const C = loadTs(resolve(here, "../src/recite/chantClock.ts"));
const H = loadTs(resolve(here, "../src/recite/hide.ts"));
const B = loadTs(resolve(here, "../src/recite/bands.ts"));
const E = loadTs(resolve(here, "../src/recite/eyes.ts"));

// chantClock: keep previous line between lines.
{
  const lines = [
    { i: 0, text: "a", kind: "verse", start_ms: 200, end_ms: 1000 },
    { i: 1, text: "b", kind: "verse", start_ms: 1500, end_ms: 2500 },
  ];
  check(C.lineAt(lines, 0) === -1, "before first line");
  check(C.lineAt(lines, 200) === 0, "at start");
  check(C.lineAt(lines, 1200) === 0, "between lines keeps previous");
  check(C.lineAt(lines, 1500) === 1, "at second start");
  check(C.lineAt([], 500) === -1, "empty");
}

// hide: levels.
{
  check(H.mask("a b c d", 0) === "a b c d", "hide 0");
  check(H.mask("a b c d", 3) === "", "hide 3");
  const m1 = H.mask("one two three four", 1);
  check(m1.split(" ").length === 4 && m1.includes("one") && m1.includes("..."), "hide 1", m1);
  const m2 = H.mask("one two", 2);
  check(m2.split(" ").length === 2 && !m2.includes("one"), "hide 2", m2);
}

// bands: labels.
{
  const rows = B.toDisplay([{ i: 1, aksharas: [{ t: "a", band: "ok" }, { t: "b", band: "fix", heard: "c" }] }]);
  check(rows[0].label.includes("Line 2") && rows[0].label.includes("1 right"), "bands label", rows[0].label);
}

// eyes: ratios.
{
  const s = [
    { t: 0, faces: 1, leftOpen: 0.1, rightOpen: 0.1, mouthGap: 0.05 },
    { t: 700, faces: 1, leftOpen: 0.1, rightOpen: 0.1, mouthGap: 0.05 },
    { t: 1400, faces: 1, leftOpen: 0.1, rightOpen: 0.1, mouthGap: 0.09 },
  ];
  const r = E.summarize(s, 700, "1.2.0");
  check(r.face_ratio === 1 && r.eyes_closed_ratio === 1, "eyes closed", JSON.stringify(r));
  check(r.mouth_moving_ratio > 0, "mouth moving");
  const open = E.summarize(
    s.map((x) => ({ ...x, leftOpen: 0.9, rightOpen: 0.9 })), 700, "1.2.0");
  check(open.eyes_closed_ratio === 0, "eyes open");
  // Missing probability counts as not closed.
  const miss = E.summarize([{ t: 0, faces: 1, leftOpen: null, rightOpen: 0.1, mouthGap: null }], 700, "1.2.0");
  check(miss.eyes_closed_ratio === 0 && miss.face_ratio === 1, "missing prob");
}

console.log(`\n  recite: ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
