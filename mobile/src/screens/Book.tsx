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
import { useIsFocused } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { RootStackParamList } from "../navigation/types";
import { api, type Shloka } from "../api/client";
import { cachedGet } from "../services/apiCache";
import PageCurlBook, { useBookPage } from "../components/book/PageCurlBook";
import ReaderSlider from "../components/ReaderSlider";
import ChantList from "../components/chant/ChantList";
import ChantPlayer from "../components/chant/ChantPlayer";
import { useBookPages } from "../hooks/useBookPages";
import { useChant } from "../hooks/useChant";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useAsk } from "../ask/AskProvider";
import { READER_THEMES, READER_SIZES, type ReaderThemeName } from "./readerTheme";
import { color, isDarkScheme, sanskritText } from "../theme";
import { plain } from "../utils/text";
import { resolveReadingStart } from "../services/readingProgress";
import { pageId, savePageActivity } from "../services/bookActivity";
import { useBookActivity } from "../hooks/useBookActivity";
import { nextChapter, prevChapter } from "../utils/paged";
import { VerseArtworkPage, VerseArtworkTop } from "../components/artwork/VerseArtworkViews";
import ReadingAppearanceSettings from "../components/artwork/ReadingAppearanceSettings";
import { verseArtworkFor } from "../components/artwork/verseArtwork";
import { prefetchArtwork } from "../services/artworkCache";
import { useReadingAppearance, type ReadingAppearance } from "../services/readingAppearance";

type Props = NativeStackScreenProps<RootStackParamList, "Book">;

const THEME_KEY = "shabd.read.theme";
const SIZE_KEY = "shabd.read.size";

function breakVerse(dev: string): string[] {
  return (dev || "").split(/(?<=[।॥])/).map((s) => s.trim()).filter(Boolean);
}

export default function BookScreen(props: Props) {
  const { bookKey, chapter, index } = props.route.params;
  const requestKey = JSON.stringify([bookKey, chapter, index]);
  const [resolved, setResolved] = useState<{ key: string; chapter?: string; index: number } | null>(null);
  useEffect(() => {
    let alive = true;
    if (index !== undefined) { setResolved({ key: requestKey, chapter, index }); return; }
    void resolveReadingStart(bookKey, chapter, index, async () => {
      const catalogue = await cachedGet("canon", api.canon, 30 * 60_000);
      if (!catalogue.texts.some(text => text.slug === bookKey && text.paged)) return undefined;
      const contents = await cachedGet(`paged-chapters-${bookKey}`, () => api.canonChapters(bookKey));
      return contents.preview.chapter;
    }).then(start => { if (alive) setResolved({ key: requestKey, ...start }); })
      .catch(() => { if (alive) setResolved({ key: requestKey, chapter, index: 0 }); });
    return () => { alive = false; };
  }, [requestKey, bookKey, chapter, index]);
  if (!resolved || resolved.key !== requestKey) return <View style={{ flex: 1, backgroundColor: color.bg }} />;
  return <BookReader {...props} route={{ ...props.route, params: { ...props.route.params, chapter: resolved.chapter, index: resolved.index } }} />;
}

