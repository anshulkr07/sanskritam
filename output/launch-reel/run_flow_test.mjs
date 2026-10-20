import fs from 'node:fs';
import path from 'node:path';
const root='C:/Users/AnshulKumar/.codex/integrations/google-flow-mcp';
const {Client}=await import('file:///'+root+'/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js');
const {StdioClientTransport}=await import('file:///'+root+'/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js');
const model=process.argv[2];
const scene=process.argv[3]??'test';
if(!['veo-3.1-lite','veo-3.1-fast','veo-3.1-quality'].includes(model))throw Error('Unknown model');
const output=scene==='test'?path.resolve('output/launch-reel/tests',model):path.resolve('output/launch-reel/scenes',scene);fs.mkdirSync(output,{recursive:true});
const client=new Client({name:'sanskritam-reel',version:'1.0.0'});
await client.connect(new StdioClientTransport({command:process.execPath,args:[root+'/dist/cli.js'],env:{...process.env,FLOW_MCP_GENERATION_TIMEOUT_MS:'360000'},stderr:'inherit'}));
const records=[];
async function call(name,args){
 const res=await client.callTool({name,arguments:args},undefined,{timeout:450000});
 const body=res.structuredContent??JSON.parse(res.content.find(c=>c.type==='text').text);
 records.push({name,result:body});fs.writeFileSync(path.join(output,'run.json'),JSON.stringify(records,null,2));
 if(res.isError||body.ok===false)throw Error(JSON.stringify(body));
 console.log(JSON.stringify({name,model,status:body.status,url:body.url,files:body.files,screenshot:body.screenshot}));return body;
}
try{
 await call('flow_connect',{});
 const opened=await call('flow_inspect',{action:'click',target:'New project',settle_ms:5000});
 const project_url=opened.url;
 let prompt='Create a premium, photorealistic Sanskrit learning app commercial. One continuous shot: an Indian woman aged 28 in an ivory cotton kurta at a sunlit wooden desk in an elegant contemporary home, warm sunrise light, beautiful realistic skin, soft natural camera dolly. She looks thoughtfully down at an open book (all page writing is deeply out of focus and unreadable), then looks up with a gentle smile of discovery. Her phone stays below frame, no phone screen visible. Human, inviting, sophisticated, realistic hands. Face in upper-middle of vertical composition; leave the lower third visually quiet for captions added later. AUDIO IS REQUIRED: a warm, clear Indian-English female narrator, close-miked with natural expressive pitch, says exactly: "You know the words. Now discover their meaning. Meet Sanskritam." Deliver comfortably over eight seconds, including brief pauses. Simultaneously generate a soft original cinematic music bed: gentle bansuri flute, warm plucked strings and an understated atmospheric drone. Music much quieter than narration; voice perfectly intelligible. Gentle hopeful musical lift at the end. No other dialogue, no singing, no chanting, no text, no subtitles, no logos. Generate the video WITH its native voiceover, music and room ambience.';
 let reference_images=[];
 if(scene==='product'){
  reference_images=[path.resolve('output/launch-reel/references/product-tablet.webp')];
  prompt='Animate this exact photographic reference as a premium Sanskritam product-film scene. Preserve the woman, ivory kurta, arched window, teak desk, brass lamp, jasmine, warm ivory/saffron/gold palette and phone position. Locked-off camera, phone stays perfectly upright and front-facing, its entire screen stays completely blank ivory for later replacement with the real app footage. Only delicate natural motion: the woman softly turns a blank book page in the distant blurred background, sunlight shifts very slightly, a few floating dust motes. No text, logos, symbols, UI or subtitles. AUDIO MUST BE GENERATED WITH THE VIDEO: warm professional Indian-English female voiceover, close-miked and gently expressive, exactly: "Explore timeless texts. Learn through stories. Practise one sound at a time." Speak comfortably across eight seconds. Background music: original gentle bansuri flute, soft plucked strings and warm atmospheric drone, D major, eighty beats per minute, very quiet under the clear narration. Continuous hopeful mood. No singing, no lip-synced speech from the woman, no other dialogue.';
 }else if(scene==='outro'){
  reference_images=[path.resolve('output/launch-reel/references/learner-tablet.webp')];
  prompt='Animate this exact photographic reference as the final scene of a premium Sanskritam learning app launch film. Preserve this same Indian woman, natural facial identity, ivory cotton kurta with saffron edging, jasmine in her dark hair, teak desk, arched window and golden morning light. Gentle slow camera push toward her thoughtful face. She looks down at the plain book, then raises her eyes with a warm small smile of understanding. Subtle believable motion, refined film grain, no exaggeration. Keep lower part of frame quiet for the real app closing card added later. No typography, logos, symbols, interfaces or subtitles. AUDIO MUST BE GENERATED WITH THE VIDEO: warm professional Indian-English female narrator, close-miked and gently expressive, exactly: "From your first letter to the verses you love. Sanskritam. Coming soon." Speak across eight seconds, clearly pronouncing Sanskritam, with a memorable pause before Coming soon. Original gentle bansuri flute, soft plucked strings and warm drone in D major, eighty beats per minute, music quiet under voice, gentle hopeful lift and resolving final note near the end. No singing, no chanting, no other dialogue, no lip-synced speech from the woman.';
 }
 if(scene.startsWith('ui-')){
  reference_images=[path.resolve('output/launch-reel/references/ui-stage-tablet.webp')];
  const spoken=scene==='ui-demo'?'Read timeless texts with meaning. Learn through stories. Practise, one sound at a time.':'Your language. Your pace. Your next chapter. Sanskritam. Coming soon.';
  prompt='Animate the attached abstract ivory-and-amber reference as a premium PRODUCT-ONLY background for the Sanskritam app advertisement. NO HUMANS, faces, hands, figures, silhouettes or characters. NO text, UI, letters, logos or phones; exact real app screens will be overlaid later. Preserve the warm ivory paper, tactile curved paper ribbons at the edges, amber glass and large uncluttered centre. A very slow luxurious camera drift, delicate shifting gold light, tiny movement of paper edges. Understated high-end tech launch energy. AUDIO IS ESSENTIAL: a warm clear professional Indian-English FEMALE narrator says exactly: "'+spoken+'". Natural confident pitch, short expressive pauses, clear brand pronunciation, spread comfortably across eight seconds. Simultaneously generate an ORIGINAL premium instrumental music bed, soft warm plucked strings, delicate bansuri accents, subtle electronic pulse, D major, ninety beats per minute. Voice much louder than music. No singing, chanting, other speech or sound effects covering words. A subtle satisfying musical resolution at the end. Generate the video WITH this native narration and music.';
 }
 const args={duration:8,model,ratio:'9:16',project_url,output_dir:output,prompt,reference_images};
 await call('flow_generate_video',{...args,auto_confirm:false});
 await call('flow_generate_video',{...args,auto_confirm:true});
}finally{await client.close();}
