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
const K = loadTs(resolve(here, "../src/recite/chantController.ts"));

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

// chantClock: which verse plays next, and what happens when one ends.
{
  const v = (c) => (c ? { chant: { url: "x" } } : { chant: null });
  const list = [v(true), v(false), v(true), v(false), v(false)];
  check(C.nextChantIndex(list, 0, 1) === 2, "next skips a verse with no chant");
  check(C.nextChantIndex(list, 2, 1) === -1, "no chant after the last one");
  check(C.nextChantIndex(list, 2, -1) === 0, "previous skips a verse with no chant");
  check(C.nextChantIndex(list, 0, -1) === -1, "nothing before the first");
  check(C.nextChantIndex([], 0, 1) === -1, "empty list");
  check(C.afterFinish("off", list, 0).kind === "next" && C.afterFinish("off", list, 0).index === 2, "ends, goes on");
  check(C.afterFinish("off", list, 2).kind === "stop", "ends at the last chant");
  // Repeat is read when the verse ends, so switching it on mid-verse counts.
  check(C.afterFinish("verse", list, 2).kind === "repeat", "repeat verse");
  check(C.afterFinish("verse", list, 0).kind === "repeat", "repeat verse, not the next");
  // Repeat chapter wraps at the end of the chapter to its first chant.
  check(C.afterFinish("chapter", list, 0).index === 2, "repeat chapter goes on mid-chapter");
  {
    const w = C.afterFinish("chapter", list, 2);
    check(w.kind === "next" && w.index === 0, "repeat chapter wraps to the first chant");
  }
  check(C.afterFinish("chapter", [v(false)], 0).kind === "stop", "repeat chapter with no chant stops");
}

