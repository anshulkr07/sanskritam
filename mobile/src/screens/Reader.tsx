// Read — the canon as a shelf of books (the Read tab).
//
// Three postures, one screen:
//   • SHELF — book covers first: every canon text in study order plus an
//     "All verses" book, each with live counts and a coverage bar. Empty
//     books stay visible as "coming soon" — a book disappearing until its
//     import lands is how the reader looked incomplete.
//   • BOOK — one book's contents: its cover first (tap it, or "Open book" /
//     "Continue · 5.35"), then chapters in canonical chapter-verse order
//     (never seed-date order), each row opening the book at that verse.
//   • PAGE — the open book: the cover turns away, then every verse is a page
//     that curls like paper under the finger, forward and back
//     (PageCurlBook); scrub the Kindle slider to jump, tap a word chip for
//     its gloss. The Ask sheet opens ONLY from the explicit Ask button —
//     never hijacked by a word tap.
//
// Reading, not drilling (U13-3): no verdict, no streak, no score, no meter of
// any kind. Someone reading the Gītā at night is not in a session.
//
// Rules this screen honours:
//   - The corpus comes from GET /shlokas; the catalogue from GET /canon.
//     A failed fetch says so and offers retry (U10-3) — never a silent empty
//     list and never an infinite skeleton.
//   - Verses are matched to books by ref_prefixes exactly like /canon's
//     counts, so shelf numbers and contents always agree.
//   - Words render from word_breakdown, NOT split from the verse text.
//   - Every text that may hold Sanskrit uses script() (§3.2).
//   - No TTS here (P21: audio goes only on what is studied).
//   - Turns are cosmetic and instant under Reduce Motion (§3.4); Previous /
//     Next and the slider are always there, so turning is never gesture-only.
//   - An open book owns horizontal drags (the drawer's edge swipe is off) and
//     Android back closes it onto its contents.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import type { DrawerNavigationProp } from "@react-navigation/drawer";
import { useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { api, type CanonText, type Shloka, type WordBreakdown } from "../api/client";
import { useQuery } from "../hooks/useQuery";
import { useTypeScale } from "../hooks/useTypeScale";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useAsk } from "../ask/AskProvider";
import { EmptyState, Button, ProgressBar } from "../components/ui";
import { Skeleton, SkeletonGroup } from "../components/Skeleton";
import BookCover from "../components/book/BookCover";
import PageCurlBook, { useBookPage } from "../components/book/PageCurlBook";
import ReaderSlider from "../components/ReaderSlider";
import type { DrawerParamList } from "../navigation/AppDrawer";
import { haptics } from "../services/haptics";
import {
  getReadingPosition,
  getReadingPositions,
  setReadingPosition,
} from "../services/readingProgress";
import {
  firstLine,
  groupByBook,
  groupByChapter,
  makeBookOf,
  parseRef,
  sortVerses,
} from "../utils/verses";
import { color, font, radius, script, shadow, space } from "../theme";
import { plain } from "../utils/text";

// The graded shelf (U14-5 / P22-6): Simple (Units 2–3) · Sandhi (Unit 6) ·
// Compounds (Unit 10). Same page pattern, tier passages mapped onto verses.
const TIERS = [
  { tier: 1, label: "Simple", hint: "Units 2–3" },
  { tier: 2, label: "Sandhi", hint: "Unit 6" },
  { tier: 3, label: "Compounds", hint: "Unit 10" },
] as const;

const ALL_KEY = "all";
const OTHER_KEY = "other";
const gradedKey = (tier: number) => `graded-${tier}`;

interface OpenBook {
  key: string;
  titleEn: string;
  titleSa: string;
  verses: Shloka[];
  /** Planned total for the coverage bar; null hides it (All, Graded). */
  planned: number | null;
  depth: string | null;
}

function ReaderSkeleton() {
  return (
    <>
      <Skeleton width={120} height={26} radius={radius.sm} style={{ marginBottom: space.xs }} />
      <Skeleton width={220} height={14} radius={radius.sm} style={{ marginBottom: space.lg }} />
      <View style={styles.shelfGrid}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height={150} radius={radius.lg} style={{ flex: 1, minWidth: "46%" }} />
        ))}
      </View>
      <SkeletonGroup count={2} height={56} radius={radius.lg} />
    </>
  );
}

