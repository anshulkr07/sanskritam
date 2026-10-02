#!/usr/bin/env node
/**
 * Holds the word journey wording (src/words/labels.ts) to its spec
 * (handover_language.md 6.2): each relation line and its plural, an unknown
 * relation giving "", stops for a loan with and without hops, a related word
 * with and without a relative, null hops, and the two read-aloud sentences.
 *
 * mobile/ has no test runner, so this transpiles the TypeScript with the
 * project's own compiler and runs it in Node.
 *
 * Usage:  node scripts/check-words.mjs
 * Exits 1 if any check fails.
 */

import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const ts = require("typescript");

// ── a small TypeScript loader (as in check-kala.mjs) ────────────────────
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

const L = loadTs(resolve(here, "../src/words/labels.ts"));

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
const same = (got, want, label) => check(got === want, label, `"${got}" is not "${want}"`);

// ── fixtures (made-up words in the API's shape, never dictionary text) ──
const sharkara = { id: "sharkara", sanskrit: { dev: "X", iast: "sarkara" }, gloss: "grit" };
const zucker = {
  id: "sharkara.de.zucker",
  lang: "de",
  lang_name: "German",
  word: "Zucker",
  script: "latin",
  roman: "",
  gloss: "sugar",
  kind: "loan",
  relation: "travelled",
  confidence: "certain",
  hops: [
    { lang: "Arabic", form: "sukkar" },
    { lang: "Italian", form: "zucchero" },
  ],
  sources: ["pfeifer"],
};
const direct = {
  id: "x.en.y",
  lang: "en",
  lang_name: "English",
  word: "y",
  script: "latin",
  roman: "",
  gloss: "y",
  kind: "loan",
  relation: "borrowed",
  confidence: "certain",
  hops: [],
};
const agni = { id: "agni", sanskrit: { dev: "Y", iast: "agni" }, gloss: "fire" };
const ignite = {
  id: "agni.en.ignite",
  lang: "en",
  lang_name: "English",
  word: "ignite",
  script: "latin",
  roman: "",
  gloss: "set alight",
  kind: "related",
  relation: "related",
  confidence: "certain",
  hops: [
    { lang: "Latin", form: "ignis" },
    { lang: "Late Latin", form: "ignire" },
  ],
};
const ignisAlone = { ...ignite, id: "agni.la.ignis", lang: "la", lang_name: "Latin", word: "ignis", hops: [] };

// ── the title ───────────────────────────────────────────────────────────
section("Title");
same(L.FEATURE_TITLE, "Word journey", "feature title");

// ── relation lines ──────────────────────────────────────────────────────
section("Relation lines");
same(L.relationLine({ relation: "borrowed" }), "Borrowed from Sanskrit", "borrowed");
same(L.relationLine({ relation: "travelled", hops: [{ lang: "A", form: "a" }] }), "From Sanskrit, through 1 language", "travelled, singular");
same(L.relationLine(zucker), "From Sanskrit, through 2 languages", "travelled, plural");
same(
  L.relationLine({ relation: "travelled", hops: [{ lang: "A", form: "a" }, { lang: "B", form: "b" }, { lang: "C", form: "c" }] }),
  "From Sanskrit, through 3 languages",
  "travelled, three",
);
same(L.relationLine({ relation: "related" }), "Same family as Sanskrit", "related");
same(L.relationLine({ relation: "traced" }), "Goes back to Sanskrit", "traced");
same(L.relationLine({ relation: "traced", hops: [{ lang: "A", form: "a" }] }), "Goes back to Sanskrit", "traced claims no stops");
same(L.relationLine({ relation: "loan" }), "", "a stored kind is not a label");
same(L.relationLine({ relation: "" }), "", "empty relation gives no line");
same(L.relationLine({}), "", "missing relation gives no line");
same(L.relationLine(null), "", "null route gives no line");

