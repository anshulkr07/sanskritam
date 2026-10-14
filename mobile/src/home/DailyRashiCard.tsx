import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { api, type AskBirth } from "../api/client";
import { deviceTimeZone, wallClockAt } from "../kala/clock";
import type { Place } from "../services/place";
import { color, fill, font, onFill, space } from "../theme";
import RashiSetup from "./RashiSetup";
import { rashiDateLabel, rashiProfileKey, rashiSummary } from "./rashiReading";

const KEY = "shabd.home.dailyRashi.profile";
const SKIP_KEY = "shabd.home.dailyRashi.skipped";
const READ_KEY = "shabd.home.dailyRashi.reading";
type Reading = { version: 2; date: string; profileKey: string; locationKey: string; text: string; sign: string };

function dateInZone(tz: string): string {
  const { y, m, d } = wallClockAt(new Date(), tz).date;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function DailyRashiCard({ calendarPlace }: { calendarPlace?: Place | null }) {
  const [birth, setBirth] = useState<AskBirth | null>(null);
  const [reading, setReading] = useState<Reading | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [setup, setSetup] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const request = useRef(0);
  const mounted = useRef(true);
  const tz = calendarPlace?.tz ?? deviceTimeZone();
  const locationKey = [tz, calendarPlace?.lat ?? "", calendarPlace?.lon ?? ""].join("|");

  const fetchReading = useCallback(async (profile: AskBirth, force = false) => {
    const id = ++request.current;
    const date = dateInZone(tz);
    const profileKey = rashiProfileKey(profile);
    const current = () => mounted.current && id === request.current;
    setLoading(true); setFailed(false);
    try {
      if (!force) {
        const raw = await AsyncStorage.getItem(READ_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as Reading;
          // Reject old lengthy readings and any reading for another profile/place.
          if (saved.version === 2 && saved.date === date && saved.profileKey === profileKey && saved.locationKey === locationKey && saved.text) {
            if (current()) setReading(saved);
            return;
          }
        }
      }
      const response = await api.askTalk(
        "Give my daily horoscope for today as a concise Home card. Write the summary in two practical sentences, maximum 55 words. Focus on today's mood and one useful everyday intention. No chart tables, degrees, birth-detail recap, remedies, rituals, introductory explanation, sources list or follow-up questions. Keep it a traditional Jyotisha reflection and make no certain predictions or medical/financial promises.",
        { birth: profile, place: calendarPlace, lang: "en" },
      );
      const text = rashiSummary(response);
      if (!response.chart || !text) throw new Error("Daily reading unavailable");
      const next: Reading = { version: 2, date, profileKey, locationKey, text, sign: response.chart.moon_sign_en };
      if (!current()) return;
      await AsyncStorage.setItem(READ_KEY, JSON.stringify(next));
      if (current()) setReading(next);
    } catch { if (current()) setFailed(true); }
    finally { if (current()) setLoading(false); }
  }, [tz, locationKey, calendarPlace]);

  useEffect(() => {
    mounted.current = true;
    void Promise.all([AsyncStorage.getItem(KEY), AsyncStorage.getItem(SKIP_KEY)]).then(([raw, skip]) => {
      if (!mounted.current) return;
      setSkipped(skip === "1");
      if (raw) {
        try { const profile = JSON.parse(raw) as AskBirth; setLoading(true); setBirth(profile); }
        catch { setFailed(true); }
      }
      setReady(true);
    }).catch(() => { if (mounted.current) setReady(true); });
    return () => { mounted.current = false; request.current++; };
  }, []);

  useEffect(() => {
    if (!birth) return;
    void fetchReading(birth);
    const timer = setInterval(() => { void fetchReading(birth); }, 30 * 60_000);
    return () => { request.current++; clearInterval(timer); };
  }, [birth, fetchReading]);

  const saveProfile = async (profile: AskBirth) => {
    await AsyncStorage.multiSet([[KEY, JSON.stringify(profile)], [SKIP_KEY, "0"]]);
    await AsyncStorage.removeItem(READ_KEY);
    request.current++;
    setLoading(true); setBirth(profile); setReading(null); setSkipped(false); setSetup(false);
  };
  const skip = () => {
    setSkipped(true);
    void AsyncStorage.setItem(SKIP_KEY, "1").catch(() => {});
  };
  const remove = async () => {
    request.current++;
    await AsyncStorage.multiRemove([KEY, READ_KEY]);
    await AsyncStorage.setItem(SKIP_KEY, "1");
    setBirth(null); setReading(null); setLoading(false); setFailed(false); setSetup(false); setSkipped(true);
  };

  return (
    <>
      <View style={styles.card}>
        <View style={styles.heading}>
          <View style={styles.icon}><Ionicons name="sunny-outline" size={17} color={onFill.text} /></View>
          <View style={styles.headingText}><Text style={styles.title}>Daily rashi</Text><Text style={styles.subtitle}>Jyotisha · {birth && !birth.time_known ? "Birth time unknown" : "Moon sign reading"}</Text></View>
          {!!birth && <Pressable onPress={() => setSetup(true)} style={styles.edit} accessibilityRole="button" accessibilityLabel="Edit rashi birth details"><Text style={styles.editText}>Edit</Text></Pressable>}
        </View>
        {!ready || (birth && loading && !reading) ? (
          <View style={styles.status}><ActivityIndicator color={onFill.text} /><Text style={styles.copy}>Preparing today's reading…</Text></View>
        ) : !birth ? (
          <View style={styles.body}>
            <Text style={styles.copy}>{skipped ? "Your daily reading is here whenever you're ready." : "Add your birth date, time and place once for a personal Moon sign reading."}</Text>
            <View style={styles.actions}>
              <Pressable onPress={() => setSetup(true)} style={styles.primary} accessibilityRole="button"><Text style={styles.primaryText}>Set up</Text></Pressable>
              {!skipped && <Pressable onPress={skip} style={styles.secondary} accessibilityRole="button"><Text style={styles.secondaryText}>Not now</Text></Pressable>}
            </View>
          </View>
        ) : failed || !reading ? (
          <View style={styles.body}>
            <Text style={styles.copy}>Today's reading isn't available right now.</Text>
            <Pressable onPress={() => void fetchReading(birth, true)} style={styles.secondary} accessibilityRole="button"><Text style={styles.secondaryText}>Try again</Text></Pressable>
          </View>
        ) : (
          <View style={styles.body}>
            <View style={styles.signRow}><Text style={styles.sign}>{reading.sign}</Text><Text style={styles.date}>{rashiDateLabel(reading.date)}</Text></View>
            <Text style={styles.reading}>{reading.text}</Text>
          </View>
        )}
      </View>
      <RashiSetup visible={setup} initial={birth} onClose={() => setSetup(false)} onSave={saveProfile} onRemove={remove} />
    </>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 10, overflow: "hidden", backgroundColor: fill.maroon, marginBottom: space.sm },
  heading: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.sm, borderBottomWidth: 1, borderColor: onFill.faint },
  icon: { width: 32, height: 32, borderRadius: 6, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,248,238,0.14)" },
  headingText: { flex: 1 },
  title: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.base, color: onFill.text },
  subtitle: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.xs, color: onFill.soft, marginTop: 1 },
  edit: { minWidth: 44, minHeight: 44, justifyContent: "center", alignItems: "center" },
  editText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: onFill.text },
  body: { padding: space.md },
  copy: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.sm, lineHeight: 21, color: onFill.soft },
  signRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm, marginBottom: space.xs },
  sign: { flexShrink: 1, fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.md, color: onFill.gold },
  date: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.xs, color: onFill.soft },
  reading: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.base, lineHeight: 24, color: onFill.text },
  actions: { flexDirection: "row", gap: space.sm, marginTop: space.sm },
  primary: { minHeight: 46, borderRadius: 8, paddingHorizontal: space.md, justifyContent: "center", alignItems: "center", backgroundColor: color.saffronBtn },
  primaryText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: onFill.text },
  secondary: { alignSelf: "flex-start", minHeight: 44, borderRadius: 8, paddingHorizontal: space.md, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,248,238,0.65)", marginTop: space.xs },
  secondaryText: { fontFamily: "Nunito_700Bold", fontWeight: "700", color: onFill.text },
  status: { flexDirection: "row", alignItems: "center", gap: space.sm, padding: space.md },
});
