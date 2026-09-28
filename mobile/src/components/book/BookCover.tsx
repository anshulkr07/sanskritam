// BookCover — the hardcover of a canon book (Read tab).
//
// One face, two sizes: the card at the top of a book's contents (tap it, or
// "Open book"), and the full-page cover an opening book turns away first
// (PageCurlBook's `cover`). Cloth board, a darker spine band, a gold frame and
// a gold-foil title — an object lying on the paper, not a dark theme. Gold on
// cloth measures 5.5:1, AA at any size.

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTypeScale } from "../../hooks/useTypeScale";
import { color, font, radius, script, shadow, space } from "../../theme";

export const COVER_CLOTH = "#7A2E22";
const SPINE = "#5E2119";
const GOLD = "#E8C27A";
const GOLD_LINE = "rgba(232,194,122,0.5)";
const PAGE_BLOCK = "#F1E4C8";
const PAGE_BLOCK_EDGE = "#E2D2B2";

/** The endpaper inside the board — what a turning cover shows. A board lets no ink through. */
export const ENDPAPER: [number, number, number, number] = [0.93, 0.87, 0.76, 0];

interface BookCoverProps {
  titleSa: string;
  titleEn: string;
  /** A short line under the title, e.g. "47 verses". */
  caption?: string;
  /** A reading position is saved: the ribbon shows. */
  bookmarked?: boolean;
  variant: "card" | "full";
  onPress?: () => void;
}

export default function BookCover({
  titleSa,
  titleEn,
  caption,
  bookmarked = false,
  variant,
  onPress,
}: BookCoverProps) {
  const { sized } = useTypeScale();
  const full = variant === "full";
  const saSize = sized(full ? 38 : 26, { sanskrit: true });

  const face = (
    <View style={[styles.board, full ? styles.boardFull : styles.boardCard]}>
      <View style={styles.spine} />
      <View style={[styles.frame, full && styles.frameFull]}>
        <View style={styles.frameInner}>
          <Text
            style={[styles.titleSa, script("bold"), { fontSize: saSize, lineHeight: Math.round(saSize * 1.45) }]}
            numberOfLines={2}
          >
            {titleSa}
          </Text>
          <View style={styles.ornament}>
            <View style={styles.ornamentRule} />
            <View style={styles.ornamentDiamond} />
            <View style={styles.ornamentRule} />
          </View>
          <Text
            style={[styles.titleEn, { fontSize: sized(full ? font.sizes.lg : font.sizes.md) }]}
            numberOfLines={2}
          >
            {titleEn}
          </Text>
          {caption ? (
            <Text style={[styles.caption, { fontSize: sized(font.sizes.xs) }]} numberOfLines={1}>
              {caption}
            </Text>
          ) : null}
        </View>
      </View>
      {bookmarked ? (
        <View style={styles.ribbon} pointerEvents="none">
          <View style={styles.ribbonNotch} />
        </View>
      ) : null}
    </View>
  );

  if (full) return face;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Open ${titleEn}`}
      accessibilityHint={bookmarked ? "Opens at your bookmark" : undefined}
    >
      {/* The page block, peeking out past the board. */}
      <View style={styles.pageBlock} />
      {face}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { paddingRight: 5, paddingBottom: 5 },
  pressed: { transform: [{ translateY: 2 }] },
  pageBlock: {
    position: "absolute",
    left: 12,
    top: 6,
    right: 0,
    bottom: 0,
    backgroundColor: PAGE_BLOCK,
    borderWidth: 1,
    borderColor: PAGE_BLOCK_EDGE,
    borderTopRightRadius: radius.md,
    borderBottomRightRadius: radius.md,
    borderBottomLeftRadius: radius.sm,
  },
  board: {
    flexDirection: "row",
    backgroundColor: COVER_CLOTH,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    borderTopRightRadius: radius.md,
    borderBottomRightRadius: radius.md,
    overflow: "hidden",
  },
  boardCard: { minHeight: 188, ...shadow.card },
  boardFull: { flex: 1 },
  spine: {
    width: 14,
    backgroundColor: SPINE,
    borderRightWidth: 1,
    borderRightColor: "rgba(0,0,0,0.18)",
  },
  frame: {
    flex: 1,
    margin: space.sm,
    padding: 3,
    borderWidth: 1.5,
    borderColor: GOLD_LINE,
    borderRadius: radius.sm,
  },
  frameFull: { margin: space.lg },
  frameInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    borderWidth: 1,
    borderColor: GOLD_LINE,
    borderRadius: radius.sm - 3,
  },
  titleSa: { color: GOLD, textAlign: "center" },
  ornament: { flexDirection: "row", alignItems: "center", gap: 8, marginVertical: space.xs },
  ornamentRule: { width: 36, height: 1, backgroundColor: GOLD_LINE },
  ornamentDiamond: { width: 7, height: 7, backgroundColor: GOLD, transform: [{ rotate: "45deg" }] },
  titleEn: {
    color: GOLD,
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  caption: {
    color: GOLD,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
    marginTop: space.xs,
  },
  ribbon: {
    position: "absolute",
    top: 0,
    right: space.xl,
    width: 14,
    height: 46,
    backgroundColor: color.saffron,
  },
  ribbonNotch: {
    position: "absolute",
    bottom: -5,
    left: 2,
    width: 10,
    height: 10,
    backgroundColor: COVER_CLOTH,
    transform: [{ rotate: "45deg" }],
  },
});
