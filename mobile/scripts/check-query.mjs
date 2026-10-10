#!/usr/bin/env node
// Exercise the real query hook with deterministic React hooks and delayed GETs.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");
const same = (a, b) => a?.length === b?.length && a.every((v, i) => Object.is(v, b[i]));
let current;
const React = {
  useState(initial) {
    const owner = current;
    const i = owner.cursor++;
    if (!(i in owner.slots)) owner.slots[i] = typeof initial === "function" ? initial() : initial;
    return [owner.slots[i], (next) => {
      owner.updates++;
      owner.slots[i] = typeof next === "function" ? next(owner.slots[i]) : next;
    }];
  },
  useRef(initial) {
    const i = current.cursor++;
    return current.slots[i] ??= { current: initial };
  },
  useCallback(fn, deps) {
    const i = current.cursor++;
    const old = current.slots[i];
    if (!old || !same(old.deps, deps)) current.slots[i] = { deps, fn };
    return current.slots[i].fn;
  },
  useEffect(fn, deps) {
    const i = current.cursor++;
    const old = current.slots[i];
    if (!old || !same(old.deps, deps)) {
      current.effects.push(() => {
        old?.cleanup?.();
        current.slots[i] = { deps, cleanup: fn() };
      });
    }
  },
};
function load(file, modules = {}) {
  const js = ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", js)((spec) => modules[spec], module, module.exports);
  return module.exports;
}
const cache = load("../src/services/apiCache.ts");
const { useQuery } = load("../src/hooks/useQuery.ts", {
  react: React,
  "@react-navigation/native": { useFocusEffect(fn) { current.focus = fn; } },
  "../services/apiCache": cache,
});
function rig() {
  const owner = { slots: [], cursor: 0, effects: [], updates: 0, focus: null };
  return {
    render(key, fetcher, opts) {
      current = owner;
      owner.cursor = 0;
      return useQuery(key, fetcher, opts);
    },
    commit() {
      current = owner;
      for (const effect of owner.effects.splice(0)) effect();
    },
    focus() { return owner.focus(); },
    unmount() { for (const slot of owner.slots) slot?.cleanup?.(); },
    updates() { return owner.updates; },
  };
}
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
};
const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };
let calls = 0;
const fetcher = async () => { calls++; return "fresh"; };

// A cached screen's first frame already has data; even focus does no GET.
await cache.cachedGet("cached", async () => "ready");
{
  const r = rig();
  assert.deepEqual(r.render("cached", fetcher, { refetchOnFocus: true }).data, "ready");
  assert.equal(r.render("cached", fetcher, { refetchOnFocus: true }).loading, false);
  r.commit();
  r.focus();
  await flush();
  assert.equal(calls, 0);
  r.unmount();
}

// Switching chapters never displays the previous chapter, including before
// effects run. Cached destinations skip the loading frame immediately.
{
  const r = rig();
  r.render("cached", fetcher); r.commit();
  const gate = deferred();
  const getNext = () => gate.promise;
  let shown = r.render("uncached", getNext);
  assert.equal(shown.data, null);
  assert.equal(shown.loading, true);
  r.commit();
  gate.resolve("next chapter"); await flush();
  shown = r.render("uncached", getNext);
  assert.equal(shown.data, "next chapter");
  assert.equal(shown.loading, false);
  shown = r.render("cached", fetcher);
  assert.equal(shown.data, "ready");
  assert.equal(shown.loading, false);
  r.commit(); r.unmount();
}

// Refresh retains already rendered content while requesting a fresh version.
{
  const r = rig();
  r.render("cached", fetcher, { refetchOnFocus: true }); r.commit();
  cache.invalidateCache("cached");
  const gate = deferred();
  const slow = () => gate.promise;
  r.render("cached", slow, { refetchOnFocus: true });
  const cancel = r.focus();
  const shown = r.render("cached", slow, { refetchOnFocus: true });
  assert.equal(shown.data, "ready");
  assert.equal(shown.loading, false);
  gate.resolve("updated"); await flush();
  assert.equal(r.render("cached", slow, { refetchOnFocus: true }).data, "updated");
  cancel?.(); r.unmount();
}

// Both requests share one GET and late replies cannot update an unmounted hook.
{
  const a = rig(); const b = rig();
  const gate = deferred();
  const slow = () => { calls++; return gate.promise; };
  a.render("shared", slow); a.commit();
  b.render("shared", slow); b.commit();
  assert.equal(calls, 1);
  a.unmount();
  const updates = a.updates();
  gate.resolve("shared reply"); await flush();
  assert.equal(a.updates(), updates);
  assert.equal(b.render("shared", slow).data, "shared reply");
  b.unmount();
}
console.log("Query latency regression checks passed.");
