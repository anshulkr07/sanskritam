// Home strip, directly under TithiCard. Hidden entirely when the calendar
// is null (404 or offline and empty). No skeleton flash after first load.

import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { t, useLang } from "../../i18n";
import { getKalaPrefs, subscribeKalaPrefs } from "../../kala/prefs";
import { resolvePlace } from "../../kala/useToday";
import { getPlace } from "../../services/place";
import { color, fill, font, onFill, script, space } from "../../theme";
import { plain } from "../../utils/text";
import { PARVA_DAYS_AHEAD, type ParvaCalendar, type ParvaOccurrence } from "../../parva/api";
import { getParvaCalendar } from "../../parva/cache";
import { rescheduleFromCalendar } from "../../parva/reminders";

function startOfToday(tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function relLabel(dateStr: string | null, todayStr: string): string {
  if (!dateStr) return "";
  if (dateStr === todayStr) return t("parva.today");
  const d = new Date(`${dateStr}T00:00:00`);
  const today = new Date(`${todayStr}T00:00:00`);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 1) return t("parva.tomorrow");
  if (diff > 1 && diff < 7) return t("parva.inDays", { count: diff });
  return t("parva.onDate", { date: dateStr });
}

function keyTime(o: ParvaOccurrence): string {
  const par = (o.times ?? []).find((x) => x.key === "parana" && x.start);
  if (par?.start && par.end) return `Parana ${par.start.slice(11, 16)} to ${par.end.slice(11, 16)}`;
  const ti = (o.times ?? []).find((x) => x.key === "tithi" && x.start);
  if (ti?.end) return ti.end.slice(0, 10);
  return "";
}

export default function ParvaStrip() {
  useLang();
  const nav = useNavigation() as unknown as { navigate: (r: string, p?: object) => void };
  const [cal, setCal] = useState<ParvaCalendar | null>(null);
  const [loadedOnce, setLoadedOnce] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const prefs = getKalaPrefs();
        const stored = await getPlace().catch(() => null);
        const { place } = resolvePlace(
          stored ? { lat: stored.lat, lon: stored.lon, tz: stored.tz, label: stored.label } : null,
          prefs.tradition,
        );
        const today = startOfToday(place.tz);
        const data = await getParvaCalendar(
          { lat: place.lat, lon: place.lon, tradition: prefs.tradition, lang: "en" },
          { start: today, days: PARVA_DAYS_AHEAD, tz: place.tz, label: place.label },
        );
        if (alive && data) {
          setCal(data);
          void rescheduleFromCalendar(data);
        }
      } catch {
        /* hidden */
      } finally {
        if (alive) setLoadedOnce(true);
      }
    };
    void load();
    const unsub = subscribeKalaPrefs(() => void load());
    return () => {
      alive = false;
      unsub();
    };
  }, []);

  if (!loadedOnce) return null;
  if (!cal || (cal.occurrences ?? []).length === 0) return null;
  const todayStr = startOfToday("Asia/Kolkata");
  const occs = cal.occurrences;
  const todayOne = occs.find((o) => o.date === todayStr) ?? occs[0];
  const next3 = occs.filter((o) => o !== todayOne).slice(0, 3);

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => nav.navigate("ParvaPage", { slug: todayOne.slug, variant: todayOne.variant, date: todayOne.date ?? undefined })}
        style={({ pressed }) => [styles.today, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`${todayOne.title}. ${relLabel(todayOne.date, todayStr)}`}
      >
        {!!todayOne.art_url && (
          <Image source={{ uri: todayOne.art_url }} style={styles.thumb} accessible={false} importantForAccessibility="no" />
        )}
        <View style={styles.todayText}>
          <Text style={styles.todayTitle} numberOfLines={1}>{plain(todayOne.title)}</Text>
          <Text style={styles.todayMeta} numberOfLines={1}>
            {relLabel(todayOne.date, todayStr)}{keyTime(todayOne) ? `, ${keyTime(todayOne)}` : ""}
          </Text>
        </View>
      </Pressable>
      <View style={styles.comingHead}>
        <Text style={styles.comingLabel}>{t("parva.comingUp")}</Text>
        <Pressable
          onPress={() => nav.navigate("Parva")}
          accessibilityRole="button"
          accessibilityLabel={t("parva.all")}
          style={styles.allHit}
        >
          <Text style={styles.all}>{t("parva.all")}</Text>
        </Pressable>
      </View>
      {next3.map((o) => (
        <Pressable
          key={`${o.slug}_${o.variant}_${o.date}`}
          onPress={() => nav.navigate("ParvaPage", { slug: o.slug, variant: o.variant, date: o.date ?? undefined })}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`${o.title}. ${relLabel(o.date, todayStr)}`}
        >
          <Text style={styles.rowTitle} numberOfLines={1}>{plain(o.title)}</Text>
          <Text style={styles.rowMeta}>{relLabel(o.date, todayStr)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: space.sm, marginBottom: space.sm },
  today: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    minHeight: 64,
    borderRadius: 16,
    padding: space.md,
    backgroundColor: fill.teal,
  },
  pressed: { opacity: 0.9 },
  thumb: { width: 44, height: 44, borderRadius: 8 },
  todayText: { flex: 1, minWidth: 0 },
  todayTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.base, color: onFill.text },
  todayMeta: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.sm, color: onFill.soft },
  comingHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: space.sm, minHeight: 44 },
  comingLabel: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm, color: color.ink },
  allHit: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  all: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm, color: color.ink },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.sm,
    minHeight: 48,
    paddingVertical: space.xs,
    borderTopWidth: 1,
    borderTopColor: color.border,
  },
  rowTitle: { flex: 1, fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.base, color: color.ink },
  rowMeta: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.sm, color: color.inkSoft },
  sa: { ...script("semibold"), fontSize: font.sizes.sm },
});
