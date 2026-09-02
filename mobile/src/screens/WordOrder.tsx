// WordOrder (U7-4) — "the sentence that will not break."
//
// Free word order is the most distinctive fact about Sanskrit and this screen
// lets a learner discover what vibhakti IS by trying to break a sentence and
// failing: any equivalent permutation settles calmly (nothing happened — that
// is the point), then changing one ENDING either breaks it or changes the
// meaning, and the screen shows what the backend says it now means.
//
// Tint each word by its kāraka role, but pair every tint with a text label
// (§U5-3 — never by colour alone). The length cap the backend enforces
// surfaces as a message, not an empty screen.

import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import api from "../api/client";
import type { WordOrder } from "../api/client";
import { haptics } from "../services/haptics";
import { color, font, radius, script, space } from "../theme";

const ROLE_COLORS: Record<string, string> = {
  "√": color.okBg,
  bāla: color.unsureBg,
  grāma: color.okBg,
  phala: color.warnBg,
  sītā: color.unsureBg,
  rāma: color.okBg,
  jala: color.warnBg,
  deva: color.unsureBg,
};

function roleColor(role: string): string {
  if (!role) return color.surfaceMuted;
  for (const [prefix, c] of Object.entries(ROLE_COLORS)) {
    if (role.includes(prefix)) return c;
  }
  return color.surfaceMuted;
}

export default function WordOrderScreen() {
  const [sentence, setSentence] = useState("बालः ग्रामं गच्छति");
  const [data, setData] = useState<WordOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<string[]>([]);

  const load = (s: string) => {
    setLoading(true);
    setSentence(s);
    api
      .wordOrder(s)
      .then((d) => {
        setData(d);
        setOrder(d.words);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(sentence);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tryOrder = (candidate: string[]) => {
    const key = (a: string[]) => a.join(" ");
    const isEquivalent = data?.equivalent_orders.some((o) => key(o) === key(candidate));
    if (isEquivalent) {
      setOrder(candidate);
      haptics.tap(); // calm — nothing happened, and that is the point
    } else {
      // not an equivalent order — gentle feedback, never a red buzz
      haptics.near();
    }
  };

  if (loading || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading…</Text>
      </View>
    );
  }

  if (data.refused) {
    return (
      <View style={styles.center} accessible>
        <Text style={styles.title}>Sentence is too long</Text>
        <Text style={styles.muted}>{data.refused}</Text>
        <Text style={styles.muted}>Try a shorter sentence.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>The sentence that will not break</Text>
      <Text style={styles.sub}>Drag-to-reorder not on this build; tap a word to cycle its position.</Text>

      <View style={styles.line} accessible accessibilityRole="text">
        {order.map((w, i) => (
          <Pressable
            key={`${w}-${i}`}
            onPress={() => {
              // rotate: move word i to the end
              const next = order.filter((_, j) => j !== i);
              next.push(w);
              tryOrder(next);
            }}
            accessibilityRole="button"
            accessibilityLabel={`${w}. Scramble word order`}
            style={[styles.wordChip, { backgroundColor: roleColor(w) }]}
          >
            <Text style={[styles.wordText, script("semibold")]}>{w}</Text>
            <Text style={styles.roleLabel}>
              {data.per_word.find((p) => p.word === w)?.role ?? ""}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.section}>Current order</Text>
      <Text style={[styles.current, script("semibold")]}>{order.join(" ")}</Text>

      <Text style={styles.section}>What if you change an ending?</Text>
      {data.wrong_endings.map((w, i) => (
        <View key={i} style={styles.wrongCard}>
          <Text style={[styles.wrongWord, script("semibold")]}>
            {w.word}
            <Text style={styles.wrongEnding}> → {w.wrong_ending}</Text>
          </Text>
          <Text style={styles.effect}>{w.effect}</Text>
        </View>
      ))}

      <Text style={styles.section}>Equivalent orders ({data.equivalent_orders.length})</Text>
      {data.equivalent_orders.slice(0, 6).map((o, i) => (
        <Text key={i} style={[styles.equiv, script("regular")]}>{o.join(" ")}</Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  content: { padding: space.lg, paddingBottom: space.xxl },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: color.bg, padding: space.lg },
  heading: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.lg, color: color.ink },
  sub: { fontSize: font.sizes.sm, color: color.inkSoft, marginTop: 4, marginBottom: space.md },
  line: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginVertical: space.md },
  wordChip: { borderRadius: radius.md, paddingHorizontal: space.sm, paddingVertical: space.xs, alignItems: "center", borderWidth: 1, borderColor: color.border },
  wordText: { fontSize: font.sizes.md, color: color.ink },
  roleLabel: { fontSize: font.sizes.xs, color: color.inkSoft },
  section: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm, color: color.inkSoft, marginTop: space.lg, marginBottom: space.xs },
  current: { fontSize: font.sizes.md, color: color.ink, backgroundColor: color.surface, padding: space.sm, borderRadius: radius.md },
  wrongCard: { backgroundColor: color.surface, borderRadius: radius.md, padding: space.sm, marginVertical: space.xs },
  wrongWord: { fontSize: font.sizes.base, color: color.ink },
  wrongEnding: { color: color.badText, fontWeight: "700" },
  effect: { fontSize: font.sizes.sm, color: color.inkSoft, marginTop: 2 },
  equiv: { fontSize: font.sizes.base, color: color.inkSoft, marginVertical: 2 },
  title: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.lg, color: color.ink, marginBottom: space.sm },
  muted: { fontSize: font.sizes.sm, color: color.inkSoft },
});
