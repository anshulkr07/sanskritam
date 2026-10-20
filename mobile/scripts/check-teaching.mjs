// Browser acceptance for current curriculum payloads and production components.
// Platform adapters replace storage/audio/navigation, never teaching renderers.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),mobile=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fixture=JSON.parse(fs.readFileSync(path.join(mobile,'src/story/__fixtures__/teaching.json'),'utf8'));
const temp=fs.mkdtempSync(path.join(mobile,'src/story/.preview-teaching-'));
const out=path.resolve(mobile,'../specs/learn-art-20261020/teaching-course-plan/implementation/browser');fs.mkdirSync(out,{recursive:true});
const put=(name,body)=>{const target=path.join(temp,name);fs.writeFileSync(target,body);return target;};
let server,browser;
try{
 const loader=put('loader.cjs',"const ts=require('typescript');module.exports=function(s){return ts.transpileModule(s,{compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;};");
 const guide=put('guide.ts',"export const useGuideLang=()=>({lang:window.__lang||'en'});");
 const native=put('native.tsx',"export const useTypeScale=()=>({scale:window.__scale||1,sized:n=>n*(window.__scale||1)});export const useDailyHint=()=>({ready:true,available:false,use:async()=>false});export const useAskContext=()=>{};export const useReducedMotion=()=>true;export const useSpeakText=()=>()=>{};export const useNavigation=()=>({navigate(){}});export const prefetchArtwork=()=>{};export const playClip=async()=>({stop:async()=>{}});export default ()=>null;");
 const artwork=put('artwork.tsx',"export {Image as ArtworkImage} from 'react-native';");
 const themeSource=fs.readFileSync(path.join(mobile,'src/story/theme.ts'),'utf8');
 const colors=themeSource.slice(themeSource.indexOf('export const light'),themeSource.indexOf('export type StoryTheme')).replace('dark: typeof light','dark');
 const theme=put('theme.ts',colors+"\nexport const useStoryTheme=()=>window.__theme==='dark'?dark:light;");
 put('fixture.json',JSON.stringify(fixture));
 const entry=put('entry.tsx',`import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import {View} from 'react-native';import fixture from './fixture.json';import StoryCardView from '../cards';import {RomanContext} from '../text';import {ClipContext} from '../audio';import {useStoryTheme} from '../theme';
 function App(){const [spec,setSpec]=useState(['num.verbs','t1']),[revision,setRevision]=useState(0),[progress,setProgress]=useState(undefined);const theme=useStoryTheme();window.qa={show:(id,card)=>{setSpec([id,card]);setProgress(undefined);},appearance:(t,l='en',s=1)=>{window.__theme=t;window.__lang=l;window.__scale=s;setRevision(n=>n+1);}};const lesson=fixture.lessons[spec[0]],card=lesson.cards.find(c=>c.id===spec[1]);return <View style={{backgroundColor:theme.paper,padding:16,gap:12}}><ClipContext.Provider value={lesson.audio||{}}><RomanContext.Provider value={true}><StoryCardView key={spec.join('#')+revision} card={card} characters={fixture.characters} progress={progress} onAnswer={verdict=>setProgress({first:verdict,latest:verdict,solved:verdict==='correct'})}/></RomanContext.Provider></ClipContext.Provider></View>;}createRoot(document.getElementById('root')).render(<App/>);`);
 const alias={'react-native$':'react-native-web','react-native-youtube-iframe$':native,'@react-navigation/native$':native};
 for(const name of ['hooks/useTypeScale','hooks/useGuide','hooks/useReducedMotion','ask/AskProvider','components/artwork/ArtworkImage','services/artworkCache','services/speech','services/dailyHint'])alias[path.join(mobile,'src',name)]=name==='hooks/useGuide'?guide:name==='components/artwork/ArtworkImage'?artwork:native;
 alias[path.join(mobile,'src/story/theme')]=theme;
 await new Promise((resolve,reject)=>require('webpack')({mode:'development',context:mobile,entry,output:{path:temp,filename:'bundle.js'},devtool:false,resolve:{extensions:['.web.tsx','.web.ts','.tsx','.ts','.web.js','.js','.json'],alias},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:loader}]},plugins:[new (require('webpack').DefinePlugin)({__DEV__:'false','process.env.NODE_ENV':JSON.stringify('development')})],performance:{hints:false}},(error,stats)=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve()));
 const fonts=['Mukta_400Regular','Mukta_600SemiBold','Mukta_700Bold','TiroDevanagariSanskrit_400Regular'];
 const fontFiles=fonts.map(n=>require.resolve(n.startsWith('Mukta')?'@expo-google-fonts/mukta/'+n.split('_')[1]+'/'+n+'.ttf':'@expo-google-fonts/tiro-devanagari-sanskrit/400Regular/'+n+'.ttf'));
 const html='<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><style>'+fonts.map((n,i)=>'@font-face{font-family:'+n+';src:url(/font/'+i+')}').join('')+'html,body,#root{margin:0;width:100%;}*{box-sizing:border-box}</style><div id=root></div><script src=/bundle.js></script>';
 server=http.createServer((req,res)=>{if(req.url==='/bundle.js'){res.setHeader('Content-Type','application/javascript');res.end(fs.readFileSync(path.join(temp,'bundle.js')));}else if(req.url.startsWith('/font/'))res.end(fs.readFileSync(fontFiles[Number(req.url.split('/').pop())]));else{res.setHeader('Content-Type','text/html');res.end(html);}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const runtime=process.env.CODEX_NODE_MODULES||'C:/Users/AnshulKumar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
 browser=await require(path.join(runtime,'playwright')).chromium.launch({headless:true,channel:process.env.STORY_BROWSER_CHANNEL||'msedge'});
 const context=await browser.newContext({viewport:{width:360,height:800},deviceScaleFactor:1});
 // Public delivery was verified separately. Serve those same hash-checked bytes
 // here so network latency cannot turn a fitting test into an image timeout.
 const local=new Map();
 for(const rel of ['src/story/artwork/deliveries.json','../specs/learn-art-20261020/teaching-course-plan/implementation/artwork/deliveries.json']){
  const p=path.resolve(mobile,rel);if(!fs.existsSync(p))continue;
  for(const r of JSON.parse(fs.readFileSync(p,'utf8')))for(const v of Object.values(r.variants||{}))if(v.uri&&v.file&&fs.existsSync(v.file))local.set(v.uri,v.file);
 }
 await context.route('https://**',async route=>{const file=local.get(route.request().url());if(file)await route.fulfill({contentType:'image/webp',body:fs.readFileSync(file)});else await route.continue();});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>!!window.qa);await page.evaluate(()=>document.fonts.ready);
 const button=(name,scope=page)=>scope.getByRole('button',{name,exact:true});
 const show=async(lid,cid)=>{await page.evaluate(([l,c])=>window.qa.show(l,c),[lid,cid]);await page.waitForTimeout(35);};
 const fit=async(label='card')=>{let bad=await page.evaluate(()=>document.body.scrollWidth>innerWidth+1);if(bad){await page.waitForFunction(()=>document.body.scrollWidth<=innerWidth+1,{},{timeout:1200}).catch(()=>{});bad=await page.evaluate(()=>document.body.scrollWidth>innerWidth+1);}if(bad){console.error(label,await page.evaluate(()=>({width:innerWidth,overflow:document.body.scrollWidth,elements:[...document.querySelectorAll('div,button,svg')].filter(e=>e.getBoundingClientRect().right>innerWidth+2).slice(-12).map(e=>({tag:e.tagName,text:e.innerText?.slice(0,130),right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width}))})));await page.screenshot({path:path.join(out,'overflow.png'),fullPage:true});}assert.equal(bad,false,'No horizontal page overflow: '+label);};
 const shot=async name=>{await page.waitForFunction(()=>[...document.images].every(i=>i.complete),{},{timeout:20000});await page.screenshot({path:path.join(out,name+'.png'),fullPage:true});};
 let cards=0,figures=0,stages=0;
 for(const [lid,lesson]of Object.entries(fixture.lessons))for(const card of lesson.cards){
  if(!['teach','table','reading','summary'].includes(card.kind))continue;
  await show(lid,card.id);cards++;
  assert.equal((await page.locator('body').innerText()).includes('{{'),false,lid+'#'+card.id+' unparsed markup');await fit();
  for(const placement of ['before','after']){
   const group=(card.visuals||[]).filter(v=>v.placement===placement);
   for(let i=0;i<group.length;i++){
    const figure=group[i];if(group.length>1)await button((i+1)+'. '+figure.title.en).click();
    const scope=page.getByTestId('teaching-'+figure.id);await scope.waitFor();figures++;
    if(['worked','sequence'].includes(figure.kind))for(let n=1;n<figure.items.length;n++){await button('Next step →',scope).click();stages++;}
    if(figure.kind==='matrix'){await button('Show complete table',scope).click();for(const row of figure.rows)for(const item of row)if(item.sa)assert.ok((await scope.innerText()).includes(item.sa));}
    await fit();
   }
  }
 }
 console.log(cards+' source cards, '+figures+' figures, '+stages+' next-step transitions checked');
 await show('num.verbs','t1');await shot('number-360-light');
 await show('nf1.deva','tb1');await button('Compare spellings').first().click();await page.getByText('The changed span',{exact:true}).waitFor();await shot('paradigm-360-light');await button('Show complete table').click();await fit();
 await show('pg.shiva','t2');const source=fixture.lessons['pg.shiva'].cards.find(c=>c.id==='t2').visuals;const range=source.find(v=>v.kind==='sound_range');if(source.length>1)await button((source.indexOf(range)+1)+'. '+range.title.en).click();await button('हल्').click();await page.getByText('Highlighted sounds are included. Final markers in dashed boxes are excluded.',{exact:true}).waitFor();await shot('sound-ranges-360-light');
 await show('pn.who','t2');const relative=fixture.lessons['pn.who'].cards.find(c=>c.id==='t2').visuals;const graph=relative.find(v=>v.id==='v-relative-cases');if(relative.length>1)await button((relative.indexOf(graph)+1)+'. '+graph.title.en).click();await shot('relative-cases-360-light');
 // Feedback remains unavailable until a response. Teacher support is free.
 const practice=fixture.lessons['who.does'].cards.find(c=>c.kind==='practice'&&c.mode==='choice');await show('who.does',practice.id);assert.equal(await page.locator('[data-testid^="teaching-"]').count(),0);const correct=practice.options.find(o=>o.correct);await button(correct.sa||correct.text.en).click();await page.getByTestId('teaching-'+practice.feedback_visuals[0].id).waitFor();await shot('post-answer-360-light');
 // The actual letter order is shown for both signs and preceding half letters.
 await show('vowels.signs','e1');await button('Select: ि').click();await button('Join onto: क').click();await page.getByText('See the assembly',{exact:true}).waitFor();await shot('letter-assembly-360-light');
 const mouthEntry=Object.entries(fixture.lessons).flatMap(([id,l])=>l.cards.filter(c=>c.widget==='mouth_map'&&c.params.letters.includes('घ')).map(c=>[id,c.id]))[0];assert.ok(mouthEntry);await show(...mouthEntry);await button('घ').click();await page.getByText('Voiced: throat vibration',{exact:true}).waitFor();await page.getByText('Aspirated: a puff of air',{exact:true}).waitFor();await shot('mouth-features-360-light');
 const rhythm=fixture.lessons['vowels.long'].cards.find(c=>c.widget==='rhythm_tapper');await show('vowels.long',rhythm.id);for(const weight of rhythm.params.scan[0].weights)await button(weight==='L'?'◡ Light':'— Heavy').click();await page.getByText('✓ Pattern matched',{exact:true}).waitFor();await shot('metre-alignment-360-light');
 const reading=fixture.lessons['kss.reading'].cards.find(c=>c.kind==='reading');await show('kss.reading',reading.id);await button('Read without help').click();assert.equal(await button('Gloss: '+reading.passage[0].words[0].sa).count(),0);await button('Show meanings and word help').click();await button('Gloss: '+reading.passage[0].words[0].sa).click();await shot('reading-help-360-light');
 for(const theme of ['light','dark'])for(const [lang,scale]of [['en',1],['hi',1.6]])for(const width of [320,430,768]){
  await page.setViewportSize({width,height:850});await page.evaluate(([t,l,s])=>window.qa.appearance(t,l,s),[theme,lang,scale]);
  for(const [lid,cid]of [['num.agree','t2'],['nf2.nadi','tb1'],['pn.who','t2'],['pg.shiva','t2'],['vowels.signs','e1']]){await show(lid,cid);await fit([width,theme,lang,scale,lid,cid].join('/'));}
  await show('num.agree','t2');await shot('count-'+width+'-'+theme+'-'+lang+'-'+scale);
 }
 assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify({cards,figures,stages,viewports:[320,360,430,768],themes:['light','dark'],languages:['en','hi'],largestTextScale:1.6,browserErrors:errors,checks:['all selected source cards','all selected figures and stages','exact complete matrix contents','no page overflow','post-answer-only teaching feedback','spelling comparisons','Devanagari letter assembly','voice and aspiration','sound ranges','relative cases','syllable/weight alignment','reading help toggle'],limitations:['web platform adapters; no physical native device or learner study']},null,2));
 console.log('Teaching acceptance passed in both themes, English/Hindi, 320–768px and enlarged text.');
}finally{
 if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));
 if(path.dirname(temp)!==path.join(mobile,'src/story'))throw Error('Unexpected temporary directory');fs.rmSync(temp,{recursive:true,force:true,maxRetries:8,retryDelay:150});
}
