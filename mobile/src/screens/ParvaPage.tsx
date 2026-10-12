// Parva page: painting header, times, why, do, vrat, texts, dont,
// regions, ask, share. Series open on today's day with a day row.
// Sections hide when empty. One-line errors only.

import { captureRef } from "react-native-view-shot";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Image, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";

import { useAsk, useAskContext } from "../ask/AskProvider";
import { getLang, t, useLang } from "../i18n";
import { getKalaPrefs } from "../kala/prefs";
import { dayWindows, sunDay } from "../kala/engine";
import { wallClockAt, localMidnight } from "../kala/clock";
import { TITHIS } from "../kala/sanskritNames";
import { resolvePlace } from "../kala/useToday";
import type { RootStackParamList } from "../navigation/types";
import { parvaCalendar, parvaPage, shraddhaDate, type ParvaPageBody } from "../parva/api";
import { ensurePermission, followedSlugs, setFollowed } from "../parva/reminders";
import { getPlace } from "../services/place";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useTypeScale } from "../hooks/useTypeScale";
import { color, fill, font, onFill, script, space } from "../theme";
import { plain } from "../utils/text";

type Props = NativeStackScreenProps<RootStackParamList, "ParvaPage">;

interface Item {
  text?: string;
  basis?: string;
  text_name?: string;
  ref?: string;
  source_url?: string;
  region?: string;
}

function basisLabel(it: Item, placeLabel: string): string {
  if (it.basis === "text" && it.text_name) return t("parva.basisText", { name: it.text_name, ref: it.ref ?? "" });
  if (it.basis === "calc") return t("parva.basisCalc", { place: placeLabel });
  if (it.basis === "custom") {
    const r = it.region && it.region !== "all" ? it.region : "";
    return r ? t("parva.basisCustom", { region: r }) : t("parva.basisCustomAll");
  }
  return "";
}

function dateLabel(dateStr: string | null | undefined, todayStr: string): string {
  if (!dateStr) return "";
  if (dateStr === todayStr) return t("parva.today");
  const d = new Date(`${dateStr}T00:00:00`);
  const today = new Date(`${todayStr}T00:00:00`);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 1) return t("parva.tomorrow");
  return dateStr;
}

function midnightUtcForDate(dateStr: string, tz: string): Date | null {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    let guess = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    for (let i = 0; i < 3; i++) {
      const clock = wallClockAt(guess, tz);
      const same = clock.date.y === y && clock.date.m === m && clock.date.d === d;
      if (!same) {
        const want = Date.UTC(y, m - 1, d);
        const got = Date.UTC(clock.date.y, clock.date.m - 1, clock.date.d);
        guess = new Date(guess.getTime() + (want - got));
        continue;
      }
      return localMidnight(guess, clock);
    }
    return null;
  } catch {
    return null;
  }
}

