// DailyWord — वर्ण-बन्धः (U8-4). One puzzle a day, scored on the varṇamālā grid
// rather than letter identity: क against ग is one step (same place, different
// voicing). The phonetic scoring is the product.
//
// Nobody has to type Devanagari. The clue is shown, the word's slots are shown
// (one per akṣara, the letter as it is written), and the learner TAPS whole
// akṣaras from a bank to fill them: the word's own plus near-miss decoys.
//
// - Four tile states, never colour alone (§3.3 / U5-3).
// - One puzzle per learner-local day; no rollover at server midnight.
// - A solved day stays solved; no replay (P12-2).
// - Checked rows are kept on the device under the puzzle's date, so coming back
//   restores the board.
// - If the backend sends no bank (one that predates it), the screen falls back
//   to typing, so it never breaks.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api, type DailyWordPuzzle } from "../api/client";
import FetchError from "../components/FetchError";
import { Skeleton } from "../components/Skeleton";
import { Button } from "../components/ui";
import VarnaGrid, { STATE_GLYPH, TILE_BG, tileFontSize, type GridRow, type TileState } from "../components/VarnaGrid";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { cachedGet, invalidateCache } from "../services/apiCache";
import { haptics } from "../services/haptics";
import { accent, color, font, radius, script, shadow, space } from "../theme";
import { plain } from "../utils/text";

type Props = NativeStackScreenProps<RootStackParamList, "DailyWord">;
type Phase = "loading" | "error" | "none" | "play" | "done";

const storeKey = (date: string) => `shabd.dailyword.${date}`;

async function loadRows(date: string): Promise<GridRow[]> {
  try {
    const raw = await AsyncStorage.getItem(storeKey(date));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { rows?: GridRow[] };
    return Array.isArray(parsed.rows) ? parsed.rows : [];
  } catch {
    return [];
  }
}

function saveRows(date: string, rows: GridRow[]): void {
  AsyncStorage.setItem(storeKey(date), JSON.stringify({ rows })).catch(() => {});
}

