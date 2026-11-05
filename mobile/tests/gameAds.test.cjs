// Full-screen ads after games: src/services/gameAds.ts, run in Node.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(options = {}) {
  const shows = [];
  let loads = 0;
  const mocks = {
    './ads': {loadInterstitial: async () => { loads += 1; return options.noFill ? null : {show: async () => { shows.push(1); }}; }},
    './adsState': {ADS_ENABLED: options.adsEnabled !== false},
  };
  const source = fs.readFileSync(path.join(__dirname, '../src/services/gameAds.ts'), 'utf8');
  const {outputText} = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}});
  const module = {exports: {}};
  vm.runInNewContext(outputText, {module, exports: module.exports, require: id => mocks[id], Date, Promise});
  return {...module.exports, shows, loads: () => loads};
}
const flush = () => new Promise(resolve => setImmediate(resolve));
const MIN = 60_000;

test('one ad after every second finished game, shown as the results close', async () => {
  const ads = load();
  ads.gameAds.finished(10 * MIN);
  await ads.gameAds.afterResults(10 * MIN);
  assert.equal(ads.shows.length, 0, 'not after the first game');
  ads.gameAds.finished(11 * MIN);   // second game: loads now, while the results are read
  await flush();
  await ads.gameAds.afterResults(11 * MIN);
  assert.equal(ads.shows.length, 1);
  ads.gameAds.finished(12 * MIN);
  ads.gameAds.finished(12.5 * MIN);
  await flush();
  await ads.gameAds.afterResults(12.5 * MIN);
  assert.equal(ads.shows.length, 1, 'at least three minutes apart');
  ads.gameAds.finished(15 * MIN);
  await flush();
  await ads.gameAds.afterResults(15 * MIN);
  assert.equal(ads.shows.length, 2);
});

test('no fill or an ad-free build never holds the player up', async () => {
  const empty = load({noFill: true});
  empty.gameAds.finished(10 * MIN);
  empty.gameAds.finished(11 * MIN);
  await flush();
  await empty.gameAds.afterResults(11 * MIN);
  assert.equal(empty.shows.length, 0);
  const off = load({adsEnabled: false});
  off.gameAds.finished(10 * MIN);
  off.gameAds.finished(11 * MIN);
  await off.gameAds.afterResults(11 * MIN);
  assert.equal(off.loads(), 0);
});
