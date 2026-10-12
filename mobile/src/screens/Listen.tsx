// Listen: the player-first chant screen.
// One chapter (or book) as continuous audio: the sounding verse large on top
// with its meaning as text, transport right under it, the chapter list below.
// Playback itself is the shared ChantController (useChant), the same player
// Book's Chant mode uses — a fix there fixes it here too.

import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useCallback, useEffect, useRef } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { RootStackParamList } from "../navigation/types";
import ChantList from "../components/chant/ChantList";
import ChantPlayer from "../components/chant/ChantPlayer";
import { useBookPages } from "../hooks/useBookPages";
import { useChant } from "../hooks/useChant";
import { color } from "../theme";
import { plain } from "../utils/text";

type Props = NativeStackScreenProps<RootStackParamList, "Listen">;

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
    fillFrac,
    isPlaying,
    repeat,
    speed,
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
  } = useChant(pages, title, { initialIndex: index ?? 0, navigate, onAt: persistAt });

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

  const cur = playingVerse ?? verse;
  const curLines = cur?.chant?.lines?.length
    ? cur.chant.lines
    : (cur?.devanagari ?? "")
        .split(/(?<=[।॥])/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((text, i) => ({ i, text }));

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

      <ScrollView style={styles.cardScroll} contentContainerStyle={styles.cardBody}>
        {!hasChant && (
          <Text style={styles.hint}>No chant yet for this chapter.</Text>
        )}
        {!!cur && (
          <View style={styles.card}>
            {curLines.map((ln) => {
              const lit = playingVerse?.id === cur.id && ln.i === lineNow;
              return (
                <Pressable
                  key={ln.i}
                  onPress={() => pickLine(cur, ln.i)}
                  accessibilityRole="button"
                  accessibilityLabel={`Play line ${ln.i + 1} of ${cur.source_ref}`}
                  style={styles.lineHit}
                >
                  <Text style={[styles.line, lit && { color: color.saffronBtn }]}>
                    {lit ? "▶ " : ""}
                    {ln.text}
                  </Text>
                </Pressable>
              );
            })}
            {!!cur.iast && <Text style={styles.iast}>{cur.iast}</Text>}
            {!!cur.translation_en && (
              <Text style={styles.meaning}>{plain(cur.translation_en)}</Text>
            )}
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
