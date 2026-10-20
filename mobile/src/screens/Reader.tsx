// Read — the canon as books and as audiobooks (the Read tab).
//
// Two postures, one screen:
//   • HOME — two shelves under Books | Audio tabs (the choice is
//     remembered). Books: a Continue reading card and rows of painted
//     covers (read/BooksHome). Audio: the listening side in each book's own
//     colour (read/AudioHome); its books open the Audiobook page.
//   • CONTENTS — one book: what it is, how far in, Continue and Listen, and
//     its chapters with their first lines (read/BookContents; paged books
//     use PagedBookIndex). Every book's pages — classic or paged — then open
//     the fullscreen Book screen over the tab bar, the one reading screen.
//
// The Read tab button always comes back to HOME; Android back steps from
// contents to HOME.
//
// Reading, not drilling (U13-3): no verdict, no streak, no score here.
//
// Rules this screen honours:
//   - The corpus comes from GET /shlokas; the catalogue from GET /canon.
//     A failed fetch says so and offers retry (U10-3) — never a silent empty
//     list and never an infinite skeleton.
//   - Verses are matched to books by ref_prefixes exactly like /canon's
//     counts, so shelf numbers and contents always agree.
//   - Words render from word_breakdown, NOT split from the verse text.
//   - Every text that may hold Sanskrit uses a Devanagari face.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api, type CanonText, type Shloka } from "../api/client";
import { useQuery } from "../hooks/useQuery";
import { useTypeScale } from "../hooks/useTypeScale";
import { useAskContext } from "../ask/AskProvider";
import { EmptyState, Button } from "../components/ui";
import { Skeleton, SkeletonGroup } from "../components/Skeleton";
import { PagedBookIndex } from "../components/book/PagedBook";
import { isPaged } from "../utils/paged";
import MiniPlayer from "../components/chant/MiniPlayer";
import type { MainTabParamList } from "../navigation/types";
import { haptics } from "../services/haptics";
import { useMiniPlayerUp } from "../services/listenBus";
import { getReadingPosition, getReadingPositions } from "../services/readingProgress";
import { getLastListen, getListenPosition, type ListenPosition } from "../services/audioProgress";
import { groupByBook, makeBookOf, sortVerses, tierVerses } from "../utils/verses";
import { space } from "../theme";
import AudioHome from "../read/AudioHome";
import BookContents, { type ContentsBook } from "../read/BookContents";
import BooksHome from "../read/BooksHome";
import { voicedCount } from "../read/audio";
import { T, ui } from "../read/look";
import type { Media } from "../read/ui";
import { shelfTitle } from "../read/shelves";

// The graded shelf (U14-5 / P22-6): Simple (Units 2–3) · Sandhi (Unit 6) ·
// Compounds (Unit 10). Same page pattern, tier passages mapped onto verses.
const TIERS = [
  { tier: 1, label: "Simple", hint: "Units 2–3" },
  { tier: 2, label: "Sandhi", hint: "Unit 6" },
  { tier: 3, label: "Compounds", hint: "Unit 10" },
] as const;

const ALL_KEY = "all";
const OTHER_KEY = "other";
const MEDIA_KEY = "shabd.read.media";

function ReaderSkeleton() {
  return (
    <>
      <Skeleton width={120} height={30} radius={0} style={{ marginBottom: space.sm }} />
      <Skeleton width={200} height={20} radius={0} style={{ marginBottom: space.lg }} />
      <Skeleton height={190} radius={0} style={{ marginBottom: space.lg }} />
      <SkeletonGroup count={2} height={150} radius={0} />
    </>
  );
}

