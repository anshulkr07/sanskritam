// AnswerCard — one shaped answer, in the Ask sheet and in Talk's Ask mode.
//
// The answer sits on the page with no box around it (the October 2026 look
// rule: plain content on cream). In reading order: title, the date when the
// calendar was involved, the direct answer, the sections (numbered steps for
// a puja, an asana or a worked sum; bullets; or short paragraphs), the chart
// when one was calculated, verses, Sanskrit words, links, the one-line
// caution, then what to ask next.
//
// Every verse and link shown here passed the server's check against the text
// or the page (backend/app/services/ask_sources.py). The card says nothing
// about that check: the owner wants no such notes in the app.
//
// `live` is a card still being written (Talk's Ask mode streams it): title,
// summary and sections grow in place; listen, follow-ups and the report flag
// wait for the finished answer.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import * as WebBrowser from "expo-web-browser";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { AskCard, AskChart, AskMatch } from "../../api/client";
import { haptics } from "../../services/haptics";
import { color, fill, font, nativeText, onFill, outline, sanskritText, script, space } from "../../theme";
import { plain } from "../../utils/text";
import ReportButton from "../ReportButton";
import ChartTable from "./ChartTable";
import MatchTable from "./MatchTable";

function open(url: string) {
  if (!url) return;
  haptics.tap();
  void WebBrowser.openBrowserAsync(url).catch(() => undefined);
}

