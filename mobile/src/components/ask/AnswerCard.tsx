// AnswerCard — one shaped answer, in the Ask sheet and in Talk's Ask mode.
//
// The answer sits on the page with no box around it (the October 2026 look
// rule: plain content on cream). Each kind draws its own way (handover
// section 5): fact large with the gold chip, table as AnswerTable, remedies
// as RemedyTiles, verses with apply and a more chip, procedure with a
// checklist and numbered steps, reading with Main points then Remedies and a
// folding chart, explain as today.
//
// Every verse and link shown here passed the server's check against the text
// or the page (backend/app/services/ask_sources.py). The card says nothing
// about that check: the owner wants no such notes in the app.
//
// `live` is a card still being written (Talk's Ask mode streams it): title,
// summary, sections, kind, table and remedies grow in place; listen,
// follow-ups, more and the report flag wait for the finished answer.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { AskCard, AskChart, AskMatch } from "../../api/client";
import { haptics } from "../../services/haptics";
import { color, fill, font, nativeText, onFill, outline, sanskritText, script, space } from "../../theme";
import { plain } from "../../utils/text";
import ReportButton from "../ReportButton";
import AnswerTable from "./AnswerTable";
import ChartTable from "./ChartTable";
import MatchTable from "./MatchTable";
import RemedyTiles from "./RemedyTiles";

function open(url: string) {
  if (!url) return;
  haptics.tap();
  void WebBrowser.openBrowserAsync(url).catch(() => undefined);
}

/** Sections that duplicate remedy tiles for the old phone: steps sections
 * whose heading is a remedy name. The new card draws tiles instead. */
function isCompatRemedySection(heading: string, remedyNames: string[]): boolean {
  const h = (heading || "").trim().toLowerCase();
  if (!h) return false;
  return remedyNames.some((n) => (n || "").trim().toLowerCase() === h);
}

function VerseBlock({ v, small }: { v: NonNullable<AskCard["verses"]>[number]; small: null | { fontFamily?: string } }) {
  return (
    <View style={styles.verse}>
      <Text style={[styles.verseSa, sanskritText(18)]} selectable>
        {v.sa}
      </Text>
      {!!v.iast && <Text style={styles.verseRoman} selectable>{v.iast}</Text>}
      {!!v.meaning && <Text style={[styles.item, small]} selectable>{plain(v.meaning)}</Text>}
      {!!v.apply && <Text style={[styles.apply, small]} selectable>{plain(v.apply)}</Text>}
      {v.url ? (
        <Pressable onPress={() => open(v.url)} accessibilityRole="link" accessibilityLabel={`${v.ref}, ${v.site}`}>
          <Text style={styles.ref}>
            {v.ref}
            {v.site ? `, ${v.site}` : ""} <Ionicons name="open-outline" size={12} color={color.saffronText} />
          </Text>
        </Pressable>
      ) : (
        !!v.ref && <Text style={styles.refPlain}>{v.ref}</Text>
      )}
    </View>
  );
}

function SectionBlocks({ card, small }: { card: AskCard; small: null | { fontFamily?: string } }) {
  return (
    <>
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
    </>
  );
}

function FollowUps({ card, small, onFollowUp }: { card: AskCard; small: null | { fontFamily?: string }; onFollowUp?: (q: string) => void }) {
  if (!onFollowUp || (card.follow_ups ?? []).length === 0) return null;
  return (
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
  );
}

// Which part of a procedure a section is. Headings arrive in the answer's
// language ("सामग्री", "विधि"), so the heading words are only a first guess:
// numbered sections are steps, and the first plain list before the steps is
// what you need. Nothing is ever dropped: any other section draws as a list.
const NEED_WORDS = /need|samagri|सामग्री|आवश्यक|चाहिए/i;
const STEP_WORDS = /step|vidhi|विधि|चरण/i;
const AVOID_WORDS = /avoid|न करें|वर्जित|सावधान/i;

function procedureParts(sections: AskCard["sections"]) {
  const list = sections ?? [];
  const isSteps = (s: (typeof list)[number]) => s.style === "steps" || STEP_WORDS.test(s.heading || "");
  const stepsAt = list.findIndex(isSteps);
  return list.map((s, i) => {
    if (AVOID_WORDS.test(s.heading || "")) return "avoid" as const;
    if (NEED_WORDS.test(s.heading || "")) return "need" as const;
    if (i === stepsAt) return "steps" as const;
    if (stepsAt > 0 && i === 0 && s.style !== "text") return "need" as const;
    return isSteps(s) ? ("steps" as const) : ("other" as const);
  });
}

