// Conversation — the talking tutor (architecture §12). A guided dialogue
// graph: the tutor speaks a node, you answer out loud (voice on native, typed
// on web where recording is unavailable), the turn engine grades + advances.
// No LLM in the path — the server turn loop picks the next node.

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";

import { Ionicons } from "@react-native-vector-icons/ionicons";

import { api, type ConversationNode, type MetaIntent, type TurnResponse } from "../api/client";
import TutorAvatar, { type AvatarState } from "../components/TutorAvatar";
import { haptics } from "../services/haptics";
import { bulbulLangCode, speak } from "../services/speech";
import { color, font, radius, script, shadow, space } from "../theme";

// expo-audio — import unconditionally; hooks must always be called.
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
} from "expo-audio";

interface Msg {
  // "aside" is the off-turn-path explainer talking, not the tutor. It is
  // rendered differently on purpose: a generated gloss must never be mistaken
  // for an authored, Vidyut-gated tutor line.
  role: "tutor" | "learner" | "aside";
  text: string;
  iast?: string;
  diagnosis?: string;
  meta?: string;
}

const IS_NATIVE = Platform.OS !== "web";

// ─── Main Screen ──────────────────────────────────────────────────────────
export default function ConversationScreen() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [node, setNode] = useState<ConversationNode | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [done, setDone] = useState(false);
  const [recActive, setRecActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [verdictStatus, setVerdictStatus] = useState<"correct" | "off_by_one" | "unsure" | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  // Always call the hook (React rules). On web it'll just be unused.
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  // Pulse animation for mic button (Reanimated, U0-4)
  const pulseAnim = useSharedValue(1);
  useEffect(() => {
    if (recActive) {
      pulseAnim.value = withRepeat(
        withSequence(
          withTiming(1.25, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else {
      cancelAnimation(pulseAnim);
      pulseAnim.value = withTiming(1, { duration: 100 });
    }
  }, [recActive, pulseAnim]);

  const micPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  // Start a fresh session on mount.
  useEffect(() => {
    (async () => {
      try {
        const s = await api.conversationStart();
        setSessionId(s.session_id);
        setNode(s.node);
        const tutorText = s.node.devanagari || s.node.gloss || "";
        setMsgs([{ role: "tutor", text: tutorText, iast: s.node.iast || undefined }]);
        // Auto-play the tutor's opening line.
        setIsSpeaking(true);
        speak(tutorText, nodeLang(s.node), 1.0, () => setIsSpeaking(false)).catch(() => setIsSpeaking(false));
      } catch {
        setMsgs([{ role: "tutor", text: "I couldn't reach the tutor. Is the backend running?", meta: "error" }]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nodeLang = (n: ConversationNode): "sa" | "hi" | "en" =>
    n.lang === "en" ? "en" : n.lang === "hi" ? "hi" : "sa";

  const scrollBottom = () => scrollRef.current?.scrollToEnd({ animated: true });

  /**
   * Ask the server to explain a line. This is the §12 "live, off the turn
   * path" call: it is slower than a turn (~2 s), so it is never awaited
   * inside one. The placeholder bubble is swapped in place when it lands, and
   * a failure degrades to a plain apology rather than an error state — the
   * conversation itself is unaffected either way.
   */
  const explainLine = useCallback(
    async (line: string, question = "", translateOnly = false) => {
      if (!sessionId || !line.trim()) return;
      const pending: Msg = { role: "aside", text: "…", meta: "explaining" };
      setMsgs((m) => [...m, pending]);
      scrollBottom();
      try {
        const r = await api.conversationExplain(sessionId, {
          question,
          // Omit `text` when asking about the node the session is already on,
          // so the server can attach its authored iast/gloss as ground truth.
          text: line === (node?.devanagari ?? "") ? "" : line,
          translateOnly,
        });
        setMsgs((m) =>
          m.map((msg) =>
            msg === pending
              ? { role: "aside", text: r.explanation, meta: r.source === "llm" ? "aside" : "aside-fallback" }
              : msg,
          ),
        );
      } catch {
        setMsgs((m) =>
          m.map((msg) =>
            msg === pending
              ? { role: "aside", text: "I couldn't fetch an explanation just now.", meta: "aside-fallback" }
              : msg,
          ),
        );
      } finally {
        scrollBottom();
      }
    },
    [sessionId, node],
  );

  const submit = useCallback(
    async (text: string) => {
      if (!text.trim() || !sessionId || busy) return;
      setBusy(true);
      setInput("");
      setMsgs((m) => [...m, { role: "learner", text }]);
      scrollBottom();
      try {
        const t: TurnResponse = await api.conversationTurn(sessionId, text.trim());

        // A meta move — the learner asked about the line rather than
        // answering it. The graph did not move and nothing was graded, so the
        // tutor bubble is not re-rendered; we answer the question instead.
        if (t.meta_intent) {
          const intent: MetaIntent = t.meta_intent;
          const line = t.node?.devanagari || node?.devanagari || "";
          if (intent === "repeat") {
            // Free: the client already holds the line. No model, no request.
            if (line) {
              setIsSpeaking(true);
              speak(line, nodeLang(t.node ?? node!), 1.0, () => setIsSpeaking(false)).catch(() => setIsSpeaking(false));
            }
            setMsgs((m) => [...m, { role: "aside", text: "Once more…", meta: "aside" }]);
          } else {
            await explainLine(line, text.trim(), intent === "translate");
          }
          return;
        }

        const next = t.node;
        if (next) {
          setNode(next);
          const tm = next.devanagari || next.gloss || "";
          setMsgs((m) => [
            ...m,
            {
              role: "tutor",
              text: tm,
              iast: next.iast || undefined,
              diagnosis: t.diagnosis || undefined,
              meta: t.escape ? "escape" : t.matched ? undefined : t.verdict,
            },
          ]);
          setIsSpeaking(true);
          speak(tm, nodeLang(next), 1.0, () => setIsSpeaking(false)).catch(() => setIsSpeaking(false));

          // Flash avatar reaction based on verdict
          if (t.verdict && !t.escape) {
             if (t.verdict === "correct") {
               setVerdictStatus("correct");
               setTimeout(() => setVerdictStatus(null), 1500);
             } else if (t.verdict === "off_by_one" || t.verdict === "unsure") {
               setVerdictStatus(t.verdict);
               setTimeout(() => setVerdictStatus(null), 1500);
             }
          }
        }
        if (t.session_done) setDone(true);
      } catch {
        setMsgs((m) => [...m, { role: "tutor", text: "The turn didn't land — try again.", meta: "error" }]);
      } finally {
        setBusy(false);
        scrollBottom();
      }
    },
    [sessionId, busy, node, explainLine],
  );

  // ── Mic press handler ──────────────────────────────────────────────────
  const onMicPress = useCallback(async () => {
    if (busy || done) return;

    if (recActive) {
      // Stop recording, transcribe, and submit
      haptics.press();
      setRecActive(false);
      setBusy(true);
      setMsgs((m) => [...m, { role: "learner", text: "Transcribing…", meta: "transcribing" }]);
      scrollBottom();

      try {
        await recorder.stop();
        // Small delay to let the native side finalize the file
        await new Promise((r) => setTimeout(r, 300));
        const uri = recorder.uri;
        console.log("[STT] recorder.uri =", uri);
        if (!uri) throw new Error("No recording URI — recorder.uri is null after stop()");

        // Pass the file URI directly — React Native's FormData handles it natively
        const lang = node?.lang === "en" ? "en-IN" : node?.lang === "hi" ? "hi-IN" : "sa-IN";
        console.log("[STT] Uploading to /speech/stt, lang =", lang);
        const result = await api.stt(uri, "recording.m4a", "audio/m4a", lang);
        console.log("[STT] Result:", JSON.stringify(result));
        const transcript = result.transcript?.trim();

        // Remove the "Transcribing…" placeholder
        setMsgs((m) => m.filter((msg) => msg.meta !== "transcribing"));

        if (!transcript) {
          setMsgs((m) => [...m, { role: "tutor", text: "I couldn't hear that clearly. Try again?", meta: "error" }]);
          setBusy(false);
          return;
        }

        // Submit the transcribed text as a turn
        setBusy(false);
        await submit(transcript);
      } catch (err: any) {
        console.error("[STT] Error:", err);
        // Remove placeholder
        setMsgs((m) => m.filter((msg) => msg.meta !== "transcribing"));
        // Show the actual error for debugging
        const detail = err?.message || String(err);
        setMsgs((m) => [...m, { role: "tutor", text: `STT error: ${detail}`, meta: "error" }]);
        setBusy(false);
      }
    } else {
      // Request permission first, then start recording
      haptics.tap();
      try {
        const perm = await requestRecordingPermissionsAsync();
        if (!perm.granted) {
          setMsgs((m) => [...m, { role: "tutor", text: "Microphone access denied. Please allow it in settings.", meta: "error" }]);
          return;
        }
        await recorder.prepareToRecordAsync();
        recorder.record();
        setRecActive(true);
      } catch (err: any) {
        console.error("[MIC] Start error:", err);
        setMsgs((m) => [...m, { role: "tutor", text: `Mic error: ${err?.message || err}`, meta: "error" }]);
      }
    }
  }, [busy, done, recActive, recorder, submit, node]);

  // Derive current avatar state
  let avatarState: AvatarState = "idle";
  if (verdictStatus === "correct") avatarState = "celebrating";
  else if (verdictStatus === "off_by_one" || verdictStatus === "unsure") avatarState = "encouraging";
  else if (isSpeaking) avatarState = "speaking";
  else if (recActive) avatarState = "listening";
  else if (busy) avatarState = "thinking";

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <View style={styles.header}>
        <TutorAvatar state={avatarState} size={100} />
      </View>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.body}
        accessibilityLabel="Conversation messages"
      >
        {msgs.map((m, i) => {
          // An explainer aside: visually distinct from an authored tutor line,
          // because only the tutor's Sanskrit has been through the Vidyut gate.
          if (m.role === "aside") {
            return (
              <View key={i} style={styles.aside}>
                <Text style={styles.asideText}>{m.text}</Text>
              </View>
            );
          }
          const bubble = (
            <View style={[styles.bubble, m.role === "tutor" ? styles.tutor : styles.learner]}>
              {m.role === "tutor" && <Text style={styles.who}>Tutor</Text>}
              <Text style={[styles.text, m.role === "learner" && styles.learnerText]}>{m.text}</Text>
              {!!m.iast && <Text style={styles.iast}>{m.iast}</Text>}
              {!!m.diagnosis && m.meta !== "escape" && (
                <Text style={[styles.diag, m.meta === "error" && { color: color.bad }]}>{m.diagnosis}</Text>
              )}
              {m.meta === "escape" && (
                <Text style={styles.diag}>I didn't quite catch that — no penalty. Let's try again.</Text>
              )}
              {m.role === "tutor" && m.meta !== "error" && (
                <Text style={styles.explainHint}>tap to explain</Text>
              )}
            </View>
          );
          // Tap any tutor line for the same explanation typing "what does that
          // mean?" produces — the tap costs no turn and never touches the graph.
          return m.role === "tutor" && m.meta !== "error" ? (
            <Pressable key={i} onPress={() => explainLine(m.text)} disabled={!sessionId}>
              {bubble}
            </Pressable>
          ) : (
            <View key={i}>{bubble}</View>
          );
        })}

        {recActive && (
          <View style={styles.recBanner}>
            <Ionicons name="radio-button-on" size={12} color={color.bad} />
            <Text style={styles.recText}>Listening… tap the mic when done</Text>
          </View>
        )}

        {done && (
          <View style={styles.doneCard}>
            <Text style={styles.doneTitle}>🙏 Wonderful practice</Text>
            <Text style={styles.doneSub}>That was the conversation.</Text>
          </View>
        )}
      </ScrollView>

      {/* Input bar */}
      <View style={styles.inputBar}>
        <Pressable
          onPress={() => {
            haptics.tap();
            if (node) {
               setIsSpeaking(true);
               speak(node.devanagari || node.gloss, nodeLang(node), 1.0, () => setIsSpeaking(false)).catch(() => setIsSpeaking(false));
            }
          }}
          style={styles.replay}
          disabled={!node || isSpeaking}
          accessibilityRole="button"
          accessibilityLabel="Replay tutor's last message"
          accessibilityState={{ disabled: !node || isSpeaking }}
        >
          <Ionicons name="volume-high" size={20} color={color.inkSoft} />
        </Pressable>

        {/* Mic button — only on native */}
        {IS_NATIVE && (
          <Animated.View style={micPulseStyle}>
            <Pressable
              onPress={onMicPress}
              disabled={busy && !recActive}
              style={[
                styles.mic,
                recActive && styles.micActive,
                (busy && !recActive) && styles.micDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel={recActive ? "Stop recording" : "Start recording"}
              accessibilityState={{ disabled: busy && !recActive }}
            >
              <Ionicons name={recActive ? "stop-circle" : "mic"} size={22} color={recActive ? color.bad : color.inkSoft} />
            </Pressable>
          </Animated.View>
        )}

        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Say or type your reply…"
          placeholderTextColor={color.inkFaint}
          style={styles.input}
          onSubmitEditing={() => submit(input)}
          returnKeyType="send"
          editable={!busy && !done}
          multiline
          accessibilityRole="text"
          accessibilityLabel="Type your reply"
        />
        <Pressable
          onPress={() => {
            haptics.press();
            submit(input);
          }}
          disabled={!input.trim() || busy || done}
          style={[styles.send, (!input.trim() || busy || done) && styles.sendDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Send reply"
          accessibilityState={{ disabled: !input.trim() || busy || done }}
        >
          <Ionicons name="send" size={18} color={color.white} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  header: { alignItems: "center", paddingVertical: space.md, zIndex: 10, backgroundColor: color.bg, borderBottomWidth: 1, borderBottomColor: color.border },
  body: { padding: space.lg, paddingBottom: space.xl, gap: space.sm },
  bubble: {
    borderRadius: radius.lg,
    padding: space.md,
    maxWidth: "88%",
    ...shadow.card,
  },
  tutor: { backgroundColor: color.tutorBg, alignSelf: "flex-start" },
  learner: { backgroundColor: color.learnerBg, alignSelf: "flex-end" },
  who: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.xs, color: color.tutor, marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.5 },
  text: { ...script("bold"), fontSize: font.sizes.base, color: color.ink, lineHeight: 24 },
  learnerText: script("semibold"),
  iast: { fontFamily: "Nunito_400Regular", fontWeight: "400", fontSize: font.sizes.sm, color: color.inkSoft, marginTop: 4 },
  diag: { fontFamily: "Nunito_500Medium", fontWeight: "500", fontSize: font.sizes.sm, color: color.tutor, marginTop: space.sm },
  explainHint: { fontFamily: "Nunito_500Medium", fontWeight: "500", fontSize: font.sizes.xs, color: color.inkSoft, marginTop: space.sm, opacity: 0.6 },
  aside: { alignSelf: "center", maxWidth: "92%", backgroundColor: color.surfaceMuted, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: space.sm, borderLeftWidth: 3, borderLeftColor: color.saffron },
  asideText: { fontFamily: "Nunito_500Medium", fontWeight: "500", fontSize: font.sizes.sm, color: color.inkSoft, lineHeight: 21 },
  recBanner: { flexDirection: "row", alignItems: "center", gap: space.xs, alignSelf: "center", backgroundColor: "#FDE8E8", borderRadius: radius.pill, paddingHorizontal: space.lg, paddingVertical: space.sm },
  recText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: color.bad },
  doneCard: { backgroundColor: color.okBg, borderRadius: radius.lg, padding: space.lg, alignItems: "center", ...shadow.card },
  doneTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.md, color: color.ok },
  doneSub: { fontFamily: "Nunito_500Medium", fontWeight: "500", fontSize: font.sizes.sm, color: color.inkSoft, marginTop: 4 },
  inputBar: { flexDirection: "row", alignItems: "center", padding: space.md, backgroundColor: color.surface, borderTopWidth: 1, borderTopColor: color.border, gap: space.sm },
  replay: { width: 44, height: 44, borderRadius: 22, backgroundColor: color.surfaceMuted, alignItems: "center", justifyContent: "center" },
  mic: { width: 48, height: 48, borderRadius: 24, backgroundColor: color.surfaceMuted, alignItems: "center" as const, justifyContent: "center" as const, borderWidth: 2, borderColor: "transparent" },
  micActive: { backgroundColor: "#FDE8E8", borderColor: color.bad },
  micDisabled: { opacity: 0.4 },
  input: { flex: 1, borderWidth: 2, borderColor: color.border, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: space.sm, fontSize: font.sizes.base, fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: color.ink, minHeight: 44 },
  send: { width: 48, height: 48, borderRadius: 24, backgroundColor: color.saffron, alignItems: "center", justifyContent: "center", ...shadow.button },
  sendDisabled: { opacity: 0.4 },
});