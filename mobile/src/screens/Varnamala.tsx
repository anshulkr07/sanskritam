// Varnamala — the alphabet, grouped by place of articulation. Reads the live
// /grammar/varnamala grid, renders vowels / consonants / nasals / others, and
// shows each akṣara with its IAST + place. Deep link to a practice view later.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api, type VarnamalaResponse } from "../api/client";
import { haptics } from "../services/haptics";
import { speak } from "../services/speech";
import { color, font, radius, script, shadow, space } from "../theme";

const GROUP_LABEL: Record<string, string> = {
  vowels: "Vowels · स्वर",
  consonants: "Consonants · व्यञ्जन",
  nasals: "Nasals · अनुनासिक",
  others: "Others · अयोगवाह",
};

export default function VarnamalaScreen() {
  const [grid, setGrid] = useState<VarnamalaResponse | null>(null);
  const [speaking, setSpeaking] = useState<string | null>(null);

  useEffect(() => {
    api.varnamala().then(setGrid).catch(() => setGrid(null));
  }, []);

  const playChar = async (dev: string) => {
    haptics.tap();
    setSpeaking(dev);
    try {
      await speak(dev, "sa");
    } finally {
      setSpeaking(null);
    }
  };

  if (!grid) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><Text style={styles.muted}>Loading the alphabet…</Text></View>
      </SafeAreaView>
    );
  }

  const renderGroup = (items: VarnamalaResponse[keyof VarnamalaResponse], key: string) => {
    if (!items || items.length === 0) return null;
    return (
      <View key={key} style={styles.group}>
        <Text style={styles.groupLabel}>{GROUP_LABEL[key] ?? key}</Text>
        <View style={styles.flex}>
          {items.map((c, i) => (
            <Pressable key={i} style={styles.char} onPress={() => c.devanagari && playChar(c.devanagari)}>
              <Text style={[styles.charDev, script("bold")]}>{c.devanagari}</Text>
              <Text style={styles.charIast}>{c.iast}</Text>
              {speaking === c.devanagari && <Ionicons name="volume-high" size={10} color={color.saffron} style={{ marginTop: 2 }} />}
            </Pressable>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.intro}>
          Sanskrit orders its own alphabet by place of articulation. Tap any akṣara to hear it.
        </Text>
        {renderGroup(grid.vowels, "vowels")}
        {renderGroup(grid.consonants, "consonants")}
        {renderGroup(grid.nasals, "nasals")}
        {renderGroup(grid.others, "others")}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  muted: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.base, color: color.inkSoft },
  body: { padding: space.lg },
  intro: { fontFamily: "Nunito_400Regular", fontWeight: "400", fontSize: font.sizes.sm, color: color.inkSoft, marginBottom: space.lg, lineHeight: 20 },
  group: { marginBottom: space.lg },
  groupLabel: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.md, color: color.ink, marginBottom: space.sm },
  flex: { flexDirection: "row", flexWrap: "wrap", gap: space.xs },
  char: {
    width: "22%",
    aspectRatio: 1,
    backgroundColor: color.surface,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.card,
  },
  charDev: { fontSize: 24, color: color.ink },
  charIast: { fontFamily: "Nunito_500Medium", fontWeight: "500", fontSize: font.sizes.xs, color: color.inkSoft, marginTop: 2 },
});