import Modal from "../components/AudioModal";
// Book: the fullscreen reading page (HANDOVER 7.4) — the one reading screen
// for every book, classic or paged. A paged book reads one chapter at a time;
// its last page turns on to the next chapter, and its first page offers the
// previous one.
// A root-stack screen covering the tab bar. Swipe turns pages, edge taps turn,
// middle tap toggles controls. Themes Light/Sepia/Dark, five sizes, Roman switch.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { setAudioModeAsync } from "expo-audio";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { RootStackParamList } from "../navigation/types";
import type { Shloka } from "../api/client";
import PageCurlBook, { useBookPage } from "../components/book/PageCurlBook";
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
import { nextChapter, prevChapter } from "../utils/paged";
import { downloadBookAudio, saveOfflineBook } from "../services/offlineBooks";
import VerseArtworkBackground from "../components/artwork/VerseArtworkBackground";
import ReadingAppearanceSettings from "../components/artwork/ReadingAppearanceSettings";
import { verseArtworkFor } from "../components/artwork/verseArtwork";
import { prefetchArtwork } from "../services/artworkCache";
import { useReadingAppearance, type ReadingAppearance } from "../services/readingAppearance";

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
  const [downloadStatus, setDownloadStatus] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [aaOpen, setAaOpen] = useState(false);
  const [themeName, setThemeName] = useState<ReaderThemeName>("light");
  const [sizeStep, setSizeStep] = useState(1);
  const [roman, setRoman] = useState(true);
  const { appearance, updateAppearance } = useReadingAppearance();
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
  // in that list) opens the same verse here (shared with Listen). A paged
  // book also brings its chapter list: the last page turns on to the next
  // chapter, and the first page offers the one before.
  const {
    pages,
    chapters,
    pagedChapter,
    chapterLoading,
    chapterFailed,
    chapterRetry,
    title: bookTitle,
    persistAt,
  } = useBookPages(bookKey, chapter ?? null);
  const nextCh = pagedChapter !== null ? nextChapter(chapters ?? [], pagedChapter) : null;
  const prevCh = pagedChapter !== null ? prevChapter(chapters ?? [], pagedChapter) : null;
  const pageCount = pages.length + (nextCh ? 1 : 0);
  const saveOffline = async (withAudio: boolean) => {
    if (downloading) return;
    setDownloading(true); setDownloadStatus("Saving chapter…");
    try {
      await saveOfflineBook(bookKey, pagedChapter, bookTitle, pages);
      if (withAudio) { const count = await downloadBookAudio(pages, bookKey); setDownloadStatus(`Text and ${count} audio clips saved offline.`); }
      else setDownloadStatus("Chapter saved for offline reading.");
    } catch (e) { setDownloadStatus(e instanceof Error ? e.message : "Couldn't save the chapter. Retry."); }
    finally { setDownloading(false); }
  };

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
    wordNow,
    fillFrac,
    isPlaying,
    repeat,
    speed,
    autoplay,
    cycleAutoplay,
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
  } = useChant(pages, bookTitle, {
    initialIndex: index ?? 0,
    navigate,
    // Every verse turn persists; the end page (one past the last verse) is
    // a doorway to the next chapter, not a reading position.
    onAt: (i) => {
      if (i < pages.length) persistAt(i);
    },
    scrollToList: !focus,
    // Name the session so the shelf mini player can reopen this book.
    sessionKey: `chant:${bookKey}:${chapter ?? "*"}`,
    bookKey,
    chapter: chapter ?? null,
  });

  // Opening and switching both start where the params say: on the first
  // commit the bus still holds the previous session's `at`, and a chapter
  // switch rebinds it one render late. Trust the params until it catches up.
  const [bound, setBound] = useState(false);
  useEffect(() => setBound(true), []);
  const [liveChapter, setLiveChapter] = useState(pagedChapter);
  useEffect(() => setLiveChapter(pagedChapter), [pagedChapter]);
  const showAt = !bound ? index ?? 0 : liveChapter === pagedChapter ? at : 0;
  const window = useWindowDimensions();
  const tabletArtwork = Math.min(window.width, window.height) >= 600;
  useEffect(() => {
    if (!appearance.illustrated) return;
    const uris = pages.slice(Math.max(0, showAt), showAt + 3).flatMap(page => {
      const art = verseArtworkFor(page.source_ref);
      return art ? [art.variants[tabletArtwork ? "tablet" : "phone"].uri] : [];
    });
    prefetchArtwork(uris);
  }, [pages, showAt, appearance.illustrated, tabletArtwork]);

  // Turn onto another chapter of the same book — params, not a push, so Back
  // still returns to the index.
  const openChapter = useCallback(
    (ch: string) => {
      navigation.setParams({ chapter: ch, index: 0 });
    },
    [navigation],
  );

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
    <View style={[styles.root, { backgroundColor: theme.page, paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }]}>
      <StatusBar style={themeName === "dark" ? "light" : "dark"} />
      {controls && (
        <View>
          <View style={[styles.topBar, { backgroundColor: theme.bar }]}>
            <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Back to contents" style={styles.iconBtn}>
              <Ionicons name="arrow-back" size={22} color={theme.text} />
            </Pressable>
            <Text style={[styles.topTitle, { color: theme.text }]} numberOfLines={1}>{plain(bookTitle)}</Text>
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
          <View style={{ flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 16 }}>
            <Pressable onPress={() => void saveOffline(false)} disabled={downloading} accessibilityRole="button" accessibilityLabel="Save chapter text offline" style={{ minHeight: 44, justifyContent: "center" }}><Text style={{ color: theme.text }}>Save text offline</Text></Pressable>
            {hasChant && <Pressable onPress={() => void saveOffline(true)} disabled={downloading} accessibilityRole="button" accessibilityLabel="Download prepared chapter audio" style={{ minHeight: 44, justifyContent: "center" }}><Text style={{ color: theme.text }}>Download audio</Text></Pressable>}
            {!!downloadStatus && <Text accessibilityLiveRegion="polite" style={{ color: theme.soft }}>{downloadStatus}</Text>}
          </View>
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
        </View>
      )}
      {chantOn ? (
        <ChantList
          verses={pages}
          playingId={playingId}
          lineNow={lineNow}
          wordNow={wordNow}
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
      ) : chapterLoading && pages.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.notice, { color: theme.soft }]}>Loading chapter…</Text>
        </View>
      ) : chapterFailed && pages.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.notice, { color: theme.text }]}>Couldn't load this chapter.</Text>
          <Pressable onPress={chapterRetry} accessibilityRole="button" accessibilityLabel="Try again" style={styles.retryBtn}>
            <Text style={[styles.retryText, { color: theme.accent }]}>Try again</Text>
          </Pressable>
        </View>
      ) : pagedChapter !== null && pages.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.notice, { color: theme.soft }]}>No verses here yet.</Text>
        </View>
      ) : (
        <PageCurlBook
          // A chapter switch remounts the book on its first page.
          key={pagedChapter ?? "book"}
          index={showAt}
          count={Math.max(1, pageCount)}
          onIndexChange={setAt}
          reducedMotion={reduced}
          labelFor={(i) => pages[i]?.source_ref ?? (nextCh ? "Next chapter" : "")}
          renderPage={(i) => {
            if (i >= pages.length && nextCh) {
              return (
                <NextChapterPage
                  themeName={themeName}
                  bookTitle={plain(bookTitle)}
                  label={`Chapter ${nextCh.chapter}`}
                  verses={nextCh.count}
                  onOpen={() => openChapter(nextCh.chapter)}
                />
              );
            }
            return (
              <ReaderPageView
                verse={pages[i]}
                themeName={themeName}
                readerScale={readerScale}
                roman={roman}
                appearance={appearance}
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
            );
          }}
        />
      )}
      {/* Folio + progress */}
      <View style={[styles.folio, { borderColor: theme.line }]}>
        {/* Back a chapter, offered on its first page (a swipe back inside a
            chapter stays inside it). Floats over the page's foot: showing it
            must not resize the book mid-turn. */}
        {!chantOn && showAt === 0 && prevCh && (
          <Pressable
            onPress={() => openChapter(prevCh.chapter)}
            accessibilityRole="button"
            accessibilityLabel={`Previous chapter, chapter ${prevCh.chapter}`}
            style={styles.prevCh}
          >
            <Ionicons name="arrow-back" size={14} color={theme.soft} />
            <Text style={[styles.prevChText, { color: theme.soft }]}>Previous chapter</Text>
          </Pressable>
        )}
        <Text style={[styles.folioText, { color: theme.soft }]}>
          {pages.length > 0 && showAt >= pages.length && nextCh
            ? `Next chapter · ${nextCh.chapter}`
            : pages[showAt]
              ? `${pages[showAt].source_ref} · ${showAt + 1} of ${pages.length}`
              : ""}
        </Text>
        <View style={[styles.progress, { backgroundColor: theme.line }]}>
          <View style={[styles.progressBar, { width: `${pageCount ? Math.min(100, ((showAt + 1) / pageCount) * 100) : 0}%`, backgroundColor: theme.accent }]} />
        </View>
      </View>
      {controls && !chantOn && (
        <View style={[styles.bottomBar, { backgroundColor: theme.bar }]}>
          <ReaderSlider index={showAt} count={Math.max(1, pageCount)} labelFor={(i) => pages[i]?.source_ref ?? (nextCh ? "Next chapter" : `Page ${i + 1}`)} onScrubEnd={setAt} />
          <Text style={[styles.posText, { color: theme.soft }]}>{`${showAt + 1} of ${pageCount}`}</Text>
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
            autoplay={autoplay}
            onAutoplay={cycleAutoplay}
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
        <ScrollView style={[styles.aaPanel, { maxHeight: "85%", backgroundColor: theme.bar, paddingBottom: 16 + insets.bottom, paddingLeft: 16 + insets.left, paddingRight: 16 + insets.right }]} contentContainerStyle={{ gap: 12 }} keyboardShouldPersistTaps="handled">
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
          <ReadingAppearanceSettings value={appearance} onChange={updateAppearance} theme={theme} />
        </ScrollView>
      </Modal>
      <Modal visible={wordOpen} transparent animationType="slide" onRequestClose={() => setWordOpen(false)}>
        <Pressable style={styles.scrim} onPress={() => setWordOpen(false)} accessibilityRole="button" accessibilityLabel="Close word by word" />
        <View style={[styles.sheet, { backgroundColor: theme.bar, paddingBottom: 16 + insets.bottom, paddingLeft: 16 + insets.left, paddingRight: 16 + insets.right }]}>
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
  appearance,
  onWordByWord,
  onLearn,
}: {
  verse: Shloka | undefined;
  themeName: ReaderThemeName;
  readerScale: number;
  roman: boolean;
  appearance: ReadingAppearance;
  onWordByWord: () => void;
  onLearn: () => void;
}) {
  const theme = READER_THEMES[themeName];
  const { invalidate } = useBookPage();
  useEffect(() => { invalidate(); }, [invalidate, appearance, roman, readerScale, themeName]);
  if (!verse) {
    return (
      <View style={styles.page}>
        <Text style={{ color: theme.soft }}>No verses yet.</Text>
      </View>
    );
  }
  const lines = breakVerse(verse.devanagari);
  const words = verse.word_breakdown ?? [];
  const textColor = appearance.textColor ?? theme.text;
  const softColor = appearance.textColor ?? theme.soft;
  return (
    <View style={{ flex: 1, backgroundColor: theme.page }}>
    {appearance.illustrated && <VerseArtworkBackground sourceRef={verse.source_ref} opacity={appearance.imageOpacity} onReady={invalidate} />}
    <ScrollView contentContainerStyle={[styles.page, { flexGrow: 1, justifyContent: "center" }]}>
      <Text style={[styles.runningHead, { color: softColor, opacity: appearance.textOpacity }]}>{verse.source_ref}</Text>
      <View style={styles.verseBlock}>
        {lines.map((l, i) => (
          <Text key={i} style={[sanskritText(Math.round(22 * readerScale)), { color: textColor, opacity: appearance.textOpacity, textAlign: "center" }]}>
            {l}
          </Text>
        ))}
      </View>
      {roman && !!verse.iast && (
        <Text style={[styles.roman, { color: softColor, opacity: appearance.textOpacity }]}>{verse.iast}</Text>
      )}
      <View style={[styles.rule, { backgroundColor: theme.accent }]} />
      {!!verse.translation_en && <Text style={[styles.trans, { color: textColor, opacity: appearance.textOpacity }]}>{plain(verse.translation_en)}</Text>}
      {!!(verse as { translation_hi?: string }).translation_hi && (
        <Text style={[styles.transHi, { color: softColor, opacity: appearance.textOpacity }]}>{plain((verse as { translation_hi?: string }).translation_hi ?? "")}</Text>
      )}
      {words.length > 0 && (
        <Pressable onPress={onWordByWord} accessibilityRole="button" accessibilityLabel="Word by word" style={styles.wbw}>
          <Text style={[styles.wbwText, { color: theme.soft }]}>Word by word ^</Text>
        </Pressable>
      )}
      <Pressable onPress={onLearn} accessibilityRole="button" accessibilityLabel="Learn this verse" style={styles.wbw}>
        <Text style={[styles.wbwText, { color: theme.soft }]}>Learn</Text>
      </Pressable>
    </ScrollView>
    </View>
  );
}

