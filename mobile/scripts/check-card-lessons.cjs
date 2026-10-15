// Complete-content checks, using the actual backend guide rather than a
// miniature fixture. Requires the backend Python environment, like its tests.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function load(file, overrides = {}) {
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'module', 'exports', code)(name => {
    if (name in overrides) return overrides[name];
    throw new Error(`Unexpected runtime dependency ${name}`);
  }, mod, mod.exports);
  return mod.exports;
}
const { topicCards, guideCardLesson } = load('src/learnv2/guideCards.ts');
const { TRAIL } = load('src/trail/course.ts');
const { devanagariFormula, devanagariRules } = load('src/utils/sanskritDisplay.ts');
const catalogueSource = fs.readFileSync(path.join(root, 'src/learnv2/catalogue.ts'), 'utf8');
for (const match of catalogueSource.matchAll(/\biast:\s*"([^"]*)"/g)) {
  assert.ok(!/[\u0900-\u097f]/.test(match[1]), 'secondary IAST fields must remain Roman');
}
const backend = path.resolve(root, '../backend');
const python = process.env.PYTHON ?? path.join(backend, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'sanskrit-card-lessons-'));
let guide;
try {
  const output = path.join(temp, 'guide.json');
  execFileSync(python, ['-c', 'from app.services.grammar_guide import _build; import json,sys; from pathlib import Path; Path(sys.argv[1]).write_text(json.dumps(_build(),ensure_ascii=False),encoding="utf-8")', output], { cwd: backend, stdio: 'pipe' });
  guide = JSON.parse(fs.readFileSync(output, 'utf8'));
} finally { fs.rmSync(temp, { recursive: true, force: true }); }

let total = 0;
for (const topic of Object.values(guide.topics)) {
  const cards = topicCards(topic);
  total += cards.length;
  assert.equal(new Set(cards.map(c => c.id)).size, cards.length, `${topic.id}: stable unique card ids`);
  const byId = key => cards.find(c => c.id === `guide:${topic.id}:${key}`);
  assert.deepEqual(byId('intro').body, topic.summary);
  assert.deepEqual(byId('intro').term, topic.term ?? undefined);
  function checkBlock(block, key) {
    switch (block.kind) {
      case 'text': case 'analogy': case 'callout':
        assert.deepEqual(byId(key).body, block.text); break;
      case 'steps':
        block.items.forEach((item, i) => assert.deepEqual(byId(`${key}:${i}`).body, item)); break;
      case 'examples': case 'wild':
        block.items.forEach((ex, i) => {
          const card = byId(`${key}:${i}`);
          assert.deepEqual(card.guide.example, ex, 'audio, source and word glosses survive');
          assert.equal(card.example.sa, ex.sa);
          assert.equal(card.example.iast, ex.iast);
          assert.deepEqual(card.body, ex.source ?? { en: '', hi: '' });
        }); break;
      case 'formula':
        assert.deepEqual(byId(key).guide.sounds, [block.a, block.b, block.result]);
        assert.deepEqual(byId(key).body, block.rule); break;
      case 'table': {
        const slices = cards.filter(c => c.id.startsWith(`guide:${topic.id}:${key}:`) && c.guide?.block).map(c => c.guide.block);
        assert.ok(slices.every(b => b.rows.length <= 2 && b.columns.length <= 3), 'tables stay small');
        // Every original header and every cell survives, including the second
        // text column the old renderer silently folded away.
        block.columns.forEach(column => assert.ok(slices.some(b => b.columns.some(c => JSON.stringify(c) === JSON.stringify(column)))));
        block.rows.flat().forEach(cell => assert.ok(slices.some(b => b.rows.flat().some(c => JSON.stringify(c) === JSON.stringify(cell))), `${topic.id}: lost table cell`));
        if (block.note) assert.deepEqual(byId(`${key}:note`).body, block.note);
        break;
      }
      default: assert.fail(`Unchecked kind ${block.kind}`);
    }
  }
  topic.blocks.forEach((b, i) => checkBlock(b, `b${i}`));
  topic.deeper.forEach((d, i) => d.blocks.forEach((b, j) => checkBlock(b, `d${i}:${j}`)));
  topic.quiz.forEach((q, i) => {
    const practice = byId(`q${i}`).practice;
    assert.deepEqual(practice.prompt, q.prompt);
    assert.deepEqual(practice.explain, q.explain);
    assert.deepEqual(practice.choices.map(c => c.correct), q.options.map((_, j) => j === q.answer));
  });
  topic.proofs.forEach((proof, i) => assert.deepEqual(byId(`proof${i}`).guide.proof, proof));
  topic.terms.forEach((term, i) => {
    assert.equal(byId(`term${i}`).term.sa, term.term_sa);
    assert.deepEqual(byId(`term${i}`).term.meaning, term.meaning);
    assert.equal(byId(`term${i}`).guide.sanskrit.audio_url, term.audio_url);
  });
}
const lessons = TRAIL.flatMap(s => s.units.flatMap(u => u.lessons));
for (const lesson of lessons.filter(l => l.cards.startsWith('trail:'))) {
  const topics = lesson.topics.map(id => { assert.ok(guide.topics[id], `${lesson.id}: missing source ${id}`); return guide.topics[id]; });
  const deck = guideCardLesson(lesson.cards, topics, lesson.title);
  assert.ok(deck.cards.length > 0);
  assert.equal(new Set(deck.cards.map(c => c.id)).size, deck.cards.length);
  assert.deepEqual(deck.topicIds, lesson.topics, 'multi-topic lessons preserve all sources');
}
const future = { ...guide.topics.vowels, id: 'future-topic' };
assert.ok(topicCards(future).every(c => c.id.startsWith('guide:future-topic:')), 'future topics need no hand-built deck');
assert.throws(() => topicCards({ ...future, blocks: [{ kind: 'unsupported' }] }), /Unsupported guide block/, 'new block kinds cannot silently drop content');
assert.equal(devanagariFormula('a/ā + i/ī → e'), 'अ/आ + इ/ई → ए');
assert.equal(devanagariFormula('prefix a + ṛ → ār'), 'prefix अ + ऋ → आर्');
assert.equal(devanagariRules('The rule a + i → e joins two sounds.'), 'The rule अ + इ → ए joins two sounds.');
assert.equal(devanagariRules('Read a book. I like tea. https://example.com/a/i'), 'Read a book. I like tea. https://example.com/a/i');
assert.equal(devanagariRules('a meeting i gives e.'), 'अ meeting इ gives ए.');
assert.equal(devanagariRules('short a before a consonant'), 'short अ before a consonant');
assert.equal(devanagariRules('Meet a friend. A long walk. A meeting in a room.'), 'Meet a friend. A long walk. A meeting in a room.');
console.log(`Card checks passed: ${Object.keys(guide.topics).length} full topics, ${total} cards, ${lessons.length} trail lessons, future topics, Devanagari rules.`);

