// Recite: learn one verse in three steps (handover_games_daily_multiplayer §7).
//
//   Listen   the verse, its meaning and optional Roman text; tap a line to
//            hear it; play the verse straight or each line three times;
//            speed really applies. One player, moved on by playback events.
//   Practise one line (or the whole verse) at a time: listen, record after a
//            3-2-1, read the feedback, retry or go on. Text shown, partly
//            hidden or hidden. Practice never counts for a competition, even
//            when opened from one.
//   Recite   from memory. Short instructions, permissions asked up front, a
//            one-time rehearsal of the stop gesture, 3-2-1, "Close your eyes;
//            begin after the tone", a settling pause, the tone, then a large
//            stop area and a separate Stop button. The verse is never shown
//            while recording; rough live captions may be. Stopping ends the
//            eye check at once and says "Finished. You can open your eyes."
//            Opened from a competition, this step is the ranked attempt and
//            the eyes-closed check is required; otherwise it is optional.
//
// The recording (16 kHz WAV from the live stream, or m4a when the stream is
// unavailable) is uploaded once and scored on the server.

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { RootStackParamList } from "../navigation/types";
import {
  ApiError, api, uploadRecite,
  type ChantLine, type Division, type ReciteResult, type Shloka,
} from "../api/client";
import EyesClosedTest, { type EyesOutcome } from "../components/recite/EyesClosedTest";
import RecitationResult from "../components/recite/RecitationResult";
import { useQuery } from "../hooks/useQuery";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useLang } from "../i18n";
import { T, sa, ui } from "../read/look";
import { playCue, preloadCues } from "../recite/cues";
import { mask } from "../recite/hide";
import { useLiveRecitation } from "../recite/useLiveRecitation";
import { useVersePlayer } from "../recite/useVersePlayer";
import { haptics } from "../services/haptics";
import { playClip } from "../services/speech";
import { plain } from "../utils/text";

type Props = NativeStackScreenProps<RootStackParamList, "Recite">;
type Step = "listen" | "practise" | "recite";

const RECENT_KEY = "shabd.recite.recent";
const POS_KEY = "shabd.recite.pos.";
const REHEARSED_KEY = "shabd.recite.stopRehearsed";
/** Time to close the eyes after the spoken cue, before the tone. */
export const SETTLE_MS = 1500;

const VISIBILITY: { level: number; label: string; note: string }[] = [
  { level: 0, label: "Shown", note: "The whole line is on screen." },
  { level: 1, label: "Partly hidden", note: "Every other word shows only its first syllable." },
  { level: 3, label: "Hidden", note: "Nothing on screen. Recite from memory." },
];

const WHY_NOT: Record<string, string> = {
  unclear: "The recording was not clear enough to score, so it did not count. Try again somewhere quieter.",
  no_timing: "Flow and pace could not be measured from this recording, so it did not count. Try again.",
  text_shown: "The text was on screen, so it did not count.",
  no_face: "Your face was not seen enough, so it did not count. Prop the phone so the front camera sees you.",
  two_faces: "Two faces were seen, so it did not count. Recite alone in the frame.",
  eyes_open: "Your eyes were open, so it did not count for the leaderboard.",
  old_app: "This app version is too old for the face check. Update the app, then try again.",
};

function errorText(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 403) return "Sign in again and retry.";
    if (e.status === 429) return e.message || "Today's recitation allowance is used up. Try again tomorrow.";
    if (e.message) return e.message;
    if (e.status === 503) return "Scoring is busy. Try again.";
  }
  return "Could not score that. Check your connection and try again.";
}

function lineTexts(verse: Shloka | undefined): ChantLine[] {
  if (verse?.chant?.lines?.length) return verse.chant.lines;
  return (verse?.devanagari ?? "").split(/(?<=[।॥])/).map((s) => s.trim()).filter(Boolean)
    .map((text, i) => ({ i, text, kind: "verse" as const, start_ms: 0, end_ms: 0 }));
}

