// Number Builder (सङ्ख्या-रचना): compose the spoken number phrase through
// dropdowns — never a four-option quiz. Each slot opens a bottom selection
// sheet with 4-8 plausible choices; nothing is marked correct. After a
// prompt locks, the assembled reading, the component breakdown and the
// reviewed readings appear, with "Hear the number" through TTS.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CatalogGame, playApi, type NumberPack, type NumberSlot } from "../games/v2/client";
import { useCatalogGame } from "../games/v2/useCatalog";
import { loadRemembered, usePlaySession } from "../games/v2/useSession";
import { GameTopBar, ResultSheetV2, SetupSheet, type SetupChoice } from "../games/v2/parts";
import { color, fill, font, onFill, radius, script, space } from "../theme";
import { haptics } from "../services/haptics";

type Props = {
  navigation: { goBack: () => void; navigate: (r: string, p?: object) => void };
};

export default function NumberBuilderScreen({ navigation }: Props) {
  const { session, result, busy, error, start, answer, finish, reset, setBusy } = usePlaySession("number");
  const [at, setAt] = useState(0);
  const [sel, setSel] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<NumberSlot | null>(null);
  const [feedback, setFeedback] = useState<{
    score: number; c: number; s: number; l: number;
    assembled: string; reading: string; alternative: string;
    display_international: string; display_indian: string;
  } | null>(null);
  const [remembered, setRemembered] = useState<Record<string, unknown>>({});
  const game = useCatalogGame("number");
  const pack = session?.pack as NumberPack | undefined;
  const prompt = pack?.prompts[at];

  useEffect(() => { void loadRemembered("number").then(setRemembered); }, []);
  useEffect(() => { setSel({}); setFeedback(null); }, [at, session?.id]);

  const submit = async () => {
    if (!prompt) return;
    setBusy(true);
    const res = await answer({ index: at, selections: sel });
    setBusy(false);
    if (!res) return;
    const r = res as typeof feedback & { error?: string };
    if (r.error) { setFeedback(null); return; }
    setFeedback(r);
  };

  const next = () => {
    if (!pack) return;
    if (at + 1 >= pack.prompts.length) void finish();
    else setAt(at + 1);
  };

  const hearIt = async () => {
    if (!feedback) return;
    try {
      const { api } = await import("../api/client");
      const res = await api.tts(session?.answer_lang === "en" ? stripDevanagari(feedback.reading) : feedback.reading, "sa-IN");
      void res;
    } catch { /* audio optional */ }
  };

  if (!session) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <GameTopBar title="Number Builder" sa="सङ्ख्या-रचना" onClose={() => navigation.goBack()} />
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
      <GameTopBar title="Number Builder" sa="सङ्ख्या-रचना"
        onClose={() => void finish().then(() => navigation.goBack())}
        right={<View style={{ alignItems: "flex-end", marginRight: space.sm }}>
          <Text style={styles.count}>{at + 1}/{pack?.prompts.length ?? 5}</Text>
        </View>} />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.numberCard}>
          <Text style={styles.number} accessibilityRole="header" accessibilityLabel={`Build the reading of ${prompt?.display_indian ?? ""}`}>
            {prompt?.display_indian}
          </Text>
          <Text style={styles.numberIntl}>{prompt?.display_international}</Text>
        </View>

        <PhraseSkeleton prompt={prompt} selections={sel} onOpen={(s) => setOpen(s)} disabled={!!feedback}
          onClear={(slotId) => setSel((cur) => { const n = { ...cur }; delete n[slotId]; return n; })} />

        {feedback && (
          <View style={styles.feedback}>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreBig}>{feedback.score}<Text style={styles.scoreOf}>/100</Text></Text>
              <View style={{ flex: 1, gap: 3 }}>
                <Bar label="Values" v={feedback.c} w={60} />
                <Bar label="Structure" v={feedback.s} w={25} />
                <Bar label="Construction" v={feedback.l} w={15} />
              </View>
            </View>
            <Text style={[styles.reading, script("regular")]}>{feedback.assembled}</Text>
            <View style={styles.readingRow}>
              <Text style={styles.readingLabel}>Reviewed reading</Text>
              <Text style={[styles.readingValue, script("regular")]}>{feedback.reading}</Text>
            </View>
            {feedback.alternative !== feedback.reading && (
              <View style={styles.readingRow}>
                <Text style={styles.readingLabel}>Also accepted</Text>
                <Text style={[styles.readingValue, script("regular")]}>{feedback.alternative}</Text>
              </View>
            )}
            <Pressable onPress={() => void hearIt()} accessibilityRole="button" accessibilityLabel="Hear the number"
              style={styles.hearBtn}>
              <Ionicons name="volume-high" size={18} color={color.ink} />
              <Text style={styles.hearText}>Hear the number</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
      <View style={styles.submitRow}>
        {!feedback ? (
          <Pressable onPress={() => void submit()} disabled={busy || Object.keys(sel).length === 0}
            accessibilityRole="button" accessibilityLabel="Lock answer"
            style={[styles.submit, (busy || Object.keys(sel).length === 0) && styles.submitIdle]}>
            <Text style={[styles.submitText, (busy || Object.keys(sel).length === 0) && styles.submitIdleText]}>
              Lock answer
            </Text>
          </Pressable>
        ) : (
          <Pressable onPress={next} accessibilityRole="button" accessibilityLabel="Next number" style={styles.submit}>
            <Text style={styles.submitText}>{at + 1 >= (pack?.prompts.length ?? 5) ? "Finish" : "Next"}</Text>
          </Pressable>
        )}
      </View>

      <SlotSheet slot={open} lang={pack?.answer_lang ?? "sa"}
        current={open ? sel[open.id] : undefined}
        onPick={(sid) => { if (open) { haptics.tap(); setSel((cur) => ({ ...cur, [open.id]: sid })); } setOpen(null); }}
        onClose={() => setOpen(null)} />
    </SafeAreaView>
  );
}

