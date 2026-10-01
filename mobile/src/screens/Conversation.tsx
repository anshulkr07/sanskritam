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
  FadeIn,
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
  type TalkTurn,
  type ConversationNode,
  type MetaIntent,
  type TurnResponse,
} from "../api/client";
import { GuruNative, type AvatarStateName as AvatarState } from "../components/guru/GuruNative";
import { startTimeline, type Timeline } from "../utils/perf";
import { haptics } from "../services/haptics";
import { playTutorAudio } from "../services/speech";
import { ensureScriptFont } from "../services/scriptFonts";
import { useVoiceInput } from "../hooks/useVoiceInput";
import { useAchievementReveal } from "../hooks/useAchievementReveal";
import AchievementReveal from "../components/AchievementReveal";
import {
  color,
  fill,
  font,
  nativeText,
  onFill,
  outline,
  radius,
  sanskritText,
  script,
  space,
} from "../theme";
import { useReducedMotion } from "../hooks/useReducedMotion";
import ReportButton from "../components/ReportButton";

import { plain } from "../utils/text";

type Msg =
  | { kind: "tutor"; talk: TalkTurn }
  // A voice line shows `display` (the mix as it was said) while `text` is
  // what was sent to the tutor. When the turn comes back with `heard`, the
  // bubble is replaced with it and `langs` names the languages under it.
  | { kind: "learner"; text: string; display?: string; langs?: string }
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
  const showWhy = !!(talk.explain_en || talk.read_back);
  // A correction should be seen, so it starts open. Why starts closed.
  const [fixOpen, setFixOpen] = useState(showFix);
  const [whyOpen, setWhyOpen] = useState(false);
  const reduced = useReducedMotion();
  const panelEntering = reduced ? undefined : FadeIn.duration(120);

  return (
    <View style={styles.turn}>
      {/* The Sanskrit reply, with its replay button. The line stays pressable. */}
      {!!talk.reply_devanagari && (
        <View style={styles.replyRow}>
          <Pressable
            onPress={() => onSpeak(talk.reply_devanagari, "sa")}
            disabled={speaking}
            style={styles.replyPress}
            accessibilityRole="button"
            accessibilityLabel={`Hear again: ${talk.reply_devanagari}`}
          >
            <Text style={styles.replyDev} selectable>
              {talk.reply_devanagari}
            </Text>
            {!!talk.reply_roman && (
              <Text style={styles.replyRoman} selectable>
                {talk.reply_roman}
              </Text>
            )}
          </Pressable>
          <Pressable
            onPress={() => onSpeak(talk.reply_devanagari, "sa")}
            disabled={speaking}
            style={styles.replayRound}
            accessibilityRole="button"
            accessibilityLabel={`Hear again: ${talk.reply_devanagari}`}
            accessibilityState={{ disabled: speaking }}
          >
            <Ionicons name="volume-high" size={18} color={color.ink} />
          </Pressable>
        </View>
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
          <Text style={[styles.native, nativeText(talk.native_script, 16)]} selectable>
            {talk.reply_native}
          </Text>
        </Pressable>
      )}

      {/* Two small tabs on one row, then their panels. The flag reports the reply. */}
      {(showFix || showWhy) && (
        <View style={styles.tabRow}>
          {showFix && (
            <Pressable
              onPress={() => {
                haptics.tap();
                setFixOpen((v) => !v);
              }}
              style={[styles.tab, styles.tabFix]}
              accessibilityRole="button"
              accessibilityLabel="Say it like this"
              accessibilityState={{ expanded: fixOpen }}
            >
              <Text style={styles.tabText}>Say it like this</Text>
              <Ionicons
                name={fixOpen ? "chevron-up" : "chevron-down"}
                size={14}
                color={onFill.text}
              />
            </Pressable>
          )}
          {showWhy && (
            <Pressable
              onPress={() => {
                haptics.tap();
                setWhyOpen((v) => !v);
              }}
              style={[styles.tab, styles.tabWhy]}
              accessibilityRole="button"
              accessibilityLabel="Why"
              accessibilityState={{ expanded: whyOpen }}
            >
              <Text style={styles.tabText}>Why</Text>
              <Ionicons
                name={whyOpen ? "chevron-up" : "chevron-down"}
                size={14}
                color={onFill.text}
              />
            </Pressable>
          )}
          <View style={styles.tabSpacer} />
          <ReportButton
            surface="talk"
            question={talk.read_back || ""}
            answer={[talk.reply_devanagari, talk.reply_native, talk.explain_en]
              .filter(Boolean)
              .join("\n")}
          />
        </View>
      )}

      {showFix && fixOpen && (
        <Animated.View entering={panelEntering} style={[styles.panel, styles.fixPanel]}>
          <Text style={styles.panelLabel}>Say it like this</Text>
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
              <Text style={styles.fixRoman} selectable>
                {fix.roman}
              </Text>
            )}
          </Pressable>
          {!!fix.note_en && <Text style={styles.fixNote}>{plain(fix.note_en)}</Text>}
        </Animated.View>
      )}

      {showWhy && whyOpen && (
        <Animated.View entering={panelEntering} style={[styles.panel, styles.whyPanel]}>
          {!!talk.read_back && (
            <Text style={styles.readBack} accessibilityLabel={`You said: ${plain(talk.read_back)}`}>
              {plain(talk.read_back)}
            </Text>
          )}
          {!!talk.explain_en && (
            <Text style={styles.why} selectable>
              {plain(talk.explain_en)}
            </Text>
          )}
        </Animated.View>
      )}

      {/* No tabs to hang it on: the flag still has to be reachable. */}
      {!showFix && !showWhy && (
        <View style={styles.tabRow}>
          <View style={styles.tabSpacer} />
          <ReportButton
            surface="talk"
            question={talk.read_back || ""}
            answer={[talk.reply_devanagari, talk.reply_native, talk.explain_en]
              .filter(Boolean)
              .join("\n")}
          />
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────

export default function ConversationScreen() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [node, setNode] = useState<ConversationNode | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [done, setDone] = useState(false);
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

  const pulseAnim = useSharedValue(1);
  const scrollBottom = () =>
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));

  // The mic, shared with Ask (hooks/useVoiceInput). A result is submitted
  // with the transcript for the tutor and the display mix for the bubble.
  const tlRef = useRef<Timeline | null>(null);
  const voice = useVoiceInput({
    disabled: busy || done,
    onResult: (r) => {
      const tl = tlRef.current;
      tlRef.current = null;
      tl?.mark("stt");
      void submit(r.transcript, r.language_code || undefined, tl ?? undefined, r.display || undefined);
    },
    onError: (message) => {
      tlRef.current?.report("(stt failed)");
      tlRef.current = null;
      setMsgs((m) => [...m, { kind: "error", text: message }]);
      scrollBottom();
    },
    onProgress: (stage) => {
      if (stage === "stop") {
        tlRef.current = startTimeline("turn");
        tlRef.current.mark("stop");
      } else {
        tlRef.current?.mark(stage);
      }
    },
  });
  const recActive = voice.recording;
  const voiceBusy = voice.busy;

  // While transcribing, the thread says so; the line is lifted when text arrives.
  useEffect(() => {
    if (voiceBusy) {
      setMsgs((m) => [...m, { kind: "status", text: "Transcribing…" }]);
      scrollBottom();
    } else {
      setMsgs((m) =>
        m.filter((msg) => !(msg.kind === "status" && msg.text === "Transcribing…")),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceBusy]);

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

  // Start a fresh session on mount.
  useEffect(() => {
    (async () => {
      try {
        const s = await api.conversationStart();
        setSessionId(s.session_id);
        setNode(s.node);
        if (s.talk && hasContent(s.talk)) {
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
            msg.kind === "aside" && msg.pending ? { kind: "aside", text: plain(r.explanation) } : msg,
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
    async (text: string, sttLang?: string, tl?: Timeline, display?: string) => {
      if (!text.trim() || !sessionId || busy) return;
      setBusy(true);
      setInput("");
      // The bubble shows the mix as it was said; the transcript is what the
      // tutor is sent. A typed line shows exactly as typed.
      setMsgs((m) => [...m, { kind: "learner", text, display }]);
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
          ensureScriptFont(t.talk.native_script);
          // A voice turn may come back with the line re-scripted per
          // language: replace the bubble text and name the languages.
          const heard = t.talk.heard?.trim();
          if (heard) {
            const langs = (t.talk.heard_langs || []).filter(Boolean);
            setMsgs((m) => {
              const out = [...m];
              for (let i = out.length - 1; i >= 0; i--) {
                if (out[i].kind === "learner") {
                  out[i] = {
                    ...(out[i] as { kind: "learner"; text: string }),
                    display: heard,
                    langs: langs.length >= 2 ? langs.join(" · ") : undefined,
                  };
                  break;
                }
              }
              return [...out, { kind: "tutor", talk: t.talk as TalkTurn }];
            });
          } else {
            setMsgs((m) => [...m, { kind: "tutor", talk: t.talk as TalkTurn }]);
          }
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
        setMsgs((m) => [...m, { kind: "error", text: "That didn't go through. Try again." }]);
      } finally {
        setBusy(false);
        scrollBottom();
      }
    },
    [sessionId, busy, node, explainLine, speakLine],
  );

  // ── Mic ────────────────────────────────────────────────────────────────
  // Recording, stopping and transcription live in the shared hook; results
  // and error lines arrive through its callbacks above.
  const onMicPress = useCallback(() => {
    voice.toggle();
  }, [voice]);

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
                      {m.display || m.text}
                    </Text>
                    {!!m.langs && <Text style={styles.learnerLangs}>{m.langs}</Text>}
                  </View>
                );
              case "aside":
                return (
                  <Text key={i} style={styles.asideText}>
                    {m.text}
                  </Text>
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
              <Ionicons name="radio-button-on" size={12} color={onFill.text} />
              <Text style={styles.recText}>Listening… tap the mic when done</Text>
            </View>
          )}

          {done && (
            <View style={styles.doneCard}>
              <Text style={styles.doneTitle}>Wonderful practice</Text>
              <Text style={styles.doneSub}>That was the conversation.</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputBar}>
          {IS_NATIVE && (
            <Animated.View style={micPulseStyle}>
              <Pressable
                onPress={onMicPress}
                disabled={(busy || voiceBusy) && !recActive}
                style={[
                  styles.mic,
                  recActive && styles.micActive,
                  (busy || voiceBusy) && !recActive && styles.micDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel={recActive ? "Stop recording" : "Start recording"}
                accessibilityState={{ disabled: (busy || voiceBusy) && !recActive }}
              >
                <Ionicons
                  name={recActive ? "stop" : "mic"}
                  size={20}
                  color={recActive ? color.white : color.ink}
                />
              </Pressable>
            </Animated.View>
          )}

          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Say or type"
            placeholderTextColor={color.inkFaint}
            style={styles.input}
            onSubmitEditing={() => submit(input)}
            returnKeyType="send"
            editable={!busy && !voiceBusy && !done}
            multiline
            accessibilityRole="text"
            accessibilityLabel="Type your reply"
          />
          <Pressable
            onPress={() => {
              haptics.press();
              submit(input);
            }}
            disabled={!input.trim() || busy || voiceBusy || done}
            style={[styles.send, (!input.trim() || busy || voiceBusy || done) && styles.sendDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Send reply"
            accessibilityState={{ disabled: !input.trim() || busy || voiceBusy || done }}
          >
            <Ionicons name="arrow-up" size={20} color={color.white} />
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
  // The Sanskrit reply with its replay button on the right.
  replyRow: { flexDirection: "row", alignItems: "flex-start", gap: space.sm },
  replyPress: { flex: 1 },
  // The Sanskrit is the thing to read, so it is the biggest thing here.
  // Devanagari needs vertical room: `sanskritText` sets a 1.75x line box so
  // matras above and conjuncts below stop clipping.
  replyDev: { ...sanskritText(24), color: color.ink },
  replyRoman: {
    fontFamily: "Nunito_400Regular",
    fontStyle: "italic",
    fontWeight: "400",
    fontSize: 13,
    color: color.inkSoft,
    lineHeight: 19,
    marginTop: 2,
  },
  replayRound: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: color.ink,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  nativeRow: { flexDirection: "row", alignItems: "center", gap: space.xs, marginTop: 6 },
  // 16pt in the readable tutor colour. The script face upgrades on load.
  native: { flex: 1, color: color.tutorText },

  // Two small tabs on one row, then their panels.
  tabRow: { flexDirection: "row", alignItems: "center", gap: space.xs, marginTop: 10 },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 32,
    paddingHorizontal: space.sm,
    borderRadius: 8,
  },
  tabFix: { backgroundColor: fill.saffron },
  tabWhy: { backgroundColor: fill.teal },
  tabText: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: 12,
    color: onFill.text,
  },
  tabSpacer: { flex: 1 },
  panel: { borderRadius: 12, padding: space.sm, gap: 2, marginTop: space.xs },
  fixPanel: { backgroundColor: fill.saffron },
  whyPanel: { backgroundColor: fill.teal },
  panelLabel: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: 10,
    // Cream, not gold: gold labels are below 4.5:1 on the saffron fill.
    color: onFill.text,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  fixDev: { ...sanskritText(20), color: onFill.text },
  fixRoman: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    fontSize: font.sizes.sm,
    color: onFill.soft,
    lineHeight: 20,
  },
  fixNote: {
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
    fontSize: 13,
    color: onFill.text,
    lineHeight: 19,
    marginTop: 4,
  },
  readBack: {
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
    fontSize: font.sizes.xs,
    color: onFill.soft,
    lineHeight: 17,
  },
  why: {
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
    fontSize: font.sizes.sm,
    color: onFill.text,
    lineHeight: 21,
  },

  // ── The learner's own line ──────────────────────────────────────────
  learner: {
    alignSelf: "flex-end",
    maxWidth: "88%",
    backgroundColor: fill.ink,
    borderRadius: 14,
    borderBottomRightRadius: 4,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  learnerText: {
    ...script("semibold"),
    fontSize: font.sizes.base,
    color: onFill.text,
    lineHeight: 24,
  },
  learnerLangs: {
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    fontSize: 11,
    color: onFill.gold,
    marginTop: 3,
  },

  asideText: {
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
    lineHeight: 21,
    alignSelf: "center",
    textAlign: "center",
  },
  status: {
    ...sanskritText(font.sizes.md),
    color: color.inkSoft,
    alignSelf: "center",
    textAlign: "center",
  },
  // One line on the page: what happened and what to do.
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    alignSelf: "center",
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
    backgroundColor: fill.ink,
    borderRadius: 8,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  recText: {
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    fontSize: font.sizes.sm,
    color: onFill.text,
  },
  doneCard: {
    backgroundColor: fill.sage,
    borderRadius: radius.lg,
    padding: space.lg,
    alignItems: "center",
  },
  doneTitle: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.md,
    color: onFill.text,
  },
  doneSub: {
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
    fontSize: font.sizes.sm,
    color: onFill.soft,
    marginTop: 4,
  },

  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: color.surface,
    borderTopWidth: 1,
    borderTopColor: color.border,
    gap: 8,
  },
  mic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: color.ink,
  },
  micActive: { backgroundColor: fill.bad, borderColor: fill.bad },
  micDisabled: { opacity: 0.4 },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: outline,
    borderRadius: 12,
    backgroundColor: color.white,
    paddingHorizontal: space.sm,
    paddingVertical: 8,
    fontSize: font.sizes.base,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
    color: color.ink,
    minHeight: 40,
    // Grow with the text, then scroll. Unbounded `multiline` let a long
    // paste push the mic and send buttons off the bottom of the screen.
    maxHeight: 96,
  },
  send: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: color.saffronBtn,
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: { opacity: 0.4 },
});
