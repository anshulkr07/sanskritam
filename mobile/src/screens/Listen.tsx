// Listen: the player-first chant screen — the audiobook player.
// One chapter (or book) as continuous audio: the sounding verse large on top
// with its meaning as text, transport right under it, the chapter list below.
// Playback itself is the shared ChantController (useChant), the same player
// Book's Chant mode uses — a fix there fixes it here too.
//
// Audiobook layer: a Verse | Meaning | Both selector (only modes whose audio
// exists for this book are offered), an autoplay toggle, and the listen
// position saved so the Read tab's Audio shelf can offer Continue listening.

import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { RootStackParamList } from "../navigation/types";
import type { ListenMode } from "../services/audioProgress";
import { getListenMode, setListenMode, setListenPosition } from "../services/audioProgress";
import ChantList from "../components/chant/ChantList";
import ChantPlayer from "../components/chant/ChantPlayer";
import KaraokeLine from "../components/chant/KaraokeLine";
import { useBookPages } from "../hooks/useBookPages";
import { useChant } from "../hooks/useChant";
import { color } from "../theme";
import { plain } from "../utils/text";

type Props = NativeStackScreenProps<RootStackParamList, "Listen">;

const MODE_LABEL: Record<ListenMode, string> = {
  verse: "Verse",
  meaning: "Meaning",
  both: "Both",
};

