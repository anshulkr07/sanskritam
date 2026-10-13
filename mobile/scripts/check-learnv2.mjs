#!/usr/bin/env node
/**
 * LearnV2 catalogue check — validates the static lesson catalogue without a
 * device: card counts, bilingual fields, script/IAST pairing, practice shape,
 * prereq edges, JSONL manifests (sources/requests/integration), and that the
 * static asset map only references files present in the repo.
 *
 * Usage: node scripts/check-learnv2.mjs
 * Exits 1 on any failure.
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(new URL("../src/learnv2/catalogue.ts", import.meta.url)));
const mobileRoot = path.join(root, "..", "..");
const specsDir = path.join(mobileRoot, "..", "specs", "learn-v2");

let failed = 0;
const fail = (msg) => {
  failed++;
  console.error(`  FAIL ${msg}`);
};
const ok = (msg) => console.log(`  ok   ${msg}`);

// ── 1. Catalogue source-level checks (no TS execution needed) ────────────
const catSrc = readFileSync(path.join(root, "catalogue.ts"), "utf8");
// Lessons (not units) carry a `unit:` field — units carry `lessonIds:`.
const lessonIds = [...catSrc.matchAll(/id:\s*"([a-z0-9-]+)",\s*\n\s*rank:\s*\d+,\s*\n\s*unit:/g)].map((m) => m[1]);
if (lessonIds.length === 0) fail("no lessons found in catalogue.ts");
else ok(`${lessonIds.length} lessons in catalogue`);

// Banned control: any closer-look/disclosure must never appear.
for (const needle of ["A closer look", "closer look", "Collapsible", "Disclosure", "<details"]) {
  if (catSrc.includes(needle)) fail(`banned disclosure string in catalogue: ${needle}`);
}
ok("no closer-look/disclosure control in catalogue");

// Card-kind census from source.
const kinds = {};
for (const m of catSrc.matchAll(/kind:\s*"(teach|anchor|practice|summary)"/g)) kinds[m[1]] = (kinds[m[1]] ?? 0) + 1;
console.log(`  info card kinds: ${JSON.stringify(kinds)}`);
if (!kinds.practice || kinds.practice < lessonIds.length) fail("every lesson needs a practice card");

// Prereq edges point at live lessons.
for (const m of catSrc.matchAll(/prereqIds:\s*\[([^\]]*)\]/g)) {
  for (const pm of m[1].matchAll(/"([a-z0-9-]+)"/g)) {
    if (!lessonIds.includes(pm[1])) fail(`unknown prereq ${pm[1]}`);
  }
}
ok("prereq edges resolve");

// Count card definitions, rather than splitting on IDs shared by cards and lessons.
const cardIds = [...catSrc.matchAll(/id:\s*"([a-z0-9-]+-\d+)"/g)].map((m) => m[1]);
const cardCounts = Object.fromEntries(lessonIds.map((id) => [id,
  cardIds.filter((cardId) => cardId.startsWith(`${id}-`)).length,
]));
console.log(`  info cards per lesson: ${JSON.stringify(cardCounts)}; total ${cardIds.length}`);
if (new Set(cardIds).size !== cardIds.length) fail("duplicate card IDs");

// ── 2. JSONL manifests ───────────────────────────────────────────────────
function readJsonl(name, { allowExampleOnly = false } = {}) {
  const file = path.join(specsDir, name);
  if (!existsSync(file)) {
    fail(`missing ${name}`);
    return [];
  }
  const rows = [];
  const lines = readFileSync(file, "utf8").split("\n").filter((l) => l.trim());
  lines.forEach((line, i) => {
    try {
      const obj = JSON.parse(line);
      // Tolerate a concurrent append: only the final line may be partial, and
      // JSON.parse already failed — report precisely.
      rows.push(obj);
    } catch {
      fail(`${name}:${i + 1} is not a complete JSON object (possible partial append — retry)`);
    }
  });
  return rows;
}

const sources = readJsonl("sources.jsonl");
for (const s of sources) {
  if (!s.lesson_id || !s.licence || !s.source_url || !s.verification) fail(`sources.jsonl: incomplete record ${JSON.stringify(s).slice(0, 80)}`);
  if (s.status === "example_only") fail(`sources.jsonl: example_only leaked for ${s.lesson_id}`);
  if (!["adapted_external", "existing_project", "engine_generated", "original_explanation"].includes(s.origin))
    fail(`sources.jsonl: bad origin for ${s.lesson_id}`);
}
if (sources.length > 0) ok(`${sources.length} source records, all complete`);

const requests = readJsonl("requests.jsonl");
for (const r of requests) {
  if (!r.asset_id || !r.request_revision || !r.status) fail(`requests.jsonl: incomplete record`);
  if (r.status === "ready" && r.verification?.status !== "passed") fail(`requests.jsonl: ready without passed verification (${r.asset_id})`);
  for (const ref of r.reference_paths ?? []) {
    if (!ref.startsWith("mobile/")) continue;
    if (!existsSync(path.join(mobileRoot, "..", ref))) fail(`requests.jsonl: missing reference ${ref}`);
  }
}
if (requests.length > 0) ok(`${requests.length} request records, ready ones verified`);

// Live catalogue lessons all have verified sources.
const verifiedIds = new Set(sources.filter((s) => s.status === "verified").map((s) => s.lesson_id));
for (const id of lessonIds) {
  if (!verifiedIds.has(id)) fail(`lesson ${id} has no verified source record`);
}
ok("every live lesson has a verified source record");

const integ = readJsonl("integration-status.jsonl");
for (const g of integ) {
  if (!["accepted", "rejected", "integrated"].includes(g.state)) fail(`integration-status.jsonl: bad state for ${g.asset_id}`);
}
if (integ.length > 0) ok(`${integ.length} integration records`);

// ── 3. Asset map: only existing files ────────────────────────────────────
const assetSrc = readFileSync(path.join(root, "assetMap.ts"), "utf8");
for (const m of assetSrc.matchAll(/require\("([^"]+)"\)/g)) {
  const rel = m[1];
  const abs = path.join(root, rel);
  if (!existsSync(abs)) fail(`assetMap requires missing file ${rel}`);
  else ok(`asset present: ${rel}`);
}
// 13 Oct 2026: the delivered one/two/five-reader PNGs replaced the prototype
// JPGs (IMAGE-INTEGRATION-RESULT.md); the JPG files stay on disk unused.
if (assetSrc.includes("learn-v2/verbs-reading") && !assetSrc.includes("verbs-reading-dual-v1.png"))
  fail("assetMap should use the delivered verbs-reading PNGs");

// ── 4. Progress keys are versioned and separate ──────────────────────────
const progSrc = readFileSync(path.join(root, "progress.ts"), "utf8");
if (!progSrc.includes("shabd.learnv2.")) fail("progress.ts must use shabd.learnv2.* keys");
else ok("versioned shabd.learnv2.* keys");
for (const old of ["shabd.grammar.read", "shabd.story.index", "shabd.pref"]) {
  if (progSrc.includes(`"${old}"`)) fail(`progress.ts touches old key ${old}`);
}
ok("old progress keys untouched");

console.log("");
if (failed > 0) {
  console.error(`  ${failed} LearnV2 check(s) failed.\n`);
  process.exit(1);
}
console.log("  All LearnV2 checks pass.\n");
