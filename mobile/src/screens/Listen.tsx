import Modal from "../components/AudioModal";
// Listen: the audiobook player (design option A, owner-picked 2026-10-14).
//
// The whole screen takes the book's cover colour, and everything on it is
// cream: the owner asked that a dark ground never carry dark type. Softer
// cream and gold appear only where they still hold 4.5:1 on that colour
// (read/look.ts). Top to bottom: close, book and chapter, the painting, the
// sounding verse with its word lit, the verse's real time, the transport,
// one row of labelled options, and "Up next", which opens the verse list.
// The verse is on screen once; the list lives in its sheet.
//
// Playback is the app-wide listenBus (useChant), so leaving keeps the chant
// going and the shelves' mini player stays in control. The listen position
// is saved for Continue listening; the reading position follows as before.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { ChantLine, Shloka } from "../api/client";
import AlbumArt from "../components/book/AlbumArt";
import { coverColour } from "../components/book/covers";
import KaraokeLine from "../components/chant/KaraokeLine";
import { useBookPages } from "../hooks/useBookPages";
import { useChant } from "../hooks/useChant";
import { useTypeScale } from "../hooks/useTypeScale";
import type { RootStackParamList } from "../navigation/types";
import { addressOf, audioChapters, chapterAt, fmtClock, fmtLong, type AudioChapter } from "../read/audio";
import { CREAM, CREAM_FAINT, T, accentOn, sa, softOn, ui } from "../read/look";
import { nextChantIndex } from "../recite/chantClock";
import { setListenPosition } from "../services/audioProgress";
import { haptics } from "../services/haptics";
import { plain } from "../utils/text";
import { shelfTitle } from "../read/shelves";
import { firstLine, speakerOf } from "../utils/verses";

type Props = NativeStackScreenProps<RootStackParamList, "Listen">;

const MEANING_KEY = "shabd.listen.meaning";

