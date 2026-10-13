// The trail drawn as a map (owner's choice A): a stage is one landscape, its
// units are gates on the road, lessons are square stops alternating left and
// right, unit practice is a diamond. Done road is solid, the road ahead dotted.
// Large text uses TrailList instead — map labels would collide.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";

import type { GuideLang } from "../api/client";
import { useTypeScale } from "../hooks/useTypeScale";
import type { TrailStage, TrailStop, TrailUnit } from "./course";
import { stageStops } from "./course";
import type { StopStatus, TrailFacts } from "./progress";
import { PRACTICE_PASS, unitMastery } from "./progress";
import { practiceMeta, stopMeta } from "./text";
import { T, ui } from "./theme";
import { Medallion } from "./ui";

const GATE_H = 88;
const STEP = 86;
const STOP = 44;
const CURRENT = 58;
const DIAMOND = 34;

const LAND: Record<string, { base: string; meadow: string; water: string; light: string }> = {
  s1: { base: "#F1E8D6", meadow: "#E8DDC2", water: "#E2CFA8", light: "#EFE3C8" },
  s2: { base: "#EFE8D5", meadow: "#E4E5CA", water: "#BCD7CF", light: "#D8EAE3" },
  s3: { base: "#EAEBD7", meadow: "#DCE3C4", water: "#BFD8CB", light: "#DAEBE2" },
  s4: { base: "#EDEAE1", meadow: "#E1E2D3", water: "#C4D3DC", light: "#DDE7EC" },
  s5: { base: "#F1E8E3", meadow: "#E8DDD4", water: "#CBD5DC", light: "#E2E9EE" },
};

type Item =
  | { kind: "gate"; unit: TrailUnit; y: number }
  | { kind: "stop"; stop: TrailStop; x: number; y: number; left: boolean }
  | { kind: "practice"; unit: TrailUnit; x: number; y: number; left: boolean };

interface Props {
  stage: TrailStage;
  statuses: Map<string, StopStatus>;
  facts: TrailFacts;
  width: number;
  lang: GuideLang;
  onStop: (stop: TrailStop) => void;
  onPractice: (unit: TrailUnit) => void;
  onCurrentY?: (y: number) => void;
}

