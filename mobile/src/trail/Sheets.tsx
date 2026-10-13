// The trail's three bottom sheets: a lesson's preview, the stage switcher and
// a unit's graded practice. Square corners, one primary action each.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React from "react";
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { GuideLang, GuideTopicSummary, LessonSummary } from "../api/client";
import { useTypeScale } from "../hooks/useTypeScale";
import { getLearnV2Lesson } from "../learnv2/catalogue";
import type { TrailStage, TrailStop, TrailUnit } from "./course";
import { TRAIL, stageStops } from "./course";
import type { StopStatus, TrailFacts } from "./progress";
import { PRACTICE_PASS, stageDoneCount, unitMastery } from "./progress";
import { toolName } from "./text";
import { T, sa, ui } from "./theme";
import { IconButton, Medallion, Overline, PrimaryButton, TextButton, trailArt } from "./ui";

function Sheet({ visible, onClose, label, children, tall }: { visible: boolean; onClose: () => void; label: string; children: React.ReactNode; tall?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }, tall && { maxHeight: "92%" }]} accessibilityViewIsModal accessibilityLabel={label}>
          <View style={styles.handle} />
          {children}
        </View>
      </View>
    </Modal>
  );
}

function Banner({ art }: { art: string }) {
  const { source } = trailArt(art);
  if (!source) return null;
  return <Image source={source} resizeMode="cover" style={styles.banner} accessibilityIgnoresInvertColors />;
}

// ─── Lesson preview ─────────────────────────────────────────────────────────

interface LessonSheetProps {
  stop: TrailStop | null;
  status: StopStatus;
  currentTitle?: string;
  topics: GuideTopicSummary[];
  lang: GuideLang;
  onStart: () => void;
  onNotes: () => void;
  onClose: () => void;
}

export function LessonSheet({ stop, status, currentTitle, topics, lang, onStart, onNotes, onClose }: LessonSheetProps) {
  const { sized } = useTypeScale();
  const hi = lang === "hi";
  if (!stop) return <Sheet visible={false} onClose={onClose} label=""><View /></Sheet>;
  const { lesson, unit, stage } = stop;
  const cards = lesson.cards ? getLearnV2Lesson(lesson.cards) : undefined;
  const topic = topics.find((t) => t.id === lesson.topics[0]);
  const saLine = cards?.titleSa ?? topic?.title_sa ?? "";
  const outcome = cards ? cards.outcome[lang] : topic ? topic.summary[lang] || topic.summary.en : "";
  const checks = cards?.cards.filter((c) => c.practice).length ?? 0;
  const n = unit.lessons.indexOf(lesson) + 1;
  const locked = status === "upcoming";
  const words = cards
    ? [...new Set(cards.cards.flatMap((c) => (c.example ? [c.example.sa] : [])).filter((w) => !/[\s+→।]/.test(w)))].slice(0, 5)
    : [];
  const primary = cards
    ? (status === "done" ? (hi ? "फिर से पढ़ें" : "Go through it again") : (hi ? "पाठ शुरू करें" : "Start lesson"))
    : lesson.topics.length
      ? (hi ? "पाठ के नोट्स पढ़ें" : "Read the lesson notes")
      : lesson.tool ? (hi ? `${toolName(lesson.tool, lang)} खोलें` : `Open ${toolName(lesson.tool, lang)}`) : "";

  return (
    <Sheet visible onClose={onClose} label={lesson.title[lang]}>
      <ScrollView contentContainerStyle={styles.sheetBody} bounces={false}>
        <Banner art={unit.art} />
        <View>
          <Overline text={hi ? `इकाई ${unit.n} · पाठ ${n}` : `Unit ${unit.n} · Lesson ${n}`} color={stage.color} />
          {saLine ? <Text style={[sa(sized(25)), { color: T.ink }]}>{saLine}</Text> : null}
          <Text style={[ui("bold"), { color: T.ink, fontSize: sized(20), lineHeight: sized(26) }]}>{lesson.title[lang]}</Text>
        </View>
        {outcome ? <Text style={[ui("regular"), { color: T.ink, fontSize: sized(16), lineHeight: sized(23) }]}>{outcome}</Text> : null}
        <View style={styles.meta}>
          <Meta icon="time-outline" text={hi ? `${lesson.minutes} मिनट` : `${lesson.minutes} min`} />
          {cards ? <Meta icon="albums-outline" text={hi ? `${cards.cards.length} कार्ड` : `${cards.cards.length} cards`} /> : null}
          {checks ? <Meta icon="checkmark" text={hi ? `${checks} जाँच` : `${checks} ${checks === 1 ? "check" : "checks"}`} /> : null}
          {!cards && lesson.topics.length ? <Meta icon="document-text-outline" text={hi ? "नोट्स" : "Notes"} /> : null}
        </View>
        {words.length ? (
          <View style={{ gap: 6 }}>
            <Overline text={hi ? "इसमें मिलेंगे" : "You will meet"} />
            <View style={styles.chips}>
              {words.map((w) => <Text key={w} style={[styles.chip, sa(sized(18))]}>{w}</Text>)}
            </View>
          </View>
        ) : null}
        {locked && currentTitle ? (
          <Text style={[ui("medium"), { color: T.ink2, fontSize: sized(15) }]}>
            {hi ? `यह पाठ “${currentTitle}” के बाद खुलेगा।` : `This opens after “${currentTitle}”.`}
          </Text>
        ) : null}
        {primary ? <PrimaryButton label={primary} onPress={onStart} disabled={locked} /> : null}
        {cards && lesson.topics.length ? <TextButton label={hi ? "इसके बजाय व्याकरण नोट पढ़ें" : "Read the grammar note instead"} onPress={onNotes} /> : null}
        {!cards && locked && lesson.topics.length ? <TextButton label={hi ? "नोट्स अभी पढ़ें" : "Read the notes now"} onPress={onNotes} /> : null}
      </ScrollView>
    </Sheet>
  );
}

