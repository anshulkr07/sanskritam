// AlbumArt: a book's square face on the Audio side. A painted cover is
// cropped to its painting (the gold frame and the empty ground fall away);
// a book without one gets its cover colour with the Devanagari title.
//
// The painting sits at about x 50–550, y 50–625 of the 600×900 cover, so the
// image is drawn at 1.2× the square's width and nudged up and left to keep
// the middle of the painting in view.

import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { coverColour, paintedCover } from "./covers";
import { CREAM, sa } from "../../read/look";

export default function AlbumArt({
  bookKey,
  titleSa,
  size,
  framed = false,
}: {
  bookKey: string;
  titleSa: string;
  size: number;
  /** A thin gold edge, for the large art on the book page and the player. */
  framed?: boolean;
}) {
  const painted = paintedCover(bookKey);
  const colour = coverColour(bookKey);
  const edge = framed ? styles.framed : null;

  if (painted) {
    return (
      <View style={[{ width: size, height: size, backgroundColor: colour, overflow: "hidden" }, edge]}>
        <Image
          source={painted}
          accessibilityIgnoresInvertColors
          style={{ position: "absolute", width: size * 1.2, height: size * 1.8, left: -size * 0.1, top: -size * 0.175 }}
        />
      </View>
    );
  }
  const big = size >= 80;
  const fontSize = Math.max(10, Math.min(22, Math.round(size * 0.14)));
  return (
    <View
      style={[
        styles.typo,
        { width: size, height: size, backgroundColor: colour, padding: Math.round(size * 0.1) },
        edge,
      ]}
    >
      {big && <View style={[styles.inner, { margin: Math.round(size * 0.06) }]} />}
      <Text
        style={[sa(fontSize), { color: CREAM, textAlign: "center" }]}
        numberOfLines={3}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
      >
        {titleSa}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  typo: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  inner: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, borderWidth: 1, borderColor: "rgba(255,248,238,0.35)" },
  framed: { borderWidth: 1, borderColor: "rgba(242,200,121,0.6)" },
});
