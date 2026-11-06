import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation, type NavigationProp } from "@react-navigation/native";
import { BASE_CONFIG } from "../voiceLab/config";
import { useVoiceLab } from "../voiceLab/useVoiceLab";
import AudioSink from "../voiceLab/AudioSink";
import type { AudioSinkHandle } from "../voiceLab/audioRuntime";
import { commerceCatalogue, type CommerceCatalogue } from "../services/commerce";
import { newSpendId, spendMudra } from "../services/mudra";
import { MudraAmount } from "../components/MudraCoin";
import type { RootStackParamList } from "../navigation/types";
import { color } from "../theme";
import { T, ui } from "../trail/theme";
import ReportButton from "../components/ReportButton";

// Talk with Guru. Minutes come from the free trial, the plan month, then
// minutes bought with Mudrā, which are sold here rather than in the shop
// (owner, 2026-11-06: keep the shop uncluttered).
export default function GuruVoice() {
  const sink = useRef<AudioSinkHandle>(null);
  const lab = useVoiceLab(BASE_CONFIG, sink);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [shop, setShop] = useState<CommerceCatalogue | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [buying, setBuying] = useState(false);
  const [note, setNote] = useState("");
  const attempts = useRef<Record<string, string>>({});
  useFocusEffect(useCallback(() => () => lab.stop(), [lab.stop]));
  const load = useCallback(() => commerceCatalogue().then(s => {
    setShop(s);
    setRemaining(s.paid_seconds + s.trial_seconds + (s.plan_seconds ?? 0));
  }).catch(() => {}), []);
  useEffect(() => {
    if (lab.state !== "idle") return;
    void load();
  }, [lab.state, load]);
  useEffect(() => {
    if (lab.state !== "live" || !lab.billing) return;
    const timer = setInterval(() => setRemaining(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [lab.state, lab.billing]);
  const buyMinutes = async (minutes: number, price: number) => {
    if (buying) return;
    const available = shop?.mudra.available ?? 0;
    if (available < price) { setNote(`You need ${price - available} more Mudrā.`); return; }
    setBuying(true); setNote("");
    try {
      const key = "guru:" + minutes;
      attempts.current[key] ??= newSpendId();
      await spendMudra(key, price, attempts.current[key]);
      delete attempts.current[key];
      setNote(`${minutes} minutes added. Bought minutes never expire.`);
      await load();
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBuying(false);
    }
  };
  const button = (label: string, action: () => void, disabled = false) => <Pressable accessibilityRole="button" disabled={disabled}
    onPress={action} style={{ padding: 16, backgroundColor: color.saffron, opacity: disabled ? .45 : 1 }}>
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
    {lab.state === "idle" && !!shop?.guru_minutes?.length && (
      <View>
        <Text style={styles.eyebrow}>MORE MINUTES</Text>
        {shop.guru_minutes.map((g, i) => (
          <View key={g.minutes} style={[styles.row, i === shop.guru_minutes.length - 1 && styles.rowLast]}>
            <Text style={styles.rowTitle}>{g.minutes} minutes</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`Buy ${g.minutes} minutes for ${g.price} Mudrā`}
              disabled={buying} onPress={() => void buyMinutes(g.minutes, g.price)} style={[styles.fill, buying && { opacity: 0.45 }]}>
              <MudraAmount amount={g.price} size={15} textStyle={{ color: T.white }} />
            </Pressable>
          </View>
        ))}
        {!!note && <Text accessibilityLiveRegion="polite" style={styles.note}>{note}</Text>}
        <Pressable accessibilityRole="link" onPress={() => navigation.navigate("Shop", {})} style={styles.link}>
          <Text style={styles.linkText}>Get Mudrā, or Lite and Plus for minutes every month</Text>
        </Pressable>
      </View>
    )}
    {lab.transcripts.map((line, i) => <View key={i} style={{ gap: 8 }}>
      <Text style={{ color: color.ink, fontSize: 18 }}>{line.role === "assistant" ? "Guru: " : "You: "}{line.text}</Text>
      {line.role === "assistant" && <ReportButton surface="voice-lab" question={lab.transcripts[i - 1]?.text ?? ""} answer={line.text} />}
    </View>)}
  </ScrollView>;
}

const styles = StyleSheet.create({
  eyebrow: { ...ui("bold"), fontSize: 12, letterSpacing: 1.2, color: T.ink3, paddingBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52, borderTopWidth: 1, borderColor: T.line },
  rowLast: { borderBottomWidth: 1 },
  rowTitle: { ...ui("semibold"), flex: 1, fontSize: 16, color: T.ink },
  fill: { minHeight: 44, minWidth: 96, paddingHorizontal: 12, backgroundColor: T.action, alignItems: "center", justifyContent: "center" },
  note: { ...ui("semibold"), fontSize: 14, color: T.ink2, paddingTop: 8 },
  link: { minHeight: 44, justifyContent: "center" },
  linkText: { ...ui("semibold"), fontSize: 14, color: T.action },
});
