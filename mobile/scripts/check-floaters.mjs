// Exercise the real component's gestures and persistence without a native device.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");
const storage = new Map();
let frame;
let window = { width: 390, height: 844 };
const same = (a, b) => !!a && !!b && a.length === b.length && a.every((v, i) => v === b[i]);
const React = {
  createElement(type, props, ...children) { return { type, props: props || {}, children }; },
  useState(initial) {
    const f = frame, i = f.cursor++;
    if (!f.hooks[i]) f.hooks[i] = { value: initial };
    return [f.hooks[i].value, value => { f.hooks[i].value = typeof value === "function" ? value(f.hooks[i].value) : value; }];
  },
  useRef(value) { const f = frame, i = f.cursor++; return f.hooks[i] ??= { current: value }; },
  useEffect(fn, deps) {
    const f = frame, i = f.cursor++, old = f.hooks[i];
    if (!old || !same(old.deps, deps)) { old?.cleanup?.(); f.hooks[i] = { deps }; f.effects.push(() => { f.hooks[i].cleanup = fn(); }); }
  },
  useMemo(fn, deps) {
    const f = frame, i = f.cursor++;
    if (!f.hooks[i] || !same(f.hooks[i].deps, deps)) f.hooks[i] = { value: fn(), deps };
    return f.hooks[i].value;
  },
};
class ValueXY {
  value = { x: 0, y: 0 };
  setValue(value) { this.value = value; }
  getLayout() { return { left: this.value.x, top: this.value.y }; }
}
const modules = {
  "react": React,
  "@react-native-async-storage/async-storage": { getItem: async key => storage.get(key) ?? null, setItem: async (key, value) => { storage.set(key, value); } },
  "@react-native-vector-icons/ionicons": { Ionicons: "Icon" },
  "react-native": { Animated: { ValueXY, View: "AnimatedView" }, PanResponder: { create: handlers => ({ panHandlers: handlers }) }, Pressable: "Button", View: "View", StyleSheet: { create: s => s, absoluteFill: {} }, useWindowDimensions: () => window },
  "react-native-safe-area-context": { useSafeAreaInsets: () => ({ top: 24, bottom: 24 }) },
  "../theme": { color: {} },
};
const js = ts.transpileModule(readFileSync(new URL("../src/components/EdgeFloater.tsx", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true },
}).outputText;
const mod = { exports: {} };
new Function("require", "module", "exports", js)(name => { assert.ok(name in modules, name); return modules[name]; }, mod, mod.exports);
const EdgeFloater = mod.exports.default;
function mount(key, width = 56) {
  const f = { hooks: [], cursor: 0, effects: [], props: { storageKey: key, label: key, width, height: 88, initialTop: 560, children: "Actual player" } };
  f.render = () => { frame = f; f.cursor = 0; f.tree = EdgeFloater(f.props); f.effects.splice(0).forEach(fn => fn()); return f.tree; };
  f.panel = () => { f.render(); return f.render().children[0]; };
  f.button = () => { const panel = f.panel(); return panel.children[0].type === "Button" ? panel.children[0] : panel.children[0].children[0]; };
  f.render(); return f;
}
async function ready() { for (let n = 0; n < 8; n++) await Promise.resolve(); }
const ask = mount("ask");
const audio = mount("audio", 362);
await ready();
assert.match(ask.button().props.accessibilityLabel, /^Tuck/);
assert.equal(ask.panel().props.onMoveShouldSetPanResponder(null, { dx: 0, dy: 0 }), false, "Tapping remains a button action");
ask.button().props.onPress();
assert.match(ask.button().props.accessibilityLabel, /^Restore/);
assert.equal(ask.panel().props.style.at(-1).opacity, 0.25, "Tucked control is 75% transparent");
assert.equal(ask.panel().props.style.at(-1).width, 28, "Only an edge tab remains visible");
assert.match(audio.button().props.accessibilityLabel, /^Tuck/, "Independent overlay state");
const modalCopy = mount("ask"); await ready();
assert.match(modalCopy.button().props.accessibilityLabel, /^Restore/, "A modal respects the saved tuck preference");
modalCopy.button().props.onPress();
assert.match(ask.button().props.accessibilityLabel, /^Tuck/, "Restoring inside a modal updates the underlying overlay");
let panel = audio.panel();
assert.equal(panel.props.onMoveShouldSetPanResponder(null, { dx: 9, dy: 0 }), true);
panel.props.onPanResponderGrant();
panel.props.onPanResponderMove(null, { dx: -100, dy: -2000 });
panel.props.onPanResponderRelease(null, { dx: -100, dy: -2000 });
assert.match(audio.button().props.accessibilityLabel, /^Restore/, "Dragging beyond an edge tucks the player");
assert.equal(audio.panel().props.style[1].top, 56, "Dragging cannot pass the top safe area");
assert.equal(JSON.parse(storage.get("audio")).side, "left");
audio.button().props.onPress();
panel = audio.panel();
panel.props.onPanResponderGrant();
panel.props.onPanResponderRelease(null, { dx: 10, dy: 2000 });
assert.equal(audio.panel().props.style[1].top, 654, "Dragging stays clear of the bottom navigation");
window = { width: 320, height: 500 };
assert.ok(audio.panel().props.style[1].top <= 310, "Resizing brings the player back on screen");
assert.equal(audio.panel().props.style.at(-1).width, 292);
console.log("Floating controls: tuck/restore, drag, transparency, independent state, modal sync, persistence and window bounds passed.");
