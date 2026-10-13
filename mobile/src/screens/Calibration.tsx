// Calibration (dev builds): collect the consented, labelled recordings that
// freeze the recitation rubric v2 thresholds (brief §8). Not part of learner
// play — reachable from Settings on __DEV__ only. Each take: one prompt, one
// label, recorded and uploaded with speaker/device tags.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAudioRecorder, RecordingPresets } from "expo-audio";

import { request } from "../api/client";
import { uploadCalibration } from "../api/uploadCalibration";
import { GameTopBar } from "../games/v2/parts";
import { color, fill, font, onFill, radius, space } from "../theme";
import { haptics } from "../services/haptics";

type Props = { navigation: { goBack: () => void } };

interface PromptSet {
  prompts: { id: string; text: string; source: string }[];
  labels: { key: string; guide: string }[];
  target_count: number;
  target_speakers: number;
}

const LABEL_TINT: Record<string, string> = {
  clean: fill.sage, slow: fill.teal, pauses: fill.gold,
  scrambled: fill.rose, noisy: fill.slate, other: fill.maroon,
};

export default function CalibrationScreen({ navigation }: Props) {
  const [set, setSet] = useState<PromptSet | null>(null);
  const [promptIdx, setPromptIdx] = useState(0);
  const [label, setLabel] = useState("clean");
  const [speaker, setSpeaker] = useState("");
  const [device, setDevice] = useState("");
  const [consent, setConsent] = useState(false);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  useEffect(() => {
    request<PromptSet>("/recite-calibration/prompts").then(setSet).catch(
      () => setMsg("Couldn't load the prompt set — is the backend reachable?"));
  }, []);

  const prompt = set?.prompts[promptIdx];

  const start = useCallback(async () => {
    if (!consent || !speaker.trim()) {
      setMsg("Name the speaker and tick consent first.");
      return;
    }
    setMsg(null);
    try {
      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecording(true);
      haptics.tap();
    } catch {
      setMsg("The microphone did not start.");
    }
  }, [consent, recorder, speaker]);

  const stop = useCallback(async () => {
    if (!recording || !prompt) return;
    setBusy(true);
    try {
      await recorder.stop();
      const uri = recorder.uri;
      setRecording(false);
      if (!uri) throw new Error("no recording");
      await uploadCalibration(uri, {
        prompt_id: prompt.id, label, speaker_alias: speaker.trim(),
        device: device.trim() || "phone", consent,
      });
      haptics.correct();
      setDone((n) => n + 1);
      setPromptIdx((i) => (set && i + 1 < set.prompts.length ? i + 1 : 0));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Upload failed — try again.");
      setRecording(false);
    } finally {
      setBusy(false);
    }
  }, [consent, device, label, prompt, recorder, recording, set, speaker]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <GameTopBar title="Calibration" sa="श्रुति-संग्रहः" onClose={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.note}>
          Recitation-rubric study captures. Takes are private, labelled, and used
          only to calibrate scoring — never for ranking.
        </Text>
        {!set ? <ActivityIndicator color={color.saffron} style={{ marginTop: space.xl }} /> : (
          <>
            <View style={styles.fields}>
              <TextInput value={speaker} onChangeText={setSpeaker} placeholder="Speaker alias (e.g. spk-01)"
                placeholderTextColor={color.inkFaint} style={styles.input} accessibilityLabel="Speaker alias" />
              <TextInput value={device} onChangeText={setDevice} placeholder="Device (e.g. pixel-7)"
                placeholderTextColor={color.inkFaint} style={styles.input} accessibilityLabel="Device" />
            </View>
            <Pressable onPress={() => { haptics.tap(); setConsent(!consent); }} accessibilityRole="checkbox"
              accessibilityState={{ checked: consent }} style={styles.consentRow}>
              <Ionicons name={consent ? "checkbox" : "square-outline"} size={22} color={color.ink} />
              <Text style={styles.consentText}>
                The speaker consents to this recording being used for scoring calibration.
              </Text>
            </Pressable>

            <Text style={styles.promptLabel}>Prompt {promptIdx + 1}/{set.prompts.length}</Text>
            <View style={styles.promptCard}>
              <Text style={[styles.promptText, { fontFamily: "NotoSansDevanagari_700Bold" }]}>{prompt?.text}</Text>
              <Text style={styles.promptSource}>{prompt?.source}</Text>
            </View>

            <Text style={styles.promptLabel}>Label this take</Text>
            <View style={styles.labelWrap}>
              {set.labels.map((l) => (
                <Pressable key={l.key} onPress={() => { haptics.tap(); setLabel(l.key); }}
                  accessibilityRole="button" accessibilityLabel={l.key}
                  accessibilityState={{ selected: label === l.key }}
                  style={[styles.labelChip, { backgroundColor: LABEL_TINT[l.key] }, label === l.key && styles.labelChipOn]}>
                  <Text style={styles.labelChipText}>{l.key}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.guide}>{set.labels.find((l) => l.key === label)?.guide}</Text>

            <Pressable onPress={() => void (recording ? stop() : start())} disabled={busy}
              accessibilityRole="button" accessibilityLabel={recording ? "Stop and upload" : "Record"}
              style={[styles.primary, recording && styles.stop]}>
              {busy ? <ActivityIndicator color={onFill.text} /> : (
                <Ionicons name={recording ? "stop" : "mic"} size={22} color={onFill.text} />
              )}
              <Text style={styles.primaryText}>
                {recording ? "Stop & upload" : "Record take"}
              </Text>
            </Pressable>
            <Text style={styles.progress}>{done} takes uploaded this session (study target: {set.target_count}+ from {set.target_speakers}+ speakers)</Text>
            {!!msg && <Text style={styles.msg} accessibilityRole="alert">{msg}</Text>}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  body: { padding: space.lg, gap: space.md },
  note: { color: color.inkSoft, fontSize: font.sizes.sm, lineHeight: 21 },
  fields: { flexDirection: "row", gap: space.sm },
  input: {
    flex: 1, borderWidth: 1.5, borderColor: color.border, borderRadius: radius.md,
    minHeight: 48, paddingHorizontal: space.md, color: color.ink, backgroundColor: color.surface,
  },
  consentRow: { flexDirection: "row", gap: space.sm, alignItems: "center" },
  consentText: { flex: 1, color: color.ink, fontSize: font.sizes.sm },
  promptLabel: { fontWeight: "800", color: color.inkSoft, fontSize: font.sizes.xs, textTransform: "uppercase" },
  promptCard: { backgroundColor: color.surface, borderRadius: radius.lg, padding: space.md, gap: 4, alignItems: "center" },
  promptText: { fontSize: 22, lineHeight: 36, color: color.ink, textAlign: "center" },
  promptSource: { fontSize: font.sizes.xs, color: color.inkSoft },
  labelWrap: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  labelChip: { borderRadius: radius.pill, paddingHorizontal: space.md, minHeight: 40, justifyContent: "center", opacity: 0.75 },
  labelChipOn: { opacity: 1, borderWidth: 2, borderColor: color.ink },
  labelChipText: { color: onFill.text, fontWeight: "800" },
  guide: { color: color.inkSoft, fontSize: font.sizes.sm, textAlign: "center" },
  primary: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: color.saffronBtn, borderRadius: radius.md, minHeight: 56 },
  stop: { backgroundColor: fill.bad },
  primaryText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  progress: { color: color.inkSoft, fontSize: font.sizes.xs, textAlign: "center" },
  msg: { color: color.badText, fontSize: font.sizes.sm, textAlign: "center" },
});
