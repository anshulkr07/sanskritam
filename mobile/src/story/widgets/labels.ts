import type {Bi} from '../types';
// Names the explore widgets show for the engine's enum values. They only label; the engine supplies every form.
export const ROLE_LABELS: Record<string,{sa:string;label:Bi}> = {
 karta:{sa:'कर्ता',label:{en:'the doer',hi:'करने वाला'}},
 karma:{sa:'कर्म',label:{en:'the object',hi:'जिस पर क्रिया हो'}},
 karana:{sa:'करणम्',label:{en:'the means',hi:'साधन'}},
 sampradana:{sa:'सम्प्रदानम्',label:{en:'the recipient',hi:'पाने वाला'}},
 apadana:{sa:'अपादानम्',label:{en:'the source',hi:'जहाँ से'}},
 sambandha:{sa:'सम्बन्धः',label:{en:'the relation (of)',hi:'सम्बन्ध (का)'}},
 adhikarana:{sa:'अधिकरणम्',label:{en:'the locus',hi:'आधार'}},
 sambodhana:{sa:'सम्बोधनम्',label:{en:'the call',hi:'पुकार'}},
 kriya:{sa:'क्रिया',label:{en:'the action',hi:'क्रिया'}},
 other:{sa:'अन्यत्',label:{en:'other',hi:'अन्य'}},
};
/** The roles a learner can pick for a noun, in the order the course taught them. */
export const PICKABLE_ROLES=['karta','karma','karana','sampradana','apadana','sambandha','adhikarana','sambodhana'];
export const VIBHAKTI_LABELS: Record<string,Bi> = {
 Prathama:{en:'1st · doer',hi:'प्रथमा'}, Dvitiya:{en:'2nd · object',hi:'द्वितीया'}, Trtiya:{en:'3rd · by, with',hi:'तृतीया'}, Caturthi:{en:'4th · to, for',hi:'चतुर्थी'},
 Panchami:{en:'5th · from',hi:'पञ्चमी'}, Sasthi:{en:'6th · of',hi:'षष्ठी'}, Saptami:{en:'7th · in, at',hi:'सप्तमी'}, Sambodhana:{en:'calling',hi:'सम्बोधन'},
};
export const PURUSHA_LABELS: Record<string,Bi> = {
 Prathama:{en:'he, she, it',hi:'वह (प्रथम पुरुष)'}, Madhyama:{en:'you',hi:'तुम (मध्यम पुरुष)'}, Uttama:{en:'I, we',hi:'मैं, हम (उत्तम पुरुष)'},
};
export const VACANA_LABELS: Record<string,Bi> = {
 Eka:{en:'one',hi:'एकवचन'}, Dvi:{en:'two',hi:'द्विवचन'}, Bahu:{en:'many',hi:'बहुवचन'},
};
export const LAKARA_LABELS: Record<string,Bi> = {
 Lat:{en:'present',hi:'वर्तमान'}, Lan:{en:'past',hi:'भूत'}, Lrt:{en:'future',hi:'भविष्यत्'}, Lot:{en:'command',hi:'आज्ञा'}, VidhiLin:{en:'should',hi:'विधिलिङ्'},
};
export function pick(label:Bi|undefined,fallback:string,lang:'en'|'hi'){return label?label[lang]:fallback;}
/** The Devanagari names of the kṛt suffixes the word factory offers (the engine's keys are vidyut's). */
export const KRT_SUFFIX_SA: Record<string,string> = {
 ktvA:'-त्वा', tumun:'-तुम्', kta:'-त', ktavatu:'-तवत्', Satf:'-शतृ', SAnac:'-शानच्', tavya:'-तव्य', anIyar:'-अनीय', Ryat:'-ण्यत्', yat:'-यत्', lyap:'-ल्यप्',
};
/** The compound kinds, in the course's words. */
export const COMPOUND_KIND_LABELS: Record<string,{sa:string;label:Bi}> = {
 tatpurusha:{sa:'तत्पुरुषः',label:{en:'first word relates to the second like a case',hi:'पहला शब्द दूसरे से विभक्ति-जैसा सम्बन्ध रखता है'}},
 karmadharaya:{sa:'कर्मधारयः',label:{en:'first word describes the second',hi:'पहला शब्द दूसरे का वर्णन करता है'}},
 dvigu:{sa:'द्विगुः',label:{en:'a number counts a group',hi:'संख्या एक समूह गिनती है'}},
 dvandva:{sa:'द्वन्द्वः',label:{en:'an “and” compound',hi:'‘और’ वाला समास'}},
 bahuvrihi:{sa:'बहुव्रीहिः',label:{en:'names a third thing, its owner',hi:'किसी तीसरे, उसके स्वामी, को बताता है'}},
 avyayibhava:{sa:'अव्ययीभावः',label:{en:'an indeclinable adverb',hi:'अव्यय क्रियाविशेषण'}},
};
export const COMPOUND_KIND_ORDER=['tatpurusha','karmadharaya','dvigu','dvandva','bahuvrihi','avyayibhava'];
