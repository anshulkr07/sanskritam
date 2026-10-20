import React,{useState,useEffect,useContext} from 'react';
import {View,TextInput,Text,Pressable} from 'react-native';
import {useGuideLang} from '../../hooks/useGuide';
import {useTypeScale} from '../../hooks/useTypeScale';
import {useDailyHint} from '../../services/dailyHint';
import type {PracticeCard,Option} from '../types';
import {grade,engineIsSkipped,type Verdict,shuffledIndices} from '../grade';
import {Bi,Sa,RomanContext} from '../text';
import {Button,Panel,Label,Chip,BulbIcon} from '../ui';
import {useStoryTheme} from '../theme';
import {VIBHAKTI_LABELS,VACANA_LABELS,pick} from '../widgets/labels';
import {verseLayout,weightMark,weightsFromOrder,orderFromWeights} from '../metre';
import {howTo,matchStatus,tapPair,type MatchTile} from './practiceHelp';
export interface PracticeProgress {first:Verdict;latest:Verdict;solved:boolean;hinted?:boolean}
export function OptionView({option}: {option:Option}) {return <>{option.sa?<Sa sa={option.sa} iast={option.iast} size={24}/>:null}{option.text?<Bi value={option.text}/>:null}</>;}
export default function Practice({card,progress,onAnswer}: {card:PracticeCard;progress?:PracticeProgress;onAnswer:(verdict:Verdict,hinted?:boolean)=>void}) {
 const {lang}=useGuideLang(),hi=lang==='hi',c=useStoryTheme(),{sized}=useTypeScale(),inherited=useContext(RomanContext),hint=useDailyHint();
 const [text,setText]=useState(''),[selected,setSelected]=useState<number[]>([]),[tile,setTile]=useState<MatchTile|null>(null),[pairs,setPairs]=useState<(number|null)[]>(()=>card.pairs.map(()=>null));
 const [verdict,setVerdict]=useState<Verdict|null>(progress?.latest??null),[picked,setPicked]=useState<number|null>(null);
 const [hinted,setHinted]=useState(progress?.hinted??false),[asking,setAsking]=useState(false),[spent,setSpent]=useState(false);
 const [bank]=useState(()=>shuffledIndices(card.mode==='order'?card.tokens.length:card.tiles.length));
 const [rightBank]=useState(()=>shuffledIndices(card.pairs.length));
 const unsure=card.mode==='engine'&&engineIsSkipped(card);
 useEffect(()=>{if(unsure&&!progress)onAnswer('unsure');},[unsure,progress,onAnswer]);
 const submit=(answer:unknown,option?:number)=>{const v=grade(card,answer);setVerdict(v);setPicked(option??null);onAnswer(v);};
 const frozen=progress?.solved??false;
 const reset=()=>{setVerdict(null);setPicked(null);setText('');setSelected([]);setPairs(card.pairs.map(()=>null));setTile(null);};
 const roman=inherited&&(card.roman==='show'||verdict!==null||!!progress);
 const tokens=card.mode==='order'?card.tokens:card.tiles;
 const answer=selected.map(i=>tokens[i]);
 const canHint=!frozen&&!hinted&&!unsure&&verdict!=='correct';
 const askHint=()=>{if(hint.available){setAsking(a=>!a);setSpent(false);}else{setSpent(s=>!s);setAsking(false);}};
 const showAnswer=async()=>{setAsking(false);if(await hint.use()){setHinted(true);setVerdict('unsure');onAnswer('unsure',true);}};
 const how=howTo(card,hi);
 return <RomanContext.Provider value={roman}><View style={{gap:10}}>
 <View style={{flexDirection:'row',alignItems:'flex-start',gap:8}}><View style={{flex:1}}><Bi value={card.prompt}/></View>{canHint?<Chip label={hint.available?(hi?'संकेत: उत्तर दिखाता है। दिन में एक मुफ़्त।':'Hint: shows the answer. One free hint a day.'):(hi?'आज का संकेत इस्तेमाल हो चुका। कल नया मिलेगा।':'Today’s hint is used. A new one tomorrow.')} onPress={askHint} selected={asking||spent}><View><BulbIcon color={hint.available?c.actionText:c.ink3}/>{hint.available?<View style={{position:'absolute',top:-4,right:-6,width:8,height:8,backgroundColor:c.action}}/>:null}</View></Chip>:null}</View>
 {how&&!(card.mode==='match')?<Text style={{fontFamily:'Mukta_400Regular',fontSize:sized(14),lineHeight:sized(20),color:c.ink3}}>{how}</Text>:null}
 {asking?<Panel><Text style={{fontFamily:'Mukta_400Regular',fontSize:sized(15),lineHeight:sized(22),color:c.ink}}>{hi?'आज का संकेत इस्तेमाल करें? यह इस प्रश्न का उत्तर दिखा देगा। पूरे ऐप में दिन में एक ही मिलता है।':'Use today’s hint? It shows the answer to this question. You get one a day, across the whole app.'}</Text><View style={{flexDirection:'row',gap:8}}><Button primary label={hi?'उत्तर दिखाएँ':'Show the answer'} onPress={()=>{void showAnswer();}} style={{flex:1}}/><Button label={hi?'अभी नहीं':'Not now'} onPress={()=>setAsking(false)}/></View></Panel>:null}
 {spent?<Label>{hi?'आज का संकेत इस्तेमाल हो चुका। कल नया मिलेगा।':'Today’s hint is used. You get a new one tomorrow.'}</Label>:null}
 {hinted&&card.mode!=='choice'?<Panel><Label>{hi?'उत्तर':'Answer'}</Label><HintAnswer card={card} lang={lang}/></Panel>:null}
 {card.mode==='choice'?card.options.map((option,i)=><Button key={i} label={option.sa??option.text?.[lang]??String(i+1)} selected={picked===i} disabled={frozen} style={hinted&&option.correct?{borderColor:c.done,borderWidth:2}:undefined} onPress={()=>submit(i,i)}><OptionView option={option}/>{hinted&&option.correct?<Label>{hi?'✓ उत्तर':'✓ Answer'}</Label>:null}</Button>):null}
 {card.mode==='type'||card.mode==='order'?<>
 <Panel><Sa sa={card.mode==='type'?text:answer.join(' ')} roman={false}/>{!text&&!selected.length?<Label>{hi?'उत्तर यहाँ बनेगा':'Build your answer here'}</Label>:null}</Panel>
 <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{bank.map(i=><Button key={i} label={(hi?'जोड़ें: ':'Add: ')+tokens[i]} disabled={frozen||selected.includes(i)} onPress={()=>{const next=[...selected,i];setSelected(next);if(card.mode==='type')setText(next.map(j=>tokens[j]).join(''));}}><Sa sa={tokens[i]} iast={(card.mode==='order'?card.tokens_iast:card.tiles_iast)?.[i]} size={25}/></Button>)}</View>
 <Button label={hi?'अंतिम हटाएँ':'Backspace'} disabled={frozen||(!text&&!selected.length)} onPress={()=>{setSelected(v=>v.slice(0,-1));if(card.mode==='type')setText(selected.length?selected.slice(0,-1).map(j=>tokens[j]).join(''):Array.from(text).slice(0,-1).join(''));}}/>
 {card.mode==='type'?<TextInput accessibilityLabel={hi?'कीबोर्ड से उत्तर':'Type your answer with the keyboard'} placeholder={hi?'या यहाँ लिखें':'Or type here'} placeholderTextColor={c.ink3} value={text} editable={!frozen} onChangeText={value=>{setSelected([]);setText(value);}} style={{fontFamily:'TiroDevanagariSanskrit_400Regular',fontSize:sized(24),lineHeight:sized(42),borderWidth:1,borderColor:c.lineStrong,padding:12,color:c.ink,backgroundColor:c.surface}}/>:null}
 <Button primary label={hi?'जाँचें':'Check'} disabled={frozen||(card.mode==='type'?!text.trim():selected.length!==tokens.length)} onPress={()=>submit(card.mode==='type'?text:answer)}/>
 </>:null}
 {card.mode==='match'?<><Text accessibilityLiveRegion="polite" style={{fontFamily:'Mukta_600SemiBold',fontSize:sized(14),lineHeight:sized(20),color:c.ink2}}>{matchStatus(tile,pairs,hi)}</Text>
 <View style={{flexDirection:'row',gap:10}}>
 <View style={{flex:1,gap:8}}>{card.pairs.map((pair,i)=><MatchTileView key={i} option={pair.left} label={(hi?'बायाँ: ':'Left: ')+pairLabel(pair.left,lang)} badge={pairs[i]===null?null:i+1} active={tile?.side==='L'&&tile.at===i} disabled={frozen} onPress={()=>{const next=tapPair(tile,pairs,'L',i);setTile(next.tile);setPairs(next.pairs);}}/>)}</View>
 <View style={{flex:1,gap:8}}>{rightBank.map(i=><MatchTileView key={i} option={card.pairs[i].right} label={(hi?'दायाँ: ':'Right: ')+pairLabel(card.pairs[i].right,lang)} badge={pairs.indexOf(i)<0?null:pairs.indexOf(i)+1} active={tile?.side==='R'&&tile.at===i} disabled={frozen} onPress={()=>{const next=tapPair(tile,pairs,'R',i);setTile(next.tile);setPairs(next.pairs);}}/>)}</View></View>
 <Button primary label={hi?'जाँचें':'Check'} disabled={frozen||pairs.some(p=>p===null)} onPress={()=>submit(pairs)}/></>:null}
 {card.mode==='engine'&&!unsure?<EngineInput card={card} disabled={frozen} onSubmit={submit}/>:null}
 {unsure?<Label>{hi?'यह प्रश्न छोड़ दिया गया है।':'This item is skipped.'}</Label>:null}
 {verdict&&!unsure?<View accessibilityLiveRegion="polite" style={{gap:10,padding:14,borderWidth:1,borderColor:verdict==='correct'?c.done:c.lineStrong}}><Text style={{fontFamily:'Mukta_600SemiBold',fontSize:sized(18),color:verdict==='correct'?c.doneInk:verdict==='unsure'?c.ink2:c.wrongInk}}>{verdict==='correct'?(hi?'सही':'Correct'):verdict==='unsure'?(hinted?(hi?'उत्तर दिखाया गया':'Answer shown'):(hi?'छोड़ा गया':'Skipped')):(hi?'फिर कोशिश करें':'Try again')}</Text>{picked!==null?<Bi value={card.options[picked]?.why}/>:null}<Bi value={card.explain}/>{card.story?<Panel><Bi value={verdict==='correct'?card.story.success:card.story.failure}/></Panel>:null}{verdict!=='correct'&&verdict!=='unsure'?<Button label={hi?'फिर कोशिश करें':'Try again'} onPress={reset}/>:null}</View>:null}
 </View></RomanContext.Provider>;
}
function pairLabel(option:Option,lang:'en'|'hi'){return option.sa??option.text?.[lang]??'';}
/** One tappable side of a match card: a pair number appears on both tiles once they are joined, so a pair is read by its number. */
function MatchTileView({option,label,badge,active,disabled,onPress}:{option:Option;label:string;badge:number|null;active:boolean;disabled:boolean;onPress:()=>void}) {
 const c=useStoryTheme(),{sized}=useTypeScale();
 return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled,selected:active}} disabled={disabled} onPress={onPress} style={{minHeight:52,paddingVertical:8,paddingLeft:10,paddingRight:badge!==null?34:10,justifyContent:'center',borderWidth:active?3:1,borderColor:active?c.actionText:badge!==null?c.ochre:c.lineStrong,backgroundColor:active||badge!==null?c.paper:c.surface,opacity:disabled?.6:1}}>
  <OptionView option={option}/>
  {badge!==null?<View style={{position:'absolute',top:6,right:6,minWidth:22,height:22,alignItems:'center',justifyContent:'center',backgroundColor:c.ochre}}><Text style={{fontFamily:'Mukta_700Bold',fontSize:sized(13),color:c.white}}>{badge}</Text></View>:null}
 </Pressable>;
}
function gridLabel(vibhakti:string,vacana:string,lang:'en'|'hi'){return pick(VIBHAKTI_LABELS[vibhakti],vibhakti,lang)+' · '+pick(VACANA_LABELS[vacana],vacana,lang);}
/** What the daily hint shows: the right answer, in the same form the learner would have built it. */
function HintAnswer({card,lang}:{card:PracticeCard;lang:'en'|'hi'}) {
 const ex=card.exercise,ans=(ex?.answer??null) as Record<string,unknown>|{vibhakti:string;vacana:string;form:string}[]|null;
 if(card.mode==='choice')return <>{card.options.filter(o=>o.correct).map((o,i)=><View key={i}><OptionView option={o}/></View>)}</>;
 if(card.mode==='type')return <Sa sa={card.answers[0]} iast={card.answers_iast?.[0]}/>;
 if(card.mode==='order')return <Sa sa={card.tokens.join(' ')} iast={card.tokens_iast?.join(' ')}/>;
 if(card.mode==='match')return <>{card.pairs.map((p,i)=><View key={i} style={{flexDirection:'row',gap:10,alignItems:'center'}}><Text style={{fontFamily:'Mukta_700Bold'}}>{i+1}</Text><View style={{flex:1}}><OptionView option={p.left}/></View><Text>→</Text><View style={{flex:1}}><OptionView option={p.right}/></View></View>)}</>;
 if(!ex||!ans)return null;
 if(ex.kind==='grid_fill'&&Array.isArray(ans))return <>{ans.map((cell,i)=><View key={i}><Label>{gridLabel(cell.vibhakti,cell.vacana,lang)}</Label><Sa sa={cell.form} size={22}/></View>)}</>;
 const rec=ans as Record<string,unknown>;
 if(ex.kind==='reorder'){const order=(rec.equivalent_orders as string[][]|undefined)?.[0];return order?<Sa sa={order.join(' ')}/>:null;}
 if(ex.kind==='scan_metre'&&Array.isArray(rec.weights))return <Label>{(rec.weights as string[][]).map(line=>line.map(w=>w==='L'?weightMark(0):weightMark(1)).join(' ')).join('   ')}</Label>;
 if(ex.kind==='contrast'){const form=(ex.item[String(rec.pick)] as {form?:string}|undefined)?.form;return form?<Sa sa={form}/>:null;}
 if(ex.kind==='sandhi_join'&&typeof rec.joined==='string')return <Sa sa={rec.joined}/>;
 return null;
}
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
 return <>{blanks.map((blank,i)=>{const key=blank.vibhakti+'.'+blank.vacana;return <Panel key={i}><Label>{gridLabel(blank.vibhakti,blank.vacana,lang)}</Label>{blank.choices.map(form=><Button key={form} label={form} selected={cells[key]===form} disabled={disabled} onPress={()=>setCells(v=>({...v,[key]:form}))}><Sa sa={form}/></Button>)}</Panel>;})}<Button primary label={hi?'जाँचें':'Check'} disabled={disabled||blanks.some(b=>!cells[b.vibhakti+'.'+b.vacana])} onPress={()=>onSubmit({cells:blanks.map(b=>({...b,form:cells[b.vibhakti+'.'+b.vacana]}))})}/></>;
 }
 if(ex.kind==='reorder'){
 const tokens=(item.shuffled??[]) as string[];
 return <><Panel><Sa sa={order.map(i=>tokens[i]).join(' ')} roman={false}/>{!order.length?<Label>{hi?'उत्तर यहाँ बनेगा':'Build your answer here'}</Label>:null}</Panel><View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{tokens.map((t,i)=><Button key={i} label={t} disabled={disabled||order.includes(i)} onPress={()=>setOrder(v=>[...v,i])}><Sa sa={t}/></Button>)}</View><Button label={hi?'अंतिम हटाएँ':'Backspace'} disabled={disabled||!order.length} onPress={()=>setOrder(v=>v.slice(0,-1))}/><Button primary label={hi?'जाँचें':'Check'} disabled={disabled||order.length!==tokens.length} onPress={()=>onSubmit({order:order.map(i=>tokens[i])})}/></>;
 }
 // Metre input marks the engine's syllables one at a time, but always shows the whole verse: a short vowel is heavy before a joined letter, which only the next letters reveal.
 if(ex.kind==='scan_metre') {const syllables=(item.syllables??[]) as string[][];const flat=syllables.flat();const marks=disabled?orderFromWeights((ex.answer as {weights?:unknown}|null)?.weights)??order:order;return <><MetreVerse text={typeof item.text==='string'?item.text:undefined} lines={syllables} marks={marks} live={!disabled}/><View style={{flexDirection:'row',gap:8}}>{['L','G'].map((v,i)=><Button key={v} label={v==='L'?(hi?'लघु':'Light'):(hi?'गुरु':'Heavy')} disabled={disabled||order.length===flat.length} onPress={()=>setOrder(a=>[...a,i])} style={{flex:1}}><Text style={{fontFamily:'Mukta_600SemiBold',fontSize:sized(16),color:c.ink}}>{weightMark(i)} {v==='L'?(hi?'लघु':'Light'):(hi?'गुरु':'Heavy')}</Text></Button>)}</View><Button label={hi?'अंतिम हटाएँ':'Backspace'} disabled={disabled||!order.length} onPress={()=>setOrder(v=>v.slice(0,-1))}/><Button primary label={hi?'जाँचें':'Check'} disabled={disabled||order.length!==flat.length} onPress={()=>onSubmit({weights:weightsFromOrder(syllables,order)})}/></>;}
 return <Label>{hi?'यह प्रश्न छोड़ दिया गया है।':'This item is skipped.'}</Label>;
}
