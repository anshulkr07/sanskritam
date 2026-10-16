// Smriti v2 (स्मृतिः): memory pairs against the server-held deck. The
// client never receives hidden faces up front — every flip is an authorised
// reveal, attempts are counted server-side, and the rubric scores fewer
// attempts higher at equal completion. Decks: picture-word (illustrations
// with Devanagari + Roman on the word card), word-meaning, letters, and
// sound-picture. Pass-and-play seats rotate turns on a shared board.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ArtworkImage as Image } from "../components/artwork/ArtworkImage";
import { SafeAreaView } from "react-native-safe-area-context";

import { CatalogGame, playApi, type SmritiPackView } from "../games/v2/client";
import { useCatalogGame } from "../games/v2/useCatalog";
import { loadRemembered, usePlaySession } from "../games/v2/useSession";
import { GameTopBar, ResultSheetV2, SetupSheet, type SetupChoice } from "../games/v2/parts";
import { color, fill, font, onFill, radius, script, space } from "../theme";
import { haptics } from "../services/haptics";
import { resolveGameImage } from "../games/v2/gameImages";

type Props = {
  navigation: { goBack: () => void; navigate: (r: string, p?: object) => void };
  route?: { params?: { mode?: "local"; seats?: number } };
};

interface Face {
  id: number; pair: number; face: string;
  sa: string; iast: string; meaning: string; image: string; audio: string;
}

