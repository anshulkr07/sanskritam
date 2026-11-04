import React, { useCallback, useEffect, useRef, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation, type NavigationProp } from "@react-navigation/native";
import { commerceCatalogue, refreshCommerce, type CommerceCatalogue, type StoreProduct } from "../services/commerce";
import { connectStore, buyProduct, restorePurchases, manageSubscription } from "../services/storePurchases";
import { useAuth } from "../store/auth";
import { BASE_URL } from "../config";
import { color } from "../theme";
import type { RootStackParamList } from "../navigation/types";

export default function Shop({ route }: { route?: { params?: { titleId?: string } } }) {
  const { token } = useAuth();
  const currentToken = useRef(token); currentToken.current = token;
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [shop, setShop] = useState<CommerceCatalogue | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    const result = await commerceCatalogue();
    if (currentToken.current === token) setShop(result);
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
    void connectStore(message => { if (alive) { setMessage(message); void refresh().catch(() => {}); } })
      .then(items => { if (alive) setPrices(Object.fromEntries(items.map(p => [p.id, p.displayPrice]))); })
      .catch(e => { if (alive) setMessage(e.message); });
    return () => { alive = false; };
  }, [refresh]);
  const button = (label: string, action: () => void, disabled = false) => <Pressable accessibilityRole="button"
    disabled={busy || disabled} onPress={action} style={[styles.button, (busy || disabled) && { opacity: .45 }]}>
    <Text style={styles.buttonText}>{label}</Text></Pressable>;
  const offer = (p: StoreProduct) => {
    const owned = p.kind === "edition" && p.titles?.every(t => shop?.owned_titles.includes(t));
    return <View key={p.id} style={styles.offer}><Text style={styles.heading}>{p.name}</Text>
      {p.kind === "subscription" && <Text style={styles.body}>{p.id.endsWith("annual") ? "Billed yearly" : "Billed monthly"} · renews until cancelled</Text>}
      {p.kind === "edition" && <Text style={styles.body}>Keep this edition, including offline access. Included while Plus is active.</Text>}
      {p.kind === "voice_pack" && <Text style={styles.body}>No subscription required. Purchased minutes do not expire.</Text>}
      {button(owned ? "Purchased" : `${p.kind === "edition" ? "Buy this edition" : p.kind === "voice_pack" ? "Buy minutes" : "Subscribe"} · ${prices[p.id] ?? "Unavailable"}`,
        () => void run(() => buyProduct(p.id)), !!owned || !prices[p.id] || !shop?.sales_enabled || !shop.account_verified)}
    </View>;
  };
  const titleId = route?.params?.titleId;
  const products = shop?.products ?? [];
  return <ScrollView contentContainerStyle={styles.page}>
    <Text style={styles.title}>Books, Guru & Plus</Text>
    <Text style={styles.body}>Buy an edition, talk for a few minutes, or subscribe for regular learning.</Text>
    {!!message && <Text accessibilityLiveRegion="polite" style={styles.body}>{message}</Text>}
    {shop && !shop.account_verified && <Text style={styles.body}>Sign in with Google or Apple from your account to protect purchases and claim your trial.</Text>}
    {shop && !shop.sales_enabled && <Text style={styles.body}>Purchases are being prepared.</Text>}
    {shop?.member_until && <Text style={styles.body}>Plus access until {new Date(shop.member_until + "Z").toLocaleDateString()}</Text>}
    <Text style={styles.heading}>Guru conversations</Text>
    <Text style={styles.body}>{shop ? `${Math.floor(shop.paid_seconds / 60)} purchased minutes · ${Math.ceil(shop.trial_seconds / 60)} free trial minutes remaining` : "One free 3-minute introduction, then optional minute packs."}</Text>
    {!!shop?.deficit_seconds && <Text style={styles.body}>A refunded pack left a minute deficit. Contact support or add minutes.</Text>}
    {button(shop?.trial_seconds ? "Try Guru free" : "Talk to Guru", () => navigation.navigate("GuruVoice"), !shop?.voice_enabled || !shop.account_verified || shop.call_active || (shop.paid_seconds + shop.trial_seconds < 1))}
    {products.filter(p => p.kind === "voice_pack").map(offer)}
    <Text style={styles.heading}>Your editions</Text>
    {products.filter(p => p.kind === "edition" && (!titleId || p.titles?.includes(titleId))).map(offer)}
    {!products.some(p => p.kind === "edition") && <Text style={styles.body}>Premium editions will appear here when ready. Explore the free library in Read.</Text>}
    <Text style={styles.heading}>Plus membership</Text>
    <Text style={styles.body}>Access published premium editions while subscribed. Books you buy separately remain yours after cancellation. Voice packs are separate.</Text>
    {products.filter(p => p.kind === "subscription").map(offer)}
    {button("Restore purchases", () => void run(async () => { await restorePurchases(); await refreshCommerce(); }))}
    {button("Manage subscription", () => void run(manageSubscription))}
    {button("Purchase terms", () => void Linking.openURL(BASE_URL + "/commerce/terms"))}
  </ScrollView>;
}
const styles = StyleSheet.create({ page: { padding: 20, gap: 14, backgroundColor: color.bg },
  title: { fontSize: 26, fontWeight: "700", color: color.ink }, heading: { fontSize: 18, fontWeight: "700", color: color.ink },
  body: { fontSize: 15, lineHeight: 22, color: color.ink }, offer: { paddingVertical: 14, borderBottomWidth: 1, borderColor: color.inkFaint, gap: 8 },
  button: { backgroundColor: color.saffron, padding: 14, borderRadius: 8 }, buttonText: { color: "#fff", fontWeight: "700", textAlign: "center" } });
