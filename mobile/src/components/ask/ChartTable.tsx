// ChartTable — the calculated birth chart under a kundli answer.
//
// Everything here came from the server's calculation (backend/app/services/
// kundli.py), never from the model: the lagna, where each graha stands, its
// house and nakshatra, and the running dasha. The reading above it is the
// model's; this is what it read.

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { AskChart } from "../../api/client";
import { color, font, script, space } from "../../theme";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function day(iso: string): string {
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  return y && m && d ? `${d} ${MONTHS[m - 1]} ${y}` : iso;
}

const FLAGS: Record<string, string> = { exalted: "exalted", debilitated: "debilitated", "own sign": "own sign" };

export default function ChartTable({ chart }: { chart: AskChart }) {
  const { lagna, dasha } = chart;
  return (
    <View style={styles.wrap} accessibilityLabel="Your birth chart">
      <Text style={styles.head}>Your chart</Text>
      <Text style={styles.line}>
        {lagna ? (
          <>
            Lagna <Text style={script("semibold")}>{lagna.sign_sa}</Text> {lagna.sign_roman} ({lagna.sign_en}){" "}
            {lagna.deg}, {lagna.nakshatra} {lagna.pada}
          </>
        ) : (
          "Birth time unknown: houses are counted from the Moon."
        )}
      </Text>
      <Text style={styles.line}>
        Moon sign <Text style={script("semibold")}>{chart.moon_sign_sa}</Text> ({chart.moon_sign_en}), birth nakshatra{" "}
        {chart.nakshatra} {chart.pada}
      </Text>

      <View style={styles.table} accessibilityRole="list">
        <View style={[styles.row, styles.rowHead]}>
          <Text style={[styles.cell, styles.cGraha, styles.th]}>Graha</Text>
          <Text style={[styles.cell, styles.cSign, styles.th]}>Rashi</Text>
          <Text style={[styles.cell, styles.cHouse, styles.th]}>House</Text>
          <Text style={[styles.cell, styles.cNak, styles.th]}>Nakshatra</Text>
        </View>
        {chart.planets.map((p) => {
          const notes = [p.retro && p.key !== "rahu" && p.key !== "ketu" ? "R" : "", FLAGS[p.dignity] ?? ""]
            .filter(Boolean)
            .join(", ");
          return (
            <View
              key={p.key}
              style={styles.row}
              accessible
              accessibilityLabel={`${p.name} in ${p.sign_en}, house ${p.house}, ${p.nakshatra} ${p.pada}${notes ? ", " + notes : ""}`}
            >
              <Text style={[styles.cell, styles.cGraha]}>
                <Text style={script("semibold")}>{p.name_sa}</Text>
                {"\n"}
                <Text style={styles.sub}>{p.name}</Text>
              </Text>
              <Text style={[styles.cell, styles.cSign]}>
                <Text style={script("semibold")}>{p.sign_sa}</Text> {p.deg}
                {"\n"}
                <Text style={styles.sub}>{p.sign_en}{notes ? ` · ${notes}` : ""}</Text>
              </Text>
              <Text style={[styles.cell, styles.cHouse]}>{p.house}</Text>
              <Text style={[styles.cell, styles.cNak]}>
                {p.nakshatra} {p.pada}
              </Text>
            </View>
          );
        })}
      </View>

      {!!dasha.maha && (
        <Text style={styles.line}>
          {dasha.maha.lord} mahadasha until {day(dasha.maha.end)}
          {dasha.antar ? `, ${dasha.antar.lord} antardasha until ${day(dasha.antar.end)}` : ""}
        </Text>
      )}
      <Text style={styles.note}>
        Sidereal zodiac, {chart.conventions.ayanamsa} ayanamsa, whole-sign houses, {chart.conventions.node} node.
      </Text>
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
  line: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.sm, color: color.ink, lineHeight: 21 },
  table: { marginTop: space.xs, borderTopWidth: 1, borderTopColor: color.border },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
    gap: space.xs,
  },
  rowHead: { paddingVertical: 4 },
  cell: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: 13, color: color.ink, lineHeight: 19 },
  th: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 11, color: color.inkSoft },
  cGraha: { flex: 1.1 },
  cSign: { flex: 1.6 },
  cHouse: { flex: 0.6, textAlign: "center" },
  cNak: { flex: 1.4 },
  sub: { fontFamily: "Nunito_500Medium", fontWeight: "500", fontSize: 12, color: color.inkSoft },
  note: { fontFamily: "Nunito_500Medium", fontWeight: "500", fontSize: 12, color: color.inkSoft, marginTop: 2 },
});
