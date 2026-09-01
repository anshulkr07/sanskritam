// Daily Shloka — one verse a day. Loads /shlokas/today, shows Devanagari +
// IAST + word breakdown, and can speak the verse via the tutoring voice.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api, type Shloka } from "../api/client";
import { haptics } from "../services/haptics";
import { speak } from "../services/speech";
import { color, font, radius, script, shadow, space } from "../theme";

export default function ShlokaScreen() {
  const [shloka, setShloka] = useState<Shloka | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [playedWord, setPlayedWord] = useState<string | null>(null);

  useEffect(() => {
    api.todayShloka().then(setShloka).catch(() => setShloka(null));
  }, []);

  const play = useCallback(async () => {
    if (!shloka || speaking) return;
    haptics.tap();
    setSpeaking(true);
    try {
      await speak(shloka.devanagari, "sa");
    } finally {
      setSpeaking(false);
    }
  }, [shloka, speaking]);

  const playWord = useCallback(async (word: string) => {
    haptics.tap();
    setPlayedWord(word);
    try {
      await speak(word, "sa");
    } finally {
      setPlayedWord(null);
    }
  }, []);

  if (!shloka) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.muted}>No śloka available yet.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.body}>
        {/* Top: source + play */}
        <View style={styles.topRow}>
          <Text style={styles.source}>{shloka.source_ref}</Text>
          <Pressable onPress={play} style={styles.playBtn} disabled={speaking}>
            {speaking ? (
              <ActivityIndicator color={color.white} size="small" />
            ) : (
              <Ionicons name="volume-high" size={22} color={color.white} />
            )}
          </Pressable>
        </View>

        {/* Verse */}
        <View style={styles.verseCard}>
          <Text style={[styles.verse, script("bold")]}>{shloka.devanagari}</Text>
          <Text style={styles.iast}>{shloka.iast}</Text>
          {!!shloka.metre && <Text style={styles.metre}>{shloka.metre}</Text>}
        </View>

        {/* Word breakdown */}
        {shloka.word_breakdown.length > 0 && (
          <View style={styles.words}>
            <Text style={styles.sectionTitle}>Word by word</Text>
            {shloka.word_breakdown.map((w, i) => (
              <Pressable
                key={i}
                style={styles.wordRow}
                onPress={() => w.word && playWord(w.word)}
              >
                <View style={styles.wordMain}>
                  <Text style={[styles.wordDev, script("bold")]}>{w.word}</Text>
                  {!!w.meaning && <Text style={styles.wordMeaning}>{w.meaning}</Text>}
                </View>
                {playedWord === w.word && <Ionicons name="volume-high" size={16} color={color.saffron} />}
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  muted: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.base, color: color.inkSoft },
  body: { padding: space.lg },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: space.md },
  source: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: color.saffron, textTransform: "uppercase", letterSpacing: 0.5 },
  playBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: color.saffron, alignItems: "center", justifyContent: "center", ...shadow.button },
  verseCard: { backgroundColor: color.surface, borderRadius: radius.xl, padding: space.lg, ...shadow.card },
  verse: { fontSize: font.sizes.xl, color: color.ink, lineHeight: 40 },
  iast: { fontFamily: "Nunito_500Medium", fontWeight: "500", fontSize: font.sizes.base, color: color.inkSoft, marginTop: space.sm },
  metre: { fontFamily: "Nunito_500Medium", fontWeight: "500", fontSize: font.sizes.sm, color: color.inkFaint, marginTop: 4 },
  words: { marginTop: space.lg },
  sectionTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.md, color: color.ink, marginBottom: space.sm },
  wordRow: { flexDirection: "row", alignItems: "center", backgroundColor: color.surface, borderRadius: radius.md, padding: space.md, marginBottom: space.xs, ...shadow.card },
  wordMain: { flex: 1 },
  wordDev: { fontSize: font.sizes.base, color: color.ink },
  wordMeaning: { fontFamily: "Nunito_400Regular", fontWeight: "400", fontSize: font.sizes.sm, color: color.inkSoft, marginTop: 2 },
});