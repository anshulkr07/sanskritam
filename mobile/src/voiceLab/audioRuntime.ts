import type { MicBuffer, Microphone } from "./microphone";

export type AudioCommand = { type: string; data?: string; codec?: string; sample_rate?: number; pitch?: number; loudness?: number };
export type AudioSinkHandle = {
  send: (command: AudioCommand) => void;
  startCapture?: (onBuffer: (buffer: MicBuffer) => void) => Promise<Microphone>;
};

// Shared Web Audio playback engine for browser and the native WebView.
// Scheduling uses decoded duration including detune; interruption invalidates
// pending decodes as well as stopping already scheduled AudioBufferSources.
export const AUDIO_HTML = `<!doctype html><html><meta name="viewport" content="width=device-width"><body><script>
let ctx, gain, next=0, generation=0, pending=0, busy=false, paused=false, pitch=0, loudness=1, chain=Promise.resolve();
const sources=new Set(), waiters=new Set();
function wake(){for(const resolve of waiters)resolve();waiters.clear();}
function report(message){if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify({error:message}));else parent.postMessage({voiceLabAudioError:message},'*');}
function playback(){const value=!!(pending||sources.size);if(value===busy)return;busy=value;const message={voiceLabPlaybackBusy:value,generation};if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify(message));else parent.postMessage(message,'*');}
function init(){if(!ctx){ctx=new (window.AudioContext||window.webkitAudioContext)();gain=ctx.createGain();gain.connect(ctx.destination);}gain.gain.value=loudness;return paused?Promise.resolve():ctx.resume();}
window.voiceLabSetOutput=function(target){gain.disconnect();gain.connect(target||ctx.destination);};
window.voiceLabCommand=function(m){
 if(m.type==='settings'){pitch=m.pitch||0;loudness=m.loudness||1;if(gain)gain.gain.value=loudness;return;}
 if(m.type==='stop'){paused=false;if(ctx&&ctx.state==='suspended')ctx.resume().catch(e=>report(e.message));generation++;for(const s of sources){try{s.stop();}catch{}}sources.clear();pending=0;playback();next=0;chain=Promise.resolve();wake();return;}
 if(m.type==='pause'){paused=true;if(ctx)ctx.suspend().catch(e=>report(e.message));return;}
 if(m.type==='resume'){paused=false;init().then(wake).catch(e=>report(e.message));return;}
 if(m.type!=='audio')return;
 const epoch=generation;
 pending++;playback();
 chain=chain.then(async()=>{
  if(epoch!==generation)return;
  await init();const raw=atob(m.data),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  let buffer;
  if(m.codec==='pcm'){const view=new DataView(bytes.buffer);buffer=ctx.createBuffer(1,bytes.length/2,m.sample_rate||24000);const out=buffer.getChannelData(0);for(let i=0;i<out.length;i++)out[i]=view.getInt16(i*2,true)/32768;}
  else buffer=await ctx.decodeAudioData(bytes.buffer);
  if(epoch!==generation)return;
  while(epoch===generation&&sources.size&&next-ctx.currentTime>4)await new Promise(resolve=>waiters.add(resolve));
  if(epoch!==generation)return;
  const s=ctx.createBufferSource();s.buffer=buffer;s.detune.value=pitch*100;s.connect(gain);sources.add(s);s.onended=()=>{sources.delete(s);if(epoch===generation){playback();wake();}};
  next=Math.max(next,ctx.currentTime+0.02);s.start(next);next+=buffer.duration/Math.pow(2,pitch/12);
 }).catch(e=>{if(epoch===generation)report(e.message);}).finally(()=>{if(epoch===generation){pending--;playback();}});
};
window.addEventListener('message',e=>{try{window.voiceLabCommand(typeof e.data==='string'?JSON.parse(e.data):e.data);}catch(e){report(e.message);}});
</script></body></html>`;
