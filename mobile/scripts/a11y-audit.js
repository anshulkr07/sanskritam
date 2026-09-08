// a11y-audit.js — static accessibility audit (U5-1/U5-4), report-only.
//
// Scans mobile/src for interactive JSX elements missing screen-reader props:
//   • <Pressable> without accessibilityLabel  (U5-1: every interactive element)
//   • <Pressable> without accessibilityRole   (role tells TalkBack it is a button)
//   • <TextInput> without accessibilityLabel
//   • TouchableOpacity / TouchableHighlight use (banned: Pressable only)
//
// Report-only: exits 0 and lists issues. It is a flashlight, not a gate —
// the TalkBack/VoiceOver pass on a real device is still required (§U5-1).
// Run:  node scripts/a11y-audit.js   (from mobile/)

const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "src");

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}

// Find JSX opening tags named `name`, brace/quote-aware. Returns {line, text}.
function findTags(src, name) {
  const tags = [];
  const open = `<${name}`;
  let i = 0;
  while (true) {
    const s = src.indexOf(open, i);
    if (s < 0) break;
    const after = src[s + open.length];
    if (after && /[A-Za-z0-9_]/.test(after)) { i = s + open.length; continue; }
    // Skip TypeScript generics like useRef<TextInput> — the `<` there is
    // preceded by an identifier char, never by JSX punctuation/whitespace.
    const before = s > 0 ? src[s - 1] : "\n";
    if (/[A-Za-z0-9_]/.test(before)) { i = s + open.length; continue; }
    // scan to matching '>' at depth 0
    let j = s + open.length;
    let brace = 0, paren = 0, bracket = 0, quote = null;
    let closed = false;
    while (j < src.length) {
      const c = src[j];
      if (quote) {
        if (c === "\\") { j += 2; continue; }
        if (c === quote) quote = null;
      } else if (c === '"' || c === "'" || c === "`") {
        quote = c;
      } else if (c === "{") brace++;
      else if (c === "}") brace--;
      else if (c === "(") paren++;
      else if (c === ")") paren--;
      else if (c === "[") bracket++;
      else if (c === "]") bracket--;
      else if (c === ">" && brace === 0 && paren === 0 && bracket === 0) { closed = true; break; }
      j++;
    }
    const text = src.slice(s, j + 1);
    const line = src.slice(0, s).split("\n").length;
    tags.push({ line, text, closed });
    i = j + 1;
  }
  return tags;
}

const BANNED_TOUCHABLES = ["TouchableOpacity", "TouchableHighlight", "TouchableWithoutFeedback"];

let issues = 0;
for (const file of walk(SRC)) {
  const rel = path.relative(path.join(__dirname, ".."), file);
  const src = fs.readFileSync(file, "utf8");
  for (const t of findTags(src, "Pressable")) {
    if (!t.closed) { console.log(`${rel}:${t.line} UNCLOSED <Pressable tag`); issues++; continue; }
    if (!/accessibilityLabel=/.test(t.text)) { console.log(`${rel}:${t.line} Pressable missing accessibilityLabel`); issues++; }
    if (!/accessibilityRole=/.test(t.text)) { console.log(`${rel}:${t.line} Pressable missing accessibilityRole`); issues++; }
  }
  for (const t of findTags(src, "TextInput")) {
    if (!/accessibilityLabel=/.test(t.text)) { console.log(`${rel}:${t.line} TextInput missing accessibilityLabel`); issues++; }
  }
  for (const b of BANNED_TOUCHABLES) {
    for (const t of findTags(src, b)) {
      console.log(`${rel}:${t.line} banned touchable <${b}> (use Pressable)`);
      issues++;
    }
  }
}

console.log(`\na11y-audit: ${issues} issue(s) across ${walk(SRC).length} files.`);
