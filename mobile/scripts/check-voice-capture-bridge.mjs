import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url), ts = require("typescript"), exports = {};
const timers = new Map(); let nextTimer = 0;
vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL("../src/voiceLab/captureBridge.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { exports, Uint8Array, Error, setTimeout: callback => { timers.set(++nextTimer, callback); return nextTimer; }, clearTimeout: id => timers.delete(id) });
const commands = [], errors = [], buffers = [];
const bridge = new exports.CaptureBridge(command => commands.push(command), error => errors.push(error));
const packet = Buffer.alloc(3200); for (let i = 0; i < 1600; i++) packet.writeInt16LE(i - 800, i * 2);

let pending = bridge.start(buffer => buffers.push(buffer));
const id = commands.at(-1).id;
bridge.handle({ voiceLabCaptureStarted: id, echoCancelled: true });
const first = await pending;
bridge.handle({ voiceLabCaptureFrame: id, data: packet.toString("base64") });
assert.equal(Buffer.compare(Buffer.from(buffers[0].data), packet), 0);
assert.equal(buffers[0].echoCancelled, true);
assert.equal(timers.size, 0);
pending = bridge.start(buffer => buffers.push(buffer));
const next = commands.at(-1).id;
bridge.handle({ voiceLabCaptureStarted: next, echoCancelled: true }); const second = await pending;
first.stop();
bridge.handle({ voiceLabCaptureFrame: id, data: packet.toString("base64") });
assert.equal(buffers.length, 1, "Old capture packets must not leak into the next call");
bridge.handle({ voiceLabCaptureFrame: next, data: packet.toString("base64") });
assert.equal(buffers.length, 2, "Old cleanup must not stop the new capture");
bridge.handle({ voiceLabCaptureError: next, message: "audio failed" });
assert.deepEqual(errors, ["audio failed"]);
second.stop();

pending = bridge.start(() => {}); const cancelled = assert.rejects(pending, /cancelled/); bridge.stop(); await cancelled;
pending = bridge.start(() => {}); const timeout = assert.rejects(pending, /too long/); [...timers.values()][0](); await timeout;
pending = bridge.start(() => {}); const unavailable = assert.rejects(pending, /did not activate/);
bridge.handle({ voiceLabCaptureStarted: commands.at(-1).id, echoCancelled: false }); await unavailable;
assert.equal(timers.size, 0);
console.log("Capture bridge PASS: PCM integrity, stale packet rejection, cancellation, timeout, processing checks and error recovery.");
