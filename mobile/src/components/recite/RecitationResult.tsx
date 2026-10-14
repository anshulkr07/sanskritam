// RecitationResult (handover_games_daily_multiplayer §8): the total, four
// component bars (words 60, order 20, flow 15, pace 5), one or two specific
// suggestions, the expected text against what was heard, and replay of the
// learner's recording and of the reference. A part the server could not
// measure shows "not measured", never a free full score.

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ReciteComponents, ReciteResult } from "../../api/client";
import { T, sa, ui } from "../../read/look";
import { plain } from "../../utils/text";

const PARTS: { key: keyof ReciteComponents; label: string; weight: number; what: string }[] = [
  { key: "content", label: "Words", weight: 60, what: "syllables you said that the verse has" },
  { key: "sequence", label: "Order", weight: 20, what: "words in the verse's order" },
  { key: "continuity", label: "Flow", weight: 15, what: "no long pauses inside the verse" },
  { key: "rhythm", label: "Pace", weight: 5, what: "a steady reciting pace" },
];

const BAND_COLOR = { ok: T.doneInk, fix: T.wrongInk, unclear: T.ink3 } as const;

/** One or two suggestions from the weakest measured parts. */
export function suggestions(c: ReciteComponents | undefined, tips: string[]): string[] {
  const out: string[] = [];
  if (c) {
    const share = PARTS
      .map((p) => ({ p, v: c[p.key] }))
      .filter((x) => x.v != null)
      .map((x) => ({ key: x.p.key, frac: (x.v as number) / x.p.weight }))
      .sort((a, b) => a.frac - b.frac);
    for (const s of share) {
      if (s.frac >= 0.85 || out.length >= 2) break;
      if (s.key === "content") out.push("Some syllables were missing or different. Listen to the marked words again, then say them slowly.");
      if (s.key === "sequence") out.push("Some words came out of order. Recite line by line before joining the lines up.");
      if (s.key === "continuity") out.push("There were long pauses inside the verse. Breathe at the end of a half-line, not in the middle.");
      if (s.key === "rhythm") out.push("The pace was uneven or very slow. Recite along with the chant once, then alone.");
    }
  }
  for (const t of tips) {
    if (out.length >= 2) break;
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}

export default function RecitationResult({
  result,
  expected,
  onPlayMine,
  onPlayReference,
  referenceLabel = "Hear the verse",
}: {
  result: ReciteResult;
  expected: string[];
  onPlayMine?: () => void;
  onPlayReference?: () => void;
  referenceLabel?: string;
}) {
  if (result.status === "unclear") {
    return (
      <View style={styles.root} accessibilityLiveRegion="polite">
        <Text style={styles.big} accessibilityRole="header">Not clear enough to score</Text>
        <Text style={styles.body}>
          The recording was too quiet, too short or too noisy. Hold the phone closer, find a quieter place and try again.
        </Text>
        {!!onPlayMine && (
          <Pressable accessibilityLabel="Play my recording" onPress={onPlayMine} accessibilityRole="button" style={styles.btn}>
            <Text style={styles.btnText}>Play my recording</Text>
          </Pressable>
        )}
      </View>
    );
  }
  const c = result.components;
  const total = result.total ?? (c ? null : result.percent);
  const missing = c ? PARTS.filter((p) => c[p.key] == null) : [];
  const advice = suggestions(c, (result.tips ?? []).map((t) => plain(t.text)));
  return (
    <View style={styles.root} accessibilityLiveRegion="polite">
      <View style={styles.totalRow}>
        <Text style={styles.total} accessibilityRole="header">
          {total != null ? Math.round(total) : "—"}
        </Text>
        <Text style={styles.outOf}>{c ? `out of ${missing.length ? 100 - missing.reduce((n, p) => n + p.weight, 0) : 100}` : "% syllables right"}</Text>
      </View>
      {c && missing.length > 0 && (
        <Text style={styles.small}>
          {missing.map((p) => p.label).join(" and ")} could not be measured for this recording, so the total is out of{" "}
          {100 - missing.reduce((n, p) => n + p.weight, 0)}.
        </Text>
      )}
      {c && (
        <View style={styles.parts} accessibilityLabel="Score parts">
          {PARTS.map((p) => {
            const v = c[p.key];
            return (
              <View key={p.key} style={styles.partRow} accessible accessibilityLabel={`${p.label}: ${v == null ? "not measured" : `${Math.round(v)} of ${p.weight}`}, ${p.what}`}>
                <Text style={styles.partLabel}>{p.label}</Text>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${v == null ? 0 : Math.round((v / p.weight) * 100)}%` }]} />
                </View>
                <Text style={[styles.partVal, v == null && { color: T.ink3 }]}>
                  {v == null ? "not measured" : `${Math.round(v)}/${p.weight}`}
                </Text>
              </View>
            );
          })}
        </View>
      )}
      {advice.length > 0 && (
        <View style={styles.advice}>
          {advice.map((a, i) => (
            <Text key={i} style={styles.body}>• {a}</Text>
          ))}
        </View>
      )}
      {result.lines.length > 0 && (
        <View style={styles.compare}>
          <Text style={styles.label}>THE VERSE, SYLLABLE BY SYLLABLE</Text>
          {result.lines.map((ln, li) => (
            <Text key={ln.i ?? li} style={sa(19)} accessibilityLabel={`Line ${li + 1}: ${ln.aksharas.filter((a) => a.band !== "ok").length} to fix`}>
              {ln.aksharas.map((a, i) => (
                <Text key={i} style={{ color: BAND_COLOR[a.band], textDecorationLine: a.band === "fix" ? "underline" : "none" }}>
                  {a.t === "+" ? "" : a.t}
                </Text>
              ))}
            </Text>
          ))}
          <Text style={styles.small}>Underlined in red: missing or different. Grey: unclear.</Text>
        </View>
      )}
      {!!result.heard && (
        <View style={styles.compare}>
          <Text style={styles.label}>WHAT WE HEARD</Text>
          <Text style={[sa(17), { color: T.ink2 }]}>{result.heard}</Text>
          {expected.length > 0 && (
            <>
              <Text style={[styles.label, { marginTop: 6 }]}>THE VERSE</Text>
              {expected.map((t, i) => (
                <Text key={i} style={[sa(17), { color: T.ink }]}>{t}</Text>
              ))}
            </>
          )}
        </View>
      )}
      <View style={styles.btnRow}>
        {!!onPlayMine && (
          <Pressable accessibilityLabel="Play my recording" onPress={onPlayMine} accessibilityRole="button" style={styles.btn}>
            <Text style={styles.btnText}>Play my recording</Text>
          </Pressable>
        )}
        {!!onPlayReference && (
          <Pressable accessibilityLabel={referenceLabel} onPress={onPlayReference} accessibilityRole="button" style={styles.btn}>
            <Text style={styles.btnText}>{referenceLabel}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 10, paddingVertical: 12, borderTopWidth: 1, borderTopColor: T.line },
  totalRow: { flexDirection: "row", alignItems: "baseline", gap: 10 },
  total: { ...ui("bold"), fontSize: 48, lineHeight: 56, color: T.ink, fontVariant: ["tabular-nums"] },
  outOf: { ...ui("medium"), fontSize: 15, color: T.ink2 },
  big: { ...ui("bold"), fontSize: 20, color: T.ink },
  body: { ...ui("regular"), fontSize: 15, lineHeight: 22, color: T.ink },
  small: { ...ui("regular"), fontSize: 13, lineHeight: 19, color: T.ink2 },
  label: { ...ui("bold"), fontSize: 12, letterSpacing: 1.2, color: T.ink3 },
  parts: { gap: 6 },
  partRow: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 28 },
  partLabel: { ...ui("semibold"), width: 52, fontSize: 14, color: T.ink },
  track: { flex: 1, height: 8, backgroundColor: T.line },
  fill: { height: 8, backgroundColor: T.action },
  partVal: { ...ui("semibold"), minWidth: 56, textAlign: "right", fontSize: 13, color: T.ink, fontVariant: ["tabular-nums"] },
  advice: { gap: 4, padding: 12, backgroundColor: T.surface, borderWidth: 1, borderColor: T.line },
  compare: { gap: 2 },
  btnRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  btn: { minHeight: 48, justifyContent: "center", paddingHorizontal: 16, borderWidth: 1.5, borderColor: T.ink },
  btnText: { ...ui("semibold"), fontSize: 15, color: T.ink },
});
