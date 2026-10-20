import React,{useState} from 'react';
import {View,Text} from 'react-native';
import {Bi,RomanContext} from '../text';
import {Label,useCopy} from '../ui';
import {useStoryTheme} from '../theme';
import {useTypeScale} from '../../hooks/useTypeScale';
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
/** One line saying what to touch, for widgets whose own screen does not say it (letter_builder and word_shuffle print their own live instruction). */
export const WIDGET_HOWTO:Partial<Record<string,{en:string;hi:string}>>={
 mouth_map:{en:'Tap a letter to see where it is made, or tap a place to see which letters are made there.',hi:'किसी अक्षर को छुएँ और देखें कि वह कहाँ बनता है, या किसी स्थान को छुएँ और देखें कि वहाँ कौन-से अक्षर बनते हैं।'},
 mark_words:{en:'Tap every word that fits the rule, then tap Check.',hi:'नियम पर खरे उतरने वाले हर शब्द को छुएँ, फिर “जाँचें” दबाएँ।'},
 rhythm_tapper:{en:'For each syllable, tap if it is light and hold if it is heavy. The buttons below do the same.',hi:'हर अक्षर के लिए: लघु हो तो छुएँ, गुरु हो तो दबाकर रखें। नीचे के बटन भी यही करते हैं।'},
 form_explorer:{en:'Pick a word at the top, then tap any form in the table to read it.',hi:'ऊपर से कोई शब्द चुनें, फिर तालिका में कोई भी रूप छूकर पढ़ें।'},
 role_arrows:{en:'Tap a word, then pick its job from the list. When every word has a job, tap Check.',hi:'किसी शब्द को छुएँ, फिर सूची से उसका काम चुनें। हर शब्द का काम चुनने पर “जाँचें” दबाएँ।'},
 word_factory:{en:'Tap a root, then a suffix. The new word appears below.',hi:'एक धातु छुएँ, फिर एक प्रत्यय। नया शब्द नीचे दिखेगा।'},
 sandhi_mixer:{en:'Tap a pair, then tap Join them to see the new word and the rule.',hi:'कोई जोड़ी छुएँ, फिर “जोड़ें” दबाएँ और नया शब्द तथा नियम देखें।'},
 compound_unpacker:{en:'Tap Split it, then pick which kind of compound it is.',hi:'“खोलिए” दबाएँ, फिर चुनें कि यह किस प्रकार का समास है।'},
 derivation_stepper:{en:'Tap Next rule to apply the next step. Back goes one step back.',hi:'अगला चरण देखने के लिए “अगला नियम” दबाएँ। “पीछे” एक चरण वापस ले जाता है।'},
};
export default function Explore({card,onAnswered=()=>{}}:{card:ExploreCard;onAnswered?:()=>void}){
 const [interacted,setInteracted]=useState(false),hi=useCopy(),c=useStoryTheme(),{sized}=useTypeScale(),how=WIDGET_HOWTO[card.widget];const onInteracted=()=>{setInteracted(true);onAnswered();};let widget:React.ReactNode;
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
 return <RomanContext.Provider value={card.roman==='show'||interacted}><View style={{gap:12}}><Bi value={card.prompt}/>{how?<Text style={{fontFamily:'Mukta_400Regular',fontSize:sized(14),lineHeight:sized(20),color:c.ink3}}>{how[hi?'hi':'en']}</Text>:null}{widget}</View></RomanContext.Provider>;
}