// The page after a paged chapter's last verse: the way on to the next
// chapter. The button sits low on the page — the middle band belongs to the
// controls tap.
function NextChapterPage({
  themeName,
  bookTitle,
  label,
  verses,
  onOpen,
}: {
  themeName: ReaderThemeName;
  bookTitle: string;
  label: string;
  verses: number;
  onOpen: () => void;
}) {
  const theme = READER_THEMES[themeName];
  return (
    <ScrollView contentContainerStyle={[styles.endPage, { backgroundColor: theme.page }]}>
      <View style={styles.endMid}>
        <Text style={[styles.runningHead, { color: theme.soft }]}>{bookTitle}</Text>
        <Text style={[styles.endDone, { color: theme.soft }]}>Chapter complete</Text>
        <Text style={[styles.endNext, { color: theme.text }]} accessibilityRole="header">
          {label}
        </Text>
        <Text style={[styles.roman, { color: theme.soft }]}>{verses} verses</Text>
      </View>
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`Continue to ${label}`}
        style={styles.endBtn}
      >
        <Text style={[styles.endBtnText, { color: theme.accent }]}>Next chapter →</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 24 },
  notice: { fontSize: 15 },
  retryBtn: { minHeight: 48, justifyContent: "center", paddingHorizontal: 16 },
  retryText: { fontWeight: "700", fontSize: 15 },
  page: { paddingHorizontal: 16, paddingVertical: 24, alignItems: "center", gap: 8 },
  runningHead: { fontSize: 12, textAlign: "center" },
  verseBlock: { gap: 2, alignItems: "center" },
  roman: { fontStyle: "italic", fontSize: 14, textAlign: "center" },
  rule: { width: 48, height: 2, borderRadius: 1, marginVertical: 8 },
  trans: { fontSize: 16, lineHeight: 24, textAlign: "center" },
  transHi: { fontSize: 15, lineHeight: 23, textAlign: "center" },
  wbw: { minHeight: 44, justifyContent: "center", paddingHorizontal: 16 },
  wbwText: { fontSize: 14, textAlign: "center" },
  endPage: { flexGrow: 1, justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 24, paddingBottom: 32 },
  endMid: { alignItems: "center", gap: 6, marginTop: 56 },
  endDone: { fontSize: 12, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  endNext: { fontSize: 24, fontWeight: "800", textAlign: "center" },
  endBtn: { minHeight: 48, justifyContent: "center", paddingHorizontal: 20 },
  endBtnText: { fontSize: 16, fontWeight: "700" },
  folio: { paddingVertical: 6, alignItems: "center", borderTopWidth: 1 },
  prevCh: { position: "absolute", top: -44, left: 0, right: 0, height: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  prevChText: { fontSize: 12, fontWeight: "600" },
  folioText: { fontSize: 12 },
  progress: { height: 3, width: "100%", marginTop: 4 },
  progressBar: { height: 3 },
  topBar: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingBottom: 8 },
  topTitle: { flex: 1, minWidth: 0, fontWeight: "800", fontSize: 16 },
  modeSwitch: { flexDirection: "row", justifyContent: "center", gap: 4, paddingBottom: 8 },
  modeBtn: { minHeight: 44, minWidth: 60, alignItems: "center", justifyContent: "center", paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.5, borderColor: "#D9C9AE" },
  modeText: { fontWeight: "800", fontSize: 13 },
  playerWrap: { borderTopWidth: 1, borderTopColor: "#EFE3CE" },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  bottomBar: { paddingHorizontal: 16, paddingTop: 8, gap: 4 },
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
