// Varnamala — the alphabet, grouped by place of articulation.
//
// A panel is PINNED above the letters: the animated mouth cross-section, the
// selected letter, its place, and replay / slow / mic. Tapping a letter starts
// the animation and the sound at once, and the panel never scrolls away, so the
// gesture is always in view (it used to render below the grid and had finished
// by the time you scrolled to it).
//
// Below it the letters scroll in teaching order: vowels, then the 5×5 stops
// (rows tinted by place, matching the mouth-map), semivowels, sibilants, and
// anusvāra with visarga.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AppState, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView, useSafeAreaFrame } from "react-native-safe-area-context";

import { api, type VarnamalaChar, type VarnamalaResponse, type PronunciationResult } from "../api/client";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { useAskContext } from "../ask/AskProvider";
import { haptics } from "../services/haptics";
import { playLetter } from "../services/speech";
import { announceVerdict } from "../utils/announce";
import FetchError from "../components/FetchError";
import { useAchievementReveal } from "../hooks/useAchievementReveal";
import AchievementReveal from "../components/AchievementReveal";
import { color, font, radius, script, shadow, space } from "../theme";
import VocalTract from "../components/VocalTract";
import { PLACE_COLORS, PLACE_LABEL, PLACE_ORDER, articulationFor } from "../phonetics";
// expo-audio — import unconditionally; hooks must always be called.
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from "expo-audio";

export { PLACE_COLORS };

const GAP = 8;
const CONTRAST_LABEL: Record<string, string> = {
  retroflex_vs_dental: "retroflex vs dental",
  aspirated_vs_plain: "aspirated vs plain",
  sibilants: "श / ष / स",
  vowel_length: "vowel length",
};

/** The colour of a letter's place ("oshthya_kanthya" for u: the last part). */
function placeColorOf(c: VarnamalaChar): string {
  const key = c.place ? c.place.split("_").pop() : null;
  return (key && PLACE_COLORS[key]) || color.saffron;
}

// ── Main screen ───────────────────────────────────────────────────────

type Props = NativeStackScreenProps<RootStackParamList, "Varnamala">;

