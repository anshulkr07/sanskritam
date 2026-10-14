// Playback invariants without native audio or provider calls.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");
const source = fs.readFileSync(new URL("../src/voiceLab/audioRuntime.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const module = { exports: {} };
vm.runInNewContext(compiled, { exports: module.exports });
const html = module.exports.AUDIO_HTML;
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const scheduled = [], errors = [];
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
const window = { AudioContext: function () { return context; }, addEventListener() {}, ReactNativeWebView: { postMessage: raw => errors.push(JSON.parse(raw)) } };
vm.runInNewContext(script, { window, parent: {}, atob: data => Buffer.from(data, "base64").toString("binary"), Uint8Array, DataView, Set, Promise, Math, Error });
const command = window.voiceLabCommand;
const tick = () => new Promise(resolve => setImmediate(resolve));
const pcm = Buffer.alloc(4800).toString("base64"); // 100 ms @24kHz
command({ type: "settings", pitch: 12, loudness: 1.5 });
command({ type: "audio", codec: "pcm", data: pcm, sample_rate: 24000 });
command({ type: "audio", codec: "pcm", data: pcm, sample_rate: 24000 });
await tick();
assert.equal(scheduled.length, 2);
assert.equal(scheduled[0].detune.value, 1200);
assert.ok(Math.abs(scheduled[1].at - scheduled[0].at - 0.05) < 1e-9, "Scheduling must account for detune duration");
command({ type: "stop" });
assert.ok(scheduled.every(s => s.stopped), "Interrupt must stop scheduled audio");
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
assert.equal(errors.length, 0);
console.log("Voice Lab playback: scheduling, interruption, decode cancellation and recovery passed.");