async function checkMigration() {
  const memory = new Map([['shabd.trail.v1.visited', JSON.stringify(['unit-3-3'])]]);
  const done = {};
  const oldRead = new Set(['how-it-works', 'stem-ending']);
  const progress = load('src/trail/progress.ts', {
    '../services/progressStorage': { progressStorage: { getItem: async key => memory.get(key) ?? null, setItem: async (key, value) => { memory.set(key, value); } } },
    '../services/grammarGuide': { loadGrammarProgress: async () => ({ read: oldRead }) },
    '../learnv2/progress': { markLearnV2LessonDone: async id => { done[id] = true; }, loadLearnV2DoneMap: async ids => Object.fromEntries(ids.map(id => [id, !!done[id]])) },
    './course': { TRAIL, stageStops: stage => stage.units.flatMap(unit => unit.lessons.map(lesson => ({ stage, unit, lesson }))) },
  });
  const first = await progress.loadTrailCardDoneMap();
  assert.equal(first['trail:unit-4-1'], true, 'completed multi-topic notes migrate');
  assert.equal(first['trail:unit-3-3'], true, 'old tool progress migrates');
  assert.equal(first['trail:unit-1-1'], false);
  oldRead.add('vowels');
  const later = await progress.loadTrailCardDoneMap();
  assert.equal(later['trail:unit-1-1'], false, 'new source read marks cannot auto-finish other card lessons');
  done['trail:unit-1-1'] = true;
  const afterFinish = await progress.loadTrailCardDoneMap();
  assert.equal(afterFinish['trail:unit-1-1'], true);
  assert.equal(afterFinish['trail:unit-1-2'], false, 'lessons sharing a source have independent completion');
  console.log('Card migration passed: historical progress preserved, new decks complete independently.');
}
checkMigration().catch(error => { console.error(error); process.exitCode = 1; });
