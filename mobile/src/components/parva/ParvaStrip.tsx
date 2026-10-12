// Home strip, directly under TithiCard. Hidden entirely when the calendar
// is null (404 or offline and empty). No skeleton flash after first load.

import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
import { AppState, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { getLang, subscribeLang, t, useLang } from "../../i18n";
import { getKalaPrefs, subscribeKalaPrefs } from "../../kala/prefs";
import { resolvePlace } from "../../kala/useToday";
import { getPlace } from "../../services/place";
import { color, fill, font, onFill, script, space } from "../../theme";
import { plain } from "../../utils/text";
import { PARVA_DAYS_AHEAD, type ParvaCalendar, type ParvaOccurrence } from "../../parva/api";
import { getParvaCalendar } from "../../parva/cache";
import { rescheduleFromCalendar } from "../../parva/reminders";
import { activeDayFor, rankOccurrences, seriesDayNumber } from "../../parva/select";

function startOfToday(tz: string, at?: Date): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(at ?? new Date());
  } catch {
    return (at ?? new Date()).toISOString().slice(0, 10);
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

/** Main-card subtitle: `Navaratri, Day 2: Brahmacharini` when a series day is active. */
function mainSubtitle(o: ParvaOccurrence, todayStr: string): string {
  const active = activeDayFor(o, todayStr);
  if (active) {
    const days = o.day ?? [];
    const n = seriesDayNumber(days, todayStr);
    const name = active.label ?? active.form_key ?? "";
    if (n > 0 && name) return t("parva.seriesToday", { title: plain(o.title), n, day: plain(name) });
    if (name) return `${plain(o.title)}: ${plain(name)}`;
  }
  const rel = relLabel(o.date, todayStr);
  const kt = keyTime(o);
  return kt ? `${rel}, ${kt}` : rel;
}

export default function ParvaStrip() {
  useLang();
  const nav = useNavigation() as unknown as { navigate: (r: string, p?: object) => void };
  const [cal, setCal] = useState<ParvaCalendar | null>(null);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [todayStr, setTodayStr] = useState(() => startOfToday("Asia/Kolkata"));
  const [tradition, setTradition] = useState("north");

  const load = useCallback(async () => {
    try {
      const prefs = getKalaPrefs();
      setTradition(prefs.tradition);
      const stored = await getPlace().catch(() => null);
      const { place } = resolvePlace(
        stored ? { lat: stored.lat, lon: stored.lon, tz: stored.tz, label: stored.label } : null,
        prefs.tradition,
      );
      const today = startOfToday(place.tz);
      setTodayStr(today);
      const lang = getLang();
      const data = await getParvaCalendar(
        { lat: place.lat, lon: place.lon, tradition: prefs.tradition, lang },
        { start: today, days: PARVA_DAYS_AHEAD, tz: place.tz, label: place.label },
      );
      setCal(data);
      if (data) void rescheduleFromCalendar(data, { tradition: prefs.tradition, tz: place.tz });
    } catch {
      /* hidden */
    } finally {
      setLoadedOnce(true);
    }
  }, []);

  useEffect(() => {
    void load();
    const unsubPrefs = subscribeKalaPrefs(() => void load());
    const unsubLang = subscribeLang(() => void load());
    // Day rollover while open: re-rank every minute on the minute.
    // Android returns a number for setTimeout — keep the handle free of any
    // metadata. Attaching an interval handle to it here (startTimer.iv)
    // destroyed the UI at the first minute tick, exactly like useToday.ts.
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        void load();
        schedule();
      }, 60000 - (Date.now() % 60000) + 50);
    };
    schedule();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void load();
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
      unsubPrefs();
      unsubLang();
    };
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!loadedOnce) return null;
  if (!cal || (cal.occurrences ?? []).length === 0) return null;
  const occs = cal.occurrences;
  const { main, supporting, upcoming } = rankOccurrences(occs, todayStr);
  if (!main) return null;
  const next3 = upcoming.slice(0, 3);

  // Every item has a useful destination: rich page when published, else the
  // basic verified-dates page. Nothing ignores a tap.
  const openOcc = (o: ParvaOccurrence) => {
    const active = activeDayFor(o, todayStr);
    nav.navigate("ParvaPage", {
      slug: o.slug,
      variant: o.variant,
      date: o.date ?? undefined,
      dayDate: active?.date ?? o.date ?? undefined,
      tradition,
    });
  };

  const mainActive = activeDayFor(main, todayStr);

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => openOcc(main)}
        style={({ pressed }) => [styles.today, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`${plain(main.title)}. ${mainSubtitle(main, todayStr)}`}
      >
        {!!main.art_url && (
          <Image source={{ uri: main.art_url }} style={styles.thumb} accessible={false} importantForAccessibility="no" />
        )}
        <View style={styles.todayText}>
          <Text style={styles.todayTitle} numberOfLines={1}>{plain(main.title)}</Text>
          <Text style={styles.todayMeta} numberOfLines={2}>
            {mainSubtitle(main, todayStr)}
          </Text>
          {mainActive?.label ? (
            <Text style={styles.todayDevi} numberOfLines={1}>{plain(mainActive.label)}</Text>
          ) : null}
        </View>
      </Pressable>
      {supporting.length > 0 && (
        <View style={styles.supportBlock}>
          <Text style={styles.supportLabel}>{t("parva.supporting")}</Text>
          {supporting.slice(0, 2).map((o) => (
            <Pressable
              key={`s_${o.slug}_${o.variant}_${o.date}`}
              onPress={() => openOcc(o)}
              style={({ pressed }) => [styles.supportRow, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`${o.title}. ${relLabel(o.date, todayStr)}`}
            >
              <Text style={styles.supportTitle} numberOfLines={1}>{plain(o.title)}</Text>
              <Text style={styles.supportMeta}>{relLabel(o.date, todayStr)}</Text>
            </Pressable>
          ))}
        </View>
      )}
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
          onPress={() => openOcc(o)}
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
  todayDevi: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm, color: onFill.text },
  supportBlock: { marginTop: space.xs },
  supportLabel: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: color.inkSoft },
  supportRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.sm,
    minHeight: 44,
    paddingVertical: 6,
  },
  supportTitle: { flex: 1, fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.sm, color: color.inkSoft },
  supportMeta: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.sm, color: color.inkSoft },
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
