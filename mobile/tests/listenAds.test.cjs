// Full-screen ads in the audiobook player: the ChantController waits between
// verses while one shows, and listenAds decides when. TypeScript is
// transpiled and run in Node.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadTs(rel, mocks, cache = new Map()) {
  const file = path.join(__dirname, '..', rel);
  if (cache.has(file)) return cache.get(file);
  const {outputText} = ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true}});
  const module = {exports: {}};
  cache.set(file, module.exports);
  const require = id => {
    if (id in mocks) return mocks[id];
    if (id.startsWith('.')) return loadTs(path.relative(path.join(__dirname, '..'), path.join(path.dirname(file), id)) + '.ts', mocks, cache);
    throw new Error('Unexpected import ' + id);
  };
  vm.runInNewContext(outputText, {module, exports: module.exports, require, setTimeout, clearTimeout, Date, Math, encodeURIComponent, JSON, Promise});
  cache.set(file, module.exports);
  return module.exports;
}

const flush = () => new Promise(resolve => setImmediate(resolve));
const pages = [
  {id: 'a', source_ref: 'Gita 1.46', chant: {url: 'v0.mp3', lines: []}},
  {id: 'b', source_ref: 'Gita 2.1', chant: {url: 'v1.mp3', lines: []}},
  {id: 'c', source_ref: 'Gita 2.2', chant: {url: 'v2.mp3', lines: []}},
];

function fakeHost(breakBefore) {
  const log = [];
  const timers = [];
  const players = [];
  const host = {
    ready: async () => {}, resolve: u => u, prepareAudio: async () => {},
    createPlayer: url => {
      const p = {url, listeners: [], removed: false,
        play() { log.push('play ' + p.url); }, pause() {}, seekTo() {}, replace(next) { p.url = next; },
        addListener(_e, cb) { p.listeners.push(cb); return {remove() { p.listeners = p.listeners.filter(x => x !== cb); }}; },
        setActiveForLockScreen() {}, remove() { p.removed = true; },
        finish() { for (const cb of [...p.listeners]) cb({isLoaded: true, currentTime: 1, duration: 1, didJustFinish: true, playing: false}); },
      };
      players.push(p);
      return p;
    },
    pages: () => pages, repeat: () => 'off', speed: () => 1, follow: () => false, autoplay: () => true,
    isBackground: () => false, bookTitle: () => 'Gita',
    setTimer: (fn, ms) => { const t = {fn, ms}; timers.push(t); return t; },
    clearTimer: t => { const i = timers.indexOf(t); if (i >= 0) timers.splice(i, 1); },
    onVerse: i => log.push('verse ' + i), onLine() {}, onPlaying: on => log.push(on ? 'playing' : 'stopped'), scrollTo() {},
    breakBefore, onBreak: on => log.push(on ? 'break' : 'break over'),
  };
  return {host, log, timers, players};
}
const {ChantController, BREAK_LIMIT_MS} = loadTs('src/recite/chantController.ts', {});

function adGap() {
  let close;
  const hold = new Promise(resolve => { close = resolve; });
  return {hold, close: () => close()};
}

test('the chant waits silently for the ad, Next and Play wait too, then the next verse plays', async () => {
  const gap = adGap();
  const {host, log, players} = fakeHost((from, to) => from === 0 && to === 1 ? gap.hold : null);
  const chant = new ChantController(host);
  await chant.start(0);
  players[0].finish();
  await flush();
  assert.equal(chant.inBreak, true);
  assert.equal(chant.isPlaying, false);
  chant.step(1, 0);
  chant.resume(0);
  chant.continueInBackground();  // the ad's own screen sends the app to the background
  assert.equal(log.includes('verse 1'), false, 'nothing starts under the ad');
  gap.close();
  await flush();
  assert.equal(chant.inBreak, false);
  assert.ok(log.indexOf('break over') < log.indexOf('verse 1'));
});

test('an ad that never closes gives way after the limit', async () => {
  const {host, log, players, timers} = fakeHost(() => new Promise(() => {}));
  const chant = new ChantController(host);
  await chant.start(0);
  players[0].finish();
  await flush();
  const limit = timers.find(t => t.ms === BREAK_LIMIT_MS);
  assert.ok(limit);
  limit.fn();
  await flush();
  assert.ok(log.includes('verse 1'));
});

test('stopping during the ad ends the break, and its late close starts nothing', async () => {
  const gap = adGap();
  const {host, log, players} = fakeHost(() => gap.hold);
  const chant = new ChantController(host);
  await chant.start(0);
  players[0].finish();
  await flush();
  chant.stop();
  assert.equal(chant.inBreak, false);
  gap.close();
  await flush();
  assert.equal(log.includes('verse 1'), false);
});

