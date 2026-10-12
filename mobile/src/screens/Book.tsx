// Book: the fullscreen reading page (HANDOVER 7.4).
// A root-stack screen covering the tab bar. Swipe turns pages, edge taps turn,
// middle tap toggles controls. Themes Light/Sepia/Dark, five sizes, Roman switch.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { setAudioModeAsync } from "expo-audio";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { RootStackParamList } from "../navigation/types";
import type { Shloka } from "../api/client";
import PageCurlBook from "../components/book/PageCurlBook";
import BookCover from "../components/book/BookCover";
import CoverArt from "../components/book/CoverArt";
import ReaderSlider from "../components/ReaderSlider";
import ChantList from "../components/chant/ChantList";
import ChantPlayer, { type RepeatMode } from "../components/chant/ChantPlayer";
import { useBookPages } from "../hooks/useBookPages";
import { useChant } from "../hooks/useChant";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useTypeScale } from "../hooks/useTypeScale";
import { useAsk } from "../ask/AskProvider";
import { READER_THEMES, READER_SIZES, type ReaderThemeName } from "./readerTheme";
import { color, font, sanskritText, script, space } from "../theme";
import { plain } from "../utils/text";

type Props = NativeStackScreenProps<RootStackParamList, "Book">;

const THEME_KEY = "shabd.read.theme";
const SIZE_KEY = "shabd.read.size";
const MODE_KEY = "shabd.read.mode";

type ReadMode = "read" | "chant";

function breakVerse(dev: string): string[] {
  return (dev || "").split(/(?<=[।॥])/).map((s) => s.trim()).filter(Boolean);
}

