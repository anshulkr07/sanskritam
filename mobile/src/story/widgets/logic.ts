import type {MarkWordsBuilt, LetterBuilderBuilt} from '../types';
export function markResult(params:MarkWordsBuilt,selected:number[]){return params.passage.map((word,i)=>{const wanted=params.targets.includes(word),picked=selected.includes(i);return wanted?(picked?'found':'missed'):(picked?'wrong':'neutral');});}
export function joinLetter(base:string,chip:string,halves:string[]){return (halves.includes(chip)?chip+base:base+chip).normalize('NFC');}
export function rhythmResult(expected:string,given:string){return expected===given;}

// ─── form_explorer ───
const COMBINING=/^[\u0900-\u0903\u093A-\u094F\u0951-\u0957\u0962\u0963]/;
/** A noun form as its stem and its ending ("देव" + "ेन"), or null when the stem itself changes. */
export function splitEnding(stem:string,form:string){
 const base=stem.normalize('NFC').replace(/\u094D$/,''),word=form.normalize('NFC');let i=0;
 while(i<base.length&&i<word.length&&base[i]===word[i])i++;
 if(i<base.length)return null;
 const tail=word.slice(i);return {head:word.slice(0,i),tail,shown:tail?(COMBINING.test(tail)?'\u25CC':'')+tail:''};
}

// ─── role_arrows ───
export type RoleStatus='verb'|'unset'|'correct'|'wrong';
export function roleResult(sentence:{role:string}[],picks:Record<number,string>):RoleStatus[]{
 return sentence.map((word,i)=>word.role==='kriya'?'verb':picks[i]===undefined?'unset':picks[i]===word.role?'correct':'wrong');
}

// ─── word_shuffle ───
/** An order is natural unless it opens with a word that never opens a sentence (च, वा, हि…). */
export function naturalOrder(order:string[],notFirst:string[]){return !notFirst.includes(order[0]);}
export function allOrders(words:string[]):string[][]{
 if(words.length<=1)return [words.slice()];
 return words.flatMap((word,i)=>allOrders([...words.slice(0,i),...words.slice(i+1)]).map(rest=>[word,...rest]));
}
export function naturalOrders(words:string[],notFirst:string[]){return allOrders(words).filter(order=>naturalOrder(order,notFirst));}
export function swapWords(order:string[],i:number,j:number){const next=order.slice();[next[i],next[j]]=[next[j],next[i]];return next;}
/** A different order from `order`, chosen with `random` (0 ≤ r < 1); `order` itself when there is only one. */
export function shuffled(order:string[],random:()=>number){
 const others=allOrders(order).filter(candidate=>candidate.join('|')!==order.join('|'));
 return others.length?others[Math.floor(random()*others.length)%others.length]:order;
}

// ─── time_slider ───
export function clampIndex(i:number,length:number){return Math.max(0,Math.min(length-1,i));}

// ─── word_factory ───
export function factoryKey(dhatu:string,krt:string){return dhatu+'|'+krt;}
/** The word the engine made from a root and a suffix, or null when it made none. */
export function factoryResult(results:Record<string,string>,dhatu:string,krt:string){return results[factoryKey(dhatu,krt)]??null;}

// ─── compound_unpacker ───
export type UnpackStage=0|1|2;
export function nextStage(stage:UnpackStage):UnpackStage{return stage>=2?2:(stage+1) as UnpackStage;}
export function kindResult(kind:string,picked:string|null){return picked===null?'unset':picked===kind?'correct':'wrong';}

// ─── derivation_stepper ───
/** True when the step changes the form (a step like 1.3.2 only names a marker). */
export function stepChanged(steps:{result:string}[],i:number){return i===0||steps[i].result!==steps[i-1].result;}
export function clampSteps(n:number,total:number){return Math.max(1,Math.min(total,n));}