function Meta({ icon, text }: { icon: React.ComponentProps<typeof Ionicons>["name"]; text: string }) {
  const { sized } = useTypeScale();
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon} size={16} color={T.ink2} />
      <Text style={[ui("regular"), { color: T.ink2, fontSize: sized(14) }]}>{text}</Text>
    </View>
  );
}

// ─── Stage switcher ─────────────────────────────────────────────────────────

export function StageSheet({ visible, current, facts, lang, onPick, onLibrary, onClose }: {
  visible: boolean; current: TrailStage; facts: TrailFacts; lang: GuideLang;
  onPick: (s: TrailStage) => void; onLibrary: () => void; onClose: () => void;
}) {
  const { sized } = useTypeScale();
  const hi = lang === "hi";
  const total = TRAIL.reduce((n, s) => n + stageStops(s).length, 0);
  return (
    <Sheet visible={visible} onClose={onClose} label={hi ? "चरण चुनें" : "Choose a stage"} tall>
      <View style={styles.sheetHead}>
        <Text style={[styles.sheetTitle, { fontSize: sized(25) }]}>{hi ? "आपका मार्ग" : "Your path"}</Text>
        <IconButton icon="close" label={hi ? "बंद करें" : "Close"} onPress={onClose} />
      </View>
      <ScrollView contentContainerStyle={styles.sheetBody}>
        <Text style={[ui("regular"), { color: T.ink2, fontSize: sized(14.5), marginTop: -8 }]}>
          {hi ? `5 चरण · ${total} पाठ। कहीं से भी शुरू करें; चरण के भीतर पाठ क्रम से खुलते हैं।` : `5 stages · ${total} lessons. Start anywhere; lessons inside a stage open in order.`}
        </Text>
        {TRAIL.map((s) => {
          const count = stageStops(s).length;
          const done = stageDoneCount(s, facts);
          const here = s.id === current.id;
          return (
            <Pressable key={s.id} onPress={() => onPick(s)} accessibilityRole="button" accessibilityState={{ selected: here }}
              accessibilityLabel={`${hi ? "चरण" : "Stage"} ${s.n}: ${s.title[lang]}. ${done} / ${count}`}
              style={[styles.stageRow, here && { borderColor: s.color, borderWidth: 2 }]}>
              <Medallion art={s.art} size={56} />
              <View style={{ flex: 1, gap: 1 }}>
                <Text style={[ui("bold"), { color: s.color, fontSize: sized(11.5), letterSpacing: 1 }]}>
                  {hi ? `चरण ${s.n}${here ? " · आप यहाँ हैं" : ""}` : `STAGE ${s.n}${here ? " · YOU ARE HERE" : ""}`}
                </Text>
                <Text style={[ui("bold"), { color: T.ink, fontSize: sized(17) }]}>{s.title[lang]}</Text>
                <Text style={[ui("regular"), { color: T.ink2, fontSize: sized(14) }]}>{s.goal[lang]}</Text>
                <View style={styles.progressRow}>
                  <View style={styles.track}><View style={{ width: `${Math.round((done / count) * 100)}%`, height: 5, backgroundColor: done === count ? T.done : s.color }} /></View>
                  <Text style={[ui("regular"), { color: T.ink2, fontSize: sized(12.5) }]}>{hi ? `${done} / ${count}` : `${done} of ${count}`}</Text>
                </View>
              </View>
            </Pressable>
          );
        })}
        <Pressable onPress={onLibrary} accessibilityRole="button" style={styles.libraryRow}>
          <Ionicons name="library-outline" size={22} color={T.ink} />
          <View style={{ flex: 1 }}>
            <Text style={[ui("semibold"), { color: T.ink, fontSize: sized(16) }]}>{hi ? "पुस्तकालय" : "Library"}</Text>
            <Text style={[ui("regular"), { color: T.ink2, fontSize: sized(13) }]}>{hi ? "तालिकाएँ, व्याकरण नोट्स, उपकरण" : "Tables, grammar notes, tools"}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={T.ink3} />
        </Pressable>
      </ScrollView>
    </Sheet>
  );
}

