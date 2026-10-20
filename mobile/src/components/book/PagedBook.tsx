import Modal from "../AudioModal";
// Paged books (handover_reading_shelf.md 7.4-7.7): the contents page, built in
// the same shape as a classic book's (read/BookContents) — cover, what the
// book is, how far in you are, Continue, then chapters that open onto their
// verses. Tapping a verse opens the fullscreen Book reader; that is the one
// reading screen for every book. Plus preview sheet for locked chapters.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import { CommonActions, useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api, type CanonText, type PagedChapter, type Shloka } from "../../api/client";
import { useQuery } from "../../hooks/useQuery";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { useTypeScale } from "../../hooks/useTypeScale";
import { haptics } from "../../services/haptics";
import { useBookActivity } from "../../hooks/useBookActivity";
import { pageId } from "../../services/bookActivity";
import { getReadingChapter, getReadingPosition } from "../../services/readingProgress";
import { color, space } from "../../theme";
import { plain } from "../../utils/text";
import { firstLine, parseRef } from "../../utils/verses";
import { positionKey, sectionsOf } from "../../utils/paged";
import CoverArt from "./CoverArt";
import { Button, EmptyState } from "../ui";
import { T, sa, ui } from "../../read/look";
import { NumBox, ProgressLine, SectionHead, SquareButton } from "../../read/ui";

