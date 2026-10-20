const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function load(name, modules) {
 const source=fs.readFileSync(path.join(__dirname,'../src',name),'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 const module={exports:{}};new Function('require','module','exports',js)(s=>{assert.ok(s in modules,s);return modules[s];},module,module.exports);return module.exports;
}
const files=new Map();let calls=0,concurrent=0,peak=0,fail=false;
class Directory {constructor(...parts){this.uri=parts.map(p=>p.uri??p).join('/');}get exists(){return true;}create(){}list(){return [...files.keys()].filter(k=>k.startsWith(this.uri+'/')).map(k=>new File(k));}}
class File {
 constructor(...parts){this.uri=parts.map(p=>p.uri??p).join('/');}
 get name(){return this.uri.split('/').pop();}get exists(){return files.has(this.uri);}get size(){return files.get(this.uri)?.size??0;}get modificationTime(){return files.get(this.uri)?.time??0;}
 delete(){files.delete(this.uri);}
 move(dest){files.set(dest.uri,files.get(this.uri));files.delete(this.uri);this.uri=dest.uri;}
 static async downloadFileAsync(uri,dest){calls++;concurrent++;peak=Math.max(peak,concurrent);try{files.set(dest.uri,{size:1024,time:Date.now()});await new Promise(r=>setTimeout(r,2));if(fail)throw Error('network failure');return dest;}finally{concurrent--;}}
}
const platform={OS:'android'};
const cache=load('services/artworkCache.ts',{'expo-file-system':{Directory,File,Paths:{cache:'cache'}},'react-native':{Platform:platform},'../components/artwork/remoteArtwork':{artworkOrigin:'https://art.example'}});
const uri=n=>'https://art.example/art/v1/'+String(n).padStart(24,'0')+'.webp';
(async()=>{
 const [a,b]=await Promise.all([cache.cachedArtworkUri(uri(1)),cache.cachedArtworkUri(uri(1))]);assert.equal(a,b);assert.equal(calls,1);assert.ok(new File(a).exists,'Moving a temporary file must retain the completed image');
 await cache.cachedArtworkUri(uri(1));assert.equal(calls,1,'Cached artwork avoids network');
 const restarted=load('services/artworkCache.ts',{'expo-file-system':{Directory,File,Paths:{cache:'cache'}},'react-native':{Platform:platform},'../components/artwork/remoteArtwork':{artworkOrigin:'https://art.example'}});
 await restarted.cachedArtworkUri(uri(1));assert.equal(calls,1,'Disk cache is reused after a module/app restart');
 await Promise.all(Array.from({length:9},(_,i)=>cache.cachedArtworkUri(uri(i+2))));assert.ok(peak<=3,'Downloads are bounded');
 fail=true;await assert.rejects(cache.cachedArtworkUri(uri(20)));assert.ok(![...files.keys()].some(k=>k.endsWith('.part')),'Partial failures are removed');fail=false;await cache.cachedArtworkUri(uri(20));
 new File(a).delete();const before=calls;await cache.cachedArtworkUri(uri(1));assert.equal(calls,before+1,'OS-evicted files redownload');
 const retained=uri(30),release=cache.retainArtwork(retained);await cache.cachedArtworkUri(retained);const retainedPath=await cache.cachedArtworkUri(retained);files.get(retainedPath).size=80*1024*1024;
 files.set('cache/public-artwork-v1/'+String(99).padStart(24,'0')+'.webp',{size:40*1024*1024,time:0});await cache.cachedArtworkUri(uri(31));assert.ok(new File(retainedPath).exists,'Visible artwork survives eviction');assert.ok(!files.has('cache/public-artwork-v1/'+String(99).padStart(24,'0')+'.webp'),'Old cache entries are evicted');release();
 platform.OS='web';const previous=calls;assert.equal(await cache.cachedArtworkUri(uri(50)),uri(50));assert.equal(calls,previous,'Web uses browser HTTP caching');
 assert.equal(await cache.cachedArtworkUri('https://private.example/profile.jpg'),'https://private.example/profile.jpg','Private/unmanaged images are not copied into the public-art cache');
 const art=load('components/artwork/verseArtwork.ts',{'./verseManifest.json':{}});const safe={x:.2,y:.25,width:.6,height:.5};
 assert.equal(art.artworkFit(393,700,1254,1254,safe),'contain','Tall crop cannot discard subjects');
 assert.equal(art.artworkFit(430,600,1254,1254,safe),'cover','Gentle crop retains safe scene');
 assert.equal(art.artworkFit(1024,400,1254,1254,safe),'contain','Wide landscape preserves entire scene');
 // The native Image implementation defaults layout to source.width/height.
 // Check the actual component props as well as the geometry, on both platforms.
 const example={variants:{phone:{uri:uri(100),width:768,height:768,bytes:1},tablet:{uri:uri(101),width:1254,height:1254,bytes:1}}};
 const jsx=(type,props)=>({type,props});
 for(const [width,height] of [[320,568],[360,640],[393,852],[430,932],[852,393],[768,1024],[1024,768]]) {
  for(const dimensions of [[768,768],[1254,1254],[1024,1536],[1080,1920]]) {
   const frame=art.containedArtworkFrame(width,height,...dimensions);
   assert.ok(frame.left>=0&&frame.top>=0&&frame.left+frame.width<=width&&frame.top+frame.height<=height,'Whole image lies inside the phone/page bounds');
   assert.ok(Math.abs(frame.width/frame.height-dimensions[0]/dimensions[1])<1e-8,'Paintings keep their proportions');
  }
  for(const os of ['android','ios']) {
   const component=load('components/artwork/VerseArtworkBackground.tsx',{
    react:{useState:()=>[{width,height},()=>{}]},'react/jsx-runtime':{jsx,jsxs:jsx},
    'react-native':{Platform:{OS:os},StyleSheet:{absoluteFill:{position:'absolute',left:0,right:0,top:0,bottom:0}},View:'View',useWindowDimensions:()=>({width,height})},
    './ArtworkImage':{ArtworkImage:'ArtworkImage'},'./verseArtwork':{containedArtworkFrame:art.containedArtworkFrame,verseArtworkFor:()=>example}
   }).default;
   const image=component({sourceRef:'test',opacity:.48}).props.children;
   assert.equal(image.props.resizeMode,'contain');
   assert.deepEqual(Object.keys(image.props.source),['uri'],'Pixel metadata must not become native view dimensions');
   assert.equal(image.props.source.uri,Math.min(width,height)>=600?uri(101):uri(100),'Phone landscape still uses phone files');
   assert.ok(image.props.style.width<width&&image.props.style.height<height,'Image has explicit bounded native dimensions');
  }
 }
 const appearance=load('services/readingAppearance.ts',{'@react-native-async-storage/async-storage':{},react:{}});
 assert.deepEqual(appearance.normalizeReadingAppearance({illustrated:false,imageOpacity:4,textOpacity:-1,textColor:'bad'}),{...appearance.DEFAULT_READING_APPEARANCE,illustrated:false,imageOpacity:1,textOpacity:.5,textColor:null});
 assert.equal(appearance.normalizeReadingAppearance(null).imageOpacity,.48,'New readers start with 48% image opacity');
 assert.equal(appearance.normalizeReadingAppearance({imageOpacity:.6}).imageOpacity,.6,'Saved opacity survives a default change');
 assert.equal(appearance.normalizeReadingAppearance(null).roman,false,'Roman defaults to off');
 const custom=appearance.normalizeReadingAppearance({sections:{verse:{textColor:'#17535C',bold:true,scale:1.3}}});assert.equal(custom.sections.verse.bold,true);assert.equal(custom.sections.verse.scale,1.3);assert.equal(custom.sections.meaning.bold,false);
 console.log('Artwork PASS: download deduplication, bounded concurrency, partial-file cleanup, restart/eviction fallback, cache cap, private URL exclusion, responsive safe crops and saved preference validation.');
})().catch(error=>{console.error(error);process.exitCode=1;});
