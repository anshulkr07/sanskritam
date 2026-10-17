// The live call with one companion: the Live Voice Lab, for a person.
//
// This is the screen the Voice tab used to be, now reached by choosing a
// companion. It carries that companion's own voice, pace and manner into the
// call, and keeps every control the lab had: the call panel with its state,
// the lines to try, the settings panel behind "Tune the voice", and the
// conversation as captions. Leaving the screen ends the call.
//
// The config sent to the server is exactly the shape it always was
// (src/voiceLab/config.ts): a companion only chooses the starting values,
// and anything edited in the settings panel is applied live.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useCommunity } from "../community/CommunityProvider";
import { useTypeScale } from "../hooks/useTypeScale";
import type { RootStackParamList } from "../navigation/types";
import { haptics } from "../services/haptics";
import { color, fill, onFill, radius, shadow, space } from "../theme";
import AudioSink from "../voiceLab/AudioSink";
import type { AudioSinkHandle } from "../voiceLab/audioRuntime";
import CompanionPortrait from "../voiceLab/CompanionPortrait";
import { Choices, NumberControl } from "../voiceLab/controls";
import { BASE_CONFIG, PIPELINES, voices, type LabConfig } from "../voiceLab/config";
import { DEFAULT_COMPANION_ID, categoryOf, companionById, presetFor } from "../voiceLab/companions";
import { rememberCompanion } from "../voiceLab/recents";
import { BackBar, Deva, Panel, SanskritBody, SectionLabel, SayingPill, labelOn } from "../voiceLab/ui";
import ReportButton from "../components/ReportButton";
import { useVoiceLab } from "../voiceLab/useVoiceLab";

type Props = NativeStackScreenProps<RootStackParamList, "VoiceSession">;

