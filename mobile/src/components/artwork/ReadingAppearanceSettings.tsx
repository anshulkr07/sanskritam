import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { ReaderTheme } from "../../screens/readerTheme";
import { READING_SECTIONS, type ReadingAppearance, type ReadingSection, type SectionAppearance } from "../../services/readingAppearance";
import AppearanceSlider from "./AppearanceSlider";

const LABELS = { verse: "Verse", roman: "Roman", meaning: "Meaning", hindi: "हिन्दी अर्थ" };
const COLORS = ["#3B2E25", "#FFFFFF", "#F2C879", "#B23D10", "#17535C", "#35603C", "#962F4E", "#2F4677", "#5E2216", "#8A5608", "#A89B8A", "#000000"];

export default function ReadingAppearanceSettings({ value, onChange, theme }: { value: ReadingAppearance; onChange: (patch: Partial<ReadingAppearance>) => void; theme: ReaderTheme }) {
  const [section, setSection] = useState<ReadingSection>("verse");
  const selected = value.sections[section];
  const [hex, setHex] = useState(selected.textColor ?? "");
  useEffect(() => setHex(selected.textColor ?? ""), [section, selected.textColor]);
  const updateSection = (patch: Partial<SectionAppearance>) => onChange({ sections: { ...value.sections, [section]: { ...selected, ...patch } } });
  const label = { color: theme.text };
  return <View style={{ gap: 16 }}>
    <Text style={[styles.kicker, { color: theme.soft }]}>BACKGROUND</Text>
    <View style={styles.row}>
      {([true, false] as const).map(illustrated => <Pressable key={String(illustrated)} accessibilityRole="button" accessibilityState={{ selected: value.illustrated === illustrated }} onPress={() => onChange({ illustrated })}
        style={[styles.segment, { backgroundColor: value.illustrated === illustrated ? theme.text : theme.page, borderColor: theme.line }]}>
        <Text style={{ color: value.illustrated === illustrated ? theme.page : theme.text, fontWeight: "700" }}>{illustrated ? "Illustrated" : "Plain paper"}</Text>
      </Pressable>)}
    </View>
    {value.illustrated && <AppearanceSlider label="Painting opacity" value={value.imageOpacity} onChange={imageOpacity => onChange({ imageOpacity })} theme={theme} />}
    <AppearanceSlider label="Text opacity" min={.5} value={value.textOpacity} onChange={textOpacity => onChange({ textOpacity })} theme={theme} />
    <View style={[styles.divider, { backgroundColor: theme.line }]} />
    <Text style={[styles.kicker, { color: theme.soft }]}>STYLE EACH SECTION</Text>
    <View style={[styles.row, { flexWrap: "wrap" }]}>
      {READING_SECTIONS.map(key => <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: key === section }} onPress={() => setSection(key)}
        style={[styles.tab, { backgroundColor: key === section ? theme.text : theme.page, borderColor: theme.line }]}>
        <Text style={{ color: key === section ? theme.page : theme.text, fontWeight: "700" }}>{LABELS[key]}</Text>
      </Pressable>)}
    </View>
    <AppearanceSlider label={`${LABELS[section]} size`} value={selected.scale} min={.85} max={1.5} onChange={scale => updateSection({ scale })} theme={theme} />
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: selected.bold }} accessibilityLabel={`Bold ${LABELS[section]}`} onPress={() => updateSection({ bold: !selected.bold })}
      style={[styles.boldRow, { borderColor: theme.line, backgroundColor: theme.page }]}>
      <Text style={[label, { fontWeight: "700" }]}>Bold text</Text><Text style={{ color: theme.soft }}>{selected.bold ? "On · B" : "Off · Regular"}</Text>
    </Pressable>
    <Text style={[label, { fontWeight: "600" }]}>{LABELS[section]} color</Text>
    <View style={styles.palette}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Use default text color for ${LABELS[section]}`} accessibilityState={{ selected: !selected.textColor }} onPress={() => updateSection({ textColor: null })}
        style={[styles.color, { borderColor: !selected.textColor ? theme.accent : theme.line, backgroundColor: theme.page }]}><Text style={label}>Aa</Text></Pressable>
      {COLORS.map(color => <Pressable key={color} accessibilityRole="button" accessibilityLabel={`${LABELS[section]} color ${color}`} accessibilityState={{ selected: selected.textColor === color }} onPress={() => updateSection({ textColor: color })}
        style={[styles.color, { borderColor: selected.textColor === color ? theme.accent : theme.line }]}><View style={{ backgroundColor: color, width: 28, height: 28, borderRadius: 14 }} /></Pressable>)}
    </View>
    <View style={styles.row}><Text style={[label, { flex: 1 }]}>Custom color</Text><TextInput value={hex} placeholder="#RRGGBB" placeholderTextColor={theme.soft} autoCapitalize="none" autoCorrect={false} maxLength={7} accessibilityLabel={`${LABELS[section]} custom hex color`}
      onChangeText={text => { setHex(text); if (!text || /^#[a-f\d]{6}$/i.test(text)) updateSection({ textColor: text || null }); }}
      style={[styles.hex, { color: theme.text, borderColor: theme.line, backgroundColor: theme.page }]} /></View>
    <View style={[styles.preview, { backgroundColor: theme.page, borderColor: theme.line }]}><Text style={{ color: selected.textColor ?? value.textColor ?? theme.text, fontWeight: selected.bold ? "700" : "400", fontFamily: section === "verse" ? "TiroDevanagariSanskrit_400Regular" : "Nunito_400Regular", fontSize: 18 * selected.scale, lineHeight: 30 * selected.scale, textAlign: "center", opacity: value.textOpacity }}>{section === "verse" ? "योगः कर्मसु कौशलम्" : section === "roman" ? "yogaḥ karmasu kauśalam" : section === "hindi" ? "योग कर्मों में कुशलता है।" : "Yoga is skill in action."}</Text></View>
    <Pressable accessibilityRole="button" onPress={() => onChange({ textColor: null, sections: Object.fromEntries(READING_SECTIONS.map(key => [key, { textColor: null, bold: false, scale: 1 }])) as ReadingAppearance["sections"] })} style={styles.reset}><Text style={{ color: theme.text, fontWeight: "700" }}>Reset section styles</Text></Pressable>
  </View>;
}
const styles = StyleSheet.create({ kicker: { fontSize: 11, fontWeight: "800", letterSpacing: 1.2 }, row: { flexDirection: "row", alignItems: "center", gap: 8 }, segment: { flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 14, borderWidth: 1 }, tab: { minHeight: 44, paddingHorizontal: 14, justifyContent: "center", borderRadius: 22, borderWidth: 1 }, divider: { height: 1, marginVertical: 4 }, boldRow: { minHeight: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, palette: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, color: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: "center", justifyContent: "center" }, hex: { borderWidth: 1, borderRadius: 12, minHeight: 48, minWidth: 128, paddingHorizontal: 12 }, preview: { padding: 20, borderRadius: 16, borderWidth: 1 }, reset: { minHeight: 48, alignItems: "center", justifyContent: "center", marginBottom: 20 } });