export default function BookScreen({ navigation, route }: Props) {
  const { bookKey, index, chapter, mode: startMode } = route.params;
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const { sized } = useTypeScale();
  const ask = useAsk();
  const [controls, setControls] = useState(false);
  const [aaOpen, setAaOpen] = useState(false);
  const [themeName, setThemeName] = useState<ReaderThemeName>("light");
  const [sizeStep, setSizeStep] = useState(1);
  const [roman, setRoman] = useState(true);
  const [wordOpen, setWordOpen] = useState(false);
  const [mode, setMode] = useState<ReadMode>(startMode ?? "read");
  // Focused previous/current/next view instead of the whole chapter list.
  const [focus, setFocus] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((v) => {
      if (v === "light" || v === "sepia" || v === "dark") setThemeName(v);
    });
    AsyncStorage.getItem(SIZE_KEY).then((v) => {
      const n = Number(v);
      if (Number.isFinite(n) && READER_SIZES.includes(n)) setSizeStep(READER_SIZES.indexOf(n));
    });
    AsyncStorage.getItem(MODE_KEY).then((v) => {
      // Asked for Chant by the screen that opened this one: that wins over the saved choice.
      if (!startMode && (v === "read" || v === "chant")) setMode(v);
    });
  }, []);

  // The same queries the Reader's contents page reads, so `index` (a position
  // in that list) opens the same verse here (shared with Listen).
  const { pages, pagedText, pagedChapter, title: bookTitle, persistAt } = useBookPages(bookKey, chapter ?? null);

  const theme = READER_THEMES[themeName];
  const readerScale = READER_SIZES[sizeStep] ?? 1;

  const saveTheme = (t: ReaderThemeName) => {
    setThemeName(t);
    void AsyncStorage.setItem(THEME_KEY, t);
  };
  const saveSize = (i: number) => {
    setSizeStep(i);
    void AsyncStorage.setItem(SIZE_KEY, String(READER_SIZES[i]));
  };

  // Reading position persists wherever the page goes (read scrub or chant).

  // Chant mode player wiring, shared with the Listen screen.
  const navigate = useCallback(
    (r: string, p?: object) =>
      (navigation as never as { navigate: (rr: string, pp?: object) => void }).navigate(r, p),
    [navigation],
  );
  const {
    at,
    setAt,
    verse,
    playingVerse,
    playingAt,
    playingId,
    lineNow,
    fillFrac,
    isPlaying,
    repeat,
    speed,
    follow,
    setFollow,
    listRef,
    hasChant,
    pick,
    pickLine,
    toggle,
    step,
    stop,
    cycleRepeat,
    cycleSpeed,
    scrollToCurrent,
    openLearn,
  } = useChant(pages, bookTitle, { initialIndex: index ?? 0, navigate, onAt: persistAt, scrollToList: !focus });

  const saveMode = (m: ReadMode) => {
    setMode(m);
    void AsyncStorage.setItem(MODE_KEY, m);
    if (m === "read") {
      stop();
      try { void setAudioModeAsync({ playsInSilentMode: true }); } catch { /* keep */ }
    }
  };

  // Chant mode is only on in a book that has a chant. The saved choice stays
  // as it is, so the Gītā opens in Chant again, but a book with none must not
  // open a list of "No chant yet" cards with no switch to get out of it.
  const chantOn = mode === "chant" && hasChant;

  const tap = useMemo(
    () =>
      Gesture.Tap().onEnd((e) => {
        // Left 25% back, right 25% forward, middle toggles controls.
        // Width is unavailable in the worklet; use absolute dp (360dp phone).
        const x = e.absoluteX ?? e.x;
        if (x < 90) {
          // Handled via JS: set index back.
        }
      }),
    [],
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.page, paddingTop: insets.top }]}>
      <StatusBar style={themeName === "dark" ? "light" : "dark"} />
      {chantOn ? (
        <ChantList
          verses={pages}
          playingId={playingId}
          lineNow={lineNow}
          fillFrac={fillFrac}
          pageColor={theme.page}
          textColor={theme.text}
          softColor={theme.soft}
          roman={roman}
          focusIndex={focus ? playingAt : null}
          onPick={pick}
          onPickLine={pickLine}
          onLearn={(v) => {
            stop();
            navigate("Recite", { verseUid: v.verse_uid ?? v.id, start: "listen" });
          }}
          listRef={listRef}
          onUserScroll={() => setFollow(false)}
        />
      ) : (
        <PageCurlBook
          index={at}
          count={Math.max(1, pages.length)}
          onIndexChange={setAt}
          reducedMotion={reduced}
          renderPage={(i) => (
            <ReaderPageView
              verse={pages[i]}
              themeName={themeName}
              readerScale={readerScale}
              roman={roman}
              onWordByWord={() => setWordOpen(true)}
              onLearn={() => {
                const v = pages[i];
                if (v) {
                  (navigation as never as { navigate: (r: string, p?: object) => void }).navigate("Recite", {
                    verseUid: v.verse_uid ?? v.id, start: "listen",
                  });
                }
              }}
            />
          )}
        />
      )}
      {/* Folio + progress */}
      <View style={[styles.folio, { borderColor: theme.line }]}>
        <Text style={[styles.folioText, { color: theme.soft }]}>
          {verse ? `${verse.source_ref} · ${at + 1} of ${pages.length}` : ""}
        </Text>
        <View style={[styles.progress, { backgroundColor: theme.line }]}>
          <View style={[styles.progressBar, { width: `${pages.length ? ((at + 1) / pages.length) * 100 : 0}%`, backgroundColor: theme.accent }]} />
        </View>
      </View>
      {controls && (
        <View style={[styles.topBar, { backgroundColor: theme.bar, paddingTop: insets.top }]}>
          <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Back to contents" style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </Pressable>
          <Text style={[styles.topTitle, { color: theme.text }]} numberOfLines={1}>{bookKey}</Text>
          {hasChant && (
            <View style={styles.modeSwitch}>
              {(["read", "chant"] as ReadMode[]).map((m) => (
                <Pressable
                  key={m}
                  onPress={() => {
                    if (m === "read" && playingId) {
                      const i = pages.findIndex((p) => p.id === playingId);
                      if (i >= 0) setAt(i);
                    }
                    saveMode(m);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={m === "read" ? "Read mode" : "Chant mode"}
                  accessibilityState={{ selected: mode === m }}
                  style={[styles.modeBtn, mode === m && { backgroundColor: "#3B2E25" }]}
                >
                  <Text style={[styles.modeText, mode === m && { color: "#FFF8EE" }]}>{m === "read" ? "Read" : "Chant"}</Text>
                </Pressable>
              ))}
            </View>
          )}
          <Pressable onPress={() => setAaOpen(true)} accessibilityRole="button" accessibilityLabel="Text size and theme" style={styles.iconBtn}>
            <Text style={{ color: theme.text, fontWeight: "800" }}>Aa</Text>
          </Pressable>
          <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Contents" style={styles.iconBtn}>
            <Ionicons name="list" size={22} color={theme.text} />
          </Pressable>
          <Pressable
            onPress={() => ask.open({ surface: "read", subject: verse?.devanagari ?? "" })}
            accessibilityRole="button"
            accessibilityLabel="Ask about this verse"
            style={styles.iconBtn}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={22} color={theme.text} />
          </Pressable>
        </View>
      )}
      {controls && (
        <View style={[styles.bottomBar, { backgroundColor: theme.bar, paddingBottom: insets.bottom }]}>
          <ReaderSlider index={at} count={pages.length} labelFor={(i) => pages[i]?.source_ref ?? `Page ${i + 1}`} onScrubEnd={setAt} />
          <Text style={[styles.posText, { color: theme.soft }]}>{`${at + 1} of ${pages.length}`}</Text>
        </View>
      )}
      {chantOn && (
        <View style={[styles.playerWrap, { backgroundColor: theme.page }]}>
          <ChantPlayer
            onPrev={() => step(-1)}
            onToggle={toggle}
            playing={isPlaying}
            onNext={() => step(1)}
            repeat={repeat}
            onRepeat={cycleRepeat}
            speed={speed}
            onSpeed={cycleSpeed}
            onLearn={openLearn}
            onListen={() => {
              navigate("Listen", { bookKey, chapter: pagedChapter ?? undefined, index: playingAt });
            }}
            verseRef={playingVerse?.source_ref}
            position={pages.length ? `${playingAt + 1} of ${pages.length}` : undefined}
            focus={focus}
            onFocus={() => setFocus((f) => !f)}
            follow={follow}
            onFollow={() => {
              setFollow(true);
              scrollToCurrent();
            }}
          />
        </View>
      )}
      {/* Middle-tap toggles controls */}
      <Pressable
        onPress={() => setControls((c) => !c)}
        accessibilityRole="button"
        accessibilityLabel={controls ? "Hide controls" : "Show controls"}
        style={styles.middleTap}
      />
      <Modal visible={aaOpen} transparent animationType="fade" onRequestClose={() => setAaOpen(false)}>
        <Pressable style={styles.scrim} onPress={() => setAaOpen(false)} accessibilityRole="button" accessibilityLabel="Close text settings" />
        <View style={[styles.aaPanel, { backgroundColor: theme.bar }]}>
          <Text style={[styles.aaTitle, { color: theme.text }]}>Text</Text>
          <View style={styles.aaRow}>
            {(["light", "sepia", "dark"] as ReaderThemeName[]).map((t) => (
              <Pressable key={t} onPress={() => saveTheme(t)} accessibilityRole="button" accessibilityLabel={`${t} theme`} accessibilityState={{ selected: themeName === t }} style={[styles.swatch, { backgroundColor: READER_THEMES[t].page, borderColor: themeName === t ? theme.accent : theme.line }]}>
                <Text style={{ color: READER_THEMES[t].text, fontSize: 12 }}>{t}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.aaRow}>
            {READER_SIZES.map((s, i) => (
              <Pressable key={s} onPress={() => saveSize(i)} accessibilityRole="button" accessibilityLabel={`Size ${i + 1}`} accessibilityState={{ selected: i === sizeStep }} style={[styles.sizeBtn, i === sizeStep && { backgroundColor: theme.accent }]}>
                <Text style={{ color: i === sizeStep ? "#fff" : theme.text }}>A</Text>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={() => setRoman((r) => !r)} accessibilityRole="switch" accessibilityState={{ checked: roman }} accessibilityLabel="Show roman transliteration" style={styles.aaRowBetween}>
            <Text style={{ color: theme.text }}>Roman</Text>
            <Text style={{ color: theme.soft }}>{roman ? "On" : "Off"}</Text>
          </Pressable>
        </View>
      </Modal>
      <Modal visible={wordOpen} transparent animationType="slide" onRequestClose={() => setWordOpen(false)}>
        <Pressable style={styles.scrim} onPress={() => setWordOpen(false)} accessibilityRole="button" accessibilityLabel="Close word by word" />
        <View style={[styles.sheet, { backgroundColor: theme.bar }]}>
          <Text style={[styles.aaTitle, { color: theme.text }]}>Word by word</Text>
          <ScrollView>
            {(verse?.word_breakdown ?? []).map((w, i) => {
              const meaning = (w as { meaning?: string }).meaning ?? "";
              const isDev = /[ऀ-ॿ]/.test(meaning);
              return (
                <View key={i} style={styles.wordRow}>
                  <Text style={[script("bold"), { color: theme.text, fontSize: 18 }]}>{(w as { word?: string }).word ?? ""}</Text>
                  <Text style={{ color: theme.soft, fontSize: 13 }}>{(w as { iast?: string }).iast ?? ""}</Text>
                  <Text style={{ color: theme.text, fontSize: 14 }}>
                    {isDev ? `Stem: ${meaning}` : meaning}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
          <Pressable onPress={() => setWordOpen(false)} accessibilityRole="button" accessibilityLabel="Close" style={styles.closeBtn}>
            <Text style={{ color: theme.text, fontWeight: "700" }}>Close</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

function ReaderPageView({
  verse,
  themeName,
  readerScale,
  roman,
  onWordByWord,
  onLearn,
}: {
  verse: Shloka | undefined;
  themeName: ReaderThemeName;
  readerScale: number;
  roman: boolean;
  onWordByWord: () => void;
  onLearn: () => void;
}) {
  const theme = READER_THEMES[themeName];
  if (!verse) {
    return (
      <View style={styles.page}>
        <Text style={{ color: theme.soft }}>No verses yet.</Text>
      </View>
    );
  }
  const lines = breakVerse(verse.devanagari);
  return (
    <ScrollView contentContainerStyle={[styles.page, { backgroundColor: theme.page, flexGrow: 1, justifyContent: "center" }]}>
      <Text style={[styles.runningHead, { color: theme.soft }]}>{verse.source_ref}</Text>
      <View style={styles.verseBlock}>
        {lines.map((l, i) => (
          <Text key={i} style={[sanskritText(Math.round(22 * readerScale)), { color: theme.text, textAlign: "center" }]}>
            {l}
          </Text>
        ))}
      </View>
      {roman && !!verse.iast && (
        <Text style={[styles.roman, { color: theme.soft }]}>{verse.iast}</Text>
      )}
      <View style={[styles.rule, { backgroundColor: theme.accent }]} />
      {!!verse.translation_en && <Text style={[styles.trans, { color: theme.text }]}>{plain(verse.translation_en)}</Text>}
      {!!(verse as { translation_hi?: string }).translation_hi && (
        <Text style={[styles.transHi, { color: theme.soft }]}>{plain((verse as { translation_hi?: string }).translation_hi ?? "")}</Text>
      )}
      <Pressable onPress={onWordByWord} accessibilityRole="button" accessibilityLabel="Word by word" style={styles.wbw}>
        <Text style={[styles.wbwText, { color: theme.soft }]}>Word by word ^</Text>
      </Pressable>
      <Pressable onPress={onLearn} accessibilityRole="button" accessibilityLabel="Learn this verse" style={styles.wbw}>
        <Text style={[styles.wbwText, { color: theme.soft }]}>Learn</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  page: { paddingHorizontal: 16, paddingVertical: 24, alignItems: "center", gap: 8 },
  runningHead: { fontSize: 12, textAlign: "center" },
  verseBlock: { gap: 2, alignItems: "center" },
  roman: { fontStyle: "italic", fontSize: 14, textAlign: "center" },
  rule: { width: 48, height: 2, borderRadius: 1, marginVertical: 8 },
  trans: { fontSize: 16, lineHeight: 24, textAlign: "center" },
  transHi: { fontSize: 15, lineHeight: 23, textAlign: "center" },
  wbw: { minHeight: 44, justifyContent: "center", paddingHorizontal: 16 },
  wbwText: { fontSize: 14, textAlign: "center" },
  folio: { paddingVertical: 6, alignItems: "center", borderTopWidth: 1 },
  folioText: { fontSize: 12 },
  progress: { height: 3, width: "100%", marginTop: 4 },
  progressBar: { height: 3 },
  topBar: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingBottom: 8 },
  topTitle: { flex: 1, fontWeight: "800", fontSize: 16 },
  modeSwitch: { flexDirection: "row", gap: 4 },
  modeBtn: { minHeight: 44, minWidth: 60, alignItems: "center", justifyContent: "center", paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.5, borderColor: "#D9C9AE" },
  modeText: { fontWeight: "800", fontSize: 13 },
  playerWrap: { position: "absolute", bottom: 0, left: 0, right: 0, borderTopWidth: 1, borderTopColor: "#EFE3CE" },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 8, gap: 4 },
  posText: { fontSize: 12, textAlign: "center" },
  middleTap: { position: "absolute", left: "25%", right: "25%", top: "30%", bottom: "30%" },
  scrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)" },
  aaPanel: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, gap: 12, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  aaTitle: { fontWeight: "800", fontSize: 16 },
  aaRow: { flexDirection: "row", gap: 8 },
  aaRowBetween: { flexDirection: "row", justifyContent: "space-between", minHeight: 44, alignItems: "center" },
  swatch: { flex: 1, minHeight: 48, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  sizeBtn: { flex: 1, minHeight: 44, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  sheet: { position: "absolute", bottom: 0, left: 0, right: 0, maxHeight: "70%", padding: 16, gap: 8, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  wordRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#eee", gap: 2 },
  closeBtn: { minHeight: 48, alignItems: "center", justifyContent: "center" },
});