export default function DailyWordScreen({ navigation }: Props) {
  const [puzzle, setPuzzle] = useState<DailyWordPuzzle | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [rows, setRows] = useState<GridRow[]>([]);
  // Bank indices in slot order. Removing one closes the gap, so the slots
  // always fill from the left.
  const [placed, setPlaced] = useState<number[]>([]);
  const [guessesUsed, setGuessesUsed] = useState(0);
  const [solved, setSolved] = useState(false);
  const [revealed, setRevealed] = useState<{ answer: string; answer_iast: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // Typing fallback, for a backend with no bank.
  const [typed, setTyped] = useState("");

  const load = useCallback(() => {
    setPhase("loading");
    setMessage(null);
    // Home fetched this moments ago under the same key. A guess drops the
    // entry, so a return visit never replays a stale puzzle.
    cachedGet("daily-word", api.dailyWord)
      .then(async (p) => {
        setPuzzle(p);
        if (!p.available || p.status === "no_word") {
          setPhase("none");
          return;
        }
        setRows(await loadRows(p.date));
        setGuessesUsed(p.guesses_used);
        setSolved(p.solved);
        setRevealed(p.revealed ?? null);
        setPlaced([]);
        setPhase(p.finished ? "done" : "play");
      })
      .catch(() => setPhase("error"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const bank = puzzle?.bank ?? [];
  const tapping = bank.length > 0 && (puzzle?.letters ?? 0) > 0;
  const slots = tapping ? (puzzle?.letters ?? 0) : (puzzle?.word_length ?? 0);
  const maxGuesses = puzzle?.max_guesses ?? 6;
  const full = placed.length === slots;
  const chosen = useMemo(() => placed.map((i) => bank[i]), [placed, bank]);

  const finish = useCallback(
    (res: { solved: boolean; finished: boolean; revealed?: { answer: string; answer_iast: string } | null }, fallbackWord: string) => {
      if (res.solved) {
        setSolved(true);
        setRevealed(res.revealed ?? { answer: fallbackWord, answer_iast: "" });
        setPhase("done");
        haptics.correct();
      } else if (res.finished) {
        setRevealed(res.revealed ?? null);
        setPhase("done");
      }
      // Play v2 bridge: the day's ranked contribution is recorded once,
      // server-side (replays return the stored result). Best effort — the
      // puzzle never depends on it.
      if (puzzle && (res.solved || res.finished)) {
        void import("../games/v2/client").then(({ playApi }) =>
          playApi.dailyWordFinish({
            date: puzzle.date, guesses: res.solved ? guessesUsed + 1 : guessesUsed,
            solved: res.solved, finished: true,
          }).catch(() => {}));
      }
    },
    [puzzle, guessesUsed],
  );

  const submit = useCallback(
    async (guess: string, letters?: string[]) => {
      if (busy || !puzzle) return;
      setBusy(true);
      setMessage(null);
      try {
        const res = await api.dailyWordGuess(guess, letters);
        invalidateCache("daily-word");
        if (res.status === "refused") {
          if (res.reason === "already_finished") load();
          else setMessage(letters ? "Fill every slot." : "That word has a different number of sounds.");
          return;
        }
        const next = [...rows, { tiles: res.tiles }];
        setRows(next);
        saveRows(puzzle.date, next);
        setGuessesUsed(res.guesses_used);
        setPlaced([]);
        setTyped("");
        if (res.solved || res.finished) finish(res, guess);
        else if (res.tiles.some((t) => t.state === "exact" || t.state === "near")) haptics.near();
        else haptics.tap();
      } catch {
        // Offline: the tiles stay where they are, ready for a retry.
        setMessage("Couldn't check. Try again.");
      } finally {
        setBusy(false);
      }
    },
    [busy, puzzle, rows, load, finish],
  );

  const check = useCallback(() => {
    if (!full || busy) return;
    void submit(chosen.join(""), chosen);
  }, [full, busy, chosen, submit]);

  const pickTile = (idx: number) => {
    if (busy || placed.length >= slots || placed.includes(idx)) return;
    haptics.tap();
    setMessage(null);
    setPlaced((p) => [...p, idx]);
  };
  const unplace = (slot: number) => {
    if (busy) return;
    haptics.tap();
    setPlaced((p) => p.filter((_, i) => i !== slot));
  };
  const backspace = () => {
    if (busy || placed.length === 0) return;
    haptics.tap();
    setPlaced((p) => p.slice(0, -1));
  };

  const streak = puzzle?.streak ?? 0;
  const done = phase === "done";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={24} color={color.ink} />
          </Pressable>
          <Text style={[styles.title, script("extrabold")]} accessibilityRole="header">
            वर्ण-बन्धः
          </Text>
          {phase !== "loading" && streak > 0 && (
            <View style={styles.streakPill} accessible accessibilityLabel={`${streak} day streak`}>
              <Ionicons name="flame" size={14} color={color.saffron} />
              <Text style={styles.streakNum}>{streak}</Text>
            </View>
          )}
        </View>

        {phase === "loading" ? (
          <Loading />
        ) : phase === "error" ? (
          <FetchError label="Couldn't load today's word." onRetry={load} />
        ) : phase === "none" ? (
          <Text style={styles.muted}>No word today.</Text>
        ) : (
          <>
            {!!puzzle?.clue && (
              <View style={styles.clueBox}>
                <Text style={styles.clueLabel}>Means</Text>
                <Text style={styles.clue}>“{plain(puzzle.clue)}”</Text>
              </View>
            )}

            <View style={styles.triesRow}>
              <Text style={styles.tries} accessibilityLabel={`${guessesUsed} of ${maxGuesses} tries used`}>
                {guessesUsed}/{maxGuesses}
              </Text>
            </View>

            <VarnaGrid slots={slots} rows={rows} />

            {done ? (
              <RevealCard solved={solved} revealed={revealed} tries={guessesUsed} date={puzzle?.date ?? ""} rows={rows} />
            ) : tapping ? (
              <>
                <SlotRow slots={slots} chosen={chosen} onRemove={unplace} />
                <Bank bank={bank} used={placed} onPick={pickTile} />
                <View style={styles.actions}>
                  <Pressable
                    onPress={backspace}
                    disabled={placed.length === 0 || busy}
                    accessibilityRole="button"
                    accessibilityLabel="Remove the last letter"
                    accessibilityState={{ disabled: placed.length === 0 || busy }}
                    style={[styles.back2, (placed.length === 0 || busy) && { opacity: 0.4 }]}
                  >
                    <Ionicons name="backspace-outline" size={24} color={color.ink} />
                  </Pressable>
                  <Button
                    label="Check"
                    tone="primary"
                    size="lg"
                    style={{ flex: 1 }}
                    disabled={!full}
                    loading={busy}
                    onPress={check}
                    accessibilityLabel={full ? "Check the word" : "Fill every slot to check"}
                  />
                </View>
              </>
            ) : (
              <TypingFallback
                slots={slots}
                value={typed}
                onChange={setTyped}
                busy={busy}
                onSubmit={() => void submit(typed.trim())}
              />
            )}

            {message ? (
              <Text style={styles.message} accessibilityRole="alert">
                {message}
              </Text>
            ) : null}

            <Legend />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Pieces ───────────────────────────────────────────────────────────

function Loading() {
  return (
    <View style={{ gap: space.sm, marginTop: space.lg }} accessible accessibilityLabel="Loading">
      <Skeleton height={44} width="55%" />
      {[0, 1, 2].map((r) => (
        <View key={r} style={{ flexDirection: "row", gap: space.xs }}>
          {[0, 1, 2].map((c) => (
            <Skeleton key={c} height={64} style={{ flex: 1 }} radius={radius.md} />
          ))}
        </View>
      ))}
    </View>
  );
}

function SlotRow({ slots, chosen, onRemove }: { slots: number; chosen: string[]; onRemove: (slot: number) => void }) {
  return (
    <View style={styles.slotRow}>
      {Array.from({ length: slots }).map((_, i) => {
        const text = chosen[i];
        return (
          <Pressable
            key={i}
            onPress={() => text && onRemove(i)}
            disabled={!text}
            accessibilityRole="button"
            accessibilityLabel={text ? `Slot ${i + 1}, ${text}. Tap to remove` : `Slot ${i + 1}, empty`}
            style={[styles.slot, !!text && styles.slotFilled]}
          >
            <Text style={[styles.slotChar, script("bold"), { fontSize: tileFontSize(slots), lineHeight: tileFontSize(slots) * 1.5 }]}>
              {text ?? ""}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Bank({ bank, used, onPick }: { bank: string[]; used: number[]; onPick: (idx: number) => void }) {
  return (
    <View style={styles.bank} accessibilityLabel="Letters to choose from">
      {bank.map((ak, i) => {
        const taken = used.includes(i);
        return (
          <Pressable
            key={`${i}-${ak}`}
            onPress={() => onPick(i)}
            disabled={taken}
            accessibilityRole="button"
            accessibilityLabel={ak}
            accessibilityState={{ disabled: taken }}
            style={({ pressed }) => [styles.bankTile, taken && styles.bankTaken, pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] }]}
          >
            <Text style={[styles.bankChar, script("bold")]}>{ak}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function RevealCard({ solved, revealed, tries, date, rows }: { solved: boolean; revealed: { answer: string; answer_iast: string } | null; tries: number; date: string; rows: GridRow[] }) {
  const share = () => {
    const glyph: Record<string, string> = { exact: "🟩", near: "🟨", present: "🟦", absent: "⬜" };
    const grid = rows.map((r) => (r.tiles ?? []).map((t) => glyph[t.state] ?? "⬜").join("")).join("\n");
    void Share.share({ message: `Sanskritam ${date}: ${tries} tries\n${grid}` });
  };
  return (
    <View style={[styles.reveal, { backgroundColor: solved ? accent.sage.bg : color.surfaceMuted }]} accessible>
      <Text style={[styles.revealHead, { color: solved ? accent.sage.fg : color.inkSoft }]}>
        {solved ? "साधु! Solved." : "The word was"}
      </Text>
      {revealed ? (
        <>
          <Text style={[styles.revealWord, script("bold")]}>{revealed.answer}</Text>
          {!!revealed.answer_iast && <Text style={styles.revealIast}>{revealed.answer_iast}</Text>}
        </>
      ) : null}
      <Text style={styles.revealNote}>New word tomorrow.</Text>
      <Pressable onPress={share} accessibilityRole="button" accessibilityLabel="Share your result" style={styles.shareBtn}>
        <Ionicons name="share-outline" size={18} color={color.ink} />
        <Text style={styles.shareText}>Share</Text>
      </Pressable>
    </View>
  );
}

function TypingFallback({
  slots,
  value,
  onChange,
  busy,
  onSubmit,
}: {
  slots: number;
  value: string;
  onChange: (v: string) => void;
  busy: boolean;
  onSubmit: () => void;
}) {
  return (
    <View style={styles.inputRow}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Type the word in Devanagari"
        placeholderTextColor={color.inkFaint}
        style={[styles.input, script("semibold")]}
        autoCorrect={false}
        autoCapitalize="none"
        maxLength={slots || 16}
        onSubmitEditing={onSubmit}
        editable={!busy}
        accessibilityLabel="Your guess"
      />
      <Pressable
        onPress={onSubmit}
        disabled={busy || !value.trim()}
        style={[styles.send, busy || !value.trim() ? styles.sendIdle : styles.sendActive]}
        accessibilityRole="button"
        accessibilityLabel="Check the word"
      >
        <Ionicons name={busy ? "hourglass-outline" : "arrow-forward"} size={22} color={color.white} />
      </Pressable>
    </View>
  );
}

const LEGEND: { state: TileState; label: string }[] = [
  { state: "exact", label: "Right" },
  { state: "near", label: "Close" },
  { state: "present", label: "Elsewhere" },
  { state: "absent", label: "Not in word" },
];

function Legend() {
  return (
    <View style={styles.legend}>
      {LEGEND.map((l) => (
        <View key={l.state} style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: TILE_BG[l.state] }]}>
            <Text style={[styles.swatchGlyph, { color: l.state === "absent" ? color.inkSoft : color.white }]}>{STATE_GLYPH[l.state]}</Text>
          </View>
          <Text style={styles.legendLabel}>{l.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  body: { paddingHorizontal: space.lg, paddingBottom: space.xxl, gap: space.md },
  topRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  back: { padding: 4 },
  title: { flex: 1, fontSize: font.sizes.lg, lineHeight: 32, color: color.ink },
  streakPill: { flexDirection: "row", alignItems: "center", backgroundColor: color.surface, borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: space.xs, gap: 4, ...shadow.card },
  streakNum: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm, color: color.ink },
  muted: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.base, color: color.inkSoft, marginTop: space.xl, textAlign: "center" },
  clueBox: { alignItems: "center", marginTop: space.xs },
  clueLabel: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: color.inkSoft },
  clue: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.xl, color: color.ink, textAlign: "center" },
  triesRow: { alignItems: "flex-end" },
  tries: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm, color: color.inkSoft },
  slotRow: { flexDirection: "row", gap: space.xs, justifyContent: "center", marginTop: space.xs },
  slot: {
    flex: 1,
    maxWidth: 76,
    aspectRatio: 1,
    borderRadius: radius.md,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: color.border,
    backgroundColor: color.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  slotFilled: { borderStyle: "solid", borderColor: color.saffronBtn, backgroundColor: color.saffronLight },
  slotChar: { color: color.ink, textAlign: "center" },
  bank: { flexDirection: "row", flexWrap: "wrap", gap: space.xs, justifyContent: "center", marginTop: space.xs },
  bankTile: {
    minWidth: 56,
    height: 56,
    paddingHorizontal: space.sm,
    borderRadius: radius.md,
    backgroundColor: color.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.card,
  },
  bankTaken: { opacity: 0.25 },
  bankChar: { fontSize: 26, lineHeight: 40, color: color.ink },
  actions: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.xs },
  back2: { width: 54, height: 54, borderRadius: radius.md, backgroundColor: color.surfaceMuted, alignItems: "center", justifyContent: "center" },
  message: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.sm, color: color.badText, textAlign: "center" },
  reveal: { borderRadius: radius.lg, padding: space.md, alignItems: "center", gap: 2 },
  revealHead: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.base },
  revealWord: { fontSize: 40, lineHeight: 60, color: color.ink },
  revealIast: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.base, color: color.inkSoft },
  revealNote: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.sm, color: color.inkSoft, marginTop: space.xs },
  shareBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1.5, borderColor: color.ink, borderRadius: 12, minHeight: 44, paddingHorizontal: 16, marginTop: 8 },
  shareText: { fontWeight: "700", color: color.ink },
  inputRow: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.sm },
  input: { flex: 1, borderWidth: 2, borderColor: color.border, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: space.sm, fontSize: font.sizes.base, color: color.ink, backgroundColor: color.surface },
  send: { width: 48, height: 48, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  sendActive: { backgroundColor: color.saffronBtn },
  sendIdle: { backgroundColor: color.inkFaint },
  legend: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space.md, marginTop: space.sm },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  swatch: { width: 22, height: 22, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  swatchGlyph: { fontSize: 10, fontFamily: "Nunito_800ExtraBold", fontWeight: "800" },
  legendLabel: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.xs, color: color.inkSoft },
});
