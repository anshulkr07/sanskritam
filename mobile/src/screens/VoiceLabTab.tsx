import React, { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { color, fill, sanskritFace } from "../theme";
import AudioSink from "../voiceLab/AudioSink";
import { AudioSinkHandle } from "../voiceLab/audioRuntime";
import { BASE_CONFIG, LabConfig, PERSONA_NAMES, PIPELINES, PRESETS, voices } from "../voiceLab/config";
import { useVoiceLab } from "../voiceLab/useVoiceLab";

function Choices({ label, values, selected, onChange }: { label: string; values: string[]; selected: string; onChange: (value: string) => void }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><View style={styles.choices}>
    {values.map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: selected === value }}
      onPress={() => onChange(value)} style={[styles.choice, selected === value && styles.selected]}>
      <Text style={[styles.choiceText, selected === value && styles.selectedText]}>{value}</Text>
    </Pressable>)}
  </View></View>;
}

function NumberControl({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (n: number) => void }) {
  const [width, setWidth] = useState(1);
  const changeAt = (x: number) => onChange(Math.min(max, Math.max(min, Number((min + Math.round((Math.max(0, Math.min(width, x)) / width) * (max - min) / step) * step).toFixed(2)))));
  return <View style={styles.field}><View style={styles.row}><Text style={styles.label}>{label}</Text><Text style={styles.body}>{value}</Text></View>
    <View style={styles.row}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Decrease ${label}`} style={styles.step} onPress={() => onChange(Math.max(min, Number((value - step).toFixed(2))))}><Text style={styles.body}>−</Text></Pressable>
      <View style={styles.slider} onLayout={e => setWidth(Math.max(1, e.nativeEvent.layout.width))}
        accessible accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ min, max, now: value }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={e => onChange(Math.max(min, Math.min(max, Number((value + (e.nativeEvent.actionName === "increment" ? step : -step)).toFixed(2)))))}
        onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true}
        onResponderGrant={e => changeAt(e.nativeEvent.locationX)} onResponderMove={e => changeAt(e.nativeEvent.locationX)}>
        <View style={styles.track} /><View style={[styles.thumb, { left: `${((value - min) / (max - min)) * 100}%` }]} />
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Increase ${label}`} style={styles.step} onPress={() => onChange(Math.min(max, Number((value + step).toFixed(2))))}><Text style={styles.body}>+</Text></Pressable>
    </View>
  </View>;
}

