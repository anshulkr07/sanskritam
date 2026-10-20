// Learn's two modes (owner, 2026-10-20). Story: The Burnt Book, its ghosts
// and leaves. Simple: the same units and lessons as a plain course, without
// the story cards, and with progress of its own: finishing a lesson in
// Simple mode never frees a ghost in Story mode.
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useEffect,useSyncExternalStore} from 'react';
export type Track='story'|'simple';
const KEY='learn.mode.v1';
let mode:Track='story';const listeners=new Set<()=>void>();let loaded:Promise<void>|undefined;
export function loadLearnMode(){return loaded??=AsyncStorage.getItem(KEY).then(v=>{mode=v==='simple'?'simple':'story';listeners.forEach(f=>f());}).catch(()=>{});}
export async function setLearnMode(next:Track){mode=next;listeners.forEach(f=>f());await AsyncStorage.setItem(KEY,next).catch(()=>{});}
export function useLearnMode():Track{useEffect(()=>{void loadLearnMode();},[]);return useSyncExternalStore(f=>{listeners.add(f);return()=>{listeners.delete(f);};},()=>mode,()=>mode);}
