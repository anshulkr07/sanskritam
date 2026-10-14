// WritingScreen (U12-3) — feedback that abstains.
//
// §3.3 is the invariant this screen exists to honour: `unsure` is NEVER red,
// never a failure. A beginner's letterforms are what a recogniser handles
// worst, so most early attempts are uncertain, and the RECOGNISER is the one
// that yields. Verdict rendering:
//   • Correct — the letter settles (soft green).
//   • Unsure — the invitation is to try once more. Violet (color.unsureBg),
//     never amber-as-soft-red.
//   • Wrong — only when the recogniser is confident it saw a DIFFERENT
//     letter. Rare by design.
//   • Error — the wire failed, not the learner. Never dressed as a verdict.
//
// Two claims live here and must not be conflated (U12-3): "that is the
// letter आ" (the recogniser's answer) and "that is how आ is written" (only the
// stroke data answers). The stroke player is one tap away on every item.
//
// Photos (U12-4): sent to the server check (Sarvam Document Intelligence),
// which keeps only the recognised text. If that is unavailable the photo is
// read on the device instead. The image is deleted after the result.
//
// Placement (U12-5): NOT a seventh tab. This is Varṇamālā's practice mode.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { api, type WritingAttemptResponse, type WritingItem } from "../api/client";
import FetchError from "../components/FetchError";
import { SkeletonGroup } from "../components/Skeleton";
import { Button } from "../components/ui";
import PhotoCapture from "../components/writing/PhotoCapture";
import StrokePathPlayer from "../components/writing/StrokeDemonstration";
import WritingCanvas, { type InkRecogniser } from "../components/writing/WritingCanvas";
import { useTypeScale } from "../hooks/useTypeScale";
import { getInkRecogniser } from "../services/inkRecogniser";
import { getPhotoRecogniser } from "../services/photoRecogniser";
import { haptics } from "../services/haptics";
import { announceVerdict } from "../utils/announce";
import { accent, color, font, radius, script, shadow, space } from "../theme";

type Tier = 1 | 2 | 3;
type Source = "ink" | "photo";

const TIER_LABEL: Record<Tier, string> = { 1: "Letters", 2: "Mātrās", 3: "Words" };

type Feedback =
  | { kind: "correct" | "unsure" | "wrong"; read: string }
  | { kind: "error"; read: "" };

/** Delete the photo file once it has been checked (best effort). */
function discardPhoto(uri: string): void {
  try {
    const FileSystem = require("expo-file-system/legacy");
    FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
  } catch {
    /* nothing to delete on this platform */
  }
}

