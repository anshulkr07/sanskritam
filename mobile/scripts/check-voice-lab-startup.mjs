// Exercise the real hook with deterministic permissions, app lifecycle and transport.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");
const compiled = ts.transpileModule(fs.readFileSync(new URL("../src/voiceLab/useVoiceLab.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const tick = () => new Promise(resolve => setImmediate(resolve));
const inputModule = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL("../src/voiceLab/audioInput.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { exports: inputModule.exports });
function deferred() {
  let resolve, reject;
  const promise = new Promise((a, b) => { resolve = a; reject = b; });
  return { promise, resolve, reject };
}
function harness({ permission = async () => {}, ticket = async () => ({ ticket: "test" }), microphone, playback } = {}) {
  const slots = [], effects = [], timers = new Map(), sockets = [], audio = [], requests = [];
  let cursor = 0, timerId = 0, lifecycle, buffers, micStarts = 0, micStops = 0;
  const depsEqual = (a, b) => a && b && a.length === b.length && a.every((value, i) => value === b[i]);
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], value => { slots[index] = typeof value === "function" ? value(slots[index]) : value; }];
    },
    useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial }; },
    useCallback(callback, deps) {
      const index = cursor++;
      if (!depsEqual(slots[index]?.deps, deps)) slots[index] = { deps, callback };
      return slots[index].callback;
    },
    useEffect(effect, deps) {
      const index = cursor++;
      if (!depsEqual(slots[index]?.deps, deps)) {
        effects.push(() => { slots[index]?.cleanup?.(); slots[index] = { deps, cleanup: effect() }; });
      }
    },
  };
  class Socket {
    static OPEN = 1;
    readyState = 0;
    bufferedAmount = 0;
    messages = [];
    constructor(url) { this.url = url; sockets.push(this); }
    send(data) { this.messages.push(data); }
    close() { this.readyState = 3; this.onclose?.({ code: 1000 }); }
    open() { this.readyState = 1; this.onopen?.(); }
    message(data) { this.onmessage?.({ data: JSON.stringify(data) }); }
  }
  const appState = { currentState: "active", addEventListener: (_event, listener) => {
    lifecycle = listener;
    return { remove: () => { lifecycle = undefined; } };
  } };
  const mocks = {
    react,
    "react-native": { AppState: appState },
    "../api/client": { request: async (...args) => { requests.push(args); return ticket(...args); } },
    "../config": { BASE_URL: "http://localhost:8001" },
    "./audioInput": inputModule.exports,
    "./microphone": {
      microphonePermission: permission,
      startMicrophone: async onBuffer => {
        micStarts++; buffers = onBuffer;
        return microphone ? microphone(onBuffer) : { stop: () => { micStops++; } };
      },
    },
  };
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, require: name => { assert.ok(name in mocks, name); return mocks[name]; },
    WebSocket: Socket, AbortController, Error,
    setTimeout: (callback, ms) => { const id = ++timerId; timers.set(id, { callback, ms }); return id; },
    clearTimeout: id => timers.delete(id),
  });
  const sink = { current: { send: message => { audio.push(message); playback?.(message); } } };
  const config = { pipeline: 1, pitch: 0, loudness: 1 };
  function render() {
    cursor = 0;
    const lab = exports.useVoiceLab(config, sink);
    effects.splice(0).forEach(effect => effect());
    return lab;
  }
  render();
  return {
    render, sockets, audio, requests,
    lifecycle(value) { appState.currentState = value; lifecycle(value); },
    timeout() { assert.equal(timers.size, 1, "Startup must have a bounded wait"); const [id, timer] = [...timers][0]; timers.delete(id); timer.callback(); },
    echoCooldown() { const entry = [...timers].find(([, timer]) => timer.ms === 500); assert.ok(entry); timers.delete(entry[0]); entry[1].callback(); },
    fire(ms) { const entry = [...timers].find(([, timer]) => timer.ms === ms); assert.ok(entry); timers.delete(entry[0]); entry[1].callback(); },
    buffer: data => buffers(data),
    get micStarts() { return micStarts; }, get micStops() { return micStops; },
    get timers() { return timers.size; },
  };
}

