// When the reader gets an ad page: src/read/adRhythm.ts, run in Node.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Run in this realm (not a vm context) so deepStrictEqual compares plain objects.
function load() {
  const source = fs.readFileSync(path.join(__dirname, '../src/read/adRhythm.ts'), 'utf8');
  const {outputText} = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}});
  const exports = {};
  new Function('exports', 'require', outputText)(exports, id => { throw new Error('Unexpected import ' + id); });
  return exports;
}
const {nextAdPage, EVERY, MIN_GAP_MS, FIRST_AFTER} = load();
const NOW = 10 * MIN_GAP_MS;
const due = {lastShownAt: 0, turnsSinceAd: EVERY, sessionTurns: EVERY};

test('an ad page goes two sheets ahead once EVERY pages have passed', () => {
  assert.deepEqual(nextAdPage(due, 10, 40, true, [], true, NOW), {preload: true, after: 11});
});

test('nothing is placed until an ad has loaded, but loading starts two pages early', () => {
  assert.deepEqual(nextAdPage(due, 10, 40, true, [], false, NOW), {preload: true, after: null});
  const early = {...due, turnsSinceAd: EVERY - 2};
  assert.deepEqual(nextAdPage(early, 10, 40, true, [], true, NOW), {preload: true, after: null});
  const tooEarly = {...due, turnsSinceAd: EVERY - 3};
  assert.deepEqual(nextAdPage(tooEarly, 10, 40, true, [], true, NOW), {preload: false, after: null});
});

test('ads are at least MIN_GAP_MS apart and never in the first turns', () => {
  assert.equal(nextAdPage({...due, lastShownAt: NOW - MIN_GAP_MS + 1}, 10, 40, true, [], true, NOW).after, null);
  assert.equal(nextAdPage({...due, sessionTurns: FIRST_AFTER - 1}, 10, 40, true, [], true, NOW).after, null);
});

test('near the end of a chapter the ad goes just before Next chapter', () => {
  const fresh = {...due, turnsSinceAd: 1};
  assert.deepEqual(nextAdPage(fresh, 36, 40, true, [], true, NOW), {preload: true, after: 39});
  assert.deepEqual(nextAdPage(fresh, 38, 40, true, [], true, NOW), {preload: true, after: 39});
  // On the last verse it is too late: the next sheet is already under the leaf.
  assert.equal(nextAdPage(fresh, 39, 40, true, [], true, NOW).after, null);
});

test('no ad as the last page of a book with nothing after it', () => {
  assert.equal(nextAdPage(due, 38, 40, false, [], true, NOW).after, null);
  assert.equal(nextAdPage(due, 37, 40, false, [], true, NOW).after, 38);
});

test('one unseen ad page ahead at a time, and never two in one slot', () => {
  assert.equal(nextAdPage(due, 10, 40, true, [{after: 11, shown: false}], true, NOW).after, null);
  assert.equal(nextAdPage(due, 11, 40, true, [{after: 11, shown: false}], true, NOW).after, null);
  // A page skipped by jumping past it does not block the next one.
  assert.equal(nextAdPage(due, 20, 40, true, [{after: 11, shown: false}], true, NOW).after, 21);
});
