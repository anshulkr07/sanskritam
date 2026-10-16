import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { ReaderTheme } from "../../screens/readerTheme";
import type { ReadingAppearance } from "../../services/readingAppearance";

export default function ReadingAppearanceSettings({ value, onChange, theme }: { value: ReadingAppearance; onChange: (patch: Partial<ReadingAppearance>) => void; theme: ReaderTheme }) {
  const [color, setColor] = useState(value.textColor ?? "");
  useEffect(() => setColor(value.textColor ?? ""), [value.textColor]);
  const label = { color: theme.text };
  const stepper = (title: string, key: "imageOpacity" | "textOpacity", min: number) => (
    <View style={styles.row}>
      <Text style={[label, { flex: 1 }]}>{title}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Decrease ${title.toLowerCase()}`} disabled={value[key] <= min} onPress={() => onChange({ [key]: Math.max(min, Math.round((value[key] - 0.05) * 100) / 100) })} style={styles.step}><Text style={label}>−</Text></Pressable>
      <Text style={[label, { minWidth: 44, textAlign: "center" }]}>{Math.round(value[key] * 100)}%</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Increase ${title.toLowerCase()}`} disabled={value[key] >= 1} onPress={() => onChange({ [key]: Math.min(1, Math.round((value[key] + 0.05) * 100) / 100) })} style={styles.step}><Text style={label}>+</Text></Pressable>
    </View>
  );
  return <View style={{ gap: 8 }}>
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: value.illustrated }} accessibilityLabel="Illustrated background" onPress={() => onChange({ illustrated: !value.illustrated })} style={styles.row}>
      <Text style={label}>Background</Text><Text style={{ color: theme.soft }}>{value.illustrated ? "Illustrated" : "Plain"}</Text>
    </Pressable>
    {value.illustrated && stepper("Image opacity", "imageOpacity", 0)}
    {stepper("Text opacity", "textOpacity", 0.5)}
    <View style={[styles.row, { flexWrap: "wrap", gap: 8 }]}>
      <Text style={label}>Text color</Text>
      <TextInput value={color} placeholder="Theme default" placeholderTextColor={theme.soft} autoCapitalize="none" autoCorrect={false} maxLength={7} accessibilityLabel="Text color hex code" onChangeText={text => { setColor(text); if (!text || /^#[a-f\d]{6}$/i.test(text)) onChange({ textColor: text || null }); }} style={{ borderBottomWidth: 1, borderBottomColor: theme.line, color: theme.text, minHeight: 44, minWidth: 120, paddingHorizontal: 8 }} />
      <Pressable accessibilityRole="button" accessibilityLabel="Use theme text color" onPress={() => { setColor(""); onChange({ textColor: null }); }} style={styles.step}><Text style={{ color: theme.accent }}>Reset</Text></Pressable>
    </View>
  </View>;
}
const styles = StyleSheet.create({ row: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, step: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" } });
