// Exercise the actual native microphone wrapper with an asynchronous Android
// audio route. A recorder must never be created in the media-mode race window.
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
const callAudioFile = resolveVoice("../src/voiceLab/callAudio.ts");
const micFile = resolveVoice("../src/voiceLab/microphone.ts");
if (!callAudioFile || !micFile) {
  console.log("Voice module not present (deferred); skipping voice call audio check.");
  process.exit(0);
}
const compile = file => ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const callCode = compile(callAudioFile);
const micCode = compile(micFile);

function harness({ activate = true, failCapture = false, platform = "android" } = {}) {
  const events = [];
  let mode = "MODE_NORMAL", polls = 0, listener;
  const manager = {
    setAudioRole(role) { events.push(`role:${role}`); },
    setDefaultAudioDeviceEndpointType(route) { events.push(`route:${route}`); },
    start() { events.push("call:start"); },
    stop() { events.push("call:stop"); mode = "MODE_NORMAL"; },
    getAudioStateLog() {
      if (++polls >= 3 && activate) mode = "MODE_IN_COMMUNICATION";
      return `Audio State: audio mode: ${mode}, has mic: true`;
    },
  };
  const callExports = {};
  vm.runInNewContext(callCode, { exports: callExports, require: () => ({ Platform: { OS: platform }, NativeModules: { StreamInCallManager: manager } }), setTimeout: fn => queueMicrotask(fn), Error });
  const audio = {
    AudioModule: { AudioStream: class {
      constructor(options) {
        assert.equal(mode, "MODE_IN_COMMUNICATION", "Call routing must activate before AudioRecord and AEC are created");
        assert.equal(options.echoCancellation, true); events.push("mic:create");
      }
      addListener(name, fn) { listener = fn; return { remove() { events.push("mic:unlisten"); } }; }
      async start() { events.push("mic:start"); if (failCapture) throw new Error("Capture failed"); }
      stop() { events.push("mic:stop"); }
      release() { events.push("mic:release"); }
    } },
    async setAudioModeAsync(options) { mode = "MODE_NORMAL"; events.push(options.allowsRecording ? "expo:record" : "expo:restore"); },
    async requestRecordingPermissionsAsync() { return { granted: true }; },
  };
  const micExports = {};
  vm.runInNewContext(micCode, { exports: micExports, require: name => name === "expo-audio" ? audio : name === "react-native" ? { Platform: { OS: platform } } : callExports, Error });
  const sink = { startCapture: async callback => {
    assert.equal(mode, "MODE_IN_COMMUNICATION", "Call routing must activate before processed capture");
    events.push("duplex:start"); listener = callback;
    if (failCapture) throw new Error("Capture failed");
    return { stop() { events.push("duplex:stop"); } };
  } };
  return { events, manager, callExports, start: (callback, suppliedSink = sink) => micExports.startMicrophone(callback, suppliedSink), emit: data => listener(data) };
}

{
  const h = harness(), buffers = [];
  const mic = await h.start(buffer => buffers.push(buffer));
  assert.deepEqual(h.events, ["expo:record", "role:communicator", "route:speaker", "call:start", "duplex:start"]);
  h.emit({ data: new ArrayBuffer(3200), sampleRate: 16000, channels: 1, echoCancelled: true });
  assert.equal(buffers[0].echoCancelled, true);
  mic.stop(); mic.stop();
  assert.deepEqual(h.events.slice(-3), ["duplex:stop", "call:stop", "expo:restore"]);
  assert.equal(h.events.filter(e => e === "call:stop").length, 1);
}
{
  const h = harness();
  await assert.rejects(h.start(() => {}, {}), /Speakerphone audio is not ready/);
  assert.ok(!h.events.includes("mic:create"), "Do not fall back to the broken split speaker/capture path");
  assert.equal(h.events.at(-1), "expo:restore");
}
for (const options of [{ activate: false }, { failCapture: true }]) {
  const h = harness(options);
  await assert.rejects(h.start(() => {}), options.activate === false ? /did not activate/ : /Capture failed/);
  assert.ok(h.events.includes("call:stop"), "Failed startup must release communication mode");
  assert.equal(h.events.at(-1), "expo:restore");
  if (options.activate === false) assert.ok(!h.events.includes("mic:create"));
}
{
  const h = harness();
  const mic = await h.start(() => {}, { startCapture: async callback => {
    h.events.push("duplex:start");
    return { stop() { h.events.push("duplex:stop"); } };
  } });
  assert.ok(h.events.includes("duplex:start"));
  assert.ok(!h.events.includes("mic:create"), "Duplex must exclusively own capture; do not open a second raw recorder");
  mic.stop();
  assert.deepEqual(h.events.slice(-3), ["duplex:stop", "call:stop", "expo:restore"]);
}
{
  const h = harness({ platform: "ios" });
  const stop = await h.callExports.startCallAudio(); stop();
  assert.equal(h.events.length, 0, "Do not apply Android call routing on iOS");
}
console.log("Voice call audio: communication-mode ordering, delayed route, capture capability, failure cleanup and release passed.");
