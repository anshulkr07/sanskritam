// One lesson card in Learn's look (owner-approved 2026-10-13): a labelled card
// type, square corners, Sanskrit in Tiro Devanagari Sanskrit as the largest
// thing, everything else in Mukta. One idea per card. The picture's baked
// caption band is clipped; the checked Devanagari and IAST sit under it as
// selectable text. No disclosure/expandable control exists here by design.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { useGuideLang } from "../hooks/useGuide";
import { useTypeScale } from "../hooks/useTypeScale";
import { haptics } from "../services/haptics";
import { T, sa, ui } from "../trail/theme";
import { announce } from "../utils/announce";
import { findSandhiArt, getLearnV2Asset } from "./assetMap";
import { sceneHeightOf } from "./sceneCrop";
import type { LearnV2Card } from "./types";

const DEVANAGARI = /[ऀ-ॿ]/;

/** The card's kind as the learner sees it. */
export function cardLabel(card: LearnV2Card, lang: "en" | "hi"): string {
  const hi = lang === "hi";
  if (card.practice) return hi ? "जाँचें" : "Quick check";
  if (card.kind === "summary") return hi ? "सार" : "Recap";
  if (card.steps?.length || card.example?.formula) return hi ? "नियम" : "The rule";
  if (card.rows?.length) return hi ? "ध्यान दें" : "Notice";
  if (card.example) return hi ? "देखें" : "See it";
  return hi ? "सीखें" : "Learn";
}

function artIds(card: LearnV2Card): string[] {
  const ex = card.example;
  const matched = ex && card.id.startsWith("sandhi-") ? findSandhiArt(ex.sa, ex.iast) : undefined;
  return (card.assetIds ?? (card.assetId ? [card.assetId] : matched ? [matched] : [])).filter((id) => !!getLearnV2Asset(id));
}

/** The painted scene only: the generated caption band below it is cut off. */
function Scene({ id }: { id: string }) {
  const { lang } = useGuideLang();
  const [failed, setFailed] = useState(false);
  const asset = getLearnV2Asset(id);
  if (!asset || failed) return null;
  const scene = sceneHeightOf(id, asset.sceneHeight);
  return (
    <View style={{ width: "100%", aspectRatio: asset.width / scene, overflow: "hidden", backgroundColor: T.line }}
      accessible accessibilityRole="image" accessibilityLabel={lang === "hi" ? asset.altHi : asset.altEn}>
      <Image source={asset.source} resizeMode="cover" accessible={false} onError={() => setFailed(true)}
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: `${(asset.height / scene) * 100}%` }} />
    </View>
  );
}

function Example({ card }: { card: LearnV2Card }) {
  const { lang } = useGuideLang();
  const { sized } = useTypeScale();
  const ex = card.example;
  if (!ex) return null;
  const big = ex.sa.length <= 14 && !ex.sa.includes("→");
  return (
    <View style={{ gap: 2 }}>
      <Text selectable style={[sa(sized(big ? 42 : 28, { sanskrit: true })), { color: T.ink }]}>{ex.sa}</Text>
      <Text selectable style={[ui("regular"), { color: T.ink2, fontSize: sized(17) }]}>{ex.iast}</Text>
      <Text style={[ui("semibold"), { color: T.ink, fontSize: sized(19), lineHeight: sized(26), marginTop: 2 }]}>{lang === "hi" ? ex.gloss.hi : ex.gloss.en}</Text>
      {ex.formula ? (
        <View style={styles.formula} accessible accessibilityLabel={ex.formula}>
          <Text style={[ui("semibold"), { color: T.action, fontSize: sized(15) }]}>{ex.formula}</Text>
        </View>
      ) : null}
    </View>
  );
}

