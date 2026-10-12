// Parva page: painting hero, deity of the day, muhurats, why, vidhi, vrat,
// mantras & aartis, do-not, regions, ask, share card, remind. Series open on
// the requested/today day with a dated day row. Sections hide when empty; a
// basic verified-dates page shows when no rich body is published. One-line
// errors only. The share card is captured offscreen at full size (square and
// story) and handed to the system share sheet with the store link appended.

import { captureRef } from "react-native-view-shot";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import QRCode from "react-native-qrcode-svg";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Image, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";

import { useAsk, useAskContext } from "../ask/AskProvider";
import { APP_STORE_URL } from "../config";
import FetchError from "../components/FetchError";
import { Skeleton } from "../components/Skeleton";
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
import { color, fill, fillAt, font, onFill, radius, script, shadow, space } from "../theme";
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
        const got = Date.UTC(clock.date.y, clock.date.m, clock.date.d);
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

/** Clock time in the place's timezone ("6:52 am"); "" when unparsable. */
function fmtClock(v: string | Date | null | undefined, tz: string): string {
  if (v == null || v === "") return "";
  try {
    const d = typeof v === "string" ? new Date(v) : v;
    if (isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat(getLang() === "hi" ? "hi-IN" : "en-IN", {
      hour: "numeric", minute: "2-digit", timeZone: tz,
    }).format(d);
  } catch {
    return "";
  }
}

const TIME_KEYS = new Set([
  "tithi", "muhurat", "parana", "ghatasthapana", "sandhi_puja", "abhijit", "rahu",
  "note_chitra", "note_vaidhriti", "sunset_arghya", "sunrise_arghya", "nishitha", "sutak", "eclipse",
]);

/** Human label for a computed window key; unknown keys fall back to the key. */
function timeLabel(key: string): string {
  if (TIME_KEYS.has(key)) return t(`parva.tm.${key}` as never);
  return key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

/** Shareable festival card. Rendered offscreen at full size for capture and
 *  scaled down for the on-screen preview. */
function FestivalShareCard({
  width, height, art, title, dateLine, dayLine, captureRefFn,
}: {
  width: number;
  height: number;
  art: string;
  title: string;
  dateLine: string;
  dayLine: string;
  captureRefFn?: (v: View | null) => void;
}) {
  return (
    <View
      ref={captureRefFn}
      collapsable={false}
      style={[shareCardStyles.card, { width, height }]}
    >
      {!!art ? (
        <Image source={{ uri: art }} style={shareCardStyles.art} resizeMode="cover" />
      ) : (
        <LinearGradient colors={["#5E2216", "#3B2E25"]} style={shareCardStyles.art} />
      )}
      <LinearGradient
        colors={["rgba(59,46,37,0)", "rgba(59,46,37,0.72)", "rgba(59,46,37,0.94)"]}
        locations={[0.3, 0.62, 0.86]}
        style={StyleSheet.absoluteFill}
      />
      <View style={shareCardStyles.top}>
        <Text style={shareCardStyles.brand}>॥ शुभो ऽस्तु ॥</Text>
      </View>
      <View style={shareCardStyles.bottom}>
        {!!dayLine && <Text style={shareCardStyles.day}>{dayLine}</Text>}
        <Text style={shareCardStyles.title} numberOfLines={2}>{title}</Text>
        {!!dateLine && <Text style={shareCardStyles.date}>{dateLine}</Text>}
        <View style={shareCardStyles.bar}>
          <View style={shareCardStyles.word}>
            <Text style={shareCardStyles.wordMark}>Sanskritam</Text>
            <Text style={shareCardStyles.wordSub}>{t("parva.viaApp")}</Text>
          </View>
          <View style={shareCardStyles.qrTile}>
            <QRCode value={APP_STORE_URL} size={54} color="#3B2E25" backgroundColor="#FFFFFF" />
          </View>
        </View>
      </View>
    </View>
  );
}

const shareCardStyles = StyleSheet.create({
  card: { borderRadius: 24, overflow: "hidden", backgroundColor: fill.ink },
  art: { ...StyleSheet.absoluteFill, width: "100%", height: "100%" },
  top: { position: "absolute", top: 16, left: 0, right: 0, alignItems: "center" },
  brand: { ...script("semibold"), fontSize: 15, color: onFill.text, letterSpacing: 1 },
  bottom: { position: "absolute", left: 20, right: 20, bottom: 16 },
  day: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 13, color: onFill.gold, textTransform: "uppercase", letterSpacing: 1 },
  title: { ...script("extrabold"), fontSize: 30, lineHeight: 38, color: onFill.text, marginTop: 4 },
  date: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 14, color: onFill.soft, marginTop: 4 },
  bar: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 14 },
  word: { flex: 1, paddingRight: 12 },
  wordMark: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 17, color: onFill.text },
  wordSub: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: 11, color: onFill.soft, marginTop: 2 },
  qrTile: { backgroundColor: "#FFFFFF", borderRadius: 10, padding: 6 },
});

