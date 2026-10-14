#!/usr/bin/env node
// Run the real lobby, live-game adapter and socket hook with controlled
// React hooks and transport responses, including lost responses and cleanup.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");
let current;
const same = (a, b) => a?.length === b?.length && a.every((v, i) => Object.is(v, b[i]));
const React = {
  Fragment: "Fragment",
  createElement(type, props, ...children) { return { type, props: { ...props, children } }; },
  useState(initial) {
    const owner = current, i = owner.cursor++;
    if (!(i in owner.slots)) owner.slots[i] = typeof initial === "function" ? initial() : initial;
    return [owner.slots[i], (v) => { owner.slots[i] = typeof v === "function" ? v(owner.slots[i]) : v; }];
  },
  useRef(value) { return current.slots[current.cursor++] ??= { current: value }; },
  useCallback(fn, deps) {
    const i = current.cursor++, old = current.slots[i];
    if (!old || !same(deps, old.deps)) current.slots[i] = { deps, fn };
    return current.slots[i].fn;
  },
  useMemo(fn, deps) {
    const i = current.cursor++, old = current.slots[i];
    if (!old || !same(deps, old.deps)) current.slots[i] = { deps, value: fn() };
    return current.slots[i].value;
  },
  useEffect(fn, deps) {
    const owner = current, i = owner.cursor++, old = owner.slots[i];
    if (!old || !same(deps, old.deps)) {
      owner.effects.push(() => { old?.cleanup?.(); owner.slots[i] = { deps, cleanup: fn() }; });
    }
  },
  createContext(value) { return { value, Provider: "Provider" }; },
  useContext(context) { return context.value; },
};
const timers = new Map();
let nextTimer = 1;
const setTimer = (fn) => { const id = nextTimer++; timers.set(id, fn); return id; };
const clearTimer = (id) => timers.delete(id);
function load(file, modules) {
  const js = ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  const m = { exports: {} };
  new Function("require", "module", "exports", "setInterval", "clearInterval", "setTimeout", "clearTimeout", "WebSocket", js)(
    (spec) => {
      assert.ok(spec in modules, `Missing mock ${spec}`);
      const value = modules[spec];
      return value?.default ? { ...value, __esModule: true } : value;
    },
    m, m.exports, setTimer, clearTimer, setTimer, clearTimer, FakeSocket);
  return m.exports;
}
function rig(fn) {
  const owner = { slots: [], cursor: 0, effects: [] };
  return {
    render(props) { current = owner; owner.cursor = 0; return fn(props); },
    commit() { current = owner; for (const fn of owner.effects.splice(0)) fn(); },
    unmount() { for (const slot of owner.slots) slot?.cleanup?.(); },
  };
}
function find(node, predicate) {
  if (!node) return;
  if (Array.isArray(node)) { for (const n of node) { const hit = find(n, predicate); if (hit) return hit; } return; }
  if (typeof node !== "object") return;
  if (predicate(node)) return node;
  return find(node.props?.children, predicate);
}
const button = (tree, label) => find(tree, (n) => n.props?.accessibilityLabel === label);
const flush = async () => { for (let i = 0; i < 16; i++) await Promise.resolve(); };
const deferred = () => { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; };
class FakeSocket {
  static OPEN = 1;
  static sockets = [];
  constructor(url) { this.url = url; this.readyState = 0; this.sent = []; FakeSocket.sockets.push(this); }
  open() { this.readyState = 1; this.onopen?.(); }
  frame(msg) { this.onmessage?.({ data: JSON.stringify(msg) }); }
  send(msg) { this.sent.push(JSON.parse(msg)); }
  close() { this.readyState = 3; this.onclose?.(); }
}
let ticketCalls = 0;
const socketApi = { ticket: async () => ({ ticket: `ticket-${++ticketCalls}` }) };
const { usePlayMatchSocket } = load("../src/games/v2/useMatchSocket.ts", {
  react: React, "../../config": { BASE_URL: "http://test" },
  "./client": { matchApi: socketApi, wsUrl: (_base, path) => `ws://test${path}` },
});
{
  const r = rig(usePlayMatchSocket), seen = [], replaced = [];
  const opts = { matchId: "m1", onSnapshot: (s) => seen.push(s), onEvent: (t) => seen.push(t) };
  r.render(opts); r.commit(); await flush();
  const ws = FakeSocket.sockets.at(-1); ws.open();
  ws.frame({ type: "snapshot", payload: { seq: 12 } });
  ws.frame({ type: "ready", seq: 13, payload: {} });
  assert.equal(ws.sent.length, 0, "Snapshot sequence must prevent spurious event replay");
  r.render({ ...opts, onEvent: (t) => replaced.push(t) }); r.commit();
  ws.frame({ type: "ready", seq: 13, payload: {} });
  ws.frame({ type: "progress", seq: 14, payload: {} });
  ws.frame({ type: "error", detail: "Host only" });
  assert.deepEqual(replaced, ["progress", "error"]);
  ws.close();
  const retry = [...timers.values()][0]; timers.clear(); retry(); await flush();
  assert.equal(ticketCalls, 2);
  assert.notEqual(FakeSocket.sockets.at(-1), ws);
  r.unmount(); assert.equal(timers.size, 0);
}
{
  const delayed = deferred(), r = rig(usePlayMatchSocket);
  socketApi.ticket = () => delayed.promise;
  const count = FakeSocket.sockets.length;
  r.render({ matchId: "gone", onEvent() {}, onSnapshot() {} }); r.commit();
  r.unmount(); delayed.resolve({ ticket: "late" }); await flush();
  assert.equal(FakeSocket.sockets.length, count, "An unmounted room must not open a late socket");
}

