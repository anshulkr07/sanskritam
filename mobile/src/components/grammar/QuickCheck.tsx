// QuickCheck — one to three tap questions at the end of a topic.
//
// Local only: nothing is graded, stored or sent (the adaptive model stays
// frozen, and a reference page is not a test). Picking an option reveals the
// answer and why; the verdict is spoken as text, not only coloured (§U5-3).

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { GuideQuiz } from "../../api/client";
import { useTypeScale } from "../../hooks/useTypeScale";
import { haptics } from "../../services/haptics";
import { color, font, radius, script, space } from "../../theme";
import { announce } from "../../utils/announce";
import type { GuideTextCtx } from "./BlockRenderer";
import InlineText from "./InlineText";
import { GUIDE_UI } from "./strings";

export default function QuickCheck({ items, ctx }: { items: GuideQuiz[]; ctx: GuideTextCtx }) {
  const { sized } = useTypeScale();
  const [picked, setPicked] = React.useState<Record<number, number>>({});
  const { lang, t } = ctx;

  return (
    <View style={styles.list}>
      {items.map((item, qi) => {
        const answered = picked[qi] !== undefined;
        const gotIt = answered && picked[qi] === item.answer;
        return (
          <View key={qi} style={styles.card}>
            <InlineText text={t(item.prompt)} lang={lang} style={[styles.prompt, { fontSize: sized(font.sizes.base) }]} />
            {item.options.map((opt, oi) => {
              const isAnswer = oi === item.answer;
              const chosen = picked[qi] === oi;
              const showRight = answered && isAnswer;
              const showWrong = answered && chosen && !isAnswer;
              const optionLabel = opt.sa ? opt.iast ?? opt.sa : t(opt.text);
              return (
                <Pressable
                  key={oi}
                  disabled={answered}
                  onPress={() => {
                    if (isAnswer) haptics.correct();
                    else haptics.incorrect();
                    setPicked((p) => ({ ...p, [qi]: oi }));
                    announce(`${isAnswer ? GUIDE_UI.right[lang] : GUIDE_UI.notQuite[lang]} ${t(item.explain)}`);
                  }}
                  style={[styles.option, showRight && styles.optionRight, showWrong && styles.optionWrong]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: chosen, disabled: answered }}
                  accessibilityLabel={
                    optionLabel +
                    (showRight ? `, ${GUIDE_UI.correctAnswer[lang]}` : "") +
                    (showWrong ? `, ${GUIDE_UI.yourAnswer[lang]}` : "")
                  }
                >
                  <View style={styles.optionBody}>
                    {opt.sa ? (
                      <>
                        <Text style={[script("semibold"), styles.optionSa, { fontSize: sized(20, { sanskrit: true }) }]}>{opt.sa}</Text>
                        {!!opt.iast && <Text style={styles.optionIast}>{opt.iast}</Text>}
                      </>
                    ) : (
                      <InlineText text={t(opt.text)} lang={lang} style={[styles.optionText, { fontSize: sized(font.sizes.base) }]} />
                    )}
                  </View>
                  {showRight && <Ionicons name="checkmark-circle" size={22} color={color.ok} />}
                  {showWrong && <Ionicons name="close-circle" size={22} color={color.bad} />}
                </Pressable>
              );
            })}
            {answered && (
              <View style={[styles.explain, gotIt ? styles.explainRight : styles.explainWrong]}>
                <Text style={[styles.verdict, { color: gotIt ? color.okText : color.badText }, lang === "hi" && script("bold")]}>
                  {gotIt ? GUIDE_UI.right[lang] : GUIDE_UI.notQuite[lang]}
                </Text>
                <InlineText text={t(item.explain)} lang={lang} style={[styles.explainText, { fontSize: sized(font.sizes.sm) }]} />
                <Pressable
                  onPress={() => {
                    haptics.tap();
                    setPicked((p) => {
                      const next = { ...p };
                      delete next[qi];
                      return next;
                    });
                  }}
                  style={styles.retry}
                  accessibilityRole="button"
                  accessibilityLabel={GUIDE_UI.retry[lang]}
                >
                  <Ionicons name="refresh" size={16} color={color.saffron} />
                  <Text style={[styles.retryText, lang === "hi" && script("semibold")]}>{GUIDE_UI.retry[lang]}</Text>
                </Pressable>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.sm },
  card: { backgroundColor: color.surface, borderRadius: radius.md, padding: space.sm, gap: space.xs, borderWidth: 1, borderColor: color.border },
  prompt: { fontFamily: "Nunito_700Bold", fontWeight: "700", color: color.ink, marginBottom: space.xxs },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    minHeight: 48,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: color.border,
    paddingHorizontal: space.sm,
    paddingVertical: space.xxs,
  },
  optionRight: { borderColor: color.ok, backgroundColor: color.okBg },
  optionWrong: { borderColor: color.bad, backgroundColor: color.badBg },
  optionBody: { flex: 1 },
  optionSa: { color: color.ink },
  optionIast: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.xs, color: color.inkSoft, fontStyle: "italic" },
  optionText: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: color.ink },
  explain: { borderRadius: radius.sm, padding: space.xs, gap: 4 },
  explainRight: { backgroundColor: color.okBg },
  explainWrong: { backgroundColor: color.badBg },
  verdict: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm },
  explainText: { fontFamily: "Nunito_400Regular", fontWeight: "400", color: color.ink },
  retry: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 36, alignSelf: "flex-start" },
  retryText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: color.saffronText },
});
