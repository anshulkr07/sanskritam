// Parva list: by month, next 60 days then Load more to 120.
// Filters: All, Vrats, Festivals. Every row opens a useful destination:
// the rich page when published, else the basic verified-dates page.

import { useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAskContext } from "../ask/AskProvider";
import { getLang, subscribeLang, t, useLang } from "../i18n";
import { getKalaPrefs, subscribeKalaPrefs } from "../kala/prefs";
import { resolvePlace } from "../kala/useToday";
import { getPlace } from "../services/place";
import { getParvaCalendar } from "../parva/cache";
import type { ParvaOccurrence } from "../parva/api";
import { PARVA_DAYS_AHEAD, PARVA_MAX_DAYS } from "../parva/api";
import { color, font, space } from "../theme";
import { plain } from "../utils/text";

type Filter = "all" | "vrats" | "festivals";

const VRAT_SLUGS = new Set(["ekadashi", "pradosh", "sankashti", "vinayaka_chaturthi", "masik_shivaratri", "masik_durgashtami", "purnima", "amavasya", "karwa_chauth", "chhath"]);

export default function ParvaScreen() {
  useLang();
  const nav = useNavigation() as unknown as { navigate: (r: string, p?: object) => void };
  const [occs, setOccs] = useState<ParvaOccurrence[]>([]);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(PARVA_DAYS_AHEAD);
  const [filter, setFilter] = useState<Filter>("all");
  const [tradition, setTradition] = useState("north");

  useAskContext("parva", "festivals");

  const load = useCallback(async (d: number) => {
    setLoading(true);
    setFailed(false);
    try {
      const prefs = getKalaPrefs();
      setTradition(prefs.tradition);
      const stored = await getPlace().catch(() => null);
      const { place } = resolvePlace(
        stored ? { lat: stored.lat, lon: stored.lon, tz: stored.tz, label: stored.label } : null,
        prefs.tradition,
      );
      let today = new Date().toISOString().slice(0, 10);
      try {
        today = new Intl.DateTimeFormat("en-CA", { timeZone: place.tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
      } catch {
        /* keep */
      }
      // Request the full window every time: a cached 60-day response never
      // satisfies a 120-day request (window coverage is checked in cache).
      const data = await getParvaCalendar(
        { lat: place.lat, lon: place.lon, tradition: prefs.tradition, lang: getLang() },
        { start: today, days: d, tz: place.tz, label: place.label },
      );
      setOccs(data?.occurrences ?? []);
      if (!data) setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(days);
  }, [days, load]);

  useEffect(() => subscribeKalaPrefs(() => void load(days)), [days, load]);

  useEffect(() => subscribeLang(() => void load(days)), [days, load]);

  const shown = occs.filter((o) => {
    if (filter === "all") return true;
    if (filter === "vrats") return VRAT_SLUGS.has(o.slug);
    return !VRAT_SLUGS.has(o.slug);
  });

  const openOcc = (o: ParvaOccurrence) => {
    nav.navigate("ParvaPage", {
      slug: o.slug,
      variant: o.variant,
      date: o.date ?? undefined,
      dayDate: o.date ?? undefined,
      tradition,
    });
  };

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.title} accessibilityRole="header">{t("parva.title")}</Text>
        <View style={styles.tabs}>
          {(
            [
              ["all", t("parva.filterAll")],
              ["vrats", t("parva.filterVrats")],
              ["festivals", t("parva.filterFestivals")],
            ] as [Filter, string][]
          ).map(([k, label]) => (
            <Pressable
              key={k}
              onPress={() => setFilter(k)}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected: filter === k }}
              style={styles.tabHit}
            >
              <Text style={[styles.tab, filter === k && styles.tabOn]}>{label}</Text>
            </Pressable>
          ))}
        </View>
        {loading && occs.length === 0 ? (
          <Text style={styles.muted}>Loading.</Text>
        ) : failed && occs.length === 0 ? (
          <Pressable onPress={() => void load(days)} accessibilityRole="button" accessibilityLabel={t("parva.retry")} style={styles.retryHit}>
            <Text style={styles.muted}>{t("parva.retry")}</Text>
          </Pressable>
        ) : shown.length === 0 ? (
          <Text style={styles.muted}>{t("parva.empty", { days })}</Text>
        ) : (
          shown.map((o) => (
            <Pressable
              key={`${o.slug}_${o.variant}_${o.date}`}
              onPress={() => openOcc(o)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`${o.title}. ${o.date ?? ""}${o.availability === "verified_dates" ? `. ${t("parva.basicDetail")}` : ""}`}
            >
              <View style={styles.rowText}>
                <Text style={styles.rowTitle} numberOfLines={1}>{plain(o.title)}</Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {o.date ?? ""}{o.availability === "verified_dates" ? `, ${t("parva.openBasic")}` : ""}
                </Text>
              </View>
            </Pressable>
          ))
        )}
        {days < PARVA_MAX_DAYS && (
          <Pressable
            onPress={() => setDays(PARVA_MAX_DAYS)}
            accessibilityRole="button"
            accessibilityLabel={t("parva.loadMore")}
            style={styles.moreHit}
          >
            <Text style={styles.more}>{t("parva.loadMore")}</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  body: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: 120 },
  title: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.lg, color: color.ink, marginBottom: space.xs },
  tabs: { flexDirection: "row", gap: space.md, marginBottom: space.sm },
  tabHit: { minWidth: 44, minHeight: 44, justifyContent: "center" },
  tab: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.base, color: color.inkSoft },
  tabOn: { color: color.ink, textDecorationLine: "underline" },
  row: { minHeight: 56, justifyContent: "center", paddingVertical: space.xs, borderTopWidth: 1, borderTopColor: color.border },
  pressed: { opacity: 0.85 },
  rowText: { gap: 2 },
  rowTitle: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.base, color: color.ink },
  rowMeta: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.sm, color: color.inkSoft },
  muted: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.base, color: color.inkSoft },
  retryHit: { minHeight: 44, justifyContent: "center" },
  moreHit: { minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: space.sm },
  more: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.base, color: color.ink },
});
