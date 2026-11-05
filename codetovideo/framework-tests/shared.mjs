import original from './original-timeline.json';
import brief from './short-timeline.json';
export {original,brief};
export function clock(t){const i=Math.max(0,brief.scenes.findLastIndex(s=>t>=s.start));const s=brief.scenes[i],o=original.scenes[i];return {i,scene:s,local:t-s.start,old:o.start+(t-s.start)/s.duration*o.duration};}
export function overlay(c,t,label){const {scene:s,local}=clock(t);c.save();
let g=c.createLinearGradient(0,0,0,1280);g.addColorStop(0,'#171a2866');g.addColorStop(.3,'#171a2800');g.addColorStop(.75,'#171a2800');g.addColorStop(1,'#171a28bb');c.fillStyle=g;c.fillRect(0,0,720,1280);
c.textAlign='center';c.fillStyle='#fff0ce';c.font='18px Arial';c.fillText(label.toUpperCase(),360,74);
c.font='48px Georgia';c.fillText(t<4?'Prahlada':s.heading,360,144);
c.font='25px Arial';let text=s.captions[local<s.duration/2?0:1],lines=[],line='';for(let w of text.split(' ')){let next=line?line+' '+w:w;if(c.measureText(next).width>600){lines.push(line);line=w}else line=next}lines.push(line);
c.fillStyle='#211b21dd';c.beginPath();c.roundRect(36,1100,648,lines.length*36+34,12);c.fill();c.fillStyle='#fff0ce';lines.forEach((l,i)=>c.fillText(l,360,1135+i*36));
c.strokeStyle='#e5bd7866';c.strokeRect(20,20,680,1240);if(t>29.5){c.fillStyle=`rgba(25,22,30,${(t-29.5)*2})`;c.fillRect(0,0,720,1280)}c.restore();}
