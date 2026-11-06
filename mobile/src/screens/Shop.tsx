// The Mudrā shop: the owner's pick, shop B (2026-11-06), a ledger kept short.
// Your balance; Mudrā packs (three presets and a custom amount) and the Lite
// and Plus plans from Google Play / the App Store (their local prices); and the
// latest Mudrā added and spent, downloadable as CSV. Books are bought on their
// own pages and Guru minutes on the Guru screen, not here (owner, 2026-11-06).
//
// Plans work like Claude's Pro and Max against its API: a monthly allowance
// worth several times its price if the same use were bought with Mudrā one
// piece at a time (commerce/plans.py).

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useFocusEffect } from "@react-navigation/native";

import MudraCoin from "../components/MudraCoin";
import PlanCards from "../components/shop/PlanCards";
import { refreshCommerce, type CommerceCatalogue, type PlanRules, type StoreProduct } from "../services/commerce";
import { mudraHistory, type LedgerItem } from "../services/mudra";
import { downloadMudraHistory } from "../services/mudraExport";
import { connectStore, buyProduct, restorePurchases, manageSubscription } from "../services/storePurchases";
import { useAuth } from "../store/auth";
import { BASE_URL } from "../config";
import { F, T, ui } from "../trail/theme";

export default function Shop(_props: { route?: { params?: { titleId?: string } } }) {
  const { token } = useAuth();
  const currentToken = useRef(token); currentToken.current = token;
  const [shop, setShop] = useState<CommerceCatalogue | null>(null);
  const [ledger, setLedger] = useState<LedgerItem[]>([]);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [yearly, setYearly] = useState(false);
  const [customAt, setCustomAt] = useState<number | null>(null);
  const refresh = useCallback(async () => {
    const result = await refreshCommerce();
    if (currentToken.current !== token) return;
    setShop(result);
    setLedger(await mudraHistory().catch(() => []));
  }, [token]);
  const run = async (fn: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true); setMessage("");
    try { await fn(); await refresh(); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Please try again."); }
    finally { setBusy(false); }
  };
  useFocusEffect(useCallback(() => { void refresh().catch(e => setMessage(e.message)); }, [refresh]));
  useEffect(() => {
    let alive = true;
    setShop(null); setPrices({});
    void connectStore(note => { if (alive) { setMessage(note); void refresh().catch(() => {}); } })
      .then(items => { if (alive) setPrices(Object.fromEntries(items.map(p => [p.id, p.displayPrice]))); })
      .catch(e => { if (alive) setMessage(e.message); });
    return () => { alive = false; };
  }, [refresh]);

  const products = shop?.products ?? [];
  // Every pack follows one rule (backend hybrid.mudra_for_inr); three are rows,
  // and "Custom amount" steps through all of them.
  const packs = products.filter(p => p.kind === "refill").sort((a, b) => a.inr - b.inr);
  const presets = packs.filter(p => p.preset);
  const customIndex = customAt ?? Math.max(0, packs.findIndex(p => p.inr === 499));
  const custom = packs[Math.min(customIndex, packs.length - 1)];
  const planProduct = (tier: "lite" | "plus") =>
    products.find(p => p.kind === "subscription" && p.tier === tier && ((p.months ?? 1) > 1) === yearly);
  const canPay = !!shop?.sales_enabled && !!shop?.account_verified;
  const available = shop?.mudra.available ?? 0;
  const plan = shop?.plan;
  const rules = shop?.plans;
  // What a plan month would cost bought with Mudrā one piece at a time, at the
  // best Guru-minute rate on sale: the "cheaper in the long run" figure.
  const perMinute = Math.min(...(shop?.guru_minutes ?? []).map(g => g.price / g.minutes), 10);
  const worth = (r: PlanRules) => Math.round((r.mudra + r.guru_minutes * perMinute) / 10) * 10;

  const buyPack = (p: StoreProduct) => void run(() => buyProduct(p.id));
  const packOff = (p: StoreProduct | undefined) => !p || busy || !canPay || !prices[p.id];

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headName}>मुद्रा</Text>
          <Text style={styles.headAmount} accessibilityLabel={`${available} Mudrā`}>{available.toLocaleString("en-IN")}</Text>
        </View>
        <MudraCoin size={56} />
      </View>
      {!!shop?.mudra.deficit && (
        <Text style={styles.warn}>A refunded purchase took back {shop.mudra.deficit} Mudrā that had been spent. Add Mudrā to spend again.</Text>
      )}
      {!!message && <Text accessibilityLiveRegion="polite" style={styles.body}>{message}</Text>}
      {shop && !shop.account_verified && <Text style={styles.body}>Sign in with Google or Apple from your account to protect purchases and restore them.</Text>}
      {shop && !shop.sales_enabled && <Text style={styles.body}>Mudrā packs are being prepared.</Text>}

      <Section title="Add Mudrā">
        {presets.map(p => (
          <View key={p.id} style={styles.row}>
            <Text style={styles.rowAmount}>
              {p.credits.toLocaleString("en-IN")}
              {!!p.extra && <Text style={styles.extra}>{`  · ${p.extra} extra`}</Text>}
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`Buy ${p.credits} Mudrā${prices[p.id] ? " for " + prices[p.id] : ""}`}
              disabled={packOff(p)} onPress={() => buyPack(p)} style={[styles.fill, packOff(p) && styles.dim]}>
              <Text style={styles.fillText}>{prices[p.id] ?? "—"}</Text>
            </Pressable>
          </View>
        ))}
        {custom && (
          <View style={[styles.row, styles.rowLast]}>
            <View style={styles.stepper} accessibilityRole="adjustable" accessibilityLabel={`Custom amount, ${custom.credits} Mudrā`}
              accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
              onAccessibilityAction={e => setCustomAt(Math.max(0, Math.min(packs.length - 1, customIndex + (e.nativeEvent.actionName === "increment" ? 1 : -1))))}>
              <Pressable accessibilityRole="button" accessibilityLabel="Fewer Mudrā" disabled={customIndex <= 0}
                onPress={() => setCustomAt(Math.max(0, customIndex - 1))} style={[styles.step, customIndex <= 0 && styles.dim]}>
                <Text style={styles.stepText}>−</Text>
              </Pressable>
              <View style={styles.custom}>
                <Text style={styles.rowAmount}>{custom.credits.toLocaleString("en-IN")}</Text>
                <Text style={styles.customSub}>{custom.extra ? `custom · ${custom.extra} extra` : "custom amount"}</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="More Mudrā" disabled={customIndex >= packs.length - 1}
                onPress={() => setCustomAt(Math.min(packs.length - 1, customIndex + 1))} style={[styles.step, customIndex >= packs.length - 1 && styles.dim]}>
                <Text style={styles.stepText}>+</Text>
              </Pressable>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={`Buy ${custom.credits} Mudrā${prices[custom.id] ? " for " + prices[custom.id] : ""}`}
              disabled={packOff(custom)} onPress={() => buyPack(custom)} style={[styles.fill, packOff(custom) && styles.dim]}>
              <Text style={styles.fillText}>{prices[custom.id] ?? "—"}</Text>
            </Pressable>
          </View>
        )}
        {!packs.length && <Text style={styles.body}>Mudrā packs appear here once there is something to spend them on.</Text>}
        {!!packs.length && <Text style={styles.small}>One Mudrā a rupee; 10% extra from ₹299, 20% extra from ₹999.</Text>}
      </Section>

      {rules && (planProduct("lite") || planProduct("plus")) && (
        <Section title="Plans">
          <Text style={styles.body}>A plan is a month of Sanskritam at a fraction of what the same use costs in Mudrā. What you buy stays yours after a plan ends.</Text>
          {plan && plan.tier !== "free" && plan.guru && (
            <Text style={styles.status}>
              {plan.tier === "lite" ? "Lite" : "Plus"} · {Math.floor(plan.guru.left_seconds / 60)} of {plan.guru.total_minutes} Guru minutes and {plan.recite.left} of {plan.recite.total} recitations left
              {plan.month_ends ? ` until ${new Date(plan.month_ends + "Z").toLocaleDateString()}` : ""}
            </Text>
          )}
          <View style={styles.toggle} accessibilityRole="radiogroup">
            {[false, true].map(y => (
              <Pressable key={String(y)} onPress={() => setYearly(y)} accessibilityRole="radio" accessibilityState={{ selected: yearly === y }}
                style={[styles.toggleCell, yearly === y && styles.toggleOn]}>
                <Text style={[styles.toggleText, yearly === y && styles.toggleTextOn]}>{y ? "Yearly · 2 months free" : "Monthly"}</Text>
              </Pressable>
            ))}
          </View>
          <PlanCards
            rules={rules}
            product={planProduct}
            price={(p) => prices[p.id]}
            current={plan?.tier ?? "free"}
            worth={worth}
            disabled={busy || !canPay}
            onChoose={(p) => void run(() => buyProduct(p.id))}
          />
          <Text style={styles.small}>Guru minutes and recitations renew each plan month and do not carry over; Mudrā do. Books bought at a plan's price stay yours. Renews until cancelled; Google Play changes a plan at renewal.</Text>
        </Section>
      )}

      {ledger.length > 0 && (
        <Section title="History" action={{ label: "Download CSV", onPress: () => void run(downloadMudraHistory), disabled: busy }}>
          {ledger.slice(0, 10).map((item, i, all) => (
            <View key={`${item.at}-${i}`} style={[styles.ledgerRow, i === all.length - 1 && styles.rowLast]}>
              <Text style={styles.ledgerLabel} numberOfLines={1}>{item.label}</Text>
              <Text style={[styles.ledgerAmount, item.amount > 0 && styles.ledgerIn]}>
                {item.amount > 0 ? "+" : "−"}{Math.abs(item.amount).toLocaleString("en-IN")}
              </Text>
            </View>
          ))}
        </Section>
      )}

      <View style={styles.links}>
        <Pressable accessibilityRole="button" onPress={() => void run(async () => { await restorePurchases(); await refreshCommerce(); })} style={styles.link}><Text style={styles.linkText}>Restore purchases</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => void run(manageSubscription)} style={styles.link}><Text style={styles.linkText}>Manage subscription</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => void Linking.openURL(BASE_URL + "/commerce/terms")} style={styles.link}><Text style={styles.linkText}>Mudrā and purchase terms</Text></Pressable>
      </View>
      <Text style={styles.small}>Mudrā can be spent only in Sanskritam. They have no cash value and cannot be cashed out or transferred.</Text>
    </ScrollView>
  );
}

