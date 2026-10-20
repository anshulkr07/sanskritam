// Learn trail checks (owner-approved structure, 2026-10-13):
// every Grammar guide topic and every graded Path lesson is placed, card
// lessons exist, stop states follow the in-order rule, routes are registered,
// Learn's screens keep square corners, and no meta disclaimer returns.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const mod = { exports: {} };
  cache.set(file, mod);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText;
  const req = (name) => {
    if (name === '../services/grammarGuide') return { loadGrammarProgress: async () => ({ read: new Set(), last: null }) };
    if (!name.startsWith('.')) return { default: {} };
    const base = path.resolve(path.dirname(file), name);
    for (const ext of ['.ts', '.tsx']) if (fs.existsSync(base + ext)) return load(base + ext);
    throw new Error(`cannot resolve ${name} from ${file}`);
  };
  new Function('require', 'module', 'exports', code)(req, mod, mod.exports);
  return mod.exports;
}

const { TRAIL, LIBRARY_TOPICS, LIBRARY_CARD_LESSONS, stageStops, TRAIL_COUNTS } = load(path.join(root, 'src/trail/course.ts'));
const { LEARNV2_LESSONS, LEARNV2_UNITS } = load(path.join(root, 'src/learnv2/catalogue.ts'));
const progress = load(path.join(root, 'src/trail/progress.ts'));
const inventory = JSON.parse(fs.readFileSync(path.join(root, '../specs/learn-v2/whole-course-inventory.json'), 'utf8'));

// Shape: 5 stages, 21 units, 97 lessons, unique ids.
assert.deepEqual(TRAIL_COUNTS, { stages: 5, units: 21, lessons: 97 });
const lessons = TRAIL.flatMap((s) => s.units.flatMap((u) => u.lessons));
assert.equal(new Set(lessons.map((l) => l.id)).size, lessons.length, 'lesson ids are unique');
assert.equal(new Set(TRAIL.flatMap((s) => s.units.map((u) => u.n))).size, 21, 'unit numbers are unique');
for (const l of lessons) {
  assert.ok(l.title.en && l.title.hi, `${l.id} has English and Hindi titles`);
  assert.ok(l.cards || l.topics.length || l.tool, `${l.id} opens something`);
  assert.ok(l.cards, `${l.id} must open the shared card player`);
  if (l.cards.startsWith('trail:')) assert.ok(l.topics.length, `${l.id} has complete guide sources for its cards`);
}

// Every guide topic is on the trail or in the Library; nothing unknown.
const guide = inventory.chapters.flatMap((c) => c.guide_topics.map((t) => t.id));
const placed = new Set([...lessons.flatMap((l) => l.topics), ...LIBRARY_TOPICS.tables, ...LIBRARY_TOPICS.advanced]);
assert.deepEqual(guide.filter((t) => !placed.has(t)), [], 'every guide topic is placed');
assert.deepEqual([...placed].filter((t) => !guide.includes(t)), [], 'no unknown topic ids');

// Every graded Path lesson is practice in exactly one unit.
const graded = TRAIL.flatMap((s) => s.units.flatMap((u) => u.graded));
assert.equal(graded.length, 49);
assert.equal(new Set(graded).size, 49, 'no graded lesson twice');
assert.deepEqual(new Set(graded), new Set(inventory.path_crosswalk.map((p) => p.feature_id)));

// Card lessons referenced exist; retired readings are gone from the catalogue.
const ids = new Set(LEARNV2_LESSONS.map((l) => l.id));
for (const id of [...lessons.map((l) => l.cards), ...LIBRARY_CARD_LESSONS]) assert.ok(ids.has(id) || lessons.some(l => l.cards === id && id.startsWith('trail:') && l.topics.length), `card lesson ${id} exists`);
assert.ok(![...ids].some((id) => id.startsWith('guide-art-')), 'guide-art readings are off the catalogue');
assert.equal(LEARNV2_UNITS.filter((u) => u.id.startsWith('verse-module-')).length, 12, 'the metre course stays in the Library');
assert.equal(LEARNV2_UNITS.filter((u) => u.id.startsWith('verse-module-')).flatMap((u) => u.lessonIds).length, 48);

