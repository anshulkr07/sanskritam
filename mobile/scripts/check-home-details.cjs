// Focused Home checks: local clocks/phase boundaries, daily-summary bounds
// and birth dropdown conversion. Uses the project's TS compiler and astronomy.
const assert = require("node:assert/strict");
const { readFileSync, existsSync } = require("node:fs");
const { dirname, resolve } = require("node:path");
const ts = require("typescript");
const loaded = new Map();
function load(file) {
  const abs = resolve(__dirname, "..", file);
  if (loaded.has(abs)) return loaded.get(abs).exports;
  const module = { exports: {} }; loaded.set(abs, module);
  const localRequire = (name) => {
    if (name === "@react-native-async-storage/async-storage") return {};
    if (!name.startsWith(".")) return require(name);
    const path = resolve(dirname(abs), name);
    for (const extension of [".ts", ".tsx"]) if (existsSync(path + extension)) return load(path + extension);
    throw new Error(`Missing module ${name}`);
  };
  const code = ts.transpileModule(readFileSync(abs, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  new Function("require", "module", "exports", code)(localRequire, module, module.exports);
  return module.exports;
}
const { wallClockAt } = load("src/kala/clock.ts");
const { snapshot } = load("src/kala/today.ts");
const { tithiAt } = load("src/kala/engine.ts");
const { homeTime, homeMoment, homeSkyDetails, moonCountdown } = load("src/home/todayDetails.ts");
const { rashiSummary, rashiProfileKey, rashiDateLabel } = load("src/home/rashiReading.ts");
const { parseBirth, to24h } = load("src/services/birth.ts");
const { homeFestivalOccurrences } = load("src/home/festivalSelection.ts");
let checked = 0;
function check(name, fn) { fn(); checked++; console.log(`ok ${name}`); }
const delhi = { label: "New Delhi", lat: 28.6, lon: 77.2, tz: "Asia/Kolkata" };
const now = new Date("2026-10-14T01:00:00Z");
function sky(place = delhi, at = now) { return homeSkyDetails(snapshot(at, wallClockAt(at, place.tz), place, "north")); }

check("12-hour clocks handle midnight, noon, fractional zone and day rollover", () => {
  assert.equal(homeTime(new Date("2026-10-14T18:30:00Z"), delhi.tz), "12:00 AM");
  assert.equal(homeTime(new Date("2026-10-14T06:30:00Z"), delhi.tz), "12:00 PM");
  assert.equal(homeTime(now, "Asia/Kathmandu"), "6:45 AM");
  assert.equal(homeMoment(new Date("2026-10-14T18:45:00Z"), delhi.tz, now), "Tomorrow, 12:15 AM");
});
check("sunrise and sunset are local and change with the chosen city", () => {
  const a = sky().sun;
  const b = sky({ label: "Mumbai", lat: 19.1, lon: 72.9, tz: delhi.tz }).sun;
  assert.ok(a && b);
  assert.ok(a.sunrise < a.sunset);
  assert.equal(wallClockAt(a.sunrise, delhi.tz).date.d, 14);
  assert.notEqual(homeTime(a.sunrise, delhi.tz), homeTime(b.sunrise, delhi.tz));
  console.log(`  Delhi ${homeTime(a.sunrise, delhi.tz)} / ${homeTime(a.sunset, delhi.tz)}; Mumbai ${homeTime(b.sunrise, delhi.tz)} / ${homeTime(b.sunset, delhi.tz)}`);
});
check("countdown reaches the full-moon tithi start, not the later full-moon instant", () => {
  const moon = sky().moon;
  assert.equal(moon.name, "Poornima");
  assert.equal(tithiAt(new Date(moon.at.getTime() - 10_000)).number, 14);
  assert.equal(tithiAt(new Date(moon.at.getTime() + 10_000)).number, 15);
  const underway = sky(delhi, new Date(moon.at.getTime() + 60_000)).moon;
  assert.equal(moonCountdown(underway, underway.at, delhi.tz), "Poornima today");
});
check("waning countdown reaches Amavasya and has a today state", () => {
  const waning = new Date(sky().moon.at.getTime() + 3 * 86_400_000);
  const moon = sky(delhi, waning).moon;
  assert.equal(moon.name, "Amavasya");
  assert.equal(tithiAt(new Date(moon.at.getTime() - 10_000)).number, 29);
  assert.equal(tithiAt(new Date(moon.at.getTime() + 10_000)).number, 30);
  assert.equal(sky(delhi, new Date(moon.at.getTime() + 60_000)).moon.underway, true);
});
check("countdown uses city calendar days across midnight and daylight saving", () => {
  const moon = { name: "Amavasya", full: false, underway: false, at: new Date("2026-10-18T00:00:00Z") };
  assert.equal(moonCountdown(moon, new Date("2026-10-14T18:29:00Z"), delhi.tz), "4 days to go for Amavasya");
  assert.equal(moonCountdown(moon, new Date("2026-10-14T18:31:00Z"), delhi.tz), "3 days to go for Amavasya");
  moon.at = new Date("2026-11-02T05:10:00Z");
  assert.equal(moonCountdown(moon, new Date("2026-11-01T04:10:00Z"), "America/New_York"), "1 day to go for Amavasya");
  moon.at = new Date("2026-10-14T10:00:00Z");
  assert.equal(moonCountdown(moon, now, delhi.tz), "Amavasya begins today");
});
check("polar places show unavailable solar events", () => {
  const polar = { label: "Tromso", lat: 69.65, lon: 18.96, tz: "Europe/Oslo" };
  assert.equal(sky(polar, new Date("2026-12-14T12:00:00Z")).sun, null);
});
check("Rashi uses the short summary instead of the full chart explanation", () => {
  assert.equal(rashiSummary({ card: { summary: "**Make room for one quiet task.** Listen carefully today." }, explanation: "Planet degrees and chart tables. ".repeat(100) }), "Make room for one quiet task. Listen carefully today.");
  const text = rashiSummary({ card: null, explanation: "Take one steady step. ".repeat(100) });
  assert.ok(text.split(/\s+/).length <= 75);
  assert.equal(text.split(".").filter((part) => part.trim()).length, 3);
  assert.equal(rashiDateLabel("2026-10-14"), "14 Oct");
});
check("birth dropdowns preserve AM/PM, unknown time and invalid dates", () => {
  assert.equal(to24h("12", "00", "AM"), "00:00");
  assert.equal(to24h("12", "00", "PM"), "12:00");
  assert.equal(to24h("2", "30", "PM"), "14:30");
  const result = parseBirth("21", "8", "1995", "", false, delhi, now);
  assert.equal(result.birth.time, ""); assert.equal(result.birth.time_known, false);
  assert.ok("error" in parseBirth("29", "2", "2025", "14:30", true, delhi, now));
  const profile = result.birth;
  assert.notEqual(rashiProfileKey(profile), rashiProfileKey({ ...profile, time: "14:30", time_known: true }));
  assert.notEqual(rashiProfileKey(profile), rashiProfileKey({ ...profile, lon: 80 }));
});
check("Home hides future festivals but keeps ongoing and simultaneous observances", () => {
  const today = "2026-10-14";
  const current = { slug: "today", date: today, end_date: null, day: null };
  const other = { ...current, slug: "also-today" };
  const ongoing = { slug: "period", date: "2026-10-12", end_date: "2026-10-20", day: null };
  const series = { slug: "navaratri", date: "2026-10-11", day: [{ date: today }] };
  const future = { slug: "future", date: "2026-10-15", day: null };
  const past = { slug: "past", date: "2026-10-13", day: null };
  assert.deepEqual(homeFestivalOccurrences([current, other, ongoing, series, future, past], today), [current, other, ongoing, series]);
});
console.log(`${checked} Home checks passed.`);