// chantClock: fluid fill + akshara weights.
{
  const ln = { i: 0, text: "a", kind: "verse", start_ms: 200, end_ms: 1200 };
  check(C.lineFill(ln, 0) === 0, "fill before start");
  check(C.lineFill(ln, 200) === 0, "fill at start");
  check(C.lineFill(ln, 700) === 0.5, "fill halfway");
  check(C.lineFill(ln, 1200) === 1, "fill at end");
  check(C.lineFill(ln, 9999) === 1, "fill past end");
  check(C.lineFill(undefined, 500) === 0, "fill with no line");
  check(C.aksharaCount("योगश्चित्तवृत्तिनिरोधः") > 5, "aksharas counted", String(C.aksharaCount("योगश्चित्तवृत्तिनिरोधः")));
  check(C.aksharaCount("क्षत्रिय") === 3, "conjuncts count once", String(C.aksharaCount("क्षत्रिय")));
  check(C.aksharaCount("योग") === 2, "vowel signs add none", String(C.aksharaCount("योग")));
  check(C.aksharaCount("") === 0, "empty counts zero");
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

// chantController: the Chant mode player, run with a fake player and fake timers.
{
  const lines = [
    { i: 0, text: "a", kind: "verse", start_ms: 200, end_ms: 2000 },
    { i: 1, text: "b", kind: "verse", start_ms: 2500, end_ms: 5000 },
  ];
  const verse = (id, chant) => ({
    id, source_ref: id, chant: chant ? { url: "/audio/" + id + ".m4a", duration_ms: 6000, lines } : null,
  });
  const flush = async () => { for (let i = 0; i < 6; i++) await new Promise((r) => setImmediate(r)); };
  const rig = (pages) => {
    const players = [];
    const timers = [];
    const gates = [];
    const st = { repeat: "off", speed: 1, follow: true, pages, playing: false, verse: -1, line: -9, scrolls: [], gated: false };
    const host = {
      async ready() {},
      resolve: (u) => "http://x" + u,
      createPlayer(url) {
        const p = {
          url, played: 0, paused: 0, removed: false, rate: 1, listener: null, lock: [], seek: null,
          play() { this.played++; }, pause() { this.paused++; },
          async seekTo(sec) { this.seek = sec; },
          setPlaybackRate(r) { this.rate = r; },
          addListener(_e, cb) { this.listener = cb; return { remove: () => { this.listener = null; } }; },
          setActiveForLockScreen(a, m) { this.lock.push([a, m]); },
          remove() { this.removed = true; },
        };
        players.push(p);
        return p;
      },
      prepareAudio() {
        if (!st.gated) return Promise.resolve();
        return new Promise((r) => gates.push(r));
      },
      pages: () => st.pages, repeat: () => st.repeat, speed: () => st.speed, follow: () => st.follow,
      bookTitle: () => "Gita",
      setTimer(fn, ms) { const t = { fn, ms, cleared: false, ran: false }; timers.push(t); return t; },
      clearTimer(t) { t.cleared = true; },
      onVerse(i) { st.verse = i; }, onLine(l) { st.line = l; }, onPlaying(on) { st.playing = on; },
      scrollTo(i) { st.scrolls.push(i); },
    };
    const ctl = new K.ChantController(host);
    const tick = (p, sec, dur = 6, done = false) =>
      p.listener && p.listener({ isLoaded: true, currentTime: sec, duration: dur, didJustFinish: done });
    const runTimers = () => timers.filter((t) => !t.cleared && !t.ran).forEach((t) => { t.ran = true; t.fn(); });
    return { ctl, st, players, timers, gates, tick, runTimers };
  };
  const pages = [verse("v0", true), verse("v1", false), verse("v2", true), verse("v3", true)];

  // Plays a verse, lights its lines, shows it on the lock screen, follows it.
  {
    const r = rig(pages);
    await r.ctl.start(0); await flush();
    const p = r.players[0];
    check(p && p.url === "http://x/audio/v0.m4a" && p.played === 1, "plays the verse");
    check(r.st.playing && r.st.verse === 0 && r.st.scrolls.join() === "0", "reports it and follows it");
    check(p.lock[0] && p.lock[0][0] === true && p.lock[0][1].title === "v0" && p.lock[0][1].artist === "Gita", "lock screen");
    r.tick(p, 1.0); check(r.st.line === 0, "first line lit");
    r.tick(p, 3.0); check(r.st.line === 1, "second line lit");
  }

  // The next verse's player is built at 70% and is the one that plays next.
  {
    const r = rig(pages);
    await r.ctl.start(0); await flush();
    const first = r.players[0];
    r.tick(first, 3.0);
    check(r.players.length === 1, "nothing built before 70%");
    r.tick(first, 4.3);
    check(r.players.length === 2 && r.players[1].url === "http://x/audio/v2.m4a", "builds the next verse with a chant (skips v1)");
    r.tick(first, 4.4);
    check(r.players.length === 2, "builds it once");
    r.st.speed = 1.25; // changed while verse 0 plays
    r.tick(first, 6.0, 6, true);
    check(r.timers.length === 1 && r.timers[0].ms === 800 && r.players.length === 2, "0.8 s pause, no new player yet");
    r.runTimers(); await flush();
    check(r.players.length === 2, "the built player is reused, not rebuilt", String(r.players.length));
    check(first.removed, "the finished player is freed");
    check(r.players[1].played === 1 && r.st.verse === 2 && r.players[1].rate === 1.25, "next verse plays, at the speed set meanwhile");
  }

  // Repeat switched on while a verse is playing counts when it ends.
  {
    const r = rig(pages);
    await r.ctl.start(0); await flush();
    const first = r.players[0];
    r.tick(first, 2.0);
    r.st.repeat = "verse";
    r.tick(first, 6.0, 6, true); await flush();
    check(r.timers.length === 0, "repeat: no pause to the next verse");
    check(r.st.verse === 0 && r.players.length === 2 && r.players[1].url.endsWith("v0.m4a") && r.players[1].played === 1, "repeat plays the same verse again");
    check(first.removed, "repeat frees the old player");
    // No next player is built while Repeat is on.
    r.tick(r.players[1], 4.4); check(r.players.length === 2, "repeat builds no next player");
  }

  // Pausing in the gap between verses keeps the next verse waiting.
  {
    const r = rig(pages);
    await r.ctl.start(0); await flush();
    r.tick(r.players[0], 6.0, 6, true);
    const built = r.players.length; // the next verse's player, built ahead
    r.ctl.toggle(0); // pause during the 0.8 s
    check(!r.st.playing, "paused in the gap");
    r.runTimers(); await flush();
    check(r.st.verse === 0 && r.players.length === built && r.players.every((p) => p.played <= 1) && r.players[built - 1].played === (built === 1 ? 1 : 0),
      "the next verse does not start behind a pause");
    r.ctl.toggle(0); await flush();
    check(r.st.verse === 2 && r.st.playing && r.players[r.players.length - 1].url.endsWith("v2.m4a"), "Play carries on to the waiting verse");
  }

  // Pause and play inside a verse.
  {
    const r = rig(pages);
    await r.ctl.start(0); await flush();
    const p = r.players[0];
    r.ctl.toggle(0);
    check(!r.st.playing && p.paused === 1, "pause");
    r.ctl.toggle(0);
    check(r.st.playing && p.played === 2 && r.players.length === 1, "play resumes the same player");
  }

  // Leaving the screen in the gap starts nothing and frees the player.
  {
    const r = rig(pages);
    await r.ctl.start(0); await flush();
    const first = r.players[0];
    r.tick(first, 6.0, 6, true);
    const built = r.players.length;
    r.ctl.dispose();
    r.runTimers(); await flush();
    check(r.players.length === built && r.players.every((p) => p.removed) && r.players.filter((p) => p.played > 0).length === 1,
      "leaving in the gap: nothing starts, every player freed");
  }

  // The last verse ends: Play plays it again with a fresh player.
  {
    const r = rig(pages);
    await r.ctl.start(3); await flush();
    r.tick(r.players[0], 6.0, 6, true);
    check(!r.st.playing && r.timers.length === 0, "stops after the last verse");
    r.ctl.toggle(0); await flush();
    check(r.players.length === 2 && r.players[1].played === 1 && r.st.verse === 3 && r.st.playing, "Play after the end replays the last verse");
  }

  // A verse still loading when another begins stands down and frees its player.
  {
    const r = rig(pages);
    r.st.gated = true;
    const a = r.ctl.start(0); await flush();
    const b = r.ctl.start(2); await flush();
    check(r.players.length === 2, "both were created");
    r.gates[1](); r.gates[0](); await a; await b; await flush();
    check(r.players[0].removed && r.players[0].played === 0 && r.players[0].listener === null, "the overtaken verse is freed and never plays");
    check(r.players[1].played === 1 && r.st.verse === 2, "the newer verse plays");
  }

  // A verse with no chant is skipped; Follow off does not scroll; stop lets go.
  {
    const r = rig(pages);
    r.st.follow = false;
    await r.ctl.start(1); await flush();
    check(r.st.verse === 2 && r.players[0].url.endsWith("v2.m4a"), "a verse with no chant starts the next one");
    check(r.st.scrolls.length === 0, "Follow off: no scrolling");
    r.ctl.stop();
    check(!r.st.playing && r.st.verse === -1 && r.players[0].removed, "stop frees everything");
  }

  // From nothing, Play starts at the first chant from the page's verse; step goes on and back.
  {
    const r = rig(pages);
    r.ctl.toggle(1); await flush();
    check(r.st.verse === 2, "Play from nothing starts at the next chant");
    r.ctl.step(1, 0); await flush();
    check(r.st.verse === 3, "step forward");
    r.ctl.step(-1, 0); await flush();
    check(r.st.verse === 2, "step back");
  }
}

console.log(`\n  recite: ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
