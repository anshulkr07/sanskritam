import AsyncStorage from '@react-native-async-storage/async-storage';
import {useSyncExternalStore,useEffect} from 'react';
let panini=false; const listeners=new Set<()=>void>(); let loaded:Promise<void>|undefined;
export function loadPanini(){return loaded??=AsyncStorage.getItem('story.panini.v1').then(v=>{panini=v==='true';listeners.forEach(f=>f());}).catch(()=>{});}
export async function setPanini(v:boolean){await loadPanini();await AsyncStorage.setItem('story.panini.v1',String(v));panini=v;listeners.forEach(f=>f());}
export function usePanini(){useEffect(()=>{void loadPanini();},[]);return useSyncExternalStore(f=>{listeners.add(f);return()=>{listeners.delete(f);};},()=>panini,()=>false);}
