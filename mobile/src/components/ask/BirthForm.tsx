// BirthForm — date, time and place of birth, for a kundli answer.
//
// Shown in Talk's Ask mode when an answer needs the asker's own chart. Day,
// month and year are dropdowns and the time is hour, minute and AM/PM
// dropdowns (no date-picker library in the app, and these must go out over
// the air). "I don't know the time" makes a chart with houses counted from
// the Moon. The place is chosen from the bundled city list and is not saved
// as the learner's own place. What is entered stays on this phone
// (services/birth.ts) and goes to the server only with the question, which
// uses it for the calculation and keeps nothing.
//
// With who="partner" the same form takes the other person's details for gun
// milan, and asks which side of the match the learner is: the kootas read
// the boy's side and the girl's.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { AskBirth } from "../../api/client";
import {
  daysInMonth,
  describeBirth,
  forgetBirth,
  forgetPartner,
  from24h,
  parseBirth,
  setBirth,
  setPartner,
  to24h,
} from "../../services/birth";
import { haptics } from "../../services/haptics";
import type { Place } from "../../services/place";
import { color, fill, font, onFill, outline, space } from "../../theme";
import Dropdown from "../Dropdown";
import PlaceChooser from "../PlaceChooser";

const MONTHS = [
  { value: "1", label: "Jan" },
  { value: "2", label: "Feb" },
  { value: "3", label: "Mar" },
  { value: "4", label: "Apr" },
  { value: "5", label: "May" },
  { value: "6", label: "Jun" },
  { value: "7", label: "Jul" },
  { value: "8", label: "Aug" },
  { value: "9", label: "Sep" },
  { value: "10", label: "Oct" },
  { value: "11", label: "Nov" },
  { value: "12", label: "Dec" },
];

function yearOptions(today: Date): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  for (let y = today.getFullYear(); y >= 1900; y--) out.push({ value: String(y), label: String(y) });
  return out;
}

function dayOptions(month: string, year: string): { value: string; label: string }[] {
  const m = parseInt(month || "1", 10);
  const y = parseInt(year || String(new Date().getFullYear()), 10);
  const n = daysInMonth(m || 1, y || 2000);
  const out: { value: string; label: string }[] = [];
  for (let d = 1; d <= n; d++) out.push({ value: String(d), label: String(d) });
  return out;
}

function hourOptions(): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  for (let h = 1; h <= 12; h++) out.push({ value: String(h), label: String(h) });
  return out;
}

function minuteOptions(): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  for (let m = 0; m < 60; m++) out.push({ value: String(m).padStart(2, "0"), label: String(m).padStart(2, "0") });
  return out;
}

