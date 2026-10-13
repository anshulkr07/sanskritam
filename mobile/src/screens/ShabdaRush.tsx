// Shabda Rush v2 (शब्द-वेगः): ten short prompts — word-meaning, picture-word
// and audio-word tasks from one unseen pack. Correctness dominates; speed
// adds at most a tenth, measured from the server window. Pass-and-play deals
// equivalent unseen packs so one player's turn never exposes another's
// answers.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CatalogGame, playApi, type RushPack } from "../games/v2/client";
import { useCatalogGame } from "../games/v2/useCatalog";
import { loadRemembered, usePlaySession } from "../games/v2/useSession";
import { GameTopBar, ResultSheetV2, SetupSheet, type SetupChoice } from "../games/v2/parts";
import { color, fill, font, onFill, radius, script, space, sanskritText } from "../theme";
import { haptics } from "../services/haptics";
import { sfx } from "../services/sfx";
import { playClip } from "../services/speech";
import { resolveGameImage } from "../games/v2/gameImages";

type Props = {
  navigation: { goBack: () => void; navigate: (r: string, p?: object) => void };
  route?: { params?: { mode?: "local"; seats?: number } };
};

const TASK_LABEL: Record<string, string> = {
  "word-meaning": "Pick the meaning",
  "meaning-word": "Pick the Sanskrit word",
  "picture-word": "Pick the matching word",
  "audio-word": "Listen, then pick the word",
};

