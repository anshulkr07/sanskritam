#!/usr/bin/env node
/**
 * Paged-book helper checks (handover_reading_shelf.md 7.8).
 *
 * Transpiles src/utils/paged.ts with the project's typescript the way
 * check-kala.mjs loads its module, and asserts: sections keep order;
 * next/previous at both ends return null; a one-chapter book has no label;
 * positionKey round-trips.
 *
 * Usage:  node scripts/check-paged.mjs
 * Exits 1 if any check fails.
 */

import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const ts = require("typescript");

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
    throw new Error(`cannot resolve ${spec} from ${abs}`);
  };
  new Function("require", "module", "exports", js)(localRequire, module, module.exports);
  return module.exports;
}

const P = loadTs(resolve(here, "../src/utils/paged.ts"));

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

const chapters = [
  { chapter: "1.1", section: "1", count: 9, first_ref: "Rgveda 1.1.1", locked: false },
  { chapter: "1.2", section: "1", count: 7, first_ref: "Rgveda 1.2.1", locked: false },
  { chapter: "2.1", section: "2", count: 5, first_ref: "Rgveda 2.1.1", locked: true },
];

const sections = P.sectionsOf(chapters);
check(
  sections.length === 2 && sections[0].section === "1" && sections[1].section === "2",
  "sections keep order",
  JSON.stringify(sections.map((s) => s.section)),
);
check(
  sections[0].chapters.length === 2 && sections[1].chapters.length === 1,
  "sections hold their chapters",
);

check(P.nextChapter(chapters, "1.1")?.chapter === "1.2", "next in the middle");
check(P.nextChapter(chapters, "2.1") === null, "next at the end is null");
check(P.prevChapter(chapters, "1.1") === null, "previous at the start is null");
check(P.prevChapter(chapters, "2.1")?.chapter === "1.2", "previous in the middle");
check(P.nextChapter(chapters, "missing") === null, "next of unknown is null");

check(P.chapterLabel("") === "", "a one-chapter book has no label");
check(P.chapterLabel("3.62") === "3.62", "chapter shows as it is");

const key = P.positionKey("rigveda", "3.62");
check(key === "rigveda#3.62", "positionKey shape", key);
const back = P.parsePositionKey(key);
check(back.slug === "rigveda" && back.chapter === "3.62", "positionKey round-trips");

check(P.isPaged({ paged: true }) === true, "isPaged true");
check(P.isPaged({}) === false, "isPaged false on old backend rows");

console.log(`\n  paged: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
