// Plans as cards (owner, 2026-11-06, after a reference the owner liked): Free,
// Lite and Plus side by side, swiped on a phone. Each card has a name, a
// promise, one button, the price and what is included. Plus is ink on paper
// with a "Recommended" tag. Read's look: square corners, one action colour.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import MudraCoin from "../MudraCoin";
import type { PlanRules, StoreProduct } from "../../services/commerce";
import { T, ui } from "../../trail/theme";

type Tier = "free" | "lite" | "plus";
type IconName = React.ComponentProps<typeof Ionicons>["name"];
type Line = { text: string; icon?: IconName; coin?: boolean };

const COPY: Record<Tier, { name: string; title: string; promise: string }> = {
  free: { name: "Free", title: "Start learning", promise: "Read, listen and practise, with ads." },
  lite: { name: "Lite", title: "Read and listen freely", promise: "No ads, a quarter off books, AI every month." },
  plus: { name: "Plus", title: "Learn with Guru every day", promise: "Half price on books, four times the Guru time." },
};

function lines(tier: Tier, r: PlanRules): Line[] {
  if (tier === "free") {
    return [
      { text: "5% of every paid book free", icon: "book-outline" },
      { text: `${r.recite_per_day ?? 2} scored recitations a day`, icon: "pulse-outline" },
      { text: "3 Guru minutes to try", icon: "mic-outline" },
      { text: "Ad supported", icon: "megaphone-outline" },
    ];
  }
  const shared: Line[] = [
    { text: `${r.mudra.toLocaleString("en-IN")} Mudrā every month`, coin: true },
    { text: `${r.guru_minutes} Guru minutes a month`, icon: "mic-outline" },
    { text: `${r.recite_per_month} scored recitations a month`, icon: "pulse-outline" },
    { text: `${r.discount}% off books and audiobooks`, icon: "pricetag-outline" },
  ];
  return tier === "lite"
    ? [...shared,
       { text: "No ads anywhere", icon: "eye-off-outline" },
       { text: "Free books saved offline", icon: "download-outline" },
       { text: "AI never waits on busy days", icon: "flash-outline" }]
    : [...shared, { text: "Everything in Lite", icon: "checkmark-outline" }];
}

