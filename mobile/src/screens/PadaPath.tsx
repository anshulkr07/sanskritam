// Pada Path (पद-पथः): assemble 4-8 word tiles into a phrase. Tap-to-place
// with removal; sentences accept every reviewed word order, quotations keep
// their prescribed sequence. Partial credit comes from required relations.

import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CatalogGame, playApi, type PadaPathPack } from "../games/v2/client";
import { useCatalogGame } from "../games/v2/useCatalog";
import { loadRemembered, usePlaySession } from "../games/v2/useSession";
import { GameTopBar, ResultSheetV2, SetupSheet, type SetupChoice } from "../games/v2/parts";
import { color, fill, font, onFill, radius, script, space } from "../theme";
import { haptics } from "../services/haptics";

type Props = {
  navigation: { goBack: () => void; navigate: (r: string, p?: object) => void };
};

export default function PadaPathScreen({ navigation }: Props) {
  const { session, result, busy, error, start, answer, finish, reset, setBusy } = usePlaySession("pada-path");
  const [at, setAt] = useState(0);
  const [order, setOrder] = useState<string[]>([]);
  const [placed, setPlaced] = useState<{ id: string; sa: string; iast: string }[]>([]);
  const [feedback, setFeedback] = useState<{ accepted: boolean; score: number; detail: string; reading: string } | null>(null);
  const [remembered, setRemembered] = useState<Record<string, unknown>>({});
  const game = useCatalogGame("pada-path");
  const pack = session?.pack as PadaPathPack | undefined;
  const prompt = pack?.prompts[at];

  useEffect(() => { void loadRemembered("pada-path").then(setRemembered); }, []);
  useEffect(() => { setOrder([]); setPlaced([]); setFeedback(null); }, [at, session?.id]);

  const place = (tile: { id: string; sa: string; iast: string }) => {
    if (feedback || order.includes(tile.id)) return;
    haptics.tap();
    setOrder((o) => [...o, tile.id]);
    setPlaced((p) => [...p, tile]);
  };
  const remove = (id: string) => {
    if (feedback) return;
    haptics.tap();
    setOrder((o) => o.filter((x) => x !== id));
    setPlaced((p) => p.filter((x) => x.id !== id));
  };

  const submit = async () => {
    if (!prompt || placed.length !== prompt.tiles.length) return;
    setBusy(true);
    const res = await answer({ index: at, order });
    setBusy(false);
    if (!res) return;
    const r = res as { score: number; accepted: boolean; detail: string; meaning: string; correct_reading: string };
    haptics[r.accepted ? "correct" : "incorrect"]();
    setFeedback({ accepted: r.accepted, score: r.score, detail: r.detail, reading: r.correct_reading });
  };

  const next = () => {
    if (!pack) return;
    if (at + 1 >= pack.prompts.length) void finish();
    else setAt(at + 1);
  };

  if (!session) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <GameTopBar title="Pada Path" sa="पद-पथः" onClose={() => navigation.goBack()} />
        {!game || error ? (
          <Text style={styles.loading} accessibilityRole="alert">{error ?? "Loading…"}</Text>
        ) : (
          <SetupSheet game={game as CatalogGame} remembered={remembered} onStart={(c) => void start(c)} busy={busy} />
        )}
      </SafeAreaView>
    );
  }

  if (result) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.doneBody}>
          <ResultSheetV2 result={result} onAgain={() => { reset(); setAt(0); }} onDone={() => navigation.goBack()} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <GameTopBar title="Pada Path" sa="पद-पथः"
        onClose={() => void finish().then(() => navigation.goBack())}
        right={<View style={{ alignItems: "flex-end", marginRight: space.sm }}>
          <Text style={styles.count}>{at + 1}/{pack?.prompts.length ?? 5}</Text>
          <Text style={styles.countLabel}>{prompt?.type === "quotation" ? "Restore this verse" : "Build a sentence"}</Text>
        </View>} />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.hint} accessibilityRole="header">
          {prompt?.type === "quotation" ? "Restore the verse line — keep its sequence" : "Build the sentence — any reviewed order counts"}
        </Text>
        <View style={styles.slots}>
          {(prompt?.tiles ?? []).map((_, i) => {
            const t = placed[i];
            return (
              <Pressable key={i} onPress={() => t && remove(t.id)} accessibilityRole="button"
                accessibilityLabel={t ? `Slot ${i + 1}: ${t.sa}. Tap to remove` : `Slot ${i + 1}, empty`}
                style={[styles.slot, !!t && styles.slotFilled]}>
                <Text style={[styles.slotText, script("semibold")]}>{t?.sa ?? ""}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.bank}>
          {(prompt?.tiles ?? []).filter((t) => !order.includes(t.id)).map((t) => (
            <Pressable key={t.id} onPress={() => place(t)} accessibilityRole="button" accessibilityLabel={t.sa}
              style={styles.bankTile}>
              <Text style={[styles.bankText, script("semibold")]}>{t.sa}</Text>
              {!!t.iast && <Text style={styles.bankIast}>{t.iast}</Text>}
            </Pressable>
          ))}
        </View>
        {feedback && (
          <View style={[styles.feedback, { backgroundColor: feedback.accepted ? fill.sage : fill.maroon }]}>
            <Text style={styles.feedbackHead}>
              {feedback.accepted ? "साधु!" : `${feedback.score}% — keep going`}
            </Text>
            <Text style={[styles.feedbackBody, script("regular")]}>{feedback.reading}</Text>
            <Text style={styles.feedbackBody}>{feedback.detail}</Text>
            {!!prompt?.meaning && <Text style={styles.feedbackMeaning}>{prompt.meaning}</Text>}
            {!!prompt?.explanation && <Text style={styles.feedbackBody}>{prompt.explanation}</Text>}
          </View>
        )}
      </ScrollView>
      <View style={styles.submitRow}>
        {!feedback ? (
          <Pressable onPress={() => void submit()}
            disabled={placed.length !== (prompt?.tiles.length ?? 99) || busy}
            accessibilityRole="button" accessibilityLabel="Check phrase"
            style={[styles.submit, placed.length !== (prompt?.tiles.length ?? 99) && styles.submitIdle]}>
            <Text style={[styles.submitText, placed.length !== (prompt?.tiles.length ?? 99) && styles.submitIdleText]}>
              Check
            </Text>
          </Pressable>
        ) : (
          <Pressable onPress={next} accessibilityRole="button" accessibilityLabel="Next phrase" style={styles.submit}>
            <Text style={styles.submitText}>{at + 1 >= (pack?.prompts.length ?? 5) ? "Finish" : "Next"}</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  body: { padding: space.lg, gap: space.md },
  doneBody: { padding: space.lg, justifyContent: "center", flexGrow: 1 },
  hint: { fontWeight: "700", color: color.inkSoft, textAlign: "center", fontSize: font.sizes.sm },
  slots: { flexDirection: "row", flexWrap: "wrap", gap: space.xs, justifyContent: "center" },
  slot: {
    minWidth: 64, minHeight: 56, borderRadius: radius.md, borderWidth: 2, borderStyle: "dashed",
    borderColor: color.border, backgroundColor: color.surface, alignItems: "center", justifyContent: "center",
    paddingHorizontal: space.sm,
  },
  slotFilled: { borderStyle: "solid", borderColor: color.saffronBtn, backgroundColor: color.saffronLight },
  slotText: { fontSize: 18, lineHeight: 28, color: color.ink },
  bank: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, justifyContent: "center" },
  bankTile: {
    minWidth: 72, minHeight: 60, borderRadius: radius.md, backgroundColor: color.surface,
    alignItems: "center", justifyContent: "center", paddingHorizontal: space.sm, gap: 2,
    borderWidth: 1, borderColor: color.border,
  },
  bankText: { fontSize: 19, lineHeight: 28, color: color.ink },
  bankIast: { fontSize: font.sizes.xs, color: color.inkSoft },
  feedback: { borderRadius: radius.lg, padding: space.md, gap: 4 },
  feedbackHead: { color: onFill.text, fontWeight: "800", fontSize: font.sizes.lg },
  feedbackBody: { color: onFill.soft, fontSize: font.sizes.sm },
  feedbackMeaning: { color: onFill.gold, fontSize: font.sizes.sm, fontStyle: "italic" },
  submitRow: { padding: space.lg, paddingTop: space.sm },
  submit: { backgroundColor: color.saffronBtn, borderRadius: radius.md, minHeight: 52, alignItems: "center", justifyContent: "center" },
  submitIdle: { backgroundColor: color.surfaceMuted },
  submitText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  submitIdleText: { color: color.inkFaint },
  count: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.lg, color: color.ink },
  countLabel: { fontSize: font.sizes.xs, color: color.inkSoft },
  loading: { textAlign: "center", marginTop: 40, color: color.inkSoft },
});
