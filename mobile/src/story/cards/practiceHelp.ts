import type {PracticeCard} from '../types';
/** One selected tile of a match card: a left item or a right item, by position. */
export interface MatchTile {side:'L'|'R';at:number}
/** The one-line "how do I answer this" under a question; null where the answer is obvious (a plain choice) or a live status line takes its place (match). */
export function howTo(card:PracticeCard,hi:boolean):string|null {
 switch(card.mode){
  case 'order':return hi?'टुकड़ों को सही क्रम में एक-एक करके दबाएँ। आपका उत्तर डिब्बे में बनता जाएगा।':'Tap the pieces in the right order. Your answer builds up in the box.';
  case 'type':return hi?'टुकड़ों से उत्तर बनाएँ, या कीबोर्ड से लिखें।':'Build the answer from the pieces, or type it with the keyboard.';
  case 'engine':switch(card.exercise?.kind){
   case 'reorder':return hi?'शब्दों को सही क्रम में दबाएँ।':'Tap the words in the right order.';
   case 'grid_fill':return hi?'हर डिब्बे के लिए सही रूप चुनें।':'For each box, pick the form that fits.';
   case 'scan_metre':return hi?'श्लोक को अक्षर-अक्षर चलें: चौखटे वाले अक्षर के लिए “लघु” या “गुरु” दबाएँ।':'Go through the verse one syllable at a time: tap Light or Heavy for the boxed one.';
   case 'contrast':return hi?'सही रूप चुनें।':'Pick the correct form.';
   default:return hi?'सही उत्तर चुनें।':'Pick the right answer.';
  }
  default:return null;
 }
}
/** Join two sides of a match card. Tapping a joined tile lifts its pair so it can be changed; tapping an item on each side joins them (taking the partner over from any earlier pair). */
export function tapPair(tile:MatchTile|null,pairs:(number|null)[],side:'L'|'R',at:number):{tile:MatchTile|null;pairs:(number|null)[]} {
 if(tile&&tile.side!==side){const l=side==='L'?at:tile.at,r=side==='R'?at:tile.at;return {tile:null,pairs:pairs.map((v,j)=>j===l?r:v===r?null:v)};}
 const left=side==='L'?at:pairs.indexOf(at);
 if(left>=0&&pairs[left]!==null)return {tile:{side,at},pairs:pairs.map((v,j)=>j===left?null:v)};
 if(tile&&tile.at===at)return {tile:null,pairs};
 return {tile:{side,at},pairs};
}
export function matchStatus(tile:MatchTile|null,pairs:(number|null)[],hi:boolean):string {
 const done=pairs.filter(p=>p!==null).length,total=pairs.length;
 if(tile?.side==='L')return hi?'अब दाईं ओर उसका जोड़ीदार दबाएँ।':'Now tap its partner on the right.';
 if(tile?.side==='R')return hi?'अब बाईं ओर उसका जोड़ीदार दबाएँ।':'Now tap its partner on the left.';
 if(done===total)return hi?'सब जुड़ गए। “जाँचें” दबाएँ, या बदलने के लिए किसी जोड़ी को दबाएँ।':'All paired. Tap Check, or tap a pair to change it.';
 return (hi?'बाईं ओर का एक दबाएँ, फिर दाईं ओर उसका जोड़ीदार।':'Tap one on the left, then its partner on the right.')+' ('+done+'/'+total+')';
}
