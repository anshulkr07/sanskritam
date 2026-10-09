// ContestRules: numbered legal points from the server.

import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { api } from "../api/client";
import { color } from "../theme";
import { plain } from "../utils/text";

const CONSENT_KEY = "shabd.recite.cameraConsent";

export default function ContestRulesScreen() {
  const [rules, setRules] = useState<string[]>([]);
  const [version, setVersion] = useState("");

  useEffect(() => {
    api.competitionRules().then((r) => {
      setRules(r.rules ?? []);
      setVersion(r.version ?? "");
    }).catch(() => {});
  }, []);

  const accept = async () => {
    await AsyncStorage.setItem(CONSENT_KEY, "1");
    await api.savePublicProfile({ rules_version: version, rules_accepted: true } as never).catch(() => {});
  };

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Text style={styles.title} accessibilityRole="header">Competition rules</Text>
      {rules.map((r, i) => (
        <Text key={i} style={styles.point}>{i + 1}. {plain(r)}</Text>
      ))}
      <View style={styles.row}>
        <Pressable onPress={() => void accept()} accessibilityRole="button" accessibilityLabel="I accept the rules" style={styles.accept}>
          <Text style={styles.acceptText}>I accept</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 8, paddingBottom: 120 },
  title: { fontSize: 22, fontWeight: "800", color: color.ink },
  point: { fontSize: 14, color: color.ink, lineHeight: 21 },
  row: { flexDirection: "row", gap: 8 },
  accept: { minHeight: 48, flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: color.ink, borderRadius: 12 },
  acceptText: { color: "#FFF8EE", fontWeight: "800" },
});
