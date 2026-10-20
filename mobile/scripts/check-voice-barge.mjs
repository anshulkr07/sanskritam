import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");
const exports = {};
function resolveVoice(file) {
  const local = new URL(file, import.meta.url);
  if (fs.existsSync(local)) return local;
  const deferred = new URL(`../../deferred/mobile/${file.replace(/^\.\.\//, "")}`, import.meta.url);
  if (fs.existsSync(deferred)) return deferred;
  return null;
}
const audioInputFile = resolveVoice("../src/voiceLab/audioInput.ts");
if (!audioInputFile) {
  console.log("Voice module not present (deferred); skipping voice barge check.");
  process.exit(0);
}
vm.runInNewContext(ts.transpileModule(fs.readFileSync(audioInputFile, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { exports });
const frame = (amplitude, echoCancelled = true) => ({
  data: Int16Array.from({ length: 1600 }, (_, i) => Math.round(amplitude * Math.sin(i * Math.PI / 20))).buffer,
  sampleRate: 16000, channels: 1, echoCancelled,
});
// Loud brief sounds and separated noises never accumulate into an interruption.
const short = new exports.VoiceInput();
for (let i = 0; i < 2; i++) assert.equal(short.process(frame(12000), true).bargeIn, null);
for (let i = 0; i < 4; i++) assert.equal(short.process(frame(0), true).bargeIn, null);
for (let i = 0; i < 3; i++) assert.equal(short.process(frame(4000), true).bargeIn, null);
// Sustained speech qualifies after 350ms; raw opening words are retained.
const speech = new exports.VoiceInput();
for (let i = 0; i < 3; i++) {
  const result = speech.process(frame(4000), true);
  assert.equal(result.bargeIn, null);
  assert.ok(result.level > 0, "An active microphone must remain visible while AI audio plays");
  assert.ok(new Int16Array(result.pcm).every(value => value === 0));
}
const result = speech.process(frame(4000), true);
assert.equal(result.bargeIn.length, 4);
assert.ok(result.bargeIn.every(data => new Int16Array(data).some(value => value !== 0)));
// Unprocessed loudspeaker echo cannot enable automatic interruption.
const unsafe = new exports.VoiceInput();
for (let i = 0; i < 50; i++) assert.equal(unsafe.process(frame(8000, false), true).bargeIn, null);
const residual = new exports.VoiceInput();
for (let i = 0; i < 50; i++) assert.equal(residual.process(frame(150), true).bargeIn, null);
// Check native patch against the exact installed SDK without modifying it.
const { patchStream, patchRecords } = require("../plugins/withVoiceEchoCancellation.js");
const root = new URL("../node_modules/expo-audio/android/src/main/java/expo/modules/audio/", import.meta.url);
const source = fs.readFileSync(new URL("AudioStream.kt", root), "utf8").replace(/\r\n/g, "\n");
const patched = patchStream(source);
assert.equal(patchStream(patched), patched, "The native patch must be idempotent");
assert.ok(patched.includes("options.echoCancellation) MediaRecorder.AudioSource.VOICE_COMMUNICATION else MediaRecorder.AudioSource.MIC"));
assert.ok(patched.includes('"echoCancelled" to echoCancellationEnabled'));
assert.ok(patched.includes("configureProcessing(recorder.audioSessionId)"));
assert.ok(patched.includes("echoCanceler?.setEnabled(true)"));
const records = patchRecords(fs.readFileSync(new URL("AudioRecords.kt", root), "utf8"));
assert.equal(patchRecords(records), records);
assert.ok(records.includes("echoCancellation: Boolean = false"), "Other capture callers retain their original behavior");
assert.throws(() => patchStream("changed SDK source"), /does not match/);
console.log("Voice barge-in: transient noise rejection, 350ms speech, pre-roll, echo capability guard and Android patch checks passed.");
