import React from 'react';
import {Modal,Pressable,ScrollView,View,useWindowDimensions} from 'react-native';
import {useReducedMotion} from '../../hooks/useReducedMotion';
import {useGuideLang} from '../../hooks/useGuide';
import {useStoryTheme} from '../theme';
import {Bi,Sa} from '../text';
import {Button,Label,Panel,useCopy} from '../ui';
import Picture from '../cards/Picture';
import {Video} from '../cards/content';
import {findUnit,unitAvailable,canTestOut} from '../selectors';
import type {StoryIndex,StoryState} from '../types';
export default function UnitSheet({index,state,unitId,onClose,onLesson}:{index:StoryIndex;state:StoryState;unitId:string|null;onClose:()=>void;onLesson:(id:string,testOut?:boolean)=>void}){
 const c=useStoryTheme(),hi=useCopy(),{lang}=useGuideLang(),reduced=useReducedMotion(),{height}=useWindowDimensions();const context=findUnit(index,unitId),unit=context?.unit;
 if(!context||!unit)return null;
 const done=!!state.units[unit.id]?.done,available=unitAvailable(state,unit),next=unit.lessons.find(l=>!state.finished.includes(l.id))??unit.check;
 const open=(id:string,testOut=false)=>{onClose();onLesson(id,testOut);};
 return <Modal visible transparent animationType={reduced?'none':'slide'} onRequestClose={onClose}><View style={{flex:1,justifyContent:'flex-end'}}><Pressable accessibilityRole="button" accessibilityLabel={hi?'इकाई बंद करें':'Dismiss unit sheet'} onPress={onClose} style={{position:'absolute',inset:0,backgroundColor:c.ink,opacity:.55}}/>
 <View accessibilityViewIsModal style={{height:height*.85,backgroundColor:c.paper,borderTopWidth:1,borderColor:c.lineStrong}}><View style={{width:44,height:4,alignSelf:'center',marginTop:8,backgroundColor:c.lineStrong}}/>
 <View style={{padding:16,gap:8,flexDirection:'row',alignItems:'flex-start'}}><View style={{flex:1}}><Label>{hi?'अंक ':'ACT '}{context.act.n} · {hi?'इकाई ':'UNIT '}{context.unitNumber}/{context.unitTotal}</Label><Sa sa={unit.title_sa} iast={unit.title_iast} size={26}/><Bi value={unit.title} size={20}/></View><Button label={hi?'बंद करें':'Close'} onPress={onClose}/></View>
 <ScrollView contentContainerStyle={{padding:16,paddingTop:0,gap:14}}>{unit.ghost?<Panel><View style={{flexDirection:'row',gap:12,alignItems:'center'}}>{unit.ghost.portrait?<View style={{width:56,opacity:done?1:.65}}><Picture picture={unit.ghost.portrait} compact/></View>:null}<View style={{flex:1}}><Sa sa={unit.ghost.name_sa} iast={unit.ghost.name_iast} size={22}/><Label>{done?(hi?'मुक्त':'Freed'):(hi?'प्रतीक्षा में':'Waiting')}</Label></View></View>{done?<><Sa sa={unit.ghost.freed_line.sa} iast={unit.ghost.freed_line.iast}/><Bi value={unit.ghost.freed_line.gloss}/></>:<><Bi value={unit.ghost.waits_for}/><Label>{hi?'इकाई की जाँच पूरी होने पर मुक्ति मिलेगी।':'Freed when you pass the unit check.'}</Label></>}</Panel>:null}
 <Label>{hi?'अब तक की कहानी':'THE STORY SO FAR'}</Label><Bi value={unit.episode.summary}/>
 <Label>{hi?'इस इकाई में सीखेंगे':'WHAT YOU WILL LEARN'}</Label>
 {unit.skills.map(skill=><Panel key={skill.id}><Bi value={skill.title}/></Panel>)}
 <Label>{hi?'दृश्य':'SCENES'}</Label>
 {unit.status==='planned'?<><Label>{hi?'जल्द आ रहा है':'Coming soon'}</Label>{unit.planned.map((planned,i)=><Panel key={planned.id}><Bi value={{en:(i+1)+' · '+planned.title.en,hi:(i+1)+' · '+planned.title.hi}}/></Panel>)}</>:unit.lessons.map((lesson,i)=><Button key={lesson.id} label={(i+1)+' · '+lesson.title[lang]} disabled={!available} selected={state.current?.lesson_id===lesson.id} onPress={()=>open(lesson.id)}><Sa sa={lesson.title_sa} iast={lesson.title_iast} size={20}/><Bi value={{en:(i+1)+' · '+lesson.title.en,hi:(i+1)+' · '+lesson.title.hi}}/><Label>{state.finished.includes(lesson.id)?(hi?'✓ पूरा':'✓ Done'):state.current?.lesson_id===lesson.id?(hi?'आगे':'Up next'):(hi?'आगे के लिए':'Ahead')} · {lesson.minutes} {hi?'मिनट':'min'}</Label></Button>)}
 {unit.reading?<Button label={unit.reading.title[lang]} disabled={!available} onPress={()=>open(unit.reading!.id)}><Bi value={unit.reading.title}/><Label>{hi?'संस्कृत में पढ़ें · वैकल्पिक':'Read in Sanskrit · optional'} · {unit.reading.minutes} {hi?'मिनट':'min'}{state.finished.includes(unit.reading.id)?(hi?' · ✓ पूरा':' · ✓ Done'):''}</Label></Button>:null}
 {unit.revision?<Button label={hi?'पूरी इकाई दोहराएँ':'Everything about '+unit.title.en} onPress={()=>open(unit.revision!.id)}><Bi value={unit.revision.title}/><Label>{hi?'दोहराव · कभी भी खोलें':'Revision · open any time'}</Label></Button>:null}
 {unit.check?<Button label={hi?'अभी जाँच दें':'Take it now'} disabled={!available} onPress={()=>open(unit.check!.id,canTestOut(index,state,unit))}><Bi value={unit.check.title}/><Label>{hi?'इकाई की जाँच':'Unit check'} · {hi?'अभी जाँच दें':'Take it now'}</Label></Button>:null}
 {unit.video&&done?<Panel><Label>{hi?'वैकल्पिक वीडियो · कोई XP नहीं':'Optional video · no XP'}</Label><Label>{unit.video.title}</Label><Video card={{id:'unit-video',kind:'video',depth:'core',skills:[],sutras:[],youtube_id:unit.video.youtube_id,channel:unit.video.channel,start:unit.video.start,end:unit.video.end}}/></Panel>:null}
 </ScrollView>{next&&available?<View style={{padding:16,borderTopWidth:1,borderColor:c.line}}><Button primary label={hi?'आगे: '+next.title.hi:'Continue: '+next.title.en} onPress={()=>open(next.id)}/></View>:null}
 </View></View></Modal>;
}
