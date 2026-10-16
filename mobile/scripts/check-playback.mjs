#!/usr/bin/env node
// Run with: node scripts/check-playback.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");
const players = [];
const timers = [];
let modeGate = Promise.resolve();
let ttsGate = Promise.resolve({ audio_base64: "sample", duration_hint: 12 });
let ttsCalls = 0;
let modeCalls = 0;
const preloads = [];
const clearedSources = [];
const modules = {
  "expo-audio": {
    setAudioModeAsync: () => { modeCalls++; return modeGate; },
    preload: async (src) => { preloads.push(src); },
    clearPreloadedSource: async (src) => { clearedSources.push(src); },
    createAudioPlayer(src) {
      const player = {
        src, playing: false, removed: false, listener: null, listeners: new Set(), lock: [],
        setActiveForLockScreen(active, metadata) { this.lock.push([active, metadata]); },
        replace(source) { this.src = source; },
        play() { this.playing = true; },
        pause() { this.playing = false; },
        remove() { this.removed = true; },
        addListener(_event, cb) {
          this.listeners.add(cb); this.listener = cb;
          return { remove: () => { this.listeners.delete(cb); this.listener = [...this.listeners].at(-1) ?? null; } };
        },
        tick(status) { for (const cb of [...this.listeners]) cb(status); },
      };
      players.push(player);
      return player;
    },
  },
  "react-native": { Platform: { OS: "ios" } },
  "../config": { BASE_URL: "https://test.invalid" },
  "../api/client": { api: { tts() { ttsCalls++; return ttsGate; } } },
};
function load(file) {
  const js = ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", "setTimeout", "clearTimeout", js)(
    (spec) => { assert.ok(spec in modules, `Unexpected import: ${spec}`); return modules[spec]; },
    module, module.exports,
    (fn, ms) => { const timer = { fn, ms, cleared: false }; timers.push(timer); return timer; },
    (timer) => { timer.cleared = true; },
  );
  return module.exports;
}
const { SinglePlayback } = load("../src/services/singlePlayback.ts");
modules["./ttsAudioCache"] = load("../src/services/ttsAudioCache.ts");
modules["./audioTransport"] = load("../src/services/audioTransport.ts");
modules["./offlineBooks"] = { offlineAudioUrl: url => url };
modules["./managedAudio"] = load("../src/services/managedAudio.ts");
const { TtsAudioCache } = modules["./ttsAudioCache"];
const speech = load("../src/services/speech.ts");
const { audioTransport } = modules["./audioTransport"];
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
};
const flush = async () => { for (let i = 0; i < 16; i++) await Promise.resolve(); };
const finish = (p) => p.tick({ isLoaded: true, playing: false, currentTime: 20, duration: 20, didJustFinish: true });
assert.equal(speech.bulbulLangCode("sa"), "sa-IN");
assert.equal(speech.bulbulLangCode("sa-IN"), "sa-IN");
assert.equal(speech.bulbulLangCode("kn-IN"), "kn-IN");
assert.equal(speech.bulbulLangCode("od-IN"), "od-IN");

// Every game route blocks accidental TTS without synthesizing or hanging callers.
for (const route of ["Smriti", "ShabdaRush", "VarnaJaal", "WordGroups", "PadaPath", "NumberBuilder", "RoomLobby"]) {
  speech.setSpeechRoute(route);
  const before = ttsCalls;
  let completed = false;
  const handle = await speech.speak("रामः", "sa", 1, () => { completed = true; });
  await flush();
  assert.equal(ttsCalls, before, `${route} must not request TTS`);
  assert.equal(completed, true);
  await handle.stop();
}
speech.setSpeechRoute("Home");

