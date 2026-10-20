// The verse painting in the reader's two illustrated layouts (owner,
// 2026-10-20): at the head of the verse page (D, the default) or on a page of
// its own before the verse (A). Either way the complete painting shows,
// contained at its own proportions; the verse text stays live app text.

import React, { useState } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { ArtworkImage } from "./ArtworkImage";
import { containedArtworkFrame, verseArtworkFor } from "./verseArtwork";

function variantFor(sourceRef: string, tablet: boolean) {
  const art = verseArtworkFor(sourceRef);
  return art ? { alt: art.alt, ...(tablet ? art.variants.tablet : art.variants.phone) } : null;
}

/** D: the painting across the top of the page, at most `maxHeight` tall. */
export function VerseArtworkTop({ sourceRef, maxHeight, onReady }: { sourceRef: string; maxHeight: number; onReady?: () => void }) {
  const window = useWindowDimensions();
  const [width, setWidth] = useState(0);
  const variant = variantFor(sourceRef, Math.min(window.width, window.height) >= 600);
  if (!variant) return null;
  const scale = width > 0 ? Math.min(width / variant.width, maxHeight / variant.height) : 0;
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ alignSelf: "stretch", alignItems: "center", marginBottom: 20 }}>
      {scale > 0 && (
        <ArtworkImage
          source={{ uri: variant.uri }}
          resizeMode="contain"
          accessibilityLabel={variant.alt}
          onLoadEnd={onReady}
          style={{ width: variant.width * scale, height: variant.height * scale }}
        />
      )}
    </View>
  );
}

/** A: the painting alone on its page, with the verse's reference under it. */
export function VerseArtworkPage({ sourceRef, page, soft, onReady }: { sourceRef: string; page: string; soft: string; onReady?: () => void }) {
  const window = useWindowDimensions();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const variant = variantFor(sourceRef, Math.min(window.width, window.height) >= 600);
  const frame = variant ? containedArtworkFrame(size.width, size.height, variant.width, variant.height) : null;
  return (
    <View style={{ flex: 1, backgroundColor: page, paddingTop: 24, paddingBottom: 16 }}>
      <View style={{ flex: 1 }} onLayout={(e) => setSize(e.nativeEvent.layout)}>
        {variant && frame && frame.width > 0 && (
          <ArtworkImage
            source={{ uri: variant.uri }}
            resizeMode="contain"
            accessibilityLabel={variant.alt}
            onLoadEnd={onReady}
            style={{ position: "absolute", ...frame }}
          />
        )}
      </View>
      <Text style={{ textAlign: "center", fontSize: 13, fontWeight: "600", color: soft, marginTop: 12 }}>
        {sourceRef} · turn for the verse
      </Text>
    </View>
  );
}
