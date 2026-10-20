import React,{useState} from 'react';
import {View} from 'react-native';
import {Bi,RomanContext} from '../text';
import {Label,useCopy} from '../ui';
import type {ExploreCard} from '../types';
import MouthMap from './MouthMap';
import MarkWords from './MarkWords';
import RhythmTapper from './RhythmTapper';
import LetterBuilder from './LetterBuilder';
import FormExplorer from './FormExplorer';
import RoleArrows from './RoleArrows';
import WordShuffle from './WordShuffle';
import TimeSlider from './TimeSlider';
import WordFactory from './WordFactory';
import SandhiMixer from './SandhiMixer';
import CompoundUnpacker from './CompoundUnpacker';
import DerivationStepper from './DerivationStepper';
export default function Explore({card,onAnswered=()=>{}}:{card:ExploreCard;onAnswered?:()=>void}){
 const [interacted,setInteracted]=useState(false),hi=useCopy();const onInteracted=()=>{setInteracted(true);onAnswered();};let widget:React.ReactNode;
 switch(card.widget){
 case 'mouth_map':widget=<MouthMap params={card.params} onInteracted={onInteracted}/>;break;
 case 'mark_words':widget=<MarkWords params={card.params} onInteracted={onInteracted}/>;break;
 case 'rhythm_tapper':widget=<RhythmTapper params={card.params} onInteracted={onInteracted}/>;break;
 case 'letter_builder':widget=<LetterBuilder params={card.params} onInteracted={onInteracted}/>;break;
 case 'form_explorer':widget=<FormExplorer params={card.params} onInteracted={onInteracted}/>;break;
 case 'role_arrows':widget=<RoleArrows params={card.params} onInteracted={onInteracted}/>;break;
 case 'word_shuffle':widget=<WordShuffle params={card.params} onInteracted={onInteracted}/>;break;
 case 'time_slider':widget=<TimeSlider params={card.params} onInteracted={onInteracted}/>;break;
 case 'word_factory':widget=<WordFactory params={card.params} onInteracted={onInteracted}/>;break;
 case 'sandhi_mixer':widget=<SandhiMixer params={card.params} onInteracted={onInteracted}/>;break;
 case 'compound_unpacker':widget=<CompoundUnpacker params={card.params} onInteracted={onInteracted}/>;break;
 case 'derivation_stepper':widget=<DerivationStepper params={card.params} onInteracted={onInteracted}/>;break;
 default:widget=<Label>{hi?'यह अभ्यास जल्द आ रहा है।':'This activity is coming soon.'}</Label>;
 }
 return <RomanContext.Provider value={card.roman==='show'||interacted}><View style={{gap:12}}><Bi value={card.prompt}/>{widget}</View></RomanContext.Provider>;
}
