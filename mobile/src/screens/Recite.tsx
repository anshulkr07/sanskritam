// Recite: Learn screen with Listen, Practise, Recite steps.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAudioRecorder, RecordingPresets } from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { RootStackParamList } from "../navigation/types";
import { ApiError, api, uploadCompetitionAttempt, uploadRecite, type ReciteResult, type Shloka } from "../api/client";
import { playClip, preloadClip } from "../services/speech";
import { useQuery } from "../hooks/useQuery";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { haptics } from "../services/haptics";
import { useTypeScale } from "../hooks/useTypeScale";
import { color, fill, sanskritText } from "../theme";
import { plain } from "../utils/text";
import { mask } from "../recite/hide";
import RecitationResult from "../components/recite/RecitationResult";
import EyesClosedTest from "../components/recite/EyesClosedTest";

type Props = NativeStackScreenProps<RootStackParamList, "Recite">;

const CONSENT_KEY = "shabd.recite.cameraConsent";
const RECENT_KEY = "shabd.recite.recent";

export default function ReciteScreen({ navigation, route }: Props) {
  const { verseUid, competitionId, start } = route.params;
  const reduced = useReducedMotion();
  const { sized } = useTypeScale();
  const { data: verses } = useQuery("reader-verses", api.listShlokas, { ttlMs: 30 * 60_000 });
  const verse: Shloka | undefined = useMemo(
    () => (verses ?? []).find((v) => v.verse_uid === verseUid || v.id === verseUid),
    [verses, verseUid],
  );
  const [step, setStep] = useState<"listen" | "practise" | "recite">(start ?? "listen");
  const [hide, setHide] = useState(0);
  const [lineIdx, setLineIdx] = useState(0);
  const [result, setResult] = useState<ReciteResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [eyesOn, setEyesOn] = useState(false);
  const [cameraJson, setCameraJson] = useState("{}");
  const [consent, setConsent] = useState(false);
  const [lineX3, setLineX3] = useState(false);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    void preloadClip(verse?.chant?.url);
  }, [verse?.chant?.url]);

  const recorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 32000,
    android: { ...RecordingPresets.HIGH_QUALITY.android, outputFormat: "mpeg4", audioEncoder: "aac" },
  });

  useEffect(() => {
    void AsyncStorage.getItem(CONSENT_KEY).then((v) => setConsent(v === "1"));
    void AsyncStorage.getItem(RECENT_KEY).then(async (v) => {
      try {
        const list: string[] = v ? JSON.parse(v) : [];
        const next = [verseUid, ...list.filter((x) => x !== verseUid)].slice(0, 10);
        await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch { /* keep */ }
    });
    // Consent may have been granted in ContestRules after this screen mounted
    // — re-read it every time we return here so the eyes-closed toggle works.
    const sub = navigation.addListener("focus", () => {
      void AsyncStorage.getItem(CONSENT_KEY).then((v) => setConsent(v === "1"));
    });
    return sub;
  }, [navigation, verseUid]);

  const lines = verse?.chant?.lines?.length
    ? verse.chant.lines
    : (verse?.devanagari ?? "").split(/(?<=[।॥])/).map((s) => s.trim()).filter(Boolean)
        .map((text, i) => ({ i, text, kind: "verse" as const, start_ms: 0, end_ms: 0 }));

  const playLine = useCallback(async (i: number) => {
    if (!verse?.chant?.url) return;
    const base = (await import("../config")).BASE_URL;
    const url = verse.chant.url.startsWith("http") ? verse.chant.url : `${base}${verse.chant.url}`;
    const { createAudioPlayer } = await import("expo-audio");
    const p = createAudioPlayer(url);
    const ln = verse.chant.lines[i];
    if (ln) {
      await p.seekTo(ln.start_ms / 1000);
      try { p.setPlaybackRate?.(speed, "high"); } catch { /* keep */ }
      p.play();
      const stopAt = ln.end_ms + 150;
      const sub = p.addListener("playbackStatusUpdate", (st) => {
        if (st.isLoaded && st.currentTime * 1000 >= stopAt) {
          p.pause();
          sub.remove();
        }
      });
    } else {
      p.play();
    }
  }, [verse, speed]);

  const playAll = useCallback(async () => {
    if (!verse?.chant?.url) return;
    if (!lineX3 && verse.chant.lines.length) {
      await playClip(verse.chant.url);
      return;
    }
    for (const ln of verse?.chant?.lines ?? []) {
      for (let k = 0; k < (lineX3 ? 3 : 1); k++) {
        // eslint-disable-next-line no-await-in-loop
        await playLine(ln.i);
        await new Promise((r) => setTimeout(r, reduced ? 50 : 600));
      }
    }
  }, [verse, lineX3, playLine, reduced]);

  // Visible, audible countdown before the mic opens (brief §7): permission
  // preflight happens BEFORE the countdown starts, never halfway through it.
  const [countdown, setCountdown] = useState<number | null>(null);
  const startRec = useCallback(async () => {
    setError("");
    try {
      const { Camera } = await import("expo-camera");
      const perm = await Camera.requestMicrophonePermissionsAsync();
      if (perm.status !== "granted") {
        setError("Allow the microphone in Settings to record.");
        return;
      }
    } catch { /* permission module unavailable: the record call surfaces it */ }
    setCountdown(3);
    haptics.tap();
  }, []);

  useEffect(() => {
    if (countdown == null) return;
    if (countdown === 0) {
      setCountdown(null);
      (async () => {
        setRecording(true);
        setRecSecs(0);
        try {
          await recorder.prepareToRecordAsync();
          recorder.record();
        } catch {
          setRecording(false);
          setError("The microphone did not start. Try again?");
        }
      })();
      return;
    }
    haptics.tap();
    const t = setTimeout(() => setCountdown((c) => (c ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, recorder]);

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setRecSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  const stopAndScore = useCallback(async (unit: string, purpose: string) => {
    setBusy(true);
    try {
      await recorder.stop();
      const uri = recorder.uri;
      setRecording(false);
      if (!uri) {
        setError("No recording. Try again?");
        return;
      }
      setLocalUri(uri);
      const uid = verse?.verse_uid ?? verseUid;
      let res: ReciteResult;
      if (competitionId) {
        res = await uploadCompetitionAttempt(competitionId, uri, {
          verseUid: uid, camera: cameraJson, hidden: hide >= 3 || step === "recite",
        });
      } else {
        res = await uploadRecite(uri, {
          verseUid: uid, unit, purpose, hideLevel: hide,
        });
      }
      setResult(res);
      if (competitionId && res.counted === false) {
        const why: Record<string, string> = {
          unclear: "Unclear recording — not counted for the leaderboard. Try again in a quieter place.",
          text_shown: "Text was shown — not counted. Hide the words fully (or stay on Recite) and try again.",
          no_face: "Face not seen enough — not counted. Prop the phone so the front camera sees you.",
          two_faces: "Two faces seen — not counted. Recite alone in frame.",
          eyes_open: "Your eyes opened — not counted for the leaderboard.",
          old_app: "App is too old for the face check — update, then try again.",
        };
        setError(why[res.why_not ?? ""] ?? (res.why_not ? `Not counted (${res.why_not}).` : "Not counted for the leaderboard."));
      }
    } catch (e) {
      if (e instanceof ApiError && e.message) {
        // Surface the server's own detail: 503 "Scoring is not available yet"
        // vs 503 "Scoring is busy. Try again." are different fixes, and 403 /
        // 409 / 422 competition gates each name their own next step.
        setError(e.message);
      } else if (e instanceof ApiError && e.status === 503) setError("Scoring is busy. Try again.");
      else if (e instanceof ApiError && e.status === 404) setError("Scoring is not available yet");
      else if (e instanceof ApiError && e.status === 429) setError("Daily recitation time used up. Try again tomorrow.");
      else setError("Could not score that. Try again?");
    } finally {
      setBusy(false);
    }
  }, [recorder, verse, verseUid, competitionId, cameraJson, hide, step]);

  useEffect(() => () => {
    if (localUri) void FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!verse) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Learn</Text>
        <Text style={styles.hint}>Verse not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Text style={styles.title} accessibilityRole="header">Learn</Text>
      <Text style={styles.ref}>{verse.source_ref}</Text>
      <View style={styles.switch}>
        {(["listen", "practise", "recite"] as const).map((s) => (
          <Pressable
            key={s}
            onPress={() => { setStep(s); setResult(null); }}
            accessibilityRole="button"
            accessibilityLabel={s}
            accessibilityState={{ selected: step === s }}
            style={[styles.swBtn, step === s && { backgroundColor: fill.ink }]}
          >
            <Text style={[styles.swText, step === s && { color: "#FFF8EE" }]}>{s}</Text>
          </Pressable>
        ))}
      </View>

      {step === "listen" && (
        <View style={styles.block}>
          {verse.chant ? (
            <>
              {lines.map((ln) => (
                <Pressable
                  key={ln.i}
                  onPress={() => void playLine(ln.i)}
                  accessibilityRole="button"
                  accessibilityLabel={`Play line ${ln.i + 1}`}
                  style={styles.lineHit}
                >
                  <Text style={[sanskritText(Math.max(18, sized(22))), { color: color.ink }]}>{ln.text}</Text>
                </Pressable>
              ))}
              <Pressable onPress={() => void playAll()} accessibilityRole="button" accessibilityLabel="Play the whole chant" style={styles.primary}>
                <Text style={styles.primaryText}>Play</Text>
              </Pressable>
              <Pressable
                onPress={() => setLineX3((v) => !v)}
                accessibilityRole="switch"
                accessibilityState={{ checked: lineX3 }}
                accessibilityLabel="Repeat each line three times"
                style={styles.row}
              >
                <Text style={styles.rowText}>Line x3: {lineX3 ? "On" : "Off"}</Text>
              </Pressable>
              <Pressable
                onPress={() => setSpeed((s) => (s === 1 ? 1.25 : s === 1.25 ? 0.75 : 1))}
                accessibilityRole="button"
                accessibilityLabel={`Speed ${speed} times`}
                style={styles.row}
              >
                <Text style={styles.rowText}>Speed: {speed}x</Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.hint}>No chant yet for this verse</Text>
          )}
        </View>
      )}

      {step === "practise" && (
        <View style={styles.block}>
          <Pressable
            onPress={() => setHide((h) => (h + 1) % 4)}
            accessibilityRole="button"
            accessibilityLabel={`Hide words level ${hide}`}
            style={styles.row}
          >
            <Text style={styles.rowText}>Hide words: {hide}</Text>
          </Pressable>
          {/* Whole verse context — tap any line to practise it. */}
          <View style={styles.verseBox} accessible accessibilityLabel={`Whole verse, ${lines.length} lines`}>
            <Text style={styles.verseTitle}>
              Whole verse · practising line {Math.min(lineIdx + 1, lines.length)} of {lines.length}
            </Text>
            {lines.map((ln) => {
              const active = ln.i === lineIdx;
              return (
                <Pressable
                  key={ln.i}
                  onPress={() => { if (!recording) { setLineIdx(ln.i); setResult(null); } }}
                  disabled={recording}
                  accessibilityRole="button"
                  accessibilityLabel={`Practise line ${ln.i + 1}: ${ln.text}`}
                  accessibilityState={{ selected: active }}
                  style={[styles.verseLine, active && styles.verseLineActive]}
                >
                  <Text style={[sanskritText(Math.max(16, sized(18))), styles.verseLineText, active && styles.verseLineTextActive]}>
                    {ln.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.practiceCard}>
            <Text style={styles.practiceLabel}>
              Practising line {Math.min(lineIdx + 1, lines.length)} of {lines.length}
            </Text>
            <Text style={[sanskritText(Math.max(18, sized(22))), { color: color.ink }]}>
              {mask(lines[lineIdx]?.text ?? "", hide)}
            </Text>
          </View>
          <Pressable onPress={() => void playLine(lineIdx)} accessibilityRole="button" accessibilityLabel="Hear this line" style={styles.row}>
            <Text style={styles.rowText}>Hear line</Text>
          </Pressable>
          {countdown != null && (
            <Text style={styles.countdown} accessibilityRole="alert" accessibilityLabel={`Starting in ${countdown}`}>
              {countdown === 0 ? "Go" : countdown}
            </Text>
          )}
          {!recording ? (
            <Pressable onPress={() => void startRec()} accessibilityRole="button" accessibilityLabel="Record this line" style={styles.primary}>
              <Text style={styles.primaryText}>Record</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => void stopAndScore(`line:${lineIdx}`, "practise")}
              accessibilityRole="button"
              accessibilityLabel="Stop and score"
              style={styles.rec}
            >
              <Text style={styles.primaryText}>Stop ({recSecs}s)</Text>
            </Pressable>
          )}
          {result && (
            <RecitationResult
              result={result}
              onPlayMine={() => { if (localUri) void playClip(localUri); }}
              onPlayLine={() => void playLine(lineIdx)}
            />
          )}
          <View style={styles.navRow}>
            <Pressable
              onPress={() => { if (!recording) { setLineIdx((i) => Math.max(i - 1, 0)); setResult(null); } }}
              disabled={recording || lineIdx <= 0}
              accessibilityRole="button"
              accessibilityLabel="Previous line"
              accessibilityState={{ disabled: recording || lineIdx <= 0 }}
              style={[styles.row, styles.navBtn, (recording || lineIdx <= 0) && styles.navDisabled]}
            >
              <Text style={styles.rowText}>Prev line</Text>
            </Pressable>
            <Pressable
              onPress={() => { if (!recording) { setLineIdx((i) => Math.min(i + 1, lines.length - 1)); setResult(null); } }}
              disabled={recording || lineIdx >= lines.length - 1}
              accessibilityRole="button"
              accessibilityLabel="Next line"
              accessibilityState={{ disabled: recording || lineIdx >= lines.length - 1 }}
              style={[styles.row, styles.navBtn, (recording || lineIdx >= lines.length - 1) && styles.navDisabled]}
            >
              <Text style={styles.rowText}>Next line</Text>
            </Pressable>
          </View>
        </View>
      )}

      {step === "recite" && (
        <View style={styles.block}>
          <Text style={styles.hint}>Recite from memory. {lines.length} lines.</Text>
          {competitionId || eyesOn ? (
            <EyesClosedTest
              onDone={(json, outcome) => {
                setCameraJson(json);
                if (outcome !== "closed") {
                  setError(outcome === "nosee" ? "Face not seen. Prop the phone so the camera sees you." : "Your eyes opened. This try is not counted for the leaderboard");
                }
              }}
            />
          ) : null}
          <Pressable
            onPress={() => {
              if (!consent) {
                navigation.navigate("ContestRules" as never);
                return;
              }
              setEyesOn((v) => !v);
            }}
            accessibilityRole="switch"
            accessibilityState={{ checked: eyesOn }}
            accessibilityLabel="Eyes closed test"
            style={styles.row}
          >
            <Text style={styles.rowText}>Eyes-closed test: {eyesOn ? "On" : "Off"}</Text>
          </Pressable>
          {countdown != null && (
            <Text style={styles.countdown} accessibilityRole="alert" accessibilityLabel={`Starting in ${countdown}`}>
              {countdown === 0 ? "Go" : countdown}
            </Text>
          )}
          {!recording ? (
            <Pressable onPress={() => void startRec()} accessibilityRole="button" accessibilityLabel="Record the verse" style={styles.primary}>
              <Text style={styles.primaryText}>Record</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => void stopAndScore("verse", "recite")}
              accessibilityRole="button"
              accessibilityLabel="Stop and score"
              style={styles.rec}
            >
              <Text style={styles.primaryText}>Stop ({recSecs}s)</Text>
            </Pressable>
          )}
          {recording && <Text style={styles.recDot}>Recording</Text>}
          {!!error && <Text style={styles.error}>{plain(error)}</Text>}
          {busy && <Text style={styles.hint}>Scoring</Text>}
          {result && (
            <RecitationResult
              result={result}
              onPlayMine={() => { if (localUri) void playClip(localUri); }}
              onPlayLine={() => void playLine(0)}
            />
          )}
        </View>
      )}
      {!!error && step !== "recite" && <Text style={styles.error}>{plain(error)}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, paddingBottom: 120, gap: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "800", color: color.ink },
  ref: { fontSize: 13, color: color.inkSoft },
  hint: { fontSize: 14, color: color.inkSoft },
  error: { fontSize: 14, color: color.badText },
  switch: { flexDirection: "row", gap: 8 },
  swBtn: { minHeight: 44, paddingHorizontal: 16, justifyContent: "center", borderRadius: 12, borderWidth: 1.5, borderColor: "#D9C9AE" },
  swText: { fontWeight: "700", color: color.ink, textTransform: "capitalize" },
  block: { gap: 8 },
  lineHit: { minHeight: 44, justifyContent: "center" },
  primary: { minHeight: 48, alignItems: "center", justifyContent: "center", backgroundColor: color.saffronBtn, borderRadius: 12 },
  countdown: { textAlign: "center", fontSize: 56, lineHeight: 68, fontWeight: "800", color: color.saffronText, fontVariant: ["tabular-nums"] },
  primaryText: { color: "#fff", fontWeight: "800" },
  row: { minHeight: 44, justifyContent: "center", paddingHorizontal: 12, borderWidth: 1.5, borderColor: "#D9C9AE", borderRadius: 12 },
  rowText: { color: color.ink, fontWeight: "600" },
  rec: { minHeight: 48, alignItems: "center", justifyContent: "center", backgroundColor: fill.bad, borderRadius: 12 },
  recDot: { color: fill.bad, fontWeight: "800" },
  verseBox: { gap: 4, padding: 12, borderWidth: 1.5, borderColor: "#D9C9AE", borderRadius: 12 },
  verseTitle: { fontSize: 13, fontWeight: "700", color: color.inkSoft },
  verseLine: { minHeight: 44, justifyContent: "center", paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, borderWidth: 1.5, borderColor: "transparent" },
  verseLineActive: { borderColor: color.saffronBtn, backgroundColor: "#FFF8EE" },
  verseLineText: { color: color.inkSoft },
  verseLineTextActive: { color: color.ink },
  practiceCard: { gap: 4, padding: 12, borderRadius: 12, backgroundColor: "#FFF8EE", borderWidth: 1.5, borderColor: "#D9C9AE" },
  practiceLabel: { fontSize: 13, fontWeight: "700", color: color.inkSoft },
  navRow: { flexDirection: "row", gap: 8 },
  navBtn: { flex: 1, alignItems: "center" },
  navDisabled: { opacity: 0.45 },
});
