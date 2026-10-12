// Parva page: painting header, times, why, do, vrat, texts, dont,
// regions, ask, share. Series open on the requested/today day with a dated
// day row. Sections hide when empty; a basic verified-dates page shows when
// no rich body is published. One-line errors only.

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
import { parvaBasic, type ParvaBasic, type ParvaPageBody } from "../parva/api";
import { getParvaPage } from "../parva/cache";
import { resolveDayContent, selectDayIndex, seriesDayNumber } from "../parva/select";
import { ensurePermission, followedSlugs, isRemindUnavailable, setFollowed } from "../parva/reminders";
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
  const { slug, variant, date, dayDate, tradition } = route.params as {
    slug: string; variant?: string; date?: string; dayDate?: string; tradition?: string;
  };
  const [page, setPage] = useState<ParvaPageBody | null>(null);
  const [basic, setBasic] = useState<ParvaBasic | null>(null);
  const [failed, setFailed] = useState(false);
  const [placeLabel, setPlaceLabel] = useState("");
  const [placeTz, setPlaceTz] = useState("Asia/Kolkata");
  const [trad, setTrad] = useState("north");
  const [followed, setFollowedState] = useState<string[]>([]);
  const [remindOff, setRemindOff] = useState(false);
  const [todayStr, setTodayStr] = useState("");
  const [dayIdx, setDayIdx] = useState(0);
  const [doOpen, setDoOpen] = useState(false);
  const [doStep, setDoStep] = useState(0);
  const [shrTithi, setShrTithi] = useState(30);
  const [shrResult, setShrResult] = useState<string | null>(null);
  const shareRef = useRef<View | null>(null);

  useAskContext("parva", `${slug}:${variant ?? ""}:${dayDate ?? date ?? ""}`);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const stored = await getPlace().catch(() => null);
        const prefs = getKalaPrefs();
        const useTrad = tradition ?? prefs.tradition;
        const { place } = resolvePlace(
          stored ? { lat: stored.lat, lon: stored.lon, tz: stored.tz, label: stored.label } : null,
          useTrad,
        );
        if (!alive) return;
        setPlaceLabel(place.label);
        setPlaceTz(place.tz);
        setTrad(useTrad);
        let today = "";
        try {
          today = new Intl.DateTimeFormat("en-CA", { timeZone: place.tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
        } catch {
          today = new Date().toISOString().slice(0, 10);
        }
        setTodayStr(today);
        setFollowedState(await followedSlugs());
        void isRemindUnavailable().then((v) => { if (alive) setRemindOff(v); });
        const lang = getLang();
        const y = (dayDate ?? date) ? Number((dayDate ?? date ?? "").slice(0, 4)) : new Date().getFullYear();
        const lat = Math.round(place.lat * 10) / 10;
        const lon = Math.round(place.lon * 10) / 10;
        // Exact occurrence + selected day in one call; no 366-day lookup.
        const data = await getParvaPage(
          { lat, lon, tradition: useTrad, lang, slug, variant: variant ?? "", date: dayDate ?? date, tz: place.tz },
          { year: y, lat, lon },
        );
        if (!alive) return;
        if (data) {
          setPage(data);
          setBasic(null);
          const days = data.day ?? [];
          const init = data.day_index != null && data.day_index >= 0
            ? data.day_index
            : selectDayIndex(days.map((d) => ({ date: d.date })), { requestedDate: dayDate ?? date, todayStr: today });
          setDayIdx(Math.max(0, init));
        } else {
          // No rich body: useful verified-dates page instead of a dead end.
          const b = await parvaBasic({
            slug, variant: variant ?? "", date: dayDate ?? date, year: y,
            lat, lon, tz: place.tz, tradition: useTrad,
          });
          if (!alive) return;
          if (!b) setFailed(true);
          else {
            setBasic(b);
            const days = b.day ?? [];
            setDayIdx(Math.max(0, selectDayIndex(days.map((d) => ({ date: d.date })), { requestedDate: dayDate ?? date, todayStr: today })));
          }
        }
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug, variant, date, dayDate, tradition]);

  const body = (page?.body ?? {}) as Record<string, unknown>;
  const why = (body.why as Item[] | undefined) ?? [];
  const gather = ((body.do as { gather?: Item[] } | undefined)?.gather) ?? [];
  const steps = ((body.do as { steps?: Item[] } | undefined)?.steps) ?? [];
  const vrat = (body.vrat as Record<string, Item[]> | undefined) ?? {};
  const dont = (body.dont as Item[] | undefined) ?? [];
  const texts = (body.texts as Record<string, unknown>[] | undefined) ?? [];
  const regions = (body.regions as { region?: string; items?: Item[] }[] | undefined) ?? [];
  const seriesDays = (body.series_days as { tithi_key?: string; form_key?: string; summary?: string; steps?: Item[] }[] | undefined) ?? [];
  // Calendar day entries are the authority for day order. Content resolves
  // by stable form_key so repeated tithis keep both dated entries.
  const calDays = (page?.day ?? basic?.day ?? []) as { date?: string; label?: string; form_key?: string; tithi_key?: string }[];
  const dayRow = calDays.map((d, i) => ({
    key: `${d.tithi_key ?? ""}_${d.form_key ?? ""}_${i}`,
    label: d.date ?? "",
    sub: d.label ?? "",
    tithi: d.tithi_key ?? "",
  }));
  const selectedCalDay = calDays[dayIdx] ?? null;
  const selectedContent = resolveDayContent(selectedCalDay, seriesDays);
  const selectedDate = selectedCalDay?.date ?? (dayDate ?? date ?? page?.date ?? basic?.date ?? null);
  const selectedDayNum = selectedCalDay?.date ? seriesDayNumber(calDays, selectedCalDay.date) : 0;
  const summary = typeof body.summary === "string" ? body.summary : "";
  const heroTitle = plain(page?.title || basic?.title || (variant ? variant.replace(/_/g, " ") : slug.replace(/_/g, " ")));
  // When a series day is selected, heading/date/significance/vidhi/texts move
  // together: per-day steps override the generic steps.
  const shownSteps = selectedContent?.steps?.length ? (selectedContent.steps as Item[]) : steps;
  const shownSummary = selectedContent?.summary ? String(selectedContent.summary) : summary;

  const rahuAbhijit = useMemo(() => {
    if (!selectedDate) return [];
    const mid = midnightUtcForDate(selectedDate, placeTz);
    if (!mid) return [];
    try {
      const sun = sunDay(mid, { lat: 28.6, lon: 77.2 });
      if (!sun) return [];
      const wd = new Date(Date.UTC(Number(selectedDate.slice(0, 4)), Number(selectedDate.slice(5, 7)) - 1, Number(selectedDate.slice(8, 10)))).getUTCDay();
      return dayWindows(sun, wd).filter((w) => w.key === "rahu" || w.key === "abhijit");
    } catch {
      return [];
    }
  }, [selectedDate, placeTz]);

  const toggleFollow = async () => {
    const on = !followed.includes(slug);
    if (on) {
      const ok = await ensurePermission();
      if (!ok) {
        setRemindOff(await isRemindUnavailable());
        return;
      }
    }
    setFollowedState(await setFollowed(slug, on));
  };

  const doShare = async () => {
    const shareDate = selectedDate ?? "";
    const text = t("parva.sharedText", { title: `${heroTitle}${selectedDayNum ? `, day ${selectedDayNum}` : ""}`, date: shareDate, summary: plain(shownSummary).slice(0, 120) });
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
      const { shraddhaDate } = await import("../parva/api");
      const stored = await getPlace().catch(() => null);
      const prefs = getKalaPrefs();
      const { place } = resolvePlace(
        stored ? { lat: stored.lat, lon: stored.lon, tz: stored.tz, label: stored.label } : null,
        prefs.tradition,
      );
      const y = selectedDate ? Number(selectedDate.slice(0, 4)) : new Date().getFullYear();
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

  if (failed && !page && !basic) {
    return (
      <View style={styles.page}>
        <Text style={styles.error}>Could not load this page. Go back and retry.</Text>
      </View>
    );
  }
  if (!page && !basic) {
    return (
      <View style={styles.page}>
        <Text style={styles.muted}>Loading.</Text>
      </View>
    );
  }

  const times = page?.times ?? basic?.times ?? [];
  const availability = page?.availability ?? basic?.availability ?? "";
  const isSeries = (calDays.length > 0) && (slug === "sharad_navaratri" || slug === "chaitra_navaratri" || slug === "pitru_paksha" || slug === "diwali_days" || calDays.length > 1);
  const hasRichSections = why.length + gather.length + shownSteps.length + texts.length + dont.length + regions.length + Object.keys(vrat).length > 0;

  return (
    <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
      <View ref={shareRef} collapsable={false}>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>{heroTitle}</Text>
          <Text style={styles.heroDate}>
            {selectedCalDay ? `${selectedCalDay.date ?? ""} · ${plain(selectedCalDay.label ?? "")}` : dateLabel(selectedDate, todayStr)}
            {selectedDayNum ? ` · ${t("parva.dayOf", { n: selectedDayNum })}` : ""}
            {selectedCalDay?.tithi_key ? ` · ${selectedCalDay.tithi_key}` : ""}
          </Text>
        </View>
        {!!shownSummary && <Text style={styles.summary}>{plain(shownSummary)}</Text>}
      </View>

      {isSeries && dayRow.length > 0 && (
        <View style={styles.section}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {dayRow.map((d, i) => (
              <Pressable
                key={`${d.key}_${i}`}
                onPress={() => { setDayIdx(i); setDoStep(0); }}
                accessibilityRole="button"
                accessibilityLabel={`${calDays[i]?.date ?? ""}, ${calDays[i]?.label ?? ""}`}
                accessibilityState={{ selected: dayIdx === i }}
                accessibilityHint={calDays[i]?.date ?? ""}
                style={styles.dayHit}
              >
                <Text style={[styles.dayText, dayIdx === i && styles.dayOn]}>{d.label.slice(5)}</Text>
                <Text style={[styles.daySub, dayIdx === i && styles.dayOn]} numberOfLines={1}>{plain(d.sub)}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {(times.length > 0 || rahuAbhijit.length > 0) && (
        <View style={styles.section}>
          <Text style={styles.label} accessibilityRole="header">{t("parva.times")}</Text>
          {times.map((tm, i) => (
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

      {!hasRichSections && (
        <View style={styles.section}>
          <Text style={styles.step}>{basic?.message || t("parva.basicDetail")}</Text>
          {selectedCalDay ? <Text style={styles.basis}>{plain(selectedCalDay.label ?? "")} · {selectedCalDay.date}</Text> : null}
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

      {(gather.length > 0 || shownSteps.length > 0) && (
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
          {shownSteps.map((it, i) => (
            <View key={i} style={styles.stepRow}>
              <Text style={styles.stepNum}>{i + 1}.</Text>
              <View style={styles.stepText}>
                <Text style={styles.step}>{plain(it.text ?? "")}</Text>
                {!!basisLabel(it, placeLabel) && <Text style={styles.basis}>{basisLabel(it, placeLabel)}</Text>}
              </View>
            </View>
          ))}
          {shownSteps.length > 0 && (
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
          onPress={() => ask.open({ surface: "parva", subject: `${slug}:${variant ?? ""}:${selectedDate ?? ""}:${trad}` })}
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
        {!remindOff && (
          <Pressable
            onPress={() => void toggleFollow()}
            style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={followed.includes(slug) ? t("parva.remindOff") : t("parva.remind")}
          >
            <Text style={styles.ghostText}>{followed.includes(slug) ? t("parva.remindOff") : t("parva.remind")}</Text>
          </Pressable>
        )}
      </View>
      {availability === "verified_dates" ? (
        <Text style={styles.basis}>{t("parva.basicDetail")}</Text>
      ) : null}

      <Modal visible={doOpen} animationType={reduced ? "none" : "slide"} onRequestClose={() => setDoOpen(false)}>
        <View style={styles.doPage}>
          <Text style={[styles.doStep, { fontSize: sized(22, { sanskrit: true }) }]}>
            {plain(shownSteps[Math.min(doStep, Math.max(0, shownSteps.length - 1))]?.text ?? "")}
          </Text>
          <Text style={styles.doCount}>
            {shownSteps.length > 0 ? `${doStep + 1} / ${shownSteps.length}` : ""}
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
            {doStep + 1 < shownSteps.length ? (
              <Pressable
                onPress={() => setDoStep((s) => Math.min(shownSteps.length - 1, s + 1))}
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
  dayHit: { minWidth: 64, minHeight: 48, justifyContent: "center", paddingHorizontal: space.sm },
  dayText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.base, color: color.inkSoft },
  daySub: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.xs, color: color.inkSoft },
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
