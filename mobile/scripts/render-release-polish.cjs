global.__DEV__ = false;
const fs=require('fs'),path=require('path'),ts=require('typescript'),React=require('react');
const {renderToStaticMarkup:render}=require('react-dom/server'),RN=require('react-native-web');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../specs/release-polish-20261019'),cache=new Map(),noop=()=>{};
const learner={id:'qa',display_name:'Anshul',sanskrit_ratio:.4,sanskrit_ratio_setting:.6,script_ratio:.5,feature_mastery:{}};
const word={id:'qa-word',sanskrit:{dev:'शर्करा',iast:'śarkarā'},gloss:'Sugar',note:'A word can travel through several languages, changing its form along the way.',routes:[{id:'en',word:'sugar',lang_name:'English',relation:'travelled',script:'latin',hops:[{lang:'Persian',form:'شکر',roman:'šakar'},{lang:'Arabic',form:'سكر',roman:'sukkar'}]},{id:'hi',word:'शक्कर',lang_name:'Hindi',script:'devanagari',relation:'inherited',hops:[]}],sources:[{name:'Etymological dictionary',url:'https://example.org/source'}]};
const fact={id:'qa-fact',fact:'The Sanskrit word yoga can describe skill in action.',claim_kind:'text',text_name:'Bhagavad Gītā',ref:'2.50',devanagari:'योगः कर्मसु कौशलम्',iast:'yogaḥ karmasu kauśalam',translation:'Yoga is skill in action.',explanation:'Read the phrase in its full verse and context. A short phrase invites a closer look at the text.',source_url:'https://example.org/source',source_site:'Source passage'};
const qaVerses=Array.from({length:18},(_,i)=>({id:`qa-${i}`,source_ref:`Īśopaniṣad ${i+1}`,devanagari:fact.devanagari,translation_en:fact.translation,translation_hi:'योग कर्मों में कुशलता है।'}));
const qaText={slug:'isha',title_sa:'ईशोपनिषद्',title_en:'Īśopaniṣad',verses_imported:18,depth:'full'};
const qaActivity={isha:qaVerses.slice(0,6).map((v,index)=>({id:v.source_ref,ref:v.source_ref,chapter:null,index,read:true,bookmarked:index===2}))};
const emptyComponent={__esModule:true,default:()=>null};
const stubs={
 'hooks/useBookActivity':{useBookActivity:()=>qaActivity},
 'services/bookActivity':{pageId:v=>v.source_ref||v.verse_uid||v.id},
 'store/auth':{useAuth:()=>({learner,displayName:'Anshul',refresh:async()=>learner,logout:noop,deleteAccount:noop})},
 'ask/AskProvider':{useAskContext:noop,useAsk:()=>({open:noop})},
 'hooks/useTypeScale':{useTypeScale:()=>({sized:n=>n,textSize:'M',setTextSize:noop})},
 'hooks/useReducedMotion':{useReducedMotion:()=>true},
 'hooks/useAchievementReveal':{useAchievementReveal:()=>({queue:[],record:async()=>[],dismiss:noop})},
 'hooks/useDayStats':{useDayStats:()=>({stats:{streak:7,practised:22,daily:{date:'2026-10-19',xp:35,goal_xp:50},history:[]},failed:false,refresh:noop})},
 'hooks/useQuery':{useQuery:key=>({data:key==='word-today'?{available:true,origin:word}:key==='fact-today'?{available:true,fact}:null,loading:false,failed:false,retry:noop})},
 'services/scriptFonts':{isScriptLoaded:()=>true,ensureScriptFont:async()=>{}},
 'components/artwork/ArtworkImage':{ArtworkImage:RN.Image},
 'components/book/PageCurlBook':{...emptyComponent,useBookPage:()=>({invalidate:noop})},
 'components/AudioModal':emptyComponent,'components/ProfilePhotoEditor':emptyComponent,'components/ProfileImage':emptyComponent,'components/AchievementReveal':emptyComponent,'facts/InsightProof':emptyComponent,'components/ReportButton':emptyComponent,
};
function load(file){if(cache.has(file))return cache.get(file).exports;const m={exports:{}};cache.set(file,m);const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
 function req(name){
  if(name==='react-native')return RN;
  if(name==='react-native-safe-area-context')return {SafeAreaView:RN.View,useSafeAreaInsets:()=>({top:0,bottom:0,left:0,right:0})};
  if(name.startsWith('@react-navigation/'))return {useNavigation:()=>({navigate:noop}),useFocusEffect:noop};
  if(name==='@react-native-vector-icons/ionicons')return {Ionicons:({size=18,color})=>React.createElement(RN.Text,{style:{fontSize:size,color}},'◈')};
  if(name==='expo-status-bar')return {StatusBar:()=>null};
  if(name==='expo-linear-gradient')return {LinearGradient:RN.View};
  if(name==='react-native-reanimated')return {__esModule:true,default:{View:RN.View},FadeInDown:{}};
  if(name==='react-native-svg')return new Proxy({__esModule:true,default:props=>React.createElement('svg',props)}, {get:(target,key)=>target[key]??(props=>React.createElement(String(key).toLowerCase(),props))});
  if(name==='react-native-view-shot')return {captureRef:noop};
  if(name==='react-native-qrcode-svg')return emptyComponent;
  if(name==='@react-native-async-storage/async-storage')return {__esModule:true,default:{getItem:async()=>null}};
  if(name.startsWith('expo-'))return {};
  if(!name.startsWith('.')){try{return require(name)}catch(error){throw new Error('External '+name+' from '+file,{cause:error})}}
  const base=path.resolve(path.dirname(file),name),relative=path.relative(path.join(root,'src'),base).replaceAll('\\','/');
  if(stubs[relative])return stubs[relative];
  if(relative==='motion')return {duration:{},stagger:noop};
  if(relative==='words/WordCard')return {fetchWordToday:noop};
  if(relative==='facts/FactCard')return {fetchFactToday:noop};
  if(relative==='components/PlaceChooser')return emptyComponent;
  if(relative.startsWith('services/')&&!['services/readingAppearance','services/achievements'].includes(relative))return new Proxy({},{get:()=>noop});
  if(relative==='api/client')return {api:{}};
  if(['hooks/useBookPages','hooks/useChant'].includes(relative))return {};
  if(relative==='components/ReaderSlider'||relative.startsWith('components/chant/'))return emptyComponent;
  if(/\.(webp|png|jpg)$/.test(base))return {uri:`data:image/${path.extname(base).slice(1)};base64,${fs.readFileSync(base).toString('base64')}`};
  if(name.endsWith('.json'))return JSON.parse(fs.readFileSync(base,'utf8'));
  for(const ext of ['.ts','.tsx'])if(fs.existsSync(base+ext))return load(base+ext);
  if(fs.existsSync(path.join(base,'index.ts')))return load(path.join(base,'index.ts'));
  throw Error(name);
 }
 new Function('require','module','exports',js)(req,m,m.exports);return m.exports;
}
const component=name=>load(path.join(root,'src',name));
const {DEFAULT_READING_APPEARANCE}=component('services/readingAppearance.ts'),{READER_THEMES}=component('screens/readerTheme.ts');
const fixture=(title,file,props={})=>[title,React.createElement(component(file).default,props)];
const screens=[fixture('Daily practice','home/DailyLearningCard.tsx',{navigate:noop}),fixture('Word journey','screens/WordJourney.tsx',{route:{params:{}},navigation:{}}),fixture('Do you know','screens/DoYouKnow.tsx',{route:{params:{}},navigation:{}}),fixture('Progress','screens/Progress.tsx'),fixture('Settings','screens/Settings.tsx'),fixture('Reading format','components/artwork/ReadingAppearanceSettings.tsx',{value:DEFAULT_READING_APPEARANCE,onChange:noop,theme:READER_THEMES.light}),['Reader',React.createElement(component('screens/Book.tsx').ReaderPageView,{verse:{id:'qa',source_ref:'Bhagavad Gītā 2.50',devanagari:fact.devanagari,translation_en:fact.translation,translation_hi:'योग कर्मों में कुशलता है।'},themeName:'light',readerScale:process.env.POLISH_QA_NARROW?1.5:1,roman:!!process.env.POLISH_QA_NARROW,appearance:{...DEFAULT_READING_APPEARANCE,illustrated:false},onLearn:noop,onToggleControls:noop})]];
screens.push(fixture('Books and progress','read/BooksHome.tsx',{media:'books',onMedia:noop,groups:[{text:qaText,verses:qaVerses}],allVerses:qaVerses,positions:{isha:5},canon:[qaText],onOpen:noop,onContents:noop,onResume:noop}),fixture('Read marks and bookmarks in contents','read/BookContents.tsx',{book:{key:'isha',titleEn:qaText.title_en,titleSa:qaText.title_sa,verses:qaVerses,planned:18,depth:'full'},resumeAt:5,onBack:noop,onStart:noop,onOpen:noop}));
const sections=screens.map(([title,element],i)=>`<article id="screen-${i}"><header>${title}</header><main>${render(element)}</main></article>`).join('');
RN.AppRegistry.registerComponent('QA',()=>()=>null);const style=render(RN.AppRegistry.getApplication('QA').getStyleElement());
const font=(name,location)=>`@font-face{font-family:'${name}';src:url(data:font/ttf;base64,${fs.readFileSync(require.resolve(location)).toString('base64')})}`;
const fonts=[400,500,600,700,800].map((n,i)=>{const name=`${n}${['Regular','Medium','SemiBold','Bold','ExtraBold'][i]}`;return font(`Nunito_${name}`,`@expo-google-fonts/nunito/${name}/Nunito_${name}.ttf`)}).join('')+font('TiroDevanagariSanskrit_400Regular','@expo-google-fonts/tiro-devanagari-sanskrit/400Regular/TiroDevanagariSanskrit_400Regular.ttf');
fs.writeFileSync(path.join(out,process.env.POLISH_QA_NARROW?'preview-320.html':'preview.html'),`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${style}<style>${fonts}*{box-sizing:border-box}body{margin:0;background:#ded8cf;font-family:Nunito_600SemiBold}nav{padding:16px;background:#3b2e25;color:#fff8ee}nav a{color:inherit;margin-right:20px}article{width:${process.env.POLISH_QA_NARROW ? 320 : 390}px;margin:24px auto;background:#fff8ee;box-shadow:0 8px 30px #0002}header{padding:16px;font-size:18px}main{height:780px;overflow:auto;display:flex;flex-direction:column}article#screen-0 main,article#screen-5 main{padding:20px}article#screen-0 main{height:auto;min-height:400px}@media(max-width:430px){article{width:100%;margin:0}nav{position:relative}}</style><nav>${screens.map(([t],i)=>`<a href="#screen-${i}">${t}</a>`).join('')}</nav>${sections}`);
console.log('Saved production-component layout preview.');