export default function SmritiScreen({ navigation, route }: Props) {
  const localSeats = route?.params?.mode === "local" ? (route.params?.seats ?? 2) : 0;
  const { session, result, busy, error, start, answer, finish, reset, setBusy } = usePlaySession("smriti");
  const pack = session?.pack as SmritiPackView | undefined;
  const [faces, setFaces] = useState<Record<number, Face>>(
    () => (session?.resume_state?.faces ?? {}) as Record<number, Face>);
  const [open, setOpen] = useState<number[]>(() => Object.entries(
    (session?.resume_state?.reveals ?? {}) as Record<string, { settled?: boolean }>)
    .filter(([, reveal]) => !reveal.settled).map(([id]) => Number(id)));
  const [matched, setMatched] = useState<Set<number>>(
    () => new Set((session?.resume_state?.found_pairs ?? []) as number[]));
  const [attempts, setAttempts] = useState(() => Number(session?.resume_state?.attempts ?? 0));
  const [seat, setSeat] = useState(0);
  const [pairsBySeat, setPairsBySeat] = useState<number[]>([]);
  const [remembered, setRemembered] = useState<Record<string, unknown>>({});
  const [started, setStarted] = useState(false);
  const game = useCatalogGame("smriti");
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recovering = useRef(open.length === 2);

  useEffect(() => { void loadRemembered("smriti").then(setRemembered); }, []);
  useEffect(() => () => { if (settle.current) clearTimeout(settle.current); }, []);

  const attemptPair = useCallback(async (cards: number[], pair: number) => {
    setBusy(true);
    const res = await answer({ type: "attempt", a: cards[0], b: cards[1] });
    if (!res) { setBusy(false); return; }
    const out = res as { match: boolean; complete: boolean; attempts: number };
    setAttempts(out.attempts);
    settle.current = setTimeout(() => {
      if (out.match) {
        setMatched((m) => new Set(m).add(pair));
        setPairsBySeat((p) => { const n = [...p]; n[seat] = (n[seat] ?? 0) + 1; return n; });
        haptics.correct();
      } else { haptics.incorrect(); }
      if (localSeats > 1) setSeat((s) => (s + 1) % localSeats);
      setOpen([]); setBusy(false);
      if (out.complete) void finish();
    }, out.match ? 350 : 650);
  }, [answer, finish, localSeats, seat, setBusy]);

  useEffect(() => {
    if (recovering.current && !busy && open.length === 2) {
      recovering.current = false;
      void attemptPair(open, faces[open[0]].pair);
    }
  }, [attemptPair, busy, faces, open]);

  const flip = useCallback(async (id: number) => {
    if (busy || open.includes(id) || open.length >= 2 || matched.size >= (pack?.pairs ?? 0)) return;
    haptics.tap();
    const res = await answer({ type: "reveal", card: id });
    if (!res) return;
    const face = (res as { reveal: Face }).reveal;
    setFaces((f) => ({ ...f, [id]: face }));
    const nextOpen = [...open, id];
    setOpen(nextOpen);
    if (nextOpen.length === 2) {
      await attemptPair(nextOpen, face.pair);
    }
  }, [answer, attemptPair, busy, matched, open, pack]);

  if (!session) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <GameTopBar title="Smriti" sa="स्मृतिः" onClose={() => navigation.goBack()}
          right={localSeats > 1 ? <Text style={styles.localTag}>Pass & play · {localSeats}</Text> : undefined} />
        {!game || error ? (
          <Text style={styles.loading} accessibilityRole="alert">{error ?? "Loading…"}</Text>
        ) : (
          <SetupSheet game={game as CatalogGame} remembered={remembered}
            onStart={(c) => { setStarted(true); void start(c); }} busy={busy} />
        )}
      </SafeAreaView>
    );
  }

  if (result) {
    const myPairs = localSeats > 1 ? Math.max(...pairsBySeat, 0) : undefined;
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.doneBody}>
          {localSeats > 1 && (
            <View style={styles.localResult}>
              {pairsBySeat.map((p, i) => (
                <Text key={i} style={styles.localResultRow}>Player {i + 1}: {p} pairs</Text>
              ))}
              <Text style={styles.localResultRow}>
                {pairsBySeat.every((p) => p === pairsBySeat[0]) ? "Shared victory" : `Player ${pairsBySeat.indexOf(Math.max(...pairsBySeat)) + 1} wins`}
              </Text>
            </View>
          )}
          <ResultSheetV2 result={result}
            onAgain={() => { reset(); setFaces({}); setOpen([]); setMatched(new Set()); setAttempts(0); setPairsBySeat([]); }}
            onDone={() => navigation.goBack()} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const cols = (pack?.count ?? 16) <= 12 ? 3 : 4;
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <GameTopBar title="Smriti" sa="स्मृतिः" onClose={() => void finish().then(() => navigation.goBack())}
        right={<View style={{ alignItems: "flex-end", marginRight: space.sm }}>
          <Text style={styles.count}>{matched.size}/{pack?.pairs ?? 8}</Text>
          <Text style={styles.countLabel}>{attempts} attempts{localSeats > 1 ? ` · player ${seat + 1}` : ""}</Text>
        </View>} />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {open.length === 2 && !!error && <Pressable disabled={busy}
          onPress={() => void attemptPair(open, faces[open[0]].pair)} accessibilityRole="button"
          accessibilityLabel="Retry pair"><Text style={styles.loading}>Retry this pair</Text></Pressable>}
        <View style={styles.grid}>
          {Array.from({ length: pack?.count ?? 16 }).map((_, id) => {
            const face = faces[id];
            const isOpen = open.includes(id) || (face && matched.has(face.pair));
            return (
              <Pressable key={id} onPress={() => void flip(id)} disabled={!!isOpen || busy}
                accessibilityRole="button"
                accessibilityLabel={isOpen && face ? faceLabel(face) : "Hidden card"}
                accessibilityState={{ selected: !!isOpen, disabled: !!isOpen || busy }}
                style={[styles.card, { width: `${100 / cols - 2}%` }, isOpen && styles.cardUp]}>
                {isOpen && face ? <FaceView face={face} /> : <Text style={styles.cardBack}>·</Text>}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function faceLabel(f: Face): string {
  if (f.face === "sa") return `Sanskrit: ${f.sa}`;
  if (f.image) return "Picture card";
  return f.meaning || f.iast || f.sa;
}

function FaceView({ face }: { face: Face }) {
  const img = resolveGameImage(face.image);
  if (face.face === "match" && img) {
    return <Image source={img} style={styles.cardImg} />;
  }
  if (face.face === "sa") {
    return (
      <View style={styles.cardCenter}>
        <Text style={[styles.cardSa, script("semibold")]} numberOfLines={2}>{face.sa}</Text>
        {!!face.iast && <Text style={styles.cardSub} numberOfLines={1}>{face.iast}</Text>}
      </View>
    );
  }
  // match card: Devanagari + Roman for word decks, roman for letters, meaning text
  return (
    <View style={styles.cardCenter}>
      {!!face.meaning && face.meaning !== face.iast && (
        <Text style={styles.cardMeaning} numberOfLines={2}>{face.meaning}</Text>
      )}
      {!!face.iast && <Text style={styles.cardRoman} numberOfLines={1}>{face.iast}</Text>}
      {!face.meaning && !face.iast && <Text style={styles.cardSa}>{face.sa}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  body: { padding: space.lg },
  doneBody: { padding: space.lg, justifyContent: "center", flexGrow: 1, gap: space.md },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  card: {
    aspectRatio: 0.82, borderRadius: radius.md, backgroundColor: color.surface,
    borderWidth: 1, borderColor: color.border, alignItems: "center", justifyContent: "center",
    padding: 4,
  },
  cardUp: { backgroundColor: fill.slate, borderColor: fill.slate },
  cardBack: { fontSize: 28, color: color.inkFaint },
  cardCenter: { alignItems: "center", gap: 2 },
  cardSa: { fontSize: 17, lineHeight: 26, color: onFill.text, textAlign: "center" },
  cardSub: { fontSize: font.sizes.xs, color: onFill.soft },
  cardMeaning: { fontSize: font.sizes.sm, color: onFill.text, textAlign: "center" },
  cardRoman: { fontSize: font.sizes.xs, color: onFill.gold },
  cardImg: { width: "100%", height: "100%", borderRadius: radius.sm },
  count: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.lg, color: color.ink },
  countLabel: { fontSize: font.sizes.xs, color: color.inkSoft },
  localTag: { fontSize: font.sizes.xs, color: color.inkSoft, fontWeight: "700", marginRight: space.sm },
  localResult: { backgroundColor: color.surface, borderRadius: radius.lg, padding: space.md, gap: 2 },
  localResultRow: { fontWeight: "700", color: color.ink },
  loading: { textAlign: "center", marginTop: 40, color: color.inkSoft },
});
