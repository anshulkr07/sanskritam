#!/usr/bin/env node
/**
 * WCAG contrast checker for the Shabd palette.
 *
 * Verifies every colour token in src/theme.ts against the paper background.
 * Body text needs >= 4.5:1 (AA); large/display text needs >= 3.0:1.
 *
 * Usage:  node scripts/check-contrast.mjs
 * Exits 1 if any token marked BODY fails. Used by UI_HANDOVER.md task U5-3.
 */

const BG = "#FFF8EE"; // color.bg — the warm paper everything sits on

/**
 * Tokens and how they are USED. A token used only as a fill (button
 * background, flame icon, progress bar) is held to the 3:1 large bar; a
 * token used for body-size text is held to 4.5:1.
 */
const TOKENS = [
  { name: "ink", hex: "#3B2E25", use: "BODY" },
  { name: "inkSoft", hex: "#7A6A5C", use: "BODY" },
  { name: "inkFaint", hex: "#B4A28E", use: "BODY" },
  { name: "saffron", hex: "#E85B25", use: "FILL" },
  { name: "ok", hex: "#2FA84F", use: "FILL" },
  { name: "warn", hex: "#F0A01F", use: "FILL" },
  { name: "bad", hex: "#E0453A", use: "FILL" },
  { name: "unsure", hex: "#8E7DF0", use: "FILL" },
  { name: "gold", hex: "#F2B33D", use: "FILL" },
  // Add the *Text variants here as U5-3 introduces them:
  // { name: "okText", hex: "#25833E", use: "BODY" },
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
  const need = use === "BODY" ? 4.5 : 3.0;
  const pass = r >= need;
  if (!pass) failed++;
  const mark = pass ? "ok" : "FAIL";
  console.log(
    `  ${name.padEnd(12)} ${hex}  ${r.toFixed(2).padStart(5)}:1  ${need.toFixed(1)}   ${mark}`,
  );
}

console.log("");
if (failed > 0) {
  console.error(`  ${failed} token(s) below their required contrast.\n`);
  process.exit(1);
}
console.log("  All tokens pass.\n");