// In-order stops: nothing done → first is current; done ones stay done.
const s2 = TRAIL.find((s) => s.id === 's2');
const none = { cardsDone: {}, topicsRead: new Set(), visited: new Set(), mastery: {} };
let st = progress.stageStatuses(s2, none);
const stops = stageStops(s2);
assert.equal(st.get(stops[0].lesson.id), 'current');
assert.ok(stops.slice(1).every((s) => st.get(s.lesson.id) === 'upcoming'));
st = progress.stageStatuses(s2, { ...none, cardsDone: { 'trail:unit-4-1': true, 'verbs-number': true } });
assert.equal(st.get(stops[0].lesson.id), 'done');
assert.equal(st.get(stops[1].lesson.id), 'current');
assert.equal(st.get('unit-5-1'), 'done', 'a finished card lesson is done wherever it sits');
st = progress.stageStatuses(s2, { ...none, topicsRead: new Set(['how-it-works', 'stem-ending']) });
assert.equal(st.get('unit-4-1'), 'current', 'source topic read marks cannot finish an independent card lesson');
st = progress.stageStatuses(s2, { ...none, cardsDone: { 'trail:unit-4-1': true } });
assert.equal(st.get('unit-4-1'), 'done', 'finishing a converted card deck completes its trail lesson');
assert.equal(st.get('unit-4-2'), 'current', 'the next card lesson unlocks');
assert.equal(progress.unitMastery(s2.units[0], { SG: 1, 'NOM.SG': 1, 'ACC.SG': 0.5, 'PRES.3SG': 0.5 }), 0.75);

// Routes the trail and Library navigate to are registered.
const app = fs.readFileSync(path.join(root, 'App.tsx'), 'utf8');
for (const name of ['LearnLibrary', 'LearnV2Lesson', 'GrammarTopic', 'GrammarChapter', 'Grammar', 'Lesson', 'Challenge', 'Paradigm', 'Varnamala', 'Writing', 'Pingala', 'Book', 'Vocab', 'WordLab', 'WordOrder']) {
  assert.ok(app.includes(`name="${name}"`), `route ${name} is registered`);
}
const tabs = fs.readFileSync(path.join(root, 'src/navigation/MainTabs.tsx'), 'utf8');
// The Learn tab is the trail unless the story preview flag is on (A1 wiring); the flag ships off.
assert.ok(/const storyEnabled = useStoryFlag\(\);/.test(tabs), 'the Learn tab reads the story preview flag');
assert.ok(/component=\{storyEnabled \? StoryNavigation : LearnTrailScreen\}/.test(tabs), 'the Learn tab is the trail when the story flag is off');
assert.equal((tabs.match(/LearnTrailScreen/g) || []).length, 2, 'the trail is imported once and used only as the flag-off Learn screen');
assert.ok(/export const STORY_COURSE_DEFAULT = true;/.test(fs.readFileSync(path.join(root, 'src/story/flags.ts'), 'utf8')), 'the owner-approved story course is the default; the legacy trail stays available');
const guideScreen = fs.readFileSync(path.join(root, 'src/screens/GrammarTopic.tsx'), 'utf8');
assert.ok(guideScreen.includes('CardLessonScreen'), 'all current and future guide topics use the card player');
assert.ok(!guideScreen.includes('ScrollView'), 'guide links cannot return to the old page UI');

// Square corners on every Learn surface (owner, 2026-10-13).
for (const file of ['src/trail/ui.tsx', 'src/trail/TrailMap.tsx', 'src/trail/TrailList.tsx', 'src/trail/Sheets.tsx', 'src/screens/LearnTrail.tsx', 'src/screens/LearnLibrary.tsx', 'src/screens/LearnV2Lesson.tsx', 'src/learnv2/LearnCard.tsx', 'src/learnv2/TeachingArt.tsx']) {
  assert.ok(!/borderRadius|radius\./.test(fs.readFileSync(path.join(root, file), 'utf8')), `${file} has no rounded corners`);
}

// No meta disclaimers in lesson text.
const cat = fs.readFileSync(path.join(root, 'src/learnv2/catalogue.ts'), 'utf8');
for (const needle of ['Local practice only', 'nothing is graded', 'stored as mastery', 'केवल स्थानीय अभ्यास', 'classroom analysis']) {
  assert.ok(!cat.includes(needle), `no disclaimer: ${needle}`);
}

console.log(`trail checks passed: ${TRAIL_COUNTS.stages} stages, ${TRAIL_COUNTS.units} units, ${TRAIL_COUNTS.lessons} lessons, ${guide.length} topics, ${graded.length} graded lessons`);
