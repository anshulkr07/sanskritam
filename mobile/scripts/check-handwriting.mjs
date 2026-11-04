import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Run the real shared recognition adapter and template matcher. Only the
// platform bridge is replaced; no React Native runtime or model download.
function load(relativePath, dependencies) {
  const source = fs.readFileSync(new URL(relativePath, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const module = { exports: {} };
  vm.runInNewContext(outputText, {
    module,
    exports: module.exports,
    require(name) {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  }, { filename: relativePath });
  return module.exports;
}

const matcher = load("../src/services/strokeMatcher.ts", {});
function makeRecognizer(native) {
  const bridge = load("../modules/shabd-digital-ink/src/index.ts", {
    expo: { requireOptionalNativeModule: () => native },
  });
  const shared = load("../src/services/inkRecogniser.ts", {
    "./strokeMatcher": matcher,
    "shabd-digital-ink": bridge,
  });
  const recognizer = shared.getInkRecogniser();
  recognizer.setReference("अ", [{ d: "M 10 10 L 10 90 L 90 90", dir: "ttb" }]);
  return { bridge, recognizer };
}
const strokes = [[{ x: 10, y: 10 }, { x: 10, y: 90 }, { x: 90, y: 90 }]];

// Native code absent (including pre-iOS builds): app loads, checks still work.
const fallback = makeRecognizer(null);
assert.equal(fallback.bridge.isAvailable, false);
assert.equal(fallback.recognizer.getStatus(), "ready");
assert.equal((await fallback.recognizer.recognise(strokes)).text, "अ");
assert.ok((await fallback.recognizer.recognise(strokes)).confidence >= 0.8);
fallback.recognizer.setReference("अ", []);
assert.equal((await fallback.recognizer.recognise(strokes)).confidence, 0);
await assert.rejects(fallback.bridge.downloadModel("hi"), /not available/);

async function prepared(native) {
  const { recognizer } = makeRecognizer(native);
  recognizer.prepare();
  // Model download resolution and finally() publish readiness asynchronously.
  for (let i = 0; i < 8; i++) await Promise.resolve();
  assert.equal(recognizer.getStatus(), "ready");
  return recognizer;
}

const calls = [];
const native = {
  downloadModel: async (tag) => { calls.push(tag); return true; },
  recognize: async () => [{ text: "अ", score: 0 }],
};
const ready = await prepared(native);
assert.equal(calls[0], "hi", "Keep the current model until Sanskrit/Hindi comparison is validated");
assert.equal((await ready.recognise(strokes)).confidence, 0.92,
  "Missing ML Kit text scores must not turn correct handwriting into unsure");
assert.equal(await ready.recognise([]), null);
native.recognize = async () => [{ text: "आ" }, { text: "अ" }];
assert.equal((await ready.recognise(strokes)).confidence, 0.7);
native.recognize = async () => [{ text: "आ" }];
assert.equal((await ready.recognise(strokes)).confidence, 0.4);

// iOS download timeout/failure and recognition failure retain local practice.
for (const variant of [
  { downloadModel: async () => { throw new Error("offline"); } },
  { downloadModel: async () => false },
  { recognize: async () => { throw new Error("native error"); } },
  { recognize: async () => [] },
]) {
  const recognizer = await prepared({ ...native, ...variant });
  const result = await recognizer.recognise(strokes);
  assert.equal(result.text, "अ");
  assert.ok(result.confidence >= 0.8);
}

console.log("Handwriting PASS: missing native module, model download, candidate grading, empty ink, and offline/error fallbacks.");