// A native permission sheet sends inactive before resolving permission.
{
  const permission = deferred();
  const h = harness({ permission: () => permission.promise });
  const start = h.render().start();
  assert.equal(h.render().state, "connecting");
  h.lifecycle("inactive");
  assert.equal(h.render().state, "connecting", "A permission sheet must not cancel Start");
  h.lifecycle("active"); permission.resolve(); await start;
  assert.equal(h.requests.length, 1);
  h.sockets[0].open(); h.sockets[0].message({ type: "ready" }); await tick();
  assert.equal(h.render().state, "live");
  assert.equal(h.micStarts, 1);
  assert.equal(h.timers, 0);
  h.lifecycle("background");
  assert.equal(h.render().state, "idle");
  assert.equal(h.micStops, 1, "Backgrounding must release the microphone");
}
// Android permission activities may report background, then resolve before resume.
{
  const permission = deferred();
  const h = harness({ permission: () => permission.promise });
  const start = h.render().start(); h.lifecycle("background");
  assert.equal(h.render().state, "connecting", "Android permission UI must not cancel startup");
  permission.resolve(); await tick();
  assert.equal(h.requests.length, 0, "Do not connect while the permission activity is in front");
  assert.match(h.render().connectionStatus, /Return to the app/);
  h.lifecycle("active"); await start;
  assert.equal(h.requests.length, 1);
  h.sockets[0].open(); h.sockets[0].message({ type: "ready" }); await tick();
  assert.equal(h.render().state, "live");
  h.lifecycle("background"); assert.equal(h.render().state, "idle");
  assert.equal(h.micStops, 1);
}
// Cancelling or timing out while waiting for Android resume must release the wait.
for (const action of ["cancel", "timeout"]) {
  const permission = deferred();
  const h = harness({ permission: () => permission.promise });
  const start = h.render().start(); h.lifecycle("background");
  permission.resolve(); await tick();
  if (action === "cancel") h.render().stop(); else h.timeout();
  await start; h.lifecycle("active"); await tick();
  assert.equal(h.requests.length, 0); assert.equal(h.render().state, "idle");
  await h.render().start(); assert.equal(h.requests.length, 1); h.render().stop();
}
// Multiple presses during permission must not launch duplicate requests/sockets.
{
  const permission = deferred();
  const h = harness({ permission: () => permission.promise });
  const first = h.render().start(); const second = h.render().start();
  permission.resolve(); await Promise.all([first, second]);
  assert.equal(h.requests.length, 1); assert.equal(h.sockets.length, 1);
  h.render().stop();
}
// Playback initialization failures must be surfaced, including cleanup failures.
{
  const h = harness({ playback: message => { if (message.type !== "settings") throw new Error("Audio unavailable"); } });
  await h.render().start();
  assert.equal(h.render().state, "idle");
  assert.match(h.render().error, /Audio unavailable/);
}
// Stalled authentication must time out, abort the HTTP request and allow retry.
{
  const ticket = deferred(); const h = harness({ ticket: () => ticket.promise });
  const start = h.render().start(); await tick();
  h.timeout();
  assert.equal(h.render().state, "idle"); assert.match(h.render().error, /too long/i);
  assert.equal(h.requests[0][1].signal.aborted, true);
  ticket.resolve({ ticket: "late" }); await start;
  assert.equal(h.sockets.length, 0, "Cancelled authentication must not open a socket");
  await h.render().start(); assert.equal(h.sockets.length, 1); h.render().stop();
}
// A socket that opens but never receives provider readiness must also time out.
{
  const h = harness(); await h.render().start(); h.sockets[0].open(); h.timeout();
  assert.equal(h.render().state, "idle"); assert.match(h.render().error, /too long/i);
  assert.equal(h.sockets[0].readyState, 3);
}
// Cancel while the socket is opening: a late open must not send credentials.
{
  const h = harness(); await h.render().start(); h.render().stop(); h.sockets[0].open();
  assert.equal(h.sockets[0].messages.length, 0);
}
// Pending microphone startup must release late resources and send no late audio.
{
  const mic = deferred(); let stopped = 0;
  const h = harness({ microphone: () => mic.promise });
  await h.render().start(); h.sockets[0].open();
  h.sockets[0].message({ type: "ready" }); h.sockets[0].message({ type: "ready" });
  assert.equal(h.micStarts, 1, "Duplicate readiness must not acquire two microphones");
  h.render().stop(); h.sockets[0].readyState = 1;
  const count = h.sockets[0].messages.length;
  h.buffer({ data: new ArrayBuffer(320), channels: 1, sampleRate: 16000 });
  assert.equal(h.sockets[0].messages.length, count);
  mic.resolve({ stop: () => { stopped++; } }); await tick();
  assert.equal(stopped, 1); assert.equal(h.render().state, "idle");
}
// Provider and microphone errors must retain their actual reason after close.
{
  const h = harness(); await h.render().start(); h.sockets[0].open();
  h.sockets[0].message({ type: "fatal", message: "Provider quota exhausted" });
  assert.equal(h.render().error, "Provider quota exhausted"); assert.equal(h.render().state, "idle");
  const m = harness({ microphone: async () => { throw new Error("Microphone is busy"); } });
  await m.render().start(); m.sockets[0].open(); m.sockets[0].message({ type: "ready" }); await tick();
  assert.match(m.render().error, /Microphone is busy/); assert.equal(m.render().state, "idle");
}
console.log("Voice Lab startup: permission focus, cancellation, timeouts, retry, errors and resource cleanup passed.");