function BookReader({ navigation, route }: Props) {
  const { bookKey, index, chapter, mode: startMode } = route.params;
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const reduced = useReducedMotion();
  const ask = useAsk();
  const [controls, setControls] = useState(false);
  const [aaOpen, setAaOpen] = useState(false);
  const [indexOpen, setIndexOpen] = useState(false);
  const [indexTab, setIndexTab] = useState<"pages" | "chapters" | "bookmarks">("pages");
  const activity = useBookActivity()[bookKey] ?? [];
  // Paper follows the app (Light or Dark) until the reader picks one in Aa.
  const [themeName, setThemeName] = useState<ReaderThemeName>(isDarkScheme() ? "dark" : "light");
  const [sizeStep, setSizeStep] = useState(1);
  const { appearance, updateAppearance } = useReadingAppearance();
  const roman = appearance.roman;
  // Focused previous/current/next view instead of the whole chapter list.
  const [focus, setFocus] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((v) => {
      if (v === "light" || v === "sepia" || v === "dark") setThemeName(v);
    });
    AsyncStorage.getItem(SIZE_KEY).then((v) => {
      const n = Number(v);
      if (v !== null && Number.isFinite(n) && READER_SIZES.includes(n)) setSizeStep(READER_SIZES.indexOf(n));
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
  const currentPage = pages[showAt];
  // Option A gives each painted verse two sheets in the book: its painting,
  // then the verse. Everything else (slider, index, bookmarks, the saved
  // position) still counts verses; the book alone counts sheets.
  const sheets = useMemo(() => {
    const out: { verse: number; art: boolean }[] = [];
    pages.forEach((page, i) => {
      if (appearance.layout === "pages" && verseArtworkFor(page.source_ref)) out.push({ verse: i, art: true });
      out.push({ verse: i, art: false });
    });
    if (nextCh) out.push({ verse: pages.length, art: false });
    return out;
  }, [pages, !!nextCh, appearance.layout]); // eslint-disable-line react-hooks/exhaustive-deps
  const [sheetAt, setSheetAt] = useState(0);
  const sheetIndex = sheets[sheetAt]?.verse === showAt ? sheetAt : Math.max(0, sheets.findIndex((sheet) => sheet.verse === showAt));
  const currentMark = currentPage ? activity.find(item => item.chapter === pagedChapter && item.id === pageId(currentPage)) : undefined;
  useEffect(() => {
    if (!currentPage || currentMark?.read || !isFocused || indexOpen || aaOpen) return;
    const timer = setTimeout(() => { void savePageActivity(bookKey, pagedChapter, currentPage, showAt, "read").catch(() => {}); }, 1200);
    return () => clearTimeout(timer);
  }, [bookKey, pagedChapter, currentPage, currentMark?.read, showAt, isFocused, indexOpen, aaOpen]);
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

  const chantOn = startMode === "chant" && hasChant;

  // The folio: where the reader is, and the bookmark for this page.
  const folioRef = pages.length > 0 && showAt >= pages.length && nextCh
    ? `Next: chapter ${nextCh.chapter}`
    : pages[showAt]?.source_ref ?? "";
  const folioCount = pages[showAt] ? `${showAt + 1} / ${pages.length}` : "";
  const bookmarkButton = currentPage ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={currentMark?.bookmarked ? "Remove bookmark" : "Bookmark this page"}
      accessibilityState={{ selected: !!currentMark?.bookmarked }}
      onPress={() => { void savePageActivity(bookKey, pagedChapter, currentPage, showAt, "bookmark", !currentMark?.bookmarked).catch(() => {}); }}
      style={styles.folioIcon}
    >
      <Ionicons name={currentMark?.bookmarked ? "bookmark" : "bookmark-outline"} size={18} color={theme.accent} />
    </Pressable>
  ) : null;

  return (
    <View style={[styles.root, { backgroundColor: theme.page, paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }]}>
      <StatusBar style={themeName === "dark" ? "light" : "dark"} />
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
          key={`${pagedChapter ?? "book"}:${appearance.layout}`}
          index={sheetIndex}
          count={Math.max(1, sheets.length)}
          // A turned page puts the bars away, as a book's margins go quiet.
          onIndexChange={(s) => { setSheetAt(s); setAt(sheets[s]?.verse ?? s); setControls(false); }}
          reducedMotion={reduced}
          labelFor={(s) => pages[sheets[s]?.verse ?? s]?.source_ref ?? (nextCh ? "Next chapter" : "")}
          renderPage={(s) => {
            const i = sheets[s]?.verse ?? s;
            if (sheets[s]?.art && pages[i]) {
              return (
                <Pressable style={{ flex: 1 }} onPress={() => setControls(c => !c)} accessibilityRole="button" accessibilityLabel={`Painting for ${pages[i].source_ref}. Turn the page for the verse`}>
                  <VerseArtworkPage sourceRef={pages[i].source_ref} page={theme.page} soft={theme.soft} />
                </Pressable>
              );
            }
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
                onToggleControls={() => setControls(c => !c)}
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
      {/* Chanting keeps its folio line above the player. */}
      {chantOn && (
        <View style={[styles.folio, { borderColor: theme.line }]}>
          <View style={styles.folioRow}>
            <Text style={[styles.folioRef, { color: theme.text }]} numberOfLines={1}>{folioRef}</Text>
            <Text style={[styles.folioCount, { color: theme.soft }]}>{folioCount}</Text>
            {bookmarkButton}
          </View>
        </View>
      )}
      {chantOn && (
        <View style={[styles.playerWrap, { backgroundColor: theme.page, borderTopColor: theme.line }]}>
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
      {chantOn && <Pressable
        onPress={() => setControls((c) => !c)}
        accessibilityRole="button"
        accessibilityLabel={controls ? "Hide controls" : "Show controls"}
        style={styles.middleTap}
      />}
      {/* Tap the page for the bars; they float over it, so the page never
          shrinks to make room, and a page turn puts them away. */}
      {controls && <View style={[styles.topBar, { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right, backgroundColor: theme.bar, borderColor: theme.line }]}>
        <View style={styles.topRow}>
          <Pressable onPress={() => setIndexOpen(true)} accessibilityRole="button" accessibilityLabel="Book index" style={styles.toolbarAction}>
            <Ionicons name="list-outline" size={18} color={theme.text} /><Text style={[styles.toolbarText, { color: theme.text }]}>Index</Text>
          </Pressable>
          <Pressable onPress={() => ask.open({ surface: "read", subject: verse?.devanagari ?? "" })} accessibilityRole="button" accessibilityLabel="Ask anything about this verse" style={styles.toolbarAction}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={theme.text} /><Text style={[styles.toolbarText, { color: theme.text }]}>Ask anything</Text>
          </Pressable>
          <Pressable onPress={() => setAaOpen(true)} accessibilityRole="button" accessibilityLabel="Format reading page" style={styles.toolbarAction}>
            <Text style={{ color: theme.text, fontSize: 17, fontFamily: "Nunito_800ExtraBold", fontWeight: "800" }}>Aa</Text><Text style={[styles.toolbarText, { color: theme.text }]}>Format</Text>
          </Pressable>
        </View>
      </View>}
      {controls && !chantOn && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8, paddingLeft: insets.left + 20, paddingRight: insets.right + 20, backgroundColor: theme.bar, borderColor: theme.line }]}>
          {/* Back a chapter, offered on its first page (a swipe back inside
              a chapter stays inside it). */}
          {showAt === 0 && prevCh && (
            <Pressable
              onPress={() => openChapter(prevCh.chapter)}
              accessibilityRole="button"
              accessibilityLabel={`Previous chapter, chapter ${prevCh.chapter}`}
              style={styles.prevCh}
            >
              <Ionicons name="arrow-back" size={14} color={theme.soft} />
              <Text style={[styles.prevChText, { color: theme.soft }]}>Chapter {prevCh.chapter}</Text>
            </Pressable>
          )}
          <View style={styles.folioRow}>
            <Text style={[styles.folioRef, { color: theme.text }]} numberOfLines={1}>{folioRef}</Text>
            <Text style={[styles.folioCount, { color: theme.soft }]}>{folioCount}</Text>
            {bookmarkButton}
          </View>
          <ReaderSlider compact accentColor={theme.accent} trackColor={theme.line} tipColor={theme.text} tipTextColor={theme.page}
            index={showAt} count={Math.max(1, pageCount)} labelFor={(i) => pages[i]?.source_ref ?? "Next chapter"} onScrubEnd={setAt} />
        </View>
      )}
      <Modal visible={indexOpen} transparent animationType="fade" onRequestClose={() => setIndexOpen(false)}>
        <Pressable style={styles.scrim} onPress={() => setIndexOpen(false)} accessibilityRole="button" accessibilityLabel="Close book index" />
        <View style={[styles.indexPanel, { height: Math.min(window.height * .8, 650), backgroundColor: theme.bar, paddingBottom: 16 + insets.bottom }]}>
          <View style={styles.aaRowBetween}><View style={{ flex: 1 }}><Text style={[styles.aaTitle, { color: theme.text }]} numberOfLines={1}>{plain(bookTitle)}</Text><Text style={{ color: theme.soft, marginTop: 4 }}>{pagedChapter !== null ? "Chapters" : "Verse index"}</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close index" onPress={() => setIndexOpen(false)} style={styles.iconBtn}><Ionicons name="close" size={22} color={theme.text} /></Pressable>
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginVertical: 14 }}>
            {(["pages", ...(pagedChapter !== null ? ["chapters"] : []), "bookmarks"] as const).map(tab => <Pressable key={tab} onPress={() => setIndexTab(tab as typeof indexTab)} accessibilityRole="button" accessibilityState={{ selected: indexTab === tab }} style={{ paddingHorizontal: 12, minHeight: 40, justifyContent: "center", borderBottomWidth: 2, borderBottomColor: indexTab === tab ? theme.accent : "transparent" }}><Text style={{ color: theme.text, fontWeight: "700" }}>{tab === "pages" ? "Pages" : tab === "chapters" ? "Chapters" : "Bookmarks"}</Text></Pressable>)}
          </View>
          {indexTab === "chapters" ? <FlatList data={chapters ?? []} keyExtractor={item => item.chapter}
            renderItem={({ item }) => { const read = activity.filter(mark => mark.chapter === item.chapter && mark.read).length; return <Pressable accessibilityRole="button" onPress={() => { openChapter(item.chapter); setIndexOpen(false); }} style={[styles.indexRow, { borderColor: theme.line }]}>
              <View style={{ flex: 1 }}><Text style={{ color: theme.text, fontWeight: "700", fontSize: 16 }}>Chapter {item.chapter}</Text><Text style={{ color: theme.soft, marginTop: 4 }}>{read} / {item.count} read</Text></View><Ionicons name={read >= item.count && read > 0 ? "checkmark-circle" : "chevron-forward"} size={18} color={theme.accent} />
            </Pressable>; }} /> : indexTab === "bookmarks" ? <FlatList data={activity.filter(mark => mark.bookmarked)} keyExtractor={item => `${item.chapter}:${item.id}`} ListEmptyComponent={<Text style={{ color: theme.soft, paddingVertical: 24 }}>Tap the bookmark beside the page number to save a page here.</Text>}
            renderItem={({ item }) => <Pressable accessibilityRole="button" onPress={() => {
              const localIndex = pages.findIndex(page => pageId(page) === item.id);
              if (item.chapter === pagedChapter && localIndex >= 0) setAt(localIndex);
              else navigation.setParams({ chapter: item.chapter ?? undefined, index: item.index });
              setIndexOpen(false);
            }} style={[styles.indexRow, { borderColor: theme.line }]}><Ionicons name="bookmark" size={18} color={theme.accent} /><Text style={{ flex: 1, color: theme.text }}>{item.ref}</Text><Text style={{ color: theme.soft }}>{item.read ? "Read" : "Saved"}</Text></Pressable>} /> : <FlatList data={pages} keyExtractor={item => item.id} initialNumToRender={12}
            renderItem={({ item, index: pageIndex }) => { const mark = activity.find(mark => mark.chapter === pagedChapter && mark.id === pageId(item)); return <Pressable accessibilityRole="button" accessibilityLabel={`Read ${item.source_ref}${mark?.read ? ", already read" : ""}${mark?.bookmarked ? ", bookmarked" : ""}`} accessibilityState={{ selected: pageIndex === showAt }} onPress={() => { setAt(pageIndex); setIndexOpen(false); }} style={[styles.indexRow, { borderColor: theme.line, backgroundColor: mark?.read ? theme.line : "transparent", paddingHorizontal: 10 }]}>
              <View style={{ flex: 1 }}><Text style={{ color: theme.soft, fontSize: 12 }}>{item.source_ref}{mark?.read ? " · Read" : ""}</Text><Text numberOfLines={1} style={[sanskritText(18), { color: theme.text }]}>{item.devanagari}</Text></View>
              {mark?.bookmarked && <Ionicons name="bookmark" size={18} color={theme.accent} />}<Ionicons name={mark?.read ? "checkmark-circle" : pageIndex === showAt ? "location-outline" : "chevron-forward"} size={18} color={theme.accent} />
            </Pressable>; }} />}
          <Pressable accessibilityRole="button" accessibilityLabel="Close book" onPress={() => { setIndexOpen(false); navigation.goBack(); }} style={styles.closeBook}><Text style={{ color: theme.text, fontWeight: "700" }}>Close book</Text></Pressable>
        </View>
      </Modal>
      <Modal visible={aaOpen} transparent animationType="fade" onRequestClose={() => setAaOpen(false)}>
        <Pressable style={styles.scrim} onPress={() => setAaOpen(false)} accessibilityRole="button" accessibilityLabel="Close text settings" />
        <ScrollView style={[styles.aaPanel, { maxHeight: "85%", backgroundColor: theme.bar, paddingBottom: 16 + insets.bottom, paddingLeft: 16 + insets.left, paddingRight: 16 + insets.right }]} contentContainerStyle={{ gap: 12 }} keyboardShouldPersistTaps="handled">
          <View style={styles.aaRowBetween}><View><Text style={[styles.aaTitle, { color: theme.text }]}>Make it yours</Text><Text style={{ color: theme.soft, marginTop: 4 }}>A comfortable space to read and recite</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Close format settings" onPress={() => setAaOpen(false)} style={styles.iconBtn}><Ionicons name="close" size={22} color={theme.text} /></Pressable></View>
          <Text style={{ color: theme.soft, fontWeight: "700" }}>PAPER & THEME</Text>
          <View style={styles.aaRow}>
            {(["light", "sepia", "dark"] as ReaderThemeName[]).map((t) => (
              <Pressable key={t} onPress={() => saveTheme(t)} accessibilityRole="button" accessibilityLabel={`${t} theme`} accessibilityState={{ selected: themeName === t }} style={[styles.swatch, { backgroundColor: READER_THEMES[t].page, borderColor: themeName === t ? theme.accent : theme.line }]}>
                <Text style={{ color: READER_THEMES[t].text, fontSize: 12 }}>{t}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={{ color: theme.soft, fontWeight: "700" }}>SANSKRIT SIZE</Text>
          <View style={styles.aaRow}>
            {READER_SIZES.map((s, i) => (
              <Pressable key={s} onPress={() => saveSize(i)} accessibilityRole="button" accessibilityLabel={`Size ${i + 1}`} accessibilityState={{ selected: i === sizeStep }} style={[styles.sizeBtn, i === sizeStep && { backgroundColor: theme.accent }]}>
                <Text style={{ color: i === sizeStep ? theme.page : theme.text, fontSize: 14 + i * 2 }}>अ</Text>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={() => updateAppearance({ roman: !roman })} accessibilityRole="switch" accessibilityState={{ checked: roman }} accessibilityLabel="Show roman transliteration" style={styles.aaRowBetween}>
            <Text style={{ color: theme.text }}>Roman transliteration</Text>
            <Text style={{ color: theme.soft }}>{roman ? "On" : "Off"}</Text>
          </Pressable>
          <ReadingAppearanceSettings value={appearance} onChange={updateAppearance} theme={theme} />
        </ScrollView>
      </Modal>
    </View>
  );
}

export function ReaderPageView({
  verse,
  themeName,
  readerScale,
  roman,
  appearance,
  onLearn,
  onToggleControls,
}: {
  verse: Shloka | undefined;
  themeName: ReaderThemeName;
  readerScale: number;
  roman: boolean;
  appearance: ReadingAppearance;
  onLearn: () => void;
  onToggleControls: () => void;
}) {
  const theme = READER_THEMES[themeName];
  const window = useWindowDimensions();
  const { invalidate } = useBookPage();
  const touch = useRef({ x: 0, y: 0, time: 0, moved: false });
  useEffect(() => { invalidate(); }, [invalidate, appearance, roman, readerScale, themeName]);
  if (!verse) {
    return (
      <View style={styles.page}>
        <Text style={{ color: theme.soft }}>No verses yet.</Text>
      </View>
    );
  }
  const lines = breakVerse(verse.devanagari);
  const painted = appearance.layout === "top" && !!verseArtworkFor(verse.source_ref);
  const textColor = appearance.textColor ?? theme.text;
  const softColor = appearance.textColor ?? theme.soft;
  const sectionStyle = (key: "verse" | "roman" | "meaning" | "hindi", baseSize: number, baseLine: number) => {
    const value = appearance.sections[key];
    return { color: value.textColor ?? (key === "roman" || key === "hindi" ? softColor : key === "verse" ? appearance.textColor ?? theme.verse ?? textColor : textColor), opacity: appearance.textOpacity,
      fontSize: Math.round(baseSize * value.scale), lineHeight: Math.round(baseLine * value.scale),
      ...(value.bold ? { fontWeight: "700" as const, ...(key !== "verse" ? { fontFamily: "Nunito_700Bold" } : {}) } : {}),
    };
  };
  return (
    <View style={{ flex: 1, backgroundColor: theme.page }}>
    <ScrollView contentContainerStyle={[styles.page, { flexGrow: 1, justifyContent: appearance.layout === "top" && painted ? "flex-start" : "center" }]}
      onTouchStart={e => { touch.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY, time: Date.now(), moved: false }; }}
      onTouchMove={e => { if (Math.abs(e.nativeEvent.pageX - touch.current.x) + Math.abs(e.nativeEvent.pageY - touch.current.y) > 8) touch.current.moved = true; }}
      onTouchEnd={() => { if (!touch.current.moved && Date.now() - touch.current.time < 300) onToggleControls(); }}
      accessibilityActions={[{ name: "showControls", label: "Show reader controls" }]}
      onAccessibilityAction={() => onToggleControls()}>

      {/* D: the painting heads the page; the verse follows and the page scrolls. */}
      {painted && <VerseArtworkTop sourceRef={verse.source_ref} maxHeight={Math.round(window.height * 0.62)} onReady={invalidate} />}
      <Text style={[styles.runningHead, { color: softColor, opacity: appearance.textOpacity }]}>{verse.source_ref}</Text>
      <View style={styles.verseBlock}>
        {lines.map((l, i) => (
          <Text key={i} style={[sanskritText(Math.round(22 * readerScale)), { ...sectionStyle("verse", Math.round(22 * readerScale), Math.round(Math.round(22 * readerScale) * 1.75)), textAlign: "center" }]}>
            {l}
          </Text>
        ))}
      </View>
      {roman && !!verse.iast && (
        <Text style={[styles.roman, sectionStyle("roman", 14, 22)]}>{verse.iast}</Text>
      )}
      <View style={[styles.rule, { backgroundColor: theme.accent }]} />
      {!!verse.translation_en && <Text style={[styles.trans, sectionStyle("meaning", 16, 26)]}>{plain(verse.translation_en)}</Text>}
      {!!(verse as { translation_hi?: string }).translation_hi && (
        <Text style={[styles.transHi, sectionStyle("hindi", 16, 26)]}>{plain((verse as { translation_hi?: string }).translation_hi ?? "")}</Text>
      )}
      {/* Owner's pick (2026-10-20, option B): a small square outline. */}
      <Pressable onTouchEnd={e => e.stopPropagation()} onPress={onLearn} accessibilityRole="button" accessibilityLabel="Learn & Recite this verse"
        style={({ pressed }) => [styles.learnButton, { borderColor: textColor, opacity: appearance.textOpacity }, pressed && { backgroundColor: theme.line }]}>
        <Ionicons name="mic-outline" size={16} color={textColor} />
        <Text style={[styles.learnText, { color: textColor }]}>Learn & Recite this verse</Text>
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
  page: { paddingHorizontal: 20, paddingTop: 76, paddingBottom: 32, alignItems: "center", gap: 14 },
  runningHead: { fontSize: 12, textAlign: "center" },
  verseBlock: { gap: 2, alignItems: "center" },
  roman: { fontStyle: "italic", fontSize: 14, textAlign: "center" },
  rule: { width: 48, height: 2, borderRadius: 1, marginVertical: 8 },
  trans: { fontSize: 16, lineHeight: 24, textAlign: "center" },
  transHi: { fontSize: 15, lineHeight: 23, textAlign: "center" },
  endPage: { flexGrow: 1, justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 24, paddingBottom: 32 },
  endMid: { alignItems: "center", gap: 6, marginTop: 56 },
  endDone: { fontSize: 12, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  endNext: { fontSize: 24, fontWeight: "800", textAlign: "center" },
  endBtn: { minHeight: 48, justifyContent: "center", paddingHorizontal: 20 },
  endBtnText: { fontSize: 16, fontWeight: "700" },
  folio: { paddingVertical: 2, paddingHorizontal: 20, borderTopWidth: 1 },
  folioRow: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 40 },
  folioRef: { flex: 1, fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 13 },
  folioCount: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: 12 },
  folioIcon: { width: 44, height: 40, marginRight: -12, alignItems: "center", justifyContent: "center" },
  prevCh: { alignSelf: "flex-start", minHeight: 36, flexDirection: "row", alignItems: "center", gap: 6 },
  prevChText: { fontFamily: "Nunito_700Bold", fontSize: 12, fontWeight: "700" },
  topBar: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 5, elevation: 6, borderBottomWidth: 1 },
  topRow: { flexDirection: "row", alignItems: "stretch", height: 52 },
  toolbarAction: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  toolbarText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 12 },
  bottomBar: { position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 5, elevation: 6, borderTopWidth: 1, paddingTop: 4 },
  learnButton: { flexDirection: "row", alignItems: "center", gap: 8, height: 40, paddingHorizontal: 14, marginTop: 12, borderWidth: 1, borderRadius: 0 },
  learnText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 14 },
  playerWrap: { borderTopWidth: 1 },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  middleTap: { position: "absolute", left: "25%", right: "25%", top: "30%", bottom: "30%" },
  scrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)" },
  indexPanel: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, gap: 12 },
  indexRow: { minHeight: 64, paddingVertical: 12, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  closeBook: { minHeight: 48, alignItems: "center", justifyContent: "center" },
  aaPanel: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, gap: 12 },
  aaTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 23 },
  aaRow: { flexDirection: "row", gap: 8 },
  aaRowBetween: { flexDirection: "row", justifyContent: "space-between", minHeight: 44, alignItems: "center" },
  swatch: { flex: 1, minHeight: 44, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  sizeBtn: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center" },
});
