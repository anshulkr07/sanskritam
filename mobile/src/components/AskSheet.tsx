// AskSheet (U11-2/U11-3) — the answer sheet for ask-anywhere.
//
// A bottom sheet, not a screen: the learner must still see the thing they are
// asking about while they read the answer. It is an overlay drawn by
// AskProvider rather than an RN Modal: a Modal is its own window, so the
// keyboard covered its input on Android. Here the sheet rides above the
// keyboard (react-native-keyboard-controller) and the Android back button
// closes it.
//
// The answer has THREE SHAPES and they must not look alike (U11-2):
//   • an ENGINE answer is a derivation — ordered steps with sūtra numbers via
//     U7-1's SutraCard (never a second derivation renderer) — and is
//     authoritative;
//   • a MODEL answer is prose and is help, shown as plain text;
//   • a CARD answer is a shaped wider answer (festivals, tithi, home
//     practice): title, dates, steps and terms, with no white box around it.
//
// The sheet enters straight up, never with a bounce. The input row carries
// "This screen" (scan), the mic, the box and send. Suggestions are plain
// rows, not chips.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  BackHandler,
  Image,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type View as RNView,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";

import {
  ApiError,
  api,
  type AskEngineBlock,
  type AskPlace,
  type AskResponse,
} from "../api/client";
import SutraCard from "./derivation/SutraCard";
import AnswerCard from "./ask/AnswerCard";
import { Skeleton } from "./Skeleton";
import PlaceChooser from "./PlaceChooser";
import ReportButton from "./ReportButton";
import { haptics } from "../services/haptics";
import { getPhotoRecogniser } from "../services/photoRecogniser";
import { getPlace, type Place } from "../services/place";
import { useVoiceInput } from "../hooks/useVoiceInput";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { color, fill, font, onFill, outline, radius, script, space } from "../theme";
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
  /** Ref to the app content (bubble and sheet excluded) for screen capture. */
  contentRef: React.RefObject<RNView | null>;
}

type Phase =
  | { kind: "idle" }
  | { kind: "loading"; question: string }
  | { kind: "answer"; data: AskResponse; question: string; place: AskPlace | null }
  | { kind: "error"; message: string; question: string };

interface Attachment {
  uri: string;
  text: string;
  surfaceName: string;
}

const SCREEN_NAMES: Record<string, string> = {
  grammar: "Grammar",
  shloka: "Verse",
  lesson: "Lesson",
  challenge: "Challenge",
  varnamala: "Letter",
  read: "Reading",
  home: "Home",
  general: "Sanskritam",
};

function screenName(surface: string): string {
  return SCREEN_NAMES[surface] ?? surface;
}

/** One tap asks; most questions need no typing. Plain rows, not chips. */
function suggestionsFor(surface: string, hasSubject: boolean, hasScreen: boolean): string[] {
  if (hasScreen) {
    return ["What does this mean?", "Explain the grammar", "Give me one more example"];
  }
  // Home registers the verse of the day too. The Hindi row asks in Hindi, so
  // the answer comes back in Hindi.
  if (hasSubject && (surface === "shloka" || surface === "home")) {
    return [
      "What does this verse mean?",
      "इस श्लोक का अर्थ हिंदी में बताइए",
      "Split it into words",
      "What metre is this?",
    ];
  }
  return ["How do I say hello?", "What is today's tithi?", "What is sandhi?"];
}

