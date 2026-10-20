// Browser QA of the production Picture component; native cache behavior is checked separately.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),mobile=path.join(root,'mobile');
const requireMobile=require('node:module').createRequire(path.join(mobile,'package.json'));
const temp=fs.mkdtempSync(path.join(mobile,'src/story/.art-preview-'));
const put=(name,body)=>{const file=path.join(temp,name);fs.writeFileSync(file,body);return file;};
let browser,server;
(async()=>{try{
const loader=put('loader.cjs',"const ts=require('typescript');module.exports=s=>ts.transpileModule(s,{compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;");
const artwork=put('artwork.tsx',"export {Image as ArtworkImage} from 'react-native';");
const guide=put('guide.ts',"export const useGuideLang=()=>({lang:'en'});");
const text=put('text.tsx',"import React from 'react';import {Text} from 'react-native';export const Bi=({value,style})=><Text style={style}>{value.en}</Text>;");
const storage=put('storage.ts',"export default {getItem:async k=>localStorage.getItem(k),setItem:async(k,v)=>localStorage.setItem(k,v)};");
const entry=put('entry.tsx',"import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import {ScrollView,View,Text} from 'react-native';import Picture from '../cards/Picture';import {useStoryTheme,setStoryAppearance} from '../theme';const items=window.qaItems;function App(){const [index,setIndex]=useState(0),[failed,setFailed]=useState(false),theme=useStoryTheme();window.qa={show:setIndex,theme:setStoryAppearance,fallback:setFailed};const item=items[index];return <ScrollView style={{flex:1,backgroundColor:theme.paper}} contentContainerStyle={{padding:16}}><Text style={{fontFamily:'Mukta_600SemiBold',fontSize:24,color:theme.ink}}>The Burnt Book</Text><View testID='painting'><Picture picture={failed?{...item,id:'qa-missing',delivered:false}:item}/></View><Text style={{fontFamily:'TiroDevanagariSanskrit_400Regular',fontSize:28,color:theme.ink,marginTop:16}}>अ आ इ ई उ ऊ</Text><Text style={{fontFamily:'Mukta_400Regular',fontSize:20,color:theme.ink}}>Live lesson text remains selectable below the complete painting.</Text></ScrollView>};createRoot(document.getElementById('root')).render(<App/>);");
const alias={'react-native$':'react-native-web','@react-native-async-storage/async-storage':storage,[path.join(mobile,'src/hooks/useGuide')]:guide,[path.join(mobile,'src/story/text')]:text,[path.join(mobile,'src/components/artwork/ArtworkImage')]:artwork};
const webpack=requireMobile('webpack');
await new Promise((resolve,reject)=>webpack({mode:'development',context:mobile,entry,output:{path:temp,filename:'bundle.js'},devtool:false,resolve:{extensions:['.web.tsx','.web.ts','.tsx','.ts','.web.js','.js','.json'],alias},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:loader}]},plugins:[new webpack.DefinePlugin({__DEV__:'false','process.env.NODE_ENV':JSON.stringify('development')})],performance:{hints:false}},(err,stats)=>err?reject(err):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve()));
const jobs=JSON.parse(fs.readFileSync(path.join(__dirname,'jobs.json'),'utf8'));
const manifest=JSON.parse(fs.readFileSync(path.join(mobile,'src/story/artwork/manifest.json'),'utf8'));
const items=jobs.filter(j=>manifest[j.id]).map(j=>({id:j.id,alt:j.brief.alt,ratio:j.ratio,delivered:true,...manifest[j.id]}));assert.ok(items.length);
const fonts=['Mukta_400Regular','Mukta_600SemiBold','TiroDevanagariSanskrit_400Regular'];
const fontFiles=fonts.map(name=>requireMobile.resolve(name.startsWith('Mukta')?'@expo-google-fonts/mukta/'+name.split('_')[1]+'/'+name+'.ttf':'@expo-google-fonts/tiro-devanagari-sanskrit/400Regular/'+name+'.ttf'));
const css=fonts.map((name,i)=>'@font-face{font-family:'+name+';src:url(/font/'+i+')}').join('');
const html='<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><style>'+css+'html,body,#root{margin:0;width:100%;height:100%}#root{display:flex;flex-direction:column}*{box-sizing:border-box}</style><div id=root></div><script>window.qaItems='+JSON.stringify(items).replace(/</g,'\\u003c')+'</script><script src=/bundle.js></script>';
server=http.createServer((req,res)=>{if(req.url==='/bundle.js'){res.setHeader('Content-Type','application/javascript');res.end(fs.readFileSync(path.join(temp,'bundle.js')));}else if(req.url.startsWith('/font/'))res.end(fs.readFileSync(fontFiles[Number(req.url.split('/').pop())]));else{res.setHeader('Content-Type','text/html');res.end(html);}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const runtime=process.env.CODEX_NODE_MODULES||'C:/Users/AnshulKumar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {chromium}=require(path.join(runtime,'playwright'));browser=await chromium.launch({headless:true,channel:'msedge'});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));const checks=[];
await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>!!window.qa);await page.evaluate(()=>document.fonts.ready);
for(const [width,height] of [[320,740],[360,800],[390,844],[430,932],[768,1024],[844,390]]){
await page.setViewportSize({width,height});
for(const theme of ['light','dark']){
await page.evaluate(theme=>window.qa.theme(theme),theme);
for(const index of [0,Math.min(10,items.length-1),items.length-1]){
await page.evaluate(index=>window.qa.show(index),index);
await page.waitForFunction(()=>document.images.length>0&&[...document.images].every(i=>i.complete&&i.naturalWidth>0));
const actual=await page.getByTestId('painting').boundingBox();assert.ok(Math.abs(actual.height/actual.width-.75)<.01,'Painting ratio');
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Horizontal overflow');
const src=await page.locator('img').first().getAttribute('src');assert.equal(src,Math.min(width,height)>=600?items[index].tablet:items[index].phone);
checks.push({width,height,theme,id:items[index].id,loaded:true,contained:true,variant:Math.min(width,height)>=600?'tablet':'phone'});
if(index===0)await page.screenshot({path:path.join(__dirname,`preview-${width}-${theme}.png`),fullPage:true});
}}
}
await page.evaluate(()=>window.qa.fallback(true));await page.waitForFunction(()=>document.images.length===0);assert.ok((await page.locator('body').innerText()).includes(items[items.length-1].alt.en));
assert.deepEqual(errors,[]);fs.writeFileSync(path.join(__dirname,'visual-audit.json'),JSON.stringify({production_component:'mobile/src/story/cards/Picture.tsx',adapter:'react-native-web Image; native cache tested separately',checks,fallback:true,page_errors:errors},null,2)+'\n');console.log(`${checks.length} production Picture layouts passed; text fallback passed.`);
}finally{if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));assert.equal(path.dirname(temp),path.join(mobile,'src/story'));fs.rmSync(temp,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exitCode=1;});