export default function ListenScreen({ navigation, route }: Props) {
  const { bookKey, chapter, index } = route.params;
  const insets = useSafeAreaInsets();
  const { pages, title, persistAt } = useBookPages(bookKey, chapter ?? null);

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
    scrollToCurrent,
  } = useChant(pages, title, {
    initialIndex: index ?? 0,
    navigate,
    // The verse index feeds both memories: the reader's own (as before) and
    // the audiobook's Continue-listening slot.
    onAt: (i) => {
      persistAt(i);
      setListenPosition(bookKey, i, chapter ?? null);
    },
  });

  // Player-first: start the chapter's chant on open (once).
  const started = useRef(false);
  useEffect(() => {
    if (started.current || !pages.length) return;
    const i = Math.min(Math.max(index ?? 0, 0), pages.length - 1);
    if (pages[i]?.chant) {
      started.current = true;
      startAt(i);
    }
  }, [pages, pages.length, index, startAt]);

  // Verse | Meaning | Both, persisted per book. Modes without audio for
  // this book are not offered; with only chant recorded the selector shows
  // Verse alone (Meaning arrives with the narration render pass).
  const hasMeaningAudio = pages.some((p) => !!p.meaning_audio);
  const [mode, setModeState] = useState<ListenMode>("verse");
  useEffect(() => {
    getListenMode(bookKey)
      .then((m) => {
        // A saved mode this book can no longer play falls back to Verse.
        setModeState(m === "meaning" && !hasMeaningAudio ? "verse" : m);
      })
      .catch(() => {});
  }, [bookKey, hasMeaningAudio]);
  const setMode = (m: ListenMode) => {
    setModeState(m);
    setListenMode(bookKey, m);
  };

  const cur = playingVerse ?? verse;
  const curLit = playingVerse?.id === cur?.id;
  const curLines = cur?.chant?.lines?.length
    ? cur.chant.lines
    : (cur?.devanagari ?? "")
        .split(/(?<=[।॥])/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((text, i) => ({ i, text, start_ms: 0, end_ms: 0 }));

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.iconBtn}
        >
          <Ionicons name="arrow-back" size={22} color={color.ink} />
        </Pressable>
        <View style={styles.headText}>
          <Text style={styles.title} numberOfLines={1}>
            Listen · {plain(title)}
          </Text>
          {!!cur && (
            <Text style={styles.ref}>
              {cur.source_ref}
              {pages.length ? ` · ${playingAt + 1} of ${pages.length}` : ""}
            </Text>
          )}
        </View>
      </View>

      {(hasChant || hasMeaningAudio) && (
        <View style={styles.modes} accessibilityRole="tablist">
          {(["verse", "meaning", "both"] as ListenMode[])
            .filter((m) => (m === "verse" ? hasChant : hasMeaningAudio))
            .map((m) => {
              const on = mode === m;
              return (
                <Pressable
                  key={m}
                  onPress={() => setMode(m)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${MODE_LABEL[m]} audio`}
                  style={[styles.modeChip, on && styles.modeChipOn]}
                >
                  <Text style={[styles.modeText, on && styles.modeTextOn]}>{MODE_LABEL[m]}</Text>
                </Pressable>
              );
            })}
        </View>
      )}

      <ScrollView style={styles.cardScroll} contentContainerStyle={styles.cardBody}>
        {!hasChant && !hasMeaningAudio && (
          <Text style={styles.hint}>No chant yet for this chapter.</Text>
        )}
        {!!cur && (
          <View style={styles.card}>
            {curLines.map((ln) => {
              const lit = curLit && ln.i === lineNow;
              return (
                <Pressable
                  key={ln.i}
                  onPress={() => pickLine(cur, ln.i)}
                  accessibilityRole="button"
                  accessibilityLabel={`Play line ${ln.i + 1} of ${cur.source_ref}`}
                  style={styles.lineHit}
                >
                  <KaraokeLine
                    line={ln}
                    active={lit}
                    wordNow={lit ? wordNow : -1}
                    style={styles.line}
                    litWordStyle={{ color: color.saffronDeep, backgroundColor: "rgba(232,91,37,0.12)", borderRadius: 4 }}
                  />
                </Pressable>
              );
            })}
            {(mode === "meaning" || mode === "both") && !!cur.translation_en && (
              <Text style={styles.meaning}>{plain(cur.translation_en)}</Text>
            )}
            {(mode === "verse" || mode === "both") && !!cur.iast && <Text style={styles.iast}>{cur.iast}</Text>}
            {!!(cur as { translation_hi?: string }).translation_hi && (
              <Text style={styles.meaningHi}>
                {plain((cur as { translation_hi?: string }).translation_hi ?? "")}
              </Text>
            )}
            <Text style={styles.credit}>Chant: Vagdhenu, IISc</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.player}>
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
          verseRef={playingVerse?.source_ref}
          position={pages.length ? `${playingAt + 1} of ${pages.length}` : undefined}
          follow={follow}
          onFollow={() => {
            setFollow(true);
            scrollToCurrent();
          }}
        />
      </View>

      <View style={styles.listWrap}>
        <ChantList
          verses={pages}
          playingId={playingId}
          lineNow={lineNow}
          wordNow={wordNow}
          fillFrac={fillFrac}
          pageColor={color.bg}
          textColor={color.ink}
          softColor={color.inkSoft}
          roman
          onPick={pick}
          onPickLine={pickLine}
          onLearn={(v) => {
            stop();
            navigate("Recite", { verseUid: v.verse_uid ?? v.id, start: "listen" });
          }}
          listRef={listRef}
          onUserScroll={() => setFollow(false)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  header: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingBottom: 4 },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headText: { flex: 1 },
  title: { fontWeight: "800", fontSize: 16, color: color.ink },
  ref: { fontSize: 12, color: color.inkSoft },
  modes: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 6 },
  modeChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: color.border,
    paddingHorizontal: 14,
    paddingVertical: 5,
    minHeight: 32,
    justifyContent: "center",
  },
  modeChipOn: { backgroundColor: color.ink, borderColor: color.ink },
  modeText: { fontSize: 13, fontWeight: "700", color: color.inkSoft },
  modeTextOn: { color: "#FFF8EE" },
  cardScroll: { flexGrow: 0, maxHeight: "42%" },
  cardBody: { paddingHorizontal: 16 },
  hint: { fontSize: 14, color: color.inkSoft },
  card: { backgroundColor: color.surface ?? "#fff", borderRadius: 12, padding: 16, gap: 4 },
  lineHit: { minHeight: 44, justifyContent: "center" },
  line: { fontSize: 22, lineHeight: 34, color: color.ink },
  iast: { fontStyle: "italic", fontSize: 14, color: color.inkSoft, marginTop: 4 },
  meaning: { fontSize: 15, lineHeight: 23, color: color.ink, marginTop: 8 },
  meaningHi: { fontSize: 14, lineHeight: 22, color: color.inkSoft, marginTop: 2 },
  credit: { fontSize: 12, color: color.inkSoft, marginTop: 6 },
  player: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#EFE3CE" },
  listWrap: { flex: 1 },
});
