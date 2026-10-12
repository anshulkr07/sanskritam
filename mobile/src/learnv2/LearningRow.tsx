import React from "react";
import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from "react-native";
import { useTypeScale } from "../hooks/useTypeScale";
import { color, radius, script, space } from "../theme";

export function LearningRow({title, subtitle, onPress, disabled = false, artwork}: {
  title: string; subtitle?: string; onPress: () => void; disabled?: boolean; artwork?: ImageSourcePropType;
}) {
  const {sized}=useTypeScale();
  return <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button"
    accessibilityLabel={[title,subtitle].filter(Boolean).join(". ")} accessibilityState={{disabled}}
    style={[rowStyles.row,disabled&&rowStyles.disabled]}>
    {artwork && <Image source={artwork} style={rowStyles.art} resizeMode="cover" accessible={false}/>}
    <View style={{flex:1,minWidth:0}}>
      <Text style={[rowStyles.title, /[\u0900-\u097f]/.test(title)&&script("bold"),{fontSize:sized(18)}]}>{title}</Text>
      {!!subtitle&&<Text style={[rowStyles.subtitle,{fontSize:sized(14),lineHeight:sized(21)}]}>{subtitle}</Text>}
    </View>
    <Text style={rowStyles.arrow} accessible={false}>{disabled?"○":"›"}</Text>
  </Pressable>;
}
export const learningStyles=StyleSheet.create({
  safe:{flex:1,backgroundColor:color.bg},body:{padding:space.lg,paddingBottom:100,gap:space.md},
  title:{fontFamily:"Nunito_800ExtraBold",color:color.ink},
  heading:{fontFamily:"Nunito_800ExtraBold",color:color.ink,marginTop:space.sm},
  note:{fontFamily:"Nunito_400Regular",color:color.inkSoft,lineHeight:24},
});
const rowStyles=StyleSheet.create({
  row:{flexDirection:"row",alignItems:"center",gap:space.sm,padding:space.md,minHeight:64,
    borderRadius:radius.lg,backgroundColor:color.surface,borderWidth:1,borderColor:color.border},
  disabled:{opacity:0.6},art:{width:60,height:76,borderRadius:radius.md},
  title:{fontFamily:"Nunito_700Bold",color:color.ink},
  subtitle:{fontFamily:"Nunito_400Regular",color:color.inkSoft,marginTop:4},
  arrow:{fontSize:24,color:color.saffronText},
});
