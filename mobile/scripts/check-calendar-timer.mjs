#!/usr/bin/env node
// Exercise the real calendar hook with Android's numeric timer handles.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const ts = require("typescript");
const js = ts.transpileModule(
  readFileSync(new URL("../src/kala/useToday.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } },
).outputText;

function mount(active) {
  let now = Date.UTC(2026, 9, 12, 6, 38, 24);
  let nextId = 5;
  let stateIndex = 0;
  const timers = new Map();
  const effects = [];
  const ticks = [];
  let appStateListener = null;
  const place = { label: "Delhi", lat: 28.6, lon: 77.2, tz: "Asia/Kolkata" };
  const modules = {
    react: {
      useCallback: (fn) => fn,
      useMemo: (fn) => fn(),
      useEffect: (fn) => effects.push(fn),
      useState: (initial) => {
        const index = stateIndex++;
        return [typeof initial === "function" ? initial() : initial, (value) => {
          if (index === 3) ticks.push(value.getTime());
        }];
      },
    },
    "react-native": { AppState: { addEventListener: (event, listener) => {
      assert.equal(event, "change");
      appStateListener = listener;
      return { remove: () => { appStateListener = null; } };
    } } },
    "../data/cities": { CITIES: [] },
    "../services/place": { getPlace: async () => null },
    "./clock": {
      deviceTimeZone: () => place.tz,
      clockTextFor: () => () => "12:09",
      whenTextFor: () => () => "today",
    },
    "./prefs": { getKalaPrefs: () => ({ tradition: "test", script: "deva" }) },
    "./today": {},
    "./traditions": { traditionById: () => ({ city: place }) },
  };
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  const module = { exports: {} };
  vm.runInNewContext(js, {
    require: (name) => { assert.ok(name in modules, name); return modules[name]; },
    module, exports: module.exports, Date: Clock,
    setTimeout: (fn, delay) => {
      const id = nextId++;
      timers.set(id, { fn, at: now + delay });
      return id;
    },
    clearTimeout: (id) => timers.delete(id),
    // The old callback used this before writing timer.iv onto a numeric handle.
    setInterval: () => nextId++,
  });
  module.exports.useToday(active);
  // Only the clock effect: preference/network/snapshot effects are independent.
  const cleanup = effects[2]();
  return {
    timers, ticks, cleanup,
    resume: () => appStateListener?.("active"),
    hasListener: () => appStateListener !== null,
    fireNext: () => {
      assert.equal(timers.size, 1, "one pending minute tick");
      const [id, timer] = timers.entries().next().value;
      timers.delete(id);
      now = timer.at;
      timer.fn();
    },
  };
}

const clock = mount(true);
assert.equal(clock.ticks.length, 1, "update immediately on focus");
for (let i = 0; i < 3; i++) {
  clock.fireNext();
  assert.equal(clock.ticks.at(-1) % 60000, 40, "tick just after each minute boundary");
}
assert.equal(clock.ticks.length, 4);
clock.resume();
assert.equal(clock.ticks.length, 5, "refresh after returning to the app");
assert.equal(clock.timers.size, 1, "resume must not duplicate the timer");
clock.cleanup();
assert.equal(clock.timers.size, 0, "clear the latest timer on blur/unmount");
assert.equal(clock.hasListener(), false);

const early = mount(true);
early.cleanup();
assert.equal(early.timers.size, 0, "cancel before the first boundary");
const hidden = mount(false);
assert.equal(hidden.timers.size, 0, "no ticking off-screen");
assert.equal(hidden.hasListener(), false);
assert.equal(hidden.ticks.length, 0);
console.log("Calendar timer passes: numeric handles, three minute boundaries, resume and cleanup.");

// Static whole-src guard for the class of bug above: attaching metadata
// (`.iv`) to an Android timer handle. useToday.ts was the first place found
// (2026-10-12); ParvaStrip.tsx reintroduced the same `.iv = iv` idiom and only
// a source-wide scan catches it, so drive every timer through a numeric handle
// free of any extra property.
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
const SRC = resolve(here, "../src");
const IV_ASSIGN = /\.iv\s*=/;
const offenders = [];
(function walk(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(p) && IV_ASSIGN.test(readFileSync(p, "utf8"))) offenders.push(p);
  }
})(SRC);
assert.deepEqual(offenders, [], "no .iv metadata attached to any timer handle anywhere in src/" + (offenders.length ? " -> " + offenders.join(", ") : ""));
