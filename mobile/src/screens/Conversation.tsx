// Talk — a real conversation, not a translator.
//
// Rewritten 2026-09-22. The old screen rendered each turn as a Sanskrit line
// with its translation stacked underneath, because that is literally what the
// server sent (`{sanskrit, bridge}`). It read as a translation widget, which
// is what it was. A turn is now four distinct things and is rendered as four
// distinct things:
//
//   YOU SAID          what the learner wrote, and in which languages
//   SAY IT LIKE THIS  the correct Sanskrit, Devanagari + roman   (only if needed)
//   <the reply>       the tutor answering, in Sanskrit AND the learner's language
//   WHY               the teaching, in English
//
// The learner's language is whichever of Sarvam's ten they actually used —
// detected server-side per turn (services/lang_detect.py), never a setting.
//
// Three things were deliberately REMOVED, all graph-mode furniture that made
// a conversation feel like a quiz:
//   • the verdict flash (correct / off_by_one lighting up the avatar),
//   • the "Show me what to say" hint bar — it read `edges`, which is always
//     empty in LLM mode, so it never appeared anyway,
//   • the escape / repair-ladder copy.
// Graph mode still exists as the offline fallback and still uses `node`.

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
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import Animated, {
  interpolate,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import { useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";

import { Ionicons } from "@react-native-vector-icons/ionicons";

import {
  api,
  ApiError,
  type TalkTurn,
  type ConversationNode,
  type MetaIntent,
  type TurnResponse,
} from "../api/client";
import { GuruNative, type AvatarStateName as AvatarState } from "../components/guru/GuruNative";
import { startTimeline, type Timeline } from "../utils/perf";
import { settledRecordingUri } from "../utils/recording";
import { haptics } from "../services/haptics";
import { playTutorAudio } from "../services/speech";
import { ensureScriptFont } from "../services/scriptFonts";
import { useAchievementReveal } from "../hooks/useAchievementReveal";
import AchievementReveal from "../components/AchievementReveal";
import {
  color,
  font,
  nativeText,
  radius,
  sanskritText,
  script,
  shadow,
  space,
} from "../theme";

// expo-audio — import unconditionally; hooks must always be called.
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
} from "expo-audio";

type Msg =
  | { kind: "tutor"; talk: TalkTurn }
  | { kind: "learner"; text: string }
  | { kind: "aside"; text: string; pending?: boolean }
  | { kind: "status"; text: string }
  | { kind: "error"; text: string };

const IS_NATIVE = Platform.OS !== "web";
const HEADER_H = 172;

/** A tutor turn that carries nothing is a bug, not an empty state. */
const hasContent = (t: TalkTurn) =>
  !!(t.reply_devanagari || t.reply_native || t.explain_en || t.fix?.devanagari);

// ─── One tutor turn ───────────────────────────────────────────────────────

function TutorTurn({
  talk,
  onSpeak,
  speaking,
}: {
  talk: TalkTurn;
  onSpeak: (text: string, lang: string) => void;
  speaking: boolean;
}) {
  // The learner's script gets its face the first time we actually see it.
  // Until it lands the platform font renders the same text correctly, so
  // this never gates the render — it only upgrades it.
  const [, setFontTick] = useState(0);
  useEffect(() => {
    let alive = true;
    ensureScriptFont(talk.native_script).then((ok) => {
      if (ok && alive) setFontTick((n) => n + 1);
    });
    return () => {
      alive = false;
    };
  }, [talk.native_script]);

  const fix = talk.fix;
  const showFix = !!(fix?.needed && fix.devanagari);

  return (
    <View style={styles.turn}>
      {/* What they said, and in what. Muted: it is a receipt, not the reply. */}
      {!!talk.read_back && (
        <Text style={styles.readBack} accessibilityLabel={`You said: ${talk.read_back}`}>
          {talk.read_back}
        </Text>
      )}

      {showFix && (
        <View style={styles.fixCard}>
          <View style={styles.fixHead}>
            <Ionicons name="sparkles" size={12} color={color.saffronText} />
            <Text style={styles.fixLabel}>Say it like this</Text>
          </View>
          <Pressable
            onPress={() => onSpeak(fix.devanagari, "sa")}
            disabled={speaking}
            accessibilityRole="button"
            accessibilityLabel={`Hear the correct Sanskrit: ${fix.devanagari}`}
          >
            <Text style={styles.fixDev} selectable>
              {fix.devanagari}
            </Text>
            {!!fix.roman && (
              <Text style={styles.roman} selectable>
                {fix.roman}
              </Text>
            )}
          </Pressable>
          {!!fix.note_en && <Text style={styles.fixNote}>{fix.note_en}</Text>}
        </View>
      )}

      {/* The tutor actually replying. The Sanskrit is the thing to read, so
          it is the largest thing on screen. */}
      {!!talk.reply_devanagari && (
        <Pressable
          onPress={() => onSpeak(talk.reply_devanagari, "sa")}
          disabled={speaking}
          accessibilityRole="button"
          accessibilityLabel={`Hear again: ${talk.reply_devanagari}`}
        >
          <Text style={styles.replyDev} selectable>
            {talk.reply_devanagari}
          </Text>
          {!!talk.reply_roman && (
            <Text style={styles.roman} selectable>
              {talk.reply_roman}
            </Text>
          )}
        </Pressable>
      )}

      {/* The same thought in the learner's own language. Tap to hear — it is
          not auto-played, because it says what the Sanskrit already said and
          speaking both doubles the voice bill to repeat ourselves. */}
      {!!talk.reply_native && (
        <Pressable
          onPress={() => onSpeak(talk.reply_native, talk.native_lang)}
          disabled={speaking}
          style={styles.nativeRow}
          accessibilityRole="button"
          accessibilityLabel={`Hear in your language: ${talk.reply_native}`}
        >
          <Text style={[styles.native, nativeText(talk.native_script)]} selectable>
            {talk.reply_native}
          </Text>
          <Ionicons name="volume-low-outline" size={15} color={color.inkFaint} />
        </Pressable>
      )}

      {!!talk.explain_en && (
        <View style={styles.whyCard}>
          <Text style={styles.whyLabel}>Why</Text>
          <Text style={styles.why} selectable>
            {talk.explain_en}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────

export default function ConversationScreen() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [node, setNode] = useState<ConversationNode | null>(null);
  const [lastTalk, setLastTalk] = useState<TalkTurn | null>(null);
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
  const scrollRef = useRef<ScrollView>(null);
  const { queue: achQueue, record: recordAch, dismiss: dismissAch } = useAchievementReveal();

  const tabBarHeight = useBottomTabBarHeight();
  const keyboard = useReanimatedKeyboardAnimation();

  // The composer used to sit under the keyboard. There is no
  // KeyboardAvoidingView anywhere in this app, and on Expo SDK 54+ Android is
  // edge-to-edge, where `softwareKeyboardLayoutMode` is ignored and the OS
  // does NOT resize the window — so nothing moved and the keyboard simply
  // covered the box you were typing into.
  //
  // `keyboard.height` is 0 closed and NEGATIVE open. The screen already sits
  // `tabBarHeight` above the bottom of the window, so that much of the
  // keyboard costs us nothing; only the remainder has to be given back.
  const shiftStyle = useAnimatedStyle(() => ({
    marginBottom: Math.max(0, -keyboard.height.value - tabBarHeight),
  }));

  // The avatar is 172dp of the screen. Leaving it up while typing pushes the
  // conversation into a letterbox, so it folds away as the keyboard rises and
  // comes back when it goes. Driven by keyboard progress rather than a timer,
  // so it tracks the keyboard exactly instead of racing it.
  const headerStyle = useAnimatedStyle(() => ({
    height: interpolate(keyboard.progress.value, [0, 1], [HEADER_H, 0]),
    opacity: interpolate(keyboard.progress.value, [0, 0.6], [1, 0]),
  }));

  useEffect(() => {
    if (done) recordAch({ type: "conversation_complete" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const speakLine = useCallback(
    (url: string, text: string, lang: string, audioBase64?: string, tl?: Timeline) => {
      const finish = () => {
        setIsSpeaking(false);
        setSpeech(null);
        tl?.report("(never audible)");
      };
      // The mouth starts on the audio's first audible sample, not on this call
      // — loading a remote clip takes a few hundred ms and the lip sync ran
      // that far ahead of the voice.
      return playTutorAudio(
        url || "",
        text,
        lang,
        finish,
        (durationMs) => {
          setSpeech({ text, durationMs });
          tl?.mark(audioBase64 ? "speak(inline)" : url ? "speak(file)" : "speak(tts)");
          tl?.report();
        },
        audioBase64,
      ).catch(() => {
        tl?.report("(audio failed)");
        finish();
      });
    },
    [],
  );

  /** Replay any line on tap — free for the Sanskrit we already have audio for. */
  const speakAgain = useCallback(
    (text: string, lang: string) => {
      if (!text || isSpeaking) return;
      haptics.tap();
      setIsSpeaking(true);
      const canReuse = node?.devanagari === text;
      speakLine(
        canReuse ? node?.audio_url || "" : "",
        text,
        lang,
        canReuse ? node?.audio_base64 : undefined,
      );
    },
    [isSpeaking, node, speakLine],
  );

  // STT preset: 16kHz mono 32kbps AAC in the same .m4a container — ~4x
  // smaller than HIGH_QUALITY stereo 44.1kHz, same codec Saaras already
  // accepts. STT needs words, not fidelity (Varnamala keeps HIGH_QUALITY
  // because retroflex-vs-dental scoring does need it).
  const recorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 32000,
    ios: { ...RecordingPresets.HIGH_QUALITY.ios, audioQuality: 32 },
    android: {
      ...RecordingPresets.HIGH_QUALITY.android,
      outputFormat: "mpeg4",
      audioEncoder: "aac",
    },
    web: { ...RecordingPresets.HIGH_QUALITY.web, bitsPerSecond: 32000 },
  });

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

  const micPulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulseAnim.value }] }));

  const scrollBottom = () =>
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));

  // Start a fresh session on mount.
  useEffect(() => {
    (async () => {
      try {
        const s = await api.conversationStart();
        setSessionId(s.session_id);
        setNode(s.node);
        if (s.talk && hasContent(s.talk)) {
          setLastTalk(s.talk);
          setMsgs([{ kind: "tutor", talk: s.talk }]);
          ensureScriptFont(s.talk.native_script);
        } else {
          // Graph mode, or a degraded opening: fall back to the node.
          setMsgs([{ kind: "status", text: s.node.devanagari || s.node.gloss || "" }]);
        }
        setIsSpeaking(true);
        speakLine(
          s.node.audio_url || "",
          s.node.devanagari || s.node.gloss || "",
          s.node.lang || "sa",
          s.node.audio_base64,
        );
      } catch {
        setMsgs([
          { kind: "error", text: "I couldn't reach the tutor. Is the backend running?" },
        ]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Ask the server to explain a line. Off the turn path: slower than a turn
   * (~2 s) and never awaited inside one. A failure degrades to a plain
   * apology rather than an error state — the conversation is unaffected.
   */
  const explainLine = useCallback(
    async (line: string, question = "", translateOnly = false) => {
      if (!sessionId || !line.trim()) return;
      setMsgs((m) => [...m, { kind: "aside", text: "…", pending: true }]);
      scrollBottom();
      try {
        const r = await api.conversationExplain(sessionId, {
          question,
          text: line === (node?.devanagari ?? "") ? "" : line,
          translateOnly,
        });
        setMsgs((m) =>
          m.map((msg) =>
            msg.kind === "aside" && msg.pending ? { kind: "aside", text: r.explanation } : msg,
          ),
        );
      } catch {
        setMsgs((m) =>
          m.map((msg) =>
            msg.kind === "aside" && msg.pending
              ? { kind: "aside", text: "I couldn't fetch an explanation just now." }
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
    async (text: string, sttLang?: string, tl?: Timeline) => {
      if (!text.trim() || !sessionId || busy) return;
      setBusy(true);
      setInput("");
      setMsgs((m) => [...m, { kind: "learner", text }]);
      scrollBottom();
      try {
        const t: TurnResponse = await api.conversationTurn(sessionId, text.trim(), { sttLang });
        tl?.mark("turn");

        // A meta move — they asked ABOUT the line rather than answering it.
        // Nothing advanced and nothing was graded, so no turn is rendered.
        if (t.meta_intent) {
          const intent: MetaIntent = t.meta_intent;
          const line = t.node?.devanagari || node?.devanagari || "";
          if (intent === "repeat") {
            if (line) {
              setIsSpeaking(true);
              const n = t.node ?? node;
              speakLine(n?.audio_url || "", line, n?.lang || "sa", n?.audio_base64, tl);
            }
            setMsgs((m) => [...m, { kind: "aside", text: "Once more…" }]);
          } else {
            await explainLine(line, text.trim(), intent === "translate");
          }
          return;
        }

        if (t.node) setNode(t.node);

        if (t.talk && hasContent(t.talk)) {
          setLastTalk(t.talk);
          ensureScriptFont(t.talk.native_script);
          setMsgs((m) => [...m, { kind: "tutor", talk: t.talk as TalkTurn }]);
        } else if (t.node) {
          setMsgs((m) => [
            ...m,
            { kind: "status", text: t.node!.devanagari || t.node!.gloss || "" },
          ]);
        }
        tl?.mark("text");

        // Only the Sanskrit auto-plays; the native line is on tap.
        const spoken = t.talk?.reply_devanagari || t.node?.devanagari || "";
        if (spoken) {
          setIsSpeaking(true);
          speakLine(
            t.node?.audio_url || "",
            spoken,
            t.talk?.reply_devanagari ? "sa" : t.node?.lang || "sa",
            t.node?.audio_base64,
            tl,
          );
        }
        if (t.session_done) setDone(true);
      } catch {
        tl?.report("(turn failed)");
        setMsgs((m) => [...m, { kind: "error", text: "The turn didn't land — try again." }]);
      } finally {
        setBusy(false);
        scrollBottom();
      }
    },
    [sessionId, busy, node, explainLine, speakLine],
  );

  // ── Mic ────────────────────────────────────────────────────────────────
  const onMicPress = useCallback(async () => {
    if (busy || done) return;

    if (recActive) {
      haptics.press();
      setRecActive(false);
      setBusy(true);
      setMsgs((m) => [...m, { kind: "status", text: "Transcribing…" }]);
      scrollBottom();

      const tl = startTimeline("turn");
      try {
        await recorder.stop();
        tl.mark("stop");
        const uri = await settledRecordingUri(recorder);
        tl.mark("flush");
        if (!uri) throw new Error("No recording URI — recorder.uri is null after stop()");

        // Auto-detect, NOT the language of the last tutor line. This used to
        // send "sa-IN" always, which does not transcribe a Kannada or Telugu
        // speaker — it transliterates them into Devanagari. Measured
        // 2026-09-22: "ನನ್ನ ಹೆಸರು ಅಂಶುಲ್…" came back as "मेरा नाम अंशुल्, अहं
        // संस्कृतं शिक्षमाणः।" — a translation of something they never said.
        // Plain auto-detect fails the other way (v4 turns spoken Sanskrit into
        // English), so the server runs both and keeps the faithful one.
        const result = await api.stt(uri, "recording.m4a", "audio/m4a", "unknown");
        tl.mark("stt");
        const transcript = result.transcript?.trim();

        setMsgs((m) => m.filter((msg) => !(msg.kind === "status" && msg.text === "Transcribing…")));

        if (!transcript) {
          tl.report("(no transcript)");
          setMsgs((m) => [...m, { kind: "error", text: "I couldn't hear that clearly. Try again?" }]);
          return;
        }

        // Saaras says which language it heard. That is the strongest signal
        // available for romanized speech, and nothing used to read it.
        await submit(transcript, result.language_code || undefined, tl);
      } catch (err: any) {
        tl.report("(stt failed)");
        console.error("[STT] Error:", err);
        setMsgs((m) => m.filter((msg) => !(msg.kind === "status" && msg.text === "Transcribing…")));
        // U10-3: a network failure is a SYSTEM failure, never a wrong answer —
        // copy must say the connection failed, and haptics must not read as
        // "incorrect" (§3.3 / §2.2). Two refusals are not network failures
        // and used to be reported as one: Saaras transcribes at most 30 s
        // (413), and the voice quota (429).
        haptics.near();
        const status = err instanceof ApiError ? err.status : 0;
        setMsgs((m) => [
          ...m,
          {
            kind: "error",
            text:
              status === 413
                ? "That was longer than 30 seconds — try it in shorter pieces?"
                : status === 429
                  ? "You've reached the voice limit for now — you can still type."
                  : "The network failed on the way up — that's not a mistake. Say it again?",
          },
        ]);
      } finally {
        setBusy(false);
      }
    } else {
      haptics.tap();
      try {
        const perm = await requestRecordingPermissionsAsync();
        if (!perm.granted) {
          setMsgs((m) => [
            ...m,
            { kind: "error", text: "Microphone access denied. Please allow it in settings." },
          ]);
          return;
        }
        await recorder.prepareToRecordAsync();
        recorder.record();
        setRecActive(true);
      } catch (err: any) {
        console.error("[MIC] Start error:", err);
        setMsgs((m) => [...m, { kind: "error", text: `Mic error: ${err?.message || err}` }]);
      }
    }
  }, [busy, done, recActive, recorder, submit]);

  // The avatar no longer flashes a verdict. A conversation partner who lights
  // up green when you form a correct sentence is grading you, not talking.
  let avatarState: AvatarState = "idle";
  if (isSpeaking) avatarState = "speaking";
  else if (recActive) avatarState = "listening";
  else if (busy) avatarState = "thinking";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Animated.View style={[styles.header, headerStyle]}>
        <GuruNative state={avatarState} size={160} speech={speech} />
      </Animated.View>

      <Animated.View style={[styles.column, shiftStyle]}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          accessibilityLabel="Conversation messages"
        >
          {msgs.map((m, i) => {
            switch (m.kind) {
              case "tutor":
                return (
                  <TutorTurn
                    key={i}
                    talk={m.talk}
                    onSpeak={speakAgain}
                    speaking={isSpeaking}
                  />
                );
              case "learner":
                return (
                  <View key={i} style={styles.learner}>
                    <Text style={styles.learnerText} selectable>
                      {m.text}
                    </Text>
                  </View>
                );
              case "aside":
                return (
                  <View key={i} style={styles.aside}>
                    <Text style={styles.asideText}>{m.text}</Text>
                  </View>
                );
              case "status":
                return (
                  <Text key={i} style={styles.status}>
                    {m.text}
                  </Text>
                );
              case "error":
                return (
                  <View key={i} style={styles.errorCard}>
                    <Ionicons name="cloud-offline-outline" size={14} color={color.badText} />
                    <Text style={styles.errorText}>{m.text}</Text>
                  </View>
                );
            }
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

        <View style={styles.inputBar}>
          <Pressable
            onPress={() =>
              speakAgain(
                lastTalk?.reply_devanagari || node?.devanagari || "",
                lastTalk?.reply_devanagari ? "sa" : node?.lang || "sa",
              )
            }
            style={styles.replay}
            disabled={isSpeaking || (!lastTalk && !node)}
            accessibilityRole="button"
            accessibilityLabel="Replay the tutor's last line"
            accessibilityState={{ disabled: isSpeaking }}
          >
            <Ionicons name="volume-high" size={20} color={color.inkSoft} />
          </Pressable>

          {IS_NATIVE && (
            <Animated.View style={micPulseStyle}>
              <Pressable
                onPress={onMicPress}
                disabled={busy && !recActive}
                style={[
                  styles.mic,
                  recActive && styles.micActive,
                  busy && !recActive && styles.micDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel={recActive ? "Stop recording" : "Start recording"}
                accessibilityState={{ disabled: busy && !recActive }}
              >
                <Ionicons
                  name={recActive ? "stop-circle" : "mic"}
                  size={22}
                  color={recActive ? color.bad : color.inkSoft}
                />
              </Pressable>
            </Animated.View>
          )}

          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Say it however you like…"
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
      </Animated.View>

      <AchievementReveal queue={achQueue} onDone={dismissAch} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  header: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    zIndex: 10,
    backgroundColor: color.bg,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  column: { flex: 1 },
  body: { padding: space.lg, paddingBottom: space.xl, gap: space.lg },

  // ── One tutor turn ──────────────────────────────────────────────────
  turn: { gap: space.sm },
  readBack: {
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
    fontSize: font.sizes.xs,
    color: color.inkFaint,
    lineHeight: 17,
  },
  fixCard: {
    backgroundColor: color.saffronLight,
    borderRadius: radius.md,
    padding: space.md,
    gap: 2,
    borderLeftWidth: 3,
    borderLeftColor: color.saffron,
  },
  fixHead: { flexDirection: "row", alignItems: "center", gap: space.xxs, marginBottom: 4 },
  fixLabel: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: 10,
    color: color.saffronText,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  // Devanagari needs vertical room its rounded UI face never got. `sanskritText`
  // sets a 1.75x line box so matras above and conjuncts below stop clipping.
  fixDev: { ...sanskritText(font.sizes.lg), color: color.ink },
  fixNote: {
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
    fontSize: font.sizes.xs,
    color: color.saffronText,
    lineHeight: 18,
    marginTop: 4,
  },

  // The Sanskrit is the thing to read, so it is the biggest thing here.
  replyDev: { ...sanskritText(font.sizes.xl), color: color.ink },
  roman: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
    letterSpacing: 0.2,
    marginTop: 2,
  },
  nativeRow: { flexDirection: "row", alignItems: "center", gap: space.xs },
  native: { flex: 1, color: color.tutor },

  whyCard: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    padding: space.md,
    borderWidth: 1,
    borderColor: color.border,
    marginTop: space.xxs,
  },
  whyLabel: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: 10,
    color: color.inkFaint,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  why: {
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
    fontSize: font.sizes.base,
    color: color.ink,
    lineHeight: 25,
  },

  // ── The learner's own line ──────────────────────────────────────────
  learner: {
    alignSelf: "flex-end",
    maxWidth: "88%",
    backgroundColor: color.learnerBg,
    borderRadius: radius.lg,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    ...shadow.card,
  },
  learnerText: { ...script("semibold"), fontSize: font.sizes.base, color: color.ink, lineHeight: 24 },

  aside: {
    alignSelf: "center",
    maxWidth: "92%",
    backgroundColor: color.surfaceMuted,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderLeftWidth: 3,
    borderLeftColor: color.saffron,
  },
  asideText: {
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
    lineHeight: 21,
  },
  status: {
    ...sanskritText(font.sizes.md),
    color: color.inkSoft,
    alignSelf: "center",
    textAlign: "center",
  },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    alignSelf: "center",
    backgroundColor: color.badBg,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  errorText: {
    flex: 1,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
    fontSize: font.sizes.sm,
    color: color.badText,
    lineHeight: 20,
  },

  recBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    alignSelf: "center",
    backgroundColor: "#FDE8E8",
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  recText: {
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    fontSize: font.sizes.sm,
    color: color.bad,
  },
  doneCard: {
    backgroundColor: color.okBg,
    borderRadius: radius.lg,
    padding: space.lg,
    alignItems: "center",
    ...shadow.card,
  },
  doneTitle: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.md,
    color: color.ok,
  },
  doneSub: {
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
    marginTop: 4,
  },

  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: space.md,
    backgroundColor: color.surface,
    borderTopWidth: 1,
    borderTopColor: color.border,
    gap: space.sm,
  },
  replay: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: color.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  mic: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: color.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  micActive: { backgroundColor: "#FDE8E8", borderColor: color.bad },
  micDisabled: { opacity: 0.4 },
  input: {
    flex: 1,
    borderWidth: 2,
    borderColor: color.border,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontSize: font.sizes.base,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
    color: color.ink,
    minHeight: 44,
    // Grow with the text, then scroll. Unbounded `multiline` let a long
    // paste push the mic and send buttons off the bottom of the screen.
    maxHeight: 120,
  },
  send: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: color.saffron,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.button,
  },
  sendDisabled: { opacity: 0.4 },
});