// Older installed native builds must explain that live PCM capture needs a build.
{
  const microphoneSource = fs.readFileSync(new URL("../src/voiceLab/microphone.ts", import.meta.url), "utf8");
  const code = ts.transpileModule(microphoneSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {}; let permissionRequests = 0;
  const native = { AudioModule: {}, requestRecordingPermissionsAsync: async () => { permissionRequests++; return { granted: true }; } };
  vm.runInNewContext(code, { exports, require: name => {
    if (name === "./callAudio") return { startCallAudio: async () => () => {} };
    assert.equal(name, "expo-audio"); return native;
  }, Error });
  await assert.rejects(exports.microphonePermission(), /Install a new app build/);
  assert.equal(permissionRequests, 0);
  native.AudioModule.AudioStream = function () {};
  await exports.microphonePermission(); assert.equal(permissionRequests, 1);
}
console.log("Android voice startup: permission activity/resume, cancellation and native build capability checks passed.");

// Speaker output, queued decode and echo tail must never go back into STT.
{
  const h = harness(); await h.render().start(); h.sockets[0].open();
  h.sockets[0].message({ type: "ready", capabilities: { playback_feedback: true } }); await tick();
  const speech = new Int16Array(1600).fill(5000);
  const buffer = { data: speech.buffer, channels: 1, sampleRate: 16000 };
  h.buffer(buffer);
  assert.ok(new Int16Array(h.sockets[0].messages.at(-1)).some(value => value));
  h.sockets[0].message({ type: "audio", codec: "pcm", data: "AAAA" });
  assert.ok(h.sockets[0].messages.some(value => typeof value === "string" && JSON.parse(value).type === "playback" && JSON.parse(value).busy === true));
  const beforeEcho = h.sockets[0].messages.length;
  h.buffer(buffer);
  assert.equal(h.sockets[0].messages.length, beforeEcho, "Never stream or charge speaker echo/silence");
  h.sockets[0].message({ type: "turn_complete" }); h.buffer(buffer);
  assert.equal(h.sockets[0].messages.length, beforeEcho, "Server completion precedes playback completion");
  h.render().onPlaybackBusy(false); h.buffer(buffer);
  assert.equal(h.sockets[0].messages.length, beforeEcho, "Keep the mic gated through the echo tail");
  h.echoCooldown(); h.buffer(buffer);
  assert.ok(h.sockets[0].messages.some(value => typeof value === "string" && JSON.parse(value).type === "playback" && JSON.parse(value).busy === false));
  assert.ok(new Int16Array(h.sockets[0].messages.at(-1)).some(value => value), "Resume real input after playback and echo tail");
  h.render().stop();
}
// Short speech followed by a quiet pause sends exactly one finalization signal.
{
  const h = harness(); await h.render().start(); h.sockets[0].open(); h.sockets[0].message({ type: "ready" }); await tick();
  const frame = data => ({ data: data.buffer, sampleRate: 16000, channels: 1 });
  for (let i = 0; i < 3; i++) h.buffer(frame(new Int16Array(1600).fill(4000)));
  for (let i = 0; i < 12; i++) h.buffer(frame(new Int16Array(1600)));
  assert.equal(h.sockets[0].messages.filter(value => typeof value === "string" && JSON.parse(value).type === "end_audio").length, 1);
  h.render().stop();
}
console.log("Voice input: automatic turn finalization, speaker echo suppression, playback drain and echo-tail recovery passed.");

// Natural barge-in survives repeated playback packets and preserves opening words.
{
  const h = harness(); await h.render().start(); h.sockets[0].open();
  h.sockets[0].message({ type: "ready", capabilities: { playback_feedback: true, barge_in: true } }); await tick();
  const data = Int16Array.from({ length: 1600 }, (_, i) => Math.round(4000 * Math.sin(i * Math.PI / 20))).buffer;
  const voice = { data, sampleRate: 16000, channels: 1, echoCancelled: true };
  for (let i = 0; i < 3; i++) {
    h.sockets[0].message({ type: "audio", codec: "pcm", data: "AAAA" });
    h.buffer(voice);
  }
  assert.equal(h.sockets[0].messages.filter(value => typeof value === "string" && JSON.parse(value).type === "barge_in").length, 0);
  h.buffer(voice);
  assert.equal(h.sockets[0].messages.filter(value => typeof value === "string" && JSON.parse(value).type === "barge_in").length, 1);
  assert.equal(h.audio.at(-1).type, "stop");
  const played = h.audio.filter(command => command.type === "audio").length;
  h.sockets[0].message({ type: "audio", codec: "pcm", data: "AAAA" });
  assert.equal(h.audio.filter(command => command.type === "audio").length, played, "Discard late audio from the cancelled reply");
  h.render().onPlaybackBusy(true); // stale WebView event must not re-gate capture
  h.buffer(voice);
  h.sockets[0].message({ type: "barge_in_ready" });
  const held = h.sockets[0].messages.filter(value => typeof value !== "string").slice(-5);
  assert.equal(held.length, 5);
  assert.ok(held.every(frame => new Int16Array(frame).some(value => value)), "Keep the opening speech while awaiting cancellation");
  h.sockets[0].message({ type: "audio", codec: "pcm", data: "AAAA" });
  assert.equal(h.audio.filter(command => command.type === "audio").length, played);
  h.sockets[0].message({ type: "response_started" });
  h.sockets[0].message({ type: "audio", codec: "pcm", data: "AAAA" });
  assert.equal(h.audio.at(-1).type, "audio", "The next reply must play normally");
  h.render().stop();
}
console.log("Natural interruption: sustained speech, immediate playback stop, provider acknowledgement, pre-roll and stale-audio rejection passed.");

// A failed acknowledgement cannot trap the microphone indefinitely, and old
// response headers cannot revive audio while cancellation is pending.
{
  const h = harness(); await h.render().start(); h.sockets[0].open();
  h.sockets[0].message({ type: "ready", capabilities: { barge_in: true } }); await tick();
  h.sockets[0].message({ type: "response_started" });
  h.sockets[0].message({ type: "audio", codec: "pcm", data: "AAAA" });
  h.render().interrupt();
  assert.equal(h.audio.at(-1).type, "stop");
  const before = h.audio.length;
  h.sockets[0].message({ type: "response_started" });
  h.sockets[0].message({ type: "audio", codec: "pcm", data: "AAAA" });
  assert.equal(h.audio.length, before);
  h.fire(5000);
  assert.equal(h.render().state, "idle");
  assert.match(h.render().error, /did not resume listening/);
}
// Recoverable server errors return to listening and clear the response wait.
{
  const h = harness(); await h.render().start(); h.sockets[0].open();
  h.sockets[0].message({ type: "ready" }); await tick();
  h.sockets[0].message({ type: "response_started" });
  h.sockets[0].message({ type: "error", message: "Please say it again" });
  assert.equal(h.render().thinking, false);
  assert.equal(h.timers, 0);
  h.buffer({ data: new Int16Array(1600).fill(4000).buffer, sampleRate: 16000, channels: 1 });
  assert.ok(new Int16Array(h.sockets[0].messages.at(-1)).some(value => value));
  h.render().stop();
}
console.log("Voice recovery: cancellation deadline, stale response headers and recoverable errors passed.");
