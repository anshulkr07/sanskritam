import fs from 'node:fs';import path from 'node:path';
const dir=import.meta.dirname;const source=path.resolve(dir,'../outputs/prahlada/comparison-30/sarvam-hindi-narration-30s.m4a');
if(!fs.existsSync(source))throw Error('Prepare Sarvam narration in ../prahlada first; see ../README.md');
fs.mkdirSync(path.join(dir,'public'),{recursive:true});fs.copyFileSync(source,path.join(dir,'public/sarvam.m4a'));console.log('Cached Sarvam voice copied; no TTS request made.');
