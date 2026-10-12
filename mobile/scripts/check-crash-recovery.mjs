import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const modules = new Map();
const reports = [];
const mocks = {
  react: {
    Component: class { constructor(props) { this.props = props; } setState(state) { this.state = { ...this.state, ...state }; } },
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
  },
  "react-native": { View: "View", Text: "Text", Pressable: "Pressable", StyleSheet: { create: (s) => s } },
  "../theme": { color: {} },
  "../api/client": { api: { reportClientError: (r) => { reports.push(r); return Promise.reject(new Error("offline")); } } },
  "@react-native-async-storage/async-storage": { getItem: async () => null, setItem: async () => {} },
};
function load(file, overrides = {}) {
  const abs = resolve(root, file);
  if (modules.has(abs)) return modules.get(abs).exports;
  const mod = { exports: {} };
  modules.set(abs, mod);
  const js = ts.transpileModule(readFileSync(abs, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  new Function("require", "module", "exports", js)((s) => {
    if (s in overrides) return overrides[s];
    if (s in mocks) return mocks[s];
    return load(resolve(dirname(abs), s + ".ts"));
  }, mod, mod.exports);
  return mod.exports;
}

const Boundary = load("src/components/AppErrorBoundary.tsx").default;
const b = new Boundary({ routeName: "ParvaPage", children: "navigation" });
assert.equal(b.render(), "navigation");
b.state = Boundary.getDerivedStateFromError(new TypeError("private learner text"));
b.componentDidCatch(new TypeError("private learner text"), { componentStack: "\n    at ParvaPageScreen (bundle:12:34)\n    at RootNavigator\n    at private text" });
const fallback = b.render();
assert.equal(fallback.type, "View");
assert.equal(reports[0].error_type, "TypeError");
assert.deepEqual(reports[0].components, ["ParvaPageScreen", "RootNavigator", "private"]);
assert.ok(!JSON.stringify(reports).includes("learner text"));
fallback.props.children.find((child) => child.type === "Pressable").props.onPress();
assert.equal(b.render(), "navigation");
// Wait for the rejected diagnostic request: it must never reject unhandled.
await new Promise((r) => setImmediate(r));

let calls = 0;
let finish;
let request = new Promise((r) => { finish = r; });
const cache = load("src/parva/cache.ts", { "./api": { parvaCalendar: () => { calls++; return request; } } });
const key = { lat: 43.9, lon: 125.3, tradition: "north", lang: "en" };
const opts = { start: "2026-10-12", days: 60, tz: "Asia/Shanghai" };
const first = cache.getParvaCalendar(key, opts);
const second = cache.getParvaCalendar(key, opts);
await new Promise((r) => setImmediate(r));
assert.equal(calls, 1, "simultaneous calendar consumers share one request");
const data = { occurrences: [] };
finish(data);
assert.deepEqual(await Promise.all([first, second]), [data, data]);
request = Promise.reject(new Error("offline"));
await assert.rejects(cache.getParvaCalendar(key, opts));
request = Promise.resolve(data);
assert.equal(await cache.getParvaCalendar(key, opts), data, "a failed request does not poison retries");
request = Promise.resolve(data);
await Promise.all([cache.getParvaCalendar(key, opts), cache.getParvaCalendar(key, { ...opts, days: 120 })]);
assert.equal(calls, 5, "different calendar windows are not merged");
console.log("Crash fallback, recovery, diagnostic privacy/offline handling and calendar concurrency checks passed.");