export default function VoiceSession({ navigation, route }: Props) {
  const community = useCommunity();
  const { sized } = useTypeScale();
  const companion = companionById(route.params.companionId) ?? companionById(DEFAULT_COMPANION_ID)!;
  const category = categoryOf(companion);
  const [config, setConfig] = useState<LabConfig>(() => presetFor(companion));
  const [sandbox, setSandbox] = useState(false);
  const [draft, setDraft] = useState("");
  const sink = useRef<AudioSinkHandle>(null);
  const lab = useVoiceLab(config, sink);

  // A call never outlives its screen.
  useFocusEffect(useCallback(() => () => lab.stop(), [lab.stop]));
  useEffect(() => rememberCompanion(companion.id), [companion.id]);

  const patch = (update: Partial<LabConfig>) => setConfig((previous) => ({ ...previous, ...update }));
  const selectPipeline = (pipeline: LabConfig["pipeline"]) => {
    const next = { ...config, pipeline };
    next.speaker = voices(next)[0];
    if (pipeline === 2) next.language = "hi-IN";
    patch(next);
  };
  const toggle = (label: string, key: "web_search" | "filler_phrases" | "transliterate" | "visarga_expansion" | "schwa_fix") => (
    <View style={styles.toggle}>
      <Text style={[styles.label, { fontSize: sized(15) }]}>{label}</Text>
      <Switch accessibilityLabel={label} value={config[key]} onValueChange={(value) => patch({ [key]: value })} trackColor={{ true: fill.teal }} />
    </View>
  );
  const numeric = (
    label: string,
    key: "pace" | "pitch" | "loudness" | "temperature" | "thinking_budget",
    min: number,
    max: number,
    step: number,
  ) => <NumberControl label={label} value={config[key]} min={min} max={max} step={step} onChange={(value) => patch({ [key]: value })} />;

  const status =
    lab.state === "live"
      ? lab.muted
        ? "Microphone muted"
        : lab.speaking
          ? lab.bargeAvailable
            ? "Speaking · you can interrupt"
            : "Speaking · tap interrupt"
          : lab.thinking
            ? "Preparing a reply…"
            : "Listening · बोलतु"
      : lab.state === "connecting"
        ? lab.connectionStatus || "Connecting…"
        : lab.error
          ? "Call needs attention"
          : "Ready when you are";
  const caption =
    lab.state === "live"
      ? lab.bargeAvailable
        ? "Speak to interrupt. A brief sound is ignored."
        : "Tap Interrupt reply to take your turn."
      : lab.state === "connecting"
        ? "The first reply can take a few seconds."
        : companion.quality;

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <BackBar
        onBack={() => navigation.goBack()}
        label={`End the call with ${companion.roman} and go back`}
        right={
          <Pressable
            onPress={() => {
              haptics.tap();
              navigation.goBack();
            }}
            accessibilityRole="button"
            accessibilityLabel="Change companion"
            hitSlop={6}
            style={styles.barButton}
          >
            <Ionicons name="people-outline" size={22} color={color.ink} />
          </Pressable>
        }
      >
        <CompanionPortrait companion={companion} size={40} radius={12} />
        <View style={styles.barNames}>
          <Deva size={19} weight="bold">
            {companion.deva}
          </Deva>
          <Text style={[styles.barSub, { fontSize: sized(12.5) }]}>
            {companion.roman} · {category.en}
          </Text>
        </View>
      </BackBar>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Panel tone={category.tone} style={styles.callPanel}>
          <View style={styles.callHead}>
            <CompanionPortrait companion={companion} size={68} variant="medallion" />
            <View style={styles.callNames}>
              <Deva size={24} weight="bold" on="fill">
                {companion.deva}
              </Deva>
              <Text style={[styles.callVoice, { fontSize: sized(12.5), color: labelOn(category.tone) }]} numberOfLines={2}>
                {companion.voice.join(" · ")}
              </Text>
            </View>
          </View>

          <Text accessibilityLiveRegion="polite" style={[styles.callStatus, { fontSize: sized(22) }]}>
            {status}
          </Text>
          <Text style={[styles.callCaption, { fontSize: sized(13) }]}>{caption}</Text>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !!community.active }}
            disabled={!!community.active}
            onPress={() => (lab.state === "idle" ? void lab.start() : lab.stop())}
            style={({ pressed }) => [styles.callButton, pressed && styles.pressed, !!community.active && styles.callButtonOff]}
          >
            <Text style={[styles.callButtonText, { fontSize: sized(16), color: fill[category.tone] }]}>
              {lab.state === "idle" ? "Start the call" : lab.state === "connecting" ? "Cancel" : "End the call"}
            </Text>
          </Pressable>

          {!!community.active && (
            <Text style={[styles.callCaption, { fontSize: sized(13) }]}>Leave your Group audio call to start this one.</Text>
          )}

          {lab.state === "live" && (
            <View style={styles.callActions}>
              <Pressable accessibilityRole="button" onPress={lab.toggleMute} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
                <Ionicons name={lab.muted ? "mic-off-outline" : "mic-outline"} size={18} color={onFill.text} />
                <Text style={styles.actionText}>{lab.muted ? "Unmute" : "Mute"}</Text>
              </Pressable>
              {!lab.speaking && !lab.muted && (
                <Pressable accessibilityRole="button" onPress={lab.endAudio} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
                  <Ionicons name="checkmark-outline" size={18} color={onFill.text} />
                  <Text style={styles.actionText}>Done speaking</Text>
                </Pressable>
              )}
              <Pressable accessibilityRole="button" onPress={lab.interrupt} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
                <Ionicons name="hand-left-outline" size={18} color={onFill.text} />
                <Text style={styles.actionText}>Interrupt reply</Text>
              </Pressable>
            </View>
          )}

          {lab.state === "live" && (
            <View accessibilityLabel={`Microphone level ${Math.round(lab.micLevel * 100)} percent`} style={styles.micTrack}>
              <View style={[styles.micLevel, { width: `${Math.max(1, lab.micLevel * 100)}%` }]} />
            </View>
          )}

          {!!lab.error && (
            <Text accessibilityRole="alert" style={[styles.error, { fontSize: sized(14) }]}>
              {lab.error}
            </Text>
          )}

          {lab.state !== "idle" && (
            <Text style={[styles.callCaption, { fontSize: sized(12.5) }]}>Going back ends the call.</Text>
          )}
        </Panel>

        {!!lab.notice && (
          <Text accessibilityLiveRegion="polite" style={[styles.notice, { fontSize: sized(13) }]}>
            {lab.notice}
          </Text>
        )}

        <SectionLabel>{lab.state === "live" ? `Say this to ${companion.roman}` : "Try saying"}</SectionLabel>
        <View style={styles.sayings}>
          {category.sayings.map((saying) => (
            <SayingPill
              key={saying.sa}
              saying={saying}
              onPress={lab.state === "live" ? () => lab.send({ type: "text", text: saying.sa }) : undefined}
            />
          ))}
        </View>
        {lab.state === "live" && (
          <Text style={[styles.note, { fontSize: sized(12.5) }]}>Tap a line and it is sent as your message, spoken or typed.</Text>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: sandbox }}
          onPress={() => {
            haptics.tap();
            setSandbox((open) => !open);
          }}
          style={styles.sandboxButton}
        >
          <Text style={[styles.label, { fontSize: sized(16) }]}>{sandbox ? "Close voice settings −" : "Tune the voice +"}</Text>
        </Pressable>

        {sandbox && (
          <View style={styles.sandbox}>
            <Text style={[styles.note, { fontSize: sized(12.5) }]}>
              Changes apply during the call. Reconnecting the voice service can take a moment.
            </Text>
            {!!lab.settingsStatus && (
              <Text accessibilityLiveRegion="polite" style={[styles.note, { fontSize: sized(12.5) }]}>
                {lab.settingsStatus}
              </Text>
            )}
            <Choices
              label="Pipeline"
              values={PIPELINES.map((pipeline, i) => `${i + 1}. ${pipeline}`)}
              selected={`${config.pipeline}. ${PIPELINES[config.pipeline - 1]}`}
              onChange={(value) => selectPipeline(Number(value[0]) as LabConfig["pipeline"])}
            />
            {(config.pipeline === 1 || config.pipeline === 2) && (
              <Choices
                label="Reply model"
                values={["sarvam-105b-conversations", "sarvam-105b", "gemma4", "deepseekv4.1-flash", "glm5.3"]}
                selected={config.llm_model}
                onChange={(value) => patch({ llm_model: value as LabConfig["llm_model"] })}
              />
            )}
            {config.pipeline === 2 && (
              <Choices
                label="Open TTS provider"
                values={["edge_tts_prosody", "ai4bharat_indic_parler"]}
                selected={config.open_provider}
                onChange={(value) => {
                  const next = { ...config, open_provider: value as LabConfig["open_provider"] };
                  next.speaker = voices(next)[0];
                  next.language = "hi-IN";
                  patch(next);
                }}
              />
            )}
            {(config.pipeline === 1 || config.pipeline === 4) && (
              <Choices
                label="Sarvam voice model"
                values={["bulbul:v3", "bulbul:v4-flash"]}
                selected={config.tts_model}
                onChange={(value) => {
                  const next = { ...config, tts_model: value as LabConfig["tts_model"] };
                  next.speaker = voices(next)[0];
                  patch(next);
                }}
              />
            )}
            {config.pipeline === 3 && (
              <Choices
                label="Gemini Live model"
                values={["gemini-3.8-live", "gemini-3.1-flash-live-preview", "gemini-2.5-flash-native-audio-preview-12-2025"]}
                selected={config.live_model}
                onChange={(live_model) => patch({ live_model })}
              />
            )}
            <Choices
              label="Voice"
              values={voices(config)}
              selected={config.speaker}
              onChange={(speaker) => {
                const language = speaker.match(/^(hi|te|kn|mr)-IN/)?.[0] as LabConfig["language"] | undefined;
                patch({ speaker, ...(language ? { language } : {}) });
              }}
            />
            <Text style={[styles.note, { fontSize: sized(12.5) }]}>Custom speaker ID (a voice the selected model supports)</Text>
            <TextInput
              accessibilityLabel="Custom speaker ID"
              style={[styles.input, { fontSize: sized(14) }]}
              value={config.speaker}
              onChangeText={(speaker) => patch({ speaker })}
              autoCapitalize="none"
            />
            {config.pipeline !== 3 && (
              <Choices
                label="Speech language"
                values={config.pipeline === 2 ? ["hi-IN", "te-IN", "kn-IN", "mr-IN"] : ["sa-IN", "hi-IN", "te-IN", "kn-IN", "mr-IN"]}
                selected={config.language}
                onChange={(language) => patch({ language: language as LabConfig["language"] })}
              />
            )}
            {numeric("Speed / pace", "pace", 0.5, 2, 0.05)}
            {numeric("Pitch (semitones)", "pitch", -12, 12, 1)}
            {numeric("Loudness", "loudness", 0.3, 2, 0.1)}
            {numeric("Temperature", "temperature", 0.1, 1, 0.05)}
            <Text style={[styles.label, { fontSize: sized(15) }]}>Emotion / style</Text>
            <TextInput
              accessibilityLabel="Emotion and style"
              style={[styles.input, { fontSize: sized(14) }]}
              value={config.emotion}
              onChangeText={(emotion) => patch({ emotion })}
              maxLength={160}
            />
            {(config.pipeline === 3 || config.pipeline === 4) && (
              <>
                {numeric("Thinking budget", "thinking_budget", 0, 4096, 128)}
                {config.pipeline === 3 && (
                  <Text style={[styles.note, { fontSize: sized(12.5) }]}>
                    3.8 Live manages thinking itself. 3.1 maps this to minimal or high; 2.5 uses the token budget.
                  </Text>
                )}
                {toggle("Web search grounding", "web_search")}
              </>
            )}
            {config.pipeline === 4 && toggle("Filler while thinking", "filler_phrases")}
            {config.pipeline !== 3 && config.language !== "sa-IN" && (
              <>
                {toggle("Transliterate for target voice", "transliterate")}
                {toggle("Expand visarga for clarity", "visarga_expansion")}
                {toggle("Hindi final-vowel hint", "schwa_fix")}
              </>
            )}
            <Text style={[styles.note, { fontSize: sized(12.5) }]}>
              Pitch and loudness also adjust playback, and pitch changes how long the reply takes. Telugu and Kannada voices read
              Sanskrit more faithfully than Hindi ones.
            </Text>
          </View>
        )}

        <SectionLabel>Conversation</SectionLabel>
        {lab.transcripts.length === 0 && (
          <Text style={[styles.note, { fontSize: sized(12.5) }]}>
            Your Sanskrit captions will appear here. Speech recognition can mishear a word.
          </Text>
        )}
        {lab.transcripts.map((turn, index) => (
          <View key={index} style={styles.transcript}>
            <Text style={[styles.transcriptWho, { fontSize: sized(12.5) }]}>{turn.role === "user" ? "You" : companion.roman}</Text>
            <SanskritBody size={20}>{turn.text}</SanskritBody>
            {turn.role !== "user" && <ReportButton surface="voice-lab" question={lab.transcripts.slice(0, index).filter(t => t.role === "user").slice(-1)[0]?.text ?? ""} answer={turn.text} />}
          </View>
        ))}

        {lab.state === "live" && (
          <View style={styles.composer}>
            <TextInput
              accessibilityLabel="Type a Sanskrit message"
              placeholder="अत्र लिखतु…"
              style={[styles.input, styles.messageInput]}
              value={draft}
              onChangeText={setDraft}
              multiline
              maxLength={2000}
            />
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.sendButton, { backgroundColor: fill[category.tone] }, pressed && styles.pressed]}
              onPress={() => {
                if (!draft.trim()) return;
                lab.send({ type: "text", text: draft.trim() });
                setDraft("");
              }}
            >
              <Text style={styles.sendText}>Send message</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
      <AudioSink ref={sink} onError={lab.onAudioError} onPlaybackBusy={lab.onPlaybackBusy} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  content: { paddingHorizontal: space.lg, paddingBottom: space.xl, gap: space.sm },
  pressed: { opacity: 0.88 },

  barButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22 },
  barNames: { flex: 1, gap: 0 },
  barSub: { fontFamily: "Nunito_700Bold", fontWeight: "700", color: color.inkSoft },

  callPanel: { gap: space.sm, ...shadow.card },
  callHead: { flexDirection: "row", alignItems: "center", gap: space.sm },
  callNames: { flex: 1, gap: 2 },
  callVoice: { fontFamily: "Nunito_700Bold", fontWeight: "700" },
  callStatus: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: onFill.text },
  callCaption: { fontFamily: "Nunito_400Regular", fontWeight: "400", lineHeight: 19, color: onFill.soft },
  callButton: { minHeight: 52, borderRadius: radius.md, backgroundColor: onFill.text, alignItems: "center", justifyContent: "center", paddingHorizontal: space.md },
  callButtonOff: { opacity: 0.5 },
  callButtonText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800" },
  callActions: { flexDirection: "row", flexWrap: "wrap", gap: space.xs },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 44,
    paddingHorizontal: space.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: onFill.text,
  },
  actionText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 13.5, color: onFill.text },
  micTrack: { height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.2)", overflow: "hidden" },
  micLevel: { height: 5, backgroundColor: onFill.text, borderRadius: 3 },
  error: { fontFamily: "Nunito_700Bold", fontWeight: "700", color: color.badText, backgroundColor: color.surface, padding: space.sm, borderRadius: radius.sm },

  notice: { fontFamily: "Nunito_400Regular", fontWeight: "400", color: color.inkSoft, lineHeight: 20 },
  sayings: { flexDirection: "row", flexWrap: "wrap", gap: space.xs },
  note: { fontFamily: "Nunito_400Regular", fontWeight: "400", color: color.inkSoft, lineHeight: 19 },
  label: { fontFamily: "Nunito_700Bold", fontWeight: "700", color: color.ink },

  sandboxButton: { minHeight: 48, justifyContent: "center", borderBottomWidth: 1, borderColor: color.border, marginTop: space.xs },
  sandbox: { gap: space.xs },
  toggle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: space.xs, gap: space.sm },
  input: {
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
    borderRadius: radius.sm,
    minHeight: 48,
    padding: space.sm,
    color: color.ink,
  },
  messageInput: { fontFamily: "TiroDevanagariSanskrit_400Regular", fontSize: 20, lineHeight: 30, minHeight: 64 },
  sendButton: { minHeight: 48, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  sendText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 16, color: onFill.text },

  transcript: { borderBottomWidth: 1, borderColor: color.border, paddingVertical: space.sm, gap: 6 },
  transcriptWho: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: color.inkSoft },
  composer: { gap: space.xs, marginTop: space.xs },
});
