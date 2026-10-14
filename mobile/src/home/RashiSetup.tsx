import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { AskBirth } from "../api/client";
import Dropdown from "../components/Dropdown";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { daysInMonth, from24h, parseBirth, to24h } from "../services/birth";
import type { Place } from "../services/place";
import { color, fill, font, onFill, space } from "../theme";
import PlacePicker from "./PlacePicker";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((label, i) => ({ value: String(i + 1), label }));
const HOURS = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));
const MINUTES = Array.from({ length: 60 }, (_, i) => ({ value: String(i).padStart(2, "0"), label: String(i).padStart(2, "0") }));
const MERIDIEMS = [{ value: "AM", label: "AM" }, { value: "PM", label: "PM" }];

export default function RashiSetup({ visible, initial, onClose, onSave, onRemove }: {
  visible: boolean; initial: AskBirth | null; onClose: () => void;
  onSave: (profile: AskBirth) => Promise<void>; onRemove: () => Promise<void>;
}) {
  const reduced = useReducedMotion();
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");
  const [meridiem, setMeridiem] = useState<"AM" | "PM" | "">("");
  const [timeKnown, setTimeKnown] = useState(true);
  const [place, setPlace] = useState<Place | null>(null);
  const [placeOpen, setPlaceOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) { setPlaceOpen(false); return; }
    const [y, m, d] = (initial?.date ?? "").split("-");
    setYear(y ?? ""); setMonth(m ? String(Number(m)) : ""); setDay(d ? String(Number(d)) : "");
    const time = from24h(initial?.time ?? "");
    setHour(time.h12); setMinute(time.min); setMeridiem(time.ampm);
    setTimeKnown(initial?.time_known ?? true);
    setPlace(initial ? { lat: initial.lat, lon: initial.lon, tz: initial.tz, label: initial.label, source: "city" } : null);
    setError(""); setSaving(false);
  }, [visible, initial]);

  const years = useMemo(() => Array.from({ length: new Date().getFullYear() - 1899 }, (_, i) => {
    const value = String(new Date().getFullYear() - i); return { value, label: value };
  }), []);
  const maxDay = month ? daysInMonth(Number(month), Number(year || "2000")) : 31;
  const days = useMemo(() => Array.from({ length: maxDay }, (_, i) => ({ value: String(i + 1), label: String(i + 1) })), [maxDay]);
  useEffect(() => { if (Number(day) > maxDay) setDay(""); }, [day, maxDay]);

  const save = async () => {
    const result = parseBirth(day, month, year, to24h(hour, minute, meridiem), timeKnown, place);
    if ("error" in result) { setError(result.error); return; }
    setSaving(true); setError("");
    try { await onSave(result.birth); }
    catch { setError("Couldn't save your details. Please try again."); }
    finally { setSaving(false); }
  };
  const remove = async () => {
    setSaving(true); setError("");
    try { await onRemove(); }
    catch { setError("Couldn't remove your saved details. Please try again."); }
    finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} animationType={reduced ? "none" : "slide"} onRequestClose={() => { if (!saving) onClose(); }}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">Your daily rashi</Text>
          <Pressable onPress={onClose} disabled={saving} style={styles.close} accessibilityRole="button" accessibilityLabel="Close rashi setup"><Ionicons name="close" size={24} color={color.ink} /></Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.intro}>Choose your birth details once to calculate your Moon sign. Your details are saved on this device and sent when calculating the reading.</Text>
          <Text style={styles.label}>Birth date</Text>
          <View style={styles.fields}>
            <View style={styles.day}><Dropdown value={day} placeholder="Day" label="Birth day" options={days} onPick={setDay} showOptionLabel disabled={saving} /></View>
            <View style={styles.field}><Dropdown value={month} placeholder="Month" label="Birth month" options={MONTHS} onPick={setMonth} showOptionLabel disabled={saving} /></View>
            <View style={styles.field}><Dropdown value={year} placeholder="Year" label="Birth year" options={years} onPick={setYear} showOptionLabel disabled={saving} /></View>
          </View>
          <Text style={styles.label}>Birth time</Text>
          {timeKnown && <View style={styles.fields}>
            <View style={styles.field}><Dropdown value={hour} placeholder="Hour" label="Birth hour" options={HOURS} onPick={setHour} showOptionLabel disabled={saving} /></View>
            <View style={styles.field}><Dropdown value={minute} placeholder="Minute" label="Birth minute" options={MINUTES} onPick={setMinute} showOptionLabel disabled={saving} /></View>
            <View style={styles.field}><Dropdown value={meridiem} placeholder="AM/PM" label="Birth AM or PM" options={MERIDIEMS} onPick={(value) => setMeridiem(value as "AM" | "PM")} showOptionLabel disabled={saving} /></View>
          </View>}
          <Pressable onPress={() => setTimeKnown((value) => !value)} disabled={saving} style={styles.unknown} accessibilityRole="checkbox" accessibilityLabel="I don't know the birth time" accessibilityState={{ checked: !timeKnown }}>
            <View style={[styles.checkbox, !timeKnown && styles.checked]}>{!timeKnown && <Ionicons name="checkmark" size={15} color={onFill.text} />}</View>
            <Text style={styles.intro}>I don't know the birth time</Text>
          </Pressable>
          <Text style={styles.label}>Birth place</Text>
          <Pressable onPress={() => setPlaceOpen(true)} disabled={saving} style={styles.place} accessibilityRole="button" accessibilityLabel={`Choose birth place${place ? `, ${place.label}` : ""}`}>
            <Text style={[styles.placeText, !place && styles.placeholder]}>{place?.label ?? "Choose a city"}</Text>
            <Ionicons name="chevron-down" size={16} color={color.inkSoft} />
          </Pressable>
          {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
          <Pressable onPress={() => void save()} disabled={saving} style={[styles.save, saving && styles.disabled]} accessibilityRole="button" accessibilityState={{ busy: saving }}>
            {saving ? <ActivityIndicator color={onFill.text} /> : <Text style={styles.saveText}>Save and show my reading</Text>}
          </Pressable>
          {!!initial && <Pressable onPress={() => void remove()} disabled={saving} style={styles.remove} accessibilityRole="button"><Text style={styles.removeText}>Remove saved birth details</Text></Pressable>}
        </ScrollView>
        <PlacePicker visible={placeOpen} title="Choose your birth place" showLocate={false} onClose={() => setPlaceOpen(false)} onPick={(next) => { setPlace(next); setPlaceOpen(false); }} />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  header: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.sm },
  title: { flex: 1, fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.md, color: color.ink },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  body: { paddingHorizontal: space.lg, paddingBottom: space.xl },
  intro: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.sm, lineHeight: 22, color: color.inkSoft },
  label: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.base, color: color.ink, marginTop: space.lg, marginBottom: space.xs },
  fields: { flexDirection: "row", gap: space.xs },
  field: { flex: 1, minWidth: 0 },
  day: { flex: 0.8, minWidth: 0 },
  unknown: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 48, marginTop: space.xs },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: color.inkSoft, alignItems: "center", justifyContent: "center" },
  checked: { backgroundColor: fill.slate, borderColor: fill.slate },
  place: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: space.sm, borderRadius: 8, borderWidth: 1.5, borderColor: color.inkSoft, backgroundColor: color.surface, paddingHorizontal: space.sm },
  placeText: { flex: 1, fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.base, color: color.ink },
  placeholder: { color: color.inkFaint },
  error: { fontFamily: "Nunito_700Bold", fontWeight: "700", color: color.badText, marginTop: space.sm },
  save: { minHeight: 48, alignItems: "center", justifyContent: "center", backgroundColor: color.saffronBtn, borderRadius: 8, marginTop: space.lg, padding: space.sm },
  saveText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: onFill.text },
  disabled: { opacity: 0.6 },
  remove: { minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: space.sm },
  removeText: { fontFamily: "Nunito_700Bold", fontWeight: "700", color: color.inkSoft },
});