function Rows({ card }: { card: LearnV2Card }) {
  const { lang } = useGuideLang();
  const { sized } = useTypeScale();
  if (!card.rows?.length) return null;
  return (
    <View style={styles.table}>
      {card.rows.map((r, i) => (
        <View key={i} style={styles.tableRow} accessible accessibilityLabel={`${r.sa}. ${r.iast}. ${lang === "hi" ? r.gloss.hi : r.gloss.en}`}>
          <View style={{ flex: 1.1 }}>
            <Text style={[sa(sized(26, { sanskrit: true })), { color: T.ink }]}>{r.sa}</Text>
            <Text style={[ui("regular"), { color: T.ink2, fontSize: sized(14) }]}>{r.iast}</Text>
          </View>
          <Text style={[ui("regular"), { flex: 1, color: T.ink, fontSize: sized(15.5) }]}>{lang === "hi" ? r.gloss.hi : r.gloss.en}</Text>
        </View>
      ))}
    </View>
  );
}

function Steps({ card }: { card: LearnV2Card }) {
  const { lang } = useGuideLang();
  const { sized } = useTypeScale();
  if (!card.steps?.length) return null;
  return (
    <View style={styles.steps} accessible accessibilityLabel={card.steps.map((s) => `${s.sa}, ${s.iast}`).join(". ")}>
      {card.steps.map((s, i) => (
        <React.Fragment key={i}>
          {i > 0 && <Ionicons name="arrow-forward" size={18} color={T.ink3} />}
          <View style={{ alignItems: "center", flex: 1 }}>
            <Text style={[sa(sized(28, { sanskrit: true })), { color: T.ink }]}>{s.sa}</Text>
            <Text style={[ui("semibold"), { color: T.ink2, fontSize: sized(12.5), textAlign: "center" }]}>{lang === "hi" ? s.label.hi : s.label.en}</Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

function Term({ card }: { card: LearnV2Card }) {
  const { lang } = useGuideLang();
  const { sized } = useTypeScale();
  if (!card.term) return null;
  const t = card.term;
  return (
    <View style={styles.term} accessible accessibilityLabel={`${t.sa}, ${t.iast}: ${lang === "hi" ? t.meaning.hi : t.meaning.en}`}>
      <Text>
        <Text style={[sa(sized(20, { sanskrit: true })), { color: T.ink }]}>{t.sa}</Text>
        <Text style={[ui("regular"), { color: T.ink2, fontSize: sized(14.5) }]}>  ·  {t.iast}</Text>
      </Text>
      <Text style={[ui("regular"), { color: T.ink, fontSize: sized(15.5), lineHeight: sized(22) }]}>{lang === "hi" ? t.meaning.hi : t.meaning.en}</Text>
    </View>
  );
}

/** A choice label like "पठति (paṭhati)" shows the Sanskrit large and the IAST small. */
function ChoiceLabel({ text, color }: { text: string; color: string }) {
  const { sized } = useTypeScale();
  const m = /^(.+?)\s*\((.+)\)$/.exec(text);
  if (m && DEVANAGARI.test(m[1])) {
    return (
      <View style={{ flex: 1, flexDirection: "row", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <Text style={[sa(sized(24, { sanskrit: true })), { color }]}>{m[1]}</Text>
        <Text style={[ui("regular"), { color: T.ink2, fontSize: sized(14.5) }]}>{m[2]}</Text>
      </View>
    );
  }
  return <Text style={[DEVANAGARI.test(text) ? sa(sized(22, { sanskrit: true })) : ui("medium"), { flex: 1, color, fontSize: DEVANAGARI.test(text) ? undefined : sized(16) }]}>{text}</Text>;
}

/** Local check: immediate feedback; the first answer is reported to the player. */
function Practice({ card, onAnswer }: { card: LearnV2Card; onAnswer?: (correct: boolean) => void }) {
  const { lang } = useGuideLang();
  const { sized } = useTypeScale();
  const [picked, setPicked] = useState<number | null>(null);
  const p = card.practice;
  if (!p) return null;
  const answered = picked !== null;
  const correct = answered && p.choices[picked].correct;
  return (
    <View style={{ gap: 8, marginTop: 4 }}>
      <Text style={[ui("semibold"), { color: T.ink, fontSize: sized(19), lineHeight: sized(26) }]}>{lang === "hi" ? p.prompt.hi : p.prompt.en}</Text>
      {p.choices.map((c, i) => {
        const right = answered && c.correct;
        const wrong = answered && picked === i && !c.correct;
        const label = lang === "hi" ? c.label.hi : c.label.en;
        return (
          <Pressable
            key={i}
            disabled={answered}
            onPress={() => {
              haptics.tap();
              setPicked(i);
              onAnswer?.(c.correct);
              announce(c.correct ? (lang === "hi" ? "सही।" : "Right.") : lang === "hi" ? "अभी नहीं।" : "Not quite.");
            }}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ disabled: answered, selected: picked === i }}
            style={[styles.choice, right && { borderColor: T.done, backgroundColor: T.doneBg }, wrong && { borderColor: T.wrong, backgroundColor: T.wrongBg }]}
          >
            <ChoiceLabel text={label} color={T.ink} />
            {right ? <View style={[styles.badge, { backgroundColor: T.done }]}><Ionicons name="checkmark" size={16} color={T.white} /></View> : null}
            {wrong ? <View style={[styles.badge, { backgroundColor: T.wrong }]}><Ionicons name="close" size={16} color={T.white} /></View> : null}
          </Pressable>
        );
      })}
      {answered ? (
        <View style={[styles.feedback, { backgroundColor: correct ? T.doneBg : T.wrongBg }]} accessibilityLiveRegion="polite">
          <Text style={[ui("bold"), { color: correct ? T.doneInk : T.wrongInk, fontSize: sized(16) }]}>{correct ? (lang === "hi" ? "सही।" : "Right.") : lang === "hi" ? "अभी नहीं। कारण पढ़ें:" : "Not quite. Here is why:"}</Text>
          <Text style={[ui("regular"), { color: T.ink, fontSize: sized(15.5), lineHeight: sized(22) }]}>{lang === "hi" ? p.explain.hi : p.explain.en}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function LearnV2CardView({ card, accent = T.action, onAnswer }: { card: LearnV2Card; accent?: string; onAnswer?: (correct: boolean) => void }) {
  const { lang } = useGuideLang();
  const { sized } = useTypeScale();
  const ids = artIds(card);
  return (
    <View style={{ gap: 14 }}>
      <Text style={[ui("bold"), { color: accent, fontSize: sized(12), letterSpacing: 1.4 }]}>{cardLabel(card, lang).toUpperCase()}</Text>
      <Text accessibilityRole="header" style={[ui("bold"), { color: T.ink, fontSize: sized(23), lineHeight: sized(29), marginTop: -8 }]}>
        {lang === "hi" ? card.title.hi : card.title.en}
      </Text>
      {ids.map((id) => <Scene key={id} id={id} />)}
      <Example card={card} />
      <Steps card={card} />
      <Rows card={card} />
      <Text selectable style={[ui("regular"), { color: T.ink, fontSize: sized(17), lineHeight: sized(26) }]}>{lang === "hi" ? card.body.hi : card.body.en}</Text>
      <Term card={card} />
      <Practice card={card} onAnswer={onAnswer} />
    </View>
  );
}

const styles = StyleSheet.create({
  formula: { alignSelf: "flex-start", marginTop: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1.5, borderColor: T.action },
  table: { borderTopWidth: 1, borderTopColor: T.line },
  tableRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: T.line },
  steps: { flexDirection: "row", alignItems: "center", gap: 6, padding: 12, backgroundColor: T.surface, borderWidth: 1, borderColor: T.line },
  term: { gap: 2, paddingTop: 10, borderTopWidth: 1, borderTopColor: T.line },
  choice: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 58, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: T.surface, borderWidth: 2, borderColor: T.lineStrong },
  badge: { width: 26, height: 26, alignItems: "center", justifyContent: "center" },
  feedback: { gap: 2, padding: 14 },
});
