import {resolvePicture} from '../artwork';
import React, {useState,useEffect} from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import { ArtworkImage } from '../../components/artwork/ArtworkImage';
import { useGuideLang } from '../../hooks/useGuide';
import { Bi } from '../text';
import { useStoryTheme } from '../theme';
import type { Picture as PictureData } from '../types';
export default function Picture({picture:input,compact=false}: {picture?:PictureData|null;compact?:boolean}) {
 const picture=resolvePicture(input);
 const c=useStoryTheme(),{lang}=useGuideLang(),window=useWindowDimensions(); const [width,setWidth]=useState(0),[failed,setFailed]=useState(false);
 useEffect(()=>setFailed(false),[picture?.id,picture?.phone,picture?.tablet]);
 if(!picture)return null;
 const [rw,rh]=picture.ratio.split(':').map(Number); const height=width*rh/rw;
 const uri=Math.min(window.width,window.height)>=600?picture.tablet??picture.phone:picture.phone;
 return <View onLayout={e=>setWidth(e.nativeEvent.layout.width)} style={{width:'100%',backgroundColor:c.paper}}>
 {width>0 && picture.delivered && uri && !failed?<View style={{width,height,maxWidth:'100%'}}><ArtworkImage source={{uri}} resizeMode="contain" accessibilityLabel={picture.alt[lang]} style={{width,height,maxWidth:'100%',opacity:c.dark?.85:1}} onError={()=>setFailed(true)}/></View>:<View accessibilityLabel={picture.alt[lang]} style={{minHeight:width?height:120,padding:compact?4:16,justifyContent:'center'}}>{compact?<Text numberOfLines={2} style={{color:c.ink3,fontFamily:'Mukta_400Regular',fontSize:12}}>{picture.alt[lang]}</Text>:<Bi value={picture.alt} style={{color:c.ink3}}/>}</View>}
 </View>;
}