function stripDevanagari(t: string): string {
  return t;
}

function Bar({ label, v, w }: { label: string; v: number; w: number }) {
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${Math.round(v * 100)}%` }]} />
      </View>
      <Text style={styles.barVal}>{Math.round(v * w)}</Text>
    </View>
  );
}

function PhraseSkeleton({ prompt, selections, onOpen, onClear, disabled }: {
  prompt?: NumberPack["prompts"][number];
  selections: Record<string, string>;
  onOpen: (s: NumberSlot) => void;
  onClear: (id: string) => void;
  disabled: boolean;
}) {
  if (!prompt) return null;
  const groups: NumberSlot[][] = [];
  for (const s of prompt.slots) {
    if (s.kind === "sign" || s.kind === "coef" || s.kind === "unit" || s.kind === "scale") {
      if (groups.length === 0 || s.kind === "scale" || groups[groups.length - 1][0]?.kind === "scale") {
        if (groups.length === 0 || s.kind !== "coef") groups.push([]);
      }
      groups[groups.length - 1].push(s);
    } else {
      groups.push([s]);
    }
  }
  const isSa = true;
  return (
    <View style={styles.skeleton}>
      {groups.map((g, gi) => (
        <View key={gi} style={styles.group}>
          {g.map((slot) => {
            const chosen = slot.options.find((o) => o.semantic_id === selections[slot.id]);
            return (
              <View key={slot.id} style={{ gap: 4 }}>
                <Pressable onPress={() => !disabled && onOpen(slot)} disabled={disabled}
                  accessibilityRole="button"
                  accessibilityLabel={`${slot.label}${chosen ? `, selected` : ", empty"}`}
                  accessibilityState={{ disabled }}
                  style={[styles.slotBtn, chosen && styles.slotBtnOn]}>
                  {chosen ? (
                    <Text style={[styles.slotText, script("semibold")]} numberOfLines={1}>
                      {isSa ? chosen.dev : chosen.text}
                    </Text>
                  ) : (
                    <Text style={styles.slotEmpty}>{slot.label}</Text>
                  )}
                </Pressable>
                {chosen && !disabled && (
                  <Pressable onPress={() => onClear(slot.id)} accessibilityRole="button"
                    accessibilityLabel={`Clear ${slot.label}`} style={styles.clearBtn}>
                    <Ionicons name="close-circle" size={16} color={color.inkFaint} />
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function SlotSheet({ slot, lang, current, onPick, onClose }: {
  slot: NumberSlot | null;
  lang: string;
  current?: string;
  onPick: (semanticId: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={!!slot} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose} accessibilityLabel="Close options">
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>{slot?.label ?? ""}</Text>
          <ScrollView style={{ maxHeight: 380 }}>
            {(slot?.options ?? []).map((o) => {
              const on = o.semantic_id === current;
              return (
                <Pressable key={o.semantic_id} onPress={() => onPick(o.semantic_id)}
                  accessibilityRole="button" accessibilityLabel={lang === "en" ? o.text : `${o.dev} (${o.roman})`}
                  accessibilityState={{ selected: on }}
                  style={[styles.sheetRow, on && styles.sheetRowOn]}>
                  {lang === "en" ? (
                    <Text style={[styles.sheetText, on && styles.sheetTextOn]}>{o.text}</Text>
                  ) : (
                    <>
                      <Text style={[styles.sheetText, script("semibold"), on && styles.sheetTextOn]}>{o.dev}</Text>
                      <Text style={[styles.sheetRoman, on && styles.sheetRomanOn]}>{o.roman}</Text>
                    </>
                  )}
                  {on && <Ionicons name="checkmark" size={20} color={onFill.gold} />}
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close"
            style={styles.sheetClose}>
            <Text style={styles.sheetCloseText}>Close</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  body: { padding: space.lg, gap: space.md },
  doneBody: { padding: space.lg, justifyContent: "center", flexGrow: 1 },
  numberCard: { backgroundColor: fill.ink, borderRadius: radius.lg, padding: space.lg, alignItems: "center", gap: 4 },
  number: { color: onFill.text, fontWeight: "800", fontSize: 32, fontVariant: ["tabular-nums"] },
  numberIntl: { color: onFill.soft, fontSize: font.sizes.sm, fontVariant: ["tabular-nums"] },
  skeleton: { gap: space.sm },
  group: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, alignItems: "center" },
  slotBtn: {
    minWidth: 84, minHeight: 52, borderRadius: radius.md, borderWidth: 1.5, borderStyle: "dashed",
    borderColor: color.border, backgroundColor: color.surface, alignItems: "center", justifyContent: "center",
    paddingHorizontal: space.sm,
  },
  slotBtnOn: { borderStyle: "solid", borderColor: color.saffronBtn, backgroundColor: color.saffronLight },
  slotText: { fontSize: 17, lineHeight: 26, color: color.ink, textAlign: "center" },
  slotEmpty: { fontSize: font.sizes.xs, color: color.inkFaint },
  clearBtn: { alignItems: "center" },
  feedback: { backgroundColor: color.surface, borderRadius: radius.lg, padding: space.md, gap: 8 },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  scoreBig: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 36, color: color.ink },
  scoreOf: { fontSize: font.sizes.sm, color: color.inkSoft },
  barRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  barLabel: { width: 82, fontSize: font.sizes.xs, color: color.inkSoft },
  barTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: color.border, overflow: "hidden" },
  barFill: { height: 6, backgroundColor: color.saffronBtn },
  barVal: { width: 22, fontSize: font.sizes.xs, color: color.inkSoft, textAlign: "right" },
  reading: { fontSize: 16, lineHeight: 26, color: color.ink },
  readingRow: { gap: 1 },
  readingLabel: { fontSize: font.sizes.xs, color: color.inkSoft, textTransform: "uppercase", fontWeight: "700" },
  readingValue: { fontSize: font.sizes.sm, lineHeight: 22, color: color.ink },
  hearBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", borderWidth: 1.5, borderColor: color.ink, borderRadius: radius.md, minHeight: 44, paddingHorizontal: space.md },
  hearText: { fontWeight: "700", color: color.ink },
  submitRow: { padding: space.lg, paddingTop: space.sm },
  submit: { backgroundColor: color.saffronBtn, borderRadius: radius.md, minHeight: 52, alignItems: "center", justifyContent: "center" },
  submitIdle: { backgroundColor: color.surfaceMuted },
  submitText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  submitIdleText: { color: color.inkFaint },
  count: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.lg, color: color.ink },
  countLabel: { fontSize: font.sizes.xs, color: color.inkSoft },
  loading: { textAlign: "center", marginTop: 40, color: color.inkSoft },
  sheetBackdrop: { flex: 1, backgroundColor: "rgba(59,46,37,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: color.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: space.lg, gap: space.sm },
  sheetTitle: { fontWeight: "800", fontSize: font.sizes.lg, color: color.ink },
  sheetRow: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 56, borderRadius: radius.md, paddingHorizontal: space.md, borderWidth: 1, borderColor: color.border, marginBottom: 6 },
  sheetRowOn: { backgroundColor: color.saffronLight, borderColor: color.saffronBtn },
  sheetText: { fontSize: 20, lineHeight: 32, color: color.ink, flex: 1 },
  sheetTextOn: { color: color.saffronText },
  sheetRoman: { fontSize: font.sizes.sm, color: color.inkSoft },
  sheetRomanOn: { color: color.saffronText },
  sheetClose: { minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: color.surfaceMuted },
  sheetCloseText: { fontWeight: "700", color: color.ink },
});
