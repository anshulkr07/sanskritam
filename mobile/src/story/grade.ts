import type { PracticeCard } from './types';
export type Verdict='correct'|'incorrect'|'off_by_one'|'unsure';
export const normalize=(value:string)=>value.normalize('NFC').trim();
const equal=(a:unknown,b:unknown):boolean=>{
 if(typeof a==='string'&&typeof b==='string')return normalize(a)===normalize(b);
 if(Array.isArray(a)&&Array.isArray(b))return a.length===b.length&&a.every((v,i)=>equal(v,b[i]));
 return a===b;
};
const obj=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
export function grade(card:PracticeCard,answer:unknown):Verdict {
 let ok=false;
 switch(card.mode){
 case 'choice':ok=typeof answer==='number'&&!!card.options[answer]?.correct;break;
 case 'type':ok=typeof answer==='string'&&(card.accept??card.answers).some(a=>equal(a,answer));break;
 case 'order':ok=equal(answer,card.tokens);break;
 case 'match':ok=Array.isArray(answer)&&answer.length===card.pairs.length&&answer.every((right,left)=>right===left);break;
 case 'engine':return gradeEngine(card,answer);
 }
 return ok?'correct':'incorrect';
}
export function engineIsSkipped(card:PracticeCard):boolean {
 const ex=card.exercise;
 return !ex||!!ex.item.abstained||ex.answer==null||!['grid_fill','derive_next','sandhi_split','sandhi_join','scan_metre','reorder','contrast'].includes(ex.kind)||ex.kind==='sandhi_join'&&!obj(ex.answer).joined;
}
export function gradeEngine(card:PracticeCard,answer:unknown):Verdict {
 const exercise=card.exercise;
 if(!exercise||engineIsSkipped(card))return 'unsure';
 const expected=obj(exercise.answer),given=obj(answer),kind=exercise.kind;
 switch(kind){
 case 'derive_next':return typeof given.code==='string'&&normalize(given.code)?(equal(given.code,expected.code)?'correct':'incorrect'):'unsure';
 case 'contrast':{const pick=typeof given.pick==='string'?given.pick.toLowerCase():'';return pick==='a'||pick==='b'?(pick===expected.pick?'correct':'incorrect'):'unsure';}
 case 'sandhi_split':if(!given.first||!given.second)return 'unsure';return equal(given.first,expected.first)&&equal(given.second,expected.second)?'correct':equal(given.first,expected.second)&&equal(given.second,expected.first)?'off_by_one':'incorrect';
 case 'sandhi_join':if(!expected.joined)return 'unsure';return given.joined?(equal(given.joined,expected.joined)?'correct':'incorrect'):'unsure';
 case 'reorder':return Array.isArray(given.order)&&given.order.length?(Array.isArray(expected.equivalent_orders)&&expected.equivalent_orders.some(order=>equal(order,given.order))?'correct':'incorrect'):'unsure';
 case 'scan_metre':{if(!Array.isArray(given.weights)||!given.weights.length||!Array.isArray(expected.weights))return 'unsure';if(equal(given.weights,expected.weights))return 'correct';const want=expected.weights.flat(),got=given.weights.flat();return want.length===got.length&&want.filter((w,i)=>w!==got[i]).length===1?'off_by_one':'incorrect';}
 case 'grid_fill':{
  const want=Array.isArray(exercise.answer)?exercise.answer:[],cells=given.cells??given.answers;
  if(!Array.isArray(cells)||!want.length)return 'unsure';
  const key=(cell:unknown)=>{const c=obj(cell);return c.vibhakti+'.'+c.vacana;};
  const map=new Map(cells.map(cell=>[key(cell),obj(cell).form]));
  if(map.size!==want.length||!want.every(c=>map.has(key(c))))return 'unsure';
  const wrong=want.filter(c=>!equal(map.get(key(c)),obj(c).form)).length;
  return wrong===0?'correct':wrong===1&&want.length>1?'off_by_one':'incorrect';
 }
 default:return 'unsure';
 }
}
/** Shuffle indices, retaining repeated tokens as distinct tappable pieces. */
export function shuffledIndices(length:number, random:()=>number=Math.random):number[]{
 const out=Array.from({length},(_,i)=>i);for(let i=length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}
 if(length>1&&out.every((v,i)=>v===i))out.push(out.shift()!);return out;
}