// ─── Unit practice ──────────────────────────────────────────────────────────

export function PracticeSheet({ unit, stage, lessons, loading, failed, onRetry, facts, lang, onLesson, onAll, onClose }: {
  unit: TrailUnit | null; stage: TrailStage; lessons: LessonSummary[]; loading: boolean; failed: boolean; onRetry: () => void;
  facts: TrailFacts; lang: GuideLang; onLesson: (l: LessonSummary) => void; onAll: () => void; onClose: () => void;
}) {
  const { sized } = useTypeScale();
  const hi = lang === "hi";
  if (!unit) return <Sheet visible={false} onClose={onClose} label=""><View /></Sheet>;
  const m = unitMastery(unit, facts.mastery);
  const own = lessons.filter((l) => unit.graded.includes(l.feature_id));
  return (
    <Sheet visible onClose={onClose} label={hi ? `इकाई ${unit.n} अभ्यास` : `Unit ${unit.n} practice`} tall>
      <ScrollView contentContainerStyle={styles.sheetBody}>
        <View>
          <Overline text={hi ? `इकाई ${unit.n} अभ्यास · जाँचा हुआ` : `Unit ${unit.n} practice · graded`} color={stage.color} />
          <Text style={[ui("bold"), { color: T.ink, fontSize: sized(21) }]}>{hi ? "जो सीखा, उसका अभ्यास" : "Practise what you learned"}</Text>
          <Text style={[ui("regular"), { color: T.ink2, fontSize: sized(15), lineHeight: sized(22) }]}>
            {hi ? "हर उत्तर जाँचा जाता है और आपकी प्रगति में जुड़ता है।" : "Every answer is checked and counts toward your progress."}
          </Text>
        </View>
        {m != null ? (
          <View style={styles.progressRow}>
            <View style={styles.track}><View style={{ width: `${Math.round(m * 100)}%`, height: 5, backgroundColor: m >= PRACTICE_PASS ? T.done : stage.color }} /></View>
            <Text style={[ui("semibold"), { color: T.ink, fontSize: sized(13.5) }]}>{Math.round(m * 100)}%</Text>
          </View>
        ) : null}
        <PrimaryButton label={hi ? "सब एक साथ अभ्यास करें" : "Practise all"} onPress={onAll} icon="flag-outline" />
        <Overline text={hi ? "या एक-एक करके" : "Or one at a time"} />
        {loading && !own.length ? <Text style={[ui("regular"), { color: T.ink2, fontSize: sized(14) }]}>{hi ? "लोड हो रहा है…" : "Loading…"}</Text> : null}
        {failed && !own.length ? <TextButton label={hi ? "लोड नहीं हुआ। फिर से कोशिश करें" : "Could not load. Retry"} onPress={onRetry} /> : null}
        {own.map((l) => {
          const pct = Math.round((facts.mastery[l.feature_id] ?? 0) * 100);
          return (
            <Pressable key={l.id} onPress={() => onLesson(l)} accessibilityRole="button" style={styles.practiceRow}
              accessibilityLabel={`${hi ? l.title_hi : l.title_en}. ${pct}%`}>
              <Text style={[ui("regular"), { flex: 1, color: T.ink, fontSize: sized(15.5) }]}>{hi ? l.title_hi : l.title_en}</Text>
              <Text style={[ui("semibold"), { color: pct >= PRACTICE_PASS * 100 ? T.doneInk : T.ink2, fontSize: sized(13.5) }]}>{pct}%</Text>
              <Ionicons name="chevron-forward" size={16} color={T.ink3} />
            </Pressable>
          );
        })}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: T.scrim },
  sheet: { backgroundColor: T.paper, paddingTop: 8, maxHeight: "86%" },
  handle: { alignSelf: "center", width: 40, height: 4, backgroundColor: T.lineStrong, marginBottom: 4 },
  sheetHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingLeft: 16, paddingRight: 6 },
  sheetTitle: { fontFamily: "TiroDevanagariSanskrit_400Regular", color: T.ink },
  sheetBody: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, gap: 12 },
  banner: { width: "100%", height: 132, backgroundColor: T.line },
  meta: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { paddingHorizontal: 12, borderWidth: 1, borderColor: T.lineStrong, backgroundColor: T.surface, color: T.ink },
  stageRow: { flexDirection: "row", gap: 12, padding: 10, backgroundColor: T.surface, borderWidth: 1, borderColor: T.line },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  track: { flex: 1, height: 5, backgroundColor: T.line, overflow: "hidden" },
  libraryRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, borderTopWidth: 1, borderTopColor: T.line, marginTop: 4 },
  practiceRow: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 52, borderBottomWidth: 1, borderBottomColor: T.line },
});
