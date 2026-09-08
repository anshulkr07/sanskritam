// Path — the winding journey through Sanskritam's eleven units (U15-3).
//
// P23 made the spine data: GET /units returns eleven ranked units, each with
// its lessons and per-unit progress. Path renders units, each expanding to
// its lessons. A lesson routes Learn first (the step player), then Practice.
//
// Locked nodes stop being tappable — they were opacity 0.5 and still
// pressable. A locked lesson is disabled, announced as locked, and never
// fires navigation.
//
// Resilience (U10-3): a failed fetch shows a retryable error state, and falls
// back to the approved-content spine so the screen stays usable offline.
//
// Data (Track C4): units load through useQuery — cached 60s, deduped
// in-flight, refetched on focus (progress changes behind other tabs), never
// setState after unmount. The unit list is a FlatList (lesson counts only
// grow); lessons inside an expanded unit stay a small nested map.

import React, { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@react-native-vector-icons/ionicons";

import { api, type LessonSummary, type Unit } from "../api/client";
import { useQuery } from "../hooks/useQuery";
import { useTypeScale } from "../hooks/useTypeScale";
import { color, font, radius, script, shadow, space } from "../theme";
import { Button } from "../components/ui";
import { Skeleton } from "../components/Skeleton";
import type { TabScreenProps } from "../navigation/types";

export default function PathScreen({ navigation }: TabScreenProps<"Path">) {
  const { sized } = useTypeScale();
  const { data: units, loading, failed, retry } = useQuery<Unit[]>("units", api.units, {
    refetchOnFocus: true,
  });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selected, setSelected] = useState<LessonSummary | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const list = units ?? [];
  React.useEffect(() => {
    if (list.length > 0) setExpanded((prev) => prev ?? list[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units]);

  const unitUnlocked = useCallback(
    (idx: number) => {
      if (idx === 0) return true;
      if (!units) return false;
      // A unit opens once the previous one has any progress — forward motion
      // without a hard gate that strands a learner.
      return (units[idx - 1]?.progress ?? 0) > 0;
    },
    [units],
  );

  const onLessonTap = useCallback((lesson: LessonSummary) => {
    setSelected(lesson);
    setSheetOpen(true);
  }, []);

  const onLearn = useCallback(() => {
    if (!selected) return;
    setSheetOpen(false);
    navigation.navigate("Lesson", { featureId: selected.feature_id, lessonId: selected.id });
  }, [selected, navigation]);

  const onPractice = useCallback(() => {
    if (!selected) return;
    setSheetOpen(false);
    navigation.navigate("Challenge", { features: selected.features?.length ? selected.features : [selected.feature_id] });
  }, [selected, navigation]);

  const renderUnit = useCallback(
    ({ item: unit, index: ui }: { item: Unit; index: number }) => {
      const unlocked = unitUnlocked(ui);
      const open = expanded === unit.id;
      const pct = Math.round((unit.progress ?? 0) * 100);
      return (
        <View style={styles.unit}>
          <Pressable
            onPress={() => setExpanded(open ? null : unit.id)}
            disabled={!unlocked}
            style={[styles.unitHeader, !unlocked && styles.locked]}
            accessibilityRole="button"
            accessibilityState={{ expanded: open, disabled: !unlocked }}
            accessibilityLabel={`Unit ${unit.rank}: ${unit.title_en}. ${pct} percent mastered. ${unlocked ? (open ? "Expanded" : "Collapsed") : "Locked"}`}
          >
            <View style={styles.unitIndex}>
              {unlocked ? (
                <Text style={styles.unitNum}>{unit.rank}</Text>
              ) : (
                <Ionicons name="lock-closed" size={16} color={color.inkFaint} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.unitSa, script("bold")]}>{unit.title_hi}</Text>
              <Text style={styles.unitEn}>{unit.title_en} · {unit.lessons.length} lessons</Text>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${pct}%` }]} />
              </View>
            </View>
            <Ionicons
              name={open ? "chevron-down" : "chevron-forward"}
              size={18}
              color={unlocked ? color.saffron : color.inkFaint}
            />
          </Pressable>
          {open &&
            unlocked &&
            unit.lessons.map((lesson) => (
              <Pressable
                key={lesson.id}
                onPress={() => onLessonTap(lesson)}
                style={styles.lessonRow}
                accessibilityRole="button"
                accessibilityLabel={`${lesson.title_hi} — ${lesson.title_en}. ${lesson.step_count} steps`}
              >
                <Ionicons name="book-outline" size={18} color={color.saffron} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.lessonSa, script("semibold")]}>{lesson.title_hi}</Text>
                  <Text style={styles.lessonEn}>{lesson.title_en}</Text>
                </View>
                <Text style={styles.lessonSteps}>{lesson.step_count} steps</Text>
              </Pressable>
            ))}
          {open && !unlocked && (
            <Text style={styles.lockNote}>Finish the previous unit to open this one.</Text>
          )}
        </View>
      );
    },
    [expanded, onLessonTap, unitUnlocked],
  );

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      {loading && !units ? (
        <View style={styles.body} accessible accessibilityRole="progressbar" accessibilityLabel="Loading your path">
          <Text style={[styles.title, { fontSize: sized(font.sizes.xl) }]}>Your Path</Text>
          <Text style={[styles.subtitle, { fontSize: sized(font.sizes.sm) }]}>Eleven units, from the mouth-map to the sentence.</Text>
          <Skeleton style={{ height: 72, marginTop: space.sm }} />
          <Skeleton style={{ height: 72, marginTop: space.sm }} />
          <Skeleton style={{ height: 72, marginTop: space.sm }} />
        </View>
      ) : failed && !units ? (
        <View style={styles.body}>
          <Text style={[styles.title, { fontSize: sized(font.sizes.xl) }]}>Your Path</Text>
          <View style={[styles.errorCard, shadow.card]}>
            <Text style={[styles.errorTitle, { fontSize: sized(font.sizes.base) }]}>Couldn't load the path.</Text>
            <Text style={[styles.errorSub, { fontSize: sized(font.sizes.sm) }]}>
              Check your connection — your progress is safe.
            </Text>
            <Button label="Retry" onPress={retry} style={{ marginTop: space.md }} />
          </View>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(u) => u.id}
          renderItem={renderUnit}
          contentContainerStyle={styles.body}
          initialNumToRender={11}
          ListHeaderComponent={            <View>
              <Text style={[styles.title, { fontSize: sized(font.sizes.xl) }]}>Your Path</Text>
              <Text style={[styles.subtitle, { fontSize: sized(font.sizes.sm) }]}>Eleven units, from the mouth-map to the sentence.</Text>
            </View>
          }
          accessibilityLabel="Learning path units"
        />
      )}

      {/* Lesson detail sheet */}
      {sheetOpen && selected && (
        <View style={styles.sheetOverlay}>
          <Pressable
            style={styles.sheetBackdrop}
            onPress={() => setSheetOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Close details"
          />
          <View style={styles.sheet}>
            <Text style={[styles.sheetTitle, script("bold"), { fontSize: sized(font.sizes.lg, { sanskrit: true }) }]}>{selected.title_hi}</Text>
            <Text style={[styles.sheetSub, { fontSize: sized(font.sizes.sm) }]}>{selected.title_en}</Text>
            <Text style={styles.sheetMeta}>{selected.step_count} steps · graded as you go</Text>
            <Button label="Learn" onPress={onLearn} block style={{ marginTop: space.md }} />
            <Button label="Practice" onPress={onPractice} block style={{ marginTop: space.sm }} />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  body: { padding: space.lg, paddingBottom: space.xxl * 2 },
  title: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.xl,
    color: color.ink,
  },
  subtitle: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
    marginBottom: space.lg,
    lineHeight: 20,
  },
  statusText: {
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
    marginTop: space.md,
  },
  errorCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    marginBottom: space.lg,
  },
  errorTitle: {
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    fontSize: font.sizes.base,
    color: color.ink,
  },
  errorSub: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
    marginTop: 4,
  },
  unit: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    marginBottom: space.md,
    overflow: "hidden",
    ...shadow.card,
  },
  unitHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.md,
    minHeight: 64,
  },
  locked: { opacity: 0.55 },
  unitIndex: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: color.saffronLight,
    alignItems: "center",
    justifyContent: "center",
  },
  unitNum: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.base,
    color: color.saffronDeep,
  },
  unitSa: { fontSize: font.sizes.lg, color: color.ink },
  unitEn: {
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
    marginTop: 2,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: color.border,
    overflow: "hidden",
    marginTop: space.xs,
  },
  fill: { height: 6, borderRadius: 3, backgroundColor: color.saffron },
  lessonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderTopWidth: 1,
    borderTopColor: color.border,
    minHeight: 56,
  },
  lessonSa: { fontSize: font.sizes.base, color: color.ink },
  lessonEn: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
  },
  lessonSteps: {
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    fontSize: font.sizes.xs,
    color: color.inkSoft,
  },
  lockNote: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    fontSize: font.sizes.sm,
    color: color.inkFaint,
    padding: space.md,
    paddingTop: 0,
  },
  sheetOverlay: {
    position: "absolute",
    inset: 0,
    justifyContent: "flex-end",
    zIndex: 100,
  },
  sheetBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)" },
  sheet: {
    backgroundColor: color.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: space.lg,
    ...shadow.card,
  },
  sheetTitle: { fontSize: font.sizes.lg, color: color.ink },
  sheetSub: {
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
    marginTop: 2,
  },
  sheetMeta: {
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
    fontSize: font.sizes.xs,
    color: color.inkFaint,
    marginTop: space.xs,
  },
});
