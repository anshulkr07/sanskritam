import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import SandhiVisual from "../components/derivation/SandhiVisual";
import { color, font, script, space } from "../theme";

const EXAMPLES = [
  { word: "विद्यालयः", meaning: "school", note: "विद्या + आलयः: when the two long ā vowels meet, they become one long ā." },
  { word: "महेश्वरः", meaning: "great lord", note: "महा + ईश्वरः: ā and ī combine as e. This is guṇa sandhi." },
  { word: "सदैव", meaning: "always", note: "सदा + एव: ā and e combine as ai. This is vṛddhi sandhi." },
];

/** Home Introduction's sandhi destination, backed by the existing local engine. */
export default function SandhiPractice() {
  const [at, setAt] = useState(0);
  const [replay, setReplay] = useState(0);
  const example = EXAMPLES[at];
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.body}>
    <Text style={styles.title}>Sounds meeting at a boundary</Text>
    <Text style={styles.copy}>Choose a word, then tap its animation to separate and join the sounds. The split comes from the grammar engine.</Text>
    <View style={styles.options}>{EXAMPLES.map((item, i) => <Pressable key={item.word} onPress={() => setAt(i)} accessibilityRole="button" accessibilityLabel={`Explore sandhi in ${item.word}`} accessibilityState={{ selected: at === i }} style={[styles.option, at === i && { borderColor: color.saffron }]}><Text style={[styles.word, script("regular")]}>{item.word}</Text></Pressable>)}</View>
    <View style={styles.card}><Text style={styles.title}>{example.meaning}</Text><SandhiVisual key={`${at}.${replay}`} joined={example.word} autoPlay /><Text style={styles.copy}>{example.note}</Text></View>
    <Pressable onPress={() => setReplay(n => n + 1)} accessibilityRole="button" accessibilityLabel="Replay or reload the sandhi demonstration" style={styles.option}><Text style={styles.copy}>Replay / retry</Text></Pressable>
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: color.bg }, body: { padding: space.lg, gap: space.md }, title: { fontFamily: "Nunito_800ExtraBold", fontSize: font.sizes.lg, color: color.ink }, copy: { fontFamily: "Nunito_600SemiBold", fontSize: font.sizes.base, lineHeight: 24, color: color.inkSoft }, options: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, option: { minHeight: 48, padding: 10, borderWidth: 1, borderColor: color.border, justifyContent: "center", borderRadius: 4 }, word: { fontSize: 20, color: color.ink }, card: { padding: space.md, backgroundColor: color.surface, borderLeftWidth: 3, borderLeftColor: color.saffron, gap: space.sm } });
