import { AUDIO_HTML } from "./audioRuntime";

// Android speakerphone: put capture and remote playout through one WebRTC
// engine. Local peers never contact a server/STUN service. The remote audio
// element supplies WebRTC's render reference; raw Web Audio speaker playback
// and an unrelated AudioRecord cannot supply that reference reliably.
export const DUPLEX_SCRIPT = `
let duplex, duplexGeneration=0;
function duplexPost(message){window.ReactNativeWebView.postMessage(JSON.stringify(message));}
function duplexStop(){
 duplexGeneration++;
 const d=duplex;duplex=null;if(!d)return;
 if(d.processor){d.processor.onaudioprocess=null;d.processor.disconnect();}
 if(d.input)d.input.disconnect();if(d.silent)d.silent.disconnect();
 for(const p of [d.near,d.far])if(p)p.close();
 for(const stream of [d.media,d.render&&d.render.stream])if(stream)for(const track of stream.getTracks())track.stop();
 if(d.player){d.player.pause();d.player.srcObject=null;d.player.remove();}
 if(gain)window.voiceLabSetOutput(null);
}
function duplexGather(peer){return new Promise((resolve,reject)=>{
 if(peer.iceGatheringState==='complete'){resolve();return;}
 const timer=setTimeout(()=>{peer.removeEventListener('icegatheringstatechange',check);reject(new Error('Local call audio negotiation timed out.'));},3000);
 function check(){if(peer.iceGatheringState==='complete'){clearTimeout(timer);peer.removeEventListener('icegatheringstatechange',check);resolve();}}
 peer.addEventListener('icegatheringstatechange',check);check();
});}
window.voiceLabDuplexCommand=async function(command){
 if(command.type==='capture_stop'){if(duplex&&command.id!==undefined&&command.id!==duplex.id)return;window.voiceLabCommand({type:'stop'});duplexStop();return;}
 if(command.type!=='capture_start')return;
 duplexStop();const epoch=duplexGeneration;
 const d={id:command.id};duplex=d;
 function current(){if(epoch!==duplexGeneration)throw new Error('Capture cancelled.');}
 try{
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia||!window.RTCPeerConnection)throw new Error('Android WebView voice processing is unavailable. Update Android System WebView.');
  d.media=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1},video:false});
  if(epoch!==duplexGeneration){for(const t of d.media.getTracks())t.stop();return;}
  const capture=d.media.getAudioTracks()[0];
  if(capture.getSettings().echoCancellation!==true)throw new Error('Echo cancellation did not activate for speakerphone audio.');
  await init();current();
  d.near=new RTCPeerConnection({iceServers:[]});d.far=new RTCPeerConnection({iceServers:[]});
  d.render=ctx.createMediaStreamDestination();window.voiceLabSetOutput(d.render);
  d.player=document.createElement('audio');d.player.autoplay=true;d.player.setAttribute('playsinline','');document.body.appendChild(d.player);
  let outputReady=false,inputReady=false,announced=false,phase=0,offset=0;
  let packet=new Int16Array(1600);
  function ready(){if(!announced&&inputReady&&outputReady){announced=true;duplexPost({voiceLabCaptureStarted:d.id,echoCancelled:true});}}
  d.near.ontrack=event=>{
   d.player.srcObject=event.streams[0]||new MediaStream([event.track]);
   d.player.play().then(()=>{outputReady=true;ready();}).catch(e=>duplexPost({voiceLabCaptureError:d.id,message:e.message}));
  };
  d.far.ontrack=event=>{
   if(epoch!==duplexGeneration)return;
   const stream=event.streams[0]||new MediaStream([event.track]);
   d.input=ctx.createMediaStreamSource(stream);d.processor=ctx.createScriptProcessor(2048,1,1);d.silent=ctx.createGain();d.silent.gain.value=0;
   d.processor.onaudioprocess=event=>{
    if(epoch!==duplexGeneration)return;
    inputReady=true;ready();
    const input=event.inputBuffer.getChannelData(0),step=ctx.sampleRate/16000;
    while(phase<input.length){
     const a=Math.floor(phase),b=Math.min(a+1,input.length-1),fraction=phase-a;
     packet[offset++]=Math.round(Math.max(-1,Math.min(1,input[a]*(1-fraction)+input[b]*fraction))*32767);phase+=step;
     if(offset===packet.length){
      const bytes=new Uint8Array(packet.buffer);let raw='';for(let i=0;i<bytes.length;i++)raw+=String.fromCharCode(bytes[i]);
      duplexPost({voiceLabCaptureFrame:d.id,data:btoa(raw),sampleRate:16000,channels:1,echoCancelled:true});
      packet=new Int16Array(1600);offset=0;
     }
    }
    phase-=input.length;
   };
   d.input.connect(d.processor);d.processor.connect(d.silent);d.silent.connect(d.render);
  };
  d.near.addTrack(capture,d.media);
  d.far.addTrack(d.render.stream.getAudioTracks()[0],d.render.stream);
  await d.near.setLocalDescription(await d.near.createOffer());await duplexGather(d.near);current();
  await d.far.setRemoteDescription(d.near.localDescription);
  await d.far.setLocalDescription(await d.far.createAnswer());await duplexGather(d.far);current();
  await d.near.setRemoteDescription(d.far.localDescription);current();
  for(const peer of [d.near,d.far])peer.onconnectionstatechange=()=>{
   if(epoch===duplexGeneration&&['failed','closed'].includes(peer.connectionState))duplexPost({voiceLabCaptureError:d.id,message:'Speakerphone audio connection was lost.'});
  };
 }catch(error){
  if(epoch!==duplexGeneration)return;
  duplexStop();duplexPost({voiceLabCaptureError:command.id,message:error.message||'Speakerphone audio could not start.'});
 }
};
window.addEventListener('pagehide',duplexStop);
`;

export const DUPLEX_HTML = AUDIO_HTML.replace("</script>", DUPLEX_SCRIPT + "</script>");