// The app-wide transport preserves a paused source, minimizes independently,
// hands focus to new audio, and ignores late completion from the old source.
{
  const { createManagedAudioPlayer } = modules["./managedAudio"];
  const first = createManagedAudioPlayer("first.wav", undefined, "First");
  first.play();
  assert.equal(players.at(-1).lock.at(-1)[0], true, "Playback registers Android media controls before starting");
  assert.equal(audioTransport.getSnapshot().kind, "audio", "Ordinary audio does not opt in to the floater");
  const oldId = audioTransport.getSnapshot().id;
  audioTransport.toggle();
  assert.equal(audioTransport.getSnapshot().playing, false);
  assert.equal(players.at(-1).playing, false);
  audioTransport.minimize();
  assert.equal(audioTransport.getSnapshot().minimized, true);
  audioTransport.toggle();
  assert.equal(players.at(-1).playing, true);
  const second = createManagedAudioPlayer("second.wav", undefined, "Second", true, "audiobook");
  second.play();
  assert.equal(audioTransport.getSnapshot().kind, "audiobook", "Audiobooks opt in to the floater");
  assert.equal(players.at(-2).lock.at(-1)[0], false, "Focus handoff unregisters old media controls");
  audioTransport.release(oldId);
  assert.equal(audioTransport.getSnapshot().title, "Second");
  first.remove();
  assert.equal(audioTransport.getSnapshot().title, "Second");
  second.remove();
  assert.equal(audioTransport.getSnapshot(), null);
  const voiceId = audioTransport.claim("Voice companion", { play() {}, pause() {} });
  assert.equal(audioTransport.getSnapshot().kind, "audio", "Direct voice/video sources do not opt in to the floater");
  audioTransport.release(voiceId);
  players.length = 0;
}

// Four taps before native mode setup completes produce one player; taps during
// audible playback remain guarded until the actual completion event.
{
  const gate = deferred();
  modeGate = gate.promise;
  const playback = new SinglePlayback();
  const first = playback.play((done) => speech.playClip("/verse.m4a", done));
  for (let i = 0; i < 3; i++) await playback.play((done) => speech.playClip("/verse.m4a", done));
  assert.equal(playback.busy, true);
  assert.equal(players.length, 0);
  gate.resolve();
  await flush();
  assert.equal(players.length, 1);
  assert.equal(players[0].playing, true);
  await playback.play((done) => speech.playClip("/verse.m4a", done));
  assert.equal(players.length, 1);
  assert.equal(playback.busy, true);
  players[0].tick({ isLoaded: true, playing: true, currentTime: 1, duration: 20, didJustFinish: false });
  assert.equal(timers.at(-1).ms, 22_000, "backstop uses the actual remaining duration");
  finish(players[0]);
  await first;
  assert.equal(playback.busy, false);
  assert.equal(players[0].removed, true);
  assert.equal(players[0].listener, null);
}

// The same guard covers live TTS latency without duplicate synthesis requests.
{
  modeGate = Promise.resolve();
  const gate = deferred();
  ttsGate = gate.promise;
  const playback = new SinglePlayback();
  const first = playback.play((done) => speech.speak("A verse without a recording", "sa", 1, done));
  await flush();
  for (let i = 0; i < 3; i++) await playback.play((done) => speech.speak("A verse without a recording", "sa", 1, done));
  assert.equal(ttsCalls, 1);
  gate.resolve({ audio_base64: "sample", duration_hint: 12 });
  await flush();
  finish(players.at(-1));
  await first;
  assert.equal(playback.busy, false);
}

// Other consumers of speech playback also cannot leave an overlapping player.
{
  let completions = 0;
  const a = await speech.playClip("/a.m4a", () => completions++);
  const old = players.at(-1);
  const b = await speech.playClip("/b.m4a");
  assert.equal(old.playing, false);
  assert.equal(old.removed, true);
  assert.equal(completions, 1);
  await a.stop();
  assert.equal(players.at(-1).playing, true, "an old handle cannot stop its replacement");
  await b.stop();
  assert.ok(players.every((p) => p.removed));
}

// Cancellation while loading frees a late handle. An old completion cannot
// unlock a new session, and a failed request allows a retry.
{
  const playback = new SinglePlayback();
  const gate = deferred();
  let oldDone;
  let stops = 0;
  const pending = playback.play((done) => { oldDone = done; return gate.promise; });
  playback.stop();
  let newDone;
  const next = playback.play(async (done) => { newDone = done; return { stop: async () => {} }; });
  oldDone();
  assert.equal(playback.busy, true);
  gate.resolve({ stop: async () => { stops++; } });
  await pending;
  assert.equal(stops, 1);
  newDone();
  await next;
  await assert.rejects(playback.play(async () => { throw new Error("offline"); }), /offline/);
  assert.equal(playback.busy, false);
  await playback.play(async () => null);
  assert.equal(playback.busy, false);
  await playback.play(async (done) => { done(); return { stop: async () => { stops++; } }; });
  assert.equal(stops, 2, "completion before handle arrival still releases the handle");
}

assert.ok(timers.every((t) => t.cleared), "no playback timer leaks");

