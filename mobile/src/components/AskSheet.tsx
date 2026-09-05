// AskSheet (U11-2/U11-3) — the answer sheet for ask-anywhere.
//
// A bottom sheet, not a screen: the learner must still see the thing they are
// asking about while they read the answer. The answer has TWO SHAPES and they
// must not look alike (U11-2):
//   • an ENGINE answer is a derivation — ordered steps with sūtra numbers via
//     U7-1's SutraCard (never a second derivation renderer) — and is
//     authoritative;
//   • a MODEL answer is prose and is help, marked plainly as an explanation.
//
// U11-3: no spinner on the engine path (it is instant and local); a
// content-shaped skeleton on the model path; a retryable error state, never a
// silent empty sheet (U10-3). When the daily quota is spent the sheet says so
// plainly and still shows what it can (P19-3's fallback arrives as
// routed_to='engine_fallback').

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from "react-native-reanimated";

import { ApiError, api, type AskEngineBlock, type AskResponse } from "../api/client";
import SutraCard from "./derivation/SutraCard";
import { haptics } from "../services/haptics";
import { color, font, radius, script, space } from "../theme";

export interface AskContext {
  /** The screen the learner is on — sent verbatim to the backend router. */
  surface: string;
  /** The thing on the screen the question is about (a word, a join, a line). */
  subject: string;
}

interface AskSheetProps {
  visible: boolean;
  context: AskContext | null;
  onClose: () => void;
}

type Phase =
  | { kind: "input" }
  | { kind: "loading" }
  | { kind: "answer"; data: AskResponse; question: string }
  | { kind: "error"; message: string; question: string };

export default function AskSheet({ visible, context, onClose }: AskSheetProps) {
  const [phase, setPhase] = useState<Phase>({ kind: "input" });
  const [question, setQuestion] = useState("");

  // Reset to the input phase each time the sheet opens.
  useEffect(() => {
    if (visible) {
      setPhase({ kind: "input" });
      setQuestion("");
    }
  }, [visible, context?.subject]);

  const ask = useCallback(
    async (q: string) => {
      if (!context) return;
      haptics.tap();
      setPhase({ kind: "loading" });
      try {
        const data = await api.ask(context.surface, context.subject, q);
        setPhase({ kind: "answer", data, question: q });
      } catch (e) {
        const message =
          e instanceof ApiError
            ? e.status === 0
              ? "Couldn't reach the teacher — check your connection."
              : e.message || "Something went wrong."
            : "Something went wrong.";
        setPhase({ kind: "error", message, question: q });
      }
    },
    [context],
  );

  const data = phase.kind === "answer" ? phase.data : null;
  const isEngine = data?.routed_to === "engine";
  const isFallback = data?.routed_to === "engine_fallback";

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close help">
        <Animated.View entering={FadeIn.duration(140)} exiting={FadeOut.duration(120)} style={StyleSheet.absoluteFill} />
      </Pressable>
      <Animated.View
        entering={SlideInDown.springify().damping(22)}
        exiting={SlideOutDown.duration(160)}
        style={styles.sheet}
      >
        <View style={styles.grabber} />
        <View style={styles.header}>
          <Text style={styles.title}>Ask about this</Text>
          {context?.subject ? (
            <Text style={[styles.subject, script("semibold")]} numberOfLines={1}>
              {context.subject}
            </Text>
          ) : null}
        </View>

        {phase.kind === "input" ? (
          <View>
            <Text style={styles.hint}>
              What would you like to know? The grammar is answered instantly; anything else may take a moment.
            </Text>
            <TextInput
              style={styles.input}
              value={question}
              onChangeText={setQuestion}
              placeholder="e.g. why does it end like this?"
              placeholderTextColor={color.inkFaint}
              multiline
              onSubmitEditing={() => ask(question)}
            />
            <Pressable
              style={({ pressed }) => [styles.askBtn, pressed && { opacity: 0.9 }]}
              onPress={() => ask(question)}
              accessibilityRole="button"
              accessibilityLabel="Ask your question"
              accessibilityState={{ disabled: !context }}
            >
              <Text style={styles.askBtnText}>Ask</Text>
            </Pressable>
          </View>
        ) : null}

        {phase.kind === "loading" ? (
          <View style={styles.center}>
            <ActivityIndicator color={color.saffron} />
            <Text style={styles.loadingNote}>Thinking…</Text>
          </View>
        ) : null}

        {phase.kind === "error" ? (
          <View style={styles.center}>
            <Ionicons name="cloud-offline-outline" size={28} color={color.badText} />
            <Text style={styles.errorText}>{phase.message}</Text>
            <Pressable
              style={styles.retryBtn}
              onPress={() => ask(phase.question)}
              accessibilityRole="button"
              accessibilityLabel="Try again"
            >
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : null}

        {phase.kind === "answer" && data ? (
          <View style={styles.answerArea}>
            {isEngine ? (
              // Engine answer: authoritative derivation, rendered with the
              // sūtra cards — never a second derivation renderer (U11-2).
              <EngineAnswer blocks={data.engine.blocks ?? []} explanation={data.explanation} />
            ) : isFallback ? (
              <View>
                <Badge text="Today's explanations are used up" tone="warn" />
                <Text style={styles.prose}>{data.explanation}</Text>
              </View>
            ) : (
              // Model answer: prose, plainly marked as an explanation.
              <View>
                <Badge text="Explanation" tone="explain" />
                <Text style={styles.prose}>{data.explanation}</Text>
              </View>
            )}
            <Pressable
              style={styles.againBtn}
              onPress={() => setPhase({ kind: "input" })}
              accessibilityRole="button"
              accessibilityLabel="Ask something else"
            >
              <Text style={styles.againText}>Ask something else</Text>
            </Pressable>
          </View>
        ) : null}
      </Animated.View>
    </Modal>
  );
}

