/** Pure helpers for the scan_metre card: lay a verse out by word, and turn taps into the weights the engine grades. */
export interface MetreCell{i:number;sa:string}
const strip=(value:string)=>value.normalize('NFC').replace(/[\sऽ]/g,'');
/**
 * Cells per line, per word. The engine's syllables carry no word breaks, so they are regrouped
 * against item.text; if the two disagree anywhere, each line is one group (still the whole verse).
 */
export function verseLayout(text:string|undefined,lines:string[][]):MetreCell[][][]{
 let n=0;const cells=lines.map(line=>line.map(sa=>({i:n++,sa})));
 const whole=cells.map(line=>[line]),words=(text??'').split(/\s+/).map(strip).filter(Boolean);
 const out:MetreCell[][][]=[];let w=0;
 for(const line of cells){
  const groups:MetreCell[][]=[];let at=0;
  while(at<line.length){
   if(w>=words.length)return whole;
   let joined='';const group:MetreCell[]=[];
   while(at<line.length&&joined.length<words[w].length){joined+=strip(line[at].sa);group.push(line[at++]);}
   if(joined!==words[w])return whole;
   groups.push(group);w++;
  }
  out.push(groups);
 }
 return w===words.length?out:whole;
}
/** 0 = light (laghu), 1 = heavy (guru), exactly as the Light/Heavy buttons record them. */
export const weightMark=(value:number)=>value===0?'◡':'—';
export function weightsFromOrder(lines:string[][],order:number[]):('L'|'G')[][]{let at=0;return lines.map(line=>line.map(()=>order[at++]===0?'L':'G'));}
export function orderFromWeights(weights:unknown):number[]|null{return Array.isArray(weights)&&weights.every(line=>Array.isArray(line))?(weights as string[][]).flat().map(w=>w==='L'?0:1):null;}
