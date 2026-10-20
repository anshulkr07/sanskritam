import React from 'react';
import {View} from 'react-native';
import {changeSpan} from '../teachingLogic';
import {Sa} from '../text';
import {Label,Panel,useCopy} from '../ui';

/** The full forms remain intact above this cue; this identifies the changed
 * grapheme span without asserting an invented grammatical intermediate. */
export default function FormChange({before,after}:{before:string;after:string}){
 const hi=useCopy(),change=changeSpan(before,after);
 if(change.unchanged)return <Label>{hi?'रूप नहीं बदला।':'The visible form does not change.'}</Label>;
 const span=(text:string)=>text.trim()?<Sa sa={text} size={28} roman={false}/>:<Label>{text.length?(hi?'शब्दों के बीच की जगह':'word space'):(hi?'कोई नहीं':'none')}</Label>;
 return <Panel><Label>{hi?'बदला हुआ अंश':'The changed span'}</Label><View style={{flexDirection:'row',gap:10,flexWrap:'wrap',alignItems:'center'}}><View><Label>{hi?'पहले':'Before'}</Label>{span(change.removed)}</View><Label>→</Label><View><Label>{hi?'बाद में':'After'}</Label>{span(change.added)}</View></View></Panel>;
}
