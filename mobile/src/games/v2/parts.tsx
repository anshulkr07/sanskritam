// Shared Play v2 parts: setup sheet, mode/results surfaces.
// One design language for all seven games: deep fill cards, cream text,
// one primary action, ranked rules shown before a ranked round starts.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { color, fill, font, onFill, radius, script, shadow, space } from "../../theme";
import { haptics } from "../../services/haptics";
import type { CatalogGame, FinishResult } from "./client";

// ── Setup sheet ──────────────────────────────────────────────────────────────

export interface SetupChoice {
  mode: "ranked" | "practice";
  difficulty: Record<string, unknown>;
  difficultyLabel: string;
  answerLang?: string;
  localSeats?: number;
}

export function SetupSheet({
  game,
  remembered,
  onStart,
  busy,
}: {
  game: CatalogGame;
  remembered: Record<string, unknown>;
  onStart: (choice: SetupChoice) => void;
  busy?: boolean;
}) {
  const [mode, setMode] = useState<"ranked" | "practice">("practice");
  const diffs = game.casual_difficulties.length
    ? game.casual_difficulties
    : [{ label: "Standard" }];
  const [di, setDi] = useState(() => {
    const want = remembered && Object.keys(remembered).length
      ? JSON.stringify(remembered)
      : null;
    const idx = want ? diffs.findIndex((d) => JSON.stringify(d) === want) : -1;
    return idx >= 0 ? idx : Math.min(1, diffs.length - 1);
  });
  const ranked = game.ranked;

  return (
    <ScrollView contentContainerStyle={s.setup} showsVerticalScrollIndicator={false}>
      <Text style={s.title}>{game.title}</Text>
      <Text style={[s.sa, script("bold")]}>{game.sa}</Text>
      <Text style={s.sub}>{game.subtitle}</Text>

      <View style={s.modeRow}>
        <ModeChip label="Casual" on={!ranked || mode === "practice"} disabled={!ranked}
          onPress={() => setMode("practice")} />
        <ModeChip label="Ranked" on={ranked && mode === "ranked"} disabled={!ranked}
          onPress={() => setMode("ranked")} />
      </View>
      {!ranked && (
        <Text style={s.note}>Ranked play opens once the content review is complete.</Text>
      )}

      {mode === "ranked" && ranked ? (
        <View style={s.rulesCard}>
          <Text style={s.rulesHead}>Ranked rules</Text>
          <Text style={s.rulesBody}>{game.rules_text}</Text>
          <Text style={s.rulesFine}>
            Three ranked rounds a day in this game · your best counts · Asia/Kolkata day.
          </Text>
        </View>
      ) : (
        <View style={s.diffRow}>
          {diffs.map((d, i) => (
            <ModeChip key={d.label} label={d.label} on={di === i}
              onPress={() => setDi(i)} />
          ))}
        </View>
      )}

      <Pressable
        onPress={() => {
          haptics.tap();
          onStart({
            mode: mode === "ranked" && ranked ? "ranked" : "practice",
            difficulty: mode === "ranked" && ranked ? {} : (diffs[di] as Record<string, unknown>),
            difficultyLabel: diffs[di].label,
          });
        }}
        accessibilityRole="button"
        accessibilityLabel={`Play ${game.title}${mode === "ranked" ? ", ranked" : ""}`}
        disabled={busy}
        style={({ pressed }) => [s.primary, busy && { opacity: 0.6 }, pressed && { opacity: 0.9 }]}
      >
        <Ionicons name="play" size={18} color={onFill.text} />
        <Text style={s.primaryText}>
          {mode === "ranked" && ranked ? "Play ranked round" : "Play"}
        </Text>
      </Pressable>
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

function ModeChip({ label, on, onPress, disabled }: {
  label: string; on: boolean; onPress: () => void; disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={() => { if (!disabled) { haptics.tap(); onPress(); } }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: on, disabled }}
      style={[s.chip, on && s.chipOn, disabled && { opacity: 0.4 }]}
    >
      <Text style={[s.chipText, on && s.chipTextOn]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

// ── Result sheet v2 ──────────────────────────────────────────────────────────

export function ResultSheetV2({
  result,
  onAgain,
  onDone,
  onShare,
  againLabel = "Play again",
}: {
  result: FinishResult;
  onAgain: () => void;
  onDone: () => void;
  onShare?: () => void;
  againLabel?: string;
}) {
  const ranked = result.ranked;
  return (
    <View style={s.resultWrap}>
      <View style={[s.resultBadge, { backgroundColor: ranked ? fill.teal : fill.slate }]}>
        <Text style={s.resultBadgeText}>{ranked ? "Ranked round" : "Practice"}</Text>
      </View>
      <Text style={s.resultScore}>{result.score}</Text>
      {!ranked && (
        <Text style={s.resultNote}>{result.eligibility_reason || "Casual round — it did not change rank."}</Text>
      )}
      {ranked && (
        <Text style={s.resultNote}>
          Today's total {result.daily_total} · best here {result.best_today}
          {result.attempts_left > 0 ? ` · ${result.attempts_left} ranked left` : " · last ranked round today"}
        </Text>
      )}
      {!!result.breakdown && Object.keys(result.breakdown).length > 0 && (
        <View style={s.breakdown}>
          {Object.entries(result.breakdown).map(([k, v]) => (
            <View key={k} style={s.breakRow}>
              <Text style={s.breakKey}>{humanKey(k)}</Text>
              <Text style={s.breakVal}>{Array.isArray(v) ? v.length + " entries" : String(v)}</Text>
            </View>
          ))}
        </View>
      )}
      <View style={s.resultRow}>
        <Pressable onPress={() => { haptics.tap(); onAgain(); }} accessibilityRole="button"
          accessibilityLabel={againLabel} style={s.primarySmall}>
          <Text style={s.primarySmallText}>{againLabel}</Text>
        </Pressable>
        {!!onShare && (
          <Pressable onPress={() => { haptics.tap(); onShare(); }} accessibilityRole="button"
            accessibilityLabel="Share" style={s.secondarySmall}>
            <Ionicons name="share-outline" size={18} color={color.ink} />
          </Pressable>
        )}
        <Pressable onPress={() => { haptics.tap(); onDone(); }} accessibilityRole="button"
          accessibilityLabel="Done" style={s.secondarySmall}>
          <Text style={s.secondarySmallText}>Done</Text>
        </Pressable>
      </View>
    </View>
  );
}

function humanKey(k: string): string {
  return k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Small shared bits ────────────────────────────────────────────────────────

export function GameTopBar({ title, sa, onClose, right }: {
  title: string; sa?: string; onClose: () => void; right?: React.ReactNode;
}) {
  return (
    <View style={s.topBar}>
      <Pressable onPress={() => { haptics.tap(); onClose(); }} accessibilityRole="button"
        accessibilityLabel={`Close ${title}`} style={s.close}>
        <Ionicons name="close" size={24} color={color.ink} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={s.topTitle} numberOfLines={1}>{title}</Text>
        {!!sa && <Text style={[s.topSa, script("regular")]} numberOfLines={1}>{sa}</Text>}
      </View>
      {right}
    </View>
  );
}

export function CountBadge({ n, of, label }: { n: number; of: number; label: string }) {
  return (
    <View style={s.countBadge} accessible accessibilityLabel={`${label}: ${n} of ${of}`}>
      <Text style={s.countText}>{n}/{of}</Text>
      <Text style={s.countLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  setup: { flexGrow: 1, alignItems: "center", justifyContent: "center", gap: space.md, padding: space.xl },
  title: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 30, color: color.ink },
  sa: { fontSize: 20, color: color.saffronText, lineHeight: 30 },
  sub: { fontSize: font.sizes.base, color: color.inkSoft, marginTop: -space.sm },
  modeRow: { flexDirection: "row", gap: space.sm, marginTop: space.sm },
  diffRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space.sm, maxWidth: 420 },
  chip: {
    borderWidth: 1.5, borderColor: color.ink, borderRadius: radius.pill,
    paddingHorizontal: space.md, minHeight: 44, justifyContent: "center", backgroundColor: color.surface,
  },
  chipOn: { backgroundColor: fill.ink, borderColor: fill.ink },
  chipText: { color: color.ink, fontWeight: "700" },
  chipTextOn: { color: onFill.text },
  note: { fontSize: font.sizes.sm, color: color.inkSoft, textAlign: "center", maxWidth: 280 },
  rulesCard: {
    backgroundColor: color.surface, borderRadius: radius.lg, padding: space.md,
    gap: 6, ...shadow.card, maxWidth: 340,
  },
  rulesHead: { fontWeight: "800", color: color.ink, fontSize: font.sizes.sm, textTransform: "uppercase" },
  rulesBody: { fontSize: font.sizes.base, color: color.ink, lineHeight: 24 },
  rulesFine: { fontSize: font.sizes.xs, color: color.inkSoft },
  primary: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: color.saffronBtn, borderRadius: radius.md, minHeight: 52,
    paddingHorizontal: space.xl, justifyContent: "center", marginTop: space.sm,
  },
  primaryText: { color: "#fff", fontWeight: "800", fontSize: 17 },
  resultWrap: {
    backgroundColor: fill.ink, borderRadius: radius.lg, padding: space.lg,
    gap: 8, alignItems: "center", alignSelf: "stretch",
  },
  resultBadge: { borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 4 },
  resultBadgeText: { color: onFill.text, fontWeight: "800", fontSize: font.sizes.xs, textTransform: "uppercase" },
  resultScore: { color: onFill.text, fontWeight: "800", fontSize: 48, lineHeight: 60 },
  resultNote: { color: onFill.soft, fontSize: font.sizes.sm, textAlign: "center" },
  breakdown: { alignSelf: "stretch", gap: 4, marginTop: 4 },
  breakRow: { flexDirection: "row", justifyContent: "space-between" },
  breakKey: { color: onFill.soft, fontSize: font.sizes.sm },
  breakVal: { color: onFill.text, fontWeight: "700", fontSize: font.sizes.sm },
  resultRow: { flexDirection: "row", gap: space.sm, marginTop: space.sm, alignItems: "center" },
  primarySmall: {
    backgroundColor: color.saffronBtn, borderRadius: radius.md, minHeight: 48,
    paddingHorizontal: space.lg, justifyContent: "center",
  },
  primarySmallText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  secondarySmall: {
    borderWidth: 1.5, borderColor: onFill.text, borderRadius: radius.md, minHeight: 48,
    paddingHorizontal: space.lg, justifyContent: "center", alignItems: "center",
  },
  secondarySmallText: { color: onFill.text, fontWeight: "700", fontSize: 16 },
  topBar: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 52 },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  topTitle: { fontWeight: "800", fontSize: font.sizes.lg, color: color.ink },
  topSa: { fontSize: font.sizes.xs, color: color.inkSoft },
  countBadge: { alignItems: "flex-end", marginRight: space.sm },
  countText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.lg, color: color.ink },
  countLabel: { fontSize: font.sizes.xs, color: color.inkSoft },
});
