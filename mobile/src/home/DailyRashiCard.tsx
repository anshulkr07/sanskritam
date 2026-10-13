import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api, type AskBirth, type AskTalkResponse } from "../api/client";
import PlaceChooser from "../components/PlaceChooser";
import type { Place } from "../services/place";
import { parseBirth } from "../services/birth";
import { color, fill, font, onFill, space } from "../theme";
import { plain } from "../utils/text";

const KEY = "shabd.home.dailyRashi.profile";
const SKIP_KEY = "shabd.home.dailyRashi.skipped";
const READ_KEY = "shabd.home.dailyRashi.reading";
type Reading = { date: string; text: string; sign: string; nakshatra: string };

function dateAtPlace(birth: AskBirth): string {
  try { return new Intl.DateTimeFormat("en-CA", { timeZone: birth.tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
  catch { return new Date().toISOString().slice(0, 10); }
}

export default function DailyRashiCard() {
  const [birth, setBirth] = useState<AskBirth | null>(null);
  const [reading, setReading] = useState<Reading | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [setup, setSetup] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [birthDate, setBirthDate] = useState("");
  const [clock, setClock] = useState("");
  const [timeKnown, setTimeKnown] = useState(true);
  const [place, setPlace] = useState<Place | null>(null);
  const [placeOpen, setPlaceOpen] = useState(false);
  const [error, setError] = useState("");

  const fetchReading = useCallback(async (profile: AskBirth, force = false) => {
    const today = dateAtPlace(profile);
    setLoading(true); setFailed(false);
    try {
      if (!force) {
        const saved = await AsyncStorage.getItem(READ_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as Reading;
          if (parsed.date === today && parsed.text) { setReading(parsed); setLoading(false); return; }
        }
      }
      const response: AskTalkResponse = await api.askTalk(
        "Give my daily horoscope for today. Keep it concise and identify it as a traditional Jyotisha reading, not certainty. Do not make medical, financial, or fear-based promises.",
        { birth: profile, lang: "en" },
      );
      const text = plain(response.explanation || response.card?.summary || "").trim();
      if (!response.chart || !text) throw new Error("Daily reading unavailable");
      const next: Reading = { date: today, text, sign: response.chart.moon_sign_en, nakshatra: response.chart.nakshatra };
      await AsyncStorage.setItem(READ_KEY, JSON.stringify(next));
      setReading(next);
    } catch { setFailed(true); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let alive = true;
    void Promise.all([AsyncStorage.getItem(KEY), AsyncStorage.getItem(SKIP_KEY), AsyncStorage.getItem(READ_KEY)]).then(([raw, skip, saved]) => {
      if (!alive) return;
      setSkipped(skip === "1");
      if (raw) {
        try {
          const profile = JSON.parse(raw) as AskBirth;
          setBirth(profile);
          if (saved) {
            const value = JSON.parse(saved) as Reading;
            if (value.date === dateAtPlace(profile)) setReading(value);
          }
          void fetchReading(profile);
        } catch { setFailed(true); }
      }
    }).catch(() => {});
    const timer = setInterval(() => {
      void AsyncStorage.getItem(KEY).then((value) => {
        if (value) void fetchReading(JSON.parse(value) as AskBirth);
      }).catch(() => {});
    }, 30 * 60_000);
    return () => { alive = false; clearInterval(timer); };
  }, [fetchReading]);

  const beginSetup = () => {
    setError("");
    setBirthDate(birth?.date ?? "");
    setClock(birth?.time ?? "");
    setTimeKnown(birth?.time_known ?? true);
    setPlace(birth ? { lat: birth.lat, lon: birth.lon, tz: birth.tz, label: birth.label, source: "city" } : null);
    setSkipped(false);
    setSetup(true);
  };

  const saveProfile = async () => {
    const [year, month, day] = birthDate.split("-");
    const parsed = parseBirth(day ?? "", month ?? "", year ?? "", clock, timeKnown,
      place ? { lat: place.lat, lon: place.lon, tz: place.tz, label: place.label } : null);
    if ("error" in parsed) { setError(parsed.error); return; }
    const profile = parsed.birth;
    await AsyncStorage.multiSet([[KEY, JSON.stringify(profile)], [SKIP_KEY, "0"]]);
    await AsyncStorage.removeItem(READ_KEY);
    setBirth(profile); setReading(null); setSetup(false);
    void fetchReading(profile, true);
  };

  const skip = async () => {
    setSkipped(true); setSetup(false);
    await AsyncStorage.setItem(SKIP_KEY, "1").catch(() => {});
  };
  const remove = async () => {
    await AsyncStorage.multiRemove([KEY, READ_KEY]);
    setBirth(null); setReading(null); setSetup(false); setSkipped(false);
  };

  return (
    <>
      <View style={styles.card}>
        <View style={styles.heading}>
          <View style={styles.icon}><Ionicons name="sunny-outline" size={17} color={onFill.text} /></View>
          <View style={styles.headingText}><Text style={styles.title}>Daily rashi</Text><Text style={styles.subtitle}>Traditional Jyotisha, for reflection</Text></View>
          {!!birth && <Pressable onPress={beginSetup} style={styles.edit} accessibilityRole="button" accessibilityLabel="Edit birth details"><Text style={styles.editText}>Edit</Text></Pressable>}
        </View>
        {!birth ? (
          <View style={styles.body}>
            <Text style={styles.copy}>{skipped ? "Set this up whenever you like. Your birth details stay on this device until used for the reading." : "Add your birth date, time and place once for a personal Moon sign reading."}</Text>
            <View style={styles.actions}>
              <Pressable onPress={beginSetup} style={styles.primary} accessibilityRole="button" accessibilityLabel="Set up daily rashi"><Text style={styles.primaryText}>Set up</Text></Pressable>
              {!skipped && <Pressable onPress={() => void skip()} style={styles.secondary} accessibilityRole="button" accessibilityLabel="Not now"><Text style={styles.secondaryText}>Not now</Text></Pressable>}
            </View>
          </View>
        ) : loading ? (
          <View style={styles.status}><ActivityIndicator color={onFill.text} /><Text style={styles.copy}>Working out today's reading…</Text></View>
        ) : failed || !reading ? (
          <View style={styles.body}>
            <Text style={styles.copy}>Today's reading isn't available right now.</Text>
            <Pressable onPress={() => void fetchReading(birth, true)} style={styles.secondary} accessibilityRole="button" accessibilityLabel="Retry daily rashi"><Text style={styles.secondaryText}>Try again</Text></Pressable>
          </View>
        ) : (
          <View style={styles.body}>
            <Text style={styles.sign}>{reading.sign}{reading.nakshatra ? ` · ${reading.nakshatra}` : ""}</Text>
            <Text style={styles.reading}>{reading.text}</Text>
            <Text style={styles.disclaimer}>A traditional interpretation, not a certain prediction.</Text>
            <Pressable onPress={() => void remove()} style={styles.forget} accessibilityRole="button" accessibilityLabel="Remove daily rashi birth details"><Text style={styles.forgetText}>Remove saved details</Text></Pressable>
          </View>
        )}
      </View>

      <Modal visible={setup} animationType="slide" onRequestClose={() => setSetup(false)}>
        <SafeAreaView style={styles.modal}>
          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>Set up your daily rashi</Text>
            <Text style={styles.copyDark}>Your birth details are saved on this device and sent only to calculate this reading. This is a traditional interpretation, not a guarantee.</Text>
            <Text style={styles.fieldLabel}>Birth date · YYYY-MM-DD</Text>
            <TextInput value={birthDate} onChangeText={setBirthDate} placeholder="1995-08-21" keyboardType="numbers-and-punctuation" style={styles.input} accessibilityLabel="Birth date, year month day" />
            <Pressable onPress={() => setTimeKnown((value) => !value)} style={styles.toggle} accessibilityRole="checkbox" accessibilityState={{ checked: !timeKnown }}>
              <View style={[styles.check, !timeKnown && styles.checked]} />
              <Text style={styles.copyDark}>I don't know the birth time</Text>
            </Pressable>
            {timeKnown && <><Text style={styles.fieldLabel}>Birth time · 24 hour</Text><TextInput value={clock} onChangeText={setClock} placeholder="14:30" keyboardType="numbers-and-punctuation" style={styles.input} accessibilityLabel="Birth time, 24 hour" /></>}
            <Text style={styles.fieldLabel}>Birth place</Text>
            {place ? <View style={styles.placeRow}><Text style={styles.copyDark}>{place.label}</Text><Pressable onPress={() => setPlaceOpen(true)} style={styles.formSecondary}><Text style={styles.formSecondaryText}>Change</Text></Pressable></View>
              : <Pressable onPress={() => setPlaceOpen(true)} style={styles.formSecondary}><Text style={styles.formSecondaryText}>Choose birth place</Text></Pressable>}
            {placeOpen && <PlaceChooser remember={false} showLocate={false} square onPick={(picked) => { setPlace(picked); setPlaceOpen(false); }} />}
            {!!error && <Text style={styles.error}>{error}</Text>}
            <View style={styles.actions}>
              <Pressable onPress={() => void saveProfile()} style={styles.primary} accessibilityRole="button" accessibilityLabel="Save and show today's reading"><Text style={styles.primaryText}>Save and continue</Text></Pressable>
              <Pressable onPress={() => setSetup(false)} style={styles.formSecondary} accessibilityRole="button" accessibilityLabel="Cancel setup"><Text style={styles.formSecondaryText}>Cancel</Text></Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: fill.maroon, marginBottom: space.sm },
  heading: { flexDirection: "row", alignItems: "center", gap: space.sm, padding: space.md, borderBottomWidth: 1, borderColor: onFill.faint },
  icon: { width: 32, height: 32, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,248,238,0.14)" },
  headingText: { flex: 1 },
  title: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.base, color: onFill.text },
  subtitle: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.xs, color: onFill.soft, marginTop: 1 },
  edit: { minWidth: 48, minHeight: 44, justifyContent: "center", alignItems: "center" },
  editText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: onFill.text },
  body: { padding: space.md },
  copy: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.sm, lineHeight: 21, color: onFill.soft },
  sign: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.md, color: onFill.gold, marginBottom: 4 },
  reading: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.base, lineHeight: 24, color: onFill.text },
  disclaimer: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.xs, lineHeight: 18, color: onFill.soft, marginTop: space.sm },
  actions: { flexDirection: "row", gap: space.sm, marginTop: space.sm },
  primary: { minHeight: 46, paddingHorizontal: space.md, justifyContent: "center", alignItems: "center", backgroundColor: color.saffronBtn },
  primaryText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: onFill.text },
  secondary: { minHeight: 44, paddingHorizontal: space.md, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,248,238,0.65)" },
  secondaryText: { fontFamily: "Nunito_700Bold", fontWeight: "700", color: onFill.text },
  formSecondary: { minHeight: 44, paddingHorizontal: space.md, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: color.ink },
  formSecondaryText: { fontFamily: "Nunito_700Bold", fontWeight: "700", color: color.ink },
  forget: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center", marginTop: 4 },
  forgetText: { fontFamily: "Nunito_700Bold", fontWeight: "700", color: onFill.soft, textDecorationLine: "underline" },
  status: { flexDirection: "row", alignItems: "center", gap: space.sm, padding: space.md },
  modal: { flex: 1, backgroundColor: color.bg },
  form: { padding: space.lg, paddingBottom: 48 },
  modalTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.xl, color: color.ink, marginBottom: space.sm },
  copyDark: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.sm, lineHeight: 22, color: color.inkSoft },
  fieldLabel: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm, color: color.ink, marginTop: space.md, marginBottom: 5 },
  input: { minHeight: 48, borderWidth: 1, borderColor: color.inkSoft, paddingHorizontal: space.sm, fontFamily: "Nunito_600SemiBold", fontSize: font.sizes.base, color: color.ink, backgroundColor: color.surface },
  toggle: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 48, marginTop: space.xs },
  check: { width: 20, height: 20, borderWidth: 1.5, borderColor: color.inkSoft },
  checked: { backgroundColor: fill.slate, borderColor: fill.slate },
  placeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: space.sm, minHeight: 48 },
  error: { color: color.badText, fontFamily: "Nunito_700Bold", fontWeight: "700", marginTop: space.sm },
});
