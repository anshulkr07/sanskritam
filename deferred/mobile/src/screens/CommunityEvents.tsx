import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TextInput, Pressable, StyleSheet } from "react-native";
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from "expo-audio";
import { request, getAuthToken } from "../api/client";
import { BASE_URL } from "../config";
import { buyProduct } from "../services/storePurchases";
import { color } from "../theme";

interface Event { id: string; state: string; details: { title: string; kind: string; rules: string; judging: string; tie_breaks: string; verification: string; moderation: string; sponsorship: string; fulfilment: string; reward: string; countries: string[]; starts_at: string; ends_at: string; entry_fee: number } }
export default function CommunityEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Event | null>(null);
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [audio, setAudio] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [draft, setDraft] = useState({ title: "", kind: "poetry", rules: "", judging: "", tie_breaks: "", verification: "", moderation: "", sponsorship: "Sanskritam administers this event. Apple and Google do not sponsor it.", countries: "", reward: "", fulfilment: "", funding: "", starts_at: new Date().toISOString(), ends_at: new Date(Date.now() + 7 * 86400000).toISOString() });
  const load = () => request<Event[]>("/commerce/events", {}, true).then(setEvents);
  useEffect(() => { void load().catch(e => setMessage(e.message)); }, []);
  useEffect(() => () => { if (recorder.isRecording) void recorder.stop(); }, [recorder]);
  const run = async (fn: () => Promise<unknown>) => {
    if (busy) return; setBusy(true); setMessage("");
    try { await fn(); await load(); } catch (e) { setMessage(e instanceof Error ? e.message : "Please retry."); } finally { setBusy(false); }
  };
  const button = (label: string, fn: () => Promise<unknown>) => <Pressable disabled={busy} onPress={() => void run(fn)} style={styles.button} accessibilityRole="button"><Text style={styles.buttonText}>{label}</Text></Pressable>;
  const toggleRecording = async () => {
    if (recording) { await recorder.stop(); setAudio(recorder.uri); setRecording(false); return; }
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) throw new Error("Microphone permission is required to record an entry.");
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync(); recorder.record({ forDuration: 300 }); setRecording(true); setAudio(null);
  };
  return <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
    <Text style={styles.title}>Community competitions</Text>
    <Text style={styles.body}>Entry is free. Membership, credits, referrals and ads never improve a competition score. Cash and physical prizes are for eligible adults in the event’s listed countries.</Text>
    {!!message && <Text style={styles.notice}>{message}</Text>}
    {events.map(event => <View key={event.id} style={styles.card}>
      <Text style={styles.heading}>{event.details.title}</Text><Text style={styles.small}>{event.state} · {event.details.kind}</Text>
      <Text style={styles.body}>{event.details.reward}</Text>
      <Text style={styles.small}>Countries: {event.details.countries.join(", ")} · closes {new Date(event.details.ends_at).toLocaleString()}</Text>
      <Text style={styles.body}>{event.details.rules}</Text><Text style={styles.small}>Judging: {event.details.judging}</Text>
      <Text style={styles.small}>Tie-breaks: {event.details.tie_breaks}{"\n"}Verification: {event.details.verification}{"\n"}Moderation: {event.details.moderation}{"\n"}Delivery: {event.details.fulfilment}{"\n"}{event.details.sponsorship}</Text>
      {event.state === "published" && button("Prepare a free entry", async () => { setSelected(event); setText(""); setAudio(null); })}
      {event.state === "approved" && button("Purchase approved event hosting", () => buyProduct("com.sanskritam.app.hosting"))}
      {["results_review", "fulfilled", "appeal"].includes(event.state) && button("View reviewed results", async () => {
        setSelected(event); setText(""); setAudio(null);
        const result = await request<{ results: { rank: number; name: string; score: number }[] }>(`/commerce/events/${event.id}/results`, {}, true);
        setMessage(result.results.map(r => `${r.rank}. ${r.name} · ${r.score}/100`).join("\n") || "Results are being reviewed.");
      })}
    </View>)}
    {selected && <View style={styles.card}>
      <Text style={styles.heading}>Entry: {selected.details.title}</Text>
      <TextInput multiline value={text} onChangeText={setText} placeholder="Your poem or entry notes" style={[styles.input, { minHeight: 100 }]} maxLength={12000} />
      {button(recording ? "Stop recording" : audio ? "Record again" : "Record recitation or song · up to 5 minutes", toggleRecording)}
      {!!audio && <Text style={styles.small}>Recording ready. It remains private for judging.</Text>}
      {button("Submit free entry", async () => {
        if (recording) throw new Error("Stop the recording before submitting.");
        const data = new FormData(); data.append("text", text);
        if (audio) data.append("file", { uri: audio, name: "entry.m4a", type: "audio/mp4" } as unknown as Blob);
        const response = await fetch(`${BASE_URL}/commerce/events/${selected.id}/entries`, { method: "POST", headers: { Authorization: `Bearer ${getAuthToken()}` }, body: data });
        const result = await response.json(); if (!response.ok) throw new Error(typeof result.detail === "string" ? result.detail : JSON.stringify(result.detail));
        setMessage("Your entry was submitted. All entrants have the same ten-submissions-per-day limit."); setSelected(null);
      })}
      {button("Send a judging appeal", async () => {
        await request(`/commerce/events/${selected.id}/appeal`, { method: "POST", body: JSON.stringify({ explanation: text }) }, true);
        setMessage("Your appeal has been sent for review.");
      })}
    </View>}
    {button(creating ? "Hide organizer form" : "Propose a community competition", async () => { setCreating(!creating); })}
    {creating && <View style={styles.card}>
      <Text style={styles.heading}>Organizer proposal</Text>
      <Text style={styles.small}>You need an adult reward profile. Publication requires platform approval, verified prize funding and fulfilment for every advertised country. Hosting is purchased separately after approval; participants pay nothing.</Text>
      {(Object.keys(draft) as (keyof typeof draft)[]).map(key => <View key={key}><Text style={styles.small}>{key.replaceAll("_", " ")}{key === "funding" ? " · total prize funding in INR equivalent" : ""}</Text>
        <TextInput value={draft[key]} onChangeText={value => setDraft({ ...draft, [key]: value })} style={styles.input} multiline={["rules", "judging", "fulfilment"].includes(key)} placeholder={key === "kind" ? "poetry / singing / recitation / game" : key === "countries" ? "IN, US, GB" : key} />
      </View>)}
      {button("Submit for platform review", async () => {
        await request("/commerce/events", { method: "POST", body: JSON.stringify({ ...draft, countries: draft.countries.split(",").map(s => s.trim().toUpperCase()), funding_inr_paise: Math.round(Number(draft.funding) * 100) }) }, true);
        setCreating(false); setMessage("Proposal saved. The platform will review funding, identity, rules and judging before publication.");
      })}
    </View>}
    <Text style={styles.small}>Sanskritam administers approved competitions. Apple and Google are not sponsors or administrators.</Text>
  </ScrollView>;
}
const styles = StyleSheet.create({ page: { padding: 20, paddingBottom: 100, gap: 15, backgroundColor: color.bg }, title: { fontSize: 27, fontWeight: "800", color: color.ink }, heading: { fontSize: 19, fontWeight: "700", color: color.ink }, body: { fontSize: 15, lineHeight: 23, color: color.ink }, small: { fontSize: 12, lineHeight: 18, color: color.inkSoft }, card: { padding: 16, gap: 10, borderRadius: 16, backgroundColor: color.white }, button: { padding: 13, borderRadius: 10, backgroundColor: color.saffron }, buttonText: { color: color.white, fontWeight: "700", textAlign: "center" }, input: { borderWidth: 1, borderColor: color.border, borderRadius: 9, padding: 12, color: color.ink }, notice: { backgroundColor: color.saffronLight, padding: 14, borderRadius: 12, color: color.ink } });
