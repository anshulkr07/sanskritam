import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, View, Text, Pressable, StyleSheet, TextInput, Linking, Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { request } from "../api/client";
import { commerceCatalogue, refreshCommerce, confirmSpend, unlockTitle, formatMinor, type Wallet, type CommerceCatalogue } from "../services/commerce";
import { connectStore, buyProduct, restorePurchases, manageSubscription } from "../services/storePurchases";
import { color, space } from "../theme";
import { advertisingPrivacy } from "../services/ads";
import { GOOGLE_CLIENT_IDS } from "../config";
import { BASE_URL, PRIVACY_POLICY_URL } from "../config";

export default function Membership() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [catalogue, setCatalogue] = useState<CommerceCatalogue | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<{ id: string; amount: number; kind: string; created_at: string }[]>([]);
  const [referrals, setReferrals] = useState<{ code: string | null; rewards: { id: string; amount_minor: number; currency: string; state: string }[] } | null>(null);
  const [referralCode, setReferralCode] = useState("");
  const [country, setCountry] = useState("");
  const [recipient, setRecipient] = useState("");
  const refresh = useCallback(async () => {
    const [w, c, h, r] = await Promise.all([refreshCommerce(), commerceCatalogue(),
      request<typeof history>("/commerce/history", {}, true), request<NonNullable<typeof referrals>>("/commerce/referrals", {}, true)]);
    setWallet(w); setCatalogue(c); setHistory(h); setReferrals(r);
  }, []);
  const run = async (fn: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true); setMessage("");
    try { await fn(); await refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Please try again."); }
    finally { setBusy(false); }
  };
  useFocusEffect(useCallback(() => { void refresh().catch(e => setMessage(e.message)); }, [refresh]));
  useEffect(() => {
    void connectStore(message => { setMessage(message); void refresh().catch(() => {}); })
      .then(products => setPrices(Object.fromEntries(products.map(p => [p.id, p.displayPrice]))))
      .catch(e => setMessage(e.message));
  }, [refresh]);
  const button = (label: string, action: () => Promise<unknown>, disabled = false) => (
    <Pressable disabled={busy || disabled} onPress={() => void run(action)} accessibilityRole="button" style={[styles.button, (busy || disabled) && { opacity: .45 }]}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
  return <ScrollView contentContainerStyle={styles.page}>
    <Text style={styles.title}>Membership & credits</Text>
    <Text style={styles.balance}>{wallet?.available ?? "—"} credits available</Text>
    <Text style={styles.body}>{wallet?.tier ?? "Free"} · {wallet?.unlocks.length ?? 0}/{wallet?.slots ?? "∞"} active titles</Text>
    {!!wallet?.supporter_badges?.length && <Text style={styles.notice}>✦ Sanskritam supporter · {wallet.supporter_badges.join(" · ")}</Text>}
    {!!wallet?.reserved && <Text style={styles.body}>{wallet.reserved} credits reserved for active requests</Text>}
    {!!wallet?.deficit && <Text style={styles.error}>A refunded purchase left a {wallet.deficit}-credit deficit. Resolve it before further spending.</Text>}
    {!catalogue?.sales_enabled && <Text style={styles.notice}>Purchases are being prepared. Prices and plans below describe the upcoming offer.</Text>}
    {!!message && <Text accessibilityLiveRegion="polite" style={styles.notice}>{message}</Text>}
    <Text style={styles.body}>Membership adds offline access, background audio and more active title slots. Every book and audiobook uses its own credit unlock. Credits do not expire.</Text>
    {!catalogue?.account_verified && <View style={styles.card}>
      <Text style={styles.heading}>Protect your purchases</Text><Text style={styles.small}>Link a verified sign-in to keep this account, credits and titles across devices.</Text>
      {button("Link Google sign-in", async () => {
        const { GoogleSignin } = await import("@react-native-google-signin/google-signin");
        GoogleSignin.configure({ webClientId: GOOGLE_CLIENT_IDS.webClientId });
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        const response = await GoogleSignin.signIn();
        const token = response.data?.idToken;
        if (!token) throw new Error("Google did not return a completed sign-in token.");
        await request("/commerce/accounts/link", { method: "POST", body: JSON.stringify({ provider: "google", id_token: token }) }, true);
        await connectStore(setMessage);
      })}
      {Platform.OS === "ios" && button("Link Apple sign-in", async () => {
        const apple = await import("expo-apple-authentication");
        const result = await apple.signInAsync({ requestedScopes: [] });
        if (!result.identityToken) throw new Error("Apple did not return an identity token.");
        await request("/commerce/accounts/link", { method: "POST", body: JSON.stringify({ provider: "apple", id_token: result.identityToken }) }, true);
        await connectStore(setMessage);
      })}
    </View>}
    {catalogue?.products.filter(p => p.kind === "subscription").map(p => <View key={p.id} style={styles.card}>
      <Text style={styles.heading}>{p.tier?.toUpperCase()} · {prices[p.id] ?? `India reference: ₹${p.inr}`} / month</Text>
      <Text style={styles.body}>{p.credits} credits each paid month · {p.tier === "lite" ? "10" : p.tier === "plus" ? "20" : "Unlimited"} active titles · ad-free</Text>
      <Text style={styles.small}>Automatically renews until cancelled in your store settings. Title access continues throughout membership and for 365 days after paid access ends.</Text>
      {button("Choose " + p.tier, () => buyProduct(p.id), !catalogue.sales_enabled || !prices[p.id])}
    </View>)}
    <Text style={styles.heading}>Refill credits</Text>
    {catalogue?.products.filter(p => p.kind === "refill").map(p => <View key={p.id} style={styles.card}>
      <Text style={styles.body}>{p.credits} non-expiring credits</Text>
      {button(prices[p.id] ?? `₹${p.inr} India reference`, () => buyProduct(p.id), !catalogue.sales_enabled || !prices[p.id])}
    </View>)}
    {button("Restore purchases", restorePurchases, !catalogue?.sales_enabled)}
    {button("Manage subscription", manageSubscription)}
    <Text style={styles.heading}>Your active titles</Text>
    {wallet?.unlocks.map(u => <View key={u.id} style={styles.card}>
      <Text style={styles.body}>{catalogue?.titles.find(t => t.id === u.title_id)?.name ?? u.title_id}</Text>
      <Text style={styles.small}>Access until {new Date(u.expires_at + "Z").toLocaleDateString()}</Text>
      {button("Surrender remaining access", async () => {
        if (await confirmSpend("Surrender title", `Remaining access is permanently lost, without a credit refund. ${wallet.tier === "free" ? `This slot takes 7 days to become reusable; skipping the wait costs ${catalogue?.terms.skip_credits ?? 25} credits.` : "Your member slot can be replaced immediately. The next title costs additional credits."}`))
          await request(`/commerce/unlocks/${u.id}/surrender`, { method: "POST", body: JSON.stringify({ confirmed: true }) }, true);
      })}
    </View>)}
    {wallet?.cooldowns.map(c => <View key={c.id} style={styles.card}>
      <Text style={styles.body}>Slot available {new Date(c.until + "Z").toLocaleString()}</Text>
      {button(`Release slot now · ${catalogue?.terms.skip_credits ?? 25} credits`, async () => {
        const cost = catalogue?.terms.skip_credits ?? 25;
        if (await confirmSpend("Skip cooldown", `Spend ${cost} credits to release this slot now? The next title costs additional credits.`))
          await request(`/commerce/cooldowns/${c.id}/skip`, { method: "POST", body: JSON.stringify({ confirmed: true, expected_credits: cost }) }, true);
      })}
    </View>)}
    <Text style={styles.heading}>Unlock books & audio</Text>
    {catalogue?.titles.filter(t => !wallet?.unlocks.some(u => u.title_id === t.id)).map(t => <View key={t.id} style={styles.card}>
      <Text style={styles.body}>{t.name} · {t.medium === "audio" ? "Audiobook" : "Written book"}</Text>
      {button(`${t.credits} credits · one slot`, () => unlockTitle(t), !catalogue.enabled)}
      {t.metadata.affiliates?.map(link => <Pressable key={link.url} onPress={() => void Linking.openURL(link.url)}>
        <Text style={styles.link}>{link.label}</Text><Text style={styles.small}>{link.disclosure}</Text>
      </Pressable>)}
    </View>)}
    <Text style={styles.heading}>Paid referrals</Text>
    <Text style={styles.body}>Your referral code: {referrals?.code ?? "Set up an adult reward profile below"}</Text>
    <Text style={styles.small}>Earn 20% of net membership receipts for a referred customer's first 3 paid months. 45-day hold, ₹500-equivalent payout threshold, identity and payment review apply. Rewards are separate from credits.</Text>
    <TextInput value={country} onChangeText={v => setCountry(v.toUpperCase().slice(0, 2))} placeholder="Country code, e.g. IN" style={styles.input} autoCapitalize="characters" />
    {button("Confirm I am 18+ and create reward profile", async () => {
      if (await confirmSpend("Adult reward profile", "I confirm I am at least 18 years old and my country is correct. Payment eligibility will be reviewed before fulfilment."))
        await request("/commerce/profile", { method: "PUT", body: JSON.stringify({ country, adult: true, ads_consent: false }) }, true);
    }, country.length !== 2)}
    <TextInput value={referralCode} onChangeText={setReferralCode} placeholder="Referral code before first membership purchase" style={styles.input} />
    {button("Apply referral", () => request("/commerce/referrals/attribute", { method: "POST", body: JSON.stringify({ code: referralCode }) }, true), !referralCode)}
    {referrals?.rewards.map(r => <Text key={r.id} style={styles.small}>{formatMinor(r.amount_minor, r.currency)} · {r.state}</Text>)}
    <TextInput value={recipient} onChangeText={setRecipient} multiline placeholder="Reward delivery instructions. Do not include passwords, card numbers, or PINs." style={styles.input} maxLength={4000} />
    {button("Request a cash payout", () => request("/commerce/referrals/payout", { method: "POST", body: JSON.stringify({ method: "cash", recipient }) }, true), recipient.length < 10)}
    {button("Request a local gift instead", () => request("/commerce/referrals/payout", { method: "POST", body: JSON.stringify({ method: "gift", recipient }) }, true), recipient.length < 10)}
    <Text style={styles.heading}>Advertising privacy</Text>
    {button("Enable optional ads · I confirm I am 18+", () => request("/commerce/profile", { method: "PUT", body: JSON.stringify({ country, adult: true, ads_consent: true }) }, true), country.length !== 2)}
    {button("Disable optional ads", () => request("/commerce/profile", { method: "PUT", body: JSON.stringify({ country, adult: true, ads_consent: false }) }, true), country.length !== 2)}
    {button("Review advertising consent choices", advertisingPrivacy)}
    <Text style={styles.heading}>Support Sanskritam</Text>
    <Text style={styles.small}>Optional digital supporter badges. These purchases are not charitable donations and do not include membership benefits.</Text>
    {catalogue?.products.filter(p => p.kind === "supporter").map(p => <View key={p.id}>{button(`${p.id.split(".").pop()} badge · ${prices[p.id] ?? `₹${p.inr} India reference`}`, () => buyProduct(p.id), !catalogue.sales_enabled || !prices[p.id])}</View>)}
    <Text style={styles.heading}>Credit history</Text>
    {history.map(h => <View key={h.id} style={styles.history}><Text style={styles.body}>{h.kind.replaceAll("_", " ")}</Text><Text>{h.amount > 0 ? "+" : ""}{h.amount}</Text></View>)}
    <Text style={styles.small}>Restoring finds store purchases; your account restores consumed credits and title history. Sign in to the same Sanskritam account on every device.</Text>
    {button("Purchase terms", () => Linking.openURL(BASE_URL + "/commerce/terms"))}
    {button("Privacy policy", () => Linking.openURL(PRIVACY_POLICY_URL))}
  </ScrollView>;
}
const styles = StyleSheet.create({
  page: { padding: space.lg, gap: space.md, paddingBottom: 100, backgroundColor: color.bg },
  title: { fontSize: 27, fontWeight: "800", color: color.ink }, balance: { fontSize: 23, fontWeight: "700", color: color.saffron },
  heading: { fontSize: 18, fontWeight: "700", color: color.ink, marginTop: 10 }, body: { fontSize: 15, lineHeight: 23, color: color.ink },
  small: { fontSize: 12, lineHeight: 19, color: color.inkSoft }, notice: { padding: 14, backgroundColor: color.saffronLight, borderRadius: 12, color: color.ink },
  error: { color: color.badText }, card: { padding: 16, gap: 8, backgroundColor: color.white, borderRadius: 16 },
  button: { padding: 13, borderRadius: 10, backgroundColor: color.saffron, marginVertical: 3 }, buttonText: { color: color.white, fontWeight: "700", textAlign: "center" },
  input: { borderWidth: 1, borderColor: color.inkFaint, borderRadius: 10, padding: 13, color: color.ink },
  history: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }, link: { color: color.saffron, textDecorationLine: "underline" },
});
