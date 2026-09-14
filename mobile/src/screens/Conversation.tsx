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

import {
  api,
  type ConversationEdge,
  type ConversationNode,
  type MetaIntent,
  type TurnResponse,
} from "../api/client";
import { GuruNative, type AvatarStateName as AvatarState } from "../components/guru/GuruNative";
import { startTimeline, type Timeline } from "../utils/perf";
import { settledRecordingUri } from "../utils/recording";
import { haptics } from "../services/haptics";
import { bulbulLangCode, playTutorAudio } from "../services/speech";
import { useAchievementReveal } from "../hooks/useAchievementReveal";
import AchievementReveal from "../components/AchievementReveal";
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
  // The bridge-language half of one tutor turn. Not a translation of the
  // Sanskrit — it carries what the Sanskrit alone would not land.
  bridge?: string;
  // A grammar note about the learner's PREVIOUS line. Only ever raised when
  // Vidyut found a real error; a name it cannot read is never a correction.
  correction?: string;
  diagnosis?: string;
  meta?: string;
}

const IS_NATIVE = Platform.OS !== "web";

// ─── Main Screen ──────────────────────────────────────────────────────────
export default function ConversationScreen() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [node, setNode] = useState<ConversationNode | null>(null);
  // The node's exits, kept so the learner can ask what a good reply looks
  // like. The server has always sent these; nothing rendered them, which left
  // "भवान् कः?" answerable only by guessing the one sentence the graph wants.
  const [edges, setEdges] = useState<ConversationEdge[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [done, setDone] = useState(false);
  const [recActive, setRecActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  // What he is saying right now. viseme.ts reads the mouth shapes straight off
  // the Devanagari; the duration is the same ~0.08 s/char hint playTutorAudio
  // uses to time its own completion callback.
  const [speech, setSpeech] = useState<{ text?: string; durationMs?: number } | null>(null);
  const [verdictStatus, setVerdictStatus] = useState<"correct" | "off_by_one" | "unsure" | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  // U3-4: finishing a conversation earns prathama-samvada (once, ever).
  const { queue: achQueue, record: recordAch, dismiss: dismissAch } = useAchievementReveal();

  useEffect(() => {
    if (done) recordAch({ type: "conversation_complete" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const speakLine = useCallback((
    url: string,
    text: string,
    lang: "sa" | "hi" | "en",
    audioBase64?: string,
    tl?: Timeline,
  ) => {
    const done = () => {
      setIsSpeaking(false);
      setSpeech(null);
      // Backstop for the timing report: if the clip never became audible,
      // onStart never fired and this is the only place left to close the
      // books. report() is idempotent, so the normal path is unaffected.
      tl?.report("(never audible)");
    };
    // The mouth starts on the audio's first audible sample, not on this call —
    // loading a remote clip takes a few hundred ms and the lip sync ran that
    // far ahead of the voice. onStart also hands back the file's real duration,
    // so the viseme schedule stops drifting on long lines.
    return playTutorAudio(url || "", text, lang, done, (durationMs) => {
      setSpeech({ text, durationMs });
      // The learner's clock stops here: this is the moment they hear a reply.
      tl?.mark(audioBase64 ? "speak(inline)" : url ? "speak(file)" : "speak(tts)");
      tl?.report();
    }, audioBase64).catch(() => { tl?.report("(audio failed)"); done(); });
  }, []);

  // STT preset: 16kHz mono 32kbps AAC in the same .m4a container — ~4x
  // smaller than HIGH_QUALITY stereo 44.1kHz, same codec Saaras already
  // accepts. STT needs words, not fidelity (Varnamala keeps HIGH_QUALITY
  // because retroflex-vs-dental scoring does need it).
  const recorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 32000,
    ios: {
      ...RecordingPresets.HIGH_QUALITY.ios,
      audioQuality: 32,
    },
    android: {
      ...RecordingPresets.HIGH_QUALITY.android,
      outputFormat: "mpeg4",
      audioEncoder: "aac",
    },
    web: {
      ...RecordingPresets.HIGH_QUALITY.web,
      bitsPerSecond: 32000,
    },
  });

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
        setEdges(s.edges ?? []);
        const tutorText = s.node.devanagari || s.node.gloss || "";
        setMsgs([{
          role: "tutor",
          text: tutorText,
          iast: s.node.iast || undefined,
          bridge: s.node.gloss || undefined,
        }]);
        // Auto-play the tutor's opening line (pre-rendered if this node has one).
        setIsSpeaking(true);
        speakLine(s.node.audio_url || "", tutorText, nodeLang(s.node), s.node.audio_base64);
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
    async (text: string, tl?: Timeline) => {
      if (!text.trim() || !sessionId || busy) return;
      setBusy(true);
      setInput("");
      setMsgs((m) => [...m, { role: "learner", text }]);
      scrollBottom();
      try {
        const t: TurnResponse = await api.conversationTurn(sessionId, text.trim());
        // Text-fast path: the turn returns as soon as the words exist
        // (inline audio off by default). Mark network return, render text
        // below, then fetch voice in the background — tl "turn" vs "speak"
        // proves the split.
        tl?.mark("turn");

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
              const n = t.node ?? node;
              speakLine(n?.audio_url || "", line, nodeLang(n!), n?.audio_base64, tl);
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
          setEdges(t.edges ?? []);
          setShowHint(false);   // a new question deserves a fresh guess
          const tm = next.devanagari || next.gloss || "";
          setMsgs((m) => [
            ...m,
            {
              role: "tutor",
              text: tm,
              iast: next.iast || undefined,
              bridge: next.gloss || undefined,
              correction: t.correction || undefined,
              diagnosis: t.diagnosis || undefined,
              // "revealed" is an escape, but its diagnosis IS the answer the
              // ladder gave up and told the learner — it must outrank the
              // generic escape copy below, which would otherwise swallow it.
              meta: t.verdict === "revealed"
                ? "revealed"
                : t.escape
                  ? "escape"
                  : t.matched
                    ? undefined
                    : t.verdict,
            },
          ]);
          // Text is on screen from the setMsgs above — mark it before the
          // voice fetch starts so [perf] shows text latency vs voice latency.
          tl?.mark("text");
          setIsSpeaking(true);
          // Not awaited by design: voice plays when ready, mic stays usable.
          speakLine(next.audio_url || "", tm, nodeLang(next), next.audio_base64, tl);

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
        tl?.report("(turn failed)");
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

      // Four serial network hops sit between this press and the tutor's
      // voice. The clock starts here so the console says which one is slow.
      const tl = startTimeline("turn");

      try {
        await recorder.stop();
        tl.mark("stop");
        // Wait for the encoder to actually finish writing, rather than the
        // 300 ms guess that used to stand in for it.
        const uri = await settledRecordingUri(recorder);
        tl.mark("flush");
        console.log("[STT] recorder.uri =", uri);
        if (!uri) throw new Error("No recording URI — recorder.uri is null after stop()");

        // Pass the file URI directly — React Native's FormData handles it natively
        const lang = node?.lang === "en" ? "en-IN" : node?.lang === "hi" ? "hi-IN" : "sa-IN";
        console.log("[STT] Uploading to /speech/stt, lang =", lang);
        const result = await api.stt(uri, "recording.m4a", "audio/m4a", lang);
        tl.mark("stt");
        console.log("[STT] Result:", JSON.stringify(result));
        const transcript = result.transcript?.trim();

        // Remove the "Transcribing…" placeholder
        setMsgs((m) => m.filter((msg) => msg.meta !== "transcribing"));

        if (!transcript) {
          tl.report("(no transcript)");
          setMsgs((m) => [...m, { role: "tutor", text: "I couldn't hear that clearly. Try again?", meta: "error" }]);
          return;
        }

        // Submit the transcribed text as a turn.
        // submit() manages its own setBusy(true/false) cycle internally,
        // so we must NOT call setBusy(false) here — doing so causes a
        // rapid false→true state flip and an intermediate re-render that
        // triggers React's "Rendered fewer hooks than expected" error.
        await submit(transcript, tl);
      } catch (err: any) {
        tl.report("(stt failed)");
        console.error("[STT] Error:", err);
        // Remove placeholder
        setMsgs((m) => m.filter((msg) => msg.meta !== "transcribing"));
        // U10-3: a network failure is a SYSTEM failure, never a wrong answer —
        // copy must say the connection failed, and haptics must not read as
        // "incorrect" (§3.3 / §2.2). Raw error details stay in the console.
        haptics.near();
        setMsgs((m) => [...m, {
          role: "tutor",
          text: "The network failed on the way up — that's not a mistake. Say it again?",
          meta: "error",
        }]);
      } finally {
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

  // The reply the graph is waiting for. sa-edges carry the authored sentence;
  // bridge nodes ("तैयार हैं?") need no hint — any yes/no already routes.
  const hint =
    edges.find((e) => e.lang === "sa" && e.expected_text.trim())?.expected_text ?? "";

  // Derive current avatar state
  let avatarState: AvatarState = "idle";
  if (verdictStatus === "correct") avatarState = "celebrating";
  else if (verdictStatus === "off_by_one" || verdictStatus === "unsure") avatarState = "encouraging";
  else if (isSpeaking) avatarState = "speaking";
  else if (recActive) avatarState = "listening";
  else if (busy) avatarState = "thinking";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <GuruNative state={avatarState} size={160} speech={speech} />
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
              {/* The bridge half of the turn — the tutor still talking, in the
                  learner's language, so it sits inside the same bubble. */}
              {!!m.bridge && <Text style={styles.bridge}>{m.bridge}</Text>}
              {/* A grammar note about what the learner just said. Kept visually
                  separate from the tutor's line so it never reads as part of
                  the conversation. */}
              {!!m.correction && (
                <View style={styles.correction}>
                  <Ionicons name="school-outline" size={13} color={color.tutor} />
                  <Text style={styles.correctionText}>{m.correction}</Text>
                </View>
              )}
              {!!m.diagnosis && m.meta !== "escape" && (
                <Text
                  style={[
                    styles.diag,
                    m.meta === "error" && { color: color.bad },
                    m.meta === "revealed" && styles.reveal,
                  ]}
                >
                  {m.diagnosis}
                </Text>
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
            <Pressable key={i} onPress={() => explainLine(m.text)} disabled={!sessionId} accessibilityRole="button" accessibilityLabel={`Explain: ${m.text.slice(0, 60)}`}>
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

      {/* Hint — learner-initiated, costs no turn and never touches the graph.
          The dialogue graph accepts one authored sentence per question, so
          without this the only way to find it is to fail into the repair
          ladder. Collapsed by default: shown on ask, not on arrival. */}
      {!done && !!hint && (
        <Pressable
          onPress={() => {
            haptics.tap();
            setShowHint((s) => !s);
          }}
          style={styles.hintBar}
          accessibilityRole="button"
          accessibilityLabel={showHint ? "Hide the suggested reply" : "Show me what to say"}
          accessibilityState={{ expanded: showHint }}
        >
          <Ionicons
            name={showHint ? "bulb" : "bulb-outline"}
            size={14}
            color={showHint ? color.saffron : color.inkSoft}
          />
          <Text style={showHint ? styles.hintAnswer : styles.hintPrompt}>
            {showHint ? hint : "Show me what to say"}
          </Text>
        </Pressable>
      )}

      {/* Input bar */}
      <View style={styles.inputBar}>
        <Pressable
          onPress={() => {
            haptics.tap();
            if (node) {
               setIsSpeaking(true);
               // Replay is free: the clip came down with the turn.
               speakLine(node.audio_url || "", node.devanagari || node.gloss, nodeLang(node), node.audio_base64);
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
      <AchievementReveal queue={achQueue} onDone={dismissAch} />
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
  bridge: { fontFamily: "Nunito_500Medium", fontWeight: "500", fontSize: font.sizes.sm, color: color.inkSoft, marginTop: 6, lineHeight: 20 },
  correction: { flexDirection: "row", alignItems: "flex-start", gap: space.xs, marginTop: space.sm, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: color.border },
  correctionText: { flex: 1, fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.xs, color: color.tutor, lineHeight: 18 },
  hintBar: { flexDirection: "row", alignItems: "center", gap: space.xs, paddingHorizontal: space.lg, paddingVertical: space.sm, backgroundColor: color.surfaceMuted, borderTopWidth: 1, borderTopColor: color.border },
  hintPrompt: { flex: 1, fontFamily: "Nunito_500Medium", fontWeight: "500", fontSize: font.sizes.xs, color: color.inkSoft },
  hintAnswer: { flex: 1, fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: color.ink },
  reveal: { fontFamily: "Nunito_700Bold", fontWeight: "700", color: color.ink },
  inputBar: { flexDirection: "row", alignItems: "center", padding: space.md, backgroundColor: color.surface, borderTopWidth: 1, borderTopColor: color.border, gap: space.sm },
  replay: { width: 44, height: 44, borderRadius: 22, backgroundColor: color.surfaceMuted, alignItems: "center", justifyContent: "center" },
  mic: { width: 48, height: 48, borderRadius: 24, backgroundColor: color.surfaceMuted, alignItems: "center" as const, justifyContent: "center" as const, borderWidth: 2, borderColor: "transparent" },
  micActive: { backgroundColor: "#FDE8E8", borderColor: color.bad },
  micDisabled: { opacity: 0.4 },
  input: { flex: 1, borderWidth: 2, borderColor: color.border, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: space.sm, fontSize: font.sizes.base, fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: color.ink, minHeight: 44 },
  send: { width: 48, height: 48, borderRadius: 24, backgroundColor: color.saffron, alignItems: "center", justifyContent: "center", ...shadow.button },
  sendDisabled: { opacity: 0.4 },
});