// ── confidence ──────────────────────────────────────────────────────────
section("Confidence");
same(L.confidenceLine({ confidence: "probable" }), "Dictionaries say probably", "probable");
same(L.confidenceLine({ confidence: "certain" }), "", "certain gives no line");
same(L.confidenceLine({}), "", "missing confidence gives no line");

// ── the page behind a route ─────────────────────────────────────────────
section("Source page");
same(L.sourcePage({ source_url: "https://dle.rae.es/x", source_site: "RAE" })?.site, "RAE", "site named");
same(L.sourcePage({ source_url: "https://dle.rae.es/x" })?.site, "https://dle.rae.es/x", "no site name: the address");
same(L.sourcePage({ source_url: "javascript:alert(1)", source_site: "x" }), null, "only web addresses open");
same(L.sourcePage({ source_url: "" }), null, "no page");
same(L.sourcePage(zucker), null, "a hand-checked route has no page");

// ── stops ───────────────────────────────────────────────────────────────
section("Stops");
{
  const rows = L.stops(sharkara, zucker);
  same(rows.length, 4, "loan with hops has four rows");
  same(rows.map((r) => r.join).join(","), "start,arrow,arrow,arrow", "loan joins are arrows");
  same(rows[0].label, "Sanskrit", "first row is Sanskrit");
  same(rows[0].form, "X", "Sanskrit form from the origin");
  same(rows[1].label, "Arabic", "hop language");
  same(rows[3].form, "Zucker", "last row is the word");

  const bare = L.stops(sharkara, direct);
  same(bare.length, 2, "loan without hops has two rows");
  same(bare.map((r) => r.join).join(","), "start,arrow", "direct loan joins");

  const rel = L.stops(agni, ignisAlone);
  same(rel.length, 2, "related word alone has two rows");
  same(rel.map((r) => r.join).join(","), "start,family", "related word joins by family");

  const through = L.stops(agni, ignite);
  same(through.length, 4, "related word through a relative has four rows");
  same(through.map((r) => r.join).join(","), "start,family,arrow,arrow", "family join then arrows");
  same(through[1].form, "ignis", "the relative comes first");
}
section("Null hops read as empty");
{
  const rows = L.stops(sharkara, { ...direct, hops: null });
  same(rows.length, 2, "null hops read as an empty list");
  same(L.stops(sharkara, { ...zucker, hops: null }).length, 2, "null hops on a loan with hops");
  same(L.stops(sharkara, { ...direct, word: "" }).length, 0, "a route with no word is skipped");
}

// ── sentences ───────────────────────────────────────────────────────────
section("Sentences");
same(
  L.cardSentence(sharkara, zucker),
  "Zucker, German, sugar. From Sanskrit, through 2 languages: sarkara.",
  "card sentence",
);
same(
  L.journeySentence(sharkara, zucker),
  "Sanskrit sarkara, then Arabic sukkar, then Italian zucchero, then German Zucker.",
  "loan ladder sentence",
);
same(
  L.journeySentence(agni, ignite),
  "Sanskrit agni and Latin ignis are relatives. Then Late Latin ignire, then English ignite.",
  "related ladder sentence",
);
same(
  L.journeySentence(agni, ignisAlone),
  "Sanskrit agni and Latin ignis are relatives.",
  "related word alone",
);

// ── no dashes in anything a user can read ───────────────────────────────
section("Copy rule");
{
  const samples = [
    L.FEATURE_TITLE,
    L.relationLine({ relation: "borrowed" }),
    L.relationLine(zucker),
    L.relationLine({ relation: "related" }),
    L.relationLine({ relation: "traced" }),
    L.confidenceLine({ confidence: "probable" }),
    L.cardSentence(sharkara, zucker),
    L.journeySentence(sharkara, zucker),
    L.journeySentence(agni, ignite),
  ];
  check(!samples.some((s) => /[—–]/.test(s)), "no em or en dashes in labels or sentences");
}

console.log(`\n  ${passed} passed${failed ? `, ${failed} failed` : ""}.\n`);
if (failed > 0) process.exit(1);
