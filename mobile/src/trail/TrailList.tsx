// The trail as a plain list (owner's option B), used when text is set Large or
// Extra large: map labels would overlap there. Same stops, same states.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { GuideLang } from "../api/client";
import { useTypeScale } from "../hooks/useTypeScale";
import type { TrailStage, TrailStop, TrailUnit } from "./course";
import { stageStops } from "./course";
import type { StopStatus, TrailFacts } from "./progress";
import { PRACTICE_PASS, unitMastery } from "./progress";
import { practiceMeta, stopMeta } from "./text";
import { T, sa, ui } from "./theme";
import { Medallion } from "./ui";

interface Props {
  stage: TrailStage;
  statuses: Map<string, StopStatus>;
  facts: TrailFacts;
  lang: GuideLang;
  onStop: (stop: TrailStop) => void;
  onPractice: (unit: TrailUnit) => void;
}

export default function TrailList({ stage, statuses, facts, lang, onStop, onPractice }: Props) {
  const { sized } = useTypeScale();
  const stops = stageStops(stage);
  return (
    <View style={styles.body}>
      {stage.units.map((u) => {
        const done = u.lessons.filter((l) => statuses.get(l.id) === "done").length;
        const m = unitMastery(u, facts.mastery);
        const passed = m != null && m >= PRACTICE_PASS;
        return (
          <View key={u.id} style={styles.unit}>
            <View style={styles.unitHead} accessibilityRole="header">
              <Medallion art={u.art} size={56} ring={stage.color} />
              <View style={{ flex: 1 }}>
                <Text style={[ui("bold"), { color: stage.color, fontSize: sized(12), letterSpacing: 1 }]}>
                  {lang === "hi" ? `इकाई ${u.n} · ${done} / ${u.lessons.length}` : `UNIT ${u.n} · ${done} OF ${u.lessons.length}`}
                </Text>
                {u.sa ? <Text style={[sa(sized(20)), { color: T.ink }]}>{u.sa}</Text> : null}
                <Text style={[ui("semibold"), { color: T.ink, fontSize: sized(17) }]}>{u.title[lang]}</Text>
              </View>
            </View>
            {u.lessons.map((l, i) => {
              const stop = stops.find((s) => s.lesson.id === l.id)!;
              const st = statuses.get(l.id) ?? "upcoming";
              return (
                <Pressable
                  key={l.id}
                  onPress={() => onStop(stop)}
                  accessibilityRole="button"
                  accessibilityLabel={`${lang === "hi" ? "पाठ" : "Lesson"} ${i + 1}: ${l.title[lang]}. ${stopMeta(stop, st, lang)}`}
                  style={[styles.row, st === "current" && styles.rowCurrent]}
                >
                  <View style={[styles.mark, st === "done" && { backgroundColor: T.done, borderColor: T.done }, st === "current" && { backgroundColor: T.action, borderColor: T.action }]}>
                    {st === "done" ? <Ionicons name="checkmark" size={18} color={T.white} /> :
                      st === "current" ? <Ionicons name="play" size={18} color={T.white} /> :
                      <Text style={[ui("semibold"), { color: T.ink3, fontSize: sized(15) }]}>{i + 1}</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[ui(st === "current" ? "semibold" : "regular"), { color: T.ink, fontSize: sized(16) }]}>{l.title[lang]}</Text>
                    <Text style={[ui("regular"), { color: st === "done" ? T.doneInk : T.ink2, fontSize: sized(13.5) }]}>{stopMeta(stop, st, lang)}</Text>
                  </View>
                </Pressable>
              );
            })}
            {u.graded.length || u.practiceTool ? (
              <Pressable onPress={() => onPractice(u)} accessibilityRole="button"
                accessibilityLabel={`${lang === "hi" ? "इकाई अभ्यास" : "Unit practice"}. ${practiceMeta(u, m, lang)}`} style={styles.row}>
                <View style={styles.markBox}>
                  <View style={[styles.diamond, passed && { backgroundColor: T.done, borderColor: T.done }]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[ui("semibold"), { color: T.ink, fontSize: sized(16) }]}>{lang === "hi" ? `इकाई ${u.n} अभ्यास` : `Unit ${u.n} practice`}</Text>
                  <Text style={[ui("regular"), { color: passed ? T.doneInk : T.ink2, fontSize: sized(13.5) }]}>{practiceMeta(u, m, lang)}</Text>
                </View>
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40, gap: 24 },
  unit: { gap: 2 },
  unitHead: { flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 10, marginBottom: 4, borderBottomWidth: 1.5, borderBottomColor: T.lineStrong },
  row: { flexDirection: "row", alignItems: "center", gap: 14, minHeight: 60, paddingVertical: 8, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: T.line },
  rowCurrent: { backgroundColor: T.surface, borderWidth: 1.5, borderColor: T.action },
  mark: { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: T.muted, backgroundColor: T.surface },
  markBox: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  diamond: { width: 22, height: 22, borderWidth: 2, borderColor: T.muted, backgroundColor: T.surface, transform: [{ rotate: "45deg" }] },
});
