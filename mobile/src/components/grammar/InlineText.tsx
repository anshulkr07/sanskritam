// InlineText — guide prose with the only two markups the content allows:
// **bold** and {{संस्कृत}}. A Sanskrit span renders in saffron script so it never
// blurs into Hindi prose (both Devanagari); Hindi prose is plain ink in the
// Devanagari face and is announced as Hindi to screen readers.

import React from "react";
import { StyleSheet, Text, type StyleProp, type TextStyle } from "react-native";

import type { GuideLang } from "../../api/client";
import { color, script } from "../../theme";

interface Part {
  text: string;
  bold: boolean;
  sanskrit: boolean;
}

const TOKEN = /(\*\*[^*]+\*\*|\{\{[^}]+\}\})/g;

export function parseInline(src: string): Part[] {
  const parts: Part[] = [];
  let last = 0;
  for (const m of src.matchAll(TOKEN)) {
    const at = m.index ?? 0;
    if (at > last) parts.push({ text: src.slice(last, at), bold: false, sanskrit: false });
    const token = m[0];
    parts.push({ text: token.slice(2, -2), bold: token.startsWith("**"), sanskrit: token.startsWith("{{") });
    last = at + token.length;
  }
  if (last < src.length) parts.push({ text: src.slice(last), bold: false, sanskrit: false });
  return parts;
}

export default function InlineText({
  text,
  lang,
  style,
  numberOfLines,
}: {
  text: string;
  lang: GuideLang;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  const parts = React.useMemo(() => parseInline(text), [text]);
  const hindi = lang === "hi";
  return (
    <Text
      style={[style, hindi && script("regular")]}
      accessibilityLanguage={hindi ? "hi-IN" : "en-IN"}
      numberOfLines={numberOfLines}
    >
      {parts.map((p, i) =>
        p.sanskrit ? (
          <Text key={i} style={[script("semibold"), styles.sanskrit]}>
            {p.text}
          </Text>
        ) : p.bold ? (
          <Text key={i} style={hindi ? script("bold") : styles.bold}>
            {p.text}
          </Text>
        ) : (
          p.text
        ),
      )}
    </Text>
  );
}

const styles = StyleSheet.create({
  sanskrit: { color: color.saffronText },
  bold: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800" },
});