export default function WritingScreen() {
  const { sized } = useTypeScale();
  const recogniser = useMemo<InkRecogniser>(() => getInkRecogniser(), []);
  const photoRecogniser = useMemo(() => getPhotoRecogniser(), []);
  const scrollRef = useRef<unknown>(null);
  const [drawing, setDrawing] = useState(false);
  const [source, setSource] = useState<Source>("ink");
  const [items, setItems] = useState<WritingItem[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [tier, setTier] = useState<Tier>(1);
  const [idx, setIdx] = useState(0);
  // Bumped to clear the canvas: a new letter, or "Try again".
  const [attempt, setAttempt] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [showStrokes, setShowStrokes] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [thumb, setThumb] = useState<string | null>(null);
  const [photoOpen, setPhotoOpen] = useState(false);
  const requestRevision = useRef(0);
  const feedbackY = useRef(0);

  const load = useCallback(() => {
    setLoadFailed(false);
    api
      .writingItems()
      .then(setItems)
      .catch(() => setLoadFailed(true));
  }, []);
  useEffect(load, [load]);

  const tierItems = useMemo(() => (items ?? []).filter((i) => i.tier === tier), [items, tier]);
  const item = tierItems.length ? tierItems[idx % tierItems.length] : null;
  const paths = item?.stroke_paths ?? [];

  const reset = useCallback(() => {
    requestRevision.current += 1;
    setFeedback(null);
    setShowStrokes(false);
    setAttempt((a) => a + 1);
  }, []);

  const go = useCallback(
    (delta: number) => {
      haptics.tap();
      setIdx((i) => (tierItems.length ? (i + delta + tierItems.length) % tierItems.length : 0));
      reset();
    },
    [tierItems.length, reset],
  );

  const show = useCallback((res: WritingAttemptResponse, read: string) => {
    setFeedback({ kind: res.verdict, read });
    if (res.verdict === "correct") haptics.correct();
    else if (res.verdict === "unsure") haptics.near();
    else haptics.incorrect();
    // U5-1: explicit announcement for VoiceOver (alert role covers TalkBack).
    announceVerdict(res.verdict === "wrong" ? "wrong" : res.verdict);
  }, []);

  const onInk = useCallback(
    async (recognised: string, confidence: number) => {
      if (!item) return;
      const revision = requestRevision.current;
      try {
        const result = await api.writingAttempt(item.id, recognised, confidence, "ink");
        if (revision !== requestRevision.current) return;
        show(result, recognised);
        requestAnimationFrame(() => (scrollRef.current as { scrollTo?: (o: object) => void })?.scrollTo?.({ y: Math.max(0, feedbackY.current - 32), animated: true }));
      } catch {
        // A network failure is never a verdict: the writing was fine.
        if (revision === requestRevision.current) setFeedback({ kind: "error", read: "" });
      }
    },
    [item, show],
  );

  const onPhoto = useCallback(
    async (uri: string | null) => {
      if (!item) return;
      const revision = requestRevision.current;
      if (!uri) {
        setFeedback({ kind: "unsure", read: "" });
        return;
      }
      setThumb(uri);
      setPhotoBusy(true);
      try {
        try {
          const res = await api.writingPhotoCheck(item.id, uri);
          if (revision === requestRevision.current) show(res, res.recognised_text ?? "");
        } catch {
          // Endpoint not deployed (404/405), rate limited (429), or a
          // server or network failure: read the photo on the device.
          const out = await photoRecogniser.recognise(uri);
          const text = out?.text ?? "";
          const result = await api.writingAttempt(item.id, text, out?.confidence ?? 0, "photo");
          if (revision === requestRevision.current) show(result, text);
        }
      } catch {
        if (revision === requestRevision.current) setFeedback({ kind: "error", read: "" });
      } finally {
        discardPhoto(uri);
        setThumb(null);
        setPhotoBusy(false);
      }
    },
    [item, photoRecogniser, show],
  );

  const chooseTier = (t: Tier) => {
    haptics.tap();
    setTier(t);
    setIdx(0);
    reset();
  };
  const chooseSource = (s: Source) => {
    haptics.tap();
    setSource(s);
    setFeedback(null);
    if (s === "photo") setPhotoOpen(true);
  };

  const len = [...(item?.devanagari ?? "")].length;
  const letterSize = len <= 2 ? 96 : len <= 4 ? 72 : 56;

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView
        ref={scrollRef as never}
        scrollEnabled={!drawing}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* tier switch */}
        <View style={styles.segment} accessibilityRole="tablist">
          {([1, 2, 3] as Tier[]).map((t) => {
            const on = tier === t;
            return (
              <Pressable
                key={t}
                onPress={() => chooseTier(t)}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${TIER_LABEL[t]} practice`}
                style={[styles.seg, on && styles.segOn]}
              >
                <Text style={[styles.segText, on && styles.segTextOn, script("semibold")]}>{TIER_LABEL[t]}</Text>
              </Pressable>
            );
          })}
        </View>

        {loadFailed ? (
          <FetchError label="Couldn't load the letters." onRetry={load} />
        ) : !items ? (
          <SkeletonGroup count={2} height={160} />
        ) : !item ? (
          <Text style={styles.empty}>No letters here yet.</Text>
        ) : (
          <>
            {/* position + previous / next */}
            <View style={styles.pager}>
              <Pressable
                onPress={() => go(-1)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Previous"
                style={styles.pagerBtn}
              >
                <Ionicons name="chevron-back" size={22} color={color.ink} />
              </Pressable>
              <Text style={styles.pagerText} accessibilityLabel={`${(idx % tierItems.length) + 1} of ${tierItems.length}`}>
                {(idx % tierItems.length) + 1} / {tierItems.length}
              </Text>
              <Pressable
                onPress={() => go(1)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Next"
                style={styles.pagerBtn}
              >
                <Ionicons name="chevron-forward" size={22} color={color.ink} />
              </Pressable>
            </View>

            {/* the target */}
            <View style={styles.target}>
              {showStrokes && paths.length > 0 ? (
                <StrokePathPlayer paths={paths} devanagari={item.devanagari} size={170} autoPlay />
              ) : (
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.35} style={[styles.letter, script("bold"), { fontSize: letterSize, lineHeight: letterSize * 1.5, maxWidth: "100%" }]}>
                  {item.devanagari}
                </Text>
              )}
              {item.iast ? <Text style={[styles.iast, { fontSize: sized(font.sizes.md) }]}>{item.iast}</Text> : null}
              {item.gloss && item.tier === 3 ? (
                <Text style={[styles.gloss, { fontSize: sized(font.sizes.sm) }]} numberOfLines={1}>
                  {item.gloss}
                </Text>
              ) : null}
              {paths.length > 0 && (
                <Button cornerRadius={4}
                  label={showStrokes ? "Hide strokes" : "Watch strokes"}
                  tone="tonal"
                  size="sm"
                  onPress={() => setShowStrokes((v) => !v)}
                  icon={<Ionicons name={showStrokes ? "eye-off" : "play"} size={15} color={accent.saffron.fg} />}
                />
              )}
            </View>

            {/* draw or photograph */}
            <View style={styles.sources}>
              {(
                [
                  { key: "ink", label: "Draw", icon: "brush" },
                  { key: "photo", label: "Photo", icon: "camera" },
                ] as const
              ).map((s) => {
                const on = source === s.key;
                return (
                  <Pressable
                    key={s.key}
                    onPress={() => chooseSource(s.key)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={s.key === "ink" ? "Draw on screen" : "Photograph paper writing"}
                    style={[styles.source, on && styles.sourceOn]}
                  >
                    <Ionicons name={s.icon} size={18} color={on ? color.white : color.inkSoft} />
                    <Text style={[styles.sourceText, on && styles.sourceTextOn]}>{s.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.stage}>
              {source === "ink" ? (
                <WritingCanvas
                  key={`${item.id}-${attempt}`}
                  reference={item.devanagari}
                  referencePaths={paths}
                  recogniser={recogniser}
                  scrollRef={scrollRef as never}
                  onDrawingChange={setDrawing}
                  onAttempt={(text, conf) => void onInk(text, conf)}
                />
              ) : (
                <Button cornerRadius={4} label="Open camera" tone="primary" style={{ borderRadius: 4, width: "100%" }} onPress={() => { setFeedback(null); setPhotoOpen(true); }} />
              )}
            </View>

            <View onLayout={e => { feedbackY.current = e.nativeEvent.layout.y; }} />
            {feedback ? (
              <Animated.View
                entering={FadeIn.duration(180)}
                exiting={FadeOut.duration(120)}
                style={[
                  styles.feedback,
                  feedback.kind === "correct" && styles.fbCorrect,
                  feedback.kind === "unsure" && styles.fbUnsure, // violet, never amber or red (§3.3)
                  (feedback.kind === "wrong" || feedback.kind === "error") && styles.fbWrong,
                ]}
                accessible
                accessibilityRole="alert"
                accessibilityLabel={feedbackLabel(feedback)}
              >
                <Ionicons
                  name={
                    feedback.kind === "correct"
                      ? "checkmark-circle"
                      : feedback.kind === "unsure"
                        ? "help-circle"
                        : feedback.kind === "error"
                          ? "cloud-offline"
                          : "close-circle"
                  }
                  size={24}
                  color={
                    feedback.kind === "correct"
                      ? color.okText
                      : feedback.kind === "unsure"
                        ? color.unsureText
                        : color.badText
                  }
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fbText, { fontSize: sized(font.sizes.base) }]}>{feedbackLine(feedback)}</Text>
                  {source === "photo" && feedback.kind !== "error" && feedback.read ? (
                    <Text style={[styles.fbRead, script("semibold")]}>We read: {feedback.read}</Text>
                  ) : null}
                </View>
              </Animated.View>
            ) : null}

            {feedback ? (
              <View style={styles.actions}>
                {feedback.kind !== "correct" && (
                  <Button cornerRadius={4} label="Try again" tone="tonal" size="md" style={styles.action} onPress={reset} />
                )}
                <Button cornerRadius={4}
                  label="Next"
                  tone={feedback.kind === "correct" ? "primary" : "neutral"}
                  size="md"
                  style={styles.action}
                  onPress={() => go(1)}
                  icon={
                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color={feedback.kind === "correct" ? color.white : color.ink}
                    />
                  }
                />
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
      <Modal visible={photoOpen} animationType="slide" onRequestClose={() => { if (!photoBusy) setPhotoOpen(false); }}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.cameraHeader}><View style={{ flex: 1 }}><Text style={styles.pagerText}>Photograph your writing</Text><Text style={[styles.gloss, script("semibold")]}>Keep {item?.devanagari} inside the frame</Text></View><Pressable disabled={photoBusy} onPress={() => setPhotoOpen(false)} accessibilityRole="button" accessibilityLabel="Close camera" style={styles.pagerBtn}><Ionicons name="close" size={24} color={color.ink} /></Pressable></View>
          <View style={styles.cameraBody}>
            {feedback && !photoBusy ? <View style={styles.photoResult} accessibilityRole="alert"><Text style={[styles.letter, script("bold"), { fontSize: 52 }]}>{item?.devanagari}</Text><Text style={styles.pagerText}>{feedbackLine(feedback)}</Text>{!!feedback.read && <Text style={[styles.fbRead, script("regular")]}>We read: {feedback.read}</Text>}<Button cornerRadius={4} label="Take another photo" onPress={() => setFeedback(null)} style={{ borderRadius: 4 }} /><Button cornerRadius={4} label="Done" tone="neutral" onPress={() => setPhotoOpen(false)} style={{ borderRadius: 4 }} /></View>
              : <PhotoCapture busy={photoBusy} thumbnail={thumb} onCapture={uri => void onPhoto(uri)} />}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function feedbackLine(f: Feedback): string {
  switch (f.kind) {
    case "correct":
      return "Correct";
    case "unsure":
      return "Couldn't read that clearly. Try again.";
    case "wrong":
      return f.read ? `That looks like ${f.read}. Try again.` : "That looks like a different letter. Try again.";
    default:
      return "Couldn't reach the server. Try again.";
  }
}

function feedbackLabel(f: Feedback): string {
  return f.kind === "correct" ? "Correct. Well done." : feedbackLine(f);
}

const styles = StyleSheet.create({
  cameraHeader: { flexDirection: "row", alignItems: "center", padding: space.md, borderBottomWidth: 1, borderBottomColor: color.border, gap: space.sm },
  cameraBody: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.md },
  photoResult: { width: "100%", padding: space.md, gap: space.md, alignItems: "stretch", backgroundColor: color.surface, borderWidth: 1, borderColor: color.border },
  safe: { flex: 1, backgroundColor: color.bg },
  body: { padding: space.lg, paddingBottom: space.xl, gap: space.md },
  segment: {
    flexDirection: "row",
    backgroundColor: color.surfaceMuted,
    borderRadius: 4,
    padding: 4,
  },
  seg: { flex: 1, minHeight: 40, borderRadius: 4, alignItems: "center", justifyContent: "center" },
  segOn: { backgroundColor: color.surface, ...shadow.card },
  segText: { fontSize: font.sizes.sm, color: color.inkSoft },
  segTextOn: { color: accent.saffron.fg },
  empty: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.base, color: color.inkSoft, textAlign: "center", paddingVertical: space.xl },
  pager: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pagerBtn: { width: 44, height: 44, borderRadius: 4, backgroundColor: color.surface, alignItems: "center", justifyContent: "center", ...shadow.card },
  pagerText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.base, color: color.ink },
  target: {
    alignItems: "center",
    gap: space.xs,
    backgroundColor: color.surface,
    borderRadius: 4,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    ...shadow.card,
  },
  letter: { color: color.ink, textAlign: "center" },
  iast: { fontFamily: "Nunito_700Bold", fontWeight: "700", color: color.inkSoft },
  gloss: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: color.inkFaint },
  sources: { flexDirection: "row", gap: space.sm },
  source: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 44,
    borderRadius: 4,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  sourceOn: { backgroundColor: color.saffronBtn, borderColor: color.saffronBtn },
  sourceText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: color.inkSoft },
  sourceTextOn: { color: color.white },
  stage: { alignItems: "center" },
  feedback: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    borderRadius: 4,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    minHeight: 52,
  },
  fbCorrect: { backgroundColor: color.okBg },
  fbUnsure: { backgroundColor: color.unsureBg },
  fbWrong: { backgroundColor: color.badBg },
  fbText: { fontFamily: "Nunito_700Bold", fontWeight: "700", color: color.ink },
  fbRead: { fontSize: font.sizes.base, color: color.inkSoft, marginTop: 2 },
  actions: { flexDirection: "row", gap: space.sm },
  action: { flex: 1 },
});