export default function ParvaPageScreen({ route, navigation }: Props) {
  useLang();
  const { sized } = useTypeScale();
  const reduced = useReducedMotion();
  const ask = useAsk();
  const { slug, variant, date } = route.params as { slug: string; variant?: string; date?: string };
  const [page, setPage] = useState<ParvaPageBody | null>(null);
  const [occTitle, setOccTitle] = useState("");
  const [failed, setFailed] = useState(false);
  const [placeLabel, setPlaceLabel] = useState("");
  const [placeTz, setPlaceTz] = useState("Asia/Kolkata");
  const [followed, setFollowedState] = useState<string[]>([]);
  const [todayStr, setTodayStr] = useState("");
  const [dayIdx, setDayIdx] = useState(0);
  const [doOpen, setDoOpen] = useState(false);
  const [doStep, setDoStep] = useState(0);
  const [shrTithi, setShrTithi] = useState(30);
  const [shrResult, setShrResult] = useState<string | null>(null);
  const shareRef = useRef<View | null>(null);

  useAskContext("parva", slug);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const stored = await getPlace().catch(() => null);
        const prefs = getKalaPrefs();
        const { place } = resolvePlace(
          stored ? { lat: stored.lat, lon: stored.lon, tz: stored.tz, label: stored.label } : null,
          prefs.tradition,
        );
        if (!alive) return;
        setPlaceLabel(place.label);
        setPlaceTz(place.tz);
        try {
          setTodayStr(new Intl.DateTimeFormat("en-CA", { timeZone: place.tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()));
        } catch {
          setTodayStr(new Date().toISOString().slice(0, 10));
        }
        setFollowedState(await followedSlugs());
        const lang = getLang();
        const y = date ? Number(date.slice(0, 4)) : new Date().getFullYear();
        const data = await parvaPage({
          slug,
          variant: variant ?? "",
          lang,
          year: y,
          lat: Math.round(place.lat * 10) / 10,
          lon: Math.round(place.lon * 10) / 10,
          tz: place.tz,
        });
        if (!alive) return;
        if (!data) setFailed(true);
        else {
          setPage(data);
          // Occurrence title for the hero (the page body carries no title).
          try {
            const cal = await parvaCalendar({
              start: `${y}-01-01`,
              days: 366,
              lat: Math.round(place.lat * 10) / 10,
              lon: Math.round(place.lon * 10) / 10,
              tz: place.tz,
              tradition: prefs.tradition,
              lang,
            });
            const hit = cal?.occurrences.find(
              (o) => o.slug === slug && (!variant || o.variant === variant),
            );
            if (hit) setOccTitle(hit.title);
          } catch {
            /* title stays as the slug */
          }
        }
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug, variant, date]);

  const body = (page?.body ?? {}) as Record<string, unknown>;
  const why = (body.why as Item[] | undefined) ?? [];
  const gather = ((body.do as { gather?: Item[] } | undefined)?.gather) ?? [];
  const steps = ((body.do as { steps?: Item[] } | undefined)?.steps) ?? [];
  const vrat = (body.vrat as Record<string, Item[]> | undefined) ?? {};
  const dont = (body.dont as Item[] | undefined) ?? [];
  const texts = (body.texts as Record<string, unknown>[] | undefined) ?? [];
  const regions = (body.regions as { region?: string; items?: Item[] }[] | undefined) ?? [];
  const seriesDays = (body.series_days as { tithi_key?: string; form_key?: string; summary?: string; steps?: Item[] }[] | undefined) ?? [];
  // Calendar day entries (tithi days with forms) arrive on the page payload;
  // the seeds carry no series_days of their own yet.
  const calDays = ((page as unknown as { day?: { date?: string; label?: string; form_key?: string; tithi_key?: string }[] } | null)?.day) ?? [];
  const dayRow = seriesDays.length > 0
    ? seriesDays.map((d) => ({ key: d.tithi_key ?? "", label: d.summary ?? d.tithi_key ?? "" }))
    : calDays.map((d, i) => ({ key: `${d.tithi_key}_${i}`, label: d.label ?? d.date ?? "" }));
  const summary = typeof body.summary === "string" ? body.summary : "";
  const heroTitle = occTitle || (variant ? variant.replace(/_/g, " ") : slug.replace(/_/g, " "));

  const rahuAbhijit = useMemo(() => {
    if (!date) return [];
    const mid = midnightUtcForDate(date, placeTz);
    if (!mid) return [];
    try {
      const sun = sunDay(mid, { lat: 28.6, lon: 77.2 });
      if (!sun) return [];
      const wd = new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)))).getUTCDay();
      return dayWindows(sun, wd).filter((w) => w.key === "rahu" || w.key === "abhijit");
    } catch {
      return [];
    }
  }, [date, placeTz]);

  const toggleFollow = async () => {
    const on = !followed.includes(slug);
    if (on) {
      const ok = await ensurePermission();
      if (!ok) return;
    }
    setFollowedState(await setFollowed(slug, on));
  };

  const doShare = async () => {
    const text = t("parva.sharedText", { title: slug, date: date ?? "", summary: plain(summary).slice(0, 120) });
    try {
      const uri = await captureRef(shareRef, { format: "png", result: "tmpfile" });
      let done = false;
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Sharing = require("expo-sharing") as { shareAsync?: (u: string) => Promise<void> };
        if (Sharing.shareAsync) {
          await Sharing.shareAsync(uri);
          done = true;
        }
      } catch {
        /* fall through to text */
      }
      try {
        const FS = await import("expo-file-system/legacy");
        await FS.deleteAsync(uri, { idempotent: true }).catch(() => {});
      } catch {
        /* ignore */
      }
      if (!done) await Share.share({ message: text });
    } catch {
      try {
        await Share.share({ message: text });
      } catch {
        /* ignore */
      }
    }
  };

  const findShraddha = async () => {
    setShrResult(null);
    try {
      const stored = await getPlace().catch(() => null);
      const prefs = getKalaPrefs();
      const { place } = resolvePlace(
        stored ? { lat: stored.lat, lon: stored.lon, tz: stored.tz, label: stored.label } : null,
        prefs.tradition,
      );
      const y = date ? Number(date.slice(0, 4)) : new Date().getFullYear();
      const r = await shraddhaDate({ tithi: shrTithi, year: y, lat: Math.round(place.lat * 10) / 10, lon: Math.round(place.lon * 10) / 10, tz: place.tz });
      setShrResult(r?.date ?? null);
    } catch {
      setShrResult(null);
    }
  };

  useEffect(() => {
    if (!doOpen) return;
    let off: (() => void) | null = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const K = require("expo-keep-awake") as {
        activateKeepAwakeAsync?: () => Promise<void>;
        deactivateKeepAwake?: () => void;
        deactivateKeepAwakeAsync?: () => Promise<void>;
      };
      void K.activateKeepAwakeAsync?.().catch(() => {});
      off = () => {
        try {
          if (K.deactivateKeepAwakeAsync) void K.deactivateKeepAwakeAsync().catch(() => {});
          else K.deactivateKeepAwake?.();
        } catch {
          /* ignore */
        }
      };
    } catch {
      off = null;
    }
    return () => {
      off?.();
    };
  }, [doOpen]);

  if (failed && !page) {
    return (
      <View style={styles.page}>
        <Text style={styles.error}>Could not load this page. Go back and retry.</Text>
      </View>
    );
  }
  if (!page) {
    return (
      <View style={styles.page}>
        <Text style={styles.muted}>Loading.</Text>
      </View>
    );
  }

  const isSeries = slug === "sharad_navaratri" || slug === "chaitra_navaratri" || slug === "pitru_paksha" || slug === "diwali_days";

  return (
    <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
      <View ref={shareRef} collapsable={false}>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>{plain(heroTitle)}</Text>
          <Text style={styles.heroDate}>{dateLabel(date, todayStr)}</Text>
        </View>
        {!!summary && <Text style={styles.summary}>{plain(summary)}</Text>}
      </View>

      {((page.times ?? []).length > 0 || rahuAbhijit.length > 0) && (
        <View style={styles.section}>
          <Text style={styles.label} accessibilityRole="header">{t("parva.times")}</Text>
          {(page.times ?? []).map((tm, i) => (
            <View key={`${tm.key}_${i}`} style={styles.timeRow}>
              <Text style={styles.timeKey}>{tm.key}</Text>
              <Text style={styles.timeVal} numberOfLines={1}>
                {(tm.start ?? "").slice(0, 16)} to {(tm.end ?? "").slice(0, 16)}
              </Text>
              <Text style={styles.basis}>{t("parva.basisCalc", { place: placeLabel })}</Text>
            </View>
          ))}
          {rahuAbhijit.map((w) => (
            <View key={w.key} style={styles.timeRow}>
              <Text style={styles.timeKey}>{w.key}</Text>
              <Text style={styles.timeVal} numberOfLines={1}>
                {w.start.toISOString().slice(11, 16)} to {w.end.toISOString().slice(11, 16)}
              </Text>
              <Text style={styles.basis}>{t("parva.basisCalc", { place: placeLabel })}</Text>
            </View>
          ))}
        </View>
      )}

      {why.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label} accessibilityRole="header">{t("parva.why")}</Text>
          {why.map((it, i) => (
            <View key={i} style={styles.stepRow}>
              <Text style={styles.stepNum}>{i + 1}.</Text>
              <View style={styles.stepText}>
                <Text style={styles.step}>{plain(it.text ?? "")}</Text>
                {!!basisLabel(it, placeLabel) && <Text style={styles.basis}>{basisLabel(it, placeLabel)}</Text>}
              </View>
            </View>
          ))}
        </View>
      )}

      {(gather.length > 0 || steps.length > 0) && (
        <View style={styles.section}>
          <Text style={styles.label} accessibilityRole="header">{t("parva.whatToDo")}</Text>
          {gather.length > 0 && <Text style={styles.sub}>{t("parva.gather")}</Text>}
          {gather.map((it, i) => (
            <View key={i} style={styles.bulletRow}>
              <Text style={styles.bullet}>-</Text>
              <View style={styles.stepText}>
                <Text style={styles.step}>{plain(it.text ?? "")}</Text>
                {!!basisLabel(it, placeLabel) && <Text style={styles.basis}>{basisLabel(it, placeLabel)}</Text>}
              </View>
            </View>
          ))}
          {steps.map((it, i) => (
            <View key={i} style={styles.stepRow}>
              <Text style={styles.stepNum}>{i + 1}.</Text>
              <View style={styles.stepText}>
                <Text style={styles.step}>{plain(it.text ?? "")}</Text>
                {!!basisLabel(it, placeLabel) && <Text style={styles.basis}>{basisLabel(it, placeLabel)}</Text>}
              </View>
            </View>
          ))}
          {steps.length > 0 && (
            <Pressable
              onPress={() => {
                setDoStep(0);
                setDoOpen(true);
              }}
              style={({ pressed }) => [styles.startBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={t("parva.start")}
            >
              <Text style={styles.startText}>{t("parva.start")}</Text>
            </Pressable>
          )}
        </View>
      )}

      {isSeries && dayRow.length > 0 && (
        <View style={styles.section}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {dayRow.map((d, i) => (
              <Pressable
                key={`${d.key}_${i}`}
                onPress={() => setDayIdx(i)}
                accessibilityRole="button"
                accessibilityLabel={d.label}
                accessibilityState={{ selected: dayIdx === i }}
                style={styles.dayHit}
              >
                <Text style={[styles.dayText, dayIdx === i && styles.dayOn]}>{d.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {Object.keys(vrat).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label} accessibilityRole="header">{t("parva.vrat")}</Text>
          {(["eat", "avoid", "break", "who_should_eat"] as const).map((k) =>
            (vrat[k] ?? []).length > 0 ? (
              <View key={k} style={styles.subBlock}>
                <Text style={styles.sub}>{t(`parva.${k === "break" ? "break" : k === "who_should_eat" ? "whoShouldEat" : k}` as never)}</Text>
                {(vrat[k] ?? []).map((it, i) => (
                  <View key={i} style={styles.bulletRow}>
                    <Text style={styles.bullet}>-</Text>
                    <View style={styles.stepText}>
                      <Text style={styles.step}>{plain(it.text ?? "")}</Text>
                      {!!basisLabel(it, placeLabel) && <Text style={styles.basis}>{basisLabel(it, placeLabel)}</Text>}
                    </View>
                  </View>
                ))}
              </View>
            ) : null,
          )}
        </View>
      )}

      {texts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label} accessibilityRole="header">{t("parva.texts")}</Text>
          {texts.map((tx, i) => {
            const m = tx as Record<string, string>;
            return (
              <View key={i} style={styles.textBlock}>
                {!!m.title && <Text style={styles.sub}>{plain(m.title)}</Text>}
                {!!m.devanagari && <Text style={[styles.dev, { fontSize: sized(20, { sanskrit: true }) }]}>{m.devanagari}</Text>}
                {!!m.iast && <Text style={styles.roman}>{m.iast}</Text>}
                {!!m.meaning && <Text style={styles.step}>{plain(m.meaning)}</Text>}
              </View>
            );
          })}
        </View>
      )}

      {dont.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label} accessibilityRole="header">{t("parva.dont")}</Text>
          {dont.map((it, i) => (
            <View key={i} style={styles.bulletRow}>
              <Text style={styles.bullet}>-</Text>
              <View style={styles.stepText}>
                <Text style={styles.step}>{plain(it.text ?? "")}</Text>
                {!!basisLabel(it, placeLabel) && <Text style={styles.basis}>{basisLabel(it, placeLabel)}</Text>}
              </View>
            </View>
          ))}
        </View>
      )}

      {regions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label} accessibilityRole="header">{t("parva.regions")}</Text>
          {regions.map((r, i) => (
            <View key={i} style={styles.subBlock}>
              {!!r.region && <Text style={styles.sub}>{r.region}</Text>}
              {(r.items ?? []).map((it, j) => (
                <Text key={j} style={styles.step}>{plain(it.text ?? "")}</Text>
              ))}
            </View>
          ))}
        </View>
      )}

      {slug === "pitru_paksha" && (
        <View style={styles.section}>
          <Text style={styles.label} accessibilityRole="header">{t("parva.shraddhaTitle")}</Text>
          <Text style={styles.sub}>{t("parva.shraddhaPick")}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {TITHIS.map((th, i) => (
              <Pressable
                key={i}
                onPress={() => setShrTithi(i + 1)}
                accessibilityRole="button"
                accessibilityLabel={th.nom}
                accessibilityState={{ selected: shrTithi === i + 1 }}
                style={styles.dayHit}
              >
                <Text style={[styles.dayText, shrTithi === i + 1 && styles.dayOn]}>{th.nom}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable
            onPress={() => void findShraddha()}
            style={({ pressed }) => [styles.startBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={t("parva.shraddhaGo")}
          >
            <Text style={styles.startText}>{t("parva.shraddhaGo")}</Text>
          </Pressable>
          {shrResult !== null && (
            <Text style={styles.step}>{shrResult ? t("parva.shraddhaResult", { date: shrResult }) : t("parva.shraddhaNone")}</Text>
          )}
        </View>
      )}

      <View style={styles.btnRow}>
        <Pressable
          onPress={() => ask.open({ surface: "parva", subject: slug })}
          style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={t("parva.askAbout")}
        >
          <Text style={styles.ghostText}>{t("parva.askAbout")}</Text>
        </Pressable>
        <Pressable
          onPress={() => void doShare()}
          style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={t("parva.share")}
        >
          <Text style={styles.ghostText}>{t("parva.share")}</Text>
        </Pressable>
        <Pressable
          onPress={() => void toggleFollow()}
          style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={followed.includes(slug) ? t("parva.remindOff") : t("parva.remind")}
        >
          <Text style={styles.ghostText}>{followed.includes(slug) ? t("parva.remindOff") : t("parva.remind")}</Text>
        </Pressable>
      </View>

      <Modal visible={doOpen} animationType={reduced ? "none" : "slide"} onRequestClose={() => setDoOpen(false)}>
        <View style={styles.doPage}>
          <Text style={[styles.doStep, { fontSize: sized(22, { sanskrit: true }) }]}>
            {plain(steps[Math.min(doStep, Math.max(0, steps.length - 1))]?.text ?? "")}
          </Text>
          <Text style={styles.doCount}>
            {steps.length > 0 ? `${doStep + 1} / ${steps.length}` : ""}
          </Text>
          <View style={styles.btnRow}>
            <Pressable
              onPress={() => setDoStep((s) => Math.max(0, s - 1))}
              style={styles.ghostBtn}
              accessibilityRole="button"
              accessibilityLabel={t("parva.back")}
            >
              <Text style={styles.ghostText}>{t("parva.back")}</Text>
            </Pressable>
            {doStep + 1 < steps.length ? (
              <Pressable
                onPress={() => setDoStep((s) => Math.min(steps.length - 1, s + 1))}
                style={styles.ghostBtn}
                accessibilityRole="button"
                accessibilityLabel={t("parva.next")}
              >
                <Text style={styles.ghostText}>{t("parva.next")}</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => setDoOpen(false)}
                style={styles.ghostBtn}
                accessibilityRole="button"
                accessibilityLabel={t("parva.done")}
              >
                <Text style={styles.ghostText}>{t("parva.done")}</Text>
              </Pressable>
            )}
          </View>
          <Pressable
            onPress={() => setDoOpen(false)}
            style={styles.ghostBtn}
            accessibilityRole="button"
            accessibilityLabel={t("parva.close")}
          >
            <Text style={styles.ghostText}>{t("parva.close")}</Text>
          </Pressable>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg, padding: space.lg },
  body: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: 120 },
  hero: { backgroundColor: fill.ink, borderRadius: 16, padding: space.md, marginBottom: space.sm },
  heroTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.lg, color: onFill.text },
  heroDate: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: onFill.soft },
  summary: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.base, color: color.ink, marginBottom: space.sm },
  section: { marginTop: space.md, borderTopWidth: 1, borderTopColor: color.border, paddingTop: space.sm },
  label: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm, color: color.ink, marginBottom: space.xs, textTransform: "uppercase" },
  sub: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm, color: color.ink, marginTop: space.xs },
  subBlock: { marginTop: space.xs },
  stepRow: { flexDirection: "row", gap: space.xs, marginTop: 6 },
  bulletRow: { flexDirection: "row", gap: space.xs, marginTop: 6 },
  bullet: { fontSize: font.sizes.base, color: color.ink },
  stepNum: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.base, color: color.ink },
  stepText: { flex: 1 },
  step: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.base, color: color.ink },
  basis: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.xs, color: color.inkSoft },
  timeRow: { paddingVertical: 6, borderTopWidth: 1, borderTopColor: color.border },
  timeKey: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm, color: color.ink },
  timeVal: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.sm, color: color.ink },
  textBlock: { marginTop: space.xs },
  dev: { ...script("semibold"), color: color.ink, lineHeight: 34 },
  roman: { fontStyle: "italic", fontSize: 13, color: color.inkSoft },
  startBtn: { minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: fill.sage, marginTop: space.sm },
  startText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.base, color: onFill.text },
  pressed: { opacity: 0.9 },
  dayHit: { minWidth: 44, minHeight: 44, justifyContent: "center", paddingHorizontal: space.sm },
  dayText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.base, color: color.inkSoft },
  dayOn: { color: color.ink, textDecorationLine: "underline" },
  btnRow: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.md },
  ghostBtn: { minHeight: 48, paddingHorizontal: space.md, alignItems: "center", justifyContent: "center", borderRadius: 12, borderWidth: 1.5, borderColor: color.ink },
  ghostText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.base, color: color.ink },
  doPage: { flex: 1, backgroundColor: color.bg, padding: space.lg, justifyContent: "center", gap: space.md },
  doStep: { fontFamily: "Nunito_700Bold", fontWeight: "700", color: color.ink, lineHeight: 38 },
  doCount: { fontFamily: "Nunito_700Bold", fontWeight: "700", color: color.inkSoft },
  muted: { color: color.inkSoft },
  error: { color: color.badText },
});
