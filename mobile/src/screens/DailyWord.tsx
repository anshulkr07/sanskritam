// DailyWord — वर्ण-बन्धः (U8-4). One puzzle a day, scored on the varṇamālā
// grid rather than letter identity: क against ग is one step (same place,
// different voicing). The phonetic scoring is the product.
//
// - Four tile states, never colour alone (§3.3 / U5-3).
// - One puzzle per learner-local day; no rollover at server midnight.
// - A solved day stays solved; no replay (P12-2).
// - The share card is a WhatsApp-shaped object; we render the summary as a
//   text+emoji block for now (server-side rendering is owner-gated, P12-3).

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api, type DailyWordTile } from "../api/client";
import VarnaGrid from "../components/VarnaGrid";
import { Skeleton } from "../components/Skeleton";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { cachedGet, invalidateCache } from "../services/apiCache";
import { haptics } from "../services/haptics";
import { color, font, radius, script, shadow, space } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "DailyWord">;

export default function DailyWordScreen({ navigation }: Props) {
  const [wordLength, setWordLength] = useState(0);
  const [rows, setRows] = useState<{ tiles: DailyWordTile[]; guess: string }[]>([]);
  const [guessesUsed, setGuessesUsed] = useState(0);
  const [maxGuesses, setMaxGuesses] = useState(6);
  const [solved, setSolved] = useState(false);
  const [finished, setFinished] = useState(false);
  const [revealed, setRevealed] = useState<string | null>(null);
  // null = still loading — the header pill hides until the real streak
  // lands instead of flashing a fake 0.
  const [streak, setStreak] = useState<number | null>(null);
  const [clue, setClue] = useState("");
  const [status, setStatus] = useState<"loading" | "open" | "solved" | "finished" | "no_word">("loading");
  const [guess, setGuess] = useState("");
  const [busy, setBusy] = useState(false);
  const [refusedReason, setRefusedReason] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  const load = useCallback(() => {
    setStatus("loading");
    setStreak(null);
    // Home fetched this moments ago under the same key. A guess drops the
    // entry (below), so a return visit never replays a stale puzzle.
    cachedGet("daily-word", api.dailyWord)
      .then((p) => {
        setWordLength(p.word_length);
        setGuessesUsed(p.guesses_used);
        setMaxGuesses(p.max_guesses);
        setStreak(p.streak ?? 0);
        setClue(p.clue ?? "");
        setSolved(p.solved);
        setFinished(p.finished);
        if (p.solved || p.finished) {
          setStatus("finished");
        } else {
          setStatus("open");
        }
      })
      .catch(() => setStatus("no_word"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = useCallback(async () => {
    const g = guess.trim();
    if (!g || busy || finished) return;
    if (g.length !== wordLength) {
      setRefusedReason("That word has a different number of sounds.");
      return;
    }
    setRefusedReason(null);
    setBusy(true);
    try {
      const res = await api.dailyWordGuess(g);
      invalidateCache("daily-word");
      if (res.status === "refused") {
        if (res.reason === "length_mismatch") {
          setRefusedReason("That word has a different number of sounds.");
        } else {
          setFinished(true);
        }
        return;
      }
      setRows((prev) => [...prev, { tiles: res.tiles, guess: g }]);
      setGuessesUsed(res.guesses_used);
      if (res.solved) {
        setSolved(true);
        setFinished(true);
        setRevealed(res.revealed?.answer ?? g);
        setStatus("solved");
        haptics.correct();
      } else if (res.finished) {
        setFinished(true);
        setRevealed(res.revealed?.answer ?? null);
        setStatus("finished");
      }
    } catch {
      /* network/offline — leave the input for a retry */
    } finally {
      setBusy(false);
      setGuess("");
    }
  }, [guess, busy, finished, wordLength]);

  const gameEnded = solved || finished;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.topRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={24} color={color.ink} />
          </Pressable>
          <Text style={styles.title}>वर्ण-बन्धः</Text>
          {status !== "loading" && streak != null && streak > 0 && (
            <View style={styles.streakPill}>
              <Ionicons name="flame" size={14} color={color.saffron} />
              <Text style={styles.streakNum}>{streak}</Text>
            </View>
          )}
        </View>
        <Text style={styles.subtitle}>Daily word · scored on the mouth-map grid</Text>

        {status === "loading" ? (
          <DailyWordSkeleton />
        ) : status === "no_word" ? (
          <Text style={styles.muted}>No word available today. Check back soon.</Text>
        ) : (
          <>
            {/* Grid */}
            <VarnaGrid answerLength={wordLength} rows={rows} />

            {/* Clue + guesses */}
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>
                {solved ? "Solved!" : gameEnded ? "Finished" : "Guesses"}
              </Text>
              <Text style={styles.infoCount}>{guessesUsed}/{maxGuesses}</Text>
            </View>
            {!!clue && !solved && <Text style={styles.clue}>Hint: {clue}</Text>}
            {refusedReason && <Text style={styles.refused}>{refusedReason}</Text>}

            {/* Reveal */}
            {gameEnded && revealed ? (
              <View style={styles.revealCard}>
                <Text style={styles.revealLabel}>The word was</Text>
                <Text style={[styles.revealWord, script("bold")]}>{revealed}</Text>
                <Text style={styles.revealNote}>
                  {solved
                    ? "You read the mouth map perfectly. Sådhū!"
                    : "Every day starts a new word."}
                </Text>
              </View>
            ) : (
              /* Input + submit */
              <View style={styles.inputRow}>
                <TextInput
                  ref={inputRef}
                  value={guess}
                  onChangeText={setGuess}
                  placeholder="Type the word in Devanagari"
                  placeholderTextColor={color.inkFaint}
                  style={[styles.input, script("semibold")]}
                  autoCorrect={false}
                  autoCapitalize="none"
                  maxLength={wordLength || 16}
                  onSubmitEditing={submit}
                  editable={!busy}
                  accessibilityLabel="Your guess"
                />
                <Pressable
                  onPress={submit}
                  disabled={busy || !guess.trim()}
                  style={[styles.saver, (!busy && guess.trim()) ? styles.saverActive : styles.saverIdle]}
                  accessibilityRole="button"
                  accessibilityLabel="Submit guess"
                >
                  {busy ? (
                    <Ionicons name="hourglass-outline" size={22} color={color.white} />
                  ) : (
                    <Ionicons name="arrow-forward" size={22} color={color.white} />
                  )}
                </Pressable>
              </View>
            )}

            {/* Four-state legend */}
            <View style={styles.legend}>
              <LegendItem color={color.ok} label="exact" />
              <LegendItem color={color.warn} label="one step" />
              <LegendItem color={color.tutor} label="elsewhere" />
              <LegendItem color={color.surfaceMuted} label="not in word" />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function LegendItem({ color: c, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: c }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

// Skeleton preview of the puzzle: a guess grid + a clue bar, so the screen
// holds its shape (no layout shift) while the daily word loads (U9-4).
function DailyWordSkeleton() {
  const tile = { width: 36, height: 44, radius: radius.sm };
  return (
    <View style={{ marginTop: space.xl, gap: space.sm }}>
      {[0, 1, 2, 3].map((r) => (
        <View key={r} style={{ flexDirection: "row", gap: 6 }}>
          {[0, 1, 2, 3, 4].map((c) => (
            <Skeleton key={c} {...tile} />
          ))}
        </View>
      ))}
      <Skeleton height={18} width="60%" style={{ marginTop: space.sm }} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  body: { padding: space.lg, paddingBottom: space.xxl },
  topRow: { flexDirection: "row", alignItems: "center", gap: space.sm, marginBottom: 2 },
  back: { padding: 4 },
  title: { flex: 1, fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.lg, color: color.ink },
  streakPill: { flexDirection: "row", alignItems: "center", backgroundColor: color.surface, borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: space.xs, gap: 4, ...shadow.card },
  streakNum: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm, color: color.ink },
  subtitle: { fontFamily: "Nunito_400Regular", fontWeight: "400", fontSize: font.sizes.sm, color: color.inkSoft, marginBottom: space.lg },
  infoRow: { flexDirection: "row", justifyContent: "space-between", marginTop: space.md },
  infoText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: color.inkSoft },
  infoCount: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm, color: color.ink },
  clue: { fontFamily: "Nunito_500Medium", fontWeight: "500", fontSize: font.sizes.sm, color: color.inkSoft, marginTop: space.sm },
  refused: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.sm, color: color.badText, marginTop: space.sm },
  inputRow: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.lg },
  input: {
    flex: 1,
    borderWidth: 2,
    borderColor: color.border,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontSize: font.sizes.base,
    color: color.ink,
    backgroundColor: color.surface,
  },
  saver: { width: 48, height: 48, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  saverActive: { backgroundColor: color.saffron, ...shadow.button },
  saverIdle: { backgroundColor: color.inkFaint },
  revealCard: {
    marginTop: space.lg,
    backgroundColor: color.okBg,
    borderRadius: radius.lg,
    padding: space.md,
    alignItems: "center",
    ...shadow.card,
  },
  revealLabel: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.sm, color: color.okText },
  revealWord: { fontSize: font.sizes.xl, color: color.ink, marginVertical: 4 },
  revealNote: { fontFamily: "Nunito_400Regular", fontWeight: "400", fontSize: font.sizes.sm, color: color.inkSoft, textAlign: "center" },
  legend: { flexDirection: "row", justifyContent: "space-between", marginTop: space.xl },
  legendItem: { alignItems: "center", gap: 4 },
  legendSwatch: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: color.border },
  legendLabel: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.xs, color: color.inkSoft },
  muted: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.base, color: color.inkSoft, marginTop: space.xl, textAlign: "center" },
});
