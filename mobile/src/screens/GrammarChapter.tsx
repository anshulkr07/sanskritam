// GrammarChapter: one chapter's topics as a numbered list with hairlines.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { RootStackParamList } from "../navigation/types";
import { useAskContext } from "../ask/AskProvider";
import InlineText from "../components/grammar/InlineText";
import { fetchGuideIndex } from "../services/grammarGuide";
import { useQuery } from "../hooks/useQuery";
import { useGrammarProgress, useGuideLang } from "../hooks/useGuide";
import { useTypeScale } from "../hooks/useTypeScale";
import { haptics } from "../services/haptics";
import { color, fill, fillAt, font, onFill, space, type FillName } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "GrammarChapter">;

export default function GrammarChapterScreen({ navigation, route }: Props) {
  const { chapterId } = route.params;
  const { lang, t } = useGuideLang();
  const { sized } = useTypeScale();
  const { read } = useGrammarProgress();
  useAskContext("grammar", "");
  const { data: index } = useQuery("guide-index", fetchGuideIndex, { ttlMs: 30 * 60_000 });

  const chapter = index?.chapters.find((c) => c.id === chapterId);
  const topics = (chapter?.topic_ids ?? []).map((id) => index?.topics.find((tp) => tp.id === id)).filter((x): x is NonNullable<typeof x> => !!x);
  const tone: FillName = fillAt(chapter?.rank ?? 0);
  const done = topics.filter((tp) => read.has(tp.id)).length;

  if (!chapter) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
        <Text style={styles.empty}>Chapter not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={[styles.band, { backgroundColor: fill[tone] }]}>
          <Text style={[styles.bandTitle, { fontSize: sized(font.sizes.xl) }]}>{t(chapter.title)}</Text>
          <Text style={[styles.bandSa, { fontSize: sized(18) }]}>{chapter.title_sa}</Text>
          <Text style={styles.bandBlurb}>{t(chapter.blurb)}</Text>
          <Text style={styles.bandProg}>{done} of {topics.length} read</Text>
        </View>
        {topics.map((tp, i) => (
          <Pressable
            key={tp.id}
            onPress={() => {
              haptics.tap();
              navigation.navigate("GrammarTopic", { topicId: tp.id });
            }}
            accessibilityRole="button"
            accessibilityLabel={`${i + 1}. ${t(tp.title)}`}
            style={styles.row}
          >
            <Text style={styles.num}>{i + 1}</Text>
            <View style={styles.rowText}>
              <InlineText text={t(tp.title)} lang={lang} style={[styles.rowTitle, { fontSize: sized(font.sizes.base) }]} />
              <Text style={[styles.rowMeta, { fontSize: sized(font.sizes.xs) }]} numberOfLines={1}>
                {t(tp.summary)}
              </Text>
              <Text style={styles.rowMeta}>{tp.minutes} min</Text>
            </View>
            {read.has(tp.id) ? (
              <Ionicons name="checkmark-circle" size={20} color={color.okText} />
            ) : (
              <Ionicons name="chevron-forward" size={18} color={color.inkFaint} />
            )}
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  body: { paddingBottom: 120 },
  band: { padding: space.lg, gap: 4 },
  bandTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: onFill.text },
  bandSa: { color: onFill.soft },
  bandBlurb: { color: onFill.text, fontSize: 14 },
  bandProg: { color: onFill.gold, fontSize: 12, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: color.border, minHeight: 64 },
  num: { fontWeight: "800", fontSize: 16, color: color.inkSoft, width: 28 },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontWeight: "700", color: color.ink },
  rowMeta: { color: color.inkSoft },
  empty: { padding: space.lg, color: color.inkSoft },
});