// A screen leaving during either mode setup or TTS suppresses player creation.
for (const tts of [false, true]) {
  const playback = new SinglePlayback();
  const gate = deferred();
  const before = players.length;
  if (tts) ttsGate = gate.promise;
  else modeGate = gate.promise;
  const pending = playback.play((done, signal) => tts
    ? speech.speak("A cancelled verse with no recording", "sa", 1, done, undefined, signal)
    : speech.playClip("/cancelled.m4a", done, signal));
  await flush();
  playback.stop();
  gate.resolve({ audio_base64: "sample", duration_hint: 12 });
  await pending;
  modeGate = Promise.resolve();
  assert.equal(players.length, before, "cancelled loading cannot create a player");
  assert.equal(playback.busy, false);
}

// A long verse is now cached on replay too, rather than only short words.
{
  const before = ttsCalls;
  const handle = await speech.speak("A verse without a recording", "sa");
  assert.equal(ttsCalls, before, "verse replay avoids the server entirely");
  await handle.stop();
}

// Mode setup and synthesis run concurrently. Tutor fallback sets mode once.
{
  const gate = deferred();
  modeGate = gate.promise;
  const before = ttsCalls;
  const beforeMode = modeCalls;
  ttsGate = Promise.resolve({ audio_base64: "parallel", duration_hint: 12 });
  const playback = speech.playTutorAudio("", "A fresh tutor line", "sa");
  await flush();
  assert.equal(ttsCalls, before + 1, "synthesis starts before mode setup finishes");
  gate.resolve();
  const handle = await playback;
  assert.equal(modeCalls, beforeMode + 1);
  await handle.stop();
  modeGate = Promise.resolve();
}

// Prewarming downloads recordings without creating or playing extra players.
{
  const before = players.length;
  await Promise.all([speech.preloadClip("/warm.m4a"), speech.preloadClip("/warm.m4a")]);
  assert.equal(preloads.filter((s) => s.endsWith("/warm.m4a")).length, 1);
  assert.equal(players.length, before);
  const handle = await speech.playClip("/warm.m4a");
  await handle.stop();
  await speech.preloadClip("/warm.m4a");
  assert.equal(preloads.filter((s) => s.endsWith("/warm.m4a")).length, 2, "iOS consumed source can be warmed again");
  for (const name of ["b", "c", "d"]) await speech.preloadClip(`/${name}.m4a`);
  await flush();
  assert.ok(clearedSources.some((s) => s.endsWith("/warm.m4a")), "old native buffers are released");
}

// In-flight dedupe, failure recovery, voice keys, and bounded LRU retention.
{
  const cache = new TtsAudioCache(100, 3);
  const gate = deferred();
  let requests = 0;
  const fetcher = () => { requests++; return gate.promise; };
  const first = cache.get("verse", fetcher);
  const second = cache.get("verse", fetcher);
  await flush();
  assert.equal(requests, 1);
  gate.resolve({ audio_base64: "x".repeat(20) });
  assert.deepEqual(await first, await second);
  await cache.get("verse", fetcher);
  assert.equal(requests, 1);
  for (const key of ["other-voice", "other-pace"]) await cache.get(key, async () => ({ audio_base64: "x".repeat(20) }));
  await cache.get("verse", fetcher); // make the verse most recently used
  await cache.get("new", async () => ({ audio_base64: "x".repeat(20) }));
  await cache.get("other-voice", async () => { requests++; return { audio_base64: "x".repeat(20) }; });
  assert.equal(requests, 2, "least recently used entry is evicted");
  await assert.rejects(cache.get("failure", async () => { throw new Error("offline"); }));
  await cache.get("failure", async () => ({ audio_base64: "ok" }));
  for (let i = 0; i < 2; i++) await cache.get("large", async () => {
    requests++; return { audio_base64: "x".repeat(26) };
  });
  assert.equal(requests, 4, "oversized responses are playable but not retained");

  const bySize = new TtsAudioCache(100, 80);
  for (let i = 0; i < 10; i++) await bySize.get(`${i}`, async () => ({ audio_base64: "x".repeat(20) }));
  let misses = 0;
  const missing = async () => { misses++; return { audio_base64: "x".repeat(20) }; };
  await bySize.get("9", missing);
  assert.equal(misses, 0, "newest audio is retained");
  await bySize.get("0", missing);
  assert.equal(misses, 1, "encoded audio size evicts old entries before entry-count cap");
}
console.log("Playback regression checks passed.");
