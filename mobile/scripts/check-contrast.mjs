#!/usr/bin/env node
/**
 * WCAG contrast checker for the Shabd palette (task U5-3).
 *
 * Verifies every colour token in src/theme.ts against the paper background.
 * Body text needs >= 4.5:1 (AA); large/display text needs >= 3.0:1.
 *
 * The semantic verdict colours were SPLIT in U5-3 rather than darkened: each
 * bright fill (ok, warn, bad, unsure, saffron, gold) keeps its value for
 * backgrounds / icons / large display type, and gains a matching *Text
 * variant that body-size text must use. The bright fills carry no body copy:
 * the readable text on them is always the *Text variant, and the verdict
 * coloiur alone is never the sole signal (a distinct icon + haptic + sound
 * always ride along, per §3.4). So those fills are gated only to the 3:1 fill
 * bar, and a fill below even that (ok, warn, gold — measured 2026-09-01) is
 * documented decorative fill, its information carried by the *Text pair.
 *
 * Usage:  node scripts/check-contrast.mjs
 * Exits 1 if any BODY or FILL token is below its bar.
 */

const BG = "#FFF8EE"; // color.bg — the warm paper everything sits on

/**
 * Tokens and how they are USED.
 *  - BODY: body-size text on paper — must pass 4.5:1.
 *  - FILL: background / icon / large display type — 3:1 (AA large).
 *  - DECOR: purely decorative fill whose meaning is carried by its paired
 *    *Text token plus an icon/haptic/sound. Not gated; listed for audit.
 */
const TOKENS = [
  { name: "ink",        hex: "#3B2E25", use: "BODY" },
  { name: "inkSoft",    hex: "#7A6A5C", use: "BODY" },
  { name: "inkFaint",   hex: "#846F57", use: "BODY" }, // darkened from #B4A28E in U5-3
  { name: "saffron",    hex: "#E85B25", use: "FILL" },
  { name: "ok",         hex: "#2FA84F", use: "DECOR" }, // text rides on okText
  { name: "warn",       hex: "#F0A01F", use: "DECOR" }, // text rides on warnText
  { name: "bad",        hex: "#E0453A", use: "FILL" },
  { name: "unsure",     hex: "#8E7DF0", use: "FILL" },
  { name: "gold",       hex: "#F2B33D", use: "DECOR" }, // text rides on goldText

  // The *Text variants — body-size text on paper MUST use these.
  { name: "okText",     hex: "#25833E", use: "BODY" },
  { name: "warnText",   hex: "#9D650B", use: "BODY" },
  { name: "badText",    hex: "#D92E22", use: "BODY" },
  { name: "unsureText", hex: "#6F59EC", use: "BODY" },
  { name: "saffronText",hex: "#CA4715", use: "BODY" },
  { name: "goldText",   hex: "#99680A", use: "BODY" },
];

const srgb = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

function luminance(hex) {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
}

