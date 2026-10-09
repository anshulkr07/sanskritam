// RecitePicker: due to revise, recently practised, choose a verse.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { api } from "../api/client";
import { color } from "../theme";
import { plain } from "../utils/text";

export default function RecitePickerScreen({ navigation }: { navigation: { navigate: (r: string, p?: object) => void } }) {
  const [due, setDue] = useState<{ verse_uid: string; source_ref: string }[]>([]);
  const [recent, setRecent] = useState<string[]>([]);

  const load = useCallback(() => {
    api.reciteDue().then((r) => setDue(r.items ?? [])).catch(() => setDue([]));
    AsyncStorage.getItem("shabd.recite.recent").then((v) => {
      try { setRecent(v ? JSON.parse(v) : []); } catch { setRecent([]); }
    });
  }, []);

  useFocusEffect(load);

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Text style={styles.title} accessibilityRole="header">Recite</Text>
      <Text style={styles.section}>Due to revise</Text>
      {due.map((d) => (
        <Pressable
          key={d.verse_uid}
          onPress={() => navigation.navigate("Recite", { verseUid: d.verse_uid, start: "recite" })}
          accessibilityRole="button"
          accessibilityLabel={`Revise ${d.source_ref}`}
          style={styles.row}
        >
          <Text style={styles.rowText}>{plain(d.source_ref)}</Text>
        </Pressable>
      ))}
      {!due.length && <Text style={styles.hint}>Nothing due</Text>}
      <Text style={styles.section}>Recently practised</Text>
      {recent.map((u) => (
        <Pressable
          key={u}
          onPress={() => navigation.navigate("Recite", { verseUid: u, start: "practise" })}
          accessibilityRole="button"
          accessibilityLabel="Open recent verse"
          style={styles.row}
        >
          <Text style={styles.rowText}>{u}</Text>
        </Pressable>
      ))}
      <Pressable
        onPress={() => navigation.navigate("MainTabs", { screen: "Read" } as never)}
        accessibilityRole="button"
        accessibilityLabel="Choose a verse"
        style={styles.choose}
      >
        <Text style={styles.chooseText}>Choose a verse</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 8, paddingBottom: 120 },
  title: { fontSize: 22, fontWeight: "800", color: color.ink },
  section: { fontSize: 16, fontWeight: "800", color: color.ink, marginTop: 8 },
  hint: { fontSize: 14, color: color.inkSoft },
  row: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#EFE3CE", minHeight: 48, justifyContent: "center" },
  rowText: { fontSize: 15, color: color.ink },
  choose: { minHeight: 48, alignItems: "center", justifyContent: "center", backgroundColor: color.ink, borderRadius: 12, marginTop: 12 },
  chooseText: { color: "#FFF8EE", fontWeight: "800" },
});
