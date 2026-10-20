const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const qa=process.env.ARTWORK_PLAYWRIGHT||'C:/Users/AnshulKumar/.codex/visualizations/2026/10/16/01a1437b-52ec-7611-93e1-b6ef249f87c4/qa/node_modules/playwright';
const {chromium}=require(qa);
(async()=>{
 const installed=path.join(process.env.LOCALAPPDATA,'ms-playwright');
 const executablePath=process.env.CHROME_PATH||fs.readdirSync(installed).filter(p=>p.startsWith('chromium_headless_shell-')).map(p=>path.join(installed,p,'chrome-headless-shell-win64/chrome-headless-shell.exe')).find(p=>fs.existsSync(p));
 const browser=await chromium.launch({headless:true,executablePath});
 try{
  const page=await browser.newPage({viewport:{width:1400,height:1100},deviceScaleFactor:1});const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(pathToFileURL(path.join(__dirname,'phone-fit-preview.html')).href);
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForFunction(()=>[...document.images].every(im=>im.complete&&im.naturalWidth>0));
  const result=await page.evaluate(()=>{
   const results=[];
   for(const article of document.querySelectorAll('article')){
    const main=article.querySelector('main'),im=article.querySelector('img'),text=article.querySelector('section');
    const area=main.getBoundingClientRect(),box=im.getBoundingClientRect();
    if(box.left<area.left-.1||box.right>area.right+.1||box.top<area.top-.1||box.bottom>area.bottom+.1)throw Error('Painting outside reading bounds');
    if(getComputedStyle(im).objectFit!=='contain')throw Error('Painting was cropped');
    if(text.scrollWidth>text.clientWidth+1)throw Error('Text exceeds phone width');
    text.scrollTop=text.scrollHeight;
    const last=text.querySelector('button:last-child').getBoundingClientRect();
    if(last.bottom>area.bottom+1)throw Error('Last reading action cannot be reached');
    text.scrollTop=0;
    results.push({width:Number(article.dataset.width),height:Number(article.dataset.height),ref:article.dataset.ref,imageWidth:box.width,imageHeight:box.height});
   }
   return results;
  });
  for(const width of [320,393,430]){
   const card=page.locator(`article[data-width="${width}"]`).last();
   await card.screenshot({path:path.join(__dirname,`phone-fit-${width}.png`)});
  }
  await page.evaluate(()=>{document.querySelectorAll('.sanskrit').forEach(e=>e.style.fontSize='33px');document.querySelectorAll('.roman').forEach(e=>e.style.display='none');document.querySelectorAll('article').forEach(e=>{e.style.background='#211d19';e.style.color='#f4eadc'});});
  await page.locator('article[data-width="320"]').last().screenshot({path:path.join(__dirname,'phone-fit-320-large-dark.png')});
  assert.equal(errors.length,0,errors.join('\n'));
  fs.writeFileSync(path.join(__dirname,'phone-fit-check.json'),JSON.stringify({cases:result.length,results:result,browserErrors:errors,nativeDeviceTested:false,source:'Actual background component props; real app verse text and font'},null,2));
  console.log('Phone fitting preview PASS:',result.length,'phone/tablet/landscape cases; complete paintings and reachable live text.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