function Section({ title, action, children }: {
  title: string;
  action?: { label: string; onPress: () => void; disabled?: boolean };
  children: React.ReactNode;
}) {
  return (
    <View>
      <View style={styles.sectionHead}>
        <Text style={styles.eyebrow} accessibilityRole="header">{title.toUpperCase()}</Text>
        {action && (
          <Pressable accessibilityRole="button" onPress={action.onPress} disabled={action.disabled} style={[styles.sectionAction, action.disabled && styles.dim]}>
            <Text style={styles.linkText}>{action.label}</Text>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

// Shop B: a ledger on paper. Rules, not boxes; one action colour; square corners.
const styles = StyleSheet.create({
  page: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40, gap: 18, backgroundColor: T.paper },
  head: { flexDirection: "row", alignItems: "flex-end", borderBottomWidth: 2, borderColor: T.ink, paddingBottom: 12 },
  headName: { fontFamily: F.sa, fontSize: 20, lineHeight: 30, color: T.ink2 },
  headAmount: { ...ui("bold"), fontSize: 44, lineHeight: 48, color: T.ink, fontVariant: ["tabular-nums"] },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 28 },
  sectionAction: { minHeight: 44, justifyContent: "center", paddingLeft: 12 },
  eyebrow: { ...ui("bold"), fontSize: 12, letterSpacing: 1.2, color: T.ink3, paddingBottom: 6 },
  body: { ...ui("regular"), fontSize: 15, lineHeight: 22, color: T.ink, paddingBottom: 8 },
  status: { ...ui("semibold"), fontSize: 14, lineHeight: 20, color: T.action, paddingBottom: 8 },
  warn: { ...ui("semibold"), fontSize: 14, lineHeight: 20, color: T.wrongInk },
  small: { ...ui("regular"), fontSize: 12, lineHeight: 18, color: T.ink3, paddingTop: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52, borderTopWidth: 1, borderColor: T.line },
  rowLast: { borderBottomWidth: 1 },
  rowAmount: { ...ui("bold"), flex: 1, fontSize: 18, color: T.ink, fontVariant: ["tabular-nums"] },
  extra: { ...ui("semibold"), fontSize: 13, color: T.action },
  stepper: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  step: { width: 44, height: 44, borderWidth: 1, borderColor: T.lineStrong, alignItems: "center", justifyContent: "center", backgroundColor: T.surface },
  stepText: { ...ui("bold"), fontSize: 20, color: T.ink },
  custom: { flex: 1, alignItems: "center" },
  customSub: { ...ui("semibold"), fontSize: 12, color: T.action },
  fill: { minHeight: 44, minWidth: 96, paddingHorizontal: 12, backgroundColor: T.action, alignItems: "center", justifyContent: "center" },
  fillText: { ...ui("bold"), fontSize: 15, color: T.white },
  toggle: { flexDirection: "row", borderWidth: 1, borderColor: T.lineStrong, marginBottom: 10 },
  toggleCell: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", backgroundColor: T.surface },
  toggleOn: { backgroundColor: T.ink },
  toggleText: { ...ui("semibold"), fontSize: 14, color: T.ink },
  toggleTextOn: { color: T.paper },
  ledgerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 40, borderTopWidth: 1, borderColor: T.line, gap: 12 },
  ledgerLabel: { ...ui("regular"), flex: 1, fontSize: 14, color: T.ink },
  ledgerAmount: { ...ui("bold"), fontSize: 14, color: T.ink, fontVariant: ["tabular-nums"] },
  ledgerIn: { color: T.doneInk },
  links: { gap: 4, marginTop: 8, borderTopWidth: 1, borderColor: T.line, paddingTop: 8 },
  link: { minHeight: 44, justifyContent: "center" },
  linkText: { ...ui("semibold"), color: T.action },
  dim: { opacity: 0.45 },
});