function Badge({ text, tone }: { text: string; tone: "explain" | "warn" }) {
  return (
    <View style={[styles.badge, tone === "warn" ? styles.badgeWarn : styles.badgeExplain]}>
      <Text style={[styles.badgeText, tone === "warn" && { color: color.warnText }]}>
        {tone === "warn" ? "⚠ " : ""}
        {text}
      </Text>
    </View>
  );
}

function EngineAnswer({ blocks, explanation }: { blocks: AskEngineBlock[]; explanation: string }) {
  return (
    <View>
      <Badge text="From the grammar engine — authoritative" tone="explain" />
      {blocks.map((b, i) => {
        if (b.kind === "parse") {
          return (
            <View key={i} style={styles.parseRow}>
              <Text style={[styles.parseWord, script("semibold")]}>{b.word}</Text>
              {b.iast ? <Text style={styles.parseIast}>{b.iast}</Text> : null}
              {b.stem && b.feature ? (
                <Text style={styles.parseFeat}>
                  {b.stem} · {b.feature}
                </Text>
              ) : null}
              {b.derivation?.steps?.length ? (
                <View style={styles.derivationBlock}>
                  {b.derivation.steps.slice(0, 6).map((s, j) => (
                    <SutraCard
                      key={j}
                      code={s.code}
                      sutraDevanagari={s.sutra || s.result}
                      index={j}
                    />
                  ))}
                </View>
              ) : null}
            </View>
          );
        }
        if (b.kind === "split") {
          return (
            <View key={i} style={styles.parseRow}>
              <Text style={[styles.parseWord, script("semibold")]}>{b.joined}</Text>
              {(b.splits ?? []).map((s, j) => (
                <Text key={j} style={styles.splitRow}>
                  <Text style={[styles.splitPart, script("semibold")]}>{s.first}</Text>
                  {" + "}
                  <Text style={[styles.splitPart, script("semibold")]}>{s.second}</Text>
                  {s.first_iast || s.second_iast ? (
                    <Text style={styles.parseIast}>  ({s.first_iast} + {s.second_iast})</Text>
                  ) : null}
                </Text>
              ))}
            </View>
          );
        }
        if (b.kind === "scansion") {
          return (
            <View key={i} style={styles.parseRow}>
              {(b.lines ?? []).map((line, j) => (
                <View key={j} style={styles.scanLine}>
                  <Text style={[styles.scanSyls, script("semibold")]}>
                    {line.syllables.map((s) => s.syllable_devanagari).join(" ")}
                  </Text>
                  <Text style={styles.scanWeights}>
                    {line.syllables.map((s) => s.weight).join(" ")}
                  </Text>
                </View>
              ))}
              {/* Absent is absent: no metre name the engine did not return. */}
              {b.metre ? <Text style={styles.metre}>Metre: {b.metre}</Text> : null}
            </View>
          );
        }
        return null;
      })}
      {blocks.length === 0 ? <Text style={styles.prose}>{explanation}</Text> : null}
    </View>
  );
}

