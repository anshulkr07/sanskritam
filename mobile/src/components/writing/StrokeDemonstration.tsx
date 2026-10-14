import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import Animated, { cancelAnimation, Easing, runOnJS, useAnimatedProps, useSharedValue, withTiming } from "react-native-reanimated";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { color, font, space } from "../../theme";
import type { StrokePath } from "../../api/client";
import { fitWritingPaths, writingPathLength } from "./geometry";

const AnimatedPath = Animated.createAnimatedComponent(Path);
export default function StrokeDemonstration({ paths, devanagari, size = 220, autoPlay = false }: { paths: StrokePath[]; devanagari: string; size?: number; autoPlay?: boolean }) {
  const reduced = useReducedMotion();
  const guides = useMemo(() => fitWritingPaths(paths), [paths]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(autoPlay);
  const [revision, setRevision] = useState(0);
  const progress = useSharedValue(0);
  const previous = useRef(-1);
  const length = writingPathLength(guides[index]?.d ?? "");
  useEffect(() => { cancelAnimation(progress); previous.current = -1; progress.value = 0; setIndex(0); setPlaying(autoPlay); }, [devanagari, autoPlay, progress]);
  useEffect(() => {
    if (previous.current !== index) { progress.value = 0; previous.current = index; }
    if (reduced || !playing || index >= guides.length) return;
    const duration = Math.max(700, Math.min(1800, length * 18)) * (1 - progress.value);
    progress.value = withTiming(1, { duration, easing: Easing.linear }, finished => { if (finished) runOnJS(setIndex)(index + 1); });
    return () => cancelAnimation(progress);
  }, [index, playing, reduced, guides.length, length, progress, revision]);
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - progress.value) }));
  const done = reduced || index >= guides.length;
  const replay = () => { cancelAnimation(progress); previous.current = -1; progress.value = 0; setIndex(0); setPlaying(true); setRevision(n => n + 1); };
  return <View style={styles.wrap}>
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel={`Writing demonstration for ${devanagari}`}>
      {guides.map((p, i) => <Path key={`guide${i}`} d={p.d} fill="none" stroke={color.saffronLight} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />)}
      {guides.filter((_p, i) => reduced || i < index).map((p, i) => <Path key={`done${i}`} d={p.d} fill="none" stroke={color.ink} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />)}
      {!done && guides[index] && <AnimatedPath key={`${devanagari}.${index}`} d={guides[index].d} fill="none" stroke={color.saffronText} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${length} ${length}`} animatedProps={animatedProps} />}
    </Svg>
    <Text style={styles.count}>{done ? "Complete" : `Stroke ${index + 1} of ${guides.length}`}</Text>
    <View style={styles.controls}>
      <Pressable onPress={replay} accessibilityRole="button" accessibilityLabel="Replay writing demonstration" style={styles.button}><Text style={styles.label}>Replay</Text></Pressable>
      {!done && <Pressable onPress={() => setPlaying(p => !p)} accessibilityRole="button" accessibilityLabel={playing ? "Pause demonstration" : "Continue demonstration"} style={styles.button}><Text style={styles.label}>{playing ? "Pause" : "Continue"}</Text></Pressable>}
      {!done && <Pressable onPress={() => { setPlaying(false); setIndex(guides.length); }} accessibilityRole="button" accessibilityLabel="Show complete letter" style={styles.button}><Text style={styles.label}>Show all</Text></Pressable>}
    </View>
  </View>;
}
const styles = StyleSheet.create({ wrap: { alignItems: "center", width: "100%" }, count: { fontFamily: "Nunito_600SemiBold", color: color.inkSoft, fontSize: font.sizes.sm }, controls: { flexDirection: "row", gap: 8, marginTop: space.xs }, button: { minHeight: 44, paddingHorizontal: 12, borderWidth: 1, borderColor: color.border, justifyContent: "center", borderRadius: 4 }, label: { fontFamily: "Nunito_700Bold", color: color.ink } });
