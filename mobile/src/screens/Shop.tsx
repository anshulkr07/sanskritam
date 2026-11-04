import React, { useCallback, useEffect, useRef, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation, type NavigationProp } from "@react-navigation/native";
import { refreshCommerce, type CommerceCatalogue, type StoreProduct } from "../services/commerce";
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
    const result = await refreshCommerce();
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
    const liteIncluded = p.titles?.every(t => shop?.catalogue.some(title => title.id === t && title.lite_included));
    const current = p.kind === "subscription" && (shop?.member_tier === p.tier || (shop?.member_tier === "pro" && p.tier === "plus"));
    return <View key={p.id} style={styles.offer}><Text style={styles.heading}>{p.name}</Text>
      {p.kind === "subscription" && <Text style={styles.body}>{p.id.endsWith("annual") ? "Billed yearly" : "Billed monthly"} · renews until cancelled</Text>}
      {p.kind === "subscription" && <Text style={styles.body}>{p.tier === "lite"
        ? "No ads. Read and stream the Lite collection, with background audio. Buy editions separately to download them."
        : "No ads. Read, listen and download the full subscription catalogue, with background audio."}</Text>}
      {p.kind === "edition" && <Text style={styles.body}>Keep this edition with ad-free reading/listening, downloads and background audio. Also included while {liteIncluded ? "Lite or Plus" : "Plus"} is active.</Text>}
      {p.kind === "voice_pack" && <Text style={styles.body}>No subscription required. Purchased minutes do not expire.</Text>}
      {button(owned ? "Purchased" : `${p.kind === "edition" ? "Buy this edition" : p.kind === "voice_pack" ? "Buy minutes" : current ? "Change billing period" : shop?.member_until ? "Change plan" : "Subscribe"} · ${prices[p.id] ?? "Unavailable"}`,
        () => void run(() => buyProduct(p.id)), !!owned || !prices[p.id] || !shop?.sales_enabled || !shop.account_verified)}
    </View>;
  };
  const titleId = route?.params?.titleId;
  const products = shop?.products ?? [];
  return <ScrollView contentContainerStyle={styles.page}>
    <Text style={styles.title}>Books, Guru & memberships</Text>
    <Text style={styles.body}>Buy an edition, talk for a few minutes, or subscribe for regular learning.</Text>
    {!!message && <Text accessibilityLiveRegion="polite" style={styles.body}>{message}</Text>}
    {shop && !shop.account_verified && <Text style={styles.body}>Sign in with Google or Apple from your account to protect purchases and claim your trial.</Text>}
    {shop && !shop.sales_enabled && <Text style={styles.body}>Purchases are being prepared.</Text>}
    {shop?.member_until && <Text style={styles.body}>{shop.member_tier === "lite" ? "Lite" : "Plus"} access until {new Date(shop.member_until + "Z").toLocaleDateString()}. Manage your subscription to review renewal and scheduled changes.</Text>}
    <Text style={styles.heading}>Guru conversations</Text>
    <Text style={styles.body}>{shop ? `${Math.floor(shop.paid_seconds / 60)} purchased minutes · ${Math.ceil(shop.trial_seconds / 60)} free trial minutes remaining` : "One free 3-minute introduction, then optional minute packs."}</Text>
    {!!shop?.deficit_seconds && <Text style={styles.body}>A refunded pack left a minute deficit. Contact support or add minutes.</Text>}
    {button(shop?.trial_seconds ? "Try Guru free" : "Talk to Guru", () => navigation.navigate("GuruVoice"), !shop?.voice_enabled || !shop.account_verified || shop.call_active || (shop.paid_seconds + shop.trial_seconds < 1))}
    {products.filter(p => p.kind === "voice_pack").map(offer)}
    <Text style={styles.heading}>Your editions</Text>
    {products.filter(p => p.kind === "edition" && (!titleId || p.titles?.includes(titleId))).map(offer)}
    {!products.some(p => p.kind === "edition") && <Text style={styles.body}>Premium editions will appear here when ready. Explore the free library in Read.</Text>}
    <Text style={styles.heading}>Lite & Plus memberships</Text>
    <Text style={styles.body}>Both plans are ad-free and include background audio. Lite includes the starter collection below; Plus includes the full subscription catalogue and premium downloads. Books you buy separately remain yours after cancellation. Voice packs are separate.</Text>
    <Text style={styles.heading}>Included with Lite</Text>
    {shop?.catalogue.filter(t => t.lite_included).map(t => <Text key={t.id} style={styles.body}>{t.name} · {t.medium === "audio" ? "Audiobook" : "Book"}</Text>)}
    {!shop?.catalogue.some(t => t.lite_included) && <Text style={styles.body}>The Lite collection is being prepared. Lite will be available once its included editions are published.</Text>}
    {products.filter(p => p.kind === "subscription").map(offer)}
    {shop?.member_until && <Text style={styles.body}>Google Play plan changes take effect at renewal. Apple shows the effective date before you confirm. Your current verified access continues until the store applies the change.</Text>}
    {button("Restore purchases", () => void run(async () => { await restorePurchases(); await refreshCommerce(); }))}
    {button("Manage subscription", () => void run(manageSubscription))}
    {button("Purchase terms", () => void Linking.openURL(BASE_URL + "/commerce/terms"))}
  </ScrollView>;
}
const styles = StyleSheet.create({ page: { padding: 20, gap: 14, backgroundColor: color.bg },
  title: { fontSize: 26, fontWeight: "700", color: color.ink }, heading: { fontSize: 18, fontWeight: "700", color: color.ink },
  body: { fontSize: 15, lineHeight: 22, color: color.ink }, offer: { paddingVertical: 14, borderBottomWidth: 1, borderColor: color.inkFaint, gap: 8 },
  button: { backgroundColor: color.saffron, padding: 14, borderRadius: 8 }, buttonText: { color: "#fff", fontWeight: "700", textAlign: "center" } });