function SourceLinks({ card }: { card: AskCard }) {
  if ((card.sources ?? []).length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionHead}>Read more</Text>
      {(card.sources ?? []).map((s, i) => (
        <Pressable key={i} onPress={() => open(s.url)} accessibilityRole="link" accessibilityLabel={`${s.title}, ${s.site}`}>
          <Text style={styles.ref}>
            {s.title}
            {s.site && s.site !== s.title ? `, ${s.site}` : ""}{" "}
            <Ionicons name="open-outline" size={12} color={color.saffronText} />
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function ProcedureBody({ card, small }: { card: AskCard; small: null | { fontFamily?: string } }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const parts = procedureParts(card.sections);
  const sections = card.sections ?? [];
  const head = (h: string) =>
    !!h && <Text style={[styles.sectionHead, small && { fontFamily: small.fontFamily }]}>{h}</Text>;
  return (
    <View style={styles.section}>
      {sections.map((s, si) => {
        const part = parts[si];
        if (part === "need") {
          return (
            <View key={si} style={styles.section}>
              {head(s.heading)}
              {(s.items ?? []).map((item, j) => {
                const key = `${si}-${j}`;
                const on = !!checked[key];
                return (
                  <Pressable
                    key={j}
                    onPress={() => {
                      haptics.tap();
                      setChecked((c) => ({ ...c, [key]: !c[key] }));
                    }}
                    style={styles.checkRow}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={plain(item)}
                  >
                    <Ionicons name={on ? "checkbox" : "square-outline"} size={20} color={color.ink} />
                    <Text style={[styles.item, small, styles.stepText, on && styles.ticked]}>{plain(item)}</Text>
                  </Pressable>
                );
              })}
            </View>
          );
        }
        if (part === "steps") {
          return (
            <View key={si} style={styles.section}>
              {head(s.heading)}
              {(s.items ?? []).map((item, j) => (
                <View key={j} style={styles.stepRow}>
                  <View style={styles.stepNum}>
                    <Text style={styles.stepNumText}>{j + 1}</Text>
                  </View>
                  <Text style={[styles.item, small, styles.stepText]} selectable>
                    {plain(item)}
                  </Text>
                </View>
              ))}
            </View>
          );
        }
        return (
          <View key={si} style={styles.section}>
            {head(s.heading)}
            {(s.items ?? []).map((item, j) => (
              <Text key={j} style={[styles.item, small]} selectable>
                • {plain(item)}
              </Text>
            ))}
          </View>
        );
      })}
      {(card.verses ?? []).map((v, i) => (
        <VerseBlock key={`v${i}`} v={v} small={small} />
      ))}
    </View>
  );
}

export default function AnswerCard({
  card,
  explanation,
  question,
  scriptKey = "latin",
  chart,
  onPlace,
  onFollowUp,
  onMore,
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
  /** Verses more chip: asked with the long question, showing the label. */
  onMore?: (question: string, display: string) => void;
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
  const kind = card.kind ?? "explain";
  const [chartOpen, setChartOpen] = useState(false);

  const whenChip = !!card.when?.text && (
    <View style={styles.when}>
      <Text style={styles.whenText}>{card.when.text}</Text>
      {!!card.when.note && <Text style={styles.whenNote}>{card.when.note}</Text>}
    </View>
  );

  const placeRow = card.place_needed && !!onPlace && (
    <Pressable onPress={onPlace} accessibilityRole="button" accessibilityLabel="Set your place" style={styles.linkRow}>
      <Text style={styles.linkRowText}>Set your place</Text>
      <Ionicons name="chevron-forward" size={15} color={color.inkFaint} />
    </Pressable>
  );

  const listenBtn = !!onListen && !live && (
    <Pressable
      onPress={onListen}
      style={[styles.round, listening && styles.roundOn]}
      accessibilityRole="button"
      accessibilityLabel={listening ? "Stop reading aloud" : "Read the answer aloud"}
    >
      <Ionicons name={listening ? "stop" : "volume-high"} size={17} color={listening ? onFill.text : color.ink} />
    </Pressable>
  );

  // The fact kind: the answer large, the gold chip, follow-ups. No blocks.
  if (kind === "fact") {
    return (
      <View style={styles.card}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, body && { fontFamily: body.fontFamily }]} accessibilityRole="header">
            {card.title}
            {!!card.title_sa && <Text style={[styles.titleSa, script("semibold")]}> {card.title_sa}</Text>}
          </Text>
          {listenBtn}
        </View>
        {whenChip}
        {placeRow}
        {!!card.summary && <Text style={[styles.fact, body]} selectable>{plain(card.summary)}</Text>}
        {!!onFollowUp && !live && (card.follow_ups ?? []).length > 0 && (
          <FollowUps card={card} small={small} onFollowUp={onFollowUp} />
        )}
        {!live && <ReportButton surface={surface} question={question} answer={explanation} />}
      </View>
    );
  }

  // The table kind: summary, then the table. Sections are the old phone's
  // form and are ignored here.
  if (kind === "table" && card.table) {
    return (
      <View style={styles.card}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, body && { fontFamily: body.fontFamily }]} accessibilityRole="header">
            {card.title}
            {!!card.title_sa && <Text style={[styles.titleSa, script("semibold")]}> {card.title_sa}</Text>}
          </Text>
          {listenBtn}
        </View>
        {whenChip}
        {placeRow}
        {!!card.summary && <Text style={[styles.summary, body]} selectable>{plain(card.summary)}</Text>}
        <AnswerTable table={card.table} />
        {!!onFollowUp && !live && (card.follow_ups ?? []).length > 0 && (
          <FollowUps card={card} small={small} onFollowUp={onFollowUp} />
        )}
        {!live && <ReportButton surface={surface} question={question} answer={explanation} />}
      </View>
    );
  }

  // The remedies kind: summary, tiles, then the Avoid section. Compat
  // sections duplicating the tiles are ignored here.
  if (kind === "remedies" && card.remedies) {
    const names = (card.remedies ?? []).map((r) => r.name);
    const rest = (card.sections ?? []).filter((s) => !isCompatRemedySection(s.heading, names));
    return (
      <View style={styles.card}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, body && { fontFamily: body.fontFamily }]} accessibilityRole="header">
            {card.title}
            {!!card.title_sa && <Text style={[styles.titleSa, script("semibold")]}> {card.title_sa}</Text>}
          </Text>
          {listenBtn}
        </View>
        {whenChip}
        {placeRow}
        {!!card.summary && <Text style={[styles.summary, body]} selectable>{plain(card.summary)}</Text>}
        <RemedyTiles remedies={card.remedies} />
        {rest.map((s, i) => (
          <View key={i} style={styles.section}>
            {!!s.heading && <Text style={[styles.sectionHead, small && { fontFamily: small.fontFamily }]}>{s.heading}</Text>}
            {(s.items ?? []).map((item, j) => (
              <Text key={j} style={[styles.item, small]} selectable>
                • {plain(item)}
              </Text>
            ))}
          </View>
        ))}
        <SourceLinks card={card} />
        {!!onFollowUp && !live && (card.follow_ups ?? []).length > 0 && (
          <FollowUps card={card} small={small} onFollowUp={onFollowUp} />
        )}
        {!live && <ReportButton surface={surface} question={question} answer={explanation} />}
      </View>
    );
  }

  // The verses kind: overview, verses with apply, then the more chip last.
  if (kind === "verses") {
    return (
      <View style={styles.card}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, body && { fontFamily: body.fontFamily }]} accessibilityRole="header">
            {card.title}
            {!!card.title_sa && <Text style={[styles.titleSa, script("semibold")]}> {card.title_sa}</Text>}
          </Text>
          {listenBtn}
        </View>
        {whenChip}
        {placeRow}
        {!!card.summary && <Text style={[styles.summary, body]} selectable>{plain(card.summary)}</Text>}
        {(card.verses ?? []).map((v, i) => (
          <VerseBlock key={`v${i}`} v={v} small={small} />
        ))}
        <SectionBlocks card={card} small={small} />
        <SourceLinks card={card} />
        {!!card.more && !live && (
          <View style={styles.follows}>
            <Pressable
              onPress={() => {
                haptics.tap();
                if (onMore) onMore(card.more!.question, card.more!.label);
                else if (onFollowUp) onFollowUp(card.more!.question);
              }}
              style={styles.follow}
              accessibilityRole="button"
              accessibilityLabel={card.more.label}
            >
              <Text style={[styles.followText, small && { fontFamily: small.fontFamily }]}>{card.more.label}</Text>
              <Ionicons name="arrow-forward" size={14} color={color.ink} />
            </Pressable>
          </View>
        )}
        {!!onFollowUp && !live && (card.follow_ups ?? []).length > 0 && (
          <FollowUps card={card} small={small} onFollowUp={onFollowUp} />
        )}
        {!live && <ReportButton surface={surface} question={question} answer={explanation} />}
      </View>
    );
  }

  // The procedure kind: checklist, numbered steps, mantra, avoid.
  if (kind === "procedure") {
    return (
      <View style={styles.card}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, body && { fontFamily: body.fontFamily }]} accessibilityRole="header">
            {card.title}
            {!!card.title_sa && <Text style={[styles.titleSa, script("semibold")]}> {card.title_sa}</Text>}
          </Text>
          {listenBtn}
        </View>
        {whenChip}
        {placeRow}
        {!!card.summary && <Text style={[styles.summary, body]} selectable>{plain(card.summary)}</Text>}
        <ProcedureBody card={card} small={small} />
        <SourceLinks card={card} />
        {!!onFollowUp && !live && (card.follow_ups ?? []).length > 0 && (
          <FollowUps card={card} small={small} onFollowUp={onFollowUp} />
        )}
        {!live && <ReportButton surface={surface} question={question} answer={explanation} />}
      </View>
    );
  }

  // The reading kind: Main points, Remedies, folding chart, open match.
  if (kind === "reading") {
    return (
      <View style={styles.card}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, body && { fontFamily: body.fontFamily }]} accessibilityRole="header">
            {card.title}
            {!!card.title_sa && <Text style={[styles.titleSa, script("semibold")]}> {card.title_sa}</Text>}
          </Text>
          {listenBtn}
        </View>
        {whenChip}
        {placeRow}
        {!!card.summary && <Text style={[styles.summary, body]} selectable>{plain(card.summary)}</Text>}
        <SectionBlocks card={card} small={small} />
        {!!match && (
          <View>
            <MatchTable match={match} askerIs={askerIs} />
            {!!onPartner && (
              <Pressable onPress={onPartner} accessibilityRole="button" accessibilityLabel="Change partner details" style={styles.linkRow}>
                <Text style={styles.linkRowText}>Change partner details</Text>
                <Ionicons name="chevron-forward" size={15} color={color.inkFaint} />
              </Pressable>
            )}
          </View>
        )}
        {!!chart && !match && (
          <View>
            <Pressable
              onPress={() => {
                haptics.tap();
                setChartOpen((v) => !v);
              }}
              style={styles.linkRow}
              accessibilityRole="button"
              accessibilityLabel={chartOpen ? "Hide the chart" : "Show the chart"}
              accessibilityState={{ expanded: chartOpen }}
            >
              <Text style={styles.linkRowText}>{chartOpen ? "Hide the chart" : "Show the chart"}</Text>
              <Ionicons name={chartOpen ? "chevron-up" : "chevron-down"} size={15} color={color.inkFaint} />
            </Pressable>
            {chartOpen && <ChartTable chart={chart} />}
            {!!onBirth && (
              <Pressable onPress={onBirth} accessibilityRole="button" accessibilityLabel="Change birth details" style={styles.linkRow}>
                <Text style={styles.linkRowText}>Change birth details</Text>
                <Ionicons name="chevron-forward" size={15} color={color.inkFaint} />
              </Pressable>
            )}
          </View>
        )}
        <SourceLinks card={card} />
        {!!onFollowUp && !live && (card.follow_ups ?? []).length > 0 && (
          <FollowUps card={card} small={small} onFollowUp={onFollowUp} />
        )}
        {!live && <ReportButton surface={surface} question={question} answer={explanation} />}
      </View>
    );
  }

  // Explain, or no kind (old backend): as today.
  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, body && { fontFamily: body.fontFamily }]} accessibilityRole="header">
          {card.title}
          {!!card.title_sa && <Text style={[styles.titleSa, script("semibold")]}> {card.title_sa}</Text>}
        </Text>
        {listenBtn}
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

      <SectionBlocks card={card} small={small} />

      {!!match && (
        <View>
          <MatchTable match={match} askerIs={askerIs} />
          {!!onPartner && (
            <Pressable onPress={onPartner} accessibilityRole="button" accessibilityLabel="Change partner details" style={styles.linkRow}>
              <Text style={styles.linkRowText}>Change partner details</Text>
              <Ionicons name="chevron-forward" size={15} color={color.inkFaint} />
            </Pressable>
          )}
        </View>
      )}

      {!!chart && !match && (
        <View>
          <ChartTable chart={chart} />
          {!!onBirth && (
            <Pressable onPress={onBirth} accessibilityRole="button" accessibilityLabel="Change birth details" style={styles.linkRow}>
              <Text style={styles.linkRowText}>Change birth details</Text>
              <Ionicons name="chevron-forward" size={15} color={color.inkFaint} />
            </Pressable>
          )}
        </View>
      )}

      {(card.verses ?? []).map((v, i) => (
        <VerseBlock key={`v${i}`} v={v} small={small} />
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

      <SourceLinks card={card} />

      {!!card.caution && (
        <View style={styles.caution}>
          <Ionicons name="alert-circle-outline" size={15} color={color.badText} />
          <Text style={[styles.cautionText, small && { fontFamily: small.fontFamily }]}>{plain(card.caution)}</Text>
        </View>
      )}

      {!!onFollowUp && !live && (card.follow_ups ?? []).length > 0 && (
        <FollowUps card={card} small={small} onFollowUp={onFollowUp} />
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
  fact: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 20, color: color.ink, lineHeight: 28 },
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
  apply: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.sm, color: color.ink, lineHeight: 21 },
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
  checkRow: { flexDirection: "row", alignItems: "center", gap: space.xs, minHeight: 44 },
  ticked: { color: color.inkSoft },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: space.xs },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: fill.ink,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  stepNumText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 12, color: onFill.text },
  stepText: { flex: 1 },
});
