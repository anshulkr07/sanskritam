import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {spawn,spawnSync} from 'node:child_process';
import {once} from 'node:events';
import {createHash} from 'node:crypto';

const dir=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(dir,'../..');
const baseOut=path.join(root,'codetovideo/outputs/prahlada');
const short=process.argv.includes('--short');
const out=short?path.join(baseOut,'comparison-30'):baseOut;
const duration=short?30:60, fps=short?15:30, frameCount=duration*fps;
const original=JSON.parse(fs.readFileSync(path.join(baseOut,'timeline.json'),'utf8'));
const brief=short?JSON.parse(fs.readFileSync(path.join(out,'timeline.json'),'utf8')):original;
function sceneTime(t){if(!short)return t;const i=Math.max(0,brief.scenes.findLastIndex(s=>t>=s.start));const a=brief.scenes[i],b=original.scenes[i];return b.start+(t-a.start)/a.duration*b.duration;}
const modules=process.env.VIDEO_RUNTIME_NODE_MODULES||path.join(process.env.USERPROFILE,'.codex/mcp/video-tools/node/node_modules');
const require=createRequire(path.join(modules,'../package.json'));
const puppeteer=require('puppeteer-core');
const three=path.join(modules,'three/build');
const solid=process.argv.includes('--3d');
const files=new Map([
    ['/',[path.join(dir,'illustrated.html'),'text/html']],
    ['/illustrated.mjs',[path.join(dir,'illustrated.mjs'),'text/javascript']],
    ['/three-dimensional.mjs',[path.join(dir,'three-dimensional.mjs'),'text/javascript']],
    ['/vendor/three.module.js',[path.join(three,'three.module.js'),'text/javascript']],
    ['/vendor/three.core.js',[path.join(three,'three.core.js'),'text/javascript']],
    ['/timeline.json',[path.join(out,'timeline.json'),'application/json']],
    ['/narration.wav',[path.join(out,'narration.wav'),'audio/wav']]
]);
fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{const item=files.get(new URL(req.url,'http://localhost').pathname);if(!item){res.writeHead(404).end();return}try{if(short&&new URL(req.url,'http://localhost').pathname==='/timeline.json'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({...original,scenes:original.scenes.map((s,i)=>({...s,captions:brief.scenes[i].captions}))}));return}res.writeHead(200,{'Content-Type':item[1],'Cache-Control':'no-store'});if(solid&&item[1]==='text/html'){res.end(fs.readFileSync(item[0],'utf8').replace('/illustrated.mjs','/three-dimensional.mjs'));return}fs.createReadStream(item[0]).pipe(res)}catch{res.writeHead(500).end()}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}`;
if(process.argv.includes('--serve')){console.log(url);await new Promise(()=>{});}
let browser,encoder;
try{
    const angle=process.argv.includes('--gpu')?['--use-angle=d3d11']:['--use-angle=swiftshader','--enable-unsafe-swiftshader'];
    browser=await puppeteer.launch({executablePath:process.env.VIDEO_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-webgl',...angle,'--ignore-gpu-blocklist','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required'],defaultViewport:{width:720,height:1280,deviceScaleFactor:1}});
    const page=await browser.newPage();const errors=[];
    page.on('pageerror',e=>{errors.push(String(e));console.error(e)});
    page.on('console',m=>{if(m.type()==='error')console.error(m.text())});
    await page.goto(url+'/?capture',{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForFunction('window.ready===true',{timeout:60000});
    if(process.argv.includes('--stills')){
        for(const t of [3,10,18,24,30.3,34,38,45,54,57]){
            const data=await page.evaluate(t=>window.renderAt(t,true),t);
            fs.writeFileSync(path.join(out,`${solid?'threejs-3d':'illustrated'}-${String(t).replace('.','-')}.jpg`),Buffer.from(data.split(',')[1],'base64'));
        }
        console.log('Ten scene preview frames rendered.');
    }else{
        const output=path.join(out,`prahlada-${solid?'threejs-3d':'shadow-puppets'}-${duration}s.mp4`);
        const log=fs.openSync(path.join(out,'illustrated-encode.log'),'w');
        encoder=spawn('ffmpeg',['-y','-hide_banner','-loglevel','warning','-f','image2pipe','-vcodec','mjpeg','-framerate',String(fps),'-i','pipe:0',
            '-i',path.join(out,'narration.wav'),'-i',path.join(baseOut,'score.wav'),'-filter_complex',
            `[1:a]highpass=f=70,loudnorm=I=-16:TP=-2:LRA=7[v];[v][2:a]amix=inputs=2:duration=first:normalize=0,afade=t=out:st=${duration-1}:d=1,alimiter=limit=0.95,aresample=48000[a]`,
            '-map','0:v:0','-map','[a]','-c:v','libx264','-crf','18','-preset','fast','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-t',String(duration),'-movflags','+faststart',output],
            {stdio:['pipe','ignore',log],windowsHide:true});
        const done=once(encoder,'close');
        for(let f=0;f<frameCount;f++){
            if(encoder.exitCode!==null)throw new Error('FFmpeg stopped early; inspect illustrated-encode.log');
            const data=await page.evaluate(t=>window.renderAt(t,true),sceneTime(f/fps));
            if(!encoder.stdin.write(Buffer.from(data.split(',')[1],'base64')))await once(encoder.stdin,'drain');
            if(f%150===0)console.log(`Rendered ${f}/${frameCount} frames (${(f/fps).toFixed(0)}s)`,new Date().toISOString());
        }
        encoder.stdin.end();const [code]=await done;fs.closeSync(log);if(code!==0)throw new Error(`FFmpeg exited ${code}`);
        if(errors.length)throw new Error(errors.join('\n'));
        const probe=spawnSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',output],{encoding:'utf8',windowsHide:true});if(probe.status!==0)throw new Error(probe.stderr);
        const media=JSON.parse(probe.stdout),v=media.streams.find(s=>s.codec_type==='video'),a=media.streams.find(s=>s.codec_type==='audio');
        if(v.width!==720||v.height!==1280||v.avg_frame_rate!==`${fps}/1`||Number(v.nb_frames)!==frameCount||Number(media.format.duration)!==duration||!a)throw new Error('Delivery validation failed');
        const decode=spawnSync('ffmpeg',['-v','error','-i',output,'-f','null','-'],{encoding:'utf8',windowsHide:true});if(decode.status!==0||decode.stderr.trim())throw new Error(decode.stderr||'Decode failed');
        const verification={file:path.basename(output),duration,width:720,height:1280,fps,frames:frameCount,video:v.codec_name,audio:a.codec_name,sample_rate:a.sample_rate,bytes:fs.statSync(output).size,sha256:createHash('sha256').update(fs.readFileSync(output)).digest('hex'),engine:solid?'Three.js 0.186.1, solid articulated 3D characters and architecture':'Three.js 0.186.1, articulated procedural cutouts in a 3D scene',voice:'Existing project Sarvam Bulbul v3 narration; no new TTS calls',full_decode:'passed',browser_errors:errors};
        fs.writeFileSync(path.join(out,solid?'threejs-3d-verification.json':'illustrated-verification.json'),JSON.stringify(verification,null,2));console.log(JSON.stringify(verification,null,2));
    }
}finally{
    if(browser)await browser.close();if(encoder&&encoder.exitCode===null)encoder.kill();server.close();
}
