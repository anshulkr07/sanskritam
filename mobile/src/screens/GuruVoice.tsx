import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { BASE_CONFIG } from "../voiceLab/config";
import { useVoiceLab } from "../voiceLab/useVoiceLab";
import AudioSink from "../voiceLab/AudioSink";
import type { AudioSinkHandle } from "../voiceLab/audioRuntime";
import { commerceCatalogue } from "../services/commerce";
import { color } from "../theme";
import ReportButton from "../components/ReportButton";

export default function GuruVoice() {
  const sink = useRef<AudioSinkHandle>(null);
  const lab = useVoiceLab(BASE_CONFIG, sink);
  const [remaining, setRemaining] = useState(0);
  useFocusEffect(useCallback(() => () => lab.stop(), [lab.stop]));
  useEffect(() => {
    if (lab.state !== "idle") return;
    void commerceCatalogue().then(s => setRemaining(s.paid_seconds + s.trial_seconds)).catch(() => {});
  }, [lab.state]);
  useEffect(() => {
    if (lab.state !== "live" || !lab.billing) return;
    const timer = setInterval(() => setRemaining(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [lab.state, lab.billing]);
  const button = (label: string, action: () => void, disabled = false) => <Pressable accessibilityRole="button" disabled={disabled}
    onPress={action} style={{ padding: 16, backgroundColor: color.saffron, borderRadius: 8, opacity: disabled ? .45 : 1 }}>
    <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>{label}</Text></Pressable>;
  return <ScrollView contentContainerStyle={{ padding: 20, gap: 18, backgroundColor: color.bg }}>
    <Text style={{ fontSize: 27, color: color.ink, fontWeight: "700" }}>Talk with Guru</Text>
    <Text style={{ color: color.ink }}>Practise Sanskrit aloud. {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")} available.</Text>
    <Text style={{ color: color.ink }}>Time starts with Guru’s first spoken reply and continues until you end the call. Calls end after at most 10 minutes. Failed startup uses no minutes.</Text>
    <AudioSink ref={sink} onError={lab.onAudioError} onPlaybackBusy={lab.onPlaybackBusy} />
    <Text accessibilityLiveRegion="polite" style={{ color: color.ink }}>{lab.error || lab.connectionStatus || lab.notice || (lab.state === "live" ? lab.speaking ? "Guru is speaking" : "Listening…" : "Ready when you are")}</Text>
    {lab.state === "idle" ? button("Start conversation", () => void lab.start(), remaining < 1) : <>
      {button("End conversation", lab.stop)}
      {lab.state === "live" && button(lab.muted ? "Unmute microphone" : "Mute microphone", lab.toggleMute)}
      {lab.speaking && button("Interrupt reply", lab.interrupt)}
    </>}
    {lab.transcripts.map((line, i) => <View key={i} style={{ gap: 8 }}>
      <Text style={{ color: color.ink, fontSize: 18 }}>{line.role === "assistant" ? "Guru: " : "You: "}{line.text}</Text>
      {line.role === "assistant" && <ReportButton surface="voice-lab" question={lab.transcripts[i - 1]?.text ?? ""} answer={line.text} />}
    </View>)}
  </ScrollView>;
}