export default function BirthForm({
  initial,
  onDone,
  onCancel,
  who = "self",
  initialAskerIs = "boy",
}: {
  initial: AskBirth | null;
  onDone: (birth: AskBirth, askerIs: "boy" | "girl") => void;
  onCancel: () => void;
  who?: "self" | "partner";
  initialAskerIs?: "boy" | "girl";
}) {
  const partner = who === "partner";
  const [askerIs, setAskerIs] = useState<"boy" | "girl">(initialAskerIs);
  const initDay = initial ? String(parseInt(initial.date.slice(8, 10), 10)) : "";
  const initMonth = initial ? String(parseInt(initial.date.slice(5, 7), 10)) : "";
  const initYear = initial ? initial.date.slice(0, 4) : "";
  const initClock = initial?.time ? from24h(initial.time) : { h12: "", min: "", ampm: "" as const };
  const [day, setDay] = useState(initDay);
  const [month, setMonth] = useState(initMonth);
  const [year, setYear] = useState(initYear);
  const [hour, setHour] = useState(initClock.h12);
  const [minute, setMinute] = useState(initClock.min);
  const [ampm, setAmpm] = useState<"AM" | "PM" | "">(initClock.ampm);
  const [timeKnown, setTimeKnown] = useState(initial ? initial.time_known : true);
  const [place, setPlaceState] = useState<{ lat: number; lon: number; tz: string; label: string } | null>(
    initial ? { lat: initial.lat, lon: initial.lon, tz: initial.tz, label: initial.label } : null,
  );
  const [choosing, setChoosing] = useState(false);
  const [error, setError] = useState("");
  const today = new Date();

  const submit = () => {
    const days = daysInMonth(parseInt(month || "1", 10), parseInt(year || "2000", 10));
    let d = day;
    if (parseInt(day || "0", 10) > days) {
      d = String(days);
      setDay(d);
    }
    if (timeKnown && hour && minute && !ampm) {
      setError("Choose AM or PM.");
      haptics.near();
      return;
    }
    const clock = timeKnown ? to24h(hour, minute, ampm) : "";
    const out = parseBirth(d, month, year, clock || ":", timeKnown, place);
    if ("error" in out) {
      setError(out.error);
      haptics.near();
      return;
    }
    haptics.press();
    if (partner) void setPartner({ birth: out.birth, askerIs });
    else void setBirth(out.birth);
    onDone(out.birth, askerIs);
  };

  if (choosing) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.head}>Place of birth</Text>
        <PlaceChooser
          remember={false}
          showLocate={false}
          onPick={(p: Place) => {
            setPlaceState({ lat: p.lat, lon: p.lon, tz: p.tz, label: p.label });
            setChoosing(false);
            setError("");
          }}
        />
        <Pressable onPress={() => setChoosing(false)} accessibilityRole="button" accessibilityLabel="Back" style={styles.textBtn}>
          <Text style={styles.textBtnText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.head}>{partner ? "Your partner's birth details" : "Your birth details"}</Text>
      <Text style={styles.sub}>
        {partner ? "Kept on this phone. Used only to match the two charts." : "Kept on this phone. Used only to work out your chart."}
      </Text>

      {partner && (
        <>
          <Text style={styles.label}>You are</Text>
          <View style={styles.row}>
            {(["boy", "girl"] as const).map((side) => (
              <Pressable
                key={side}
                onPress={() => {
                  haptics.tap();
                  setAskerIs(side);
                }}
                style={[styles.side, askerIs === side && styles.sideOn]}
                accessibilityRole="radio"
                accessibilityLabel={side === "boy" ? "The boy" : "The girl"}
                accessibilityState={{ selected: askerIs === side }}
              >
                <Text style={[styles.sideText, askerIs === side && styles.sideTextOn]}>
                  {side === "boy" ? "The boy" : "The girl"}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      <Text style={styles.label}>Date of birth</Text>
      <View style={styles.row}>
        <Dropdown value={day} placeholder="Day" label="Day of birth" options={dayOptions(month, year)} onPick={(v) => setDay(v)} />
        <Dropdown value={month} placeholder="Month" label="Month of birth" options={MONTHS} onPick={(v) => {
          setMonth(v);
          const n = daysInMonth(parseInt(v, 10), parseInt(year || "2000", 10));
          if (parseInt(day || "0", 10) > n) setDay(String(n));
        }} />
        <Dropdown value={year} placeholder="Year" label="Year of birth" options={yearOptions(today)} onPick={setYear} />
      </View>

      <Text style={styles.label}>Time of birth</Text>
      <View style={styles.row}>
        <Dropdown value={hour} placeholder="Hour" label="Hour of birth" options={hourOptions()} onPick={setHour} disabled={!timeKnown} />
        <Dropdown value={minute} placeholder="Min" label="Minute of birth" options={minuteOptions()} onPick={setMinute} disabled={!timeKnown} />
        <Dropdown
          value={ampm}
          placeholder="AM/PM"
          label="AM or PM"
          options={[
            { value: "AM", label: "AM" },
            { value: "PM", label: "PM" },
          ]}
          onPick={(v) => setAmpm(v as "AM" | "PM")}
          disabled={!timeKnown}
        />
        <Pressable
          onPress={() => {
            haptics.tap();
            setTimeKnown((v) => !v);
          }}
          style={styles.check}
          accessibilityRole="checkbox"
          accessibilityLabel="I do not know the time"
          accessibilityState={{ checked: !timeKnown }}
        >
          <Ionicons name={timeKnown ? "square-outline" : "checkbox"} size={20} color={color.ink} />
          <Text style={styles.checkText}>I don't know the time</Text>
        </Pressable>
      </View>

      <Text style={styles.label}>Place of birth</Text>
      <Pressable
        onPress={() => setChoosing(true)}
        accessibilityRole="button"
        accessibilityLabel={place ? `Place of birth: ${place.label}` : "Choose the place of birth"}
        style={styles.placeRow}
      >
        <Text style={[styles.placeText, !place && { color: color.inkFaint }]}>{place?.label || "Choose a city"}</Text>
        <Ionicons name="chevron-forward" size={16} color={color.inkFaint} />
      </Pressable>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.actions}>
        <Pressable onPress={submit} style={styles.primary} accessibilityRole="button" accessibilityLabel={partner ? "Match our charts" : "Read my chart"}>
          <Text style={styles.primaryText}>{partner ? "Match our charts" : "Read my chart"}</Text>
        </Pressable>
        <Pressable onPress={onCancel} style={styles.textBtn} accessibilityRole="button" accessibilityLabel="Not now">
          <Text style={styles.textBtnText}>Not now</Text>
        </Pressable>
      </View>

      {!!initial && (
        <Pressable
          onPress={() => {
            void (partner ? forgetPartner() : forgetBirth());
            onCancel();
          }}
          accessibilityRole="button"
          accessibilityLabel={`Forget ${describeBirth(initial)}`}
          style={styles.textBtn}
        >
          <Text style={styles.forget}>Forget {describeBirth(initial)}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs, paddingVertical: space.xs },
  head: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 17, color: color.ink },
  sub: { fontFamily: "Nunito_500Medium", fontWeight: "500", fontSize: font.sizes.sm, color: color.inkSoft },
  label: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: 11,
    color: color.inkSoft,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: space.xs,
  },
  row: { flexDirection: "row", alignItems: "center", gap: space.xs, flexWrap: "wrap" },
  side: {
    minHeight: 44,
    paddingHorizontal: space.md,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: outline,
    alignItems: "center",
    justifyContent: "center",
  },
  sideOn: { backgroundColor: fill.ink, borderColor: fill.ink },
  sideText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: color.ink },
  sideTextOn: { color: onFill.text },
  check: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44 },
  checkText: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.sm, color: color.ink },
  placeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
    borderWidth: 1.5,
    borderColor: outline,
    borderRadius: 12,
    backgroundColor: color.white,
    paddingHorizontal: space.sm,
  },
  placeText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.base, color: color.ink },
  error: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.sm, color: color.badText },
  actions: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.xs },
  primary: {
    minHeight: 44,
    paddingHorizontal: space.md,
    borderRadius: 12,
    backgroundColor: fill.saffron,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm, color: onFill.text },
  textBtn: { minHeight: 44, justifyContent: "center", paddingHorizontal: space.xs },
  textBtnText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm, color: color.saffronText },
  forget: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: 13, color: color.inkSoft },
});
