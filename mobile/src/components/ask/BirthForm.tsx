// BirthForm — date, time and place of birth, for a kundli answer.
//
// Shown in Talk's Ask mode when an answer needs the asker's own chart. Day,
// month and year are separate number boxes (no date-picker library in the
// app), the time is 24-hour, and "I don't know the time" makes a chart with
// houses counted from the Moon. The place is chosen from the bundled city
// list and is not saved as the learner's own place. What is entered stays on
// this phone (services/birth.ts) and goes to the server only with the
// question, which uses it for the calculation and keeps nothing.
//
// With who="partner" the same form takes the other person's details for gun
// milan, and asks which side of the match the learner is: the kootas read
// the boy's side and the girl's.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import type { AskBirth } from "../../api/client";
import {
  describeBirth,
  forgetBirth,
  forgetPartner,
  parseBirth,
  setBirth,
  setPartner,
} from "../../services/birth";
import { haptics } from "../../services/haptics";
import type { Place } from "../../services/place";
import { color, fill, font, onFill, outline, space } from "../../theme";
import PlaceChooser from "../PlaceChooser";

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
  const [day, setDay] = useState(initial ? String(parseInt(initial.date.slice(8, 10), 10)) : "");
  const [month, setMonth] = useState(initial ? String(parseInt(initial.date.slice(5, 7), 10)) : "");
  const [year, setYear] = useState(initial ? initial.date.slice(0, 4) : "");
  const [clock, setClock] = useState(initial?.time ?? "");
  const [timeKnown, setTimeKnown] = useState(initial ? initial.time_known : true);
  const [place, setPlaceState] = useState<{ lat: number; lon: number; tz: string; label: string } | null>(
    initial ? { lat: initial.lat, lon: initial.lon, tz: initial.tz, label: initial.label } : null,
  );
  const [choosing, setChoosing] = useState(false);
  const [error, setError] = useState("");

  const submit = () => {
    const out = parseBirth(day, month, year, clock, timeKnown, place);
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
        <Pressable onPress={() => setChoosing(false)} accessibilityRole="button" style={styles.textBtn}>
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
        <TextInput
          value={day}
          onChangeText={(t) => setDay(t.replace(/\D/g, "").slice(0, 2))}
          placeholder="DD"
          placeholderTextColor={color.inkFaint}
          keyboardType="number-pad"
          style={[styles.input, styles.short]}
          accessibilityLabel="Day of birth"
        />
        <TextInput
          value={month}
          onChangeText={(t) => setMonth(t.replace(/\D/g, "").slice(0, 2))}
          placeholder="MM"
          placeholderTextColor={color.inkFaint}
          keyboardType="number-pad"
          style={[styles.input, styles.short]}
          accessibilityLabel="Month of birth"
        />
        <TextInput
          value={year}
          onChangeText={(t) => setYear(t.replace(/\D/g, "").slice(0, 4))}
          placeholder="YYYY"
          placeholderTextColor={color.inkFaint}
          keyboardType="number-pad"
          style={[styles.input, styles.long]}
          accessibilityLabel="Year of birth"
        />
      </View>

      <Text style={styles.label}>Time of birth (24-hour)</Text>
      <View style={styles.row}>
        <TextInput
          value={clock}
          onChangeText={(t) => setClock(t.replace(/[^\d:.]/g, "").slice(0, 5))}
          placeholder="HH:MM"
          placeholderTextColor={color.inkFaint}
          keyboardType="numbers-and-punctuation"
          editable={timeKnown}
          style={[styles.input, styles.long, !timeKnown && styles.off]}
          accessibilityLabel="Time of birth, 24-hour"
        />
        <Pressable
          onPress={() => {
            haptics.tap();
            setTimeKnown((v) => !v);
          }}
          style={styles.check}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: !timeKnown }}
        >
          <Ionicons name={timeKnown ? "square-outline" : "checkbox"} size={20} color={color.ink} />
          <Text style={styles.checkText}>I don't know the time</Text>
        </Pressable>
      </View>

      <Text style={styles.label}>Place of birth</Text>
      <Pressable onPress={() => setChoosing(true)} accessibilityRole="button" style={styles.placeRow}>
        <Text style={[styles.placeText, !place && { color: color.inkFaint }]}>{place?.label || "Choose a city"}</Text>
        <Ionicons name="chevron-forward" size={16} color={color.inkFaint} />
      </Pressable>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.actions}>
        <Pressable onPress={submit} style={styles.primary} accessibilityRole="button">
          <Text style={styles.primaryText}>{partner ? "Match our charts" : "Read my chart"}</Text>
        </Pressable>
        <Pressable onPress={onCancel} style={styles.textBtn} accessibilityRole="button">
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
  input: {
    minHeight: 44,
    borderWidth: 1.5,
    borderColor: outline,
    borderRadius: 12,
    backgroundColor: color.white,
    paddingHorizontal: space.sm,
    fontFamily: "Nunito_700Bold",
    fontSize: font.sizes.base,
    color: color.ink,
    textAlign: "center",
  },
  short: { width: 64 },
  long: { width: 96 },
  off: { opacity: 0.4 },
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