export default function AnswerCard({
  card,
  explanation,
  question,
  scriptKey = "latin",
  chart,
  onPlace,
  onFollowUp,
  onListen,
  listening = false,
  onBirth,
  match,
  askerIs,
  onPartner,
  live = false,
  surface = "ask",
}: {
  card: AskCard;
  explanation: string;
  question: string;
  /** The answer language's script, for its face. */
  scriptKey?: string;
  chart?: AskChart | null;
  onPlace?: () => void;
  onFollowUp?: (q: string) => void;
  onListen?: () => void;
  listening?: boolean;
  /** Shown with a chart: change the birth details it was made from. */
  onBirth?: () => void;
  match?: AskMatch | null;
  askerIs?: "boy" | "girl";
  /** Shown with a match: change the partner's details. */
  onPartner?: () => void;
  live?: boolean;
  surface?: "ask" | "talk";
}) {
  const body = scriptKey && scriptKey !== "latin" ? nativeText(scriptKey, 16) : null;
  const small = scriptKey && scriptKey !== "latin" ? nativeText(scriptKey, 14) : null;

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, body && { fontFamily: body.fontFamily }]} accessibilityRole="header">
          {card.title}
          {!!card.title_sa && <Text style={[styles.titleSa, script("semibold")]}> {card.title_sa}</Text>}
        </Text>
        {!!onListen && !live && (
          <Pressable
            onPress={onListen}
            style={[styles.round, listening && styles.roundOn]}
            accessibilityRole="button"
            accessibilityLabel={listening ? "Stop reading aloud" : "Read the answer aloud"}
          >
            <Ionicons name={listening ? "stop" : "volume-high"} size={17} color={listening ? onFill.text : color.ink} />
          </Pressable>
        )}
      </View>

      {!!card.when?.text && (
        <View style={styles.when}>
          <Text style={styles.whenText}>{card.when.text}</Text>
          {!!card.when.note && <Text style={styles.whenNote}>{card.when.note}</Text>}
        </View>
      )}

      {card.place_needed && !!onPlace && (
        <Pressable onPress={onPlace} accessibilityRole="button" accessibilityLabel="Set your place" style={styles.linkRow}>
          <Text style={styles.linkRowText}>Set your place</Text>
          <Ionicons name="chevron-forward" size={15} color={color.inkFaint} />
        </Pressable>
      )}

      {!!card.summary && <Text style={[styles.summary, body]} selectable>{plain(card.summary)}</Text>}

      {(card.sections ?? []).map((s, i) => (
        <View key={i} style={styles.section}>
          {!!s.heading && <Text style={[styles.sectionHead, small && { fontFamily: small.fontFamily }]}>{s.heading}</Text>}
          {(s.items ?? []).map((item, j) => (
            <Text
              key={j}
              style={[s.style === "text" ? styles.para : styles.item, small]}
              selectable
            >
              {s.style === "steps" ? `${j + 1}. ` : s.style === "text" ? "" : "• "}
              {plain(item)}
            </Text>
          ))}
        </View>
      ))}

      {!!match && (
        <View>
          <MatchTable match={match} askerIs={askerIs} />
          {!!onPartner && (
            <Pressable onPress={onPartner} accessibilityRole="button" style={styles.linkRow}>
              <Text style={styles.linkRowText}>Change partner's details</Text>
              <Ionicons name="chevron-forward" size={15} color={color.inkFaint} />
            </Pressable>
          )}
        </View>
      )}

      {!!chart && !match && (
        <View>
          <ChartTable chart={chart} />
          {!!onBirth && (
            <Pressable onPress={onBirth} accessibilityRole="button" style={styles.linkRow}>
              <Text style={styles.linkRowText}>Change birth details</Text>
              <Ionicons name="chevron-forward" size={15} color={color.inkFaint} />
            </Pressable>
          )}
        </View>
      )}

      {(card.verses ?? []).map((v, i) => (
        <View key={`v${i}`} style={styles.verse}>
          <Text style={[styles.verseSa, sanskritText(18)]} selectable>
            {v.sa}
          </Text>
          {!!v.iast && <Text style={styles.verseRoman} selectable>{v.iast}</Text>}
          {!!v.meaning && <Text style={[styles.item, small]} selectable>{plain(v.meaning)}</Text>}
          {v.url ? (
            <Pressable onPress={() => open(v.url)} accessibilityRole="link" accessibilityLabel={`${v.ref}, ${v.site}`}>
              <Text style={styles.ref}>
                {v.ref}
                {v.site ? ` · ${v.site}` : ""} <Ionicons name="open-outline" size={12} color={color.saffronText} />
              </Text>
            </Pressable>
          ) : (
            !!v.ref && <Text style={styles.refPlain}>{v.ref}</Text>
          )}
        </View>
      ))}

      {(card.terms ?? []).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionHead}>Words</Text>
          {(card.terms ?? []).map((t, i) => (
            <Text key={i} style={styles.term}>
              <Text style={[styles.termSa, script("semibold")]}>{t.sa} </Text>
              <Text style={styles.termRest}>
                {t.iast} · {t.meaning}
              </Text>
            </Text>
          ))}
        </View>
      )}

      {(card.sources ?? []).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionHead}>Read more</Text>
          {(card.sources ?? []).map((s, i) => (
            <Pressable key={i} onPress={() => open(s.url)} accessibilityRole="link" accessibilityLabel={`${s.title}, ${s.site}`}>
              <Text style={styles.ref}>
                {s.title}
                {s.site && s.site !== s.title ? ` · ${s.site}` : ""}{" "}
                <Ionicons name="open-outline" size={12} color={color.saffronText} />
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {!!card.caution && (
        <View style={styles.caution}>
          <Ionicons name="alert-circle-outline" size={15} color={color.badText} />
          <Text style={[styles.cautionText, small && { fontFamily: small.fontFamily }]}>{plain(card.caution)}</Text>
        </View>
      )}

      {!!onFollowUp && !live && (card.follow_ups ?? []).length > 0 && (
        <View style={styles.follows}>
          {(card.follow_ups ?? []).map((f, i) => (
            <Pressable
              key={i}
              onPress={() => {
                haptics.tap();
                onFollowUp(f);
              }}
              style={styles.follow}
              accessibilityRole="button"
              accessibilityLabel={`Ask: ${f}`}
            >
              <Text style={[styles.followText, small && { fontFamily: small.fontFamily }]}>{f}</Text>
              <Ionicons name="arrow-forward" size={14} color={color.ink} />
            </Pressable>
          ))}
        </View>
      )}

      {!live && <ReportButton surface={surface} question={question} answer={explanation} />}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.sm },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: space.sm },
  title: { flex: 1, fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 17, color: color.ink, lineHeight: 24 },
  titleSa: { fontSize: 15, color: color.inkSoft },
  round: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: color.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  roundOn: { backgroundColor: fill.ink, borderColor: fill.ink },
  when: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: space.sm,
    backgroundColor: fill.gold,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: space.sm,
  },
  whenText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm, color: onFill.text },
  whenNote: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 11, color: onFill.text },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  linkRowText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: color.ink },
  summary: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.base, color: color.ink, lineHeight: 24 },
  section: { gap: 4, marginTop: 2 },
  sectionHead: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: 11,
    color: color.inkSoft,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  item: { fontFamily: "Nunito_500Medium", fontWeight: "500", fontSize: font.sizes.sm, color: color.ink, lineHeight: 21 },
  para: { fontFamily: "Nunito_500Medium", fontWeight: "500", fontSize: font.sizes.sm, color: color.ink, lineHeight: 22, marginBottom: 4 },
  verse: { gap: 2, marginTop: space.xs, paddingLeft: space.sm, borderLeftWidth: 3, borderLeftColor: fill.saffron },
  verseSa: { color: color.ink },
  verseRoman: { fontFamily: "Nunito_400Regular", fontStyle: "italic", fontSize: 13, color: color.inkSoft, lineHeight: 19 },
  ref: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 13, color: color.saffronText, lineHeight: 22 },
  refPlain: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 13, color: color.inkSoft, lineHeight: 20 },
  term: { fontFamily: "Nunito_500Medium", fontWeight: "500", fontSize: font.sizes.sm, color: color.inkSoft, lineHeight: 22 },
  termSa: { fontSize: 15, color: color.ink },
  termRest: { fontSize: font.sizes.sm, color: color.inkSoft },
  caution: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  cautionText: { flex: 1, fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.sm, color: color.badText, lineHeight: 20 },
  follows: { gap: space.xs, marginTop: space.xs },
  follow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.xs,
    minHeight: 44,
    paddingHorizontal: space.sm,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: outline,
  },
  followText: { flex: 1, fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: color.ink, lineHeight: 20 },
});
