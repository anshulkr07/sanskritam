// Playback invariants without native audio or provider calls.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");
function resolveVoice(file) {
  const local = new URL(file, import.meta.url);
  if (fs.existsSync(local)) return local;
  const deferred = new URL(`../../deferred/mobile/${file.replace(/^\.\.\//, "")}`, import.meta.url);
  if (fs.existsSync(deferred)) return deferred;
  return null;
}
const audioRuntimeFile = resolveVoice("../src/voiceLab/audioRuntime.ts");
if (!audioRuntimeFile) {
  console.log("Voice module not present (deferred); skipping voice lab playback check.");
  process.exit(0);
}
const source = fs.readFileSync(audioRuntimeFile, "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const module = { exports: {} };
vm.runInNewContext(compiled, { exports: module.exports });
const html = module.exports.AUDIO_HTML;
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const scheduled = [], errors = [], playback = [];
let finishDecode;
const context = {
  currentTime: 1, destination: {},
  resume: async () => {},
  createGain: () => ({ gain: { value: 1 }, connect() {} }),
  createBuffer: (_channels, samples, rate) => ({ duration: samples / rate, getChannelData: () => new Float32Array(samples) }),
  decodeAudioData: () => new Promise(resolve => { finishDecode = () => resolve({ duration: 1 }); }),
  createBufferSource: () => {
    const s = { detune: { value: 0 }, connect() {}, start(at) { this.at = at; scheduled.push(this); }, stop() { this.stopped = true; } };
    return s;
  },
};
const window = { AudioContext: function () { return context; }, addEventListener() {}, ReactNativeWebView: { postMessage: raw => {
  const message = JSON.parse(raw);
  if (message.error) errors.push(message.error);
  if (typeof message.voiceLabPlaybackBusy === "boolean") playback.push(message.voiceLabPlaybackBusy);
} } };
vm.runInNewContext(script, { window, parent: {}, atob: data => Buffer.from(data, "base64").toString("binary"), Uint8Array, DataView, Set, Promise, Math, Error });
const command = window.voiceLabCommand;
const tick = () => new Promise(resolve => setImmediate(resolve));
const pcm = Buffer.alloc(4800).toString("base64"); // 100 ms @24kHz
command({ type: "settings", pitch: 12, loudness: 1.5 });
command({ type: "audio", codec: "pcm", data: pcm, sample_rate: 24000 });
command({ type: "audio", codec: "pcm", data: pcm, sample_rate: 24000 });
await tick();
assert.equal(scheduled.length, 2);
assert.deepEqual(playback, [true], "Mic must pause as soon as audio is queued, and stay paused during playback");
assert.equal(scheduled[0].detune.value, 1200);
assert.ok(Math.abs(scheduled[1].at - scheduled[0].at - 0.05) < 1e-9, "Scheduling must account for detune duration");
command({ type: "stop" });
assert.ok(scheduled.every(s => s.stopped), "Interrupt must stop scheduled audio");
assert.equal(playback.at(-1), false, "Stopping playback must release its busy state");
command({ type: "audio", codec: "wav", data: "AAAA" });
await tick();
assert.ok(finishDecode);
command({ type: "stop" });
finishDecode();
await tick();
assert.equal(scheduled.length, 2, "An interrupted asynchronous decode must never schedule audio");
command({ type: "settings", pitch: 0, loudness: 1 });
command({ type: "audio", codec: "pcm", data: pcm, sample_rate: 24000 });
await tick();
assert.equal(scheduled.length, 3, "Playback must recover after interruption");
assert.equal(playback.at(-1), true);
scheduled[0].onended();
assert.equal(playback.at(-1), true, "An old source ending must not release the current reply");
scheduled[2].onended();
assert.equal(playback.at(-1), false, "Release mic only after the last scheduled source actually ends");
assert.equal(errors.length, 0);
// Providers can generate a complete reply much faster than it is spoken.
// Keep the whole sentence/reply, but schedule only a short horizon at a time.
command({ type: "stop" });
const firstLong = scheduled.length;
const longPcm = Buffer.alloc(24000 * 2 * 3).toString("base64");
for (let i = 0; i < 10; i++) command({ type: "audio", codec: "pcm", data: longPcm, sample_rate: 24000 });
await tick();
assert.equal(errors.length, 0, "Fast delivery of a 30-second reply must not truncate it");
assert.ok(scheduled.length - firstLong < 10, "Do not schedule the whole backlog in the audio graph");
for (let i = 0; i < 10; i++) {
  await tick();
  const source = scheduled[firstLong + i];
  assert.ok(source, `Audio packet ${i + 1} must eventually play`);
  context.currentTime = source.at + 3;
  source.onended();
}
await tick();
assert.equal(scheduled.length - firstLong, 10, "Play every packet through the end of the reply");
assert.equal(playback.at(-1), false);
assert.equal(errors.length, 0);
// Interrupt also wakes a decoder waiting for scheduling room.
command({ type: "stop" });
const beforeCancel = scheduled.length;
for (let i = 0; i < 4; i++) command({ type: "audio", codec: "pcm", data: longPcm, sample_rate: 24000 });
await tick();
command({ type: "stop" });
await tick();
assert.equal(scheduled.length, beforeCancel + 2, "Cancelled waiting packets must never schedule");
console.log("Voice Lab playback: scheduling, interruption, decode cancellation and recovery passed.");
