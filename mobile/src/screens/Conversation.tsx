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
  ApiError,
  type AskBirth,
  type AskCard,
  type AskPlace,
  type AskTalkResponse,
  type AskPartialCard,
  type AskTalkOptions,
  type AskTurn,
  type TalkTurn,
  type ConversationNode,
  type MetaIntent,
  type TurnResponse,
} from "../api/client";
import { GuruNative, type AvatarStateName as AvatarState } from "../components/guru/GuruNative";
import AnswerCard from "../components/ask/AnswerCard";
import BirthForm from "../components/ask/BirthForm";
import PlaceChooser from "../components/PlaceChooser";
import { startTimeline, type Timeline } from "../utils/perf";
import { haptics } from "../services/haptics";
import { getBirth, getPartner, type SavedPartner } from "../services/birth";
import { getPlace } from "../services/place";
import { getKalaPrefs } from "../kala/prefs";
import { playTutorAudio, speak, type SpeakHandle } from "../services/speech";
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

// ─── Ask mode ─────────────────────────────────────────────────────────────
// Talk has two modes (owner, 2026-10-05). Practise is the Sanskrit
// conversation above, unchanged. Ask is an explainer for everything else a
// learner wants to know (texts, dharma, festivals and puja vidhi, kundli,
// Ayurveda, yoga, maths and astronomy in the texts), answered in their own
// language by POST /ask/talk. The two threads are kept apart: switching
// modes loses neither, and Ask questions never enter the tutor's history.

type Mode = "practise" | "ask";

type AskMsg =
  | { kind: "q"; text: string; display?: string }
  | { kind: "a"; data: AskTalkResponse; question: string }
  | { kind: "pending" }
  | { kind: "stream"; card: AskCard; question: string }
  | { kind: "birth"; question: string }
  | { kind: "partner"; question: string }
  | { kind: "place"; question: string }
  | { kind: "error"; text: string };

/** Rows offered before the first question; one tap asks. Five of the owner's
 * examples (handover section 1): a fact, a table, a reading, a remedy and a verse. */
const ASK_STARTERS = [
  "What date is today according to Vikram Samvat?",
  "List the 12 months in English and Sanskrit with their dates",
  "How can I get a job through astrology?",
  "What should I eat when I have a cold, according to Ayurveda?",
  "What should I do when I am sad, according to the Bhagavad Gita?",
];

// A question about the asker's own chart. With birth details saved on the
// phone, these go with the question at once instead of after a round trip.
const CHART_WORDS =
  /kundli|kundali|horoscope|birth\s*chart|janam|janm|rashi|rasi|lagna|ascendant|nakshatra|dasha|dosha|manglik|mangal|sade\s*sati|shani|jyotish|astrolog|कुंडली|कुण्डली|राशि|लग्न|नक्षत्र|दशा|दोष|मांगलिक|मंगल|साढ़े|शनि|ज्योतिष/i;
const MINE = /\b(my|me|mine|i|mera|meri|mere|mujhe)\b|मेरी|मेरा|मेरे|मुझे|मैं/i;
const wantsChart = (q: string) => CHART_WORDS.test(q) && MINE.test(q);
// A question about matching two charts. With both people's details saved,
// they go with the question at once.
const MATCH_WORDS = /milan|match|compatib|gun\b|guna|ashtakoo?ta|मिलान|मिलाप|गुण/i;
const wantsMatch = (q: string) => MATCH_WORDS.test(q);

/** A card still being written, in the shape the answer card draws. */
function liveCard(c: AskPartialCard): AskCard {
  return {
    kind: c.kind ?? "explain",
    title: c.title ?? "",
    title_sa: c.title_sa ?? "",
    title_iast: c.title_iast ?? "",
    when: { text: "", note: "" },
    summary: c.summary ?? "",
    sections: c.sections ?? [],
    table: c.table ?? null,
    remedies: c.remedies ?? null,
    terms: [],
    caution: "",
    place_needed: false,
  };
}

