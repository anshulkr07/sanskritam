import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { commerceCatalogue, ensureCommerce, unlockTitle, type CommerceTitle } from "../services/commerce";
import { showRewardedExtension } from "../services/ads";
import { invalidateCache } from "../services/apiCache";
import { color } from "../theme";

export default function CommerceAccess({ slug, medium = "book", chapter = "", onChange }: { slug: string; medium?: "book" | "audio"; chapter?: string; onChange?: () => void }) {
  const [title, setTitle] = useState<CommerceTitle | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [adsAllowed, setAdsAllowed] = useState(false);
  useEffect(() => {
    let alive = true;
    void Promise.all([ensureCommerce(), commerceCatalogue()]).then(([wallet, catalogue]) => {
      if (alive) setAdsAllowed(catalogue.ads_enabled && wallet.tier === "free");
      if (alive && catalogue.enabled && !wallet.unlocks.some(u => u.title_id === `${slug}:${medium}`))
        setTitle(catalogue.titles.find(t => t.id === `${slug}:${medium}`) ?? null);
    }).catch(() => {});
    return () => { alive = false; };
  }, [slug, medium]);
  if (!title) return null;
  const run = async (ad: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      if (ad) await showRewardedExtension(title.id, medium === "audio" ? "audio" : "reading", chapter);
      else if (!await unlockTitle(title)) return;
      invalidateCache("reader-"); invalidateCache("canon"); invalidateCache("paged-");
      if (!ad) setTitle(null);
      onChange?.();
    } catch (e) { setMessage(e instanceof Error ? e.message : "Please retry."); }
    finally { setBusy(false); }
  };
  return <View style={styles.card}>
    <Text style={styles.text}>You’re exploring a preview.</Text>
    <Pressable disabled={busy} onPress={() => void run(false)} accessibilityRole="button"><Text style={styles.link}>Unlock {medium === "audio" ? "audiobook" : "book"} · {title.credits} credits · one slot</Text></Pressable>
    {adsAllowed && <Pressable disabled={busy} onPress={() => void run(true)} accessibilityRole="button"><Text style={styles.link}>Watch an optional ad for {medium === "audio" ? "2 more minutes" : "one more chapter or excerpt"}</Text></Pressable>}
    {!!message && <Text style={styles.text}>{message}</Text>}
  </View>;
}
const styles = StyleSheet.create({ card: { padding: 12, gap: 8, backgroundColor: color.saffronLight, borderRadius: 12, margin: 8 }, text: { fontSize: 13, color: color.ink }, link: { color: color.saffron, fontWeight: "700", fontSize: 14, paddingVertical: 4 } });