export default function VarnamalaScreen({ navigation }: Props) {
  const { width } = useSafeAreaFrame();
  const [grid, setGrid] = useState<VarnamalaResponse | null>(null);
  const [gridFailed, setGridFailed] = useState(false);
  const [speaking, setSpeaking] = useState<string | null>(null);
  const [selectedChar, setSelectedChar] = useState<VarnamalaChar | null>(null);
  // Bumped on every tap; VocalTract replays its gesture on each change.
  const [playToken, setPlayToken] = useState(0);
  const [slow, setSlow] = useState(false);
  // ── Pronunciation attempt (U9-1) ──
  const [recActive, setRecActive] = useState(false);
  const [attempting, setAttempting] = useState(false);
  const [pron, setPron] = useState<PronunciationResult | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const { queue: achQueue, record: recordAch, dismiss: dismissAch } = useAchievementReveal();

  // Always call the hook (React rules). On web it is unused.
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  // The bubble asks about the letter that is selected.
  useAskContext("varnamala", selectedChar?.devanagari ?? "");

  const loadGrid = useCallback(() => {
    setGridFailed(false);
    api.varnamala().then(setGrid).catch(() => setGridFailed(true));
  }, []);

  useEffect(() => {
    loadGrid();
  }, [loadGrid]);

  // Writing is this screen's practice mode: one small button in the header.
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => navigation.navigate("Writing")}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Practise writing the letters"
          style={styles.headerBtn}
        >
          <Ionicons name="create-outline" size={20} color={color.saffronText} />
          <Text style={styles.headerBtnText}>Write</Text>
        </Pressable>
      ),
    });
  }, [navigation]);

  const playChar = useCallback(async (c: VarnamalaChar) => {
    haptics.tap();
    setSpeaking(c.devanagari);
    // The gesture starts on the tap, not when the audio arrives: a clip check
    // or a synthesis round trip sits in front of the sound, and a still
    // diagram for that long reads as a broken tap. It also has to work with no
    // audio at all (offline, or the TTS quota spent).
    setPlayToken((n) => n + 1);
    try {
      await playLetter(c.audio_url, c.devanagari, "sa");
    } catch {
      /* no audio: the diagram still teaches the shape */
    } finally {
      setSpeaking(null);
    }
  }, []);

  const select = useCallback(
    (c: VarnamalaChar) => {
      if (recActive || attempting) return;
      setSelectedChar(c);
      // A new target means the previous verdict no longer applies.
      setPron(null);
      setMicError(null);
      void playChar(c);
    },
    [playChar, recActive, attempting],
  );

  // Never an empty panel: open on the first vowel (animation only, no sound
  // until the learner taps).
  useEffect(() => {
    if (grid && !selectedChar) {
      const first = grid.vowels?.[0];
      if (first) {
        setSelectedChar(first);
        setPlayToken((n) => n + 1);
      }
    }
  }, [grid, selectedChar]);

  const toggleMic = useCallback(async () => {
    if (!selectedChar || attempting) return;

    if (recActive) {
      // Stop, upload, and score. Static state change only, no pulsing ring
      // (Reduce Motion, §9.4).
      setRecActive(false);
      setAttempting(true);
      setMicError(null);
      try {
        await recorder.stop();
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: "doNotMix" });
        // Small delay to let the native side finalize the file.
        await new Promise((r) => setTimeout(r, 300));
        const uri = recorder.uri;
        if (!uri) throw new Error("no recording");
        const res = await api.pronunciationAttempt(
          Platform.OS === "web" ? await (await fetch(uri)).blob() : uri,
          Platform.OS === "web" ? "recording.webm" : "recording.m4a",
          Platform.OS === "web" ? "audio/webm" : "audio/m4a",
          selectedChar.devanagari,
          selectedChar.iast,
        );
        setPron(res);
        // §3.3: unsure is `near`, never `incorrect`; it must never read as failure.
        if (res.verdict === "correct") haptics.correct();
        else if (res.verdict === "unsure") haptics.near();
        else if (res.verdict === "near") haptics.near();
        else haptics.incorrect();
        // U5-1: explicit announcement for VoiceOver.
        announceVerdict(res.verdict === "near" ? "near" : res.verdict);
        // U3-4: every sparśa attempt counts toward sparsha-pancaka.
        recordAch({ type: "pronunciation_attempt", target: selectedChar.devanagari });
      } catch {
        setMicError("Couldn't check that. Try again.");
      } finally {
        setAttempting(false);
      }
    } else {
      haptics.tap();
      try {
        // Ask permission BEFORE the first record, never at mount (U9-1 §2).
        const perm = await requestRecordingPermissionsAsync();
        if (!perm.granted) {
          setMicError("Microphone is off. Allow it in settings.");
          return;
        }
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: "doNotMix" });
        await recorder.prepareToRecordAsync();
        recorder.record();
        setRecActive(true);
        setMicError(null);
      } catch {
        void setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: "doNotMix" });
        setMicError("Couldn't start the microphone. Try again.");
      }
    }
  }, [recActive, attempting, selectedChar, recorder, recordAch]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active" && recorder.isRecording) {
        void recorder.stop().finally(() => setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: "doNotMix" }));
        setRecActive(false);
      }
    });
    return () => {
      sub.remove();
      if (recorder.isRecording) void recorder.stop().finally(() => setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: "doNotMix" }));
    };
  }, [recorder]);

  // All chars, for the "vs" chip.
  const allChars = useMemo(() => {
    if (!grid) return [];
    return [...(grid.vowels ?? []), ...(grid.consonants ?? []), ...(grid.nasals ?? []), ...(grid.others ?? [])];
  }, [grid]);

  // The articulation drives the cross-section. Null for anusvāra/visarga,
  // which have no place and nothing honest to draw.
  const articulation = useMemo(
    () => (selectedChar ? articulationFor(selectedChar) : null),
    [selectedChar],
  );

  // The next letter of the same kind in the same place (क → ख → ग → घ → क),
  // one tap away, for hearing the contrast the mouth-map is about. Same kind
  // matters: a stop compared with a vowel is not a contrast.
  const minimalPair = useMemo(() => {
    if (!selectedChar?.place) return null;
    const family = allChars.filter((c) => c.place === selectedChar.place && c.kind === selectedChar.kind);
    if (family.length < 2) return null;
    const at = family.findIndex((c) => c.devanagari === selectedChar.devanagari);
    return family[(at + 1) % family.length] ?? null;
  }, [selectedChar, allChars]);

  const groups = useMemo(() => {
    const others = grid?.others ?? [];
    return {
      semivowels: others.filter((c) => c.kind === "semivowel"),
      sibilants: others.filter((c) => c.kind === "sibilant" || c.kind === "aspirate"),
      ayogavaha: others.filter((c) => c.kind === "anusvara" || c.kind === "visarga"),
    };
  }, [grid]);

  if (!grid) {
    // U10-3: a failed grid fetch says so and offers retry, never a permanent
    // skeleton, and never confused with an empty alphabet.
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={styles.center}>
          {gridFailed ? (
            <FetchError label="Couldn't load the alphabet." onRetry={loadGrid} />
          ) : (
            <Text style={styles.muted}>Loading…</Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const contentW = width - space.md * 2;
  const tractW = Math.round(contentW * 0.56);
  // 5 columns for the flat groups; the stops grid has its own label column.
  const cellW = Math.floor((contentW - GAP * 4) / 5);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      {/* Pinned: never scrolls away, so the animation is always in view. */}
      <View style={styles.panel}>
        <View style={styles.panelRow}>
          <View style={{ width: tractW }}>
            {selectedChar && articulation ? (
              <VocalTract
                compact
                articulation={articulation}
                char={selectedChar.devanagari}
                iast={selectedChar.iast}
                playToken={playToken}
                slow={slow}
              />
            ) : (
              <View style={styles.noTract}>
                <Text style={styles.muted}>No mouth map for this sound.</Text>
              </View>
            )}
          </View>

          <View style={styles.side}>
            <Text style={[styles.bigLetter, script("bold")]} accessibilityRole="header">
              {selectedChar?.devanagari}
            </Text>
            <Text style={styles.bigIast}>{selectedChar?.iast}</Text>
            {selectedChar?.place && articulation ? (
              <View style={styles.chips}>
                <View style={[styles.placeChip, { backgroundColor: `${PLACE_COLORS[articulation.place]}26` }]}>
                  <View style={[styles.placeDot, { backgroundColor: PLACE_COLORS[articulation.place] }]} />
                  <Text style={styles.placeChipText}>{PLACE_LABEL[articulation.place]?.en}</Text>
                </View>
                {minimalPair ? (
                  <Pressable
                    onPress={() => select(minimalPair)}
                    accessibilityRole="button"
                    accessibilityLabel={`Compare with ${minimalPair.iast}`}
                    style={styles.vsChip}
                  >
                    <Text style={styles.vsText}>vs </Text>
                    <Text style={[styles.vsText, script("bold")]}>{minimalPair.devanagari}</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
            <View style={styles.controls}>
              <RoundBtn
                icon="volume-high"
                label="Play the sound and the mouth"
                onPress={() => selectedChar && select(selectedChar)}
              />
              <RoundBtn
                icon="hourglass-outline"
                label={slow ? "Normal speed" : "Slow motion"}
                on={slow}
                onPress={() => setSlow((s) => !s)}
              />
              <RoundBtn
                icon={attempting ? "hourglass" : recActive ? "stop" : "mic"}
                label={recActive ? "Stop and check" : attempting ? "Checking" : `Say ${selectedChar?.devanagari ?? ""}`}
                on={recActive}
                busy={attempting}
                onPress={toggleMic}
                tone="primary"
              />
            </View>
          </View>
        </View>

        {micError ? <Text style={styles.micError}>{micError}</Text> : null}
        {pron ? <VerdictLine pron={pron} /> : null}
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={{ backgroundColor: color.surface, padding: space.md, borderLeftWidth: 3, borderLeftColor: color.saffron, gap: 6 }}>
          <Text style={{ fontFamily: "Nunito_800ExtraBold", color: color.ink }}>An alphabet organised by sound</Text>
          <Text style={{ fontFamily: "Nunito_600SemiBold", color: color.inkSoft, lineHeight: 22 }}>The five consonant rows move from the back of the mouth to the lips. Within each row, compare breath, voice and nasal airflow. The arrangement reflects how the sounds are made.</Text>
          <Text style={{ fontFamily: "Nunito_700Bold", color: color.ink }}>Throat → palate → curled tongue → teeth → lips</Text>
        </View>
        <SectionHead title="Vowels" sa="स्वराः" />
        <Wrap>
          {(grid.vowels ?? []).map((c) => (
            <LetterCell key={c.devanagari} c={c} w={cellW} selected={selectedChar?.devanagari === c.devanagari} speaking={speaking} onPress={select} />
          ))}
        </Wrap>

        <SectionHead title="Consonants" sa="व्यञ्जनानि" />
        <StopsMatrix
          chars={[...(grid.consonants ?? []), ...(grid.nasals ?? [])]}
          selected={selectedChar?.devanagari ?? null}
          speaking={speaking}
          onPress={select}
        />

        {groups.semivowels.length > 0 && (
          <>
            <SectionHead title="Semivowels" sa="अन्तःस्थाः" />
            <Wrap>
              {groups.semivowels.map((c) => (
                <LetterCell key={c.devanagari} c={c} w={cellW} selected={selectedChar?.devanagari === c.devanagari} speaking={speaking} onPress={select} />
              ))}
            </Wrap>
          </>
        )}

        {groups.sibilants.length > 0 && (
          <>
            <SectionHead title="Sibilants" sa="ऊष्माणः" />
            <Wrap>
              {groups.sibilants.map((c) => (
                <LetterCell key={c.devanagari} c={c} w={cellW} selected={selectedChar?.devanagari === c.devanagari} speaking={speaking} onPress={select} />
              ))}
            </Wrap>
          </>
        )}

        {groups.ayogavaha.length > 0 && (
          <>
            <SectionHead title="Anusvāra and visarga" sa="अयोगवाहाः" />
            <Wrap>
              {groups.ayogavaha.map((c) => (
                <LetterCell key={c.devanagari} c={c} w={cellW} selected={selectedChar?.devanagari === c.devanagari} speaking={speaking} onPress={select} />
              ))}
            </Wrap>
          </>
        )}
      </ScrollView>
      <AchievementReveal queue={achQueue} onDone={dismissAch} />
    </SafeAreaView>
  );
}

// ── Pieces ────────────────────────────────────────────────────────────

function SectionHead({ title, sa }: { title: string; sa: string }) {
  return (
    <View style={styles.sectionHead} accessibilityRole="header">
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={[styles.sectionSa, script("semibold")]}>{sa}</Text>
    </View>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return <View style={styles.wrap}>{children}</View>;
}

function RoundBtn({
  icon,
  label,
  onPress,
  on = false,
  busy = false,
  tone = "neutral",
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
  on?: boolean;
  busy?: boolean;
  tone?: "neutral" | "primary";
}) {
  const primary = tone === "primary";
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: on, busy }}
      style={({ pressed }) => [
        styles.round,
        primary && styles.roundPrimary,
        on && (primary ? styles.roundRecording : styles.roundOn),
        busy && { opacity: 0.6 },
        pressed && { opacity: 0.85 },
      ]}
    >
      <Ionicons name={icon} size={19} color={primary || on ? color.white : color.inkSoft} />
    </Pressable>
  );
}

/** One letter. The tint is its place, so the grid reads as the mouth-map. */
function LetterCell({
  c,
  w,
  selected,
  speaking,
  onPress,
}: {
  c: VarnamalaChar;
  w: number;
  selected: boolean;
  speaking: string | null;
  onPress: (c: VarnamalaChar) => void;
}) {
  const tint = placeColorOf(c);
  return (
    <Pressable
      onPress={() => onPress(c)}
      accessibilityRole="button"
      accessibilityLabel={`${c.devanagari}, ${c.iast}`}
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.cell,
        { width: w, backgroundColor: selected ? tint : `${tint}14`, borderColor: selected ? tint : `${tint}33` },
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text style={[styles.cellDev, script("bold"), selected && { color: color.white }]}>{c.devanagari}</Text>
      <Text style={[styles.cellIast, selected && { color: color.white }]}>{c.iast}</Text>
      {speaking === c.devanagari && (
        <Ionicons name="volume-high" size={11} color={selected ? color.white : tint} style={styles.cellSpeaking} />
      )}
    </Pressable>
  );
}

// The traditional 5×5: rows are the place (throat to lips), columns are how it
// is made. The nasal completes each row, so it arrives here from the API's
// separate list.
const COLUMNS = ["Unvoiced", "Aspirated", "Voiced", "Voiced aspirated", "Nasal"];

function StopsMatrix({
  chars,
  selected,
  speaking,
  onPress,
}: {
  chars: VarnamalaChar[];
  selected: string | null;
  speaking: string | null;
  onPress: (c: VarnamalaChar) => void;
}) {
  const stops = useMemo(() => chars.filter((c) => c.place && (c.kind === "consonant" || c.kind === "nasal")), [chars]);
  return (
    <View style={styles.matrix}>
      <View style={styles.matrixRow}>
        <View style={styles.matrixCorner} />
        {COLUMNS.map((h) => (
          <Text key={h} style={styles.matrixHeader} numberOfLines={2}>
            {h}
          </Text>
        ))}
      </View>
      {PLACE_ORDER.map((place) => {
        const inPlace = stops.filter((c) => c.place === place);
        const row = [
          ...inPlace.filter((c) => c.kind === "consonant").slice(0, 4),
          ...inPlace.filter((c) => c.kind === "nasal").slice(0, 1),
        ];
        if (row.length === 0) return null;
        return (
          <View key={place} style={styles.matrixRow}>
            <View style={[styles.matrixLabel, { backgroundColor: PLACE_COLORS[place] }]}>
              <Text style={[styles.matrixLabelSa, script("bold")]}>{PLACE_LABEL[place]?.sa ?? place}</Text>
              <Text style={styles.matrixLabelEn}>{PLACE_LABEL[place]?.en ?? ""}</Text>
            </View>
            {row.map((c) => (
              <StopCell key={c.devanagari} c={c} selected={selected === c.devanagari} speaking={speaking} onPress={onPress} />
            ))}
          </View>
        );
      })}
    </View>
  );
}

function StopCell({
  c,
  selected,
  speaking,
  onPress,
}: {
  c: VarnamalaChar;
  selected: boolean;
  speaking: string | null;
  onPress: (c: VarnamalaChar) => void;
}) {
  const tint = placeColorOf(c);
  return (
    <Pressable
      onPress={() => onPress(c)}
      accessibilityRole="button"
      accessibilityLabel={`${c.devanagari}, ${c.iast}`}
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.stopCell,
        { backgroundColor: selected ? tint : `${tint}14`, borderColor: selected ? tint : `${tint}33` },
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text style={[styles.cellDev, script("bold"), selected && { color: color.white }]}>{c.devanagari}</Text>
      <Text style={[styles.cellIast, selected && { color: color.white }]}>{c.iast}</Text>
      {speaking === c.devanagari && (
        <Ionicons name="volume-high" size={10} color={selected ? color.white : tint} style={styles.cellSpeaking} />
      )}
    </Pressable>
  );
}

// The verdict obeys §3.3 absolutely: `unsure`/`abstained` is violet
// (color.unsure / color.unsureBg), never red, never a failure, and costs the
// learner nothing. `incorrect` is a genuine miss, so red is appropriate there.
function VerdictLine({ pron }: { pron: PronunciationResult }) {
  const unsure = pron.verdict === "unsure" || pron.abstained;
  let bg: string = color.unsureBg;
  let fg: string = color.unsureText;
  let text = "Couldn't hear that clearly. Try again.";
  if (!unsure) {
    if (pron.verdict === "correct") {
      bg = color.okBg;
      fg = color.okText;
      text = "साधु! Well done.";
    } else if (pron.verdict === "near") {
      bg = color.warnBg;
      fg = color.warnText;
      text = "So close. Try once more.";
    } else {
      bg = color.badBg;
      fg = color.badText;
      text = "Not yet. Listen again and retry.";
    }
  }
  const focus = !unsure && pron.contrast ? CONTRAST_LABEL[pron.contrast] ?? pron.contrast : null;
  return (
    <View style={[styles.verdict, { backgroundColor: bg }]} accessible accessibilityRole="alert" accessibilityLabel={focus ? `${text} Focus: ${focus}` : text}>
      <Text style={[styles.verdictText, { color: fg }]}>{text}</Text>
      {focus ? <Text style={[styles.verdictFocus, { color: fg }]}>Focus: {focus}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  muted: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.sm, color: color.inkSoft, textAlign: "center" },
  headerBtn: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 44, paddingHorizontal: space.xs },
  headerBtnText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm, color: color.saffronText },
  // ── pinned panel ──
  panel: {
    backgroundColor: color.surface,
    paddingHorizontal: space.md,
    paddingTop: space.xs,
    paddingBottom: space.sm,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    ...shadow.card,
  },
  panelRow: { flexDirection: "row", gap: space.sm },
  noTract: { aspectRatio: 300 / 260, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: color.surfaceMuted, padding: space.sm },
  side: { flex: 1, alignItems: "flex-start" },
  bigLetter: { fontSize: 48, lineHeight: 70, color: color.ink },
  bigIast: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.md, color: color.inkSoft, marginTop: -6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: space.xs },
  placeChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill },
  placeDot: { width: 8, height: 8, borderRadius: 4 },
  placeChipText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 11, color: color.ink },
  vsChip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },
  vsText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 11, color: color.inkSoft },
  controls: { flexDirection: "row", gap: space.xs, marginTop: space.sm },
  round: { width: 40, height: 40, borderRadius: 20, backgroundColor: color.surfaceMuted, alignItems: "center", justifyContent: "center" },
  roundPrimary: { backgroundColor: color.saffronBtn },
  roundOn: { backgroundColor: color.ink },
  roundRecording: { backgroundColor: color.ink },
  micError: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.sm, color: color.badText, marginTop: space.xs },
  verdict: { borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: space.xs, marginTop: space.xs },
  verdictText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm },
  verdictFocus: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.xs, marginTop: 1 },
  // ── letters ──
  body: { padding: space.md, paddingBottom: 120 },
  sectionHead: { flexDirection: "row", alignItems: "baseline", gap: space.xs, marginTop: space.md, marginBottom: space.xs },
  sectionTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.md, color: color.ink },
  sectionSa: { fontSize: font.sizes.sm, color: color.inkSoft },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: GAP },
  cell: { minHeight: 56, borderRadius: radius.md, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingVertical: 4 },
  cellDev: { fontSize: 24, lineHeight: 34, color: color.ink },
  cellIast: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 11, color: color.inkSoft, marginTop: -2 },
  cellSpeaking: { position: "absolute", top: 4, right: 5 },
  // ── the 5×5 ──
  matrix: { gap: 4 },
  matrixRow: { flexDirection: "row", gap: 4, alignItems: "stretch" },
  matrixCorner: { width: 64 },
  matrixHeader: { flex: 1, fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 10, lineHeight: 12, color: color.inkSoft, textAlign: "center", alignSelf: "flex-end" },
  matrixLabel: { width: 64, alignItems: "center", justifyContent: "center", borderRadius: radius.sm, paddingVertical: 4 },
  matrixLabelSa: { fontSize: font.sizes.sm, lineHeight: 20, color: color.white },
  matrixLabelEn: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 10, color: color.white },
  stopCell: { flex: 1, minHeight: 52, borderRadius: radius.sm, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingVertical: 2 },
});