export default function PlanCards({ rules, product, price, current, worth, disabled, onChoose }: {
  rules: Record<Tier, PlanRules>;
  /** The store product for a paid tier in the chosen billing period. */
  product: (tier: "lite" | "plus") => StoreProduct | undefined;
  /** The store's localized price for a product, when the store has answered. */
  price: (p: StoreProduct) => string | undefined;
  current: Tier;
  worth: (r: PlanRules) => number;
  disabled: boolean;
  onChoose: (p: StoreProduct) => void;
}) {
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(360, width - 72);
  const [at, setAt] = useState(2);
  const tiers: Tier[] = ["free", "lite", "plus"];
  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + 14}
        decelerationRate="fast"
        contentContainerStyle={styles.track}
        // Plus first in view: it is the recommended plan.
        contentOffset={{ x: (cardWidth + 14) * 2, y: 0 }}
        onMomentumScrollEnd={(e) => setAt(Math.round(e.nativeEvent.contentOffset.x / (cardWidth + 14)))}
      >
        {tiers.map((tier) => {
          const dark = tier === "plus";
          const p = tier === "free" ? undefined : product(tier);
          const mine = current === tier;
          const shown = p ? price(p) ?? `₹${p.inr}` : "₹0";
          const period = p && (p.months ?? 1) > 1 ? "/ year" : "/ month";
          const off = mine || tier === "free" || !p || disabled;
          return (
            <View key={tier} style={[styles.card, { width: cardWidth }, dark && styles.cardDark]}>
              <View style={styles.nameRow}>
                <Text style={[styles.name, dark && styles.inkLight]}>{COPY[tier].name}</Text>
                {dark && <Text style={styles.tag}>RECOMMENDED</Text>}
              </View>
              <Text style={[styles.title, dark && styles.inkLight]} accessibilityRole="header">{COPY[tier].title}</Text>
              <Text style={[styles.promise, dark && styles.softLight]}>{COPY[tier].promise}</Text>
              <Pressable
                accessibilityRole="button"
                disabled={off}
                onPress={() => p && onChoose(p)}
                style={[styles.button, mine || tier === "free" ? styles.ghost : styles.fill, off && !mine && tier !== "free" && styles.dim]}
              >
                <Text style={[styles.buttonText, mine || tier === "free" ? styles.ghostText : null]}>
                  {mine ? "Your current plan" : tier === "free" ? "Included" : `Choose ${COPY[tier].name}`}
                </Text>
              </Pressable>
              <View style={styles.priceRow}>
                <Text style={[styles.price, dark && styles.inkLight]}>{shown}</Text>
                <Text style={[styles.period, dark && styles.softLight]}>{tier === "free" ? "/ month" : `${period}, tax included`}</Text>
              </View>
              {tier !== "free" && (
                <Text style={[styles.worth, dark && styles.worthDark]}>Worth about {worth(rules[tier]).toLocaleString("en-IN")} Mudrā a month</Text>
              )}
              <View style={[styles.list, dark && styles.listDark]}>
                {lines(tier, rules[tier]).map((line) => (
                  <View key={line.text} style={styles.line}>
                    {line.coin ? <MudraCoin size={20} /> : <Ionicons name={line.icon ?? "checkmark-outline"} size={20} color={dark ? "#F2C879" : T.ink2} />}
                    <Text style={[styles.lineText, dark && styles.inkLight]}>{line.text}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
      <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {tiers.map((tier, i) => <View key={tier} style={[styles.dot, i === at && styles.dotOn]} />)}
      </View>
    </View>
  );
}

// Fixed light-on-ink colours for the Plus card in both schemes.
const INK = "#2A2019", PAPER = "#F8F2E7", SOFT = "#CDBFAA";

const styles = StyleSheet.create({
  track: { gap: 14, paddingRight: 20 },
  card: { padding: 22, gap: 12, backgroundColor: T.surface, borderWidth: 1, borderColor: T.lineStrong },
  cardDark: { backgroundColor: INK, borderColor: INK },
  nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 26 },
  name: { ...ui("bold"), fontSize: 17, color: T.ink },
  tag: { ...ui("bold"), fontSize: 11, letterSpacing: 1.2, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: T.action, color: T.white },
  title: { ...ui("bold"), fontSize: 25, lineHeight: 30, color: T.ink },
  promise: { ...ui("regular"), fontSize: 14, lineHeight: 20, color: T.ink2 },
  button: { minHeight: 50, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  fill: { backgroundColor: T.action },
  ghost: { borderWidth: 1.5, borderColor: T.lineStrong },
  buttonText: { ...ui("bold"), fontSize: 16, color: T.white },
  ghostText: { color: T.ink3 },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 6, flexWrap: "wrap" },
  price: { ...ui("bold"), fontSize: 34, lineHeight: 40, color: T.ink },
  period: { ...ui("regular"), fontSize: 14, color: T.ink3 },
  worth: { ...ui("semibold"), fontSize: 13, color: T.action, marginTop: -6 },
  worthDark: { color: "#F2C879" },
  list: { gap: 12, paddingTop: 14, borderTopWidth: 1, borderColor: T.line },
  listDark: { borderColor: "#4A3E34" },
  line: { flexDirection: "row", alignItems: "center", gap: 12 },
  lineText: { ...ui("regular"), flex: 1, fontSize: 15, lineHeight: 20, color: T.ink },
  inkLight: { color: PAPER },
  softLight: { color: SOFT },
  dots: { flexDirection: "row", justifyContent: "center", gap: 8, paddingTop: 12 },
  dot: { width: 8, height: 8, backgroundColor: T.lineStrong },
  dotOn: { width: 22, backgroundColor: T.ink },
  dim: { opacity: 0.45 },
});
