// LearnV2 card renderer — the Quiet deck (+ anchored visual variant).
//
// One example, one explanation, horizontal navigation. The anchored variant
// keeps the image region stable while the explanation changes (verbs-number
// cards 5 and 7). Baked captions are clipped out of the source illustrations;
// verified native Devanagari and half-size IAST fill the artwork caption area.
// No disclosure/expandable control exists anywhere in this file by design.

import React, { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { useGuideLang } from "../hooks/useGuide";
import { useTypeScale } from "../hooks/useTypeScale";
import { haptics } from "../services/haptics";
import { color, font, radius, sanskritText, script, shadow, space } from "../theme";
import { announce } from "../utils/announce";
import { getLearnV2Asset } from "./assetMap";
import type { LearnV2Card } from "./types";

export function LearnV2ExampleArt({ card }: { card: LearnV2Card }) {
  const { lang } = useGuideLang();
  const { sized } = useTypeScale();
  const asset = card.assetId ? getLearnV2Asset(card.assetId) : undefined;
  const ex = card.example;
  if (!ex) return null;

  // Missing art is never a broken URI or a blank lesson: the native
  // formula/text block below always renders with or without the photo.
  return (
    <View style={styles.artWrap}>
      {asset ? (
        <View style={styles.photoFrame}>
          <View
            style={[styles.sceneFrame, { aspectRatio: asset.width / asset.sceneHeight }]}
            accessible
            accessibilityLabel={lang === "hi" ? asset.altHi : asset.altEn}
          >
            <Image
              source={asset.source}
              style={[styles.photo, { height: `${(asset.height / asset.sceneHeight) * 100}%` }]}
              resizeMode="contain"
              accessible={false}
            />
          </View>
          <View style={[styles.overlay, { backgroundColor: asset.captionColor }]}>
            <Text selectable style={[styles.overlaySa, { fontSize: sized(34, { sanskrit: true }), lineHeight: sized(51, { sanskrit: true }) }]}>{ex.sa}</Text>
            <Text selectable style={[styles.overlayIast, { fontSize: sized(17), lineHeight: sized(26) }]}>{ex.iast}</Text>
          </View>
        </View>
      ) : null}
      <View style={styles.formulaBox}>
        {!asset && <>
          <Text style={[styles.formulaSa, script("bold"), { fontSize: sized(24, { sanskrit: true }) }]}>{ex.sa}</Text>
          <Text style={[styles.formulaIast, { fontSize: sized(font.sizes.sm) }]}>{ex.iast}</Text>
        </>}
        <Text style={[styles.formulaGloss, { fontSize: sized(font.sizes.sm) }]}>
          {lang === "hi" ? ex.gloss.hi : ex.gloss.en}
        </Text>
        {!!ex.formula && (
          <View style={styles.rulePill} accessible accessibilityLabel={ex.formula}>
            <Text style={[styles.rulePillText, { fontSize: sized(font.sizes.sm) }]}>{ex.formula}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export function LearnV2Rows({ card }: { card: LearnV2Card }) {
  const { lang } = useGuideLang();
  const { sized } = useTypeScale();
  if (!card.rows?.length) return null;
  return (
    <View style={styles.rows}>
      {card.rows.map((r, i) => (
        <View
          key={i}
          style={styles.row}
          accessible
          accessibilityLabel={`${r.sa}. ${r.iast}. ${lang === "hi" ? r.gloss.hi : r.gloss.en}`}
        >
          <Text style={[styles.rowSa, script("bold"), { fontSize: sized(20, { sanskrit: true }) }]}>{r.sa}</Text>
          <Text style={[styles.rowIast, { fontSize: sized(font.sizes.xs) }]}>{r.iast}</Text>
          <Text style={[styles.rowGloss, { fontSize: sized(font.sizes.sm) }]}>
            {lang === "hi" ? r.gloss.hi : r.gloss.en}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function LearnV2Steps({ card }: { card: LearnV2Card }) {
  const { lang } = useGuideLang();
  const { sized } = useTypeScale();
  if (!card.steps?.length) return null;
  return (
    <View style={styles.steps} accessible accessibilityLabel={card.steps.map((s) => `${s.sa}, ${s.iast}`).join(". ")}>
      {card.steps.map((s, i) => (
        <React.Fragment key={i}>
          {i > 0 && <Text style={styles.arrow} accessibilityElementsHidden>→</Text>}
          <View style={styles.step}>
            <Text style={[styles.stepSa, script("bold"), { fontSize: sized(22, { sanskrit: true }) }]}>{s.sa}</Text>
            <Text style={[styles.stepIast, { fontSize: sized(font.sizes.xs) }]}>{s.iast}</Text>
            <Text style={[styles.stepLabel, { fontSize: sized(font.sizes.xs) }]}>
              {lang === "hi" ? s.label.hi : s.label.en}
            </Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

export function LearnV2Term({ card }: { card: LearnV2Card }) {
  const { lang } = useGuideLang();
  const { sized } = useTypeScale();
  if (!card.term) return null;
  const t = card.term;
  return (
    <View
      style={styles.term}
      accessible
      accessibilityLabel={`${t.sa}, ${t.iast}: ${lang === "hi" ? t.meaning.hi : t.meaning.en}`}
    >
      <Text style={[styles.termSa, script("bold"), { fontSize: sized(18, { sanskrit: true }) }]}>
        {t.sa} · <Text style={styles.termIast}>{t.iast}</Text>
      </Text>
      <Text style={[styles.termMeaning, { fontSize: sized(font.sizes.sm) }]}>
        {lang === "hi" ? t.meaning.hi : t.meaning.en}
      </Text>
    </View>
  );
}

/** Local retrieval: immediate feedback, no grading, no mastery write. */
export function LearnV2Practice({ card }: { card: LearnV2Card }) {
  const { lang } = useGuideLang();
  const { sized } = useTypeScale();
  const [picked, setPicked] = useState<number | null>(null);
  const p = card.practice;
  if (!p) return null;
  const answered = picked !== null;
  const correct = answered && p.choices[picked].correct;

  return (
    <View style={styles.practice}>
      <Text style={[styles.practicePrompt, { fontSize: sized(font.sizes.base) }]}>
        {lang === "hi" ? p.prompt.hi : p.prompt.en}
      </Text>
      {p.choices.map((c, i) => {
        const isPick = picked === i;
        const showRight = answered && c.correct;
        const showWrong = answered && isPick && !c.correct;
        return (
          <Pressable
            key={i}
            disabled={answered}
            onPress={() => {
              haptics.tap();
              setPicked(i);
              announce(c.correct ? (lang === "hi" ? "सही।" : "Correct.") : lang === "hi" ? "अभी नहीं।" : "Not yet.");
            }}
            style={[
              styles.choice,
              showRight && styles.choiceRight,
              showWrong && styles.choiceWrong,
            ]}
            accessibilityRole="button"
            accessibilityLabel={lang === "hi" ? c.label.hi : c.label.en}
            accessibilityState={{ disabled: answered, selected: isPick }}
          >
            <Text
              style={[
                styles.choiceText,
                script("semibold"),
                { fontSize: sized(font.sizes.base, { sanskrit: true }) },
                showRight && styles.choiceTextRight,
                showWrong && styles.choiceTextWrong,
              ]}
            >
              {lang === "hi" ? c.label.hi : c.label.en}
            </Text>
          </Pressable>
        );
      })}
      {answered && (
        <View
          style={[styles.feedback, correct ? styles.feedbackRight : styles.feedbackWrong]}
          accessibilityLiveRegion="polite"
        >
          <Text style={[styles.feedbackTitle, { fontSize: sized(font.sizes.sm) }]}>
            {correct ? (lang === "hi" ? "सही।" : "Correct.") : lang === "hi" ? "अभी नहीं — कारण पढ़ें।" : "Not yet — read why."}
          </Text>
          <Text style={[styles.feedbackBody, { fontSize: sized(font.sizes.sm) }]}>
            {lang === "hi" ? p.explain.hi : p.explain.en}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function LearnV2CardView({ card }: { card: LearnV2Card }) {
  const { lang } = useGuideLang();
  const { sized } = useTypeScale();
  return (
    <View style={styles.card}>
      <Text style={[styles.title, { fontSize: sized(font.sizes.lg) }]} accessibilityRole="header">
        {lang === "hi" ? card.title.hi : card.title.en}
      </Text>
      <LearnV2ExampleArt card={card} />
      <LearnV2Steps card={card} />
      <LearnV2Rows card={card} />
      <Text style={[styles.body, { fontSize: sized(17) }]}>{lang === "hi" ? card.body.hi : card.body.en}</Text>
      <LearnV2Term card={card} />
      <LearnV2Practice card={card} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.sm },
  title: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    color: color.ink,
    lineHeight: 30,
  },
  body: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    color: color.ink,
    lineHeight: 27,
  },
  artWrap: { gap: space.sm },
  photoFrame: {
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: color.ink,
    ...shadow.card,
  },
  sceneFrame: { width: "100%", overflow: "hidden" },
  photo: { position: "absolute", top: 0, left: 0, width: "100%" },
  overlay: {
    paddingVertical: 10,
    paddingHorizontal: space.md,
    alignItems: "center",
  },
  overlaySa: {
    fontFamily: "TiroDevanagariSanskrit_400Regular",
    color: "#FFF8EE",
    textAlign: "center",
  },
  overlayIast: {
    fontFamily: "Nunito_500Medium",
    fontStyle: "italic",
    fontWeight: "500",
    color: "rgba(255,248,238,0.85)",
    marginTop: 2,
    textAlign: "center",
  },
  formulaBox: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.md,
    gap: 2,
    ...shadow.card,
  },
  formulaSa: { color: color.ink, ...sanskritText(24) },
  formulaIast: {
    fontFamily: "Nunito_500Medium",
    fontStyle: "italic",
    fontWeight: "500",
    color: color.inkSoft,
  },
  formulaGloss: {
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
    color: color.inkSoft,
    marginTop: 2,
  },
  rulePill: {
    alignSelf: "flex-start",
    backgroundColor: color.surfaceMuted,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    marginTop: space.xs,
  },
  rulePillText: {
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    color: color.saffronText,
  },
  rows: { gap: space.xs },
  row: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    padding: space.sm,
    ...shadow.card,
  },
  rowSa: { color: color.ink },
  rowIast: {
    fontFamily: "Nunito_500Medium",
    fontStyle: "italic",
    fontWeight: "500",
    color: color.inkSoft,
  },
  rowGloss: {
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
    color: color.inkSoft,
  },
  steps: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
    backgroundColor: color.surface,
    borderRadius: radius.md,
    padding: space.sm,
    ...shadow.card,
  },
  step: { alignItems: "center", flex: 1 },
  stepSa: { color: color.ink },
  stepIast: {
    fontFamily: "Nunito_500Medium",
    fontStyle: "italic",
    fontWeight: "500",
    color: color.inkSoft,
  },
  stepLabel: {
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    color: color.saffronText,
    marginTop: 2,
  },
  arrow: { color: color.inkFaint, fontSize: 18, fontWeight: "700" },
  term: {
    borderLeftWidth: 3,
    borderLeftColor: color.saffron,
    paddingLeft: space.sm,
    gap: 2,
  },
  termSa: { color: color.ink },
  termIast: {
    fontFamily: "Nunito_600SemiBold",
    fontStyle: "italic",
    fontWeight: "600",
    color: color.inkSoft,
    fontSize: font.sizes.sm,
  },
  termMeaning: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    color: color.inkSoft,
    lineHeight: 20,
  },
  practice: { gap: space.xs, marginTop: space.xs },
  practicePrompt: {
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    color: color.ink,
    lineHeight: 24,
  },
  choice: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: color.border,
    padding: space.sm,
    minHeight: 52,
    justifyContent: "center",
    ...shadow.card,
  },
  choiceRight: { borderColor: color.okText, backgroundColor: color.okBg },
  choiceWrong: { borderColor: color.badText, backgroundColor: color.badBg },
  choiceText: { color: color.ink },
  choiceTextRight: { color: color.okText },
  choiceTextWrong: { color: color.badText },
  feedback: { borderRadius: radius.md, padding: space.sm, gap: 2 },
  feedbackRight: { backgroundColor: color.okBg },
  feedbackWrong: { backgroundColor: color.warnBg },
  feedbackTitle: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    color: color.ink,
  },
  feedbackBody: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    color: color.ink,
    lineHeight: 21,
  },
});
