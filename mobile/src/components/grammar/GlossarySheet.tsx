import Modal from "../AudioModal";
// GlossarySheet — Sanskrit grammar terms in plain language.
//
// One sheet serves both uses: a single key term tapped on a topic page, and
// the full searchable glossary from the Grammar hub. Each entry can jump to the
// topic that teaches it. Closing never needs a gesture: backdrop tap, the
// close button, or the system back action all work (§U5-4).

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { GuideGlossaryItem } from "../../api/client";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { useTypeScale } from "../../hooks/useTypeScale";
import { haptics } from "../../services/haptics";
import { color, font, radius, script, space } from "../../theme";
import { SanskritLine, type GuideTextCtx } from "./BlockRenderer";
import InlineText from "./InlineText";
import { GUIDE_UI } from "./strings";

interface Props {
  items: GuideGlossaryItem[];
  visible: boolean;
  onClose: () => void;
  ctx: GuideTextCtx;
  onOpenTopic?: (topicId: string) => void;
  searchable?: boolean;
}

export default function GlossarySheet({ items, visible, onClose, ctx, onOpenTopic, searchable = false }: Props) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const { sized } = useTypeScale();
  const [query, setQuery] = React.useState("");

  const shown = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((g) =>
      [g.term_sa, g.term_iast, g.meaning.en, g.meaning.hi].some((s) => s.toLowerCase().includes(q)),
    );
  }, [items, query]);

  return (
    <Modal visible={visible} transparent animationType={reduced ? "none" : "slide"} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel={GUIDE_UI.close[ctx.lang]} />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
        <View style={styles.headRow}>
          <Text style={[styles.title, ctx.lang === "hi" && script("bold")]}>{GUIDE_UI.glossary[ctx.lang]}</Text>
          <Pressable
            onPress={onClose}
            hitSlop={8}
            style={styles.close}
            accessibilityRole="button"
            accessibilityLabel={GUIDE_UI.close[ctx.lang]}
          >
            <Ionicons name="close" size={24} color={color.ink} />
          </Pressable>
        </View>
        {searchable && (
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={GUIDE_UI.searchPlaceholder[ctx.lang]}
            placeholderTextColor={color.inkFaint}
            style={[styles.search, script("regular")]}
            autoCorrect={false}
            autoCapitalize="none"
            accessibilityLabel={GUIDE_UI.searchPlaceholder[ctx.lang]}
          />
        )}
        <FlatList
          data={shown}
          keyExtractor={(g) => g.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <View style={styles.entry}>
              <SanskritLine
                node={{ sa: item.term_sa, iast: item.term_iast, audio_url: item.audio_url }}
                ctx={ctx}
                size={22}
                meaning={item.meaning}
              />
              <InlineText
                text={ctx.t(item.meaning)}
                lang={ctx.lang}
                style={[styles.meaning, { fontSize: sized(font.sizes.base) }]}
              />
              {!!item.topic_id && !!onOpenTopic && (
                <Pressable
                  onPress={() => {
                    haptics.tap();
                    onOpenTopic(item.topic_id);
                  }}
                  style={styles.link}
                  accessibilityRole="link"
                  accessibilityLabel={`${GUIDE_UI.openTopic[ctx.lang]}: ${item.term_iast}`}
                >
                  <Text style={[styles.linkText, ctx.lang === "hi" && script("semibold")]}>{GUIDE_UI.openTopic[ctx.lang]}</Text>
                  <Ionicons name="arrow-forward" size={16} color={color.saffron} />
                </Pressable>
              )}
            </View>
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(59,46,37,0.35)" },
  sheet: {
    maxHeight: "80%",
    backgroundColor: color.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
  },
  headRow: { flexDirection: "row", alignItems: "center", marginBottom: space.xs },
  title: { flex: 1, fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.lg, color: color.ink },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  search: {
    borderWidth: 2,
    borderColor: color.border,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    fontSize: font.sizes.base,
    color: color.ink,
    backgroundColor: color.surface,
    marginBottom: space.sm,
  },
  list: { gap: space.sm, paddingBottom: space.md },
  entry: { backgroundColor: color.surface, borderRadius: radius.md, padding: space.sm, gap: 4 },
  meaning: { fontFamily: "Nunito_400Regular", fontWeight: "400", color: color.ink },
  link: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 36, alignSelf: "flex-start" },
  linkText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: color.saffronText },
});
