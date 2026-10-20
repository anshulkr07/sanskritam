import AsyncStorage from '@react-native-async-storage/async-storage';
import {getReview} from './api';
import {readJSON,enqueueWrites,flushOutbox} from './cache';
import type {PracticeProgress} from './cards/Practice';
export type ReviewSession=Awaited<ReturnType<typeof getReview>>;
const KEY='story.review.v1';
export async function loadReview():Promise<ReviewSession>{try{const review=await getReview();await AsyncStorage.setItem(KEY,JSON.stringify(review));return review;}catch(error){const cached=await readJSON<ReviewSession>(KEY);if(cached)return cached;throw error;}}
export async function finishReview(session:ReviewSession,progress:Record<string,PracticeProgress>){
 const grouped=new Map<string,{card_id:string;verdict:PracticeProgress['first']}[]>();
 session.items.forEach((item,i)=>{const p=progress['review-'+i];if(!p)return;const results=grouped.get(item.lesson_id)??[];results.push({card_id:item.card.id,verdict:p.first});grouped.set(item.lesson_id,results);});
 await enqueueWrites([...grouped].map(([lesson_id,results])=>({path:'/learn/attempts',body:{lesson_id,results}})));
 await AsyncStorage.setItem(KEY,JSON.stringify({due_count:Math.max(0,session.due_count-session.items.length),items:[]}));void flushOutbox();
}
