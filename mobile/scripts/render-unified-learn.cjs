// Static visual QA of production Learn screens. Hooks use read-only fixtures.
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const React=require('react'),RN=require('react-native-web');
const {renderToStaticMarkup}=require('react-dom/server');
const root=path.resolve(__dirname,'..');
const cache=new Map();let setting={lang:'en',scale:1,section:'course',query:'',failed:false};
const guide=JSON.parse(fs.readFileSync(path.join(root,'.expo/learn-audit/guide-index.json'),'utf8'));
const ReactFixture={...React,useState(initial){return React.useState(initial==='course'?setting.section:initial===''?setting.query:initial);}};
function load(file){
 if(cache.has(file))return cache.get(file).exports;
 const mod={exports:{}};cache.set(file,mod);
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 function req(name){
  if(name==='react')return ReactFixture;
  if(name==='react-native')return RN;
  if(name==='@react-navigation/native')return {useFocusEffect(){}};
  if(name==='react-native-safe-area-context')return {SafeAreaView:RN.View};
  if(name.endsWith('/hooks/useGuide'))return {useGuideLang:()=>({lang:setting.lang,t:loc=>loc?.[setting.lang]??loc?.en??'',setLang(){}}),useGrammarProgress:()=>({read:new Set(['vowels','consonants']),last:'vowels'})};
  if(name.endsWith('/hooks/useTypeScale'))return {useTypeScale:()=>({sized:(pt,opts)=>opts?.sanskrit?Math.max(pt*setting.scale,18):pt*setting.scale})};
  if(name.endsWith('/hooks/useQuery'))return {useQuery:key=>({data:setting.failed?null:key==='units'?units:guide,loading:false,failed:setting.failed,retry(){}})};
  if(name.endsWith('/services/haptics'))return {haptics:{tap(){}}};
  if(name.endsWith('/services/grammarGuide'))return {fetchGuideIndex(){}};
  if(name.endsWith('/api/client'))return {api:{units(){}}};
  if(name.endsWith('/learnv2/progress'))return {getLearnV2LastLesson:async()=>null,loadLearnV2DoneMap:async()=>({})};
  if(!name.startsWith('.'))return require(name);
  let abs=path.resolve(path.dirname(file),name);
  if(abs.endsWith('.webp'))return {uri:'../../'+path.relative(path.dirname(root),abs).replaceAll('\\','/'),width:600,height:750};
  abs=[abs,abs+'.ts',abs+'.tsx'].find(f=>fs.existsSync(f)&&fs.statSync(f).isFile());
  if(!abs)throw new Error(name);
  return load(abs);
 }
 new Function('require','module','exports',code)(req,mod,mod.exports);
 return mod.exports;
}
const {units}=load(path.join(root,'scripts/path-art-fixtures.ts'));
const Hub=load(path.join(root,'src/screens/LearnHub.tsx')).default;
const Chapter=load(path.join(root,'src/screens/LearnChapter.tsx')).default;
const navigation={navigate(){},setOptions(){},goBack(){}};
const cases=[
 {name:'Course · 320px',width:320,lang:'en',scale:1,section:'course'},
 {name:'Reference · 390px',width:390,lang:'en',scale:1,section:'reference'},
 {name:'Practice · 320px',width:320,lang:'en',scale:1,section:'practice'},
 {name:'Cases · Hindi XL · 320px',width:320,lang:'hi',scale:1.6,section:'course',chapter:'cases'},
 {name:'Search · 320px',width:320,lang:'en',scale:1,section:'course',query:'sandhi'},
 {name:'Loading failure · 320px',width:320,lang:'en',scale:1,section:'course',failed:true},
];
const phones=cases.map(f=>{
 setting={query:'',failed:false,...f};
 const body=renderToStaticMarkup(React.createElement(f.chapter?Chapter:Hub,{navigation,route:{params:{chapterId:f.chapter}}}));
 return `<article><h2>${f.name}</h2><div class="phone" style="width:${f.width}px">${body}</div></article>`;
}).join('');
let fonts='';
for(const weight of ['400Regular','500Medium','600SemiBold','700Bold','800ExtraBold']){
 const family='Nunito_'+weight;const data=fs.readFileSync(path.join(root,'node_modules/@expo-google-fonts/nunito',weight,family+'.ttf')).toString('base64');
 fonts+=`@font-face{font-family:${family};src:url(data:font/ttf;base64,${data})}`;
}
fonts+=`@font-face{font-family:TiroDevanagariSanskrit_400Regular;src:url(data:font/ttf;base64,${fs.readFileSync(path.join(root,'node_modules/@expo-google-fonts/tiro-devanagari-sanskrit/400Regular/TiroDevanagariSanskrit_400Regular.ttf')).toString('base64')})}`;
const html=`<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unified Learn QA</title><style>${fonts}${RN.StyleSheet.getSheet().textContent}body{margin:20px;background:#fff8ee;font-family:sans-serif}.gallery{display:flex;flex-wrap:wrap;gap:24px;align-items:start}.phone{display:flex;height:800px;border:1px solid #efe3ce;border-radius:16px;overflow:hidden}h2{font-size:18px;max-width:320px}</style><body><h1>Unified Learn</h1><p>Production screens rendered with read-only curriculum, language and text-size fixtures. No native runtime or live backend behavior is claimed.</p><div class="gallery">${phones}</div></body></html>`;
const out=path.join(root,'../specs/learn-v2/unified-learn-qa.html');fs.writeFileSync(out,html);console.log(out);
