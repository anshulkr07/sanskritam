import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url), ts = require('typescript');
function load(file, imports = {}) {
 const module = {exports:{}};
 const code = ts.transpileModule(readFileSync(new URL('../src/story/' + file, import.meta.url),'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2020, esModuleInterop:true}}).outputText;
 new Function('require','module','exports','setTimeout','clearTimeout',code)(name => { if (name in imports) return imports[name]; throw Error(name); }, module, module.exports, ()=>0, ()=>{});
 return module.exports;
}
const {index, lessons} = JSON.parse(readFileSync(new URL('../src/story/__fixtures__/pack.json',import.meta.url),'utf8'));
const {derive, courseOrder} = load('state.ts');
const vowels = ['vowels.short','vowels.long','vowels.compound','vowels.signs'];
let state = derive(index, []);
assert.equal(state.current.lesson_id,'prologue'); assert.deepEqual(state.ghosts_freed,[]); assert.ok(state.leaves.every(l=>!l.recovered));
state=derive(index,['prologue',...vowels]); assert.equal(state.current.lesson_id,'vowels.check'); assert.equal(state.units.vowels.done,false);
state=derive(index,['prologue',...vowels,'vowels.check']); assert.equal(state.units.vowels.done,true); assert.deepEqual(state.ghosts_freed,['dhumaka']);
const units=index.acts.flatMap(a=>a.parts.flatMap(p=>p.units)), next=units[units.findIndex(u=>u.id==='vowels')+1];
if(next.status==='planned'){assert.equal(state.current,null);assert.equal(state.coming_soon,next.id);} else assert.equal(state.current.unit_id,next.id);
assert.equal(state.leaves[0].recovered,false);
assert.equal(courseOrder(index)[0].role,'prologue'); assert.ok(courseOrder(index).some(s=>s.role==='coming_soon'));
assert.deepEqual(derive(index,['unknown','prologue','prologue']).finished,['prologue']);
const recovered=structuredClone(index); recovered.acts[0].parts[0].units=[recovered.acts[0].parts[0].units[0]];
assert.equal(derive(recovered,['prologue',...vowels,'vowels.check']).leaves[0].recovered,true);
console.log('Story state parity cases passed');

const {parseMarkup}=load('markup.ts');
for (const lesson of Object.values(lessons)) for (const card of lesson.cards) {
 const visit=value=>{if(typeof value==='string' && value.includes('{{')) {const runs=parseMarkup(value); assert.ok(runs.every(r=>!r.text.includes('{{')&&!r.text.includes('}}')));} else if(value && typeof value==='object') Object.values(value).forEach(visit);}; visit(card);
}
assert.deepEqual(parseMarkup('A **bold {{अ}}**.'),[{text:'A ',sanskrit:false,bold:false},{text:'bold ',sanskrit:false,bold:true},{text:'अ',sanskrit:true,bold:true},{text:'.',sanskrit:false,bold:false}]);
console.log('All fixture inline text parsed without literal braces');

const {grade,shuffledIndices}=load('grade.ts');
let practiced=0;
for(const lesson of Object.values(lessons))for(const card of lesson.cards.filter(c=>c.kind==='practice')){
 const answer=card.mode==='choice'?card.options.findIndex(o=>o.correct):card.mode==='type'?card.answers[0]:card.mode==='order'?card.tokens:card.mode==='match'?card.pairs.map((_,i)=>i):null;
 if(card.mode!=='engine'){assert.equal(grade(card,answer),'correct',lesson.id+'#'+card.id);assert.equal(grade(card,'not an answer'),'incorrect');practiced++;}
}
const base=Object.values(lessons).flatMap(l=>l.cards).find(c=>c.kind==='practice');
assert.equal(grade({...base,mode:'type',accept:['é']},' e\u0301 '),'correct');
assert.deepEqual(shuffledIndices(3,()=>.99),[1,2,0]);
const engine=(kind,answer,item={})=>({...base,mode:'engine',exercise:{kind,answer,item}});
assert.equal(grade(engine('contrast',{pick:'a'}),{pick:'A'}),'correct');
assert.equal(grade(engine('derive_next',{code:'1.2.3'}),{code:'1.2.3'}),'correct');
assert.equal(grade(engine('sandhi_split',{first:'a',second:'b'}),{first:'b',second:'a'}),'off_by_one');
assert.equal(grade(engine('sandhi_join',{joined:'x'}),{joined:'y'}),'incorrect');
assert.equal(grade(engine('sandhi_join',{joined_options:['a','b']}),{joined:'x'}),'unsure');
assert.equal(grade(engine('scan_metre',{weights:[['L','G']]}),{weights:[['G','G']]}),'off_by_one');
assert.equal(grade(engine('reorder',{equivalent_orders:[['b','a']]}),{order:['b','a']}),'correct');
const grid=[{vibhakti:'p',vacana:'e',form:'a'},{vibhakti:'d',vacana:'e',form:'b'}];
assert.equal(grade(engine('grid_fill',grid),{cells:[...grid].reverse()}),'correct');
assert.equal(grade(engine('grid_fill',grid),{cells:[grid[0]]}),'unsure');
assert.equal(grade(engine('contrast',{pick:'a'},{abstained:true}),{pick:'b'}),'unsure');
console.log(practiced+' fixture practice cards and all seven engine grading kinds passed');

const {markResult,joinLetter,rhythmResult,splitEnding,roleResult,naturalOrder,allOrders,naturalOrders,swapWords,shuffled,clampIndex,factoryResult,nextStage,kindResult,stepChanged,clampSteps}=load('widgets/logic.ts');
for(const lesson of Object.values(lessons))for(const card of lesson.cards.filter(c=>c.kind==='explore')){
 if(card.widget==='mark_words'){const selected=card.params.passage.flatMap((w,i)=>card.params.targets.includes(w)?[i]:[]);assert.ok(markResult(card.params,selected).every(s=>s==='found'||s==='neutral'));assert.equal(markResult(card.params,[]).filter(s=>s==='missed').length,selected.length);}
 if(card.widget==='letter_builder')for(const target of card.params.targets){const possible=card.params.bases.flatMap(base=>[...card.params.signs,...card.params.halves].map(chip=>joinLetter(base,chip,card.params.halves)));assert.ok(possible.includes(target));assert.ok(card.params.iast[target]);}
 if(card.widget==='mouth_map')for(const letter of card.params.letters)assert.ok(card.params.places[letter].every(p=>card.params.place_names[p]));
 if(card.widget==='rhythm_tapper')for(const scan of card.params.scan){assert.equal(scan.weights.length,scan.syllables.length);assert.ok(rhythmResult(scan.weights,scan.weights));}
}
assert.equal(joinLetter('ष','क्',['क्']),'क्ष');assert.equal(joinLetter('क','ि',[]),'कि');
// form_explorer, role_arrows, word_shuffle: the logic that labels what the engine supplied
assert.deepEqual(splitEnding('देव','देवेन'),{head:'देव',tail:'ेन',shown:'◌ेन'});
assert.equal(splitEnding('देव','देवः').shown,'◌ः');assert.equal(splitEnding('बालक','बालकस्य').shown,'स्य');assert.equal(splitEnding('पठ्','पठति').shown,'ति');
assert.equal(splitEnding('नदी','नद्याः'),null);assert.equal(splitEnding('देव','देव').shown,'');
const sentence=[{role:'karta'},{role:'karma'},{role:'kriya'}];
assert.deepEqual(roleResult(sentence,{}),['unset','unset','verb']);assert.deepEqual(roleResult(sentence,{0:'karta',1:'karana'}),['correct','wrong','verb']);
assert.equal(allOrders(['a','b','c','d']).length,24);assert.equal(new Set(allOrders(['a','b','c','d']).map(o=>o.join('|'))).size,24);
assert.equal(naturalOrders(['a','b','c','च'],['च']).length,18);assert.equal(naturalOrder(['च','a'],['च']),false);assert.equal(naturalOrder(['a','च'],['च']),true);
assert.deepEqual(swapWords(['a','b','c'],0,2),['c','b','a']);
assert.notDeepEqual(shuffled(['a','b','c'],()=>0),['a','b','c']);assert.deepEqual(shuffled(['a'],()=>0),['a']);
// time_slider, word_factory, compound_unpacker, derivation_stepper logic
assert.equal(clampIndex(-1,3),0);assert.equal(clampIndex(5,3),2);assert.equal(clampIndex(1,3),1);
assert.equal(factoryResult({'गम्|ktvA':'गत्वा'},'गम्','ktvA'),'गत्वा');assert.equal(factoryResult({},'गम्','ktvA'),null);
assert.equal(nextStage(0),1);assert.equal(nextStage(1),2);assert.equal(nextStage(2),2);
assert.equal(kindResult('dvandva',null),'unset');assert.equal(kindResult('dvandva','dvandva'),'correct');assert.equal(kindResult('dvandva','tatpurusha'),'wrong');
const derived=[{result:'भू'},{result:'भू + ल्'},{result:'भू + ल्'}];assert.equal(stepChanged(derived,0),true);assert.equal(stepChanged(derived,1),true);assert.equal(stepChanged(derived,2),false);
assert.equal(clampSteps(0,20),1);assert.equal(clampSteps(25,20),20);
console.log('Four widget fixture cases passed');

const memory=new Map();const storage={getItem:async key=>memory.get(key)??null,setItem:async(key,value)=>{memory.set(key,value);},getAllKeys:async()=>[...memory.keys()],multiRemove:async keys=>keys.forEach(k=>memory.delete(k))};
let online=true;const calls=[];class ApiError extends Error{constructor(status){super(String(status));this.status=status;}}
const client={ApiError,request:async(path,init={})=>{if(!online)throw new ApiError(0);calls.push({path,...init});if(path==='/learn/index'){if(init.headers?.['If-None-Match'])throw new ApiError(304);return index;}if(path.startsWith('/learn/lessons/'))return lessons[decodeURIComponent(path.split('/').pop())];return {};}};
const cache=load('cache.ts',{'@react-native-async-storage/async-storage':storage,'../api/client':client});
const images=[];const api=load('api.ts',{'../api/client':client,'./cache':cache,'../services/artworkCache':{prefetchArtwork:uris=>images.push(...uris)},'./artwork':{resolvePicture:p=>p}});
assert.deepEqual(await api.getIndex(),index);assert.deepEqual(await api.getIndex(),index);assert.ok(calls.some(c=>c.headers?.['If-None-Match']==='"'+index.version+'"'));
await api.prefetchLessons([index.course.prologue,...index.acts[0].parts[0].units[0].lessons],false);
online=false;
assert.deepEqual(await api.getIndex(),index);
for(const id of ['prologue',...vowels.slice(0,2)])assert.equal((await api.getLesson(id,lessons[id].hash)).id,id);
assert.equal(derive(await api.getIndex(),[]).current.lesson_id,'prologue');
await storage.setItem('story.lesson.vowels.short.older','{}');await storage.setItem('story.lesson.vowels.short.extra.hash','{}');await cache.saveLesson(lessons['vowels.short']);
assert.equal(memory.has('story.lesson.vowels.short.older'),false);assert.equal(memory.has('story.lesson.vowels.short.extra.hash'),true);
let recorded=[];const finish=load('finish.ts',{'./cache':cache,'./selectors':load('selectors.ts'),'./state':{derive},'./course':{getCourseSnapshot:()=>({index:null,state:null}),recordFinishes:async ids=>{recorded.push(...ids);await cache.mergeFinishes(ids);}}});
const progress=Object.fromEntries(lessons['vowels.short'].cards.filter(c=>c.kind==='practice').map(c=>[c.id,{first:'correct',latest:'correct',solved:true}]));
await finish.finishLesson('vowels.short',progress);await cache.flushOutbox();let queue=await cache.readOutbox();assert.equal(queue.length,2);assert.deepEqual(queue.map(w=>w.path),['/progress/card-lesson','/learn/attempts']);assert.equal(queue[1].body.results.length,4);assert.deepEqual(recorded,['vowels.short']);assert.ok(queue[0].tries>0);assert.ok(queue[0].next>Date.now());
const originalNow=Date.now;const future=originalNow()+600000;Date.now=()=>future;online=true;await cache.flushOutbox();assert.equal((await cache.readOutbox()).length,0);assert.deepEqual(calls.filter(c=>c.method==='POST').map(c=>c.path),['/progress/card-lesson','/learn/attempts']);
await cache.enqueueWrites([{path:'/expired',body:{}}]);Date.now=()=>future+8*86400000;await cache.flushOutbox();assert.equal((await cache.readOutbox()).length,0);assert.ok(!calls.some(c=>c.path==='/expired'));Date.now=originalNow;
await Promise.all(Array.from({length:20},(_,i)=>cache.mergeFinishes(['lesson.'+i])));assert.equal((await cache.localFinishes()).length,21);
console.log('Offline index/map/next-three cache, ETag, hash cleanup, ordered finish posts, backoff, expiry and concurrent finishes passed');

const engineFixtures=JSON.parse(readFileSync(new URL('../src/story/__fixtures__/engine.json',import.meta.url),'utf8'));
for(const exercise of engineFixtures){const card={...base,mode:'engine',exercise};const answer=exercise.kind==='grid_fill'?{cells:exercise.answer}:exercise.kind==='reorder'?{order:exercise.answer.equivalent_orders[0]}:exercise.answer;assert.equal(grade(card,answer),'correct',exercise.kind);}
console.log('All seven real backend-generated engine fixtures grade correctly');

// Home unit-check label, end-of-course state and the scan_metre verse (pure logic behind the screens)
const sel=load('selectors.ts');
assert.equal(sel.testOutLabel(1).en,'I know these letters: take the unit check');assert.ok(sel.testOutLabel(1).hi.includes('अक्षर'));
for(const act of [2,3,4,5,undefined]){assert.equal(sel.testOutLabel(act).en,'I know this unit: take the unit check');assert.ok(!/letters/i.test(sel.testOutLabel(act).en)&&!sel.testOutLabel(act).hi.includes('अक्षर'));}
assert.equal(sel.currentContext(index,derive(index,[])).unit.id,'vowels','during the prologue the road shows the first unit');
assert.equal(sel.courseComplete(index,derive(index,['prologue',...vowels,'vowels.check'])),false,'planned units ahead means the course is not complete');
const whole=structuredClone(index);whole.acts=[whole.acts[0]];whole.acts[0].parts=[whole.acts[0].parts[0]];whole.acts[0].parts[0].units=[whole.acts[0].parts[0].units[0]];
const wholeDone=derive(whole,['prologue',...vowels,'vowels.check']),wholeMid=derive(whole,['prologue',...vowels]);
assert.equal(wholeDone.current,null);assert.equal(wholeDone.coming_soon,null);
assert.equal(sel.courseComplete(whole,wholeDone),true);assert.equal(sel.currentContext(whole,wholeDone),undefined,'a finished course has no unit to be "here"');
assert.equal(sel.courseComplete(whole,wholeMid),false);assert.equal(sel.currentContext(whole,wholeMid).unit.id,'vowels');
assert.equal(sel.courseComplete(whole,derive(whole,[])),false);
const empty={...whole,acts:[],course:null};assert.equal(sel.courseComplete(empty,derive(empty,[])),false,'an empty index is not a finished course');
const metre=load('metre.ts'),scanned=engineFixtures.find(x=>x.kind==='scan_metre'),scanLines=scanned.item.syllables;
const verse=metre.verseLayout(scanned.item.text,scanLines);
assert.deepEqual(verse[0].map(w=>w.map(c=>c.sa).join('')),scanned.item.text.split(' '));assert.deepEqual(verse[0].map(w=>w.length),[4,4,4,4]);assert.deepEqual(verse.flat(2).map(c=>c.i),[...Array(16).keys()]);
const kss=metre.verseLayout('कामदेवावतारोऽयं राजञ्जातस्तवात्मजः',[['का','म','दे','वा','व','ता','रो','यं','रा','ज','ञ्जा','त','स्त','वा','त्म','जः']]);
assert.deepEqual(kss[0].map(w=>w.length),[8,8],'the avagraha is not a syllable');
assert.deepEqual(metre.verseLayout('अ आ इ ई',[['अ','आ'],['इ','ई']]).map(l=>l.map(w=>w.map(c=>c.i))),[[[0],[1]],[[2],[3]]]);
for(const [text,lines] of [[undefined,[['अ','इ']]],['',[['अ','इ']]],['अ आ',[['अ','इ']]],['अइ उ',[['अ','इ']]],['अ इ उ',[['अ','इ']]],['अ इ',[['अ'],['इ']]],['अइ',[['अ'],['इ']]]]){const out=metre.verseLayout(text,lines);assert.deepEqual(out.map(l=>l.length),lines.map(()=>1),String(text));assert.deepEqual(out.flat(2).map(c=>c.sa),lines.flat(),'the whole verse stays visible when words and syllables disagree');}
assert.equal(metre.weightMark(0),'◡');assert.equal(metre.weightMark(1),'—');
assert.deepEqual(metre.weightsFromOrder([['अ','इ'],['उ']],[0,1,0]),[['L','G'],['L']]);assert.equal(metre.orderFromWeights(undefined),null);assert.equal(metre.orderFromWeights(['L']),null);assert.deepEqual(metre.orderFromWeights([['L','G'],['G']]),[0,1,1]);
const scanOrder=metre.orderFromWeights(scanned.answer.weights),scanCard=engine('scan_metre',scanned.answer,scanned.item);
assert.deepEqual(metre.weightsFromOrder(scanLines,scanOrder),scanned.answer.weights);assert.equal(grade(scanCard,{weights:metre.weightsFromOrder(scanLines,scanOrder)}),'correct');
assert.equal(grade(scanCard,{weights:metre.weightsFromOrder(scanLines,scanOrder.map((w,i)=>i===0?1-w:w))}),'off_by_one');
console.log('Unit-check label, course-complete state and scan_metre verse layout and submit payload passed');

if(process.argv.includes('--backend'))await checkRealBackend();
async function checkRealBackend(){
 const fs=await import('node:fs'),path=await import('node:path'),{fileURLToPath}=await import('node:url'),{spawn}=await import('node:child_process');
 const mobile=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),temporary=fs.mkdtempSync(path.join(mobile,'src/story/.backend-'));
 const child=spawn(path.join(mobile,'../backend/.venv/Scripts/python.exe'),['-X','utf8',path.join(mobile,'src/story/__fixtures__/backend_bridge.py')],{cwd:path.join(mobile,'../backend'),env:{...process.env,PYTHONUTF8:'1',DB_PATH:path.join(temporary,'test.db')},windowsHide:true,stdio:['ignore','pipe','pipe']});
 let stderr='';child.stderr.on('data',data=>{stderr+=data.toString();});
 try{
 const port=await new Promise((resolve,reject)=>{let text='';const timeout=setTimeout(()=>reject(Error('Backend bridge startup timed out: '+stderr)),60000);child.stdout.on('data',data=>{text+=data;for(const line of text.split(/\r?\n/)){try{const parsed=JSON.parse(line);if(parsed.port){clearTimeout(timeout);resolve(parsed.port);return;}}catch{}}});child.on('exit',code=>{clearTimeout(timeout);reject(Error('Bridge exited '+code+': '+stderr));});});
 let connected=true;const actualPosts=[];const actualClient={ApiError,request:async(url,init={})=>{if(!connected)throw new ApiError(0);const response=await fetch('http://127.0.0.1:'+port+url,{...init,headers:{'Content-Type':'application/json',...init.headers}});if(!response.ok)throw Error(url+': '+response.status+' '+await response.text());if(init.method==='POST')actualPosts.push(url);return response.json();}};
 const data=new Map(),native={getItem:async k=>data.get(k)??null,setItem:async(k,v)=>{data.set(k,v);},getAllKeys:async()=>[...data.keys()],multiRemove:async keys=>keys.forEach(k=>data.delete(k))};
 const actualCache=load('cache.ts',{'@react-native-async-storage/async-storage':native,'../api/client':actualClient});
 const actualIndex=await actualClient.request('/learn/index');let snapshot={index:actualIndex,state:derive(actualIndex,[])};
 const actualCourse={getCourseSnapshot:()=>snapshot,recordFinishes:async ids=>{const finished=await actualCache.mergeFinishes(ids);snapshot={index:actualIndex,state:derive(actualIndex,finished)};}};
 const completion=load('finish.ts',{'./cache':actualCache,'./course':actualCourse,'./state':{derive},'./selectors':load('selectors.ts')});
 await completion.finishLesson('prologue',{});await actualCache.flushOutbox();
 assert.equal((await actualClient.request('/learn/state')).current.unit_id,'vowels');
 connected=false;const progress=Object.fromEntries(lessons['vowels.check'].cards.filter(c=>c.kind==='practice').map(c=>[c.id,{first:'correct',latest:'correct',solved:true}]));
 const result=await completion.finishLesson('vowels.check',progress,'vowels');await actualCache.flushOutbox();assert.equal(result.unitId,'vowels');assert.equal(snapshot.state.units.vowels.done,true);assert.equal((await actualCache.readOutbox()).length,3);
 connected=true;const before=Date.now;Date.now=()=>before()+600000;try{await actualCache.flushOutbox();}finally{Date.now=before;}
 assert.deepEqual(actualPosts.slice(-3),['/progress/card-lesson','/learn/attempts','/learn/test-out']);
 const state=await actualClient.request('/learn/state');assert.equal(state.units.vowels.done,true);assert.ok(state.ghosts_freed.includes('dhumaka'));assert.equal((await actualCache.receiptFor('vowels.check')).xp,10);
 await actualClient.request('/_qa/make-due',{method:'POST'});
 const actualApi={getReview:()=>actualClient.request('/learn/review?limit=12')};const review=load('review.ts',{'@react-native-async-storage/async-storage':native,'./api':actualApi,'./cache':actualCache});
 const session=await review.loadReview();assert.ok(session.items.length>0);const answers=Object.fromEntries(session.items.map((_,i)=>['review-'+i,{first:'correct',latest:'correct',solved:true}]));connected=false;await review.finishReview(session,answers);await actualCache.flushOutbox();assert.ok((await actualCache.readOutbox()).every(write=>write.path==='/learn/attempts'));connected=true;const now=Date.now;Date.now=()=>now()+600000;try{await actualCache.flushOutbox();}finally{Date.now=now;}
 assert.equal((await actualClient.request('/learn/review?limit=12')).items.length,0);
 fs.writeFileSync(path.join(mobile,'src/story/__fixtures__/backend-verification.json'),JSON.stringify({backend:'FastAPI TestClient with isolated SQLite',testOut:'passed after offline replay',ghostFreed:'dhumaka',reviewItems:session.items.length,reviewAfter:0,orderedPosts:actualPosts},null,2));
 console.log('REAL FastAPI: offline test-out replay, Dhūmaka freed, earned XP, and offline review replay passed');
 }finally{if(child.exitCode===null){const closed=new Promise(resolve=>child.once('close',resolve));child.kill();await closed;}if(path.dirname(temporary)!==path.join(mobile,'src/story'))throw Error('Unexpected QA folder');fs.rmSync(temporary,{recursive:true,force:true,maxRetries:8,retryDelay:150});}
}

// Optional browser acceptance harness. It bundles the production TSX with web
// adapters for native platform services; generated harness sources are removed.
if(process.argv.includes('--visual')) await visualChecks();
async function visualChecks(){
 const fs=await import('node:fs'), path=await import('node:path'), {fileURLToPath}=await import('node:url'), http=await import('node:http');
 const mobile=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
 const temp=fs.mkdtempSync(path.join(mobile,'src/story/.preview-'));
 const out=path.join(mobile,'src/story/__fixtures__/screenshots');fs.mkdirSync(out,{recursive:true});
 const put=(name,body)=>{const file=path.join(temp,name);fs.writeFileSync(file,body);return file;};
 let server,browser;
 try {
 const loader=put('loader.cjs',"const ts=require('typescript');module.exports=function(s){return ts.transpileModule(s,{compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;};");
 const native=put('native.tsx',"import React from 'react';import {View} from 'react-native';export const SafeAreaView=View;export const useSafeAreaInsets=()=>({top:0,bottom:0,left:0,right:0});export function useNavigation(){return {navigate:(name,params)=>window.storyNavigate(name,params),goBack:()=>window.storyNavigate('StoryHome')}};export const useFocusEffect=()=>{};export const Ionicons=()=>null;export const useReducedMotion=()=>true;export const useTypeScale=()=>({sized:n=>n*Number(localStorage.getItem('qa.scale')||1)});export const useAskContext=()=>{};");
 const guide=put('guide.ts',"import {useSyncExternalStore} from 'react';let lang='en';const listeners=new Set();export function useGuideLang(){const value=useSyncExternalStore(fn=>{listeners.add(fn);return()=>listeners.delete(fn)},()=>lang,()=>lang);return {lang:value,t:bi=>bi?.[value]||'',setLang:l=>{lang=l;listeners.forEach(f=>f())}};}");
 const storage=put('storage.ts',"export default {getItem:async k=>localStorage.getItem(k),setItem:async(k,v)=>localStorage.setItem(k,v),getAllKeys:async()=>Object.keys(localStorage),multiRemove:async keys=>keys.forEach(k=>localStorage.removeItem(k))};");
 const client=put('client.ts',"export class ApiError extends Error {constructor(public status:number){super(String(status));}}export const api={};export async function request(path,init={}){if(localStorage.getItem('qa.offline')==='true')throw new ApiError(0);const response=await fetch(path,{...init,headers:{'Content-Type':'application/json',...init.headers}});if(!response.ok)throw new ApiError(response.status);return response.json();}");
 const stub=put('stub.tsx',"export default function Stub(){return null;}export const Skeleton=()=>null;export const lessonArtworkSources=()=>[];export const getLearnV2Lesson=()=>null;export const loadCardLesson=()=>null;export const haptics={tap(){},correct(){}};export const findStopByCards=()=>null;export const stopAfter=()=>null;export const IconButton=()=>null;export const LangSwitch=()=>null;export const PrimaryButton=()=>null;export const Segments=()=>null;export const TextButton=()=>null;export const prefetchArtwork=()=>{};");
 const artwork=put('artwork.tsx',"export {Image as ArtworkImage} from 'react-native';");
 const entry=put('entry.tsx',"import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import {View,ScrollView} from 'react-native';import pack from '../__fixtures__/pack.json';import StoryCardView from '../cards';import StoryLessonScreen,{StoryLessonPlayer} from '../screens/StoryLesson';import StoryHome,{JourneyMap,StoryHomeView} from '../screens/StoryHome';import {derive} from '../state';import {lessonSummaries} from '../api';import {UnitEndView,LeafShelfView,GhostsView,Cast} from '../screens/Collections';import StoryReview from '../screens/StoryReview';import Settings from '../Settings';import {useStoryFlag} from '../flags';import {setStoryAppearance,useStoryTheme} from '../theme';import {useGuideLang} from '../../hooks/useGuide';import {RomanContext} from '../text';function App(){const [mode,setMode]=useState('home'),[lesson,setLesson]=useState('vowels.short'),[cardId,setCard]=useState('s1'),[progress,setProgress]=useState({}),[done,setDone]=useState(false),[point,setPoint]=useState('new');const fixtureState=derive(pack.index,point==='new'?[]:point==='mid'?['prologue','vowels.short']:['prologue',...pack.index.acts[0].parts[0].units[0].lessons.map(l=>l.id),'vowels.check']);const fixtureSummary=lessonSummaries(pack.index).find(l=>l.id===fixtureState.current?.lesson_id);const enabled=useStoryFlag(),theme=useStoryTheme(),{setLang}=useGuideLang();window.storyNavigate=(name,params)=>{if(name==='StoryLesson'){setLesson(params.lessonId);setMode('route');setDone(false);}else if(name==='StoryMap')setMode('map');else if(name==='StoryReview')setMode('review');else setMode('home');};window.qa={fixture:(mode,point)=>{setPoint(point);setMode(mode);},showCard:(id,card)=>{setLesson(id);setCard(card);setProgress({});setMode('card');},showLesson:id=>{setLesson(id);setMode('lesson');setDone(false);},show:mode=>setMode(mode),theme:setStoryAppearance,lang:setLang,enabled};const l=pack.lessons[lesson],card=l.cards.find(c=>c.id===cardId)||l.cards[0];return <View style={{flex:1,backgroundColor:theme.paper}}><div id='qa-state' data-theme={theme.dark?'dark':'light'} data-enabled={enabled} data-done={done}/>{mode==='review'?<StoryReview/>:mode==='fixtureHome'?<StoryHomeView index={pack.index} state={fixtureState} summary={fixtureSummary} lesson={pack.lessons[fixtureSummary?.id]} onLesson={()=>{}} onMap={()=>setMode('map')} onLeaves={()=>setMode('leaves')} onGhosts={()=>setMode('ghosts')} onReview={()=>{}} onCast={()=>setMode('cast')} onLibrary={()=>{}}/>:mode==='unitEnd'?<UnitEndView index={pack.index} state={fixtureState} unitId='vowels' receipt={{xp:10}} onGhosts={()=>setMode('ghosts')} onContinue={()=>setMode('fixtureHome')}/>:mode==='leaves'?<LeafShelfView index={pack.index} state={fixtureState} onBack={()=>setMode('home')} onLeaf={()=>{}}/>:mode==='ghosts'?<GhostsView index={pack.index} state={fixtureState} onBack={()=>setMode('home')}/>:mode==='cast'?<Cast/>:mode==='settings'?<Settings/>:mode==='home'?<StoryHome autoStart={false}/>:mode==='map'?<JourneyMap/>:mode==='flag'?<div>{enabled?<StoryHome autoStart={false}/>:<span>Legacy Learn</span>}</div>:mode==='route'?<StoryLessonScreen route={{params:{lessonId:lesson}}} navigation={{goBack:()=>setMode('home'),push:(name,params)=>window.storyNavigate(name,params)}}/>:mode==='lesson'?<StoryLessonPlayer key={lesson} lesson={l} characters={pack.index.characters} onClose={()=>setDone(true)}/>:<ScrollView style={{flex:1}} contentContainerStyle={{padding:16,gap:12}}><RomanContext.Provider value={card.kind!=='practice'||card.roman==='show'||!!progress[card.id]}><StoryCardView key={lesson+cardId} card={card} characters={pack.index.characters} progress={progress[card.id]} onAnswer={verdict=>setProgress(old=>({...old,[card.id]:{first:old[card.id]?.first??verdict,latest:verdict,solved:old[card.id]?.solved||verdict==='correct'}}))}/></RomanContext.Provider></ScrollView>}</View>;}createRoot(document.getElementById('root')).render(<App/>);");
 const alias={'react-native$':'react-native-web','@react-native-async-storage/async-storage$':storage,'react-native-safe-area-context$':native,'@react-navigation/native$':native,'@react-native-vector-icons/ionicons$':native,'react-native-youtube-iframe$':stub};
 for(const name of ['hooks/useTypeScale','hooks/useGuide','hooks/useReducedMotion','ask/AskProvider','api/client','components/artwork/ArtworkImage','services/artworkCache','components/FetchError','components/Skeleton','learnv2/LearnCard','learnv2/catalogue','learnv2/loadLesson','learnv2/progress','services/haptics','services/grammarGuide','trail/course','trail/progress','trail/ui','utils/streak']){alias[path.join(mobile,'src',name)]=name==='hooks/useGuide'?guide:name==='api/client'?client:name==='components/artwork/ArtworkImage'?artwork:name==='hooks/useTypeScale'||name==='hooks/useReducedMotion'||name==='ask/AskProvider'||name==='components/Skeleton'?native:stub;}
 const webpack=require('webpack');
 await new Promise((resolve,reject)=>webpack({mode:'development',context:mobile,entry,output:{path:temp,filename:'bundle.js'},devtool:false,resolve:{extensions:['.web.tsx','.web.ts','.tsx','.ts','.web.js','.js','.json'],alias},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:loader}]},plugins:[new webpack.DefinePlugin({__DEV__:'false','process.env.NODE_ENV':JSON.stringify('development')})],performance:{hints:false}},(err,stats)=>err?reject(err):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve()));
 const fonts=['Mukta_400Regular','Mukta_600SemiBold','Mukta_700Bold','TiroDevanagariSanskrit_400Regular'];const fontFiles=fonts.map(name=>require.resolve(name.startsWith('Mukta')?'@expo-google-fonts/mukta/'+name.split('_')[1]+'/'+name+'.ttf':'@expo-google-fonts/tiro-devanagari-sanskrit/400Regular/'+name+'.ttf'));
 const css=fonts.map((name,i)=>'@font-face{font-family:'+name+';src:url(/font/'+i+')}').join('');
 const html='<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><style>'+css+'html,body,#root{margin:0;width:100%;height:100%;}#root{display:flex;flex-direction:column}*{box-sizing:border-box}</style><div id=root></div><script src=/bundle.js></script>';
 const serverFinished=new Set(),posts=[];
 server=http.createServer(async(req,res)=>{const url=req.url;
 if(url==='/bundle.js'){res.setHeader('Content-Type','application/javascript');res.end(fs.readFileSync(path.join(temp,'bundle.js')));return;}
 if(url.startsWith('/font/')){res.end(fs.readFileSync(fontFiles[Number(url.split('/').pop())]));return;}
 if(url.startsWith('/learn/')||url==='/progress/card-lesson'){
  res.setHeader('Content-Type','application/json');if(req.method==='POST'){let body='';for await(const chunk of req)body+=chunk;const data=JSON.parse(body);posts.push({path:url,body:data});if(url==='/progress/card-lesson')serverFinished.add(data.lesson_id);res.end('{}');return;}
  if(url.startsWith('/learn/review')){res.end(JSON.stringify({due_count:1,items:[{item_key:'qa',lesson_id:'vowels.short',lesson_title:lessons['vowels.short'].title,due_at:'2026-01-01',card:lessons['vowels.short'].cards.find(c=>c.kind==='practice'&&c.mode==='choice')}]}));return;}
  if(url==='/learn/index'){if(req.headers['if-none-match']){res.statusCode=304;res.end();}else res.end(JSON.stringify(index));return;}
  if(url==='/learn/state'){res.end(JSON.stringify(derive(index,serverFinished)));return;}
  if(url.startsWith('/learn/lessons/')){res.end(JSON.stringify(lessons[decodeURIComponent(url.split('/').pop())]));return;}
 }
 res.setHeader('Content-Type','text/html');res.end(html);
 });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const runtime=process.env.CODEX_NODE_MODULES||'C:/Users/AnshulKumar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
 const {chromium}=require(path.join(runtime,'playwright'));browser=await chromium.launch({headless:true,channel:process.env.STORY_BROWSER_CHANNEL||'msedge'});const context=await browser.newContext({viewport:{width:360,height:800},deviceScaleFactor:1});const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>!!window.qa);await page.evaluate(()=>document.fonts.ready);
 console.log('Browser preview ready at 360px');
 // Acceptance steps are below; production components remain interactive.
 await runBrowserCases({page,out,posts,errors,fs,path});
 } finally {if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));if(path.dirname(temp)!==path.join(mobile,'src/story'))throw Error('Unexpected temporary directory');fs.rmSync(temp,{recursive:true,force:true,maxRetries:8,retryDelay:150});}
}
async function runBrowserCases({page,out,posts,errors,fs,path}){
 const showCard=async(id,card)=>{await page.evaluate(([id,card])=>window.qa.showCard(id,card),[id,card]);await page.waitForTimeout(45);};
 const button=(name,scope=page)=>scope.getByRole('button',{name,exact:true});
 const shot=async name=>{await page.waitForFunction(()=>[...document.images].every(i=>i.complete),{},{timeout:15000});return page.screenshot({path:path.join(out,name+'-360.png'),fullPage:true});};
 await page.waitForFunction(()=>Object.keys(localStorage).filter(k=>k.startsWith('story.lesson.')).length>=3);
 await page.evaluate(()=>window.qa.show('settings'));await page.getByRole('switch',{name:'Try the new Learn (preview)'}).click();await page.waitForFunction(()=>window.qa.enabled===true);await page.reload();await page.waitForFunction(()=>window.qa?.enabled===true);
 await page.evaluate(()=>window.qa.show('flag'));assert.equal(await page.getByText('Legacy Learn',{exact:true}).count(),0);
 await page.evaluate(()=>window.qa.show('settings'));await page.getByRole('switch',{name:'Try the new Learn (preview)'}).click();await page.waitForFunction(()=>window.qa.enabled===false);
 await page.evaluate(()=>window.qa.show('flag'));assert.equal(await page.getByText('Legacy Learn',{exact:true}).count(),1);
 await page.evaluate(()=>window.qa.show('settings'));await page.getByRole('radio',{name:'Dark',exact:true}).click();await page.reload();await page.waitForFunction(()=>!!window.qa && document.querySelector('#qa-state').dataset.theme==='dark');
 console.log('Live preview toggle and appearance persistence passed');
 // The API adapter simulates a disconnected network; HTML is served locally.
 await page.evaluate(()=>{localStorage.setItem('story.finished.v1',JSON.stringify(['prologue']));localStorage.setItem('qa.offline','true');});await page.reload();await page.waitForFunction(()=>!!window.qa);await button('Continue the story').waitFor();await button('Map').click();await page.getByText('Coming soon',{exact:true}).first().waitFor();await page.waitForTimeout(250);const firstStop=await button(index.acts[0].parts[0].units[0].title.en).boundingBox(),secondStop=await button(index.acts[0].parts[0].units[1].title.en+' · Coming soon').boundingBox();assert.ok(firstStop.y+firstStop.height<=secondStop.y,'Map cards must not overlap after measuring the current card');for(const u of index.acts.flatMap(a=>a.parts.flatMap(p=>p.units)))assert.equal(await button(u.title.en+(u.status==='planned'?' · Coming soon':'')).count(),1,u.id);await button(index.acts[0].parts[0].units[0].title.en).click();await button('1 · '+lessons['vowels.short'].title.en).click();await page.getByText(lessons['vowels.short'].cards[0].title.en,{exact:true}).waitFor();
 await page.evaluate(()=>localStorage.removeItem('qa.offline'));
 console.log('Offline reload opens home, map, and cached vowels.short through production data layer');
 for(const theme of ['light','dark']){
  await page.evaluate(theme=>window.qa.theme(theme),theme);await page.waitForSelector('#qa-state[data-theme='+theme+']',{state:'attached'});
  for(const point of ['new','mid','done']){await page.evaluate(point=>window.qa.fixture('fixtureHome',point),point);await page.waitForTimeout(100);await shot('home-'+point+'-'+theme);}
  await page.evaluate(()=>window.qa.fixture('unitEnd','done'));await page.getByText('Ghost freed',{exact:true}).waitFor();await shot('unit-end-'+theme);await button('See ghosts freed').click();await page.getByText('✓ Freed',{exact:true}).waitFor();await shot('ghosts-'+theme);await page.evaluate(()=>window.qa.fixture('leaves','done'));await page.getByText('0/7',{exact:true}).waitFor();await shot('leaves-'+theme);await page.evaluate(()=>window.qa.show('cast'));await shot('cast-'+theme);
  await page.evaluate(()=>window.qa.show('review'));await page.getByTestId('lesson-card-0').waitFor();await shot('review-'+theme);
  const captured=new Set();
  for(const [id,l] of Object.entries(lessons))for(const card of l.cards){await showCard(id,card.id);assert.equal(await page.locator('body').innerText().then(s=>s.includes('{{')),false,id+'#'+card.id);const kind=card.kind==='practice'?card.mode:card.kind;if(!captured.has(kind)){captured.add(kind);await shot('card-'+kind+'-'+theme);}}
  // Two-way mouth highlighting, including a vowel with two places.
  await showCard('vowels.compound','e1');await button('ए').click();const selectedColor=theme==='light'?'rgb(166, 61, 23)':'rgb(232, 135, 92)';assert.equal(await button('throat').evaluate(el=>getComputedStyle(el).borderTopColor),selectedColor);assert.equal(await button('palate').evaluate(el=>getComputedStyle(el).borderTopColor),selectedColor);await button('lips').click();assert.equal(await button('ओ').evaluate(el=>getComputedStyle(el).borderTopColor),selectedColor);await shot('mouth_map-'+theme);
  // Wrong and missed selections are explicit, and IAST appears only after Check.
  await showCard('vowels.short','e2');assert.equal(await page.getByText('uṣā',{exact:true}).count(),0);await button('उषा').click();await button('अग्निः').click();await button('Check').click();await page.getByText('uṣā',{exact:true}).waitFor();assert.equal(await page.getByText('✓ Found',{exact:true}).count(),1);assert.equal(await page.getByText('○ Missed',{exact:true}).count(),1);assert.equal(await page.getByText('× Wrong',{exact:true}).count(),1);await shot('mark_words-'+theme);
  // Complete the engine-supplied rhythm using taps and an actual held pointer.
  await showCard('vowels.long','e2');const tap=button('Tap for light; hold over 350 milliseconds for heavy');await tap.click();const box=await tap.boundingBox();await page.mouse.move(box.x+20,box.y+20);await page.mouse.down();await page.waitForTimeout(550);await page.mouse.up();for(const weight of 'LGLGLG')await button(weight==='L'?'◡ Light':'— Heavy').click();await page.getByText('✓ Pattern matched',{exact:true}).waitFor();await shot('rhythm_tapper-'+theme);
  // Make every real letter-builder target by choosing a chip then its base.
  await showCard('vowels.signs','e1');for(const sign of ['ि','ू','े','ौ']){await button('Select: '+sign).click();await button('Join onto: क').click();}await page.getByText('Targets 4/4',{exact:true}).waitFor();await shot('letter_builder-'+theme);
  await page.evaluate(()=>window.qa.show('settings'));await shot('settings-'+theme);await page.evaluate(()=>window.qa.show('home'));await shot('home-shell-'+theme);await page.evaluate(()=>window.qa.show('map'));await shot('map-shell-'+theme);await button(index.acts[0].parts[0].units[0].title.en).click();await shot('unit-sheet-'+theme);await button('Close').last().click();
 }
 // Play the complete short-vowel scene in the shared player. Retrying does
 // not change first verdicts; Continue and swipe both respect the gate.
 await page.evaluate(()=>window.qa.showLesson('vowels.short'));await page.waitForTimeout(100);
 const cards=lessons['vowels.short'].cards.filter(c=>c.depth!=='panini');
 for(let i=0;i<cards.length;i++){
  const card=cards[i],scope=page.getByTestId('lesson-card-'+i);await scope.waitFor();
  if(card.kind==='practice'){
   if(card.mode==='choice'){const chosen=card.options.find(o=>o.correct);if(card.id==='p1'){await button('अ',scope).click();await scope.getByText('अ is a, the sound in “but”.',{exact:false}).waitFor();await button('Try again',scope).click();}await button(chosen.sa??chosen.text.en,scope).click();}
   if(card.mode==='match'){for(const pair of card.pairs){await button('Left: '+pair.left.sa,scope).click();await button('Right: '+(pair.right.sa??pair.right.text.en),scope).click();}await button('Check',scope).click();}
   if(card.mode==='order'){
    assert.equal(await button('Continue').isDisabled(),true);assert.equal(await scope.getByText('aiuṇ',{exact:true}).count(),0);await page.getByLabel('Lesson cards',{exact:true}).evaluate(el=>{el.scrollLeft+=360;el.dispatchEvent(new Event('scroll',{bubbles:true}));});await page.waitForTimeout(300);assert.ok(Math.abs((await scope.boundingBox()).x)<2,'Swipe cannot pass an unsolved gate');
    // First, a wrong order produces the story's failure beat.
    for(const token of [...card.tokens].reverse())await button('Add: '+token,scope).click();await button('Check',scope).click();await scope.getByText(card.story.failure.en,{exact:true}).waitFor();assert.equal(await button('Continue').isDisabled(),true);await button('Try again',scope).click();
    for(const token of card.tokens)await button('Add: '+token,scope).click();await button('Check',scope).click();await scope.getByText(card.story.success.en,{exact:true}).waitFor();assert.equal(await button('Continue').isDisabled(),false);
   }
  }
  if(i===cards.length-1)await button('Finish lesson').click();else await button('Continue').click();
 }
 await page.waitForFunction(()=>document.querySelector('#qa-state').dataset.done==='true');await page.waitForTimeout(100);
 const sent=posts.filter(p=>p.body.lesson_id==='vowels.short');assert.deepEqual(sent.map(p=>p.path),['/progress/card-lesson','/learn/attempts']);assert.equal(sent[0].body.checks_right,2);assert.equal(sent[0].body.checks_total,4);assert.equal(sent[1].body.results.find(r=>r.card_id==='p1').verdict,'incorrect');assert.equal(sent[1].body.results.find(r=>r.card_id==='p3').verdict,'incorrect');
 const beforeReview=posts.length;await page.evaluate(()=>window.qa.show('review'));await page.getByTestId('lesson-card-0').waitFor();const reviewCard=lessons['vowels.short'].cards.find(c=>c.kind==='practice'&&c.mode==='choice'),correctReview=reviewCard.options.find(o=>o.correct);await button(correctReview.sa??correctReview.text.en,page.getByTestId('lesson-card-0')).click();await button('Finish lesson').click();await button('Map').waitFor();await page.waitForTimeout(100);assert.deepEqual(posts.slice(beforeReview).map(p=>p.path),['/learn/attempts']);assert.equal(posts.at(-1).body.results[0].card_id,reviewCard.id);
 // Tile typing and the keyboard alternative both use accepted NFC values.
 await showCard('vowels.signs','p2');await button('Add: क').click();await button('Add: ू').click();await button('Check').click();await page.getByText('Correct',{exact:true}).waitFor();
 await showCard('vowels.signs','p2');await page.getByRole('textbox',{name:'Type your answer with the keyboard'}).fill(' कू ');await button('Check').click();await page.getByText('Correct',{exact:true}).waitFor();
 for(const viewport of [{width:320,height:740},{width:430,height:900},{width:768,height:1024},{width:800,height:360}]){await page.setViewportSize(viewport);await page.evaluate(()=>window.qa.fixture('fixtureHome','mid'));await page.waitForTimeout(150);await shot('responsive-'+viewport.width+'x'+viewport.height);assert.equal(await page.evaluate(()=>document.body.scrollWidth>innerWidth),false,'No horizontal page overflow');}await page.setViewportSize({width:360,height:800});
 // A Hindi, enlarged-text sample remains scrollable at phone width.
 await page.evaluate(()=>{localStorage.setItem('qa.scale','1.6');window.qa.lang('hi');});await showCard('vowels.signs','e1');await shot('letter_builder-hindi-large-dark');
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify({width:360,themes:['light','dark'],fixtureLessons:Object.keys(lessons).length,fixtureCards:Object.values(lessons).reduce((n,l)=>n+l.cards.length,0),posts:sent,browserErrors:errors,checks:['flag persistence','theme persistence','offline home/map/lesson','all cards','four widgets','gate failure/retry/success','first verdicts','ordered posts','tile and keyboard input','Hindi large text','home new/mid/done','unit end frees Dhumaka','leaves/ghosts/cast','44 map units and measured spacing','review attempts only','320/430/tablet/landscape fitting']},null,2));
 console.log('All cards, widgets in both themes, vowels.short completion and both ordered posts passed at 360px');
}