function ads(options = {}) {
  const shows = [];
  const waits = [];
  let loads = 0;
  const mocks = {
    'react-native': {AppState: {currentState: 'active'}},
    '../api/client': {request: async () => ({})},
    './ads': {loadInterstitial: async () => { loads += 1; return options.noFill ? null : {show: async () => { shows.push(1); }}; }},
    './adsState': {ADS_ENABLED: options.adsEnabled !== false},
  };
  const {listenAds, NOTICE_MS, LATE_MS} = loadTs('src/services/listenAds.ts', mocks);
  let active = true;
  listenAds.resetForTest({policy: {allowed: true, listen_ad_minutes: 10}, policyFor: 'gita:audio', visible: true,
    active: () => active, wait: async ms => { waits.push(ms); if (options.leaveDuringNotice) listenAds.setPlayerVisible(false); }});
  return {listenAds, shows, waits, loads: () => loads, setActive: v => { active = v; }, NOTICE_MS, LATE_MS};
}
const MIN = 60_000;

test('the first ad comes after half the interval, at a chapter end, after a notice', async () => {
  const {listenAds, shows, waits, NOTICE_MS} = ads();
  listenAds.playing(true, 0);
  assert.equal(listenAds.take(pages, 'gita:audio', 0, 1, 3 * MIN), null);
  assert.equal(listenAds.take(pages, 'gita:audio', 0, 1, 4.5 * MIN), null, 'loading starts a minute early');
  await flush();
  assert.equal(listenAds.take(pages, 'gita:audio', 1, 2, 5 * MIN), null, 'mid-chapter: wait for a chapter end');
  const hold = listenAds.take(pages, 'gita:audio', 0, 1, 5 * MIN);
  assert.ok(hold);
  await hold;
  assert.deepEqual(waits, [NOTICE_MS]);
  assert.equal(shows.length, 1);
});

test('after that, one per full interval, and no chapter end means at most three minutes late', async () => {
  const {listenAds, shows} = ads();
  listenAds.playing(true, 0);
  listenAds.take(pages, 'gita:audio', 0, 1, 4.5 * MIN);
  await flush();
  await listenAds.take(pages, 'gita:audio', 0, 1, 5 * MIN);
  listenAds.take(pages, 'gita:audio', 1, 2, 14.5 * MIN);
  await flush();
  assert.equal(listenAds.take(pages, 'gita:audio', 1, 2, 15 * MIN), null);
  const hold = listenAds.take(pages, 'gita:audio', 1, 2, 18 * MIN);
  assert.ok(hold);
  await hold;
  assert.equal(shows.length, 2);
});

test('no ad unless the player is in front and the app is open; paused time does not count', async () => {
  const {listenAds, setActive} = ads();
  listenAds.playing(true, 0);
  listenAds.playing(false, 2 * MIN);
  listenAds.playing(true, 30 * MIN);
  assert.equal(listenAds.take(pages, 'gita:audio', 0, 1, 31 * MIN), null, 'only 3 minutes listened');
  listenAds.take(pages, 'gita:audio', 0, 1, 32.5 * MIN);
  await flush();
  setActive(false);
  assert.equal(listenAds.take(pages, 'gita:audio', 0, 1, 33 * MIN), null, 'phone locked or app in background');
  setActive(true);
  listenAds.setPlayerVisible(false);
  assert.equal(listenAds.take(pages, 'gita:audio', 0, 1, 33 * MIN), null, 'another screen in front');
  listenAds.setPlayerVisible(true);
  assert.ok(listenAds.take(pages, 'gita:audio', 0, 1, 33 * MIN));
});

test('leaving the player during the notice keeps the ad for the next gap', async () => {
  const {listenAds, shows} = ads({leaveDuringNotice: true});
  listenAds.playing(true, 0);
  listenAds.take(pages, 'gita:audio', 0, 1, 4.5 * MIN);
  await flush();
  await listenAds.take(pages, 'gita:audio', 0, 1, 5 * MIN);
  assert.equal(shows.length, 0);
  listenAds.setPlayerVisible(true);
  assert.ok(listenAds.take(pages, 'gita:audio', 0, 1, 5.5 * MIN), 'still due, and the ad is still loaded');
});

test('no fill, a paying member, another title or an ad-free build means no player ads', async () => {
  const empty = ads({noFill: true});
  empty.listenAds.playing(true, 0);
  empty.listenAds.take(pages, 'gita:audio', 0, 1, 4.5 * MIN);
  await flush();
  assert.equal(empty.listenAds.take(pages, 'gita:audio', 0, 1, 5 * MIN), null);
  const member = ads();
  member.listenAds.resetForTest({policy: {allowed: false}, policyFor: 'gita:audio', visible: true});
  member.listenAds.playing(true, 0);
  assert.equal(member.listenAds.take(pages, 'gita:audio', 0, 1, 60 * MIN), null);
  const other = ads();
  other.listenAds.playing(true, 0);
  assert.equal(other.listenAds.take(pages, 'katha:audio', 0, 1, 60 * MIN), null);
  const off = ads({adsEnabled: false});
  off.listenAds.playing(true, 0);
  assert.equal(off.listenAds.take(pages, 'gita:audio', 0, 1, 60 * MIN), null);
  assert.equal(off.loads(), 0);
});
