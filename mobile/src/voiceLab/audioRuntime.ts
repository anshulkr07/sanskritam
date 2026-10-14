export type AudioCommand = { type: string; data?: string; codec?: string; sample_rate?: number; pitch?: number; loudness?: number };
export type AudioSinkHandle = { send: (command: AudioCommand) => void };

// Shared Web Audio playback engine for browser and the native WebView.
// Scheduling uses decoded duration including detune; interruption invalidates
// pending decodes as well as stopping already scheduled AudioBufferSources.
export const AUDIO_HTML = `<!doctype html><html><meta name="viewport" content="width=device-width"><body><script>
let ctx, gain, next=0, generation=0, pitch=0, loudness=1, chain=Promise.resolve();
const sources=new Set();
function report(message){if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify({error:message}));else parent.postMessage({voiceLabAudioError:message},'*');}
function init(){if(!ctx){ctx=new (window.AudioContext||window.webkitAudioContext)();gain=ctx.createGain();gain.connect(ctx.destination);}gain.gain.value=loudness;return ctx.resume();}
window.voiceLabCommand=function(m){
 if(m.type==='settings'){pitch=m.pitch||0;loudness=m.loudness||1;if(gain)gain.gain.value=loudness;return;}
 if(m.type==='stop'){generation++;for(const s of sources){try{s.stop();}catch{}}sources.clear();next=0;chain=Promise.resolve();return;}
 if(m.type==='resume'){init().catch(e=>report(e.message));return;}
 if(m.type!=='audio')return;
 const epoch=generation;
 chain=chain.then(async()=>{
  if(epoch!==generation)return;
  await init();const raw=atob(m.data),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  let buffer;
  if(m.codec==='pcm'){const view=new DataView(bytes.buffer);buffer=ctx.createBuffer(1,bytes.length/2,m.sample_rate||24000);const out=buffer.getChannelData(0);for(let i=0;i<out.length;i++)out[i]=view.getInt16(i*2,true)/32768;}
  else buffer=await ctx.decodeAudioData(bytes.buffer);
  if(epoch!==generation)return;
  if(next-ctx.currentTime>20)throw new Error('Audio backlog exceeded. Interrupt the reply.');
  const s=ctx.createBufferSource();s.buffer=buffer;s.detune.value=pitch*100;s.connect(gain);sources.add(s);s.onended=()=>sources.delete(s);
  next=Math.max(next,ctx.currentTime+0.02);s.start(next);next+=buffer.duration/Math.pow(2,pitch/12);
 }).catch(e=>report(e.message));
};
window.addEventListener('message',e=>{try{window.voiceLabCommand(typeof e.data==='string'?JSON.parse(e.data):e.data);}catch(e){report(e.message);}});
</script></body></html>`;
