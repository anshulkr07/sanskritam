// LearnV2 map — the Learn tab's course map (additive; Path/Grammar untouched).
//
// Units → lessons with outcomes, prereqs, sizes and read-through state.
// Reading a card writes the device-local bookmark only; practice writes
// nothing. A "Sources & credits" sheet gives per-lesson provenance plus the
// registry note (Licences in the drawer holds full credits).

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useCallback, useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useGuideLang } from "../hooks/useGuide";
import { useTypeScale } from "../hooks/useTypeScale";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { haptics } from "../services/haptics";
import { color, font, radius, script, shadow, space } from "../theme";
import { LEARNV2_LESSONS, LEARNV2_UNITS } from "../learnv2/catalogue";
import {
  getLearnV2LastLesson,
  loadLearnV2DoneMap,
  setLearnV2LastLesson,
} from "../learnv2/progress";
import { LEARNV2_REGISTRY_NOTE, LEARNV2_SOURCES } from "../learnv2/sources";

export default function LearnV2MapScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "LearnCards">) {
  const { lang, setLang } = useGuideLang();
  const { sized } = useTypeScale();
  const [doneMap, setDoneMap] = useState<Record<string, boolean>>({});
  const [lastLesson, setLast] = useState<string | null>(null);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  const refresh = useCallback(() => {
    loadLearnV2DoneMap(LEARNV2_LESSONS.map((l) => l.id)).then(setDoneMap);
    getLearnV2LastLesson().then(setLast);
  }, []);

  useEffect(() => {
    refresh();
    const unsub = navigation.addListener("focus", refresh);
    return unsub;
  }, [navigation, refresh]);

  const openLesson = (lessonId: string) => {
    haptics.tap();
    setLearnV2LastLesson(lessonId);
    setLast(lessonId);
    (navigation as unknown as { navigate: (r: string, p: object) => void }).navigate("LearnV2Lesson", {
      lessonId,
    });
  };

  const resume = lastLesson ? LEARNV2_LESSONS.find((l) => l.id === lastLesson) : undefined;

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.kicker, { fontSize: sized(font.sizes.xs) }]}>
              {lang === "hi" ? "सीखें" : "LEARN"}
            </Text>
            <Text style={[styles.title, { fontSize: sized(font.sizes.xl) }]} accessibilityRole="header">
              {lang === "hi" ? "संस्कृत सीखें" : "Learn Sanskrit"}
            </Text>
            <Text style={[styles.sub, { fontSize: sized(font.sizes.sm) }]}>
              {lang === "hi"
                ? "छोटे कार्ड, जुड़े पाठ। पढ़ना mastery नहीं है; अभ्यास स्थानीय है।"
                : "Small cards, connected lessons. Reading is not mastery; practice stays on this device."}
            </Text>
          </View>
          <Pressable
            onPress={() => setLang(lang === "hi" ? "en" : "hi")}
            style={styles.langBtn}
            accessibilityRole="button"
            accessibilityLabel={lang === "hi" ? "Switch to English" : "हिन्दी में देखें"}
          >
            <Text style={styles.langText}>{lang === "hi" ? "EN" : "हिं"}</Text>
          </Pressable>
        </View>

        {resume && (
          <Pressable
            onPress={() => openLesson(resume.id)}
            style={styles.resume}
            accessibilityRole="button"
            accessibilityLabel={`${lang === "hi" ? "फिर से शुरू करें" : "Resume"}: ${
              lang === "hi" ? resume.title.hi : resume.title.en
            }`}
          >
            <Ionicons name="play-circle" size={26} color={color.saffron} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.resumeEyebrow, { fontSize: sized(font.sizes.xs) }]}>
                {lang === "hi" ? "फिर से शुरू करें" : "RESUME"}
              </Text>
              <Text style={[styles.resumeTitle, lang === "hi" && script("bold"), { fontSize: sized(font.sizes.md) }]} numberOfLines={2}>
                {lang === "hi" ? resume.title.hi : resume.title.en}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={color.inkFaint} />
          </Pressable>
        )}

        {LEARNV2_UNITS.map((unit) => (
          <View key={unit.id} style={styles.unit}>
            <Text style={[styles.unitEyebrow, { fontSize: sized(font.sizes.xs) }]}>
              {lang === "hi" ? unit.title.hi : unit.title.en}
            </Text>
            <Text style={[styles.unitSa, script("bold"), { fontSize: sized(20, { sanskrit: true }) }]}>{unit.titleSa}</Text>
            {unit.lessonIds.map((lid, n) => {
              const lesson = LEARNV2_LESSONS.find((l) => l.id === lid);
              if (!lesson) return null;
              const done = !!doneMap[lid];
              const locked = lesson.prereqIds.some((p) => !doneMap[p]);
              return (
                <Pressable
                  key={lid}
                  onPress={() => {
                    if (!locked) openLesson(lid);
                    else haptics.tap();
                  }}
                  style={[styles.lesson, locked && styles.lessonLocked]}
                  accessibilityRole="button"
                  accessibilityLabel={`${n + 1}. ${lang === "hi" ? lesson.title.hi : lesson.title.en}. ${
                    lesson.cards.length
                  } cards${done ? (lang === "hi" ? ". पढ़ा हुआ" : ". Read") : ""}${
                    locked ? (lang === "hi" ? ". पहले पिछला पाठ" : ". Finish the previous lesson first") : ""
                  }`}
                  accessibilityState={{ disabled: locked }}
                >
                  <View style={styles.lessonNum}>
                    {done ? (
                      <Ionicons name="checkmark-circle" size={24} color={color.okText} />
                    ) : locked ? (
                      <Ionicons name="lock-closed" size={20} color={color.inkFaint} />
                    ) : (
                      <Text style={styles.lessonNumText}>{n + 1}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.lessonSa, { fontSize: sized(18, { sanskrit: true }) }]} numberOfLines={1}>
                      {lesson.titleSa}
                    </Text>
                    <Text style={[styles.lessonTitle, { fontSize: sized(font.sizes.base) }]} numberOfLines={2}>
                      {lang === "hi" ? lesson.title.hi : lesson.title.en}
                    </Text>
                    <Text style={[styles.lessonMeta, { fontSize: sized(font.sizes.xs) }]}>
                      {lesson.cards.length} {lang === "hi" ? "कार्ड" : lesson.cards.length === 1 ? "card" : "cards"} ·{" "}
                      {lesson.minutes} {lang === "hi" ? "मिनट" : "min"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={locked ? color.inkFaint : color.saffron} />
                </Pressable>
              );
            })}
          </View>
        ))}

        <Pressable
          onPress={() => {
            haptics.tap();
            setSourcesOpen(true);
          }}
          style={styles.sourcesBtn}
          accessibilityRole="button"
          accessibilityLabel={lang === "hi" ? "स्रोत और श्रेय" : "Sources and credits"}
        >
          <Ionicons name="document-text-outline" size={20} color={color.saffron} />
          <Text style={[styles.sourcesText, { fontSize: sized(font.sizes.base) }]}>
            {lang === "hi" ? "स्रोत और श्रेय" : "Sources & credits"}
          </Text>
        </Pressable>
        <Text style={[styles.note, { fontSize: sized(font.sizes.xs) }]}>
          {lang === "hi" ? LEARNV2_REGISTRY_NOTE.hi : LEARNV2_REGISTRY_NOTE.en}
        </Text>
      </ScrollView>

      <Modal visible={sourcesOpen} animationType="slide" onRequestClose={() => setSourcesOpen(false)}>
        <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
          <View style={styles.sheetHead}>
            <Text style={[styles.sheetTitle, { fontSize: sized(font.sizes.lg) }]} accessibilityRole="header">
              {lang === "hi" ? "स्रोत और श्रेय" : "Sources & credits"}
            </Text>
            <Pressable
              onPress={() => setSourcesOpen(false)}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel={lang === "hi" ? "बंद करें" : "Close"}
            >
              <Ionicons name="close" size={22} color={color.ink} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.sheetBody}>
            {LEARNV2_SOURCES.map((s) => (
              <View
                key={s.lessonId}
                style={styles.sourceCard}
                accessible
                accessibilityLabel={`${lang === "hi" ? s.title.hi : s.title.en}. ${s.sourceTitle}. Licence ${s.licence}.`}
              >
                <Text style={[styles.sourceLesson, { fontSize: sized(font.sizes.sm) }]}>
                  {lang === "hi" ? s.title.hi : s.title.en}
                </Text>
                <Text style={[styles.sourceTitle, { fontSize: sized(font.sizes.sm) }]}>{s.sourceTitle}</Text>
                <Text style={[styles.sourceLicence, { fontSize: sized(font.sizes.xs) }]}>{s.licence}</Text>
                <Text style={[styles.sourceAdapt, { fontSize: sized(font.sizes.xs) }]}>
                  {lang === "hi" ? s.adaptation.hi : s.adaptation.en}
                </Text>
              </View>
            ))}
            <Text style={[styles.note, { fontSize: sized(font.sizes.xs) }]}>
              {lang === "hi" ? LEARNV2_REGISTRY_NOTE.hi : LEARNV2_REGISTRY_NOTE.en}
            </Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  body: { padding: space.lg, paddingBottom: 120, gap: space.md },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: space.sm },
  kicker: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    color: color.saffron,
    letterSpacing: 1,
  },
  title: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: color.ink },
  sub: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    color: color.inkSoft,
    marginTop: 4,
    lineHeight: 20,
  },
  langBtn: {
    minWidth: 48,
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: color.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.sm,
    ...shadow.card,
  },
  langText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.base, color: color.saffronText },
  resume: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: color.ink,
    borderRadius: radius.lg,
    padding: space.md,
  },
  resumeEyebrow: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: color.gold, letterSpacing: 1 },
  resumeTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: color.white, marginTop: 2 },
  unit: { gap: space.xs },
  unitEyebrow: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    color: color.saffron,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  unitSa: { color: color.ink, marginBottom: space.xs },
  lesson: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.md,
    ...shadow.card,
  },
  lessonLocked: { opacity: 0.6 },
  lessonNum: { width: 32, alignItems: "center" },
  lessonNumText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.lg, color: color.saffronText },
  lessonSa: { color: color.ink, fontFamily: "TiroDevanagariSanskrit_400Regular" },
  lessonTitle: { fontFamily: "Nunito_700Bold", fontWeight: "700", color: color.ink, marginTop: 1 },
  lessonMeta: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: color.inkSoft, marginTop: 2 },
  sourcesBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.md,
    minHeight: 52,
    ...shadow.card,
  },
  sourcesText: { fontFamily: "Nunito_700Bold", fontWeight: "700", color: color.ink },
  note: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    color: color.inkSoft,
    lineHeight: 18,
  },
  sheetHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  sheetTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: color.ink },
  closeBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  sheetBody: { padding: space.lg, paddingTop: 0, gap: space.sm, paddingBottom: 60 },
  sourceCard: { backgroundColor: color.surface, borderRadius: radius.md, padding: space.sm, gap: 2, ...shadow.card },
  sourceLesson: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: color.ink },
  sourceTitle: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: color.ink },
  sourceLicence: { fontFamily: "Nunito_700Bold", fontWeight: "700", color: color.saffronText },
  sourceAdapt: { fontFamily: "Nunito_400Regular", fontWeight: "400", color: color.inkSoft, lineHeight: 18 },
});