let room = { match_id: "room", kind: "private", game: "smriti", code: "CODE12", status: "lobby", seq: 1,
  host: "host", deadline: null, config: {}, answer_lang: "sa", own_state: {}, own_done: false,
  players: [{ learner_id: "host", ready: true, alias: "Host", connected: true },
    { learner_id: "guest", ready: false, alias: "Guest", connected: true }], result: null, pack: null };
let learner = "host", status = "open", latestOptions;
let actionCalls = [], failMove = false;
const api = {
  resume: async () => ({ match: null }), snapshot: async () => structuredClone(room),
  start: async () => { room = { ...room, seq: room.seq + 1, status: "countdown", deadline: new Date(Date.now() + 5000).toISOString() }; },
  enqueue: async () => ({ matched: true, match_id: "room" }),
  action: async (...args) => { actionCalls.push(args); if (failMove) throw Error("response lost"); return { reveal: { pair: 1 } }; },
};
const native = { View: "View", Text: "Text", Pressable: "Pressable", ScrollView: "ScrollView", TextInput: "TextInput",
  Alert: { alert() {} }, StyleSheet: { create: (s) => s } };
const theme = { color: {}, fill: {}, font: { sizes: {} }, onFill: {}, radius: {}, space: {}, script() {} };
const context = React.createContext(null);
const screenMocks = Object.fromEntries(["Smriti", "ShabdaRush", "VarnaJaal", "WordGroups", "PadaPath", "NumberBuilder"]
  .map((name) => [`../../screens/${name}`, { default: function Screen() {} }]));
const { default: LiveMatchGame } = load("../src/games/v2/LiveMatchGame.tsx", {
  react: React, "react-native": native, "./client": { matchApi: api },
  "./useSession": { PlaySessionContext: context }, "../../theme": theme, ...screenMocks,
});
const { default: RoomLobby } = load("../src/screens/RoomLobby.tsx", {
  react: React, "react-native": native, "react-native-safe-area-context": { SafeAreaView: "SafeAreaView" },
  "@react-navigation/native": { usePreventRemove() {} },
  "@react-native-vector-icons/ionicons": { Ionicons: "Ionicons" },
  "../games/v2/client": { matchApi: api }, "../games/v2/parts": { GameTopBar: "GameTopBar" },
  "../games/v2/useMatchSocket": { usePlayMatchSocket: (opts) => { latestOptions = opts; return { send() {}, status }; } },
  "../games/v2/useCatalog": { useCatalogGame: () => ({ title: "Smriti" }) },
  "../theme": theme, "../services/haptics": { haptics: { tap() {} } },
  "../store/auth": { useAuth: () => ({ learner: { id: learner } }) }, "../games/v2/LiveMatchGame": { default: LiveMatchGame },
});
{
  const r = rig(RoomLobby), props = { navigation: { setOptions() {}, goBack() {} }, route: { params: { matchId: "room" } } };
  r.render(props); r.commit(); await flush();
  let tree = r.render(props); r.commit();
  assert.equal(button(tree, "Start match").props.disabled, true);
  room.players[1].ready = true; room.seq++;
  latestOptions.onEvent("ready", {});
  r.render(props); r.commit(); await flush();
  tree = r.render(props); r.commit();
  assert.equal(button(tree, "Start match").props.disabled, false);
  await button(tree, "Start match").props.onPress(); await flush();
  tree = r.render(props); r.commit(); await flush();
  assert.equal(button(tree, "Start match"), undefined);
  room = { ...room, seq: room.seq + 1, status: "active", pack: { pairs: 2 } };
  latestOptions.onSnapshot(room);
  tree = r.render(props); r.commit();
  assert.ok(find(tree, (n) => n.type === LiveMatchGame), "Active matches must render a real game");
  room = { ...room, seq: room.seq + 1, own_done: true }; latestOptions.onSnapshot(room);
  tree = r.render(props); r.commit();
  assert.equal(find(tree, (n) => n.type === LiveMatchGame), undefined, "Finished players wait for opponents");
  r.unmount(); timers.clear();
}
{
  const r = rig(RoomLobby), props = { navigation: { setOptions() {}, goBack() {} }, route: { params: { mode: "quick" } } };
  r.render(props); r.commit(); await flush();
  let tree = r.render(props); r.commit();
  await button(tree, "Find match").props.onPress(); await flush();
  tree = r.render(props); r.commit();
  assert.equal(latestOptions.matchId, "room", "The immediately paired player must open the returned match");
  r.unmount(); timers.clear();
}
for (const game of ["smriti", "rush", "varna-jaal", "word-groups", "pada-path", "number"]) {
  const r = rig(LiveMatchGame), snap = { ...room, game, own_done: false, pack: { marker: game } };
  const props = { snapshot: snap, onLeave() {}, onChanged() {}, connected: true };
  const tree = r.render(props), controller = tree.props.value;
  assert.equal(controller.session.id, "room");
  assert.equal(controller.session.pack, snap.pack);
  assert.equal(controller.session.mode, "live");
  failMove = true;
  await controller.answer({ index: 0 });
  failMove = false;
  await r.render(props).props.value.answer({ index: 0 });
  assert.equal(actionCalls.at(-1)[2], actionCalls.at(-2)[2], "Retry must reuse the idempotency key");
  assert.equal(actionCalls.at(-1)[0], "room");
  const before = actionCalls.length;
  await r.render({ ...props, connected: false }).props.value.answer({ index: 1 });
  assert.equal(actionCalls.length, before, "Disconnected games must not silently lose moves");
  r.unmount();
}
console.log("Multiplayer lobby, six live-game adapters, action retries and socket recovery passed.");