export function PlusSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const reduced = useReducedMotion();
  const membershipNavigation = useNavigation();
  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduced ? "none" : "fade"}
      onRequestClose={onClose}
    >
      <View style={styles.sheetWrap}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Unlock with credits</Text>
          <Text style={styles.sheetLine}>Unlock this title from Membership &amp; credits. Membership adds offline access, background audio and more active slots.</Text>
          <Pressable style={styles.sheetBtn} accessibilityRole="button" onPress={() => {
            onClose(); membershipNavigation.dispatch(CommonActions.navigate("MainTabs", { screen: "Membership" }));
          }}><Text style={styles.sheetBtnText}>Membership &amp; credits</Text></Pressable>
          <Pressable
            onPress={onClose}
            style={styles.sheetBtn}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Text style={styles.sheetBtnText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const DEPTH_LABEL: Record<string, string> = {
  full: "Full text",
  studied: "Selected verses",
  index: "Catalogue selections",
};

/** One item of the flattened contents: a chapter head, one of its verses, or
 *  the row shown while a chapter's verses load (or after they failed). */
type Row =
  | { kind: "chapter"; c: PagedChapter }
  | { kind: "verse"; chapter: string; v: Shloka; at: number }
  | { kind: "status"; chapter: string };

interface IndexSection {
  key: string;
  /** This chapter is the first of its section: draw the "Part X" label. */
  partFirst: boolean;
  label: string;
  chapter: PagedChapter;
  data: Row[];
}

export function PagedBookIndex({
  text,
  onBack,
  onOpenChapter,
}: {
  text: CanonText;
  onBack: () => void;
  onOpenChapter: (chapter: string, index: number) => void;
}) {
  const activity = useBookActivity()[text.slug] ?? [];
  const readCount = activity.filter(page => page.read).length;
  const { sized } = useTypeScale();
  const q = useQuery(`paged-index-${text.slug}`, () => api.canonChapters(text.slug));
  const data = q.data;
  const [plusOpen, setPlusOpen] = useState(false);
  const [resume, setResume] = useState<{ chapter: string; index: number } | null>(null);
  // The chapter open on its verses (a one-chapter book is always open).
  const [openCh, setOpenCh] = useState<string | null>(null);
  // Chapter verses load the first time a chapter opens, and stay.
  const [verses, setVerses] = useState<Record<string, Shloka[]>>({});
  const [vLoading, setVLoading] = useState<Record<string, boolean>>({});
  const [vFailed, setVFailed] = useState<Record<string, boolean>>({});
  const got = useRef(new Set<string>());
  const busy = useRef(new Set<string>());

  // Continue: the saved chapter and verse, when the chapter still exists.
  useEffect(() => {
    if (!data) return;
    let alive = true;
    (async () => {
      let at = data.preview.chapter;
      let pos = 0;
      try {
        const ch = await getReadingChapter(text.slug);
        const chapters = data.chapters.map((c) => c.chapter);
        at = ch && chapters.includes(ch) ? ch : data.preview.chapter;
        pos = await getReadingPosition(positionKey(text.slug, at));
      } catch {
        /* no saved spot: the book opens at its beginning */
      }
      if (!alive) return;
      setResume({ chapter: at, index: Number.isFinite(pos) && pos > 0 ? Math.floor(pos) : 0 });
      setOpenCh(at);
    })();
    return () => { alive = false; };
  }, [data, text.slug]);

  const loadVerses = useCallback(
    (chapter: string) => {
      if (got.current.has(chapter) || busy.current.has(chapter)) return;
      busy.current.add(chapter);
      setVLoading((l) => ({ ...l, [chapter]: true }));
      setVFailed((f) => ({ ...f, [chapter]: false }));
      api
        .canonVerses(text.slug, chapter)
        .then((d) => {
          got.current.add(chapter);
          setVerses((v) => ({ ...v, [chapter]: d.verses }));
        })
        .catch(() => setVFailed((f) => ({ ...f, [chapter]: true })))
        .finally(() => {
          busy.current.delete(chapter);
          setVLoading((l) => ({ ...l, [chapter]: false }));
        });
    },
    [text.slug],
  );

  const chapters = useMemo(() => data?.chapters ?? [], [data]);
  const many = chapters.length > 1;

  // The chapter you are inside opens by default (Īśopaniṣad-style one-chapter
  // books simply list their verses).
  useEffect(() => {
    if (!data) return;
    if (chapters.length === 1) loadVerses(chapters[0].chapter);
    else if (openCh !== null) loadVerses(openCh);
  }, [data, chapters, openCh, loadVerses]);

  const order = useMemo(() => chapters.map((c) => c.chapter), [chapters]);
  const total = useMemo(() => chapters.reduce((a, c) => a + c.count, 0), [chapters]);
  const nowAt = resume ? order.indexOf(resume.chapter) : -1;
  // Where in the whole book the saved spot is, counts + verse index.
  const position = useMemo(() => {
    if (!resume || nowAt < 0) return 0;
    let before = 0;
    for (let i = 0; i < nowAt; i++) before += chapters[i]?.count ?? 0;
    return before + Math.max(0, resume.index);
  }, [chapters, nowAt, resume]);
  const started = position > 0 || readCount > 0;

  const rowsOf = useCallback(
    (c: PagedChapter): Row[] => {
      const list = verses[c.chapter];
      const verseRows = list?.map((v, at) => ({ kind: "verse" as const, chapter: c.chapter, v, at }));
      if (verseRows) return many ? [{ kind: "chapter", c }, ...verseRows] : verseRows;
      const status: Row[] = [{ kind: "status", chapter: c.chapter }];
      if (!many) return status;
      // A collapsed chapter shows only its head.
      return openCh === c.chapter ? [{ kind: "chapter", c }, ...status] : [{ kind: "chapter", c }];
    },
    [many, openCh, verses],
  );

  const sections = useMemo<IndexSection[]>(() => {
    const out: IndexSection[] = [];
    for (const s of sectionsOf(chapters)) {
      s.chapters.forEach((c, i) => {
        out.push({
          key: c.chapter || "one",
          partFirst: i === 0 && !!s.section,
          label: s.section ? `Part ${s.section}` : "",
          chapter: c,
          data: rowsOf(c),
        });
      });
    }
    return out;
  }, [chapters, rowsOf]);

  if (q.loading && !data) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.body}>
          <Text style={[styles.title, { fontSize: sized(25) }]}>
            {plain(text.title_en)}
          </Text>
          <Text style={styles.hint}>Loading chapters.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}>
          <EmptyState
            title="Couldn't load this book. Try again."
            hint=""
          />
          <Button label="Try again" tone="primary" onPress={q.retry} style={{ marginTop: space.md }} />
          <Pressable
            onPress={onBack}
            style={styles.backRow}
            accessibilityRole="button"
            accessibilityLabel="Back to Books"
          >
            <Ionicons name="arrow-back" size={20} color={color.saffron} />
            <Text style={styles.backText}>Books</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const facts: string[] = [];
  facts.push(many ? `${chapters.length} chapters · ${total} verses` : `${total} verses`);
  if (text.verses_planned && text.verses_planned > total) facts[0] += ` of ${text.verses_planned}`;
  if (text.depth && DEPTH_LABEL[text.depth]) facts.push(DEPTH_LABEL[text.depth]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <SectionList<Row, IndexSection>
        sections={sections}
        keyExtractor={(item) =>
          item.kind === "chapter" ? `c-${item.c.chapter || "one"}` : item.kind === "verse" ? `v-${item.v.id}` : `s-${item.chapter}`
        }
        contentContainerStyle={styles.body}
        stickySectionHeadersEnabled={false}
        initialNumToRender={20}
        ListHeaderComponent={
          <View>
            <Pressable onPress={onBack} style={styles.backRow} accessibilityRole="button" accessibilityLabel="Back to Books">
              <Ionicons name="arrow-back" size={20} color={T.ink} />
              <Text style={styles.backText}>Books</Text>
            </Pressable>
            <View style={styles.hero}>
              <CoverArt bookKey={text.slug} titleSa={text.title_sa} width={96} />
              <View style={styles.heroText}>
                <Text style={[styles.title, { fontSize: sized(25) }]} accessibilityRole="header">
                  {plain(text.title_en)}
                </Text>
                {!!text.title_sa && <Text style={[sa(18), { color: T.ink2 }]}>{text.title_sa}</Text>}
                <View style={styles.facts}>
                  {facts.map((f) => (
                    <Text key={f} style={styles.fact}>
                      {f}
                    </Text>
                  ))}
                  {text.locked ? <Text style={styles.fact}>Opening chapters free · rest with Plus</Text> : null}
                </View>
              </View>
            </View>

            {started && (
              <View style={styles.progress}>
                <View style={styles.progressRow}>
                  <Text style={styles.progressPct}>{Math.round((readCount / Math.max(1, total)) * 100)}% read</Text>
                  {many && nowAt >= 0 && (
                    <Text style={styles.progressWhere}>
                      Chapter {nowAt + 1} of {chapters.length}
                    </Text>
                  )}
                </View>
                <ProgressLine frac={readCount / Math.max(1, total)} />
              </View>
            )}

            <View style={styles.actions}>
              <SquareButton
                label={started && resume ? `Continue${resume.chapter ? ` · chapter ${resume.chapter}` : ""}` : "Start reading"}
                icon="play"
                onPress={() => resume && onOpenChapter(resume.chapter, resume.index)}
                style={{ flex: 1 }}
              />
            </View>

            <SectionHead
              title={many ? "Chapters" : "Verses"}
              right={`${many ? chapters.length : total}`}
              style={styles.listHead}
            />
            <View style={styles.rule} />
          </View>
        }
        renderSectionHeader={({ section }) => {
          const c = section.chapter;
          if (!many) return section.partFirst ? <Text style={styles.sectionLabel}>{section.label}</Text> : null;
          const label = c.chapter ? `Chapter ${c.chapter}` : "Verses";
          const i = order.indexOf(c.chapter);
          const done = activity.filter(page => page.chapter === c.chapter && page.read).length >= c.count && c.count > 0;
          const state = done ? "done" : started && i === nowAt ? "now" : "ahead";
          const isOpen = openCh === c.chapter;
          return (
            <>
              {section.partFirst ? <Text style={styles.sectionLabel}>{section.label}</Text> : null}
              <Pressable
                onPress={() => {
                  haptics.tap();
                  if (c.locked) {
                    setPlusOpen(true);
                    return;
                  }
                  setOpenCh((cur) => (cur === c.chapter ? null : c.chapter));
                }}
                style={styles.chapter}
                accessibilityRole="button"
                accessibilityState={{ expanded: isOpen && !c.locked }}
                accessibilityLabel={c.locked ? `${label}, Plus` : `${label}. ${c.count} verses.`}
              >
                <NumBox state={state} label={c.chapter || "1"} />
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{label}</Text>
                  <Text style={[styles.rowSub, state === "now" && styles.rowSubNow]}>
                    {state === "now" && resume ? `You are at verse ${resume.index + 1} of ${c.count}` : `${c.count} verses`}
                    {c.locked ? " · Plus" : ""}
                  </Text>
                </View>
                {c.locked ? (
                  <Ionicons name="lock-closed" size={18} color={T.ink3} />
                ) : (
                  <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={16} color={T.ink3} />
                )}
              </Pressable>
            </>
          );
        }}
        renderItem={({ item }) => {
          if (item.kind === "chapter") return <View />;
          if (item.kind === "status") {
            const failedHere = vFailed[item.chapter];
            const loadingHere = vLoading[item.chapter];
            return (
              <Pressable
                onPress={() => loadVerses(item.chapter)}
                disabled={!failedHere}
                accessibilityRole={failedHere ? "button" : undefined}
                accessibilityLabel={failedHere ? "Couldn't load these verses. Tap to try again." : undefined}
                style={[styles.verse, { marginLeft: many ? 48 : 0 }]}
              >
                <Text style={styles.statusLine}>
                  {failedHere ? "Couldn't load these verses. Tap to retry." : loadingHere ? "Loading verses…" : "No verses shown here."}
                </Text>
              </Pressable>
            );
          }
          const here = started && item.chapter === resume?.chapter && item.at === resume.index;
          const mark = activity.find(page => page.chapter === item.chapter && page.id === pageId(item.v));
          const { nums } = parseRef(item.v.source_ref);
          const num = nums.length > 0 ? nums[nums.length - 1] : item.at + 1;
          return (
            <Pressable
              onPress={() => {
                haptics.tap();
                onOpenChapter(item.chapter, item.at);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${item.v.source_ref}. ${firstLine(item.v.devanagari)}${here ? ". You are here." : ""}${mark?.read ? ". Already read." : ""}${mark?.bookmarked ? ". Bookmarked." : ""}`}
              style={[styles.verse, { marginLeft: (many ? 48 : 0) - (here ? 8 : 0) }, here && styles.verseHere, mark?.read && { backgroundColor: T.doneBg, borderRadius: 8 }]}
            >
              <Text style={[styles.verseNum, here && { color: T.action }]}>{num}</Text>
              <Text style={[sa(16), styles.verseLine]} numberOfLines={1}>
                {firstLine(item.v.devanagari)}
              </Text>
              {mark?.read && <Ionicons name="checkmark-circle" size={16} color={T.action} />}
              {mark?.bookmarked && <Ionicons name="bookmark" size={16} color={T.action} />}
              {here && (
                <View style={styles.hereTag}>
                  <Ionicons name="location-outline" size={12} color={T.action} />
                  <Text style={styles.hereText}>Here</Text>
                </View>
              )}
            </Pressable>
          );
        }}
        renderSectionFooter={({ section }) => (many ? <View style={styles.rule} key={section.key} /> : null)}
      />
      <PlusSheet visible={plusOpen} onClose={() => setPlusOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.paper },
  body: { paddingHorizontal: 20, paddingBottom: 120 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.lg },
  title: { ...ui("bold"), lineHeight: 30, color: T.ink },
  hint: { color: color.inkSoft, marginTop: 8 },
  backRow: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 48, alignSelf: "flex-start" },
  backText: { ...ui("semibold"), fontSize: 15, color: T.ink },
  hero: { flexDirection: "row", gap: 16, marginTop: 2 },
  heroText: { flex: 1, minWidth: 0, paddingTop: 2 },
  facts: { marginTop: 10, gap: 3 },
  fact: { ...ui("regular"), fontSize: 14, color: T.ink2 },
  progress: { marginTop: 18, gap: 7 },
  progressRow: { flexDirection: "row", justifyContent: "space-between" },
  progressPct: { ...ui("semibold"), fontSize: 13.5, color: T.ink },
  progressWhere: { ...ui("regular"), fontSize: 13.5, color: T.ink3 },
  actions: { flexDirection: "row", gap: 10, marginTop: 16 },
  listHead: { marginTop: 26, marginBottom: 8 },
  rule: { height: 1, backgroundColor: T.line },
  sectionLabel: { ...ui("bold"), fontSize: 12, letterSpacing: 1.4, color: T.ink3, marginTop: 16, marginBottom: 2 },
  chapter: { flexDirection: "row", alignItems: "center", gap: 14, minHeight: 62, paddingVertical: 8 },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { ...ui("semibold"), fontSize: 16, lineHeight: 21, color: T.ink },
  rowSub: { ...ui("regular"), color: T.ink3, fontSize: 13 },
  rowSubNow: { ...ui("semibold"), color: T.action },
  verse: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 46,
    borderTopWidth: 1,
    borderTopColor: "#EFE6D6",
  },
  verseHere: { backgroundColor: T.surface, paddingHorizontal: 8, marginRight: -8 },
  verseNum: { ...ui("semibold"), width: 30, fontSize: 13.5, color: T.ink3, fontVariant: ["tabular-nums"] },
  verseLine: { flex: 1, minWidth: 0, color: T.ink },
  hereTag: { flexDirection: "row", alignItems: "center", gap: 4 },
  hereText: { ...ui("bold"), fontSize: 12, color: T.action },
  statusLine: { ...ui("regular"), fontSize: 13.5, color: T.ink3, paddingLeft: 34, paddingVertical: 12 },
  sheetWrap: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", padding: 24 },
  sheet: { backgroundColor: color.bg, borderRadius: 16, padding: 20, width: "100%", gap: 8 },
  sheetTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 18, color: color.ink },
  sheetLine: { fontSize: 14, color: color.ink },
  sheetBtn: { marginTop: 8, minHeight: 48, borderRadius: 12, backgroundColor: color.saffronBtn, alignItems: "center", justifyContent: "center" },
  sheetBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },
});

export default { PagedBookIndex, PlusSheet };