/** The thread as the server wants it: the last six answered questions. */
function askHistory(msgs: AskMsg[]): AskTurn[] {
  const turns: AskTurn[] = [];
  for (const m of msgs) {
    if (m.kind === "a" && m.data.card) turns.push({ q: m.question, a: m.data.explanation.slice(0, 900) });
  }
  return turns.slice(-6);
}

/** What "listen" reads, by kind. Capped, because reading aloud costs more
 * than writing the answer did. */
function listenText(card: AskCard): string {
  const kind = card.kind ?? "explain";
  const parts: string[] = [];
  if (kind === "fact") {
    parts.push(card.summary);
  } else if (kind === "table") {
    parts.push(card.summary);
  } else if (kind === "remedies") {
    parts.push(card.summary);
    for (const r of card.remedies ?? []) {
      parts.push(r.name);
      if (r.when) parts.push(r.when);
    }
  } else if (kind === "verses") {
    parts.push(card.summary);
    for (const v of card.verses ?? []) parts.push(v.meaning);
  } else if (kind === "procedure") {
    parts.push(card.summary);
    for (const s of card.sections ?? []) {
      if (s.style === "steps") parts.push(...(s.items ?? []));
    }
  } else {
    parts.push(card.summary);
    for (const s of card.sections ?? []) parts.push(...(s.items ?? []));
  }
  let out = "";
  for (const p of parts.map((x) => plain(x)).filter(Boolean)) {
    if ((out + " " + p).length > 1200) break;
    out = out ? `${out} ${p}` : p;
  }
  return out;
}

