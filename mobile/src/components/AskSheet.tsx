// AskSheet (U11-2/U11-3) — the answer sheet for ask-anywhere.
//
// A bottom sheet, not a screen: the learner must still see the thing they are
// asking about while they read the answer. It is an overlay drawn by
// AskProvider rather than an RN Modal: a Modal is its own window, so the
// keyboard covered its input on Android. Here the sheet rides above the
// keyboard (react-native-keyboard-controller) and the Android back button
// closes it.
//
// The answer has TWO SHAPES and they must not look alike (U11-2):
//   • an ENGINE answer is a derivation — ordered steps with sūtra numbers via
//     U7-1's SutraCard (never a second derivation renderer) — and is
//     authoritative;
//   • a MODEL answer is prose and is help, shown as plain text.
//
// U11-3: no spinner on the engine path (it is instant and local); a
// content-shaped skeleton on the model path; a retryable error state, never a
// silent empty sheet (U10-3). When the daily quota is spent the sheet says so
// plainly and still shows what it can (routed_to='engine_fallback').

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  BackHandler,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ApiError, api, type AskEngineBlock, type AskResponse } from "../api/client";
import SutraCard from "./derivation/SutraCard";
import { Skeleton } from "./Skeleton";
import { haptics } from "../services/haptics";
import { color, font, radius, script, space } from "../theme";
import { plain } from "../utils/text";

export interface AskContext {
  /** The screen the learner is on, sent to the backend router. */
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
  | { kind: "idle" }
  | { kind: "loading"; question: string }
  | { kind: "answer"; data: AskResponse; question: string }
  | { kind: "error"; message: string; question: string };

/** One tap asks; most questions need no typing. */
function suggestionsFor(surface: string, hasSubject: boolean): string[] {
  if (hasSubject && surface === "shloka") {
    return ["What does this verse mean?", "Split it into words", "What metre is this?"];
  }
  if (hasSubject) return ["What does this mean?", "How do I say it?", "Explain the grammar"];
  return ["How do I say hello?", "What is sandhi?", "What are the cases?"];
}

async function send(surface: string, subject: string, question: string): Promise<AskResponse> {
  if (subject) return api.ask(surface, subject, question);
  try {
    return await api.ask("general", "", question);
  } catch (e) {
    // A backend from before free questions were allowed rejects an empty
    // subject (422). Send the question as the subject instead.
    if (e instanceof ApiError && e.status === 422) return api.ask("general", question, question);
    throw e;
  }
}

function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 0) return "Couldn't reach the teacher. Check your connection.";
    if (e.status === 429) return "Too many questions right now. Try again soon.";
    if (e.status === 503) return "The teacher is busy. Try again in a moment.";
  }
  return "Something went wrong. Try again.";
}

