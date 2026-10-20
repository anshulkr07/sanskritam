// Render existing production components using the checked-in, reviewed seed data.
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'../..'),mobile=path.join(root,'mobile');
const req=createRequire(path.join(mobile,'package.json'));
const ts=req('typescript'),React=req('react'),RN=req('react-native-web');
const {renderToStaticMarkup}=req('react-dom/server');
const origin=JSON.parse(fs.readFileSync(path.join(root,'backend/app/seeds/word_origins/batch-0000.json'),'utf8')).items.find(x=>x.id==='sharkara');
origin.routes=origin.routes.map(r=>({...r,relation:r.hops?.length?'travelled':'borrowed'}));
origin.sources=[{key:'mw',name:'Monier-Williams Sanskrit-English Dictionary (1899), Cologne Digital Sanskrit Dictionaries',url:'https://www.sanskrit-lexicon.uni-koeln.de/'},{key:'ahd',name:'The American Heritage Dictionary of the English Language, Fifth Edition',url:'https://ahdictionary.com/'},{key:'pfeifer',name:'Wolfgang Pfeifer et al., Etymologisches Wörterbuch des Deutschen (1993), in the Digitales Wörterbuch der deutschen Sprache',url:'https://www.dwds.de/'}];
let selected='sharkara.en.sugar';const cache=new Map();
function load(file){
 if(cache.has(file))return cache.get(file).exports;
 const mod={exports:{}};cache.set(file,mod);
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 function local(name){
  if(name==='react-native')return RN;
  if(name==='react-native-safe-area-context')return {SafeAreaView:RN.View};
  if(name==='react-native-reanimated')return {__esModule:true,default:{View:RN.View}};
  if(name.endsWith('/motion'))return {duration:{base:0},stagger:()=>0};
  if(name==='@react-native-vector-icons/ionicons')return {Ionicons:({name,size,color})=>React.createElement(RN.Text,{style:{fontSize:size,color}},name==='arrow-down'?'↓':name==='open-outline'?'↗':'↔')};
  if(name.endsWith('/hooks/useTypeScale'))return {useTypeScale:()=>({sized:n=>n})};
  if(name.endsWith('/hooks/useReducedMotion'))return {useReducedMotion:()=>true};
  if(name.endsWith('/hooks/useQuery'))return {useQuery:key=>({loading:false,failed:false,retry(){},data:key==='word-origins'?{origins:[]}:{available:true,origin,headline_route_id:selected}})};
  if(name.endsWith('/api/client'))return {api:{}};
  if(name.endsWith('/ask/AskProvider'))return {useAskContext(){}};
  if(name.endsWith('/services/haptics'))return {haptics:{tap(){}}};
  if(name.endsWith('/services/scriptFonts'))return {ensureScriptFont:async()=>{},isScriptLoaded:()=>false};
  if(name.endsWith('/words/WordCard'))return {fetchWordToday:async()=>({})};
  if(name.endsWith('/components/FetchError')||name.endsWith('/components/ReportButton'))return {__esModule:true,default:()=>null};
  if(!name.startsWith('.'))return req(name);
  const base=path.resolve(path.dirname(file),name),p=[base,base+'.ts',base+'.tsx'].find(x=>fs.existsSync(x)&&fs.statSync(x).isFile());
  if(!p)throw Error(name);return load(p);
 }
 new Function('require','module','exports',code)(local,mod,mod.exports);return mod.exports;
}
const Screen=load(path.join(mobile,'src/screens/WordJourney.tsx')).default;
const Ladder=load(path.join(mobile,'src/words/RouteLadder.tsx')).default;
const UI=load(path.join(mobile,'src/kala/ui.tsx'));
const fonts=[];
for(const [pkg,family,weights] of [['nunito','Nunito',['400Regular','600SemiBold','700Bold','800ExtraBold']],['baloo-2','Baloo2',['600SemiBold','700Bold']]])for(const w of weights){const n=`${family}_${w}`;fonts.push(`@font-face{font-family:${n};src:url(data:font/ttf;base64,${fs.readFileSync(path.join(mobile,'node_modules/@expo-google-fonts',pkg,w,n+'.ttf')).toString('base64')})}`);}
function save(name,body,height){
 const html=`<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><style>${fonts.join('')}${RN.StyleSheet.getSheet().textContent}*{box-sizing:border-box}html,body{margin:0;background:#FFF8EE}#capture{width:390px;zoom:3;${height?`height:${height}px;overflow:hidden;`:''}display:flex;flex-direction:column;font-family:Nunito_600SemiBold}.nav{height:64px;padding:17px 24px;border-bottom:1px solid #EFE3CE;font:700 21px Nunito_700Bold;color:#3B2E25;background:#FFF8EE}</style><div id=capture><div class=nav>Word journey</div>${body}</div>`;
 fs.writeFileSync(path.join(__dirname,name+'.html'),html);
}
selected='sharkara.en.sugar';save('01-app-overview',renderToStaticMarkup(React.createElement(Screen,{route:{params:undefined},navigation:{}})),844);
for(const [key,id] of [['02-english-route','sharkara.en.sugar'],['03-german-route','sharkara.de.zucker']]){
 const route=origin.routes.find(r=>r.id===id);
 const content=React.createElement(RN.View,{style:{padding:24,backgroundColor:'#FFF8EE'}},React.createElement(UI.SectionLabel,null,'The journey'),React.createElement(RN.View,{style:{borderWidth:1,borderColor:'#EFE3CE',padding:20,marginTop:16}},React.createElement(Ladder,{origin,route})));
 save(key,renderToStaticMarkup(content),null);
}
fs.writeFileSync(path.join(__dirname,'provenance.json'),JSON.stringify({sourceScreen:'mobile/src/screens/WordJourney.tsx',sourceRoute:'mobile/src/words/RouteLadder.tsx',data:'backend/app/seeds/word_origins/batch-0000.json',note:'Production React Native components rendered to static web HTML with bundled app fonts and reviewed seed data; not photographs of an Android device.'},null,2));
console.log('Rendered three production-component reference views.');
