// WritingScreen (U12-3) — feedback that abstains.
//
// §3.3 is the invariant this screen exists to honour: `unsure` is NEVER red,
// never a failure. A beginner's letterforms are what a recogniser handles
// worst, so most early attempts are uncertain, and the RECOGNISER is the one
// that yields. Verdict rendering:
//   • Recognised — guru-approves tone; the letter settles (soft green).
//   • Unsure — the reference beside what they drew (the player is right
//     there), the invitation is to try once more. Violet (color.unsureBg) —
//     never amber-as-soft-red.
//   • Wrong — only when the recogniser is confident it saw a DIFFERENT
//     letter. Rare by design.
//
// Two claims live here and must not be conflated (U12-3): "that is the
// letter आ" (ML Kit's answer) and "that is how आ is written" (only P20-2's
// stroke data answers). The stroke player is offered on every unsure result.
//
// Placement (U12-5): NOT a seventh tab — this is Varṇamālā's practice mode,
// the same relationship U9-1's mic has to U4-1's articulation map.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import {
  api,
  type WritingAttemptResponse,
  type WritingItem,
} from "../api/client";
import StrokePathPlayer from "../components/writing/StrokePathPlayer";
import WritingCanvas, { type InkRecogniser } from "../components/writing/WritingCanvas";
import PhotoCapture from "../components/writing/PhotoCapture";
import { getInkRecogniser } from "../services/inkRecogniser";
import { getPhotoRecogniser, type PhotoRecogniser } from "../services/photoRecogniser";
import { haptics } from "../services/haptics";
import { announceVerdict } from "../utils/announce";
import { Skeleton, SkeletonGroup } from "../components/Skeleton";
import { useTypeScale } from "../hooks/useTypeScale";
import { color, font, radius, script, space } from "../theme";

type Tier = 1 | 2 | 3;

const TIER_LABEL: Record<Tier, string> = {
  1: "Letters",
  2: "Mātrās",
  3: "Words",
};

