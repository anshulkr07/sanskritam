// Coverage and behavior checks for the unified Learn catalogue.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname,'..');
const cache = new Map();
function load(file) {
  if(cache.has(file)) return cache.get(file).exports;
  const mod={exports:{}};cache.set(file,mod);
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const req=name=>load(path.resolve(path.dirname(file),name)+'.ts');
  new Function('require','module','exports',code)(req,mod,mod.exports);
  return mod.exports;
}
const {units}=load(path.join(root,'scripts/path-art-fixtures.ts'));
const {COURSE_CHAPTERS}=load(path.join(root,'src/learnv2/courseOutline.ts'));
const model=load(path.join(root,'src/learnv2/unified.ts'));
const inventory=JSON.parse(fs.readFileSync(path.join(root,'../specs/learn-v2/whole-course-inventory.json'),'utf8'));
assert.equal(COURSE_CHAPTERS.length,18);
const placed=COURSE_CHAPTERS.flatMap(ch=>model.chapterLessons(ch.id,units));
const originals=model.releasedLessons(units);
assert.equal(placed.length,49);
assert.equal(new Set(placed.map(l=>l.id)).size,49);
assert.deepEqual(new Set(placed.map(l=>l.feature_id)),new Set(inventory.path_crosswalk.map(l=>l.feature_id)));
assert.ok(placed.every(l=>originals.includes(l)),'IDs, params and object identity are retained');
assert.deepEqual(new Set(COURSE_CHAPTERS.flatMap(c=>c.topicIds)),new Set(inventory.chapters.flatMap(c=>c.guide_topics.map(t=>t.id))));
assert.equal(COURSE_CHAPTERS.flatMap(c=>model.chapterCards(c.id)).length,7);
const zero=units.map(u=>({...u,progress:0})).reverse();
assert.deepEqual([...model.unlockedUnitIds(zero)],['u1'],'locks depend on rank, not input ordering');
zero.find(u=>u.id==='u1').progress=.1;
assert.deepEqual([...model.unlockedUnitIds(zero)],['u1','u2']);
const draft={...originals[0],id:'staged',title_en:'[staged] Unreviewed'};
const parked={...originals[0],id:'parked',rank:900};
const future={...originals[0],id:'future',feature_id:'NEW-FEATURE'};
const extended=[{...units[0],lessons:[...units[0].lessons,draft,parked,future]}];
assert.ok(!model.releasedLessons(extended).some(l=>['staged','parked'].includes(l.id)));
assert.ok(model.releasedLessons(extended).some(l=>l.id==='future'),'new server lessons remain available to search and the complete course');
assert.equal(model.searchLearning(' VISARGA ',units,[]).lessons[0].feature_id,'VISARGA-SANDHI');
assert.equal(model.searchLearning('पठति',units,[]).cards[0].id,'verbs-number');
assert.equal(model.searchLearning('sandhi',units,[]).cards.length,6,'search includes all card lessons in the Sandhi course');
assert.equal(model.searchLearning('',units,[]).lessons.length,0);
const topic={id:'test',chapter_id:'sounds',title:{en:'Caf\u00e9',hi:'स्वर'},title_sa:'स्वर',title_iast:'svara',summary:{en:'Sounds',hi:'ध्वनियाँ'}};
assert.equal(model.searchLearning('Cafe\u0301',[],[topic]).topics[0].id,'test','search normalizes Unicode');
const app=fs.readFileSync(path.join(root,'App.tsx'),'utf8');
const tabs=fs.readFileSync(path.join(root,'src/navigation/MainTabs.tsx'),'utf8');
const tabNames=[...tabs.matchAll(/<Tab.Screen name="([^"]+)"/g)].map(m=>m[1]);
assert.deepEqual(tabNames,['Home','Learn','Conversation','Play','Read']);
const registered=new Set([...app.matchAll(/<Stack.Screen\s+name="([^"]+)"/g)].map(m=>m[1]));
for(const legacy of ['Path','Grammar','Lesson','GrammarChapter','GrammarTopic','LearnCards','LearnChapter','LearnV2Lesson'])assert.ok(registered.has(legacy),legacy);
for(const file of ['LearnHub.tsx','LearnChapter.tsx']){
 const source=fs.readFileSync(path.join(root,'src/screens',file),'utf8');
 for(const [,route] of source.matchAll(/navigation.navigate\("([^"]+)"/g))assert.ok(registered.has(route),`${file}: missing ${route}`);
}
console.log('PASS: 18 chapters, all 49 assessed lessons placed once, all 105 topic links, seven card lessons, rank-based locks, drafts excluded, Unicode search and five-tab/legacy-route coverage.');