export default function ShabdaRushScreen({ navigation, route }: Props) {
  const localSeats = route?.params?.mode === "local" ? (route.params?.seats ?? 2) : 0;
  const { session, result, busy, error, start, answer, finish, reset, setBusy } = usePlaySession("rush");
  const pack = session?.pack as RushPack | undefined;
  const [at, setAt] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [shownAt, setShownAt] = useState(0);
  const [seat, setSeat] = useState(0);
  const [remembered, setRemembered] = useState<Record<string, unknown>>({});
  const game = useCatalogGame("rush");
  const q = pack?.questions[at];
  const askedAt = useRef(0);

  useEffect(() => { void loadRemembered("rush").then(setRemembered); }, []);
  useEffect(() => { setShownAt(Date.now()); }, [at, session?.id]);

  const pick = async (choice: string) => {
    if (!q || picked != null) return;
    setPicked(choice);
    const elapsed = Math.max(0, Date.now() - Math.max(shownAt, askedAt.current));
    setBusy(true);
    const res = await answer({ index: at, choice, elapsed_ms: elapsed });
    setBusy(false);
    if (!res) return;
    const r = res as { correct: boolean; already?: boolean };
    if (r.correct) { void sfx.correct(); haptics.correct(); setCorrectCount((c) => c + 1); }
    else { void sfx.incorrect(); haptics.incorrect(); }
    setTimeout(() => {
      setPicked(null);
      if (!pack) return;
      if (at + 1 >= pack.questions.length) void finish({ window_ms: pack.window_ms });
      else {
        setAt(at + 1);
        if (localSeats > 1) setSeat((s) => (s + 1) % localSeats);
      }
    }, r.correct ? 320 : 650);
  };

  const playAudio = async () => {
    if (!q?.audio) return;
    try { await playClip(q.audio); } catch { /* audio optional */ }
  };

  if (!session) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <GameTopBar title="Shabda Rush" sa="शब्द-वेगः" onClose={() => navigation.goBack()}
          right={localSeats > 1 ? <Text style={styles.localTag}>Pass & play · {localSeats}</Text> : undefined} />
        {!game || error ? (
          <Text style={styles.loading} accessibilityRole="alert">{error ?? "Loading…"}</Text>
        ) : (
          <SetupSheet game={game as CatalogGame} remembered={remembered}
            onStart={(c) => void start(c)} busy={busy} />
        )}
      </SafeAreaView>
    );
  }

  if (result) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.doneBody}>
          {localSeats > 1 && (
            <Text style={styles.localNote}>Pass-and-play round — the ranked variant is the solo pack.</Text>
          )}
          <ResultSheetV2 result={result} onAgain={() => { reset(); setAt(0); setCorrectCount(0); }}
            onDone={() => navigation.goBack()} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <GameTopBar title="Shabda Rush" sa="शब्द-वेगः"
        onClose={() => void finish({ window_ms: pack?.window_ms }).then(() => navigation.goBack())}
        right={<View style={{ alignItems: "flex-end", marginRight: space.sm }}>
          <Text style={styles.count}>{at + 1}/{pack?.questions.length ?? 10}</Text>
          <Text style={styles.countLabel}>{correctCount} right{localSeats > 1 ? ` · player ${seat + 1}` : ""}</Text>
        </View>} />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.taskLabel}>{TASK_LABEL[q?.task ?? ""] ?? "Pick the answer"}</Text>
        {q?.task === "word-meaning" && (
          <View style={styles.promptBox}>
            <Text style={[sanskritText(30), { color: color.ink, textAlign: "center" }]}>{q.prompt}</Text>
            <Text style={styles.promptIast}>{q.iast}</Text>
          </View>
        )}
        {q?.task === "meaning-word" && (
          <View style={styles.promptBox}>
            <Text style={styles.meaningPrompt}>{q.prompt}</Text>
          </View>
        )}
        {q?.task === "picture-word" && !!resolveGameImage(q.image) && (
          <Image source={resolveGameImage(q.image)!} style={styles.picture} />
        )}
        {q?.task === "audio-word" && (
          <Pressable onPress={() => void playAudio()} accessibilityRole="button"
            accessibilityLabel="Play the word" style={styles.audioBtn}>
            <Ionicons name="volume-high" size={26} color={onFill.text} />
            <Text style={styles.audioLabel}>Play</Text>
          </Pressable>
        )}
        <View style={styles.options}>
          {(q?.options ?? []).map((o) => {
            const state = picked == null ? "idle" : "done";
            return (
              <Pressable key={o} onPress={() => void pick(o)} disabled={picked != null}
                accessibilityRole="button" accessibilityLabel={o}
                accessibilityState={{ disabled: picked != null }}
                style={[styles.opt, state === "done" && styles.optDone]}>
                <Text style={[styles.optText, script("regular")]}>{o}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  body: { padding: space.lg, gap: space.md },
  doneBody: { padding: space.lg, justifyContent: "center", flexGrow: 1, gap: space.md },
  taskLabel: { fontWeight: "700", color: color.inkSoft, textAlign: "center", fontSize: font.sizes.sm, textTransform: "uppercase" },
  promptBox: { alignItems: "center", paddingVertical: space.md, gap: 4 },
  promptIast: { fontSize: font.sizes.sm, fontStyle: "italic", color: color.inkSoft },
  meaningPrompt: { fontSize: 26, fontWeight: "800", color: color.ink, textAlign: "center" },
  picture: { width: "72%", aspectRatio: 1.25, borderRadius: radius.lg, alignSelf: "center", backgroundColor: color.surfaceMuted },
  audioBtn: {
    width: 108, height: 108, borderRadius: 54, backgroundColor: fill.teal,
    alignItems: "center", justifyContent: "center", alignSelf: "center", gap: 2,
  },
  audioLabel: { color: onFill.text, fontWeight: "800", fontSize: font.sizes.sm },
  options: { gap: space.sm },
  opt: {
    borderRadius: radius.md, minHeight: 56, justifyContent: "center", paddingHorizontal: space.md,
    borderWidth: 1, borderColor: color.border, backgroundColor: color.surface,
  },
  optDone: { opacity: 0.9 },
  optText: { fontSize: 17, lineHeight: 26, fontWeight: "600", color: color.ink },
  count: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.lg, color: color.ink },
  countLabel: { fontSize: font.sizes.xs, color: color.inkSoft },
  localTag: { fontSize: font.sizes.xs, color: color.inkSoft, fontWeight: "700", marginRight: space.sm },
  localNote: { color: color.inkSoft, fontSize: font.sizes.sm, textAlign: "center" },
  loading: { textAlign: "center", marginTop: 40, color: color.inkSoft },
});