export default function AskSheet({ visible, context, onClose }: AskSheetProps) {
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [question, setQuestion] = useState("");
  const [useSubject, setUseSubject] = useState(true);
  const inputRef = useRef<TextInput>(null);

  // A fresh sheet each time it opens, or when the subject it is about changes.
  useEffect(() => {
    if (visible) {
      setPhase({ kind: "idle" });
      setQuestion("");
      setUseSubject(true);
    }
  }, [visible, context?.surface, context?.subject]);

  // The Android back button closes the sheet instead of leaving the screen.
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  const surface = context?.surface ?? "general";
  const subject = useSubject ? (context?.subject ?? "").trim() : "";

  const ask = useCallback(
    async (raw: string) => {
      const q = raw.trim();
      if (!q) return;
      Keyboard.dismiss();
      haptics.tap();
      setQuestion("");
      setPhase({ kind: "loading", question: q });
      try {
        setPhase({ kind: "answer", data: await send(surface, subject, q), question: q });
      } catch (e) {
        setPhase({ kind: "error", message: errorMessage(e), question: q });
      }
    },
    [surface, subject],
  );

  const again = useCallback(() => {
    setPhase({ kind: "idle" });
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const loading = phase.kind === "loading";

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {visible ? (
        <>
          <Animated.View
            entering={FadeIn.duration(140)}
            exiting={FadeOut.duration(120)}
            style={StyleSheet.absoluteFill}
          >
            <Pressable
              style={styles.backdrop}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
            />
          </Animated.View>
          <KeyboardAvoidingView behavior="padding" style={styles.kav} pointerEvents="box-none">
            <Animated.View
              entering={SlideInDown.springify().damping(22)}
              exiting={SlideOutDown.duration(160)}
              style={[styles.sheet, { paddingBottom: insets.bottom + space.md }]}
            >
              <View style={styles.grabber} />
              <View style={styles.header}>
                <Text style={styles.title} accessibilityRole="header">
                  Ask
                </Text>
                <Pressable
                  onPress={onClose}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  style={styles.close}
                >
                  <Ionicons name="close" size={22} color={color.inkSoft} />
                </Pressable>
              </View>

              {subject ? (
                <View style={styles.about}>
                  <Text style={styles.aboutLabel}>About</Text>
                  <Text style={[styles.aboutSubject, script("semibold")]} numberOfLines={1}>
                    {subject}
                  </Text>
                  <Pressable
                    onPress={() => setUseSubject(false)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel="Ask without this"
                  >
                    <Ionicons name="close-circle" size={18} color={color.inkFaint} />
                  </Pressable>
                </View>
              ) : null}

              <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollBody}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {phase.kind === "idle" ? (
                  <View style={styles.chips}>
                    {suggestionsFor(surface, !!subject).map((s) => (
                      <Pressable
                        key={s}
                        onPress={() => void ask(s)}
                        accessibilityRole="button"
                        accessibilityLabel={s}
                        style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
                      >
                        <Text style={styles.chipText}>{s}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.asked} numberOfLines={3}>
                    {phase.question}
                  </Text>
                )}

                {loading ? (
                  <View
                    style={styles.skeleton}
                    accessible
                    accessibilityRole="progressbar"
                    accessibilityLabel="Thinking"
                  >
                    <Skeleton height={14} />
                    <Skeleton height={14} width="92%" />
                    <Skeleton height={14} width="60%" />
                  </View>
                ) : null}

                {phase.kind === "error" ? (
                  <View style={styles.error} accessibilityRole="alert">
                    <Ionicons name="cloud-offline-outline" size={26} color={color.badText} />
                    <Text style={styles.errorText}>{phase.message}</Text>
                    <Pressable
                      onPress={() => void ask(phase.question)}
                      accessibilityRole="button"
                      accessibilityLabel="Try again"
                      style={styles.retry}
                    >
                      <Text style={styles.retryText}>Try again</Text>
                    </Pressable>
                  </View>
                ) : null}

                {phase.kind === "answer" ? (
                  <View accessibilityLiveRegion="polite">
                    <Answer data={phase.data} />
                    <Pressable
                      onPress={again}
                      accessibilityRole="button"
                      accessibilityLabel="Ask something else"
                      style={styles.again}
                    >
                      <Text style={styles.againText}>Ask something else</Text>
                    </Pressable>
                  </View>
                ) : null}
              </ScrollView>

              <View style={styles.inputRow}>
                <TextInput
                  ref={inputRef}
                  style={styles.input}
                  value={question}
                  onChangeText={setQuestion}
                  placeholder="Type a question"
                  placeholderTextColor={color.inkFaint}
                  multiline
                  maxLength={300}
                  editable={!loading}
                  accessibilityLabel="Your question"
                />
                <Pressable
                  onPress={() => void ask(question)}
                  disabled={loading || !question.trim()}
                  accessibilityRole="button"
                  accessibilityLabel="Send"
                  accessibilityState={{ disabled: loading || !question.trim() }}
                  style={[styles.send, (loading || !question.trim()) && styles.sendOff]}
                >
                  <Ionicons name="arrow-up" size={22} color={color.white} />
                </Pressable>
              </View>
            </Animated.View>
          </KeyboardAvoidingView>
        </>
      ) : null}
    </View>
  );
}

// ─── Answers ──────────────────────────────────────────────────────────

function Answer({ data }: { data: AskResponse }) {
  if (data.routed_to === "engine") {
    return <EngineAnswer blocks={data.engine.blocks ?? []} explanation={data.explanation} />;
  }
  if (data.routed_to === "engine_fallback") {
    return (
      <View>
        <Badge text="Daily limit reached" tone="warn" />
        <Text style={styles.prose}>{plain(data.explanation)}</Text>
      </View>
    );
  }
  return <Text style={styles.prose}>{plain(data.explanation)}</Text>;
}

function Badge({ text, tone }: { text: string; tone: "explain" | "warn" }) {
  return (
    <View style={[styles.badge, tone === "warn" ? styles.badgeWarn : styles.badgeExplain]}>
      <Text style={[styles.badgeText, tone === "warn" && { color: color.warnText }]}>{text}</Text>
    </View>
  );
}

function EngineAnswer({ blocks, explanation }: { blocks: AskEngineBlock[]; explanation: string }) {
  return (
    <View>
      <Badge text="From the grammar engine" tone="explain" />
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
                    <SutraCard key={j} code={s.code} sutraDevanagari={s.sutra || s.result} index={j} />
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
                    <Text style={styles.parseIast}>
                      {"  "}({s.first_iast} + {s.second_iast})
                    </Text>
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
                  <Text style={styles.scanWeights}>{line.syllables.map((s) => s.weight).join(" ")}</Text>
                </View>
              ))}
              {/* Absent is absent: no metre name the engine did not return. */}
              {b.metre ? <Text style={styles.metre}>Metre: {b.metre}</Text> : null}
            </View>
          );
        }
        return null;
      })}
      {blocks.length === 0 ? <Text style={styles.prose}>{plain(explanation)}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(59,46,37,0.45)" },
  kav: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    maxHeight: "86%",
    backgroundColor: color.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
  grabber: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: color.border,
    marginBottom: space.sm,
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.lg, color: color.ink },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: color.surfaceMuted },
  about: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: space.xs,
    maxWidth: "100%",
    marginTop: space.xs,
    paddingLeft: space.sm,
    paddingRight: space.xs,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: color.saffronLight,
  },
  aboutLabel: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.xs, color: color.saffronText },
  aboutSubject: { flexShrink: 1, fontSize: font.sizes.base, color: color.ink },
  scroll: { flexGrow: 0, flexShrink: 1 },
  scrollBody: { paddingVertical: space.sm, gap: space.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.xs },
  chip: {
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceMuted,
    borderWidth: 1,
    borderColor: color.border,
  },
  chipText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: color.ink },
  pressed: { opacity: 0.85 },
  asked: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.sm, color: color.inkSoft },
  skeleton: { gap: space.xs, paddingVertical: space.xs },
  error: { alignItems: "center", gap: space.sm, paddingVertical: space.md },
  errorText: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.sm, color: color.badText, textAlign: "center" },
  retry: { minHeight: 44, justifyContent: "center", paddingHorizontal: space.lg, borderRadius: radius.md, backgroundColor: color.saffronLight },
  retryText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm, color: color.saffronText },
  again: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center", marginTop: space.sm },
  againText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm, color: color.saffronText },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: space.xs, paddingTop: space.xs },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 112,
    paddingHorizontal: space.md,
    paddingTop: 12,
    paddingBottom: 12,
    borderRadius: 24,
    backgroundColor: color.bg,
    borderWidth: 1,
    borderColor: color.border,
    fontFamily: "Nunito_600SemiBold",
    fontSize: font.sizes.base,
    color: color.ink,
    textAlignVertical: "center",
  },
  send: { width: 48, height: 48, borderRadius: 24, backgroundColor: color.saffronBtn, alignItems: "center", justifyContent: "center" },
  sendOff: { opacity: 0.4 },
  badge: { alignSelf: "flex-start", borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 4, marginBottom: space.sm },
  badgeExplain: { backgroundColor: color.tutorBg },
  badgeWarn: { backgroundColor: color.warnBg },
  badgeText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.xs, color: color.tutor },
  prose: { fontFamily: "Nunito_500Medium", fontWeight: "500", fontSize: font.sizes.base, color: color.ink, lineHeight: 24 },
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
});
