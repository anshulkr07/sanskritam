// Visual fixture from actual background component props, app verse text and font.
// Run from mobile; browser checks complement, not replace, native-device QA.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');const ts=require('typescript');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'specs/gita-art-20261016');
function load(name,modules){const source=fs.readFileSync(path.join(__dirname,'../src',name),'utf8');const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;const m={exports:{}};new Function('require','module','exports',js)(s=>{assert.ok(s in modules,s);return modules[s]},m,m.exports);return m.exports;}
const registry=JSON.parse(fs.readFileSync(path.join(root,'mobile/src/components/artwork/verseManifest.json'),'utf8'));
const art=load('components/artwork/verseArtwork.ts',{'./verseManifest.json':registry});
const verses=JSON.parse(fs.readFileSync(path.join(out,'verses.json'),'utf8'));
const deliveries=fs.readdirSync(path.join(out,'deliveries')).filter(p=>p.endsWith('.json')).map(p=>JSON.parse(fs.readFileSync(path.join(out,'deliveries',p),'utf8')));
const portrait=deliveries.find(d=>d.published&&d.key!=='02-047'&&d.composition_policy==='phone-portrait-9x16-20261019');
const jsx=(type,props)=>({type,props});
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rows=[];
for(const [width,height] of [[320,568],[393,852],[430,932],[852,393],[768,1024],[1024,768]]){
 const pageHeight=height-120;
 const component=load('components/artwork/VerseArtworkBackground.tsx',{
  react:{useState:()=>[{width,height:pageHeight},()=>{}]},'react/jsx-runtime':{jsx,jsxs:jsx},
  'react-native':{StyleSheet:{absoluteFill:{}},View:'View',useWindowDimensions:()=>({width,height})},
  './ArtworkImage':{ArtworkImage:'ArtworkImage'},'./verseArtwork':art
 }).default;
 for(const ref of ['Bhagavad Gītā 2.47',portrait?.source_ref??'Bhagavad Gītā 11.55']){
  const verse=verses.find(v=>v.source_ref===ref);const d=deliveries.find(d=>d.source_ref===ref);
  if(!d.published)continue;
  const props=component({sourceRef:ref,opacity:.48}).props.children.props;
  const variant=Math.min(width,height)>=600?'tablet':'phone';
  const file=path.join(root,'results/gita-art-20261016/delivery',d.key+'-'+variant+'.webp');
  const style=Object.entries(props.style).map(([k,v])=>k.replace(/[A-Z]/g,m=>'-'+m.toLowerCase())+':'+v+(['opacity','position'].includes(k)?'':'px')).join(';');
  rows.push({width,height,pageHeight,ref,html:`<article style="width:${width}px;height:${height}px" data-width="${width}" data-height="${height}" data-ref="${esc(ref)}"><header>${width} × ${height} · ${variant} · 48%</header><main style="height:${pageHeight}px"><img alt="${esc(ref)}" src="${pathToFileURL(file)}" style="${style};object-fit:${props.resizeMode}"><section><small>${esc(ref)}</small><div class="sanskrit">${esc(verse.devanagari)}</div><p class="roman">${esc(verse.iast)}</p><hr><p>${esc(verse.translation_en)}</p>${verse.translation_hi?'<p class="hindi">'+esc(verse.translation_hi)+'</p>':''}<button>Learn &amp; Recite this Shloka yourself</button></section></main><footer>Complete painting · independent scrolling text</footer></article>`});
 }
}
const font=pathToFileURL(path.join(root,'mobile/node_modules/@expo-google-fonts/tiro-devanagari-sanskrit/400Regular/TiroDevanagariSanskrit_400Regular.ttf'));
const html=`<!doctype html><meta charset="utf-8"><title>Phone artwork fitting check</title><style>@font-face{font-family:Tiro;src:url('${font}')}*{box-sizing:border-box}body{margin:20px;background:#e3ddd3;font:16px system-ui;color:#392f25}#grid{display:flex;flex-wrap:wrap;align-items:start;gap:24px}article{background:#fff8ee;flex-shrink:0;border:1px solid #bcae98;border-radius:12px;overflow:hidden}header,footer{height:60px;padding:18px;font-size:12px;background:#f3eadc}main{position:relative;overflow:hidden}section{position:relative;height:100%;overflow-y:auto;padding:24px 16px;display:flex;flex-direction:column;gap:8px;text-align:center;justify-content:safe center}small{font-size:12px}.sanskrit{font:22px/1.75 Tiro;white-space:pre-line}.roman{font:italic 14px/1.5 system-ui}p{font-size:16px;line-height:24px;margin:4px 0}.hindi{font-family:Tiro;font-size:15px;line-height:23px}hr{width:48px;border:0;border-top:2px solid #a27c4a}button{background:none;border:0;min-height:44px;color:inherit}img{pointer-events:none}</style><h1>Phone-first artwork fitting</h1><p>Actual background component dimensions, app verse text and Sanskrit font. Browser fixture; native-device testing remains separate.</p><div id="grid">${rows.map(r=>r.html).join('')}</div>`;
fs.writeFileSync(path.join(out,'phone-fit-preview.html'),html);console.log('Saved phone-fit-preview.html:',rows.length,'device/verse cases');
