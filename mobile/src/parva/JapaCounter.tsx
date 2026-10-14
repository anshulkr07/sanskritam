import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { color, fill, font, onFill, space } from "../theme";

/** Small, private mantra counter. Each festival/day/mantra has its own count. */
export default function JapaCounter({ storageKey }: { storageKey: string }) {
  const [count, setCount] = useState(0);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    setCount(0); setReady(false);
    void AsyncStorage.getItem(storageKey).then((value) => {
      const n = Number(value);
      if (alive && Number.isFinite(n) && n >= 0) setCount(Math.floor(n));
    }).catch(() => {}).finally(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, [storageKey]);

  const save = (next: number) => {
    setCount(next);
    void AsyncStorage.setItem(storageKey, String(next)).catch(() => {});
  };
  const progress = Math.min(1, count / 108);

  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <Text style={styles.label}>Japa count</Text>
        <Text style={styles.count} accessibilityLiveRegion="polite">{count} <Text style={styles.target}>/ 108</Text></Text>
      </View>
      <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 108, now: Math.min(count, 108) }}>
        <View style={[styles.progress, { width: `${progress * 100}%` }]} />
      </View>
      <View style={styles.actions}>
        <Pressable disabled={!ready} onPress={() => save(Math.max(0, count - 1))} style={styles.secondary} accessibilityRole="button" accessibilityLabel="Undo one repetition">
          <Text style={styles.secondaryText}>Undo</Text>
        </Pressable>
        <Pressable disabled={!ready} onPress={() => save(count + 1)} style={styles.add} accessibilityRole="button" accessibilityLabel={`Count one repetition. ${count} of 108`}>
          <Text style={styles.addText}>+ 1 repetition</Text>
        </Pressable>
        <Pressable disabled={!ready} onPress={() => save(0)} style={styles.secondary} accessibilityRole="button" accessibilityLabel="Reset japa count">
          <Text style={styles.secondaryText}>Reset</Text>
        </Pressable>
      </View>
      {count >= 108 && <Text style={styles.done}>108 repetitions complete</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: space.sm, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: color.border },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  label: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm, color: color.ink },
  count: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.md, color: color.ink },
  target: { fontSize: font.sizes.sm, color: color.inkSoft },
  track: { height: 4, backgroundColor: color.border, marginTop: 6, overflow: "hidden" },
  progress: { height: 4, backgroundColor: fill.sage },
  actions: { flexDirection: "row", gap: 6, marginTop: space.xs },
  secondary: { minHeight: 44, minWidth: 56, paddingHorizontal: 8, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: color.border },
  secondaryText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.xs, color: color.ink },
  add: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", backgroundColor: fill.saffron },
  addText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: onFill.text },
  done: { fontFamily: "Nunito_700Bold", fontWeight: "700", color: fill.sage, marginTop: 6 },
});