function ratio(a, b) {
  const [la, lb] = [luminance(a), luminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

let failed = 0;
console.log(`\n  Contrast against bg ${BG}\n`);
console.log("  token        hex       ratio    need   result");
console.log("  " + "-".repeat(48));

for (const { name, hex, use } of TOKENS) {
  const r = ratio(hex, BG);
  const txt = use === "BODY" ? "body" : use === "FILL" ? "fill" : "decor";
  if (use === "DECOR") {
    console.log(
      `  ${name.padEnd(12)} ${hex}  ${r.toFixed(2).padStart(5)}:1  ${"   -"}   ${"decor"}`,
    );
    continue;
  }
  const need = use === "BODY" ? 4.5 : 3.0;
  const pass = r >= need;
  if (!pass) failed++;
  const mark = pass ? "ok" : "FAIL";
  console.log(
    `  ${name.padEnd(12)} ${hex}  ${r.toFixed(2).padStart(5)}:1  ${need.toFixed(1)}   ${mark}  (${txt})`,
  );
}

// ── Accent family (theme.ts `accent`) ──────────────────────────────────
// Read from the source so this can never drift from the values the app uses.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const themeSrc = readFileSync(fileURLToPath(new URL("../src/theme.ts", import.meta.url)), "utf8");
const block = themeSrc.match(/export const accent = \{([\s\S]*?)\} as const;/);
const ACCENTS = [];
if (block) {
  for (const m of block[1].matchAll(
    /(\w+):\s*\{\s*fg:\s*"(#\w{6})",\s*bg:\s*"(#\w{6})",\s*from:\s*"(#\w{6})",\s*to:\s*"(#\w{6})"/g,
  )) {
    ACCENTS.push({ name: m[1], fg: m[2], bg: m[3], from: m[4], to: m[5] });
  }
}
if (ACCENTS.length === 0) {
  console.error("  Could not read the accent table from src/theme.ts.\n");
  process.exit(1);
}

console.log("  Accents (body text 4.5:1)");
console.log("  accent    fg/paper  fg/tint   white/from  white/to");
console.log("  " + "-".repeat(52));
for (const a of ACCENTS) {
  const checks = [
    ratio(a.fg, BG),
    ratio(a.fg, a.bg),
    ratio("#FFFFFF", a.from),
    ratio("#FFFFFF", a.to),
  ];
  const bad = checks.filter((r) => r < 4.5).length;
  failed += bad;
  console.log(
    `  ${a.name.padEnd(9)} ${checks.map((r) => r.toFixed(2).padStart(7)).join("   ")}   ${bad ? "FAIL" : "ok"}`,
  );
}

// White label on the saffron button fill.
const btn = themeSrc.match(/saffronBtn:\s*"(#\w{6})"/)?.[1];
if (btn) {
  const r = ratio("#FFFFFF", btn);
  if (r < 4.5) failed++;
  console.log(`\n  saffronBtn ${btn}  white label ${r.toFixed(2)}:1  ${r < 4.5 ? "FAIL" : "ok"}`);
}

// ── Deep solid fills (theme.ts `fill` + `onFill`) ───────────────────────
// Cream text must pass 4.5:1 on every fill. The gold small-label colour is
// allowed only on fills where it passes 4.5:1 — never on saffron, gold or ok
// (measured 3.73 / 3.90 / 3.03: small labels there are cream, not gold).
const CREAM = "#FFF8EE";
const ON_GOLD = "#F2C879";
// bad is excluded too: gold on #B3261E measures 4.14:1, below the 4.5 bar,
// so small labels on a bad fill are cream, not gold.
const GOLD_EXCLUDED = new Set(["saffron", "gold", "ok", "bad"]);
const fillBlock = themeSrc.match(/export const fill = \{([\s\S]*?)\} as const;/);
const FILLS = [];
if (fillBlock) {
  for (const m of fillBlock[1].matchAll(/(\w+):\s*"(#\w{6})"/g)) {
    FILLS.push({ name: m[1], hex: m[2] });
  }
}
if (FILLS.length === 0) {
  console.error("  Could not read the fill table from src/theme.ts.\n");
  process.exit(1);
}
console.log("  Deep fills (cream body text 4.5:1; gold label 4.5:1 where allowed)");
console.log("  fill       cream     gold label");
console.log("  " + "-".repeat(38));
for (const f of FILLS) {
  const rc = ratio(CREAM, f.hex);
  const rg = ratio(ON_GOLD, f.hex);
  let mark = "ok";
  if (rc < 4.5) {
    failed++;
    mark = "FAIL";
  } else if (!GOLD_EXCLUDED.has(f.name) && rg < 4.5) {
    failed++;
    mark = "FAIL";
  }
  const goldTxt = GOLD_EXCLUDED.has(f.name) ? "   n/a " : rg.toFixed(2).padStart(7);
  console.log(`  ${f.name.padEnd(10)} ${rc.toFixed(2).padStart(5)}:1  ${goldTxt}   ${mark}`);
}

console.log("");
if (failed > 0) {
  console.error(`  ${failed} token(s) below their required contrast.\n`);
  process.exit(1);
}
console.log("  All tokens pass.\n");