export default function ReaderScreen() {
  const { sized } = useTypeScale();
  const reduced = useReducedMotion();
  // null = shelf; set = inside a book. pageIndex null = index, set = reading.
  const [bookKey, setBookKey] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState<number | null>(null);
  // Restored "continue" rows: { [bookKey]: index }.
  const [positions, setPositions] = useState<Record<string, number>>({});
  const navigation = useNavigation();
  const reading = bookKey !== null && pageIndex !== null;

  // An open book owns horizontal drags: the drawer's edge swipe would steal a
  // page turned back from the spine. Given back the moment the book closes.
  useEffect(() => {
    if (!reading) return;
    const drawer = navigation.getParent<DrawerNavigationProp<DrawerParamList>>();
    drawer?.setOptions({ swipeEnabled: false });
    return () => drawer?.setOptions({ swipeEnabled: true });
  }, [reading, navigation]);

  // Android back closes the book onto its contents.
  useEffect(() => {
    if (!reading) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setPageIndex(null);
      return true;
    });
    return () => sub.remove();
  }, [reading]);

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
      .then((rows) =>
        setTierRows(
          rows.map(
            (p, i): Shloka => ({
              id: `tier${p.tier}-${i}`,
              date: "",
              source_ref: `Graded Tier ${p.tier} · verse ${i + 1}`,
              devanagari: p.devanagari,
              iast: p.iast,
              metre: "",
              word_breakdown: p.word_breakdown,
              features: p.features,
              audio_url: "",
            }),
          ),
        ),
      )
      .catch(() => setTierFailed(true))
      .finally(() => setTierLoading(false));
  }, []);

  // Refresh "continue" rows every time the shelf is shown.
  useEffect(() => {
    if (bookKey === null) getReadingPositions().then(setPositions).catch(() => {});
  }, [bookKey]);

  const bookOf = useMemo(() => makeBookOf(canon), [canon]);
  const groups = useMemo(
    () => (verses ? groupByBook(verses, canon) : []),
    [verses, canon],
  );
  const allVerses = useMemo(
    () => (verses ? sortVerses(verses, bookOf) : []),
    [verses, bookOf],
  );

  const openBook: OpenBook | null = useMemo(() => {
    if (!bookKey) return null;
    if (bookKey === ALL_KEY) {
      return {
        key: ALL_KEY,
        titleEn: "All verses",
        titleSa: "सर्वम्",
        verses: allVerses,
        planned: null,
        depth: null,
      };
    }
    if (bookKey === OTHER_KEY) {
      const g = groups.find((x) => x.text === null);
      if (!g) return null;
      return {
        key: OTHER_KEY,
        titleEn: "Other verses",
        titleSa: "अन्यत्",
        verses: g.verses,
        planned: null,
        depth: null,
      };
    }
    if (bookKey.startsWith("graded-")) {
      const tier = parseInt(bookKey.slice("graded-".length), 10);
      const meta = TIERS.find((t) => t.tier === tier);
      if (!meta || !tierRows) return null;
      return {
        key: bookKey,
        titleEn: `Graded · ${meta.label}`,
        titleSa: "अभ्यासः",
        verses: tierRows,
        planned: null,
        depth: null,
      };
    }
    const g = groups.find((x) => x.text?.slug === bookKey);
    if (!g?.text) return null;
    return {
      key: bookKey,
      titleEn: g.text.title_en,
      titleSa: g.text.title_sa,
      verses: g.verses,
      planned: g.text.verses_planned || null,
      depth: g.text.depth,
    };
  }, [bookKey, groups, allVerses, tierRows]);

  // A stale book (corpus shrank under it) falls back to the shelf instead
  // of rendering an empty book. Runs as an effect — never during render.
  useEffect(() => {
    if (bookKey && bookKey !== ALL_KEY && !bookKey.startsWith("graded-")) {
      if (verses && !groups.some((g) => g.text?.slug === bookKey || (bookKey === OTHER_KEY && g.text === null))) {
        setBookKey(null);
        setPageIndex(null);
      }
    }
  }, [bookKey, verses, groups]);

  const openShelf = useCallback(() => {
    haptics.tap();
    setBookKey(null);
    setPageIndex(null);
    setTierTier(null);
    setTierRows(null);
  }, []);

  const enterBook = useCallback(
    async (key: string) => {
      haptics.tap();
      if (key.startsWith("graded-")) {
        const tier = parseInt(key.slice("graded-".length), 10);
        if (tierTier !== tier || !tierRows) loadTier(tier);
      }
      const pos = await getReadingPosition(key).catch(() => 0);
      setBookKey(key);
      // Land on the index, remembering where Continue should resume.
      setPageIndex(null);
      setPositions((p) => ({ ...p, [key]: Number.isFinite(pos) ? pos : 0 }));
    },
    [loadTier, tierTier, tierRows],
  );

  const startReading = useCallback(
    async (book: OpenBook) => {
      haptics.press();
      const pos = await getReadingPosition(book.key).catch(() => 0);
      const safe = Number.isFinite(pos) ? pos : 0;
      const at = Math.min(safe, book.verses.length - 1);
      setPageIndex(Math.max(0, at));
    },
    [],
  );

  const turnTo = useCallback(
    (book: OpenBook, i: number) => {
      if (!Number.isFinite(i)) return;
      const at = Math.max(0, Math.min(book.verses.length - 1, i));
      setPageIndex(at);
      setReadingPosition(book.key, at);
    },
    [],
  );

  // ── Loading / error ──────────────────────────────────────────────
  if (versesQ.loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.body}>
          <ReaderSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (versesQ.failed || !verses) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}>
          <EmptyState
            title="Couldn't load the reader."
            hint="Check your connection and try again."
          />
          <Button label="Try again" tone="primary" onPress={versesQ.retry} style={{ marginTop: space.md }} />
        </View>
      </SafeAreaView>
    );
  }

  if (verses.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}>
          <EmptyState title="Nothing to read yet." hint="Verses will appear here." />
        </View>
      </SafeAreaView>
    );
  }

  // ── PAGE posture ─────────────────────────────────────────────────
  if (bookKey && pageIndex !== null && openBook && openBook.verses.length > 0) {
    const book = openBook;
    const raw = Number.isFinite(pageIndex) ? pageIndex : 0;
    const at = Math.max(0, Math.min(raw, book.verses.length - 1));
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.readHeader}>
          <Pressable
            onPress={() => {
              haptics.tap();
              setPageIndex(null);
            }}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel={`Back to ${book.titleEn} contents`}
          >
            <Ionicons name="arrow-back" size={20} color={color.saffron} />
            <Text style={styles.headerBtnText}>Contents</Text>
          </Pressable>
          <Text style={styles.readPos} numberOfLines={1}>
            {at + 1} / {book.verses.length}
          </Text>
          <Pressable
            onPress={openShelf}
            style={styles.headerBtnRight}
            accessibilityRole="button"
            accessibilityLabel="Back to the bookshelf"
          >
            <Ionicons name="library-outline" size={20} color={color.saffron} />
          </Pressable>
        </View>

        <View style={styles.pageArea}>
          {/* Mounted each time the book is opened, so its cover turns away
              first; keyed per book, since its pages belong to one book. */}
          <PageCurlBook
            key={book.key}
            index={at}
            count={book.verses.length}
            onIndexChange={(i) => turnTo(book, i)}
            renderPage={(i) => {
              const v = book.verses[i];
              return v ? (
                <ReaderPage
                  key={v.id}
                  verse={v}
                  previous={book.verses[i - 1] ?? null}
                  runningTitle={runningTitleFor(book, v)}
                  position={i}
                  total={book.verses.length}
                />
              ) : (
                <View style={styles.page} />
              );
            }}
            cover={
              <BookCover
                variant="full"
                titleSa={book.titleSa}
                titleEn={book.titleEn}
                caption={versesCaption(book)}
              />
            }
            labelFor={(i) => book.verses[i]?.source_ref ?? ""}
            reducedMotion={reduced}
          />
        </View>

        <ReaderSlider
          index={at}
          count={book.verses.length}
          labelFor={(i) => book.verses[i]?.source_ref ?? ""}
          onScrubEnd={(i) => {
            haptics.press();
            turnTo(book, i);
          }}
        />

        <View style={styles.turnRow}>
          <Pressable
            onPress={() => turnTo(book, at - 1)}
            disabled={at <= 0}
            style={[styles.turnBtn, at <= 0 && styles.turnBtnDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Previous verse"
            accessibilityState={{ disabled: at <= 0 }}
          >
            <Ionicons name="chevron-back" size={22} color={at > 0 ? color.saffron : color.inkFaint} />
            <Text style={[styles.turnText, at <= 0 && styles.turnTextDisabled]}>Previous</Text>
          </Pressable>
          <Pressable
            onPress={() => turnTo(book, at + 1)}
            disabled={at >= book.verses.length - 1}
            style={[styles.turnBtn, at >= book.verses.length - 1 && styles.turnBtnDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Next verse"
            accessibilityState={{ disabled: at >= book.verses.length - 1 }}
          >
            <Text style={[styles.turnText, at >= book.verses.length - 1 && styles.turnTextDisabled]}>Next</Text>
            <Ionicons
              name="chevron-forward"
              size={22}
              color={at < book.verses.length - 1 ? color.saffron : color.inkFaint}
            />
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── BOOK posture (index) ─────────────────────────────────────────
  if (bookKey && openBook) {
    // Graded rows still arriving (or failed): the index waits honestly.
    if (bookKey.startsWith("graded-") && (tierLoading || !tierRows)) {
      return (
        <SafeAreaView style={styles.safe} edges={["top"]}>
          <ScrollView contentContainerStyle={styles.body}>
            <BackRow onPress={openShelf} label="Books" />
            <Text style={[styles.title, { fontSize: sized(font.sizes.xl) }]}>Graded reading</Text>
            {tierFailed ? (
              <View style={styles.center}>
                <EmptyState
                  title="Couldn't load these passages."
                  hint="Check your connection and try again."
                />
                <Button
                  label="Try again"
                  tone="primary"
                  onPress={() => tierTier !== null && loadTier(tierTier)}
                  style={{ marginTop: space.md }}
                />
              </View>
            ) : (
              <SkeletonGroup count={4} height={64} radius={radius.lg} />
            )}
          </ScrollView>
        </SafeAreaView>
      );
    }
    return (
      <BookIndex
        book={openBook}
        sized={sized}
        resumeAt={positions[openBook.key] ?? 0}
        onBack={openShelf}
        onStart={() => startReading(openBook)}
        onOpen={(i) => turnTo(openBook, i)}
      />
    );
  }

  // ── SHELF posture ────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={[styles.title, { fontSize: sized(font.sizes.xl) }]}>Read</Text>
        <Text style={[styles.subtitle, { fontSize: sized(font.sizes.sm) }]}>
          Pick a book. Turn its pages. Tap any word.
        </Text>

        <ContinueRows
          groups={groups}
          allCount={allVerses.length}
          positions={positions}
          onResume={(key, at) => {
            const safe = Number.isFinite(at) ? Math.max(0, Math.floor(at)) : 0;
            if (key.startsWith("graded-")) {
              const tier = parseInt(key.slice("graded-".length), 10);
              if (tierTier !== tier || !tierRows) loadTier(tier);
              setBookKey(key);
              setPageIndex(safe);
            } else {
              setBookKey(key);
              setPageIndex(safe);
            }
          }}
        />

        <Text style={styles.sectionTitle}>Books</Text>
        <View style={styles.shelfGrid}>
          <BookCard
            titleSa="सर्वम्"
            titleEn="All verses"
            count={allVerses.length}
            planned={null}
            progress={positions[ALL_KEY] ?? 0}
            onPress={() => enterBook(ALL_KEY)}
          />
          {groups.map((g) =>
            g.text ? (
              <BookCard
                key={g.text.slug}
                titleSa={g.text.title_sa}
                titleEn={plain(g.text.title_en)}
                count={g.verses.length}
                planned={g.text.verses_planned || null}
                depth={g.text.depth}
                progress={positions[g.text.slug] ?? 0}
                onPress={g.verses.length > 0 ? () => enterBook(g.text!.slug) : undefined}
              />
            ) : (
              <BookCard
                key={OTHER_KEY}
                titleSa="अन्यत्"
                titleEn="Other verses"
                count={g.verses.length}
                planned={null}
                progress={positions[OTHER_KEY] ?? 0}
                onPress={() => enterBook(OTHER_KEY)}
              />
            ),
          )}
        </View>

        <Text style={styles.sectionTitle}>Graded reading</Text>
        <Text style={styles.sectionHint}>Short passages, ordered by what you have learned.</Text>
        {TIERS.map((t) => (
          <Pressable
            key={t.tier}
            onPress={() => enterBook(gradedKey(t.tier))}
            style={({ pressed }) => [styles.tierRow, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`Graded reading, ${t.label}, ${t.hint}`}
          >
            <View style={styles.tierIcon}>
              <Ionicons name="trending-up-outline" size={20} color={color.saffron} />
            </View>
            <View style={styles.tierText}>
              <Text style={styles.tierLabel}>{t.label}</Text>
              <Text style={styles.tierHint}>{t.hint}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={color.inkSoft} />
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Shelf pieces ───────────────────────────────────────────────────

function ContinueRows({
  groups,
  allCount,
  positions,
  onResume,
}: {
  groups: { text: CanonText | null; verses: Shloka[] }[];
  allCount: number;
  positions: Record<string, number>;
  onResume: (key: string, at: number) => void;
}) {
  const rows: { key: string; title: string; at: number; total: number }[] = [];
  const push = (key: string, title: string, total: number) => {
    const at = positions[key] ?? 0;
    if (total > 0 && at > 0 && at < total) rows.push({ key, title, at, total });
  };
  push(ALL_KEY, "All verses", allCount);
  for (const g of groups) {
    if (g.text) push(g.text.slug, g.text.title_en, g.verses.length);
    else push(OTHER_KEY, "Other verses", g.verses.length);
  }
  for (const t of TIERS) push(gradedKey(t.tier), `Graded · ${t.label}`, Number.MAX_SAFE_INTEGER);
  if (rows.length === 0) return null;
  return (
    <View style={styles.continueBlock}>
      {rows.slice(0, 3).map((r) => (
        <Pressable
          key={r.key}
          onPress={() => {
            haptics.tap();
            onResume(r.key, r.at);
          }}
          style={({ pressed }) => [styles.continueRow, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`Continue ${r.title} at page ${r.at + 1}`}
        >
          <Ionicons name="bookmark" size={18} color={color.saffron} />
          <View style={styles.continueText}>
            <Text style={styles.continueTitle}>Continue · {r.title}</Text>
            <Text style={styles.continueSub}>
              Page {r.at + 1}
              {r.total !== Number.MAX_SAFE_INTEGER ? ` of ${r.total}` : ""}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={color.inkSoft} />
        </Pressable>
      ))}
    </View>
  );
}

function BookCard({
  titleSa,
  titleEn,
  count,
  planned,
  depth,
  progress,
  onPress,
}: {
  titleSa: string;
  titleEn: string;
  count: number;
  planned: number | null;
  depth?: string;
  progress: number;
  onPress?: () => void;
}) {
  const coming = count === 0;
  const pct = planned ? Math.min(1, count / planned) : count > 0 ? 1 : 0;
  return (
    <Pressable
      onPress={onPress}
      disabled={coming}
      style={({ pressed }) => [
        styles.bookCard,
        pressed && !coming && styles.pressed,
        coming && styles.bookCardComing,
      ]}
      accessibilityRole="button"
      accessibilityLabel={
        coming ? `${titleEn}. Coming soon.` : `${titleEn}. ${count} verses.`
      }
      accessibilityState={{ disabled: coming }}
    >
      <Text style={[styles.bookSa, script("bold")]} numberOfLines={1}>
        {titleSa}
      </Text>
      <Text style={styles.bookEn} numberOfLines={2}>
        {titleEn}
      </Text>
      {coming ? (
        <View style={styles.comingBadge}>
          <Text style={styles.comingText}>Coming soon</Text>
        </View>
      ) : (
        <>
          <Text style={styles.bookCount}>
            {count}{planned ? ` / ${planned}` : ""} verse{count === 1 ? "" : "s"}
            {progress > 0 && progress < count ? ` · p.${progress + 1}` : ""}
          </Text>
          <ProgressBar progress={pct} height={8} style={{ marginTop: 6 }} />
        </>
      )}
      {depth === "index" && !coming && (
        <Text style={styles.bookDepth}>Catalogue selections</Text>
      )}
    </Pressable>
  );
}

// ─── Book index ─────────────────────────────────────────────────────

function BackRow({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.backRow}
      accessibilityRole="button"
      accessibilityLabel={`Back to ${label}`}
    >
      <Ionicons name="arrow-back" size={20} color={color.saffron} />
      <Text style={styles.backText}>{label}</Text>
    </Pressable>
  );
}

/** "47 verses", or "47 of 700 verses" when the book's size is known. */
function versesCaption(book: OpenBook): string {
  const n = book.verses.length;
  if (book.planned) return `${n} of ${book.planned} verses`;
  return `${n} verse${n === 1 ? "" : "s"}`;
}

/** A verse's address for labels — "5.35" — or its whole reference when it has none. */
function addressOf(v: Shloka): string {
  const { nums } = parseRef(v.source_ref);
  return nums.length > 0 ? nums.join(".") : v.source_ref;
}

/** A page's running head: the book, or in a mixed book the verse's own source. */
function runningTitleFor(book: OpenBook, v: Shloka): string {
  return book.key === ALL_KEY || book.key === OTHER_KEY ? parseRef(v.source_ref).book : book.titleEn;
}

function BookIndex({
  book,
  sized,
  resumeAt,
  onBack,
  onStart,
  onOpen,
}: {
  book: OpenBook;
  sized: (pt: number, opts?: { sanskrit?: boolean }) => number;
  resumeAt: number;
  onBack: () => void;
  onStart: () => void;
  onOpen: (i: number) => void;
}) {
  const chapters = useMemo(() => groupByChapter(book.verses), [book]);
  // Flat position of each verse for index → page jumps.
  const positions = useMemo(() => {
    const map = new Map<string, number>();
    book.verses.forEach((v, i) => map.set(v.id, i));
    return map;
  }, [book]);
  const resume = Math.max(0, Math.min(resumeAt, book.verses.length - 1));
  const started = resume > 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.body}>
        <BackRow onPress={onBack} label="Books" />
        {/* The book itself: tap the cover (or the button) to open it. */}
        <BookCover
          variant="card"
          titleSa={book.titleSa}
          titleEn={book.titleEn}
          caption={versesCaption(book)}
          bookmarked={started}
          onPress={onStart}
        />
        <Button
          label={started ? `Continue · ${addressOf(book.verses[resume])}` : "Open book"}
          tone="primary"
          block
          icon={<Ionicons name={started ? "bookmark" : "book"} size={20} color={color.white} />}
          onPress={onStart}
          style={{ marginTop: space.md }}
        />
        <Text style={[styles.subtitle, { fontSize: sized(font.sizes.sm), marginTop: space.md }]}>
          Tap a verse to open it.
        </Text>

        {chapters.map((ch) => (
          <View key={ch.label} style={styles.chapterBlock}>
            <Text style={styles.chapterLabel}>{ch.label}</Text>
            {ch.verses.map((v) => {
              const at = positions.get(v.id) ?? 0;
              const { nums } = parseRef(v.source_ref);
              const num = nums.length > 0 ? nums[nums.length - 1] : at + 1;
              return (
                <Pressable
                  key={v.id}
                  onPress={() => {
                    haptics.tap();
                    onOpen(at);
                  }}
                  style={({ pressed }) => [styles.indexRow, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`${v.source_ref}. ${firstLine(v.devanagari)}`}
                >
                  <View style={styles.indexNum}>
                    <Text style={styles.indexNumText}>{num}</Text>
                  </View>
                  <View style={styles.indexText}>
                    <Text style={styles.indexRef}>{v.source_ref}</Text>
                    <Text style={[styles.indexPreview, script("semibold")]} numberOfLines={1}>
                      {firstLine(v.devanagari)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={color.inkFaint} />
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── The page ───────────────────────────────────────────────────────
// Owns its selected word: a tap shows the gloss inline. The Ask sheet opens
// ONLY from the explicit button — a word tap that summons a modal is the
// "verse loads nothing" bug wearing a costume.

function ReaderPage({
  verse,
  previous,
  runningTitle,
  position,
  total,
}: {
  verse: Shloka;
  /** The verse on the page before — a new chapter starts where they differ. */
  previous: Shloka | null;
  runningTitle: string;
  position: number;
  total: number;
}) {
  const { sized } = useTypeScale();
  const [selected, setSelected] = useState<WordBreakdown | null>(null);
  const { open } = useAsk();
  const { invalidate } = useBookPage();
  const words = verse.word_breakdown ?? [];
  const ref = parseRef(verse.source_ref);
  const chapter = ref.nums.length > 1 ? ref.nums[0] : null;
  const before = previous ? parseRef(previous.source_ref) : null;
  const opensChapter =
    chapter !== null && (!before || before.book !== ref.book || before.nums[0] !== chapter);

  // Whatever this page shows now is what its sheet must show when it turns.
  useEffect(() => {
    invalidate();
  });

  if (!verse) return <View style={styles.page} />;

  return (
    <View style={styles.page}>
      {/* The running head, as a printed book has. */}
      <View style={styles.runningHead}>
        <Text style={styles.runningHeadText} numberOfLines={1}>
          {runningTitle}
        </Text>
        {chapter !== null ? <Text style={styles.runningHeadText}>Chapter {chapter}</Text> : null}
      </View>
      <ScrollView
        style={styles.pageScroll}
        contentContainerStyle={styles.pageBody}
        onScrollEndDrag={invalidate}
        onMomentumScrollEnd={invalidate}
      >
        {opensChapter ? (
          <View style={styles.chapterOpen} accessibilityRole="header">
            <View style={styles.chapterRule} />
            <Text style={styles.chapterOpenText}>Chapter {chapter}</Text>
            <View style={styles.chapterRule} />
          </View>
        ) : null}
        <Text style={styles.pageSource} numberOfLines={1}>
          {verse.source_ref}
        </Text>
        {words.length > 0 ? (
          <View style={styles.wordWrap}>
            {words.map((w, i) => {
              const active = selected?.word === w.word && selected?.meaning === w.meaning;
              return (
                <Pressable
                  key={`${w.word}-${i}`}
                  onPress={() => {
                    haptics.tap();
                    setSelected(active ? null : w);
                  }}
                  style={[styles.wordChip, active && styles.wordChipActive]}
                  accessibilityRole="button"
                  accessibilityLabel={`${w.word}. ${plain(w.meaning)}`}
                  accessibilityState={{ selected: active }}
                >
                  <Text
                    style={[
                      styles.wordText,
                      script("bold"),
                      { fontSize: sized(font.sizes.xl, { sanskrit: true }) },
                      active && styles.wordTextActive,
                    ]}
                  >
                    {w.word}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Text style={[styles.verse, script("bold"), { fontSize: sized(font.sizes.xl, { sanskrit: true }) }]}>
            {verse.devanagari}
          </Text>
        )}
        <Text style={[styles.iast, { fontSize: sized(font.sizes.base) }]}>{verse.iast}</Text>

        {verse.translation_hi ? (
          <View style={styles.gloss}>
            <Text style={[styles.glossWord, script("bold")]} accessibilityRole="header">हिन्दी अर्थ</Text>
            <Text style={[styles.glossMeaning, script("regular"), { fontSize: sized(font.sizes.base, { sanskrit: true }) }]}>
              {plain(verse.translation_hi)}
            </Text>
          </View>
        ) : null}
        {verse.translation_en ? (
          <View style={styles.gloss}>
            <Text style={styles.glossWord} accessibilityRole="header">English meaning</Text>
            <Text style={[styles.glossMeaning, { fontSize: sized(font.sizes.base) }]}>
              {plain(verse.translation_en)}
            </Text>
          </View>
        ) : null}

        {selected && (
          <Animated.View
            entering={FadeIn.duration(160)}
            exiting={FadeOut.duration(120)}
            style={styles.gloss}
          >
            <Text style={[styles.glossWord, script("bold")]}>{selected.word}</Text>
            {selected.meaning ? <Text style={styles.glossMeaning}>{plain(selected.meaning)}</Text> : null}
            {selected.features && selected.features.length > 0 ? (
              <View style={styles.featRow}>
                {selected.features.map((f) => (
                  <View key={f} style={styles.featChip}>
                    <Text style={styles.featText}>{f}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </Animated.View>
        )}

        <Pressable
          onPress={() => open({ surface: "shloka", subject: verse.devanagari })}
          style={styles.askVerse}
          accessibilityRole="button"
          accessibilityLabel="Ask about this whole verse"
        >
          <Ionicons name="help-circle-outline" size={16} color={color.saffronText} />
          <Text style={styles.askVerseText}>Ask about this verse</Text>
        </Pressable>
      </ScrollView>
      <Text style={styles.folio}>
        {ref.nums.length > 0 ? `${ref.nums.join(".")} · ` : ""}
        {position + 1} / {total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.lg },
  body: { padding: space.lg, paddingBottom: 120 },
  title: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: color.ink },
  subtitle: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    color: color.inkSoft,
    marginTop: 2,
    marginBottom: space.md,
    lineHeight: 20,
  },
  sectionTitle: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.md,
    color: color.ink,
    marginTop: space.md,
    marginBottom: space.xs,
  },
  sectionHint: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
    marginBottom: space.sm,
  },
  pressed: { transform: [{ translateY: 2 }] },

  // Shelf
  shelfGrid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  bookCard: {
    flex: 1,
    minWidth: "46%",
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.md,
    ...shadow.card,
    borderTopWidth: 4,
    borderTopColor: color.saffron,
  },
  bookCardComing: { opacity: 0.7, borderTopColor: color.border },
  bookSa: { fontSize: font.sizes.lg, color: color.ink },
  bookEn: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.sm,
    color: color.ink,
    marginTop: 2,
    minHeight: 36,
  },
  bookCount: {
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
    fontSize: font.sizes.xs,
    color: color.inkSoft,
    marginTop: 4,
  },
  bookDepth: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    fontSize: font.sizes.xs,
    color: color.inkFaint,
    marginTop: 4,
  },
  comingBadge: {
    alignSelf: "flex-start",
    backgroundColor: color.surfaceMuted,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    marginTop: space.sm,
  },
  comingText: {
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    fontSize: font.sizes.xs,
    color: color.inkSoft,
  },
  continueBlock: { marginBottom: space.sm },
  continueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.md,
    marginBottom: space.xs,
    borderLeftWidth: 4,
    borderLeftColor: color.saffron,
    ...shadow.card,
  },
  continueText: { flex: 1 },
  continueTitle: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.sm,
    color: color.ink,
  },
  continueSub: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    fontSize: font.sizes.xs,
    color: color.inkSoft,
    marginTop: 1,
  },
  tierRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.md,
    marginBottom: space.sm,
    minHeight: 60,
    ...shadow.card,
  },
  tierIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: color.saffronLight,
    alignItems: "center",
    justifyContent: "center",
  },
  tierText: { flex: 1 },
  tierLabel: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.base,
    color: color.ink,
  },
  tierHint: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
  },

  // Book index
  backRow: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44, marginBottom: space.xs },
  backText: {
    color: color.saffronText,
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    fontSize: font.sizes.sm,
  },
  chapterBlock: { marginBottom: space.md },
  chapterLabel: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.sm,
    color: color.saffronText,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: space.xs,
  },
  indexRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: color.surface,
    borderRadius: radius.md,
    padding: space.sm,
    marginBottom: space.xs,
    minHeight: 56,
    ...shadow.card,
  },
  indexNum: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: color.saffronLight,
    alignItems: "center",
    justifyContent: "center",
  },
  indexNumText: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.sm,
    color: color.saffronDeep,
  },
  indexText: { flex: 1 },
  indexRef: {
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    fontSize: font.sizes.xs,
    color: color.saffron,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  indexPreview: { fontSize: font.sizes.base, color: color.ink, marginTop: 1 },

  // Reading header
  readHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.xs,
  },
  headerBtn: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44, minWidth: 64 },
  headerBtnText: { color: color.saffronText, fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm },
  headerBtnRight: { minHeight: 44, minWidth: 64, alignItems: "flex-end", justifyContent: "center" },
  readPos: {
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
    flex: 1,
    textAlign: "center",
  },

  // The open book: PageCurlBook draws the board and page-block; this is the paper.
  pageArea: { flex: 1, paddingHorizontal: space.md, paddingBottom: space.xs },
  page: {
    flex: 1,
    backgroundColor: "#FFFDF7",
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
    borderTopRightRadius: radius.md,
    borderBottomRightRadius: radius.md,
    paddingHorizontal: space.md,
    overflow: "hidden",
  },
  runningHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: space.sm,
    paddingTop: space.sm,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.border,
  },
  runningHeadText: {
    flexShrink: 1,
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    fontSize: font.sizes.xs,
    color: color.inkSoft,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  chapterOpen: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.md },
  chapterRule: { flex: 1, height: 1, backgroundColor: color.saffronLight },
  chapterOpenText: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.sm,
    color: color.saffronText,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  folio: {
    textAlign: "center",
    paddingVertical: 6,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
    fontSize: font.sizes.xs,
    color: color.inkFaint,
  },
  pageSource: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.xs,
    color: color.saffron,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingTop: space.md,
  },
  pageScroll: { flex: 1 },
  pageBody: { paddingBottom: space.xl },
  wordWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: space.sm },
  wordChip: {
    backgroundColor: "rgba(232,91,37,0.07)",
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 6,
    minHeight: 44,
    justifyContent: "center",
  },
  wordChipActive: { backgroundColor: color.saffronLight },
  wordText: { color: color.ink, lineHeight: 34 },
  wordTextActive: { color: color.saffronDeep },
  verse: { color: color.ink, lineHeight: 46, marginTop: space.sm },
  iast: {
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
    color: color.inkSoft,
    marginTop: space.md,
    lineHeight: 22,
  },
  gloss: {
    marginTop: space.md,
    backgroundColor: color.bg,
    borderRadius: radius.md,
    padding: space.md,
    borderLeftWidth: 3,
    borderLeftColor: color.saffron,
  },
  glossWord: { fontSize: font.sizes.lg, color: color.ink },
  glossMeaning: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    fontSize: font.sizes.base,
    color: color.ink,
    marginTop: 4,
    lineHeight: 22,
  },
  featRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: space.sm },
  featChip: {
    backgroundColor: color.surfaceMuted,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
  },
  featText: {
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    fontSize: font.sizes.xs,
    color: color.inkSoft,
  },
  askVerse: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: space.sm,
    minHeight: 44,
    alignSelf: "flex-start",
  },
  askVerseText: {
    color: color.saffronText,
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    fontSize: font.sizes.sm,
  },

  // Turn controls
  turnRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    gap: space.md,
  },
  turnBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    paddingHorizontal: space.lg,
    minHeight: 52,
    flex: 1,
    justifyContent: "center",
    ...shadow.card,
  },
  turnBtnDisabled: { opacity: 0.5 },
  turnText: { color: color.saffronText, fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.base },
  turnTextDisabled: { color: color.inkFaint },
});