/** The verse's chant lines, or its text split at the daṇḍas when unvoiced. */
function linesOf(v: Shloka | undefined): Pick<ChantLine, "i" | "text" | "start_ms" | "end_ms" | "words">[] {
  if (!v) return [];
  if (v.chant?.lines?.length) return v.chant.lines;
  return (v.devanagari ?? "")
    .split(/(?<=[।॥])/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((text, i) => ({ i, text, start_ms: 0, end_ms: 0 }));
}

/** IAST without the daṇḍa dots and verse number the source keeps
 *  ("… kadācana .\nmā … 'stvakarmaṇi .. 47 .."). */
function cleanIast(iast: string): string {
  return iast
    .split("\n")
    .map((l) => l.replace(/[\s.|]*\d*[\s.|]*$/, "").trim())
    .filter(Boolean)
    .join("\n");
}

export default function ListenScreen({ navigation, route }: Props) {
  const { bookKey, chapter, index } = route.params;
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const { sized } = useTypeScale();
  const { pages, title, titleSa, persistAt } = useBookPages(bookKey, chapter ?? null);

  const fill = coverColour(bookKey);
  const soft = softOn(fill);
  const accent = accentOn(fill);

  const navigate = useCallback(
    (r: string, p?: object) =>
      (navigation as never as { navigate: (rr: string, pp?: object) => void }).navigate(r, p),
    [navigation],
  );
  const {
    playingVerse,
    playingAt,
    playingId,
    lineNow,
    wordNow,
    posMs,
    durMs,
    isPlaying,
    repeat,
    speed,
    autoplay,
    cycleAutoplay,
    hasChant,
    verse,
    startAt,
    stop,
    pick,
    pickLine,
    toggle,
    step,
    openLearn,
    cycleRepeat,
    cycleSpeed,
  } = useChant(pages, title, {
    initialIndex: index ?? 0,
    navigate,
    scrollToList: false,
    // Name the session so the shelves' mini player can reopen this exact
    // player, and playback keeps running after this screen closes.
    sessionKey: `listen:${bookKey}:${chapter ?? "*"}`,
    bookKey,
    chapter: chapter ?? null,
    onAt: (i) => {
      persistAt(i);
      setListenPosition(bookKey, i, chapter ?? null);
    },
  });

  // Player-first: start on open, unless this session is already sounding
  // (coming back from the mini player must not restart the verse).
  const started = useRef(false);
  useEffect(() => {
    if (started.current || !pages.length) return;
    started.current = true;
    if (playingId && pages.some((p) => p.id === playingId)) return;
    const i = Math.min(Math.max(index ?? 0, 0), pages.length - 1);
    if (pages[i]?.chant) startAt(i);
  }, [pages, index, playingId, startAt]);

  // The meaning under the verse is a reading choice, remembered app-wide.
  const [showMeaning, setShowMeaning] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(MEANING_KEY)
      .then((v) => setShowMeaning(v === "1"))
      .catch(() => {});
  }, []);
  const toggleMeaning = () => {
    haptics.tap();
    setShowMeaning((on) => {
      AsyncStorage.setItem(MEANING_KEY, on ? "0" : "1").catch(() => {});
      return !on;
    });
  };

  const [sheet, setSheet] = useState(false);
  const chapters = useMemo(() => audioChapters(pages), [pages]);
  const cur = playingVerse ?? verse;
  const curIdx = cur ? Math.max(0, pages.findIndex((p) => p.id === cur.id)) : playingAt;
  const { chapter: curChapter, pos } = chapterAt(chapters, curIdx);
  const chapterName = chapter
    ? `Chapter ${chapter}`
    : curChapter && curChapter.num !== null && chapters.length > 1
      ? `Chapter ${curChapter.num}`
      : "";
  const lit = !!cur && playingId === cur.id;
  const lines = linesOf(cur);
  const dur = (lit && durMs) || cur?.chant?.duration_ms || 0;
  const at = lit ? Math.min(posMs, dur) : 0;
  const nextIdx = nextChantIndex(pages, curIdx, 1);
  const next = nextIdx >= 0 ? pages[nextIdx] : undefined;
  const counter =
    curChapter && chapters.length > 1
      ? `Verse ${pos + 1} of ${curChapter.verses.length}`
      : pages.length
        ? `Verse ${curIdx + 1} of ${pages.length}`
        : "";
  const art = Math.round(Math.min(width - 140, Math.max(112, height * 0.27)));
  const repeatLabel = repeat === "off" ? "Repeat" : repeat === "verse" ? "This verse" : "Chapter";

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: fill, paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right },
      ]}
    >
      <StatusBar style="light" />
      <View style={styles.top}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Close the player" style={styles.icon}>
          <Ionicons name="chevron-down" size={26} color={CREAM} />
        </Pressable>
        <View style={styles.topText}>
          <Text style={[styles.eyebrow, { color: accent }]} numberOfLines={1}>
            {shelfTitle(title).toUpperCase()}
          </Text>
          {!!chapterName && <Text style={styles.topChapter}>{chapterName}</Text>}
        </View>
        <Pressable
          onPress={() => {
            haptics.tap();
            setSheet(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Verses in this chapter"
          style={styles.icon}
        >
          <Ionicons name="list" size={24} color={CREAM} />
        </Pressable>
      </View>

      <ScrollView style={styles.middle} contentContainerStyle={styles.middleBody} showsVerticalScrollIndicator={false}>
        <AlbumArt bookKey={bookKey} titleSa={titleSa || shelfTitle(title)} size={art} framed />
        {!cur ? (
          <Text style={[styles.note, { color: soft }]}>{pages.length ? "" : "Loading the verses."}</Text>
        ) : (
          <View style={styles.verse} accessibilityLabel={`Now sounding: ${cur.source_ref}`}>
            <Text style={[styles.ref, { color: accent }]}>{addressOf(cur)}</Text>
            {lines.map((ln) => {
              const on = lit && ln.i === lineNow;
              return (
                <Pressable
                  key={ln.i}
                  onPress={() => pickLine(cur, ln.i)}
                  accessibilityRole="button"
                  accessibilityLabel={`Play line ${ln.i + 1}`}
                  style={styles.lineHit}
                >
                  <KaraokeLine
                    line={ln}
                    active={on}
                    wordNow={on ? wordNow : -1}
                    prefix=""
                    style={[
                      sa(Math.max(20, sized(22, { sanskrit: true }))),
                      styles.line,
                      { color: on || !lit ? CREAM : soft },
                    ]}
                    litWordStyle={{ color: accent, fontWeight: "400", textDecorationLine: "underline", textDecorationColor: accent }}
                  />
                </Pressable>
              );
            })}
            {!!cur.iast && <Text style={[styles.iast, { color: soft }]}>{cleanIast(cur.iast)}</Text>}
            {showMeaning && (
              <View style={styles.meaning}>
                {!!cur.translation_en && <Text style={styles.meaningText}>{plain(cur.translation_en)}</Text>}
                {!!cur.translation_hi && (
                  <Text style={[styles.meaningText, { color: soft }]}>{plain(cur.translation_hi)}</Text>
                )}
                {!cur.translation_en && !cur.translation_hi && (
                  <Text style={[styles.meaningText, { color: soft }]}>No meaning written for this verse yet.</Text>
                )}
              </View>
            )}
            {!hasChant && <Text style={[styles.note, { color: soft }]}>No chant yet for this book.</Text>}
          </View>
        )}
      </ScrollView>

      <Scrubber
        lines={lines}
        durMs={dur}
        atMs={at}
        onSeek={(line) => cur && pickLine(cur, line)}
        left={fmtClock(at)}
        middle={counter}
        right={fmtClock(dur)}
        soft={soft}
      />

      <View style={styles.transport}>
        <Pressable onPress={() => step(-1)} accessibilityRole="button" accessibilityLabel="Previous verse" style={styles.skip}>
          <Ionicons name="play-skip-back" size={28} color={CREAM} />
        </Pressable>
        <Pressable
          onPress={() => {
            haptics.press();
            toggle();
          }}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? "Pause" : "Play"}
          style={styles.play}
        >
          <Ionicons name={isPlaying ? "pause" : "play"} size={32} color={fill} />
        </Pressable>
        <Pressable onPress={() => step(1)} accessibilityRole="button" accessibilityLabel="Next verse" style={styles.skip}>
          <Ionicons name="play-skip-forward" size={28} color={CREAM} />
        </Pressable>
      </View>

      <View style={styles.options} accessibilityRole="toolbar">
        <Option label="Speed" a11y={`Speed ${speed} times`} onPress={cycleSpeed} soft={soft} accent={accent}>
          <Text style={styles.speed}>{speed}×</Text>
        </Option>
        <Option label={repeatLabel} a11y={`Repeat: ${repeat}`} on={repeat !== "off"} onPress={cycleRepeat} soft={soft} accent={accent}>
          <Ionicons name="repeat" size={23} color={repeat !== "off" ? accent : CREAM} />
        </Option>
        <Option label="Autoplay" a11y={autoplay ? "Autoplay on" : "Autoplay off"} on={autoplay} onPress={cycleAutoplay} soft={soft} accent={accent}>
          <Ionicons name="infinite" size={24} color={autoplay ? accent : CREAM} />
        </Option>
        <Option label="Meaning" a11y={showMeaning ? "Hide the meaning" : "Show the meaning"} on={showMeaning} onPress={toggleMeaning} soft={soft} accent={accent}>
          <Ionicons name="chatbox-ellipses-outline" size={22} color={showMeaning ? accent : CREAM} />
        </Option>
        <Option label="Practise" a11y="Practise this verse" onPress={openLearn} soft={soft} accent={accent}>
          <Ionicons name="mic-outline" size={23} color={CREAM} />
        </Option>
      </View>

      <Pressable
        onPress={() => {
          haptics.tap();
          setSheet(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={next ? `Up next: ${next.source_ref}. Open the verse list` : "Open the verse list"}
        style={styles.upNext}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.eyebrow, { color: accent }]}>{next ? `UP NEXT · ${addressOf(next)}` : "VERSES"}</Text>
          <Text style={[sa(16), { color: CREAM }]} numberOfLines={1}>
            {next ? firstLine(next.devanagari) : "End of this list"}
          </Text>
        </View>
        <Ionicons name="chevron-up" size={22} color={CREAM} />
      </Pressable>

      <VerseSheet
        visible={sheet}
        onClose={() => setSheet(false)}
        chapters={chapters}
        startChapter={chapters.indexOf(curChapter as AudioChapter)}
        playingId={playingId}
        autoplay={autoplay}
        onAutoplay={cycleAutoplay}
        paged={!!chapter}
        pagedLabel={chapter ? `Chapter ${chapter}` : ""}
        onPick={(v) => {
          setSheet(false);
          pick(v);
        }}
        onPractise={(v) => {
          setSheet(false);
          stop();
          navigate("Recite", { verseUid: v.verse_uid ?? v.id, start: "listen" });
        }}
      />
    </View>
  );
}

/** One labelled option under the transport. */
function Option({
  label,
  a11y,
  on = false,
  onPress,
  soft,
  accent,
  children,
}: {
  label: string;
  a11y: string;
  on?: boolean;
  onPress: () => void;
  soft: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ selected: on }}
      style={styles.option}
    >
      <View style={styles.optionIcon}>{children}</View>
      <Text style={[styles.optionLabel, { color: on ? accent : soft }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/** The verse's time: a track with a tick at each new line (tap to play from
 *  the line under the finger), the elapsed and total time, and where in the
 *  chapter this verse is. */
function Scrubber({
  lines,
  durMs,
  atMs,
  onSeek,
  left,
  middle,
  right,
  soft,
}: {
  lines: { i: number; start_ms: number }[];
  durMs: number;
  atMs: number;
  onSeek: (line: number) => void;
  left: string;
  middle: string;
  right: string;
  soft: string;
}) {
  const [w, setW] = useState(0);
  const frac = durMs > 0 ? Math.min(1, atMs / durMs) : 0;
  const ticks = durMs > 0 ? lines.filter((l) => l.i > 0 && l.start_ms > 0).map((l) => l.start_ms / durMs) : [];
  return (
    <View style={styles.scrub}>
      <Pressable
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
        onPress={(e) => {
          if (w <= 0 || durMs <= 0 || lines.length === 0) return;
          const ms = (e.nativeEvent.locationX / w) * durMs;
          let line = lines[0].i;
          for (const l of lines) if (l.start_ms <= ms) line = l.i;
          onSeek(line);
        }}
        accessibilityRole="adjustable"
        accessibilityLabel={`${left} of ${right}. Tap a line's mark to play from it.`}
        style={styles.scrubHit}
      >
        <View style={styles.scrubTrack} />
        <View style={[styles.scrubFill, { width: `${frac * 100}%` }]} />
        {ticks.map((t) => (
          <View key={t} style={[styles.scrubTick, { left: `${t * 100}%` }]} />
        ))}
        <View style={[styles.scrubThumb, { left: w > 0 ? Math.max(0, Math.min(w - 12, frac * w - 6)) : 0 }]} />
      </Pressable>
      <View style={styles.scrubRow}>
        <Text style={[styles.time, { color: soft }]}>{left}</Text>
        <Text style={[styles.time, { color: soft }]}>{middle}</Text>
        <Text style={[styles.time, { color: soft }]}>{right}</Text>
      </View>
    </View>
  );
}

/** The verse list as a sheet on paper: one chapter at a time, the playing
 *  verse marked, autoplay at hand. Tap plays; long-press practises. */
function VerseSheet({
  visible,
  onClose,
  chapters,
  startChapter,
  playingId,
  autoplay,
  onAutoplay,
  paged,
  pagedLabel,
  onPick,
  onPractise,
}: {
  visible: boolean;
  onClose: () => void;
  chapters: AudioChapter[];
  startChapter: number;
  playingId: string | null;
  autoplay: boolean;
  onAutoplay: () => void;
  paged: boolean;
  pagedLabel: string;
  onPick: (v: Shloka) => void;
  onPractise: (v: Shloka) => void;
}) {
  const insets = useSafeAreaInsets();
  const [ci, setCi] = useState(Math.max(0, startChapter));
  useEffect(() => {
    if (visible) setCi(Math.max(0, startChapter));
  }, [visible, startChapter]);
  const ch = chapters[ci];
  const many = chapters.length > 1;
  const name = paged ? pagedLabel : ch && many && ch.num !== null ? `Chapter ${ch.num}` : "Verses";
  const playingPos = ch ? ch.verses.findIndex((v) => v.id === playingId) : -1;
  const ROW = 60;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.scrim}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close the verse list" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom }]}>
          <View style={styles.handle} />
          <View style={styles.sheetHead}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetTitle} accessibilityRole="header">
                {name}
              </Text>
              {ch && (
                <Text style={styles.sheetMeta}>
                  {ch.verses.length} verses{ch.ms > 0 ? ` · ${fmtLong(ch.ms)}` : ""}
                </Text>
              )}
            </View>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close the verse list" style={styles.icon}>
              <Ionicons name="close" size={24} color={T.ink} />
            </Pressable>
          </View>
          <View style={styles.sheetBar}>
            {many ? (
              <View style={styles.chapterStep}>
                <Pressable
                  onPress={() => setCi((i) => Math.max(0, i - 1))}
                  disabled={ci === 0}
                  accessibilityRole="button"
                  accessibilityLabel="Previous chapter"
                  style={[styles.stepBtn, ci === 0 && { opacity: 0.4 }]}
                >
                  <Ionicons name="chevron-back" size={18} color={T.ink} />
                </Pressable>
                <Text style={styles.stepText}>
                  {ci + 1} of {chapters.length}
                </Text>
                <Pressable
                  onPress={() => setCi((i) => Math.min(chapters.length - 1, i + 1))}
                  disabled={ci >= chapters.length - 1}
                  accessibilityRole="button"
                  accessibilityLabel="Next chapter"
                  style={[styles.stepBtn, ci >= chapters.length - 1 && { opacity: 0.4 }]}
                >
                  <Ionicons name="chevron-forward" size={18} color={T.ink} />
                </Pressable>
              </View>
            ) : (
              <View />
            )}
            <View style={styles.autoRow}>
              <Text style={styles.autoText}>Autoplay</Text>
              <Switch
                value={autoplay}
                onValueChange={onAutoplay}
                trackColor={{ true: T.action, false: T.muted }}
                thumbColor={T.white}
                accessibilityLabel="Autoplay"
              />
            </View>
          </View>
          <FlatList
            key={ch?.label ?? "none"}
            data={ch?.verses ?? []}
            keyExtractor={(v) => v.id}
            style={styles.sheetList}
            getItemLayout={(_, i) => ({ length: ROW, offset: ROW * i, index: i })}
            initialScrollIndex={playingPos > 1 ? playingPos - 1 : 0}
            renderItem={({ item: v, index: i }) => {
              const playing = v.id === playingId;
              const before = playingPos >= 0 && i < playingPos;
              const speaker = speakerOf(v.devanagari);
              const tone = before ? T.ink3 : T.ink;
              return (
                <Pressable
                  onPress={() => {
                    haptics.tap();
                    onPick(v);
                  }}
                  onLongPress={() => onPractise(v)}
                  accessibilityRole="button"
                  accessibilityLabel={`${v.source_ref}${playing ? ", playing" : ""}. Long press to practise.`}
                  style={[styles.vrow, { height: ROW }, playing && styles.vrowOn]}
                >
                  <Text style={[styles.vnum, playing && { color: T.action, ...ui("bold") }]}>{addressOf(v).split(".").pop()}</Text>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    {!!speaker && (
                      <Text style={[sa(12.5), { color: T.ink3, lineHeight: 18 }]} numberOfLines={1}>
                        {speaker}
                      </Text>
                    )}
                    <Text style={[sa(16), { color: tone, lineHeight: 24 }]} numberOfLines={1}>
                      {firstLine(v.devanagari)}
                    </Text>
                  </View>
                  {playing ? (
                    <Text style={styles.playing}>Playing</Text>
                  ) : (
                    <Text style={styles.vdur}>{v.chant ? fmtClock(v.chant.duration_ms) : "no chant"}</Text>
                  )}
                </Pressable>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: { flexDirection: "row", alignItems: "center", paddingHorizontal: 6, minHeight: 56 },
  icon: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  topText: { flex: 1, alignItems: "center", minWidth: 0 },
  eyebrow: { ...ui("bold"), fontSize: 12, letterSpacing: 1.6 },
  topChapter: { ...ui("semibold"), fontSize: 15, color: CREAM },
  middle: { flex: 1 },
  middleBody: { alignItems: "center", paddingHorizontal: 22, paddingTop: 8, paddingBottom: 12 },
  verse: { alignSelf: "stretch", alignItems: "center", marginTop: 20 },
  ref: { ...ui("bold"), fontSize: 13, letterSpacing: 1.2 },
  lineHit: { minHeight: 44, justifyContent: "center" },
  line: { textAlign: "center" },
  iast: { ...ui("regular"), fontSize: 14, lineHeight: 20, textAlign: "center", marginTop: 8 },
  meaning: { marginTop: 14, gap: 8, alignSelf: "stretch" },
  meaningText: { ...ui("regular"), fontSize: 16, lineHeight: 24, color: CREAM, textAlign: "center" },
  note: { ...ui("regular"), fontSize: 14, marginTop: 14, textAlign: "center" },
  scrub: { paddingHorizontal: 24, marginTop: 6 },
  scrubHit: { height: 28, justifyContent: "center" },
  scrubTrack: { position: "absolute", left: 0, right: 0, height: 3, backgroundColor: CREAM_FAINT },
  scrubFill: { position: "absolute", left: 0, height: 3, backgroundColor: CREAM },
  scrubTick: { position: "absolute", width: 2, height: 10, marginLeft: -1, backgroundColor: "rgba(255,248,238,0.6)" },
  scrubThumb: { position: "absolute", width: 12, height: 12, backgroundColor: CREAM },
  scrubRow: { flexDirection: "row", justifyContent: "space-between" },
  time: { ...ui("regular"), fontSize: 12.5, fontVariant: ["tabular-nums"] },
  transport: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 34, marginTop: 10 },
  skip: { width: 56, height: 56, alignItems: "center", justifyContent: "center" },
  play: { width: 74, height: 74, backgroundColor: CREAM, alignItems: "center", justifyContent: "center" },
  options: { flexDirection: "row", paddingHorizontal: 10, marginTop: 12 },
  option: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 58, gap: 2 },
  optionIcon: { height: 26, alignItems: "center", justifyContent: "center" },
  optionLabel: { ...ui("semibold"), fontSize: 11.5 },
  speed: { ...ui("bold"), fontSize: 17, lineHeight: 22, color: CREAM },
  upNext: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 64,
    paddingLeft: 22,
    paddingRight: 16,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,248,238,0.18)",
  },
  scrim: { flex: 1, backgroundColor: T.scrim },
  sheet: { backgroundColor: T.paper, maxHeight: "86%" },
  handle: { alignSelf: "center", width: 36, height: 4, backgroundColor: T.lineStrong, marginTop: 8 },
  sheetHead: { flexDirection: "row", alignItems: "flex-start", paddingLeft: 20, paddingRight: 6, paddingTop: 8 },
  sheetTitle: { ...ui("bold"), fontSize: 21, lineHeight: 27, color: T.ink },
  sheetMeta: { ...ui("regular"), fontSize: 13.5, color: T.ink3 },
  sheetBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginTop: 10, marginBottom: 10 },
  chapterStep: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: T.lineStrong },
  stepBtn: { width: 44, height: 40, alignItems: "center", justifyContent: "center" },
  stepText: { ...ui("semibold"), fontSize: 14, color: T.ink, minWidth: 64, textAlign: "center" },
  autoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  autoText: { ...ui("semibold"), fontSize: 14.5, color: T.ink },
  sheetList: { borderTopWidth: 1, borderTopColor: T.line },
  vrow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: "#EFE6D6" },
  vrowOn: { backgroundColor: T.surface },
  vnum: { ...ui("semibold"), width: 30, fontSize: 13.5, color: T.ink3, fontVariant: ["tabular-nums"] },
  vdur: { ...ui("regular"), fontSize: 13, color: T.ink3, fontVariant: ["tabular-nums"] },
  playing: { ...ui("bold"), fontSize: 12, color: T.action },
});
