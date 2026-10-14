// MatchTable — the calculated gun milan under a matching answer.
//
// Every number here came from the server's calculation (backend/app/services/
// milan.py), never from the model: each koota with what it compared and its
// points, the total out of 36 and how the total is usually read, the Nadi and
// Bhakoot doshas (and the exception that decided them, if one did), and
// Manglik on each side. The reading above it is the
// model's; this is what it read.

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { AskMatch } from "../../api/client";
import { color, fill, font, onFill, space } from "../../theme";

function pts(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export default function MatchTable({ match, askerIs }: { match: AskMatch; askerIs?: "boy" | "girl" }) {
  const label = (side: "boy" | "girl") => (askerIs ? (side === askerIs ? "You" : "Partner") : side === "boy" ? "Boy" : "Girl");
  const doshas = [match.nadi_dosha && "Nadi dosha", match.bhakoot_dosha && "Bhakoot dosha"].filter(Boolean) as string[];
  const manglik = (["boy", "girl"] as const).map((side) => {
    const from = match[side].manglik_from;
    return `${label(side)}: ${from.length ? `Manglik (from ${from.join(", ")})` : "not Manglik"}`;
  });

  return (
    <View style={styles.wrap} accessibilityLabel={`Gun milan ${pts(match.total)} of 36`}>
      <Text style={styles.head}>Gun milan</Text>
      <View style={styles.totalRow}>
        <Text style={styles.total}>
          {pts(match.total)}
          <Text style={styles.of}> / 36</Text>
        </Text>
        <Text style={styles.verdict}>{match.verdict}</Text>
      </View>

      <Text style={styles.line}>
        {label("boy")}: {match.boy.rashi}, {match.boy.nakshatra} {match.boy.pada} · {label("girl")}: {match.girl.rashi},{" "}
        {match.girl.nakshatra} {match.girl.pada}
      </Text>

      <View style={styles.table}>
        <View style={[styles.row, styles.rowHead]}>
          <Text style={[styles.cell, styles.cName, styles.th]}>Koota</Text>
          <Text style={[styles.cell, styles.cSide, styles.th]}>{label("boy")}</Text>
          <Text style={[styles.cell, styles.cSide, styles.th]}>{label("girl")}</Text>
          <Text style={[styles.cell, styles.cPts, styles.th]}>Points</Text>
        </View>
        {match.kootas.map((k) => (
          <View
            key={k.key}
            style={styles.row}
            accessible
            accessibilityLabel={`${k.name}: ${pts(k.points)} of ${pts(k.max)}, ${k.boy} and ${k.girl}`}
          >
            <Text style={[styles.cell, styles.cName]}>{k.name}</Text>
            <Text style={[styles.cell, styles.cSide, styles.sub]}>{k.boy}</Text>
            <Text style={[styles.cell, styles.cSide, styles.sub]}>{k.girl}</Text>
            <Text style={[styles.cell, styles.cPts, k.points === 0 && styles.zero]}>
              {pts(k.points)}/{pts(k.max)}
            </Text>
          </View>
        ))}
      </View>

      {doshas.length > 0 && <Text style={styles.dosha}>{doshas.join(" · ")}</Text>}
      {!!match.exception && <Text style={styles.line}>Nadi and Bhakoot: {match.exception}.</Text>}
      {manglik.map((m) => (
        <Text key={m} style={styles.line}>
          {m}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4, marginTop: space.xs },
  head: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: 11,
    color: color.inkSoft,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    backgroundColor: fill.ink,
    borderRadius: 10,
    paddingHorizontal: space.sm,
    paddingVertical: 8,
  },
  total: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 22, color: onFill.text },
  of: { fontSize: 14, color: onFill.soft },
  verdict: {
    flexShrink: 1,
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.sm,
    color: onFill.text,
    textTransform: "capitalize",
    textAlign: "right",
  },
  line: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.sm, color: color.ink, lineHeight: 21 },
  table: { marginTop: space.xs, borderTopWidth: 1, borderTopColor: color.border },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
    gap: space.xs,
  },
  rowHead: { paddingVertical: 4 },
  cell: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: 13, color: color.ink },
  th: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 11, color: color.inkSoft },
  cName: { flex: 1.2 },
  cSide: { flex: 1.3 },
  cPts: { flex: 0.8, textAlign: "right" },
  sub: { fontFamily: "Nunito_500Medium", fontWeight: "500", fontSize: 12, color: color.inkSoft },
  zero: { color: color.badText },
  dosha: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: color.badText },
});