export default function ReciteScreen({ navigation, route }: Props) {
  const { verseUid, start } = route.params;
  const { data: verses } = useQuery("reader-verses", api.listShlokas, { ttlMs: 30 * 60_000 });
  const listed: Shloka | undefined = useMemo(
    () => (verses ?? []).find((v) => v.verse_uid === verseUid || v.id === verseUid),
    [verses, verseUid],
  );
  // Verses of paged books are not in the classic list: fetch those by uid.
  const [fetched, setFetched] = useState<Shloka | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    if (!verses || listed) return;
    let live = true;
    api.shlokaByUid(verseUid).then((v) => { if (live) setFetched(v); }).catch(() => { if (live) setMissing(true); });
    return () => { live = false; };
  }, [verses, listed, verseUid]);
  const verse = listed ?? fetched ?? undefined;
  const [step, setStep] = useState<Step>(start ?? "listen");
  const lines = useMemo(() => lineTexts(verse), [verse]);
  const chantLines = useMemo(() => verse?.chant?.lines ?? [], [verse]);
  const player = useVersePlayer(verse?.chant?.url, chantLines);
  const live = useLiveRecitation({ captions: true });

  useEffect(() => {
    navigation.setOptions({ title: "Learn this verse" });
  }, [navigation]);

  useEffect(() => {
    preloadCues();
    void AsyncStorage.getItem(RECENT_KEY).then(async (v) => {
      try {
        const list: string[] = v ? JSON.parse(v) : [];
        await AsyncStorage.setItem(RECENT_KEY, JSON.stringify([verseUid, ...list.filter((x) => x !== verseUid)].slice(0, 10)));
      } catch { /* keep */ }
    });
    if (!start) {
      void AsyncStorage.getItem(POS_KEY + verseUid).then((v) => {
        try {
          const pos = v ? JSON.parse(v) as { step?: Step } : null;
          if (pos?.step) setStep(pos.step);
        } catch { /* keep */ }
      });
    }
  }, [verseUid, start]);

  const go = useCallback((s: Step) => {
    if (live.recording) return;
    player.stop();
    setStep(s);
    void AsyncStorage.setItem(POS_KEY + verseUid, JSON.stringify({ step: s })).catch(() => {});
  }, [live.recording, player, verseUid]);

  // Leaving the screen stops audio and any recording.
  useEffect(() => navigation.addListener("blur", () => {
    player.stop();
  }), [navigation, player]);

  if (!verse) {
    return (
      <View style={styles.center}>
        <Text style={styles.body}>{missing ? "This verse is not available." : "Loading the verse…"}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: T.paper }} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled"
      scrollEnabled={!live.recording}>
      <Text style={styles.ref}>{verse.source_ref}</Text>
      <View style={styles.tabs} accessibilityRole="tablist">
        {(["listen", "practise", "recite"] as const).map((s, i) => (
          <Pressable accessibilityLabel={s === "listen" ? "Step 1, listen" : s === "practise" ? "Step 2, practise" : "Step 3, recite"}
            key={s}
            onPress={() => go(s)}
            disabled={live.recording}
            accessibilityRole="tab"
            accessibilityState={{ selected: step === s, disabled: live.recording }}
            style={[styles.tab, step === s && styles.tabOn]}
          >
            <Text style={[styles.tabNum, step === s && styles.tabTextOn]}>{i + 1}</Text>
            <Text style={[styles.tabText, step === s && styles.tabTextOn]}>{s === "listen" ? "Listen" : s === "practise" ? "Practise" : "Recite"}</Text>
          </Pressable>
        ))}
      </View>

      {step === "listen" && (
        <ListenStep verse={verse} lines={lines} player={player} onNext={() => go("practise")} />
      )}
      {step === "practise" && (
        <PractiseStep verse={verse} lines={lines} player={player} live={live} onNext={() => go("recite")} />
      )}
      {step === "recite" && (
        <ReciteStep
          verse={verse}
          lines={lines}
          player={player}
          live={live}
          onBack={() => navigation.goBack()}
        />
      )}
    </ScrollView>
  );
}

type PlayerApi = ReturnType<typeof useVersePlayer>;
type LiveApi = ReturnType<typeof useLiveRecitation>;

// ── Listen ──────────────────────────────────────────────────────────────

