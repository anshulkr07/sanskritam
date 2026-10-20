/** Compare complete rendered forms without slicing an Indic grapheme. If a
 * runtime lacks Segmenter, compare whole strings rather than split a conjunct. */
export function changeSpan(before:string,after:string){
 const segmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter('sa',{granularity:'grapheme'}):null;
 const split=(text:string)=>segmenter?Array.from(segmenter.segment(text.normalize('NFC')),x=>x.segment):[text.normalize('NFC')];
 const a=split(before),b=split(after);let left=0,right=0;
 while(left<a.length&&left<b.length&&a[left]===b[left])left++;
 while(right<a.length-left&&right<b.length-left&&a[a.length-1-right]===b[b.length-1-right])right++;
 return {unchanged:before.normalize('NFC')===after.normalize('NFC'),prefix:a.slice(0,left).join(''),
  removed:a.slice(left,a.length-right).join(''),added:b.slice(left,b.length-right).join(''),suffix:a.slice(a.length-right).join('')};
}