async function send(
  surface: string,
  subject: string,
  question: string,
  screenText: string,
  place: AskPlace | null,
): Promise<AskResponse> {
  const opts = {
    ...(screenText ? { screenText } : {}),
    ...(place ? { place } : {}),
    cards: true,
  };
  if (subject) return api.ask(surface, subject, question, opts);
  try {
    return await api.ask("general", "", question, opts);
  } catch (e) {
    // A backend from before free questions were allowed rejects an empty
    // subject (422). Send the question as the subject instead.
    if (e instanceof ApiError && e.status === 422) {
      return api.ask("general", question, question, opts);
    }
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

function deleteTempFile(uri: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const FileSystem = require("expo-file-system/legacy");
    FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
  } catch {
    // No filesystem module (web): nothing to clean up.
  }
}

export default function AskSheet({ visible, context, onClose, contentRef }: AskSheetProps) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [question, setQuestion] = useState("");
  const [useSubject, setUseSubject] = useState(true);
  const [attach, setAttach] = useState<Attachment | null>(null);
  const [attaching, setAttaching] = useState(false);
  const [attachNote, setAttachNote] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const [choosingPlace, setChoosingPlace] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (noteTimer.current) clearTimeout(noteTimer.current);
      if (voiceTimer.current) clearTimeout(voiceTimer.current);
    },
    [],
  );

  const clearAttach = useCallback((a: Attachment | null) => {
    if (a) deleteTempFile(a.uri);
  }, []);

  // A fresh sheet each time it opens, or when the subject it is about changes.
  // The temp capture file is deleted with the attachment.
  useEffect(() => {
    if (visible) {
      setPhase({ kind: "idle" });
      setQuestion("");
      setUseSubject(true);
      setChoosingPlace(false);
      setVoiceError("");
      setAttachNote("");
      setAttach((a) => {
        if (a) deleteTempFile(a.uri);
        return null;
      });
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
    async (raw: string, placeOverride?: AskPlace | null) => {
      const q = raw.trim();
      if (!q) return;
      Keyboard.dismiss();
      haptics.tap();
      setQuestion("");
      setChoosingPlace(false);
      setPhase({ kind: "loading", question: q });
      try {
        const place = placeOverride ?? (await getPlace());
        const data = await send(surface, subject, q, attach?.text ?? "", place);
        setPhase({
          kind: "answer",
          data,
          question: q,
          place: placeOverride ?? place,
        });
      } catch (e) {
        setPhase({ kind: "error", message: errorMessage(e), question: q });
      }
    },
    [surface, subject, attach],
  );

  const again = useCallback(() => {
    setPhase({ kind: "idle" });
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const flashNote = useCallback((text: string) => {
    setAttachNote(text);
    if (noteTimer.current) clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => setAttachNote(""), 2000);
  }, []);

  const flashVoiceError = useCallback((text: string) => {
    setVoiceError(text);
    if (voiceTimer.current) clearTimeout(voiceTimer.current);
    voiceTimer.current = setTimeout(() => setVoiceError(""), 3000);
  }, []);

  const voice = useVoiceInput({
    onResult: (r) => {
      setVoiceError("");
      setQuestion((r.display || r.transcript).slice(0, 300));
    },
    onError: (message) => flashVoiceError(message),
  });

  const attachScreen = useCallback(async () => {
    if (attaching || attach) return;
    haptics.tap();
    setAttaching(true);
    try {
      const uri = await captureRef(contentRef, {
        format: "jpg",
        quality: 0.6,
        result: "tmpfile",
      });
      const name = screenName(surface);
      const bits: string[] = [];
      bits.push(subject ? `${name}: ${subject}` : name);
      // The on-device reader supplements the registered context. Its text
      // never leaves the phone as an image — only the text is sent.
      try {
        const ocr = await getPhotoRecogniser().recognise(uri);
        if (ocr?.text?.trim()) bits.push(ocr.text.trim());
      } catch {
        // Unreachable reader in this build: the registered context stands alone.
      }
      const text = bits.join("\n").slice(0, 1500);
      if (!text.trim() || (!subject && bits.length < 2)) {
        deleteTempFile(uri);
        flashNote("Nothing to read on this screen");
        return;
      }
      setAttach({ uri, text, surfaceName: name });
    } catch {
      flashNote("Nothing to read on this screen");
    } finally {
      setAttaching(false);
    }
  }, [attaching, attach, contentRef, surface, subject, flashNote]);

  const removeAttach = useCallback(() => {
    setAttach((a) => {
      clearAttach(a);
      return null;
    });
  }, [clearAttach]);

  const loading = phase.kind === "loading";

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {visible ? (
        <>
          <Animated.View
            entering={reduced ? undefined : FadeIn.duration(140)}
            exiting={reduced ? undefined : FadeOut.duration(120)}
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
              entering={
                reduced
                  ? undefined
                  : SlideInDown.duration(180).easing(Easing.out(Easing.cubic))
              }
              exiting={reduced ? undefined : SlideOutDown.duration(140)}
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

              {attach ? (
                <View style={styles.attach}>
                  <Image source={{ uri: attach.uri }} style={styles.thumb} />
                  <View style={styles.attachText}>
                    <Text style={styles.attachTitle}>This screen</Text>
                    <Text style={styles.attachSub} numberOfLines={1}>
                      {attach.surfaceName}
                    </Text>
                  </View>
                  <Pressable
                    onPress={removeAttach}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel="Remove this screen"
                  >
                    <Ionicons name="close-circle" size={18} color={color.inkFaint} />
                  </Pressable>
                </View>
              ) : null}

              {!!attachNote && <Text style={styles.note}>{attachNote}</Text>}

              <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollBody}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {choosingPlace ? (
                  <View>
                    <Text style={styles.placeTitle}>Set your place</Text>
                    <PlaceChooser
                      onPick={(p: Place) => {
                        const q =
                          phase.kind === "answer" || phase.kind === "error"
                            ? phase.question
                            : question;
                        if (q.trim()) void ask(q, p);
                        else setChoosingPlace(false);
                      }}
                    />
                    <Pressable
                      onPress={() => setChoosingPlace(false)}
                      accessibilityRole="button"
                      accessibilityLabel="Back to the answer"
                      style={styles.again}
                    >
                      <Text style={styles.againText}>Back to the answer</Text>
                    </Pressable>
                  </View>
                ) : phase.kind === "idle" ? (
                  <View style={styles.sug}>
                    {suggestionsFor(surface, !!subject, !!attach).map((s) => (
                      <Pressable
                        key={s}
                        onPress={() => void ask(s)}
                        accessibilityRole="button"
                        accessibilityLabel={s}
                        style={styles.sugRow}
                      >
                        <Text style={styles.sugText}>{s}</Text>
                        <Ionicons name="chevron-forward" size={15} color={color.inkFaint} />
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.asked} numberOfLines={3}>
                    {phase.question}
                  </Text>
                )}

                {!choosingPlace && loading ? (
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

                {!choosingPlace && phase.kind === "error" ? (
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

                {!choosingPlace && phase.kind === "answer" ? (
                  <View accessibilityLiveRegion="polite">
                    <Answer
                      data={phase.data}
                      question={phase.question}
                      onPlace={() => setChoosingPlace(true)}
                      onFollowUp={(f) => void ask(f)}
                    />
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

              {!!voiceError && <Text style={styles.note}>{voiceError}</Text>}

              <View style={styles.inputRow}>
                <Pressable
                  onPress={attachScreen}
                  disabled={attaching || !!attach}
                  accessibilityRole="button"
                  accessibilityLabel="Attach this screen"
                  accessibilityState={{ disabled: attaching || !!attach }}
                  style={[styles.round, (attaching || !!attach) && styles.roundActive]}
                >
                  <Ionicons
                    name="scan-outline"
                    size={20}
                    color={attaching || !!attach ? onFill.text : color.ink}
                  />
                </Pressable>
                <Pressable
                  onPress={voice.toggle}
                  disabled={voice.busy && !voice.recording}
                  accessibilityRole="button"
                  accessibilityLabel={voice.recording ? "Stop recording" : "Dictate your question"}
                  accessibilityState={{ disabled: voice.busy && !voice.recording }}
                  style={[
                    styles.round,
                    voice.recording && styles.roundRecording,
                    voice.busy && !voice.recording && styles.roundOff,
                  ]}
                >
                  <Ionicons
                    name={voice.recording ? "stop" : "mic-outline"}
                    size={20}
                    color={voice.recording ? color.white : color.ink}
                  />
                </Pressable>
                <TextInput
                  ref={inputRef}
                  style={styles.input}
                  value={question}
                  onChangeText={(t) => {
                    setQuestion(t);
                    if (voiceError) setVoiceError("");
                  }}
                  placeholder="Type a question"
                  placeholderTextColor={color.inkFaint}
                  multiline
                  maxLength={300}
                  editable={!loading && !voice.busy}
                  accessibilityLabel="Your question"
                />
                <Pressable
                  onPress={() => void ask(question)}
                  disabled={loading || voice.busy || !question.trim()}
                  accessibilityRole="button"
                  accessibilityLabel="Send"
                  accessibilityState={{ disabled: loading || voice.busy || !question.trim() }}
                  style={[styles.send, (loading || voice.busy || !question.trim()) && styles.sendOff]}
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

function Answer({
  data,
  question,
  onPlace,
  onFollowUp,
}: {
  data: AskResponse;
  question: string;
  onPlace: () => void;
  onFollowUp?: (q: string) => void;
}) {
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
  if (data.card) {
    return (
      <AnswerCard
        card={data.card}
        explanation={data.explanation}
        question={question}
        onPlace={onPlace}
        onFollowUp={onFollowUp}
      />
    );
  }
  return (
    <View>
      <Text style={styles.prose}>{plain(data.explanation)}</Text>
      <ReportButton surface="ask" question={question} answer={data.explanation} />
    </View>
  );
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
  attach: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    marginTop: space.xs,
    padding: space.xs,
    borderWidth: 1.5,
    borderColor: outline,
    borderRadius: 12,
  },
  thumb: { width: 34, height: 46, borderRadius: 6, backgroundColor: color.border },
  attachText: { flex: 1 },
  attachTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm, color: color.ink },
  attachSub: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.xs, color: color.inkSoft },
  note: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.sm, color: color.badText, marginTop: space.xs },
  scroll: { flexGrow: 0, flexShrink: 1 },
  scrollBody: { paddingVertical: space.sm, gap: space.sm },
  sug: {},
  sugRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
    minHeight: 44,
  },
  sugText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: color.ink },
  asked: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.sm, color: color.inkSoft },
  skeleton: { gap: space.xs, paddingVertical: space.xs },
  error: { alignItems: "center", gap: space.sm, paddingVertical: space.md },
  errorText: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.sm, color: color.badText, textAlign: "center" },
  retry: { minHeight: 44, justifyContent: "center", paddingHorizontal: space.lg, borderRadius: radius.md, backgroundColor: color.saffronLight },
  retryText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm, color: color.saffronText },
  again: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center", marginTop: space.sm },
  againText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm, color: color.saffronText },
  inputRow: { flexDirection: "row", alignItems: "center", gap: space.xs, paddingTop: space.xs },
  round: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: color.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  roundActive: { backgroundColor: fill.ink, borderColor: fill.ink },
  roundRecording: { backgroundColor: fill.bad, borderColor: fill.bad },
  roundOff: { opacity: 0.4 },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 112,
    paddingHorizontal: space.sm,
    paddingTop: 10,
    paddingBottom: 10,
    borderRadius: 12,
    backgroundColor: color.white,
    borderWidth: 1.5,
    borderColor: outline,
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
  placeTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.base, color: color.ink },
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