function ListenStep({ verse, lines, player, onNext }: { verse: Shloka; lines: ChantLine[]; player: PlayerApi; onNext: () => void }) {
  const lang = useLang();
  const [roman, setRoman] = useState(false);
  const [x3, setX3] = useState(false);
  const meaning = (lang === "hi" ? verse.translation_hi || verse.translation_en : verse.translation_en || verse.translation_hi) || "";
  const iastLines = (verse.iast ?? "").split(/\n|(?<=\|\|?)\s*/).map((s) => s.trim()).filter(Boolean);
  return (
    <View style={styles.block}>
      <View style={styles.verseCard}>
        {lines.map((ln) => {
          const on = player.line === ln.i;
          return (
            <Pressable
              key={ln.i}
              onPress={() => (on ? player.stop() : void player.playLine(ln.i))}
              disabled={!player.available}
              accessibilityRole="button"
              accessibilityLabel={`${on ? "Stop" : "Play"} line ${ln.i + 1}`}
              accessibilityState={{ selected: on }}
              style={[styles.lineRow, on && styles.lineOn]}
            >
              <Text style={[sa(22), { color: T.ink }]}>{ln.text}</Text>
            </Pressable>
          );
        })}
        {roman && !!verse.iast && (
          <Text style={styles.roman}>{iastLines.join("\n") || verse.iast}</Text>
        )}
        {!!meaning && <Text style={styles.meaning}>{plain(meaning)}</Text>}
      </View>
      {player.available ? (
        <>
          <Text style={styles.small}>Tap a line to hear just that line.</Text>
          <View style={styles.row}>
            <Pressable
              onPress={() => (player.playing ? player.stop() : void player.playVerse(x3 ? 3 : 1))}
              accessibilityRole="button"
              accessibilityLabel={player.playing ? "Stop" : x3 ? "Play each line three times" : "Play the verse"}
              style={[styles.primary, { flex: 1 }]}
            >
              <Text style={styles.primaryText}>{player.playing ? "Stop" : x3 ? "Play each line ×3" : "Play the verse"}</Text>
            </Pressable>
          </View>
          <Toggle label="Each line three times" value={x3} onChange={(v) => { player.stop(); setX3(v); }} />
          <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Speed">
            <Text style={styles.chipsLabel}>Speed</Text>
            {[0.75, 1, 1.25].map((s) => (
              <Pressable accessibilityLabel={`Speed ${s} times`}
                key={s}
                onPress={() => player.setSpeed(s)}
                accessibilityRole="radio"
                accessibilityState={{ checked: player.speed === s }}
                style={[styles.chip, player.speed === s && styles.chipOn]}
              >
                <Text style={[styles.chipText, player.speed === s && styles.chipTextOn]}>{s}×</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : (
        <Text style={styles.small}>No chant recording for this verse yet. You can still practise and recite it.</Text>
      )}
      {!!verse.iast && <Toggle label="Show Roman letters" value={roman} onChange={setRoman} />}
      <Pressable accessibilityLabel="Next: practise" onPress={onNext} accessibilityRole="button" style={styles.secondary}>
        <Text style={styles.secondaryText}>Next: practise →</Text>
      </Pressable>
    </View>
  );
}

// ── Practise ────────────────────────────────────────────────────────────

function PractiseStep({ verse, lines, player, live, onNext }: {
  verse: Shloka; lines: ChantLine[]; player: PlayerApi; live: LiveApi; onNext: () => void;
}) {
  const reduced = useReducedMotion();
  const [unit, setUnit] = useState(0); // line index, or -1 for the whole verse
  const [vis, setVis] = useState(0);
  const [phase, setPhase] = useState<"ready" | "countdown" | "recording" | "scoring" | "result">("ready");
  const [count, setCount] = useState(3);
  const [result, setResult] = useState<ReciteResult | null>(null);
  const [mine, setMine] = useState<string | null>(null);
  const [error, setError] = useState("");
  const cancelled = useRef(false);

  useEffect(() => () => { cancelled.current = true; }, []);
  useEffect(() => () => { if (mine) void FileSystem.deleteAsync(mine, { idempotent: true }).catch(() => {}); }, [mine]);

  const shown = unit < 0 ? lines : lines.filter((l) => l.i === unit);
  const expected = shown.map((l) => l.text);

  const begin = async () => {
    setError("");
    setResult(null);
    player.stop();
    if (!(await live.preflight())) {
      setError("Allow the microphone in your phone's Settings to record.");
      return;
    }
    setPhase("countdown");
    for (let n = 3; n >= 1; n--) {
      if (cancelled.current) return;
      setCount(n);
      haptics.tap();
      void playCue("tick");
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, reduced ? 600 : 1000));
    }
    const ok = await live.start();
    if (!ok) {
      setPhase("ready");
      setError("The microphone did not start. Close other apps using it and try again.");
      return;
    }
    setPhase("recording");
  };

  const finish = async () => {
    if (phase !== "recording") return;
    setPhase("scoring");
    haptics.press();
    const { uri } = await live.stop();
    if (!uri) {
      setPhase("ready");
      setError("Nothing was recorded. Try again.");
      return;
    }
    setMine(uri);
    try {
      const res = await uploadRecite(uri, {
        verseUid: verse.verse_uid ?? verse.id,
        unit: unit < 0 ? "verse" : `line:${unit}`,
        purpose: "practise",
        hideLevel: vis,
      });
      setResult(res);
      setPhase("result");
    } catch (e) {
      setError(errorText(e));
      setPhase("ready");
    }
  };

  const busy = phase !== "ready" && phase !== "result";
  const visNote = VISIBILITY.find((v) => v.level === vis)?.note ?? "";

  return (
    <View style={styles.block}>
      <Text style={styles.label}>WHAT TO PRACTISE</Text>
      <View style={styles.chips}>
        {lines.map((l) => (
          <Pressable accessibilityLabel={`Practise line ${l.i + 1}`} key={l.i} disabled={busy} onPress={() => { setUnit(l.i); setResult(null); }}
            accessibilityRole="radio" accessibilityState={{ checked: unit === l.i, disabled: busy }}
            style={[styles.chip, unit === l.i && styles.chipOn]}>
            <Text style={[styles.chipText, unit === l.i && styles.chipTextOn]}>Line {l.i + 1}</Text>
          </Pressable>
        ))}
        <Pressable accessibilityLabel="Practise the whole verse" disabled={busy} onPress={() => { setUnit(-1); setResult(null); }}
          accessibilityRole="radio" accessibilityState={{ checked: unit === -1, disabled: busy }}
          style={[styles.chip, unit === -1 && styles.chipOn]}>
          <Text style={[styles.chipText, unit === -1 && styles.chipTextOn]}>Whole verse</Text>
        </Pressable>
      </View>

      <Text style={styles.label}>TEXT</Text>
      <View style={styles.segment} accessibilityRole="radiogroup" accessibilityLabel="How much text to show">
        {VISIBILITY.map((v) => (
          <Pressable accessibilityLabel={`Text: ${v.label}`} key={v.level} disabled={busy} onPress={() => setVis(v.level)}
            accessibilityRole="radio" accessibilityState={{ checked: vis === v.level, disabled: busy }}
            style={[styles.segBtn, vis === v.level && styles.segOn]}>
            <Text style={[styles.segText, vis === v.level && styles.segTextOn]}>{v.label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.small}>{visNote}</Text>

      <View style={[styles.verseCard, { minHeight: 96 }]}>
        {vis >= 3 ? (
          <Text style={styles.hiddenNote}>Hidden — {shown.length === 1 ? "one line" : `${shown.length} lines`}</Text>
        ) : (
          shown.map((l) => (
            <Text key={l.i} style={[sa(22), { color: T.ink }]}>{mask(l.text, vis)}</Text>
          ))
        )}
      </View>

      {phase === "ready" || phase === "result" ? (
        <View style={styles.row}>
          {player.available && (
            <Pressable accessibilityLabel={player.playing ? "Stop" : unit < 0 ? "Listen to the verse" : "Listen to the line"}
              onPress={() => (player.playing ? player.stop() : unit < 0 ? void player.playVerse(1) : void player.playLine(unit))}
              accessibilityRole="button"
              style={[styles.secondary, { flex: 1 }]}
            >
              <Text style={styles.secondaryText}>{player.playing ? "Stop" : unit < 0 ? "Listen to the verse" : "Listen to the line"}</Text>
            </Pressable>
          )}
          <Pressable accessibilityLabel={phase === "result" ? "Record again" : "Record"} onPress={() => void begin()} accessibilityRole="button" style={[styles.primary, { flex: 1 }]}>
            <Text style={styles.primaryText}>{phase === "result" ? "Record again" : "Record"}</Text>
          </Pressable>
        </View>
      ) : null}

      {phase === "countdown" && <Countdown n={count} />}
      {phase === "recording" && (
        <RecordingPanel live={live} onStop={() => void finish()} hint="Recite, then tap anywhere here to stop." />
      )}
      {phase === "scoring" && <Text style={styles.status} accessibilityLiveRegion="polite">Scoring…</Text>}
      {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}

      {phase === "result" && result && (
        <>
          <RecitationResult
            result={result}
            expected={expected}
            onPlayMine={mine ? () => void playClip(mine) : undefined}
            onPlayReference={player.available ? () => (unit < 0 ? void player.playVerse(1) : void player.playLine(unit)) : undefined}
            referenceLabel={unit < 0 ? "Hear the verse" : "Hear the line"}
          />
          <View style={styles.row}>
            {unit >= 0 && unit < lines.length - 1 && (
              <Pressable accessibilityLabel="Next line" onPress={() => { setUnit(unit + 1); setResult(null); setPhase("ready"); }}
                accessibilityRole="button" style={[styles.secondary, { flex: 1 }]}>
                <Text style={styles.secondaryText}>Next line →</Text>
              </Pressable>
            )}
            {(unit < 0 || unit >= lines.length - 1) && (
              <Pressable accessibilityLabel="Next: recite from memory" onPress={onNext} accessibilityRole="button" style={[styles.secondary, { flex: 1 }]}>
                <Text style={styles.secondaryText}>Next: recite from memory →</Text>
              </Pressable>
            )}
          </View>
        </>
      )}
    </View>
  );
}

// ── Recite ──────────────────────────────────────────────────────────────

type RecitePhase = "intro" | "rehearse" | "countdown" | "cue" | "recording" | "scoring" | "result";

function ReciteStep({ verse, lines, player, live, onBack }: {
  verse: Shloka; lines: ChantLine[]; player: PlayerApi; live: LiveApi;
  onBack: () => void;
}) {
  const reduced = useReducedMotion();
  const ranked = false;
  const [eyesWanted, setEyesWanted] = useState(ranked);
  const eyes = ranked || eyesWanted;
  const [faceReady, setFaceReady] = useState(false);
  const [eyesRunning, setEyesRunning] = useState(false);
  const [rehearsed, setRehearsed] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<RecitePhase>("intro");
  const [count, setCount] = useState(3);
  const [result, setResult] = useState<ReciteResult | null>(null);
  const [mine, setMine] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [cueText, setCueText] = useState("");
  const camera = useRef<{ json: string; outcome: EyesOutcome } | null>(null);
  const cameraWait = useRef<((v: { json: string; outcome: EyesOutcome }) => void) | null>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    void AsyncStorage.getItem(REHEARSED_KEY).then((v) => setRehearsed(v === "1")).catch(() => setRehearsed(false));
    return () => { cancelled.current = true; };
  }, []);
  useEffect(() => () => { if (mine) void FileSystem.deleteAsync(mine, { idempotent: true }).catch(() => {}); }, [mine]);

  const onEyesDone = useCallback((json: string, outcome: EyesOutcome) => {
    const v = { json, outcome };
    camera.current = v;
    cameraWait.current?.(v);
    cameraWait.current = null;
  }, []);

  const runSequence = async () => {
    setPhase("countdown");
    for (let n = 3; n >= 1; n--) {
      if (cancelled.current) return;
      setCount(n);
      haptics.tap();
      void playCue("tick");
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, reduced ? 600 : 1000));
    }
    setPhase("cue");
    if (eyes) {
      setCueText("Close your eyes. Begin after the tone.");
      await playCue("close");
      await new Promise((r) => setTimeout(r, SETTLE_MS));
    } else {
      setCueText("Begin after the tone.");
    }
    if (cancelled.current) return;
    await playCue("tone", 1500);
    camera.current = null;
    const ok = await live.start();
    if (!ok) {
      setPhase("intro");
      setError("The microphone did not start. Close other apps using it and try again.");
      return;
    }
    if (eyes) setEyesRunning(true);
    haptics.press();
    setPhase("recording");
  };

  const begin = async () => {
    setError("");
    setResult(null);
    player.stop();
    if (!(await live.preflight())) {
      setError("Allow the microphone in your phone's Settings to record.");
      return;
    }
    if (!rehearsed) {
      setPhase("rehearse");
      return;
    }
    await runSequence();
  };

  const rehearsalTapped = async () => {
    haptics.correct();
    setRehearsed(true);
    void AsyncStorage.setItem(REHEARSED_KEY, "1").catch(() => {});
    setPhase("intro");
  };

  const finish = async () => {
    if (phase !== "recording") return;
    setPhase("scoring");
    // Freeze the scored interval and the eye check first, then the cues.
    const stopping = live.stop();
    let cam: Promise<{ json: string; outcome: EyesOutcome } | null> = Promise.resolve(null);
    if (eyes) {
      cam = new Promise((resolve) => {
        cameraWait.current = resolve;
        setTimeout(() => resolve(camera.current), 1500);
      });
      setEyesRunning(false);
    }
    const { uri } = await stopping;
    haptics.correct();
    void playCue(eyes ? "done" : "tone", 4000);
    const camResult = await cam;
    if (!uri) {
      setPhase("intro");
      setError("Nothing was recorded. Try again.");
      return;
    }
    setMine(uri);
    try {
      const res = await uploadRecite(uri, { verseUid: verse.verse_uid ?? verse.id, unit: "verse", purpose: "recite", hideLevel: 3 });
      setResult(res);
      setPhase("result");
      if (!ranked && eyes && camResult && camResult.outcome !== "closed") {
        setError(camResult.outcome === "nosee" ? "The camera could not see your face for most of it." : "Your eyes opened during the recitation.");
      }
    } catch (e) {
      setError(errorText(e));
      setPhase("intro");
    }
  };

  const canStart = !eyes || faceReady;

  if (phase === "rehearse") {
    return (
      <View style={styles.block}>
        <Text style={styles.h2}>First, practise stopping</Text>
        <Text style={styles.body}>
          With your eyes closed you will not see a button. To finish, tap anywhere in the big box. Try it now.
        </Text>
        <Pressable onPress={() => void rehearsalTapped()} accessibilityRole="button"
          accessibilityLabel="Rehearsal: tap anywhere here to stop" style={styles.stopArea}>
          <Text style={styles.stopAreaText}>Tap anywhere here</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.block}>
      {phase === "intro" && (
        <>
          <Text style={styles.h2}>{ranked ? "Competition recitation" : "Recite from memory"}</Text>
          <View style={styles.steps}>
            {[
              "The text stays hidden while you recite.",
              ...(eyes ? ["Prop the phone so the front camera sees your face."] : []),
              "Tap Start. After 3, 2, 1" + (eyes ? " you will hear “Close your eyes; begin after the tone”." : " a tone sounds."),
              "Recite the whole verse after the tone.",
              "To finish, tap anywhere in the big box (or the Stop button).",
            ].map((t, i) => (
              <Text key={i} style={styles.body}>{i + 1}. {t}</Text>
            ))}
          </View>
          {!ranked && (
            <Toggle label="Eyes-closed check (camera stays on this phone)" value={eyesWanted} onChange={setEyesWanted} />
          )}
        </>
      )}

      {/* Mounted through scoring: stopping flips `running`, and the summary
          comes back from the camera component after that. */}
      {eyes && phase !== "result" && (
        <EyesClosedTest running={eyesRunning} onReady={setFaceReady} onDone={onEyesDone} />
      )}

      {phase === "intro" && (
        <Pressable accessibilityLabel={canStart ? "Start" : "Waiting for your face in the camera"} onPress={() => void begin()} disabled={!canStart || rehearsed === null}
          accessibilityRole="button" accessibilityState={{ disabled: !canStart }}
          style={[styles.primary, !canStart && styles.disabled]}>
          <Text style={styles.primaryText}>{canStart ? "Start" : "Waiting for your face in the camera"}</Text>
        </Pressable>
      )}

      {phase === "countdown" && <Countdown n={count} />}
      {phase === "cue" && <Text style={styles.cue} accessibilityRole="alert">{cueText}</Text>}
      {phase === "recording" && (
        <RecordingPanel live={live} onStop={() => void finish()} hint="Tap anywhere here to finish" big />
      )}
      {phase === "scoring" && (
        <Text style={styles.status} accessibilityLiveRegion="polite">
          {eyes ? "Finished. You can open your eyes. Scoring…" : "Scoring…"}
        </Text>
      )}
      {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}

      {phase === "result" && result && (
        <>
          <RecitationResult
            result={result}
            expected={lines.map((l) => l.text)}
            onPlayMine={mine ? () => void playClip(mine) : undefined}
            onPlayReference={player.available ? () => void player.playVerse(1) : undefined}
          />
          <View style={styles.row}>
            <Pressable accessibilityLabel="Try again" onPress={() => { setResult(null); setError(""); setPhase("intro"); }}
              accessibilityRole="button" style={[styles.secondary, { flex: 1 }]}>
              <Text style={styles.secondaryText}>Try again</Text>
            </Pressable>
            </View>
        </>
      )}
    </View>
  );
}

// ── Shared pieces ───────────────────────────────────────────────────────

function Countdown({ n }: { n: number }) {
  return (
    <View style={styles.countBox} accessible accessibilityRole="alert" accessibilityLabel={`Starting in ${n}`}>
      <Text style={styles.countNum}>{n}</Text>
    </View>
  );
}

function RecordingPanel({ live, onStop, hint, big }: { live: LiveApi; onStop: () => void; hint: string; big?: boolean }) {
  const cap = live.captionState;
  return (
    <View style={styles.block}>
      <Pressable onPress={onStop} accessibilityLabel="Recording. Tap anywhere here to finish" accessibilityRole="button"
        style={[styles.stopArea, big && { minHeight: 340 }]}>
        <View style={styles.recRow}>
          <View style={styles.recDot} />
          <Text style={styles.recText}>Recording · {live.seconds} s</Text>
        </View>
        <View style={styles.meter}>
          <View style={[styles.meterFill, { width: `${Math.round(Math.min(1, live.level * 1.6) * 100)}%` }]} />
        </View>
        <Text style={styles.stopAreaText}>{hint}</Text>
        {cap !== "off" && (
          <View style={styles.captionBox}>
            <Text style={styles.captionLabel}>
              {cap === "live" ? "ROUGH LIVE TRANSCRIPT — NOT YOUR SCORE" : cap === "connecting" ? "CONNECTING LIVE TRANSCRIPT…" : "LIVE TRANSCRIPT UNAVAILABLE — RECORDING CONTINUES"}
            </Text>
            {!!live.captions && <Text style={[sa(16), { color: "#E8DCC8" }]} numberOfLines={4}>{live.captions}</Text>}
          </View>
        )}
      </Pressable>
      <Pressable onPress={onStop} accessibilityRole="button" accessibilityLabel="Stop recording" style={styles.stopBtn}>
        <Text style={styles.primaryText}>Stop</Text>
      </Pressable>
    </View>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable onPress={() => onChange(!value)} accessibilityRole="switch" accessibilityState={{ checked: value }}
      accessibilityLabel={label} style={styles.toggle}>
      <View style={[styles.box, value && styles.boxOn]}>{value && <Text style={styles.tick}>✓</Text>}</View>
      <Text style={styles.toggleText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, paddingBottom: 120, gap: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: T.paper, padding: 24 },
  ref: { ...ui("semibold"), fontSize: 14, color: T.ink2 },
  banner: { ...ui("medium"), fontSize: 14, lineHeight: 20, color: T.ink, padding: 10, backgroundColor: T.surface, borderLeftWidth: 3, borderLeftColor: T.action },
  tabs: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: T.line },
  tab: { flex: 1, minHeight: 48, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", borderBottomWidth: 3, borderBottomColor: "transparent", marginBottom: -1 },
  tabOn: { borderBottomColor: T.action },
  tabNum: { ...ui("bold"), fontSize: 13, color: T.ink3 },
  tabText: { ...ui("medium"), fontSize: 16, color: T.ink3 },
  tabTextOn: { ...ui("semibold"), color: T.ink },
  block: { gap: 10 },
  h2: { ...ui("bold"), fontSize: 20, color: T.ink },
  body: { ...ui("regular"), fontSize: 15, lineHeight: 22, color: T.ink },
  small: { ...ui("regular"), fontSize: 13, lineHeight: 19, color: T.ink2 },
  label: { ...ui("bold"), fontSize: 12, letterSpacing: 1.2, color: T.ink3, marginTop: 4 },
  verseCard: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.line, padding: 12, gap: 4 },
  lineRow: { minHeight: 48, justifyContent: "center", paddingHorizontal: 8, borderLeftWidth: 3, borderLeftColor: "transparent" },
  lineOn: { borderLeftColor: T.action, backgroundColor: "#FBEFE3" },
  roman: { ...ui("regular"), fontSize: 15, lineHeight: 22, fontStyle: "italic", color: T.ink2, marginTop: 6 },
  meaning: { ...ui("regular"), fontSize: 15, lineHeight: 22, color: T.ink2, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: T.line },
  hiddenNote: { ...ui("medium"), fontSize: 15, color: T.ink3, textAlign: "center", paddingVertical: 24 },
  row: { flexDirection: "row", gap: 8 },
  primary: { minHeight: 52, alignItems: "center", justifyContent: "center", backgroundColor: T.action, paddingHorizontal: 16 },
  primaryText: { ...ui("bold"), fontSize: 16, color: T.white },
  secondary: { minHeight: 52, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: T.ink, paddingHorizontal: 12 },
  secondaryText: { ...ui("semibold"), fontSize: 15, color: T.ink, textAlign: "center" },
  disabled: { backgroundColor: T.muted },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  chipsLabel: { ...ui("semibold"), fontSize: 14, color: T.ink2, marginRight: 4 },
  chip: { minHeight: 44, minWidth: 52, paddingHorizontal: 12, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: T.lineStrong },
  chipOn: { borderColor: T.ink, backgroundColor: T.ink },
  chipText: { ...ui("semibold"), fontSize: 14, color: T.ink },
  chipTextOn: { color: T.paper },
  segment: { flexDirection: "row", borderWidth: 1.5, borderColor: T.ink },
  segBtn: { flex: 1, minHeight: 46, alignItems: "center", justifyContent: "center" },
  segOn: { backgroundColor: T.ink },
  segText: { ...ui("semibold"), fontSize: 14, color: T.ink },
  segTextOn: { color: T.paper },
  steps: { gap: 4 },
  toggle: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48 },
  box: { width: 24, height: 24, borderWidth: 2, borderColor: T.ink, alignItems: "center", justifyContent: "center" },
  boxOn: { backgroundColor: T.ink },
  tick: { color: T.paper, fontSize: 15, fontWeight: "800" },
  toggleText: { ...ui("medium"), fontSize: 15, color: T.ink, flexShrink: 1 },
  countBox: { minHeight: 200, alignItems: "center", justifyContent: "center", backgroundColor: T.surface, borderWidth: 1, borderColor: T.line },
  countNum: { ...ui("bold"), fontSize: 96, lineHeight: 112, color: T.action, fontVariant: ["tabular-nums"] },
  cue: { ...ui("bold"), fontSize: 22, lineHeight: 30, color: T.ink, textAlign: "center", paddingVertical: 48 },
  stopArea: { minHeight: 240, padding: 16, gap: 12, justifyContent: "center", backgroundColor: "#2A2019" },
  stopAreaText: { ...ui("bold"), fontSize: 20, color: "#FFF8EE", textAlign: "center" },
  recRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  recDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#E5533D" },
  recText: { ...ui("semibold"), fontSize: 15, color: "#FFF8EE", fontVariant: ["tabular-nums"] },
  meter: { height: 6, backgroundColor: "rgba(255,248,238,0.18)" },
  meterFill: { height: 6, backgroundColor: "#F2C879" },
  captionBox: { gap: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: "rgba(255,248,238,0.22)" },
  captionLabel: { ...ui("bold"), fontSize: 11, letterSpacing: 1, color: "#CDBFAA" },
  stopBtn: { minHeight: 52, alignItems: "center", justifyContent: "center", backgroundColor: T.wrong },
  status: { ...ui("semibold"), fontSize: 16, color: T.ink, textAlign: "center", paddingVertical: 16 },
  error: { ...ui("medium"), fontSize: 15, lineHeight: 21, color: T.wrongInk },
  verdict: { padding: 12, gap: 4, borderLeftWidth: 4 },
  verdictOk: { backgroundColor: T.doneBg, borderLeftColor: T.done },
  verdictNo: { backgroundColor: T.wrongBg, borderLeftColor: T.wrong },
  verdictTitle: { ...ui("bold"), fontSize: 16, color: T.ink },
});
