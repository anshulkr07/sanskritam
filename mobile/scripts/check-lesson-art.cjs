// Verify exact example mappings against the complete, current source guide.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const mod = { exports: {} }; cache.set(file, mod);
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  } }).outputText;
  new Function('require', 'module', 'exports', js)(name => {
    const resolved = path.resolve(path.dirname(file), name);
    if (/\.(png|webp)$/.test(name)) { assert.ok(fs.existsSync(resolved), `Missing ${resolved}`); return resolved; }
    if (name.endsWith('.json')) return JSON.parse(fs.readFileSync(resolved, 'utf8'));
    return load(resolved + '.ts');
  }, mod, mod.exports);
  return mod.exports;
}
const { findGuideArt, getLearnV2Asset } = load(path.join(root, 'src/learnv2/assetMap.ts'));
const { EXTRA_LESSON_ART, GUIDE_ART_MATCHES } = load(path.join(root, 'src/learnv2/extraLessonArt.ts'));
const { topicCards } = load(path.join(root, 'src/learnv2/guideCards.ts'));
const { hubArtwork } = load(path.join(root, 'src/components/artwork/hubs.ts'));
const backend = path.resolve(root, '../backend');
const python = process.env.PYTHON ?? path.join(backend, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
const guide = JSON.parse(execFileSync(python, ['-c', 'from app.services.grammar_guide import _build; import json; print(json.dumps(_build(),ensure_ascii=False))'], {
  cwd: backend, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
}));
for (const [key, id] of Object.entries(GUIDE_ART_MATCHES)) {
  const [topic, sa, iast] = JSON.parse(key);
  const card = topicCards(guide.topics[topic]).find(c => c.example?.sa === sa && c.example?.iast === iast);
  assert.ok(card, `Art has no source example: ${key}`);
  assert.equal(findGuideArt(topic, sa, iast), id, `Wrong art: ${key}`);
  assert.ok(getLearnV2Asset(id), `Missing asset: ${id}`);
}
for (const id of Object.keys(EXTRA_LESSON_ART)) {
  assert.ok(Object.values(GUIDE_ART_MATCHES).includes(id), `Unused new artwork ${id}`);
  const art = getLearnV2Asset(id);
  assert.equal(art.sceneHeight, art.height, 'New scenes have no baked caption to crop');
  assert.ok(art.altEn && art.altHi, 'Artwork needs accessible descriptions in both languages');
}
for (const topic of Object.values(guide.topics)) {
  const cards = topicCards(topic);
  assert.ok(hubArtwork(`grammar:${cards[0].guide.chapterId}`), `Missing opening art: ${topic.id}`);
  assert.ok(cards.slice(1).every(c => !c.guide?.chapterId), 'Chapter artwork belongs only on opening cards');
}
assert.equal(findGuideArt('questions', 'unknown example', 'unknown'), undefined, 'Unreviewed examples stay unmapped');
assert.equal(findGuideArt('stem-ending', 'गजः जलं पिबति', 'gajaḥ jalaṃ pibati'), 'guide-stem-ending-1', 'Existing teaching art survives');
console.log(`Lesson art passed: ${Object.keys(EXTRA_LESSON_ART).length} new scenes, ${Object.keys(GUIDE_ART_MATCHES).length} exact mappings, ${Object.keys(guide.topics).length} illustrated openings.`);