export default function VoiceLabTab() {
  const [config, setConfig] = useState<LabConfig>({ ...BASE_CONFIG });
  const [sandbox, setSandbox] = useState(false);
  const [draft, setDraft] = useState("");
  const sink = useRef<AudioSinkHandle>(null);
  const lab = useVoiceLab(config, sink);
  useFocusEffect(useCallback(() => () => lab.stop(), [lab.stop]));
  const patch = (update: Partial<LabConfig>) => setConfig(previous => ({ ...previous, ...update }));
  const selectPipeline = (pipeline: LabConfig["pipeline"]) => {
    const next = { ...config, pipeline };
    next.speaker = voices(next)[0];
    if (pipeline === 2) next.language = "hi-IN";
    patch(next);
  };
  const toggle = (label: string, key: "web_search" | "filler_phrases" | "transliterate" | "visarga_expansion" | "schwa_fix") =>
    <View style={styles.toggle}><Text style={styles.body}>{label}</Text><Switch accessibilityLabel={label} value={config[key]} onValueChange={value => patch({ [key]: value })} trackColor={{ true: fill.teal }} /></View>;
  const numeric = (label: string, key: "pace" | "pitch" | "loudness" | "temperature" | "thinking_budget", min: number, max: number, step: number) =>
    <NumberControl label={label} value={config[key]} min={min} max={max} step={step} onChange={value => patch({ [key]: value })} />;

  return <SafeAreaView style={styles.page} edges={["top", "left", "right"]}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>सम्भाषण-प्रयोगशाला</Text>
      <Text style={styles.title}>Live Voice Lab</Text>
      <Text style={styles.body}>Speak Sanskrit with a teacher, a mother, a friend, or a scholar. Tune the voice as you talk.</Text>
      <Choices label="Your companion" values={Object.values(PERSONA_NAMES)} selected={PERSONA_NAMES[config.persona]}
        onChange={value => { const key = (Object.keys(PERSONA_NAMES) as LabConfig["persona"][]).find(k => PERSONA_NAMES[k] === value)!; setConfig({ ...PRESETS[key] }); }} />
      <View style={styles.callPanel}>
        <Text accessibilityLiveRegion="polite" style={styles.callTitle}>{lab.state === "live" ? (lab.muted ? "Microphone muted" : "Listening · बोलतु") : lab.state === "connecting" ? lab.connectionStatus : lab.error ? "Call could not start" : "Ready when you are"}</Text>
        <Text style={styles.callCaption}>{PIPELINES[config.pipeline - 1]} · {config.speaker}</Text>
        <Pressable accessibilityRole="button" style={styles.callButton} onPress={() => lab.state === "idle" ? void lab.start() : lab.stop()}>
          <Text style={styles.selectedText}>{lab.state === "idle" ? "Start voice call" : lab.state === "connecting" ? "Cancel" : "End call"}</Text>
        </Pressable>
        {!!lab.error && <Text accessibilityRole="alert" style={styles.error}>{lab.error}</Text>}
        {lab.state === "live" && <View style={styles.choices}>
          <Pressable accessibilityRole="button" style={styles.callButton} onPress={lab.toggleMute}><Text style={styles.selectedText}>{lab.muted ? "Unmute" : "Mute"}</Text></Pressable>
          <Pressable accessibilityRole="button" style={styles.callButton} onPress={lab.interrupt}><Text style={styles.selectedText}>Interrupt reply</Text></Pressable>
        </View>}
      </View>
      {!!lab.notice && <Text accessibilityLiveRegion="polite" style={styles.note}>{lab.notice}</Text>}
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: sandbox }} style={styles.sandboxButton} onPress={() => setSandbox(!sandbox)}>
        <Text style={styles.label}>{sandbox ? "Close sandbox settings −" : "Open sandbox settings +"}</Text>
      </Pressable>
      {sandbox && <View>
        <Text style={styles.body}>Changes apply during the call. Provider connection settings may briefly reconnect upstream.</Text>
        {!!lab.settingsStatus && <Text accessibilityLiveRegion="polite" style={styles.note}>{lab.settingsStatus}</Text>}
        <Choices label="Pipeline" values={PIPELINES.map((p, i) => `${i + 1}. ${p}`)} selected={`${config.pipeline}. ${PIPELINES[config.pipeline - 1]}`} onChange={value => selectPipeline(Number(value[0]) as LabConfig["pipeline"])} />
        {config.pipeline === 2 && <Choices label="Open TTS provider" values={["edge_tts_prosody", "ai4bharat_indic_parler"]} selected={config.open_provider} onChange={value => {
          const next = { ...config, open_provider: value as LabConfig["open_provider"] };
          next.speaker = voices(next)[0]; next.language = "hi-IN"; patch(next);
        }} />}
        {(config.pipeline === 1 || config.pipeline === 4) && <Choices label="Sarvam voice model" values={["bulbul:v3", "bulbul:v4-flash"]} selected={config.tts_model} onChange={value => {
          const next = { ...config, tts_model: value as LabConfig["tts_model"] }; next.speaker = voices(next)[0]; patch(next);
        }} />}
        {config.pipeline === 3 && <Choices label="Gemini Live model" values={["gemini-3.8-live", "gemini-3.1-flash-live-preview", "gemini-2.5-flash-native-audio-preview-12-2025"]} selected={config.live_model} onChange={live_model => patch({ live_model })} />}
        <Choices label="Voice" values={voices(config)} selected={config.speaker} onChange={speaker => {
          const language = speaker.match(/^(hi|te|kn|mr)-IN/)?.[0] as LabConfig["language"] | undefined;
          patch({ speaker, ...(language ? { language } : {}) });
        }} />
        <Text style={styles.note}>Custom speaker ID (use a voice supported by the selected model)</Text>
        <TextInput accessibilityLabel="Custom speaker ID" style={styles.input} value={config.speaker} onChangeText={speaker => patch({ speaker })} autoCapitalize="none" />
        {config.pipeline !== 3 && <Choices label="TTS script / language" values={["hi-IN", "te-IN", "kn-IN", "mr-IN"]} selected={config.language} onChange={language => patch({ language: language as LabConfig["language"] })} />}
        {numeric("Speed / pace", "pace", 0.5, 2, 0.05)}
        {numeric("Pitch (semitones)", "pitch", -12, 12, 1)}
        {numeric("Loudness", "loudness", 0.3, 2, 0.1)}
        {numeric("Temperature", "temperature", 0.1, 1, 0.05)}
        <Text style={styles.label}>Emotion / style</Text>
        <TextInput accessibilityLabel="Emotion and style" style={styles.input} value={config.emotion} onChangeText={emotion => patch({ emotion })} maxLength={160} />
        {(config.pipeline === 3 || config.pipeline === 4) && <>
          {numeric("Thinking budget", "thinking_budget", 0, 4096, 128)}
          {config.pipeline === 3 && <Text style={styles.note}>3.8 Live manages thinking automatically. 3.1 maps this control to minimal/high; 2.5 uses the token budget.</Text>}
          {toggle("Web search grounding", "web_search")}
        </>}
        {config.pipeline === 4 && toggle("Filler while thinking", "filler_phrases")}
        {config.pipeline !== 3 && <>{toggle("Transliterate for target voice", "transliterate")}{toggle("Expand visarga for clarity", "visarga_expansion")}{toggle("Hindi final-vowel hint", "schwa_fix")}</>}
        <Text style={styles.note}>Pitch and loudness also adjust playback. Pitch changes playback duration. Hindi vowel hints are experimental; Telugu and Kannada are recommended for Sanskrit pronunciation.</Text>
        {config.pipeline === 2 && config.open_provider === "ai4bharat_indic_parler" && <Text style={styles.note}>Indic-Parler uses the backend’s Hugging Face Space or inference endpoint. Shared GPU queues can add delay; your daily allowance counts synthesis processing time.</Text>}
      </View>}
      <Text style={styles.sectionTitle}>Conversation</Text>
      {lab.transcripts.length === 0 && <Text style={styles.note}>Your Sanskrit captions will appear here. Speech recognition can make mistakes.</Text>}
      {lab.transcripts.map((turn, i) => <View key={i} style={styles.transcript}>
        <Text style={styles.label}>{turn.role === "user" ? "You" : PERSONA_NAMES[config.persona]}</Text>
        <Text style={styles.sanskrit}>{turn.text}</Text>
      </View>)}
      {lab.state === "live" && <View style={styles.field}>
        <TextInput accessibilityLabel="Type a Sanskrit message" placeholder="अत्र लिखतु…" value={draft} onChangeText={setDraft} multiline style={styles.input} maxLength={2000} />
        <Pressable accessibilityRole="button" style={styles.selected} onPress={() => { if (draft.trim()) { lab.send({ type: "text", text: draft.trim() }); setDraft(""); } }}><Text style={styles.sendText}>Send message</Text></Pressable>
      </View>}
    </ScrollView>
    <AudioSink ref={sink} onError={lab.setError} />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg }, content: { padding: 20, paddingBottom: 32, gap: 14 },
  eyebrow: { color: color.saffronText, fontFamily: sanskritFace.regular, fontSize: 15 },
  title: { color: color.ink, fontFamily: "Nunito_800ExtraBold", fontSize: 30 },
  sectionTitle: { color: color.ink, fontFamily: "Nunito_700Bold", fontSize: 21, marginTop: 12 },
  body: { color: color.inkSoft, fontFamily: "Nunito_400Regular", fontSize: 15, lineHeight: 23 },
  label: { color: color.ink, fontFamily: "Nunito_700Bold", fontSize: 15 },
  field: { marginVertical: 8, gap: 8 }, choices: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: { minHeight: 44, justifyContent: "center", borderWidth: 1, borderColor: color.border, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
  choiceText: { color: color.ink, fontFamily: "Nunito_600SemiBold", fontSize: 13 },
  selected: { backgroundColor: fill.teal, borderRadius: 12 }, selectedText: { color: color.bg, fontFamily: "Nunito_700Bold", fontSize: 15 },
  callPanel: { backgroundColor: fill.teal, padding: 20, borderRadius: 20, gap: 14 },
  callTitle: { color: color.bg, fontFamily: "Nunito_700Bold", fontSize: 22 },
  callCaption: { color: color.bg, fontFamily: "Nunito_400Regular", fontSize: 13 },
  callButton: { minHeight: 48, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: color.bg, alignItems: "center", justifyContent: "center" },
  sandboxButton: { minHeight: 48, justifyContent: "center", borderBottomWidth: 1, borderColor: color.border },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  toggle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 },
  step: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: color.border, borderRadius: 10 },
  slider: { flex: 1, height: 44, justifyContent: "center", marginHorizontal: 8 },
  track: { height: 4, backgroundColor: color.border, borderRadius: 2 },
  thumb: { position: "absolute", width: 22, height: 22, borderRadius: 11, backgroundColor: fill.teal, marginLeft: -11 },
  input: { borderWidth: 1, borderColor: color.border, borderRadius: 12, minHeight: 48, padding: 12, color: color.ink, fontSize: 16 },
  note: { color: color.inkSoft, fontFamily: "Nunito_400Regular", fontSize: 13, lineHeight: 21 },
  error: { color: color.badText, backgroundColor: color.bg, padding: 12, borderRadius: 12, fontFamily: "Nunito_600SemiBold", fontSize: 15 },
  transcript: { borderBottomWidth: 1, borderColor: color.border, paddingVertical: 12, gap: 8 },
  sanskrit: { color: color.ink, fontFamily: sanskritFace.regular, fontSize: 20, lineHeight: 34 },
  sendText: { color: color.bg, fontFamily: "Nunito_700Bold", textAlign: "center", padding: 14 },
});