export default function WritingScreen() {
  const { sized } = useTypeScale();
  const recogniser = useMemo<InkRecogniser>(() => getInkRecogniser(), []);
  // U12-4: the paper path — same screen, second mode. Recognition stays
  // on-device; what the server sees is identical in shape to ink.
  const photoRecogniser = useMemo<PhotoRecogniser>(() => getPhotoRecogniser(), []);
  const [source, setSource] = useState<"ink" | "photo">("ink");
  const [items, setItems] = useState<WritingItem[] | null>(null);
  const [tier, setTier] = useState<Tier>(1);
  const [idx, setIdx] = useState(0);
  const [feedback, setFeedback] = useState<WritingAttemptResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    api
      .writingItems()
      .then(setItems)
      .catch(() => setLoadError("Couldn't reach the writing corpus."));
  }, []);

  const tierItems = useMemo(
    () => (items ?? []).filter((i) => i.tier === tier),
    [items, tier],
  );
  const item = tierItems.length ? tierItems[idx % tierItems.length] : null;

  const next = useCallback(() => {
    setFeedback(null);
    setIdx((i) => (tierItems.length ? (i + 1) % tierItems.length : 0));
  }, [tierItems.length]);

  const onAttempt = useCallback(
    async (recognised: string, confidence: number, src: "ink" | "photo" = "ink") => {
      if (!item) return;
      try {
        const res = await api.writingAttempt(item.id, recognised, confidence, src);
        setFeedback(res);
        if (res.verdict === "correct") haptics.correct();
        else if (res.verdict === "unsure") haptics.near();
        else haptics.incorrect();
        // U5-1: explicit announcement for VoiceOver (alert role covers TalkBack).
        announceVerdict(res.verdict === "wrong" ? "wrong" : res.verdict);
      } catch {
        // U10-3: a network failure during an attempt never renders as a
        // verdict — the learner's writing was fine; the wire was not.
        setFeedback(null);
      }
    },
    [item],
  );

  // U12-4: photo result feeds the SAME attempt pipeline with source "photo"
  // (the server biases photo thresholds hard toward unsure, P20-4). Empty
  // text reads as unsure downstream — never a bare rejection.
  const onPhotoResult = useCallback(
    (text: string, confidence: number) => {
      haptics.tap();
      void onAttempt(text, confidence, "photo");
    },
    [onAttempt],
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={[styles.title, { fontSize: sized(font.sizes.lg) }]}>Write it</Text>
        <Text style={[styles.subtitle, { fontSize: sized(font.sizes.sm) }]}>
          Trace the strokes, then draw it yourself. Nothing you write leaves this device.
        </Text>

        {/* tier switch */}
        <View style={styles.tierRow}>
          {([1, 2, 3] as Tier[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => {
                haptics.tap();
                setTier(t);
                setIdx(0);
                setFeedback(null);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: tier === t }}
              accessibilityLabel={`${TIER_LABEL[t]} practice`}
              style={[styles.tierBtn, tier === t && styles.tierBtnActive]}
            >
              <Text style={[styles.tierText, tier === t && styles.tierTextActive, script("semibold")]}>
                {TIER_LABEL[t]}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* source switch — ink canvas vs paper photo (U12-4). Not a seventh
            tab: two modes of one practice screen. */}
        <View style={styles.tierRow} accessible accessibilityRole="tablist" accessibilityLabel="Writing source">
          {(["ink", "photo"] as const).map((s) => (
            <Pressable
              key={s}
              onPress={() => {
                haptics.tap();
                setSource(s);
                setFeedback(null);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: source === s }}
              accessibilityLabel={s === "ink" ? "Draw on screen" : "Photograph paper writing"}
              style={[styles.tierBtn, source === s && styles.tierBtnActive]}
            >
              <Text style={[styles.tierText, source === s && styles.tierTextActive, script("semibold")]}>
                {s === "ink" ? "Draw" : "From paper"}
              </Text>
            </Pressable>
          ))}
        </View>

        {loadError ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{loadError}</Text>
            <Pressable
              onPress={() => {
                setLoadError(null);
                api.writingItems().then(setItems).catch(() => setLoadError("Couldn't reach the writing corpus."));
              }}
              accessibilityRole="button"
              accessibilityLabel="Retry"
              style={styles.retryBtn}
            >
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : !items ? (
          <SkeletonGroup count={2} height={160} />
        ) : !item ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>No items in this tier yet.</Text>
          </View>
        ) : (
          <>
            <View style={styles.playerWrap}>
              <StrokePathPlayer
                paths={item.stroke_paths ?? []}
                devanagari={item.devanagari}
                autoPlay
              />
            </View>

            {item.iast ? (
              <Text style={[styles.iast, { fontSize: sized(font.sizes.sm) }]}>{item.iast}</Text>
            ) : null}
            {item.gloss && item.tier === 3 ? (
              <Text style={[styles.gloss, { fontSize: sized(font.sizes.sm) }]} numberOfLines={1}>
                {item.gloss}
              </Text>
            ) : null}

            {source === "ink" ? (
              <>
                <WritingCanvas
                  reference={item.devanagari}
                  referencePaths={item.stroke_paths ?? []}
                  recogniser={recogniser}
                  onAttempt={(recognised, confidence) => void onAttempt(recognised, confidence, "ink")}
                />
                <Pressable
                  onPress={() => {
                    haptics.tap();
                    setSource("photo");
                    setFeedback(null);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Try photographing paper writing instead"
                  style={styles.photoLink}
                >
                  <Text style={styles.photoLinkText}>Wrote it on paper instead? Photograph it →</Text>
                </Pressable>
              </>
            ) : (
              <PhotoCapture
                reference={item.devanagari}
                recogniser={photoRecogniser}
                onResult={onPhotoResult}
              />
            )}

            {feedback ? (
              <Animated.View
                entering={FadeIn.duration(180)}
                exiting={FadeOut.duration(120)}
                style={[
                  styles.feedback,
                  feedback.verdict === "correct" && styles.fbCorrect,
                  feedback.verdict === "unsure" && styles.fbUnsure,
                  feedback.verdict === "wrong" && styles.fbWrong,
                ]}
                accessible
                accessibilityRole="alert"
                accessibilityLabel={feedbackVerdictLabel(feedback.verdict)}
              >
                <Ionicons
                  name={
                    feedback.verdict === "correct"
                      ? "checkmark-circle"
                      : feedback.verdict === "unsure"
                        ? "help-circle"
                        : "close-circle"
                  }
                  size={22}
                  color={
                    feedback.verdict === "correct"
                      ? color.okText
                      : feedback.verdict === "unsure"
                        ? color.unsureText
                        : color.badText
                  }
                />
                <Text style={[styles.fbText, { fontSize: sized(font.sizes.sm) }]}>
                  {feedbackCopy(feedback.verdict)}
                </Text>
              </Animated.View>
            ) : null}

            <Pressable
              onPress={next}
              accessibilityRole="button"
              accessibilityLabel="Next letter"
              style={styles.nextBtn}
            >
              <Text style={styles.nextText}>Next</Text>
              <Ionicons name="arrow-forward" size={18} color={color.white} />
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** §3.3 copy: the system failed to hear/read, never the learner failed. */
function feedbackCopy(verdict: WritingAttemptResponse["verdict"]): string {
  if (verdict === "correct") return "साधु! That's the letter.";
  if (verdict === "unsure")
    return "I couldn't read that clearly — no penalty. Compare with the reference, watch the strokes, try once more.";
  return "That reads as a different letter. Compare with the reference and try again.";
}

function feedbackVerdictLabel(verdict: WritingAttemptResponse["verdict"]): string {
  if (verdict === "correct") return "Correct. Well done.";
  if (verdict === "unsure") return "Not clear enough to judge. No penalty. Try once more.";
  return "Reads as a different letter. Try again.";
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  body: { padding: space.md, paddingBottom: space.xl, gap: space.sm },
  title: { fontWeight: "800", color: color.ink },
  subtitle: { color: color.inkSoft },
  tierRow: { flexDirection: "row", gap: space.xs, marginTop: space.xxs },
  tierBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  tierBtnActive: { backgroundColor: color.saffronLight, borderColor: color.saffron },
  tierText: { fontSize: font.sizes.sm, color: color.inkSoft, fontWeight: "700" },
  tierTextActive: { color: color.saffronText },
  playerWrap: { alignItems: "center", marginTop: space.xs },
  photoLink: { minHeight: 44, alignItems: "center", justifyContent: "center", marginTop: space.xs },
  photoLinkText: { fontSize: font.sizes.sm, color: color.saffronText, fontWeight: "700" },
  iast: { color: color.inkSoft, textAlign: "center", fontStyle: "italic" },
  gloss: { color: color.inkFaint, textAlign: "center" },
  center: { alignItems: "center", gap: space.sm, paddingVertical: space.lg },
  errorText: { color: color.badText, fontSize: font.sizes.sm, textAlign: "center" },
  retryBtn: {
    minHeight: 44,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.saffron,
    alignItems: "center",
    justifyContent: "center",
  },
  retryText: { color: color.saffronText, fontWeight: "700" },
  feedback: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    minHeight: 48,
  },
  fbCorrect: { backgroundColor: color.okBg },
  fbUnsure: { backgroundColor: color.unsureBg }, // violet — never amber/red (§3.3)
  fbWrong: { backgroundColor: color.badBg },
  fbText: { color: color.ink, flex: 1 },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
    backgroundColor: color.saffron,
    minHeight: 52,
    borderRadius: radius.md,
    marginTop: space.xs,
  },
  nextText: { color: color.white, fontWeight: "800", fontSize: font.sizes.base },
});
