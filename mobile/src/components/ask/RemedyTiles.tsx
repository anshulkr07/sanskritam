// RemedyTiles — the remedies kind: what to eat, drink or do for a complaint.
//
// One full-width tile per remedy, a deep fill with cream text. An Ionicons
// glyph by type, the name in bold, "What goes in" as one line, "How" as
// numbered lines, "When" as one line. No pills. Cream-on-fill pairs are
// guarded by scripts/check-contrast.mjs.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { AskRemedy } from "../../api/client";
import { fill, fillAt, font, onFill, space } from "../../theme";
import { plain } from "../../utils/text";

type GlyphName = React.ComponentProps<typeof Ionicons>["name"];

const GLYPH: Record<string, GlyphName> = {
  drink: "cafe-outline",
  food: "restaurant-outline",
  herb: "leaf-outline",
  oil: "water-outline",
  practice: "body-outline",
};

export default function RemedyTiles({ remedies }: { remedies: AskRemedy[] }) {
  return (
    <View style={styles.wrap}>
      {(remedies ?? []).map((r, i) => {
        const name = fillAt(i);
        const bg = fill[name];
        return (
          <View
            key={i}
            style={[styles.tile, { backgroundColor: bg }]}
            accessible
            accessibilityRole="text"
            accessibilityLabel={`${r.name}. What goes in: ${(r.what ?? []).join(", ")}. ${(r.how ?? []).join(" ")} ${r.when ?? ""}`}
          >
            <View style={styles.head}>
              <Ionicons name={GLYPH[r.type] ?? GLYPH.practice} size={18} color={onFill.text} />
              <Text style={styles.name}>{plain(r.name)}</Text>
            </View>
            {(r.what ?? []).length > 0 && (
              <Text style={styles.line}>What goes in: {(r.what ?? []).map((w) => plain(w)).join(", ")}</Text>
            )}
            {(r.how ?? []).map((h, j) => (
              <Text key={j} style={styles.line}>
                {j + 1}. {plain(h)}
              </Text>
            ))}
            {!!r.when && <Text style={styles.line}>When: {plain(r.when)}</Text>}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  tile: { borderRadius: 12, padding: space.sm, gap: 4 },
  head: { flexDirection: "row", alignItems: "center", gap: space.xs },
  name: {
    flex: 1,
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.base,
    color: onFill.text,
    lineHeight: 24,
  },
  line: {
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
    fontSize: font.sizes.sm,
    color: onFill.text,
    lineHeight: 21,
  },
});