function askError(e: unknown): string {
  if (e instanceof ApiError && e.status === 429) return "Today's questions are used up. Try again tomorrow.";
  if (e instanceof ApiError && e.status === 422) return "Those birth details didn't work. Check the date and time.";
  return "I couldn't answer that just now. Try again.";
}

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

  // Ask mode: its own thread, its own busy flag, the language the thread has
  // been answered in, and the birth details saved on this phone.
  const [mode, setMode] = useState<Mode>("practise");
  const [askMsgs, setAskMsgs] = useState<AskMsg[]>([]);
  const [askBusy, setAskBusy] = useState(false);
  const askLangRef = useRef("");
  const [birth, setBirthState] = useState<AskBirth | null>(null);
  const [partner, setPartnerState] = useState<SavedPartner | null>(null);
  const askScriptRef = useRef("latin");
  const [listening, setListening] = useState<number | null>(null);
  const listenRef = useRef<SpeakHandle | null>(null);

  useEffect(() => {
    void getBirth().then(setBirthState);
    void getPartner().then(setPartnerState);
    return () => {
      void listenRef.current?.stop().catch(() => undefined);
    };
  }, []);

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
    disabled: mode === "ask" ? askBusy : busy || done,
    onResult: (r) => {
      const tl = tlRef.current;
      tlRef.current = null;
      if (mode === "ask") {
        void askSubmit(r.transcript, { sttLang: r.language_code || undefined, display: r.display || undefined });
        return;
      }
      tl?.mark("stt");
      void submit(r.transcript, r.language_code || undefined, tl ?? undefined, r.display || undefined);
    },
    onError: (message) => {
      tlRef.current?.report("(stt failed)");
      tlRef.current = null;
      if (mode === "ask") {
        setAskMsgs((m) => [...m, { kind: "error", text: message }]);
      } else {
        setMsgs((m) => [...m, { kind: "error", text: message }]);
      }
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

  // ── Ask mode ──────────────────────────────────────────────────────────

  /**
   * Ask one question; the answer is shown while it is written. `quiet`
   * re-asks a question already in the thread (after birth details, a
   * partner's or a place were given) without showing it twice. Saved details
   * go along at once with a question that needs them; if the server still
   * says it needs them, the question is asked again with them rather than
   * showing the form.
   */
  const askSubmit = useCallback(
    async (
      q: string,
      opts: {
        sttLang?: string;
        display?: string;
        birth?: AskBirth | null;
        partner?: SavedPartner | null;
        place?: AskPlace | null;
        quiet?: boolean;
      } = {},
    ) => {
      const text = q.trim();
      if (!text || askBusy) return;
      setAskBusy(true);
      if (!opts.quiet) setInput("");
      const history = askHistory(askMsgs);
      setAskMsgs((m) => [
        ...m.filter((x) => x.kind !== "birth" && x.kind !== "partner" && x.kind !== "place" && x.kind !== "error"),
        ...(opts.quiet ? [] : [{ kind: "q" as const, text, display: opts.display }]),
        { kind: "pending" as const },
      ]);
      scrollBottom();
      // The card so far replaces "Thinking…", then grows in place.
      const showPartial = (c: AskPartialCard) =>
        setAskMsgs((m) => {
          const at = m.findIndex((x) => x.kind === "pending" || x.kind === "stream");
          if (at < 0) return m;
          const out = [...m];
          out[at] = { kind: "stream", card: liveCard(c), question: text };
          return out;
        });
      try {
        // A place just picked is passed in: storing it is not finished yet.
        const saved = opts.place === undefined ? await getPlace() : opts.place;
        const place = saved ? { lat: saved.lat, lon: saved.lon, tz: saved.tz, label: saved.label } : null;
        const myBirth = opts.birth !== undefined ? opts.birth : birth;
        const theirs = opts.partner !== undefined ? opts.partner : partner;
        const ask = async (b: AskBirth | null, p: SavedPartner | null) => {
          const o: AskTalkOptions = {
            history,
            lang: askLangRef.current || undefined,
            sttLang: opts.sttLang,
            place,
            birth: b,
            partner: b && p ? p.birth : null,
            askerIs: p?.askerIs,
            tradition: getKalaPrefs().tradition,
          };
          try {
            return await api.askTalkStream(text, o, showPartial);
          } catch (e) {
            // A server without the stream, or a stream cut short: ask plainly.
            if (e instanceof ApiError && ![0, 404, 405].includes(e.status)) throw e;
            return await api.askTalk(text, o);
          }
        };
        const matchQ = wantsMatch(text);
        const firstBirth = opts.birth !== undefined || wantsChart(text) || matchQ ? myBirth : null;
        const firstPartner = opts.partner !== undefined || matchQ ? theirs : null;
        let r = await ask(firstBirth, firstPartner);
        if (r.needs === "birth" && !firstBirth && myBirth) r = await ask(myBirth, firstPartner);
        if (r.needs === "partner" && !firstPartner && theirs && myBirth) r = await ask(myBirth, theirs);
        askLangRef.current = r.lang || askLangRef.current;
        askScriptRef.current = r.script || askScriptRef.current;
        void ensureScriptFont(r.script);
        const next: AskMsg[] = [];
        if (r.needs === "birth" || (r.needs === "partner" && !myBirth)) next.push({ kind: "birth", question: text });
        else if (r.needs === "partner") next.push({ kind: "partner", question: text });
        setAskMsgs((m) => [
          ...m.filter((x) => x.kind !== "pending" && x.kind !== "stream"),
          r.card ? { kind: "a" as const, data: r, question: text } : { kind: "error" as const, text: askError(null) },
          ...next,
        ]);
      } catch (e) {
        setAskMsgs((m) => [
          ...m.filter((x) => x.kind !== "pending" && x.kind !== "stream"),
          { kind: "error", text: askError(e) },
        ]);
      } finally {
        setAskBusy(false);
        scrollBottom();
      }
    },
    [askBusy, askMsgs, birth, partner],
  );

  const stopListening = useCallback(() => {
    void listenRef.current?.stop().catch(() => undefined);
    listenRef.current = null;
    setListening(null);
    setIsSpeaking(false);
    setSpeech(null);
  }, []);

  /** Read an answer aloud in its own language, or stop if it is reading. */
  const toggleListen = useCallback(
    async (idx: number, card: AskCard, lang: string) => {
      const wasThis = listening === idx;
      stopListening();
      if (wasThis) return;
      const text = listenText(card);
      if (!text) return;
      haptics.tap();
      setListening(idx);
      setIsSpeaking(true);
      try {
        listenRef.current = await speak(
          text,
          lang || "en",
          1.0,
          () => {
            listenRef.current = null;
            setListening(null);
            setIsSpeaking(false);
            setSpeech(null);
          },
          (durationMs) => setSpeech({ text, durationMs }),
        );
      } catch {
        stopListening();
      }
    },
    [listening, stopListening],
  );

  const switchMode = useCallback(
    (m: Mode) => {
      if (m === mode) return;
      haptics.tap();
      stopListening();
      setMode(m);
      scrollBottom();
    },
    [mode, stopListening],
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
  else if (busy || askBusy) avatarState = "thinking";

  const asking = mode === "ask";
  const inputBusy = asking ? askBusy : busy;
  const inputClosed = asking ? false : done;

  /** One question and its answer, in Ask mode. */
  const renderAsk = (m: AskMsg, i: number) => {
    switch (m.kind) {
      case "q":
        return (
          <View key={`a${i}`} style={styles.learner}>
            <Text style={styles.learnerText} selectable>
              {m.display || m.text}
            </Text>
          </View>
        );
      case "a": {
        const card = m.data.card;
        if (!card) return null;
        return (
          <AnswerCard
            key={`a${i}`}
            card={card}
            explanation={m.data.explanation}
            question={m.question}
            scriptKey={m.data.script}
            chart={m.data.chart}
            surface="ask"
            onFollowUp={(f) => void askSubmit(f)}
            onMore={(qq, display) => void askSubmit(qq, { display })}
            onListen={() => void toggleListen(i, card, m.data.lang)}
            listening={listening === i}
            onPlace={() => {
              setAskMsgs((list) => [...list, { kind: "place", question: m.question }]);
              scrollBottom();
            }}
            onBirth={
              m.data.chart
                ? () => {
                    setAskMsgs((list) => [...list, { kind: "birth", question: m.question }]);
                    scrollBottom();
                  }
                : undefined
            }
            match={m.data.match}
            askerIs={partner?.askerIs}
            onPartner={
              m.data.match
                ? () => {
                    setAskMsgs((list) => [...list, { kind: "partner", question: m.question }]);
                    scrollBottom();
                  }
                : undefined
            }
          />
        );
      }
      case "stream":
        return (
          <AnswerCard
            key={`a${i}`}
            card={m.card}
            explanation=""
            question={m.question}
            scriptKey={askScriptRef.current}
            live
          />
        );
      case "birth":
        return (
          <BirthForm
            key={`a${i}`}
            initial={birth}
            onDone={(b) => {
              setBirthState(b);
              void askSubmit(m.question, { birth: b, quiet: true });
            }}
            onCancel={() => {
              void getBirth().then(setBirthState);
              setAskMsgs((list) => list.filter((x) => x !== m));
            }}
          />
        );
      case "partner":
        return (
          <BirthForm
            key={`a${i}`}
            who="partner"
            initial={partner?.birth ?? null}
            initialAskerIs={partner?.askerIs ?? "boy"}
            onDone={(b, side) => {
              const p: SavedPartner = { birth: b, askerIs: side };
              setPartnerState(p);
              if (birth) void askSubmit(m.question, { partner: p, quiet: true });
              else setAskMsgs((list) => [...list.filter((x) => x !== m), { kind: "birth", question: m.question }]);
            }}
            onCancel={() => {
              void getPartner().then(setPartnerState);
              setAskMsgs((list) => list.filter((x) => x !== m));
            }}
          />
        );
      case "place":
        return (
          <View key={`a${i}`} style={styles.placeBox}>
            <Text style={styles.placeHead}>Your place</Text>
            <PlaceChooser onPick={(p) => void askSubmit(m.question, { quiet: true, place: p })} />
          </View>
        );
      case "pending":
        return (
          <Text key={`a${i}`} style={styles.asideText}>
            Thinking…
          </Text>
        );
      case "error":
        return (
          <View key={`a${i}`} style={styles.errorCard}>
            <Ionicons name="cloud-offline-outline" size={14} color={color.badText} />
            <Text style={styles.errorText}>{m.text}</Text>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Animated.View style={[styles.header, headerStyle]}>
        <GuruNative state={avatarState} size={160} speech={speech} />
      </Animated.View>

      <Animated.View style={[styles.column, shiftStyle]}>
        <View style={styles.modeRow} accessibilityRole="tablist">
          {(["practise", "ask"] as Mode[]).map((m) => {
            const on = mode === m;
            return (
              <Pressable
                key={m}
                onPress={() => switchMode(m)}
                style={[styles.modeBtn, on && styles.modeBtnOn]}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                accessibilityLabel={m === "practise" ? "Practise speaking Sanskrit" : "Ask a question"}
              >
                <Ionicons
                  name={m === "practise" ? "chatbubbles-outline" : "help-circle-outline"}
                  size={16}
                  color={on ? onFill.text : color.ink}
                />
                <Text style={[styles.modeText, on && styles.modeTextOn]}>
                  {m === "practise" ? "Practise" : "Ask"}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          accessibilityLabel={asking ? "Questions and answers" : "Conversation messages"}
        >
          {asking && askMsgs.length === 0 && (
            <View style={styles.starters}>
              <Text style={styles.startHead}>Ask anything</Text>
              <Text style={styles.startSub}>
                Texts and their ideas, dharma, festivals and puja vidhi, kundli, Ayurveda, yoga, and the maths and
                astronomy in the texts. Ask in your own language.
              </Text>
              {ASK_STARTERS.map((q) => (
                <Pressable
                  key={q}
                  onPress={() => {
                    haptics.tap();
                    void askSubmit(q);
                  }}
                  style={styles.starter}
                  accessibilityRole="button"
                  accessibilityLabel={q}
                >
                  <Text style={styles.starterText}>{q}</Text>
                  <Ionicons name="arrow-forward" size={14} color={color.ink} />
                </Pressable>
              ))}
            </View>
          )}

          {asking && askMsgs.map(renderAsk)}

          {asking && voiceBusy && <Text style={styles.asideText}>Transcribing…</Text>}

          {!asking && msgs.map((m, i) => {
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

          {!asking && done && (
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
                disabled={(inputBusy || voiceBusy) && !recActive}
                style={[
                  styles.mic,
                  recActive && styles.micActive,
                  (inputBusy || voiceBusy) && !recActive && styles.micDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel={recActive ? "Stop recording" : "Start recording"}
                accessibilityState={{ disabled: (inputBusy || voiceBusy) && !recActive }}
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
            placeholder={asking ? "Ask about texts, festivals, kundli…" : "Say or type"}
            placeholderTextColor={color.inkFaint}
            style={styles.input}
            onSubmitEditing={() => (asking ? void askSubmit(input) : submit(input))}
            returnKeyType="send"
            editable={!inputBusy && !voiceBusy && !inputClosed}
            multiline
            accessibilityRole="text"
            accessibilityLabel={asking ? "Type your question" : "Type your reply"}
          />
          <Pressable
            onPress={() => {
              haptics.press();
              if (asking) void askSubmit(input);
              else submit(input);
            }}
            disabled={!input.trim() || inputBusy || voiceBusy || inputClosed}
            style={[styles.send, (!input.trim() || inputBusy || voiceBusy || inputClosed) && styles.sendDisabled]}
            accessibilityRole="button"
            accessibilityLabel={asking ? "Send question" : "Send reply"}
            accessibilityState={{ disabled: !input.trim() || inputBusy || voiceBusy || inputClosed }}
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

  // ── The Practise | Ask switch ─────────────────────────────────────────
  modeRow: {
    flexDirection: "row",
    gap: space.xs,
    paddingHorizontal: space.lg,
    paddingVertical: space.xs,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
    backgroundColor: color.bg,
  },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: outline,
  },
  modeBtnOn: { backgroundColor: fill.ink, borderColor: fill.ink },
  modeText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm, color: color.ink },
  modeTextOn: { color: onFill.text },

  // ── Ask mode ──────────────────────────────────────────────────────────
  starters: { gap: space.xs },
  startHead: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.md, color: color.ink },
  startSub: {
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
    lineHeight: 21,
    marginBottom: space.xs,
  },
  starter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.xs,
    minHeight: 48,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  starterText: { flex: 1, fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.base, color: color.ink },
  placeBox: { gap: space.xs },
  placeHead: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 17, color: color.ink },

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
