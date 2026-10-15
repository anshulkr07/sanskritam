import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");
const memory = new Map([["shabd.story.index", "7"]]);
const native = {
  getItem: async key => memory.get(key) ?? null,
  setItem: async (key, value) => { memory.set(key, value); },
  getAllKeys: async () => [...memory.keys()],
  multiGet: async keys => keys.map(key => [key, memory.get(key) ?? null]),
};
let handler = async () => ({ entries: {} });
const source = readFileSync(new URL("../src/services/progressStorage.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const module = { exports: {} };
new Function("require", "module", "exports", "setTimeout", "clearTimeout", code)(name => {
  if (name === "@react-native-async-storage/async-storage") return { __esModule: true, default: native };
  if (name === "../api/client") return { request: (...args) => handler(...args) };
  throw new Error(name);
}, module, module.exports, () => 1, () => {});
const { progressStorage: storage, setProgressOwner, syncLearningProgress } = module.exports;
const flush = async () => { for (let i = 0; i < 50; i++) await Promise.resolve(); };
setProgressOwner("first");
assert.equal(await storage.getItem("shabd.story.index"), "7", "Legacy progress migrates to its first account");
await flush();
await Promise.all([storage.setItem("shabd.story.index", "8"), storage.setItem("shabd.learning.goal", "read")]);
assert.equal(await storage.getItem("shabd.story.index"), "8");
assert.equal(await storage.getItem("shabd.learning.goal"), "read");
setProgressOwner("second");
assert.equal(await storage.getItem("shabd.story.index"), null, "Another account cannot inherit old global marks");
await storage.setItem("shabd.story.index", "2");
await flush();
setProgressOwner("first");
assert.equal(await storage.getItem("shabd.story.index"), "8", "Returning to an account restores only its progress");
await flush();
handler = async () => { throw new Error("offline"); };
await storage.setItem("shabd.read.position.gita", "12");
await syncLearningProgress();
assert.equal(await storage.getItem("shabd.read.position.gita"), "12", "Network failure never removes local progress");
let resolve;
handler = () => new Promise(r => { resolve = r; });
const pending = syncLearningProgress();
await flush();
setProgressOwner("second");
await storage.getItem("shabd.story.index");
resolve({ entries: { "shabd.story.index": { value: "999", updated_ms: Date.now() + 1 } } });
await pending;
assert.equal(await storage.getItem("shabd.story.index"), "2", "A late sync cannot write into another account");
setProgressOwner(null);
assert.equal(await storage.getItem("shabd.story.index"), null);
console.log("Learning progress PASS: legacy migration, concurrent writes, account isolation, offline persistence and stale-response protection.");
