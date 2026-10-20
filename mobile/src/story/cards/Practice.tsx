import React,{useState,useEffect,useContext} from 'react';
import {View,TextInput,Text} from 'react-native';
import {useGuideLang} from '../../hooks/useGuide';
import {useTypeScale} from '../../hooks/useTypeScale';
import type {PracticeCard,Option} from '../types';
import {grade,engineIsSkipped,type Verdict,shuffledIndices} from '../grade';
import {Bi,Sa,RomanContext} from '../text';
import {Button,Panel,Label} from '../ui';
import {useStoryTheme} from '../theme';
import {verseLayout,weightMark,weightsFromOrder,orderFromWeights} from '../metre';
export interface PracticeProgress {first:Verdict;latest:Verdict;solved:boolean}
export function OptionView({option}: {option:Option}) {return <>{option.sa?<Sa sa={option.sa} iast={option.iast} size={24}/>:null}<Bi value={option.text}/></>;}
export default function Practice({card,progress,onAnswer}: {card:PracticeCard;progress?:PracticeProgress;onAnswer:(verdict:Verdict)=>void}) {
 const {lang}=useGuideLang(),hi=lang==='hi',c=useStoryTheme(),{sized}=useTypeScale(),inherited=useContext(RomanContext);
 const [text,setText]=useState(''),[selected,setSelected]=useState<number[]>([]),[left,setLeft]=useState<number|null>(null),[pairs,setPairs]=useState<(number|null)[]>(()=>card.pairs.map(()=>null));
 const [verdict,setVerdict]=useState<Verdict|null>(progress?.latest??null),[picked,setPicked]=useState<number|null>(null);
 const [bank]=useState(()=>shuffledIndices(card.mode==='order'?card.tokens.length:card.tiles.length));
 const [rightBank]=useState(()=>shuffledIndices(card.pairs.length));
 const unsure=card.mode==='engine'&&engineIsSkipped(card);
 useEffect(()=>{if(unsure&&!progress)onAnswer('unsure');},[unsure,progress,onAnswer]);
 const submit=(answer:unknown,option?:number)=>{const v=grade(card,answer);setVerdict(v);setPicked(option??null);onAnswer(v);};
 const frozen=progress?.solved??false;
 const reset=()=>{setVerdict(null);setPicked(null);setText('');setSelected([]);setPairs(card.pairs.map(()=>null));setLeft(null);};
 const roman=inherited&&(card.roman==='show'||verdict!==null||!!progress);
 const tokens=card.mode==='order'?card.tokens:card.tiles;
 const answer=selected.map(i=>tokens[i]);
 return <RomanContext.Provider value={roman}><View style={{gap:12}}><Bi value={card.prompt}/>
 {card.mode==='choice'?card.options.map((option,i)=><Button key={i} label={option.sa??option.text?.[lang]??String(i+1)} selected={picked===i} disabled={frozen} onPress={()=>submit(i,i)}><OptionView option={option}/></Button>):null}
 {card.mode==='type'||card.mode==='order'?<>
 <Panel><Sa sa={card.mode==='type'?text:answer.join(' ')} roman={false}/>{!text&&!selected.length?<Label>{hi?'उत्तर यहाँ बनेगा':'Build your answer here'}</Label>:null}</Panel>
 <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{bank.map(i=><Button key={i} label={(hi?'जोड़ें: ':'Add: ')+tokens[i]} disabled={frozen||selected.includes(i)} onPress={()=>{const next=[...selected,i];setSelected(next);if(card.mode==='type')setText(next.map(j=>tokens[j]).join(''));}}><Sa sa={tokens[i]} iast={(card.mode==='order'?card.tokens_iast:card.tiles_iast)?.[i]} size={25}/></Button>)}</View>
 <Button label={hi?'अंतिम हटाएँ':'Backspace'} disabled={frozen||(!text&&!selected.length)} onPress={()=>{setSelected(v=>v.slice(0,-1));if(card.mode==='type')setText(selected.length?selected.slice(0,-1).map(j=>tokens[j]).join(''):Array.from(text).slice(0,-1).join(''));}}/>
 {card.mode==='type'?<TextInput accessibilityLabel={hi?'कीबोर्ड से उत्तर':'Type your answer with the keyboard'} placeholder={hi?'या यहाँ लिखें':'Or type here'} placeholderTextColor={c.ink3} value={text} editable={!frozen} onChangeText={value=>{setSelected([]);setText(value);}} style={{fontFamily:'TiroDevanagariSanskrit_400Regular',fontSize:sized(24),lineHeight:sized(42),borderWidth:1,borderColor:c.lineStrong,padding:12,color:c.ink,backgroundColor:c.surface}}/>:null}
 <Button primary label={hi?'जाँचें':'Check'} disabled={frozen||(card.mode==='type'?!text.trim():selected.length!==tokens.length)} onPress={()=>submit(card.mode==='type'?text:answer)}/>
 </>:null}
 {card.mode==='match'?<><View style={{flexDirection:'row',gap:8}}><View style={{flex:1,gap:8}}>{card.pairs.map((pair,i)=><Button key={i} label={(hi?'बायाँ: ':'Left: ')+(pair.left.sa??pair.left.text?.[lang])} selected={left===i} disabled={frozen} onPress={()=>setLeft(i)}><OptionView option={pair.left}/><Label>{pairs[i]===null?'':String(rightBank.indexOf(pairs[i]!)+1)}</Label></Button>)}</View><View style={{flex:1,gap:8}}>{rightBank.map((i,at)=><Button key={i} label={(hi?'दायाँ: ':'Right: ')+(pairLabel(card.pairs[i].right,lang))} selected={pairs.includes(i)} disabled={frozen||left===null} onPress={()=>{if(left===null)return;setPairs(old=>old.map((r,j)=>j===left?i:r===i?null:r));setLeft(null);}}><Label>{at+1}</Label><OptionView option={card.pairs[i].right}/></Button>)}</View></View><Button primary label={hi?'जाँचें':'Check'} disabled={frozen||pairs.some(p=>p===null)} onPress={()=>submit(pairs)}/></>:null}
 {card.mode==='engine'&&!unsure?<EngineInput card={card} disabled={frozen} onSubmit={submit}/>:null}
 {unsure?<Label>{hi?'यह प्रश्न छोड़ दिया गया है।':'This item is skipped.'}</Label>:null}
 {verdict&&!unsure?<View accessibilityLiveRegion="polite" style={{gap:10,padding:14,borderWidth:1,borderColor:verdict==='correct'?c.done:c.lineStrong}}><Text style={{fontFamily:'Mukta_600SemiBold',fontSize:sized(18),color:verdict==='correct'?c.doneInk:verdict==='unsure'?c.ink2:c.wrongInk}}>{verdict==='correct'?(hi?'सही':'Correct'):verdict==='unsure'?(hi?'छोड़ा गया':'Skipped'):(hi?'फिर कोशिश करें':'Try again')}</Text>{picked!==null?<Bi value={card.options[picked]?.why}/>:null}<Bi value={card.explain}/>{card.story?<Panel><Bi value={verdict==='correct'?card.story.success:card.story.failure}/></Panel>:null}{verdict!=='correct'&&verdict!=='unsure'?<Button label={hi?'फिर कोशिश करें':'Try again'} onPress={reset}/>:null}</View>:null}
 </View></RomanContext.Provider>;
}
function pairLabel(option:Option,lang:'en'|'hi'){return option.sa??option.text?.[lang]??'';}
/** The whole verse by word; the syllable being marked is boxed, marked ones carry ◡ (light) or — (heavy). */
function MetreVerse({text,lines,marks,live}:{text?:string;lines:string[][];marks:number[];live:boolean}) {
 const c=useStoryTheme(),{sized}=useTypeScale(),{lang}=useGuideLang(),hi=lang==='hi';
 const flat=lines.flat(),total=flat.length,at=marks.length,now=live&&at<total?flat[at]:null;
 const progress=at>=total?(hi?'सभी '+total+' अक्षर चिह्नित':'All '+total+' syllables marked'):live?(hi?'अक्षर '+(at+1)+' / '+total:'Syllable '+(at+1)+' of '+total):'';
 const spoken=(text??flat.join(' '))+'. '+progress+(now?': '+now:'')+(at?'. '+marks.map(m=>m===0?(hi?'लघु':'light'):(hi?'गुरु':'heavy')).join(', '):'');
 return <View style={{gap:6}}>
  <View accessible accessibilityLabel={spoken} style={{padding:12,gap:10,borderWidth:1,borderColor:c.line,backgroundColor:c.surface}}>
   {verseLayout(text,lines).map((line,l)=><View key={l} style={{flexDirection:'row',flexWrap:'wrap',columnGap:14,rowGap:10}}>{line.map((word,w)=><View key={w} style={{flexDirection:'row',flexWrap:'wrap',maxWidth:'100%'}}>{word.map(cell=>{const here=live&&cell.i===at,marked=cell.i<at;return <View key={cell.i} style={{alignItems:'center',minWidth:sized(22),paddingHorizontal:2,borderWidth:2,borderColor:here?c.actionText:c.transparent,backgroundColor:here?c.paper:c.transparent}}>
    <Text style={{fontFamily:'TiroDevanagariSanskrit_400Regular',fontSize:sized(24),lineHeight:sized(38),color:c.ink}}>{cell.sa}</Text>
    <Text style={{fontFamily:'Mukta_600SemiBold',fontSize:sized(16),lineHeight:sized(22),color:marked?c.ink:c.ink3}}>{marked?weightMark(marks[cell.i]):here?'?':'·'}</Text>
   </View>;})}</View>)}</View>)}
  </View>
  {progress?<Label>{progress}</Label>:null}
 </View>;
}
function EngineInput({card,disabled,onSubmit}:{card:PracticeCard;disabled:boolean;onSubmit:(answer:unknown)=>void}) {
 const ex=card.exercise!,item=ex.item,{lang}=useGuideLang(),hi=lang==='hi',c=useStoryTheme(),{sized}=useTypeScale();const [cells,setCells]=useState<Record<string,string>>({}),[order,setOrder]=useState<number[]>([]);
 const options=Array.isArray(item.options)?item.options:[];
 if(ex.kind==='contrast')return <View style={{gap:8}}>{['a','b'].map(pick=><Button key={pick} label={String((item[pick] as {form?:string})?.form??pick)} disabled={disabled} onPress={()=>onSubmit({pick})}><Sa sa={String((item[pick] as {form?:string})?.form??pick)}/></Button>)}</View>;
 if(ex.kind==='sandhi_split'||ex.kind==='sandhi_join'||ex.kind==='derive_next')return <View style={{gap:8}}>{typeof item.joined==='string'?<Sa sa={item.joined}/>:null}{typeof item.first==='string'?<Sa sa={item.first+' + '+item.second}/>:null}{options.map((option,i)=>{const record=option as Record<string,string>;const text=typeof option==='string'?option:ex.kind==='sandhi_split'?record.first+' + '+record.second:record.code;return <Button key={i} label={text} disabled={disabled} onPress={()=>onSubmit(ex.kind==='sandhi_split'?option:ex.kind==='sandhi_join'?{joined:option}:{code:typeof option==='string'?option:record.code})}><Sa sa={text}/></Button>;})}</View>;
 if(ex.kind==='grid_fill'){
 const blanks=(item.blanks??[]) as {vibhakti:string;vacana:string;choices:string[]}[];
 return <>{blanks.map((blank,i)=>{const key=blank.vibhakti+'.'+blank.vacana;return <Panel key={i}><Label>{key}</Label>{blank.choices.map(form=><Button key={form} label={form} selected={cells[key]===form} disabled={disabled} onPress={()=>setCells(v=>({...v,[key]:form}))}><Sa sa={form}/></Button>)}</Panel>;})}<Button label={hi?'जाँचें':'Check'} disabled={disabled||blanks.some(b=>!cells[b.vibhakti+'.'+b.vacana])} onPress={()=>onSubmit({cells:blanks.map(b=>({...b,form:cells[b.vibhakti+'.'+b.vacana]}))})}/></>;
 }
 if(ex.kind==='reorder'){
 const tokens=(item.shuffled??[]) as string[];
 return <><Sa sa={order.map(i=>tokens[i]).join(' ')}/>{tokens.map((t,i)=><Button key={i} label={t} disabled={disabled||order.includes(i)} onPress={()=>setOrder(v=>[...v,i])}><Sa sa={t}/></Button>)}<Button label={hi?'अंतिम हटाएँ':'Backspace'} disabled={disabled} onPress={()=>setOrder(v=>v.slice(0,-1))}/><Button label={hi?'जाँचें':'Check'} disabled={disabled||order.length!==tokens.length} onPress={()=>onSubmit({order:order.map(i=>tokens[i])})}/></>;
 }
 // Metre input marks the engine's syllables one at a time, but always shows the whole verse: a short vowel is heavy before a joined letter, which only the next letters reveal.
 if(ex.kind==='scan_metre') {const syllables=(item.syllables??[]) as string[][];const flat=syllables.flat();const marks=disabled?orderFromWeights((ex.answer as {weights?:unknown}|null)?.weights)??order:order;return <><MetreVerse text={typeof item.text==='string'?item.text:undefined} lines={syllables} marks={marks} live={!disabled}/><View style={{flexDirection:'row',gap:8}}>{['L','G'].map((v,i)=><Button key={v} label={v==='L'?(hi?'लघु':'Light'):(hi?'गुरु':'Heavy')} disabled={disabled||order.length===flat.length} onPress={()=>setOrder(a=>[...a,i])} style={{flex:1}}><Text style={{fontFamily:'Mukta_600SemiBold',fontSize:sized(16),color:c.ink}}>{weightMark(i)} {v==='L'?(hi?'लघु':'Light'):(hi?'गुरु':'Heavy')}</Text></Button>)}</View><Button label={hi?'अंतिम हटाएँ':'Backspace'} onPress={()=>setOrder(v=>v.slice(0,-1))}/><Button label={hi?'जाँचें':'Check'} disabled={disabled||order.length!==flat.length} onPress={()=>onSubmit({weights:weightsFromOrder(syllables,order)})}/></>;}
 return <Label>{hi?'यह प्रश्न छोड़ दिया गया है।':'This item is skipped.'}</Label>;
}
