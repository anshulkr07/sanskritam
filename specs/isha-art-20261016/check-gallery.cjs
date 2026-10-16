const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
let browser;
(async()=>{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE});
 const page=await browser.newPage({viewport:{width:1200,height:1000}});const errors=[];
 page.on('pageerror',error=>{errors.push(error.message);console.log('Browser error:',error.message);});
 await page.goto('http://127.0.0.1:8768/gallery.html');await page.evaluate(()=>document.fonts.ready);
 await page.waitForFunction(()=>document.querySelector('#painting').complete&&document.querySelector('#painting').naturalWidth>0);
 assert.equal(await page.locator('.thumb').count(),18);assert.equal(await page.locator('#opacity').inputValue(),'48');
 const verses=JSON.parse(fs.readFileSync(__dirname+'/verses.json','utf8'));
 for(let i=0;i<18;i++){
  await page.selectOption('#verse',{value:String(i)});if(errors.length)throw Error(errors.join('\n'));assert.equal(await page.locator('#ref').textContent(),verses[i].source_ref);assert.equal(await page.locator('#meaning').textContent(),verses[i].translation_en);
 }
 await page.selectOption('#verse','0');await page.screenshot({path:__dirname+'/gallery-desktop.jpg',fullPage:true,type:'jpeg',quality:88});
 for(const width of [320,360,393,430,768,1024]){
  await page.setViewportSize({width,height:900});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'Overflow at '+width);
 }
 await page.selectOption('#theme','dark');await page.uncheck('#illustrated');assert.equal(await page.locator('#painting').isVisible(),false);await page.check('#illustrated');await page.click('#orientation');
 assert.equal(await page.locator('#page').evaluate(el=>el.classList.contains('landscape')),true);
 assert.equal(errors.length,0,errors.join('\n'));await browser.close();console.log('Gallery PASS: 18 verse mappings, live meanings, 48% default, image/theme/orientation controls and 320–1024px layouts.');
})().catch(async error=>{console.error(error);if(browser)await browser.close();process.exitCode=1;});