const CARD_W = 320;
const CARD_SQUARE_H = 320;
const CARD_STORY_H = 569;

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
  const [reload, setReload] = useState(0);
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
  const [fmt, setFmt] = useState<"square" | "story">("square");
  const [expandedText, setExpandedText] = useState<string | null>(null);
  const [previewW, setPreviewW] = useState(CARD_W);
  const squareRef = useRef<View | null>(null);
  const storyRef = useRef<View | null>(null);

  useAskContext("parva", `${slug}:${variant ?? ""}:${dayDate ?? date ?? ""}`);

  useEffect(() => {
    let alive = true;
    (async () => {
      setPage(null);
      setBasic(null);
      setFailed(false);
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
  }, [slug, variant, date, dayDate, tradition, reload]);

  const body = (page?.body ?? {}) as Record<string, unknown>;
  const why = (body.why as Item[] | undefined) ?? [];
  const gather = ((body.do as { gather?: Item[] } | undefined)?.gather) ?? [];
  const steps = ((body.do as { steps?: Item[] } | undefined)?.steps) ?? [];
  const vrat = (body.vrat as Record<string, Item[]> | undefined) ?? {};
  const dont = (body.dont as Item[] | undefined) ?? [];
  const texts = (body.texts as Record<string, unknown>[] | undefined) ?? [];
  const regions = (body.regions as { region?: string; items?: Item[] }[] | undefined) ?? [];
  const seriesDays = (body.series_days as { tithi_key?: string; form_key?: string; summary?: string; steps?: Item[]; texts?: Record<string, unknown>[] }[] | undefined) ?? [];
  // Calendar day entries are the authority for day order. Content resolves
  // by stable form_key so repeated tithis keep both dated entries.
  const calDays = (page?.day ?? basic?.day ?? []) as { date?: string; label?: string; form_key?: string; tithi_key?: string; art_url?: string }[];
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
  const dayTexts = (selectedContent?.texts ?? []) as Record<string, unknown>[];
  const pageArt = page?.art_url ?? "";
  const dayArt = selectedCalDay?.art_url ?? "";
  const heroArt = dayArt || pageArt;

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

  const shareLines = () => {
    const shareDate = selectedDate ?? "";
    return t("parva.sharedText", {
      title: `${heroTitle}${selectedDayNum ? `, ${t("parva.dayOf", { n: selectedDayNum })}` : ""}`,
      date: shareDate,
      summary: plain(shownSummary).slice(0, 120),
      url: APP_STORE_URL,
    });
  };

  const doShare = async () => {
    const text = shareLines();
    const target = fmt === "story" ? storyRef.current : squareRef.current;
    try {
      if (target) {
        const uri = await captureRef(target, { format: "png", result: "tmpfile" });
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
        if (done) return;
      }
      await Share.share({ message: text });
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
          if (K.deactivateKeepAwakeAsync) void K.deactivateKeepAwakeAsync?.().catch(() => {});
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
        <FetchError label={t("parva.errorLoad")} onRetry={() => setReload((n) => n + 1)} />
      </View>
    );
  }
  if (!page && !basic) {
    return (
      <View style={styles.page}>
        <Skeleton height={210} radius={radius.lg} />
        <View style={{ height: space.md }} />
        <SkeletonGroup4 />
      </View>
    );
  }

  const times = page?.times ?? basic?.times ?? [];
  const availability = page?.availability ?? basic?.availability ?? "";
  const isSeries = (calDays.length > 0) && (slug === "sharad_navaratri" || slug === "chaitra_navaratri" || slug === "pitru_paksha" || slug === "diwali_days" || calDays.length > 1);
  const hasRichSections = why.length + gather.length + shownSteps.length + texts.length + dont.length + regions.length + Object.keys(vrat).length > 0;

  const heroDateLine = selectedCalDay
    ? `${selectedCalDay.date ?? ""} · ${plain(selectedCalDay.label ?? "")}`
    : dateLabel(selectedDate, todayStr);
  const heroChips: string[] = [];
  if (selectedDayNum) heroChips.push(t("parva.dayOf", { n: selectedDayNum }));
  if (selectedCalDay?.tithi_key) heroChips.push(selectedCalDay.tithi_key.replace(/_/g, " "));

  const shareDayLine = selectedDayNum
    ? `${t("parva.dayOf", { n: selectedDayNum })} · ${plain(selectedCalDay?.label ?? "")}`
    : "";
  const shareDateLine = heroDateLine;
  const previewScale = Math.min(1, previewW / CARD_W);

  const timeRows = [
    ...times.map((tm) => ({ key: tm.key, s: tm.start ?? "", e: tm.end ?? "" })),
    ...rahuAbhijit.map((w) => ({
      key: w.key,
      s: w.start.toISOString(),
      e: w.end.toISOString(),
    })),
  ];

  return (
    <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
      {/* Hero: festival painting with scrim, or a deep-fill block with a
          watermark glyph. Never a broken image: no art means no Image. */}
      <View style={styles.hero}>
        {!!heroArt && <Image source={{ uri: heroArt }} style={StyleSheet.absoluteFill} resizeMode="cover" />}
        <LinearGradient
          colors={heroArt ? ["rgba(59,46,37,0.05)", "rgba(59,46,37,0.55)", "rgba(59,46,37,0.92)"] : ["rgba(255,248,238,0)", "rgba(255,248,238,0.08)"]}
          style={StyleSheet.absoluteFill}
        />
        {!heroArt && <Text style={styles.heroMark}>ॐ</Text>}
        <View style={styles.heroBody}>
          <Text style={styles.heroTitle}>{heroTitle}</Text>
          <Text style={styles.heroDate}>{heroDateLine}</Text>
          {heroChips.length > 0 && (
            <View style={styles.chipRow}>
              {heroChips.map((c) => (
                <View key={c} style={styles.heroChip}>
                  <Text style={styles.heroChipText}>{c}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
      {!!shownSummary && <Text style={styles.summary}>{plain(shownSummary)}</Text>}

      {isSeries && calDays.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label} accessibilityRole="header">{t("parva.days")}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayRow}>
            {calDays.map((d, i) => {
              const on = dayIdx === i;
              return (
                <Pressable
                  key={`${d.tithi_key ?? ""}_${d.form_key ?? ""}_${i}`}
                  onPress={() => { setDayIdx(i); setDoStep(0); setExpandedText(null); }}
                  accessibilityRole="button"
                  accessibilityLabel={`${d.date ?? ""}, ${d.label ?? ""}`}
                  accessibilityState={{ selected: on }}
                  style={[styles.dayCard, on && styles.dayCardOn]}
                >
                  {d.art_url ? (
                    <Image source={{ uri: d.art_url }} style={styles.dayAvatar} />
                  ) : (
                    <View style={[styles.dayAvatar, { backgroundColor: fillAt(i) }]}>
                      <Text style={styles.dayAvatarText}>{initialOf(d.label ?? d.form_key ?? "")}</Text>
                    </View>
                  )}
                  <Text style={[styles.dayDate, on && styles.dayOn]}>{(d.date ?? "").slice(5)}</Text>
                  <Text style={[styles.dayName, on && styles.dayOn]} numberOfLines={1}>{plain(d.label ?? "")}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {(dayTexts.length > 0 || (isSeries && selectedContent?.summary)) && (
        <View style={styles.section}>
          <Text style={styles.label} accessibilityRole="header">{t("parva.deityOfDay")}</Text>
          <View style={styles.card}>
            <View style={styles.deityHead}>
              {dayArt ? (
                <Image source={{ uri: dayArt }} style={styles.deityArt} />
              ) : (
                <View style={[styles.deityArt, styles.deityArtFill]}>
                  <Text style={styles.deityArtText}>{initialOf(selectedCalDay?.label ?? selectedCalDay?.form_key ?? "")}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.deityName}>{plain(selectedCalDay?.label ?? "")}</Text>
                {!!selectedContent?.summary && (
                  <Text style={styles.step}>{plain(String(selectedContent.summary))}</Text>
                )}
              </View>
            </View>
            {dayTexts.map((tx, i) => (
              <TextCard key={i} tx={tx} idx={i} expanded={expandedText === `d${i}`} onToggle={() => setExpandedText(expandedText === `d${i}` ? null : `d${i}`)} />
            ))}
          </View>
        </View>
      )}

      {timeRows.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label} accessibilityRole="header">{t("parva.times")}</Text>
          <View style={styles.card}>
            {timeRows.map((tm, i) => {
              const a = fmtClock(tm.s, placeTz);
              const b = fmtClock(tm.e, placeTz);
              const span = a && b && tm.s !== tm.e ? `${a} – ${b}` : a || b;
              return (
                <View key={`${tm.key}_${i}`} style={[styles.timeRow, i > 0 && styles.hairTop]}>
                  <Text style={styles.timeKey}>{timeLabel(tm.key)}</Text>
                  <Text style={styles.timeVal}>{span}</Text>
                </View>
              );
            })}
          </View>
          <Text style={styles.basis}>{t("parva.basisCalc", { place: placeLabel })}</Text>
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
          <View style={styles.card}>
            {why.map((it, i) => (
              <View key={i} style={[styles.whyRow, i > 0 && styles.hairTop]}>
                <View style={styles.numDisc}>
                  <Text style={styles.numText}>{i + 1}</Text>
                </View>
                <View style={styles.stepText}>
                  <Text style={styles.step}>{plain(it.text ?? "")}</Text>
                  {!!basisLabel(it, placeLabel) && <Text style={styles.basis}>{basisLabel(it, placeLabel)}</Text>}
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {(gather.length > 0 || shownSteps.length > 0) && (
        <View style={styles.section}>
          <Text style={styles.label} accessibilityRole="header">{t("parva.whatToDo")}</Text>
          {gather.length > 0 && (
            <View style={styles.chipWrap}>
              {gather.map((it, i) => (
                <View key={i} style={styles.gatherChip}>
                  <Text style={styles.gatherText}>{plain(it.text ?? "")}</Text>
                </View>
              ))}
            </View>
          )}
          {shownSteps.length > 0 && (
            <View style={styles.card}>
              {shownSteps.map((it, i) => (
                <View key={i} style={[styles.whyRow, i > 0 && styles.hairTop]}>
                  <View style={styles.numDisc}>
                    <Text style={styles.numText}>{i + 1}</Text>
                  </View>
                  <View style={styles.stepText}>
                    <Text style={styles.step}>{plain(it.text ?? "")}</Text>
                    {!!basisLabel(it, placeLabel) && <Text style={styles.basis}>{basisLabel(it, placeLabel)}</Text>}
                  </View>
                </View>
              ))}
            </View>
          )}
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
          <View style={styles.card}>
            {(["eat", "avoid", "break", "who_should_eat"] as const).map((k) =>
              (vrat[k] ?? []).length > 0 ? (
                <View key={k} style={[styles.subBlock, k !== "eat" && styles.hairTop]}>
                  <Text style={styles.sub}>
                    {t(`parva.${k === "break" ? "break" : k === "who_should_eat" ? "whoShouldEat" : k}` as never)}
                  </Text>
                  {(vrat[k] ?? []).map((it, i) => (
                    <View key={i} style={styles.bulletRow}>
                      <Text style={[styles.dot, { color: k === "avoid" ? color.badText : k === "eat" ? color.okText : color.inkSoft }]}>●</Text>
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
        </View>
      )}

      {texts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label} accessibilityRole="header">{t("parva.texts")}</Text>
          {texts.map((tx, i) => (
            <View key={i} style={[styles.card, { marginBottom: space.sm }]}>
              <TextCard tx={tx} idx={i} expanded={expandedText === `t${i}`} onToggle={() => setExpandedText(expandedText === `t${i}` ? null : `t${i}`)} />
            </View>
          ))}
        </View>
      )}

      {dont.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label} accessibilityRole="header">{t("parva.dont")}</Text>
          <View style={styles.card}>
            {dont.map((it, i) => (
              <View key={i} style={[styles.bulletRow, i > 0 && styles.hairTop, { paddingVertical: 8 }]}>
                <Text style={styles.noSign}>✕</Text>
                <View style={styles.stepText}>
                  <Text style={styles.step}>{plain(it.text ?? "")}</Text>
                  {!!basisLabel(it, placeLabel) && <Text style={styles.basis}>{basisLabel(it, placeLabel)}</Text>}
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {regions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label} accessibilityRole="header">{t("parva.regions")}</Text>
          <View style={styles.card}>
            {regions.map((r, i) => (
              <View key={i} style={[styles.subBlock, i > 0 && styles.hairTop]}>
                {!!r.region && <Text style={styles.sub}>{r.region}</Text>}
                {(r.items ?? []).map((it, j) => (
                  <Text key={j} style={styles.step}>{plain(it.text ?? "")}</Text>
                ))}
              </View>
            ))}
          </View>
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

      {/* Share block: format toggle, scaled preview, share button. The full
          size cards render offscreen below and are what actually gets
          captured. */}
      <View style={styles.section}>
        <Text style={styles.label} accessibilityRole="header">{t("parva.shareCard")}</Text>
        <View style={styles.fmtRow}>
          {(["square", "story"] as const).map((f) => (
            <Pressable
              key={f}
              onPress={() => setFmt(f)}
              accessibilityRole="button"
              accessibilityLabel={f === "square" ? t("parva.formatSquare") : t("parva.formatStory")}
              accessibilityState={{ selected: fmt === f }}
              style={[styles.fmtChip, fmt === f && styles.fmtChipOn]}
            >
              <Text style={[styles.fmtText, fmt === f && styles.fmtTextOn]}>
                {f === "square" ? t("parva.formatSquare") : t("parva.formatStory")}
              </Text>
            </Pressable>
          ))}
        </View>
        <View
          style={[styles.previewBox, { aspectRatio: fmt === "square" ? 1 : 9 / 16 }]}
          onLayout={(e) => setPreviewW(e.nativeEvent.layout.width)}
        >
          <View style={{ transform: [{ scale: previewScale }] }}>
            <FestivalShareCard
              width={CARD_W}
              height={fmt === "square" ? CARD_SQUARE_H : CARD_STORY_H}
              art={heroArt}
              title={heroTitle}
              dateLine={shareDateLine}
              dayLine={shareDayLine}
            />
          </View>
        </View>
        <Pressable
          onPress={() => void doShare()}
          style={({ pressed }) => [styles.shareBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={t("parva.shareVia")}
        >
          <Text style={styles.shareBtnText}>{t("parva.shareVia")}</Text>
        </Pressable>
      </View>

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

      {/* Offscreen full-size share cards; only the selected one is captured. */}
      <View style={styles.offscreen}>
        <FestivalShareCard
          width={CARD_W} height={CARD_SQUARE_H} art={heroArt} title={heroTitle}
          dateLine={shareDateLine} dayLine={shareDayLine}
          captureRefFn={(v) => { squareRef.current = v; }}
        />
        <FestivalShareCard
          width={CARD_W} height={CARD_STORY_H} art={heroArt} title={heroTitle}
          dateLine={shareDateLine} dayLine={shareDayLine}
          captureRefFn={(v) => { storyRef.current = v; }}
        />
      </View>

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

function SkeletonGroup4() {
  return (
    <View style={{ gap: space.sm }}>
      <Skeleton height={52} radius={radius.md} />
      <Skeleton height={52} radius={radius.md} />
      <Skeleton height={52} radius={radius.md} />
    </View>
  );
}

function initialOf(s: string): string {
  const c = s.trim()[0] ?? "•";
  return /[a-z]/i.test(c) ? c.toUpperCase() : c;
}

/** One mantra / stotra / aarti / dhyana block: kind pill, title, devanagari
 *  (collapsible), IAST, meaning. */
function TextCard({
  tx, idx, expanded, onToggle,
}: {
  tx: Record<string, unknown>;
  idx: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const m = tx as Record<string, string>;
  const kind = (m.kind ?? "mantra") as string;
  const dev = m.devanagari ?? "";
  const long = dev.length > 90;
  const { sized } = useTypeScale();
  const kindLabel = kind === "aarti" ? "Aarti" : kind === "stotra" ? "Stotra" : kind === "dhyana" ? "Dhyana" : "Mantra";
  return (
    <View style={styles.textBlock}>
      <View style={styles.textHead}>
        <View style={[styles.kindPill, { backgroundColor: fillAt(idx) }]}>
          <Text style={styles.kindText}>{kindLabel}</Text>
        </View>
        {!!m.title && <Text style={styles.sub} numberOfLines={2}>{plain(m.title)}</Text>}
      </View>
      {!!dev && (
        <Pressable
          onPress={long ? onToggle : undefined}
          disabled={!long}
          accessibilityRole={long ? "button" : undefined}
          accessibilityLabel={long ? (expanded ? t("parva.showLess") : t("parva.showMore")) : undefined}
        >
          <Text
            style={[styles.dev, { fontSize: sized(20, { sanskrit: true }) }]}
            numberOfLines={long && !expanded ? 3 : undefined}
          >
            {dev}
          </Text>
          {long && <Text style={styles.more}>{expanded ? t("parva.showLess") : t("parva.showMore")}</Text>}
        </Pressable>
      )}
      {!!m.iast && <Text style={styles.roman}>{m.iast}</Text>}
      {!!m.meaning && <Text style={styles.step}>{plain(m.meaning)}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg, padding: space.lg },
  body: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: 120 },
  hero: {
    borderRadius: radius.lg, overflow: "hidden", backgroundColor: fill.maroon,
    minHeight: 216, justifyContent: "flex-end",
  },
  heroMark: {
    ...script("extrabold"), fontSize: 120, color: onFill.faint,
    position: "absolute", alignSelf: "center", top: 8,
  },
  heroBody: { padding: space.md },
  heroTitle: { ...script("extrabold"), fontSize: font.sizes.xl, lineHeight: 36, color: onFill.text },
  heroDate: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: onFill.soft, marginTop: 2 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: space.sm },
  heroChip: {
    borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(255,248,238,0.45)",
    paddingHorizontal: 10, paddingVertical: 3,
  },
  heroChipText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.xs, color: onFill.text },
  summary: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.base, color: color.ink, marginTop: space.sm },
  section: { marginTop: space.lg },
  label: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.md, color: color.ink, marginBottom: space.xs },
  card: {
    backgroundColor: color.surface, borderRadius: radius.md, padding: space.md,
    ...shadow.card,
  },
  hairTop: { borderTopWidth: 1, borderTopColor: color.border },
  whyRow: { flexDirection: "row", gap: space.sm, paddingVertical: 8 },
  numDisc: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: fill.ink,
    alignItems: "center", justifyContent: "center", marginTop: 2,
  },
  numText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.xs, color: onFill.text },
  stepText: { flex: 1 },
  step: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.base, color: color.ink },
  basis: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.xs, color: color.inkSoft, marginTop: 4 },
  sub: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm, color: color.ink, marginTop: space.xs },
  subBlock: { marginTop: space.xs, paddingVertical: 4 },
  bulletRow: { flexDirection: "row", gap: space.sm, marginTop: 6 },
  dot: { fontSize: 10, marginTop: 6 },
  noSign: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm, color: color.badText, marginTop: 3 },
  timeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, gap: space.sm },
  timeKey: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm, color: color.ink, flex: 1 },
  timeVal: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.sm, color: color.ink, textAlign: "right" },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: space.sm },
  gatherChip: {
    backgroundColor: color.surface, borderRadius: radius.pill, borderWidth: 1, borderColor: color.border,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  gatherText: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.xs, color: color.ink },
  startBtn: { minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: fill.sage, marginTop: space.sm },
  startText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.base, color: onFill.text },
  pressed: { opacity: 0.9 },
  dayRow: { gap: space.sm, paddingRight: space.lg },
  dayCard: {
    width: 76, borderRadius: radius.md, borderWidth: 1.5, borderColor: color.border,
    backgroundColor: color.surface, alignItems: "center", padding: space.xs, gap: 4,
  },
  dayCardOn: { backgroundColor: fill.ink, borderColor: fill.ink },
  dayAvatar: { width: 44, height: 44, borderRadius: 22, overflow: "hidden" },
  dayAvatarText: { ...script("bold"), fontSize: 18, color: onFill.text },
  dayDate: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.xs, color: color.inkSoft },
  dayName: { ...script("semibold"), fontSize: 12, color: color.ink, maxWidth: 68 },
  dayOn: { color: onFill.text },
  dayHit: { minWidth: 64, minHeight: 48, justifyContent: "center", paddingHorizontal: space.sm },
  dayText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.base, color: color.inkSoft },
  deityHead: { flexDirection: "row", gap: space.md, alignItems: "flex-start" },
  deityArt: { width: 64, height: 64, borderRadius: radius.md, overflow: "hidden", backgroundColor: fill.ink },
  deityArtFill: { alignItems: "center", justifyContent: "center" },
  deityArtText: { ...script("extrabold"), fontSize: 26, color: onFill.text },
  deityName: { ...script("bold"), fontSize: font.sizes.lg, color: color.ink },
  textBlock: { marginTop: space.xs },
  textHead: { flexDirection: "row", alignItems: "center", gap: space.sm, flexWrap: "wrap" },
  kindPill: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  kindText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 10, color: onFill.text, textTransform: "uppercase", letterSpacing: 0.5 },
  dev: { ...script("semibold"), color: color.ink, lineHeight: 34, marginTop: space.xs },
  roman: { fontStyle: "italic", fontSize: 13, color: color.inkSoft, marginTop: 4 },
  more: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.xs, color: color.saffronText, marginTop: 6 },
  fmtRow: { flexDirection: "row", gap: space.sm, marginBottom: space.sm },
  fmtChip: {
    minHeight: 40, paddingHorizontal: space.lg, alignItems: "center", justifyContent: "center",
    borderRadius: radius.pill, borderWidth: 1.5, borderColor: color.ink,
  },
  fmtChipOn: { backgroundColor: fill.ink, borderColor: fill.ink },
  fmtText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm, color: color.ink },
  fmtTextOn: { color: onFill.text },
  previewBox: {
    width: "100%", alignItems: "center", justifyContent: "center",
    overflow: "hidden", borderRadius: radius.lg,
  },
  shareBtn: {
    minHeight: 50, alignItems: "center", justifyContent: "center",
    borderRadius: radius.md, backgroundColor: color.saffronBtn, marginTop: space.sm,
    ...shadow.button,
  },
  shareBtnText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.base, color: color.white },
  btnRow: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.md },
  ghostBtn: { minHeight: 48, paddingHorizontal: space.md, alignItems: "center", justifyContent: "center", borderRadius: radius.md, borderWidth: 1.5, borderColor: color.ink },
  ghostText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.base, color: color.ink },
  doPage: { flex: 1, backgroundColor: color.bg, padding: space.lg, justifyContent: "center", gap: space.md },
  doStep: { fontFamily: "Nunito_700Bold", fontWeight: "700", color: color.ink, lineHeight: 38 },
  doCount: { fontFamily: "Nunito_700Bold", fontWeight: "700", color: color.inkSoft },
  offscreen: { position: "absolute", top: -10000, left: 0 },
});