export default function TrailMap({ stage, statuses, facts, width, lang, onStop, onPractice, onCurrentY }: Props) {
  const { sized } = useTypeScale();
  const land = LAND[stage.id] ?? LAND.s2;

  const { items, height, points, currentPoint } = useMemo(() => {
    const out: Item[] = [];
    const pts: { x: number; y: number }[] = [];
    const xl = Math.round(width * 0.26);
    const xr = Math.round(width * 0.74);
    const stops = stageStops(stage);
    let y = 28;
    let current = -1;
    for (const unit of stage.units) {
      out.push({ kind: "gate", unit, y });
      pts.push({ x: width / 2, y: y + GATE_H / 2 });
      y += GATE_H + 52;
      let left = true;
      for (const l of unit.lessons) {
        const stop = stops.find((s) => s.lesson.id === l.id)!;
        out.push({ kind: "stop", stop, x: left ? xl : xr, y, left });
        if (statuses.get(l.id) === "current") current = pts.length;
        pts.push({ x: left ? xl : xr, y });
        y += STEP;
        left = !left;
      }
      if (unit.graded.length || unit.practiceTool) {
        out.push({ kind: "practice", unit, x: left ? xl : xr, y, left });
        pts.push({ x: left ? xl : xr, y });
        y += STEP;
      }
      y += 18;
    }
    return { items: out, height: y + 24, points: pts, currentPoint: current };
  }, [stage, statuses, width]);

  const road = (from: number, to: number) => {
    if (to <= from) return "";
    let d = `M${points[from].x},${points[from].y}`;
    for (let i = from + 1; i <= to; i++) {
      const p = points[i - 1];
      const q = points[i];
      const my = (p.y + q.y) / 2;
      d += ` C${p.x},${my} ${q.x},${my} ${q.x},${q.y}`;
    }
    return d;
  };
  const last = points.length - 1;
  const doneTo = currentPoint < 0 ? last : currentPoint;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Rect x={0} y={0} width={width} height={height} fill={land.base} />
        {items.map((it, i) => {
          if (it.kind === "gate") {
            const gy = it.y + GATE_H / 2;
            return (
              <G key={`w${i}`}>
                <Path
                  d={`M-10,${gy - 34} C${width * 0.3},${gy - 60} ${width * 0.6},${gy - 4} ${width + 10},${gy - 30} L${width + 10},${gy + 26} C${width * 0.6},${gy + 52} ${width * 0.3},${gy - 2} -10,${gy + 22} Z`}
                  fill={land.water}
                />
                <Path d={`M-10,${gy - 6} C${width * 0.3},${gy - 30} ${width * 0.6},${gy + 24} ${width + 10},${gy - 2}`} stroke={land.light} strokeWidth={3} fill="none" />
              </G>
            );
          }
          const outerX = it.left ? width * 0.08 : width * 0.92;
          const meadowX = it.left ? width * 0.86 : width * 0.14;
          const big = i % 3 === 0;
          return (
            <G key={`t${i}`}>
              <Ellipse cx={meadowX} cy={it.y + 10} rx={width * 0.2} ry={26} fill={land.meadow} />
              <Rect x={outerX - 2} y={it.y - 2} width={4} height={13} fill="#8B6B4A" />
              <Circle cx={outerX} cy={it.y - 6} r={big ? 12 : 10} fill="#8FB17E" />
              <Circle cx={outerX + (it.left ? -5 : 5)} cy={it.y - 12} r={7} fill="#A3C18F" />
            </G>
          );
        })}
        <Path d={road(0, last)} stroke="#FBF6EA" strokeWidth={14} strokeLinecap="round" fill="none" opacity={0.9} />
        {doneTo > 0 ? <Path d={road(0, doneTo)} stroke="#A8743F" strokeWidth={4} strokeLinecap="round" fill="none" /> : null}
        {doneTo < last ? <Path d={road(doneTo, last)} stroke="#9C8668" strokeWidth={4.5} strokeLinecap="round" strokeDasharray="0.1 11" fill="none" /> : null}
      </Svg>

      {items.map((it) => {
        if (it.kind === "gate") {
          const u = it.unit;
          const done = u.lessons.filter((l) => statuses.get(l.id) === "done").length;
          const w = Math.min(330, width - 40);
          return (
            <View key={u.id} style={[styles.gate, { top: it.y, left: (width - w) / 2, width: w, height: GATE_H }]} accessibilityRole="header"
              accessibilityLabel={`${lang === "hi" ? "इकाई" : "Unit"} ${u.n}: ${u.title[lang]}. ${done} / ${u.lessons.length}`}>
              <Medallion art={u.art} size={58} ring={stage.color} />
              <View style={{ flex: 1 }}>
                <Text style={[ui("bold"), styles.gateOver, { color: stage.color, fontSize: sized(11.5) }]}>
                  {lang === "hi" ? `इकाई ${u.n} · ${done} / ${u.lessons.length}` : `UNIT ${u.n} · ${done} OF ${u.lessons.length} DONE`}
                </Text>
                {u.sa ? <Text style={[styles.gateSa, { fontSize: sized(20) }]} numberOfLines={1}>{u.sa}</Text> : null}
                <Text style={[ui("semibold"), { color: T.ink, fontSize: sized(15.5) }]} numberOfLines={1}>{u.title[lang]}</Text>
              </View>
            </View>
          );
        }
        if (it.kind === "practice") {
          const m = unitMastery(it.unit, facts.mastery);
          const passed = m != null && m >= PRACTICE_PASS;
          const labelPos = it.left ? { left: it.x + DIAMOND * 0.72 + 10 } : { right: width - (it.x - DIAMOND * 0.72 - 10) };
          return (
            <React.Fragment key={`p-${it.unit.id}`}>
              <Pressable onPress={() => onPractice(it.unit)} accessibilityRole="button"
                accessibilityLabel={`${lang === "hi" ? "इकाई अभ्यास" : "Unit practice"}. ${practiceMeta(it.unit, m, lang)}`}
                style={[styles.diamondHit, { left: it.x - 26, top: it.y - 26 }]} hitSlop={6}>
                <View style={[styles.diamond, passed ? { backgroundColor: T.done, borderColor: T.surface, borderWidth: 3 } : { borderColor: m ? stage.color : T.muted }]}>
                  <View style={{ transform: [{ rotate: "-45deg" }] }}>
                    <Ionicons name={passed ? "checkmark" : "flag-outline"} size={17} color={passed ? T.white : m ? stage.color : T.ink3} />
                  </View>
                </View>
              </Pressable>
              <Pressable onPress={() => onPractice(it.unit)} style={[styles.plate, labelPos, { top: it.y - 23, maxWidth: width * 0.6 }, !it.left && { alignItems: "flex-end" }]} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
                <Text style={[ui("semibold"), { color: T.ink, fontSize: sized(14.5) }]} numberOfLines={1}>{lang === "hi" ? `इकाई ${it.unit.n} अभ्यास` : `Unit ${it.unit.n} practice`}</Text>
                <Text style={[ui("regular"), { color: passed ? T.doneInk : T.ink2, fontSize: sized(12.5) }]} numberOfLines={1}>{practiceMeta(it.unit, m, lang)}</Text>
              </Pressable>
            </React.Fragment>
          );
        }
        const { stop } = it;
        const st = statuses.get(stop.lesson.id) ?? "upcoming";
        const size = st === "current" ? CURRENT : STOP;
        const n = stop.unit.lessons.indexOf(stop.lesson) + 1;
        const labelPos = it.left ? { left: it.x + size / 2 + 10 } : { right: width - (it.x - size / 2 - 10) };
        const a11y = `${lang === "hi" ? "पाठ" : "Lesson"} ${n}: ${stop.lesson.title[lang]}. ${stopMeta(stop, st, lang)}`;
        return (
          <React.Fragment key={stop.lesson.id}>
            <Pressable
              onPress={() => onStop(stop)}
              onLayout={st === "current" && onCurrentY ? () => onCurrentY(it.y) : undefined}
              accessibilityRole="button"
              accessibilityLabel={a11y}
              style={[
                styles.stop,
                { left: it.x - size / 2, top: it.y - size / 2, width: size, height: size },
                st === "done" && { backgroundColor: T.done, borderColor: T.surface, borderWidth: 3 },
                st === "current" && styles.current,
              ]}
            >
              {st === "done" ? <Ionicons name="checkmark" size={21} color={T.white} /> :
                st === "current" ? <Ionicons name="play" size={24} color={T.white} /> :
                <Text style={[ui("semibold"), { color: T.ink3, fontSize: 17 }]}>{n}</Text>}
            </Pressable>
            <Pressable
              onPress={() => onStop(stop)}
              importantForAccessibility="no-hide-descendants"
              accessibilityElementsHidden
              style={[
                styles.plate, labelPos,
                { top: it.y - (st === "current" ? 30 : 23), maxWidth: st === "current" ? (it.left ? width - it.x - size / 2 - 22 : it.x - size / 2 - 22) : width * 0.62 },
                !it.left && { alignItems: "flex-end" },
                st === "current" && styles.currentPlate,
              ]}
            >
              <View style={{ flexShrink: 1, alignItems: it.left ? "flex-start" : "flex-end" }}>
                <Text style={[ui("semibold"), { color: T.ink, fontSize: sized(14.5) }]} numberOfLines={2}>{stop.lesson.title[lang]}</Text>
                <Text style={[ui("regular"), { color: st === "done" ? T.doneInk : T.ink2, fontSize: sized(12.5) }]} numberOfLines={1}>{stopMeta(stop, st, lang)}</Text>
              </View>
              {st === "current" ? (
                <View style={styles.startChip}>
                  <Text style={[ui("bold"), { color: T.white, fontSize: sized(13) }]}>{lang === "hi" ? "शुरू" : "Start"}</Text>
                </View>
              ) : null}
            </Pressable>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  gate: { position: "absolute", flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, backgroundColor: T.surface, borderWidth: 1, borderColor: T.line },
  gateOver: { letterSpacing: 1 },
  gateSa: { fontFamily: "TiroDevanagariSanskrit_400Regular", color: T.ink, lineHeight: 32 },
  stop: { position: "absolute", alignItems: "center", justifyContent: "center", backgroundColor: T.surface, borderWidth: 2, borderColor: T.muted },
  current: { backgroundColor: T.action, borderColor: "rgba(166,61,23,0.22)", borderWidth: 5 },
  plate: { position: "absolute", paddingHorizontal: 10, paddingVertical: 5, backgroundColor: "rgba(255,252,246,0.95)", borderWidth: 1, borderColor: T.line },
  currentPlate: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderWidth: 1.5, borderColor: T.action, backgroundColor: T.surface },
  startChip: { height: 32, paddingHorizontal: 12, alignItems: "center", justifyContent: "center", backgroundColor: T.action },
  diamondHit: { position: "absolute", width: 52, height: 52, alignItems: "center", justifyContent: "center" },
  diamond: { width: DIAMOND, height: DIAMOND, alignItems: "center", justifyContent: "center", backgroundColor: T.surface, borderWidth: 2, transform: [{ rotate: "45deg" }] },
});