const SHEET_MAX_H = "82%";

const styles = StyleSheet.create({
  backdrop: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, backgroundColor: "rgba(59,46,37,0.45)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: SHEET_MAX_H,
    backgroundColor: color.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.xl,
  },
  grabber: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: color.border,
    marginBottom: space.sm,
  },
  header: { marginBottom: space.sm },
  title: { fontSize: font.sizes.lg, fontWeight: "700", color: color.ink },
  subject: {
    fontSize: font.sizes.xl,
    color: color.saffronText,
    marginTop: space.xxs,
  },
  hint: { fontSize: font.sizes.sm, color: color.inkSoft, marginBottom: space.sm },
  input: {
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    backgroundColor: color.bg,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    minHeight: 64,
    fontSize: font.sizes.base,
    color: color.ink,
    textAlignVertical: "top",
    marginBottom: space.sm,
  },
  askBtn: {
    backgroundColor: color.saffron,
    borderRadius: radius.md,
    alignItems: "center",
    paddingVertical: 14,
    minHeight: 48,
    justifyContent: "center",
  },
  askBtnText: { color: color.white, fontWeight: "800", fontSize: font.sizes.base },
  center: { alignItems: "center", paddingVertical: space.xl, gap: space.sm },
  loadingNote: { color: color.inkSoft, fontSize: font.sizes.sm },
  errorText: { color: color.badText, fontSize: font.sizes.sm, textAlign: "center" },
  retryBtn: {
    borderWidth: 1,
    borderColor: color.saffron,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: "center",
  },
  retryText: { color: color.saffronText, fontWeight: "700" },
  answerArea: { paddingBottom: space.md },
  badge: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    marginBottom: space.sm,
  },
  badgeExplain: { backgroundColor: color.tutorBg },
  badgeWarn: { backgroundColor: color.warnBg },
  badgeText: { fontSize: font.sizes.xs, color: color.tutor, fontWeight: "700" },
  prose: { fontSize: font.sizes.base, color: color.ink, lineHeight: 24 },
  parseRow: { marginVertical: space.xs },
  parseWord: { fontSize: font.sizes.xl, color: color.ink },
  parseIast: { fontSize: font.sizes.sm, color: color.inkSoft, marginLeft: 6 },
  parseFeat: { fontSize: font.sizes.sm, color: color.saffronText, marginLeft: 8, fontWeight: "700" },
  derivationBlock: { marginTop: space.xs },
  splitRow: { fontSize: font.sizes.md, color: color.ink, marginTop: space.xxs },
  splitPart: { fontSize: font.sizes.md, color: color.ink },
  scanLine: { marginTop: space.xxs },
  scanSyls: { fontSize: font.sizes.base, color: color.ink },
  scanWeights: { fontSize: font.sizes.xs, color: color.inkSoft, letterSpacing: 2 },
  metre: { fontSize: font.sizes.sm, color: color.inkSoft, marginTop: 4 },
  againBtn: {
    marginTop: space.md,
    alignItems: "center",
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: "center",
  },
  againText: { color: color.saffronText, fontWeight: "700", fontSize: font.sizes.sm },
});
