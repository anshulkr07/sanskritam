#!/usr/bin/env node
/**
 * Holds the "Do you know" wording (src/facts/labels.ts): who says so, the
 * reference line, the source page, how a verse breaks into lines, and the
 * read-aloud sentence of the Home card.
 *
 * mobile/ has no test runner, so this transpiles the TypeScript with the
 * project's own compiler and runs it in Node (as check-words.mjs does).
 *
 * Usage:  node scripts/check-facts.mjs
 * Exits 1 if any check fails.
 */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const ts = require("typescript");

function loadTs(file) {
  const js = ts.transpileModule(readFileSync(resolve(file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", js)(require, module, module.exports);
  return module.exports;
}

const L = loadTs(resolve(here, "../src/facts/labels.ts"));

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
const same = (got, want, label) =>
  check(JSON.stringify(got) === JSON.stringify(want), label, `${JSON.stringify(got)} is not ${JSON.stringify(want)}`);

// A made-up fact in the API's shape. The Devanagari is placeholder letters,
// not a verse: only where it breaks matters here.
const fact = {
  id: "f1",
  fact: "The text counts time in breaths",
  claim_kind: "text",
  text_name: "Test-text",
  ref: "1.11",
  devanagari: "कखग घङच । छजझ ञटठ ॥ ११ ॥",
  iast: "kakhaga",
  source_url: "http://gretil.sub.uni-goettingen.de/x.htm",
  source_site: "GRETIL, Göttingen",
};

section("Title");
same(L.FACT_TITLE, "Do you know", "feature title");

section("Who says so");
same(L.claimLine({ claim_kind: "text" }), "The text says this", "text");
same(L.claimLine({ claim_kind: "tradition" }), "Tradition reads it this way", "tradition");
same(L.claimLine({ claim_kind: "modern" }), "Historical research", "modern");
same(L.claimLine({ claim_kind: "certain" }), "", "an unknown kind gives no line");
same(L.claimLine({}), "", "a missing kind gives no line");
same(L.claimLine(null), "", "null gives no line");

section("Reference");
same(L.refLine(fact), "Test-text 1.11", "text and place");
same(L.refLine({ text_name: "Test-text" }), "Test-text", "text alone");
same(L.refLine({}), "", "nothing");

section("Source page");
same(L.sourcePage(fact), { site: "GRETIL, Göttingen", url: fact.source_url }, "site and address");
same(L.sourcePage({ source_url: "https://vedabase.io/x" })?.site, "https://vedabase.io/x", "no site name: the address");
same(L.sourcePage({ source_url: "javascript:alert(1)" }), null, "only web addresses open");
same(L.sourcePage({}), null, "no page");

section("Verse lines");
same(L.verseLines(fact.devanagari), ["कखग घङच ।", "छजझ ञटठ ॥ ११ ॥"], "breaks after each danda, number kept");
same(L.verseLines("कखग\nघङच ॥"), ["कखग", "घङच ॥"], "the text's own line breaks win");
same(L.verseLines("कखग घङच"), ["कखग घङच"], "no danda: one line");
same(L.verseLines(""), [], "empty");
same(L.verseLines(null), [], "null");

section("Sentence");
same(L.cardSentence(fact), "Do you know. The text counts time in breaths. From Test-text 1.11.", "card sentence");
same(L.cardSentence({ fact: "Is it so?" }), "Do you know. Is it so?", "keeps its own full stop");
same(L.cardSentence({}), "", "no fact, no sentence");

section("Copy rule");
{
  const samples = [
    L.FACT_TITLE,
    L.claimLine({ claim_kind: "text" }),
    L.claimLine({ claim_kind: "tradition" }),
    L.claimLine({ claim_kind: "modern" }),
    L.cardSentence(fact),
  ];
  check(!samples.some((s) => /[—–]/.test(s)), "no em or en dashes in labels or sentences");
}

console.log(`\n  ${passed} passed${failed ? `, ${failed} failed` : ""}.\n`);
if (failed > 0) process.exit(1);