export default function ReaderScreen() {
  const { sized } = useTypeScale();
  // null = HOME; set = inside a book.
  const [bookKey, setBookKey] = useState<string | null>(null);
  // Restored "continue" positions: { [bookKey]: index }.
  const [positions, setPositions] = useState<Record<string, number>>({});
  // Which shelf is showing: paper books or audio books (remembered).
  const [media, setMediaState] = useState<Media>("books");
  // The most recent listen, for the Audio shelf's band.
  const [lastListen, setLastListen] = useState<{ bookKey: string; pos: ListenPosition } | null>(null);
  const navigation = useNavigation();
  const nav = navigation as unknown as { navigate: (r: string, p: object) => void };
  // Subscribe on every render, including loading and book contents.
  const miniUp = useMiniPlayerUp();
  // "This screen" in Ask reads what is registered here plus on-device OCR.
  useAskContext("read", bookKey ?? "");

  // Corpus (Track C4): cached 60s, deduped, never setState after unmount.
  const versesQ = useQuery<Shloka[]>("reader-verses", api.listShlokas);
  // Catalogue: best-effort — a failure here never blocks reading (the All
  // book still shows); the per-book shelf just stays hidden.
  const canonQ = useQuery<{ texts: CanonText[] }>("canon", api.canon);

  const verses = versesQ.data;
  const canon = useMemo(() => canonQ.data?.texts ?? [], [canonQ.data]);

  // Graded tiers load lazily on open — the shelf must not fire three
  // requests for rows the learner may never touch.
  const [tierTier, setTierTier] = useState<number | null>(null);
  const [tierRows, setTierRows] = useState<Shloka[] | null>(null);
  const [tierLoading, setTierLoading] = useState(false);
  const [tierFailed, setTierFailed] = useState(false);

  const loadTier = useCallback((tier: number) => {
    setTierTier(tier);
    setTierRows(null);
    setTierFailed(false);
    setTierLoading(true);
    api
      .readerTier(tier)
      .then((rows) => setTierRows(tierVerses(rows)))
      .catch(() => setTierFailed(true))
      .finally(() => setTierLoading(false));
  }, []);

  // Refresh positions and the last listen every time HOME is shown.
  useEffect(() => {
    if (bookKey !== null) return;
    getReadingPositions().then(setPositions).catch(() => {});
    getLastListen().then(setLastListen).catch(() => {});
  }, [bookKey, media]);
  // Coming back from the player or a book page also moves them.
  useEffect(
    () =>
      navigation.addListener("focus", () => {
        getReadingPositions().then(setPositions).catch(() => {});
        getLastListen().then(setLastListen).catch(() => {});
      }),
    [navigation],
  );

  // The shelf choice is remembered.
  useEffect(() => {
    AsyncStorage.getItem(MEDIA_KEY)
      .then((v) => v === "audio" && setMediaState("audio"))
      .catch(() => {});
  }, []);

  const setMedia = useCallback((m: Media) => {
    haptics.tap();
    setMediaState(m);
    AsyncStorage.setItem(MEDIA_KEY, m).catch(() => {});
  }, []);

  const bookOf = useMemo(() => makeBookOf(canon), [canon]);
  const groups = useMemo(() => (verses ? groupByBook(verses, canon) : []), [verses, canon]);
  const allVerses = useMemo(() => (verses ? sortVerses(verses, bookOf) : []), [verses, bookOf]);

  const openBook: ContentsBook | null = useMemo(() => {
    if (!bookKey) return null;
    if (bookKey === ALL_KEY) {
      return { key: ALL_KEY, titleEn: "All verses", titleSa: "सर्वम्", verses: allVerses, planned: null, depth: null };
    }
    if (bookKey === OTHER_KEY) {
      const g = groups.find((x) => x.text === null);
      if (!g) return null;
      return { key: OTHER_KEY, titleEn: "Other verses", titleSa: "अन्यत्", verses: g.verses, planned: null, depth: null };
    }
    if (bookKey.startsWith("graded-")) {
      const tier = parseInt(bookKey.slice("graded-".length), 10);
      const meta = TIERS.find((t) => t.tier === tier);
      if (!meta || !tierRows) return null;
      return { key: bookKey, titleEn: `Graded · ${meta.label}`, titleSa: "अभ्यासः", verses: tierRows, planned: null, depth: null };
    }
    const g = groups.find((x) => x.text?.slug === bookKey);
    if (!g?.text) return null;
    return {
      key: bookKey,
      titleEn: shelfTitle(g.text.title_en),
      titleSa: g.text.title_sa,
      verses: g.verses,
      planned: g.text.verses_planned || null,
      depth: g.text.depth,
    };
  }, [bookKey, groups, allVerses, tierRows]);

  // A stale book (corpus shrank under it) falls back to HOME instead of
  // rendering an empty book. Runs as an effect — never during render.
  // Paged books are exempt: their verses never ride GET /shlokas.
  useEffect(() => {
    if (bookKey && bookKey !== ALL_KEY && !bookKey.startsWith("graded-")) {
      if (canon.some((c) => c.slug === bookKey && isPaged(c))) return;
      if (verses && !groups.some((g) => g.text?.slug === bookKey || (bookKey === OTHER_KEY && g.text === null))) {
        setBookKey(null);
      }
    }
  }, [bookKey, verses, groups, canon]);

  const goHome = useCallback(() => {
    setBookKey(null);
    setTierTier(null);
    setTierRows(null);
  }, []);

  const openShelf = useCallback(() => {
    haptics.tap();
    goHome();
  }, [goHome]);

  // The Read tab button always lands on HOME (the shelf last chosen, Books
  // or Audio), from a book's contents or an open paged chapter alike. The
  // tab bar already gives the haptic.
  useEffect(() => {
    const tabs = navigation as unknown as BottomTabNavigationProp<MainTabParamList, "Read">;
    return tabs.addListener("tabPress", goHome);
  }, [navigation, goHome]);

  // Android back: contents close onto HOME. (A book's pages live in the
  // fullscreen Book screen, which handles its own back.)
  useEffect(() => {
    if (bookKey === null) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      goHome();
      return true;
    });
    return () => sub.remove();
  }, [bookKey, goHome]);

  const enterBook = useCallback(
    async (key: string) => {
      if (key.startsWith("graded-")) {
        const tier = parseInt(key.slice("graded-".length), 10);
        if (tierTier !== tier || !tierRows) loadTier(tier);
      }
      const pos = await getReadingPosition(key).catch(() => 0);
      setBookKey(key);
      setPositions((p) => ({ ...p, [key]: Number.isFinite(pos) ? pos : 0 }));
    },
    [loadTier, tierTier, tierRows],
  );

  const turnTo = useCallback(
    (book: ContentsBook, i: number) => {
      if (!Number.isFinite(i)) return;
      const at = Math.max(0, Math.min(book.verses.length - 1, i));
      nav.navigate("Book", { bookKey: book.key, index: at });
    },
    [nav],
  );

  const startReading = useCallback(
    async (book: ContentsBook) => {
      const pos = await getReadingPosition(book.key).catch(() => 0);
      turnTo(book, Number.isFinite(pos) ? pos : 0);
    },
    [turnTo],
  );

  // index -1: wherever the book was left off listening (or its start).
  const listen = useCallback(
    async (key: string, index: number) => {
      let i = index;
      if (i < 0) i = (await getListenPosition(key).catch(() => null))?.index ?? 0;
      nav.navigate("Listen", { bookKey: key, index: Math.max(0, i) });
    },
    [nav],
  );
  const openPlayer = useCallback(
    (key: string, chapter: string | null, index: number) =>
      nav.navigate("Listen", { bookKey: key, index, chapter: chapter ?? undefined }),
    [nav],
  );

  // ── Loading / error ──────────────────────────────────────────────
  // The catalogue is enough to open a paged book. HOME and classic contents
  // wait for the corpus: before it lands every classic book counts 0 verses,
  // so the shelves would flash only the paged books and then rearrange.
  const needsCorpus = bookKey === null || (!bookKey.startsWith("graded-") && !canon.some((c) => c.slug === bookKey && isPaged(c)));
  if (versesQ.loading && (canon.length === 0 || needsCorpus)) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.homeBody}>
          <ReaderSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (versesQ.failed || (!verses && !versesQ.loading)) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}>
          <EmptyState title="Couldn't load the reader." hint="Check your connection and try again." />
          <Button label="Try again" tone="primary" onPress={versesQ.retry} style={{ marginTop: space.md }} />
        </View>
      </SafeAreaView>
    );
  }

  if (verses?.length === 0 && canon.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}>
          <EmptyState title="Nothing to read yet." hint="Verses will appear here." />
        </View>
      </SafeAreaView>
    );
  }

  // ── CONTENTS ─────────────────────────────────────────────────────
  // Paged books first: contents from /canon chapters. A verse row opens the
  // fullscreen Book screen (the one reading screen for every book).
  const pagedText = bookKey ? canon.find((c) => c.slug === bookKey && isPaged(c)) ?? null : null;
  if (bookKey && pagedText) {
    return (
      <PagedBookIndex
        text={pagedText}
        onBack={openShelf}
        onOpenChapter={(ch, idx) => {
          nav.navigate("Book", { bookKey: pagedText.slug, chapter: ch, index: idx });
        }}
      />
    );
  }
  if (bookKey && (openBook || bookKey.startsWith("graded-"))) {
    // Graded rows still arriving (or failed): the contents wait honestly.
    if (!openBook) {
      return (
        <SafeAreaView style={styles.safe} edges={["top"]}>
          <ScrollView contentContainerStyle={styles.homeBody}>
            <Pressable onPress={openShelf} style={styles.back} accessibilityRole="button" accessibilityLabel="Back to Books">
              <Ionicons name="arrow-back" size={20} color={T.ink} />
              <Text style={styles.backText}>Books</Text>
            </Pressable>
            <Text style={[styles.gradedTitle, { fontSize: sized(25) }]}>Graded reading</Text>
            {tierFailed ? (
              <View style={styles.center}>
                <EmptyState title="Couldn't load these passages." hint="Check your connection and try again." />
                <Button
                  label="Try again"
                  tone="primary"
                  onPress={() => tierTier !== null && loadTier(tierTier)}
                  style={{ marginTop: space.md }}
                />
              </View>
            ) : (
              <SkeletonGroup count={4} height={56} radius={0} />
            )}
          </ScrollView>
        </SafeAreaView>
      );
    }
    const isCanon = canon.some((c) => c.slug === openBook.key);
    return (
      <BookContents
        book={openBook}
        resumeAt={positions[openBook.key] ?? 0}
        onBack={openShelf}
        onStart={() => startReading(openBook)}
        onOpen={(i) => turnTo(openBook, i)}
        onListen={isCanon && voicedCount(openBook.verses) > 0 ? () => nav.navigate("Audiobook", { bookKey: openBook.key }) : undefined}
      />
    );
  }

  // ── HOME ─────────────────────────────────────────────────────────
  // Two shelves under one tab, Books and Audio, switched by the tabs in the
  // header. The mini player floats over either while a chant session is live.
  if (media === "audio") {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <AudioHome
          media={media}
          onMedia={setMedia}
          groups={groups}
          lastListen={lastListen}
          onListen={listen}
          onBook={(key) => nav.navigate("Audiobook", { bookKey: key })}
          onOpenPlayer={openPlayer}
        />
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <BooksHome
        media={media}
        onMedia={setMedia}
        groups={groups}
        allVerses={allVerses}
        positions={positions}
        canon={canon}
        onOpen={(key) => nav.navigate("Book", { bookKey: key })}
        onContents={(key) => void enterBook(key)}
        onResume={(key, at) => nav.navigate("Book", { bookKey: key, index: Math.max(0, Math.floor(at)) })}
        bottomPad={miniUp}
      />
      <MiniPlayer onOpen={openPlayer} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.paper },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.lg },
  homeBody: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 120 },
  back: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 48, alignSelf: "flex-start" },
  backText: { ...ui("semibold"), fontSize: 15, color: T.ink },
  gradedTitle: { ...ui("bold"), color: T.ink, marginBottom: space.md },
});
