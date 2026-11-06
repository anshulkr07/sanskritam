// Buy a book, its audiobook, or both, with Mudrā: the owner's pick, buy sheet B
// (2026-11-06): the cover, three choices side by side, one buy button. Opened
// from the free preview (a page outside it, its end, the audiobook player, a
// book's own page). Shows the price and the balance before anything is spent;
// what is bought is kept for good. Read's look: paper, ink, one action colour,
// square corners.

import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation, type NavigationProp } from "@react-navigation/native";

import Modal from "./AudioModal";
import MudraCoin from "./MudraCoin";
import { api } from "../api/client";
import { cachedGet } from "../services/apiCache";
import { commerceCatalogue, type CommerceCatalogue } from "../services/commerce";
import { editionChoices, newSpendId, slugOf, spendMudra, type EditionChoice } from "../services/mudra";
import type { RootStackParamList } from "../navigation/types";
import { F, T, ui } from "../trail/theme";

const COVER = { page: "#6B1F2A", ink: "#FFF8EE", rule: "#F2C879" };

export default function BuyWithMudra({
  visible,
  titleId,
  eyebrow = "Free preview",
  onClose,
  onBought,
}: {
  visible: boolean;
  /** "gita:book" or "gita:audio": the one the reader is on is chosen first. */
  titleId: string;
  /** The small line above the heading, e.g. "Free preview". */
  eyebrow?: string;
  onClose: () => void;
  onBought?: (titles: string[]) => void;
}) {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [shop, setShop] = useState<CommerceCatalogue | null>(null);
  const [failed, setFailed] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [titleSa, setTitleSa] = useState("");
  const attempts = useRef<Record<string, string>>({});
  const slug = slugOf(titleId);

  useEffect(() => {
    if (!visible) return;
    let alive = true;
    setMessage(""); setFailed(""); setPicked(null);
    commerceCatalogue()
      .then((s) => { if (alive) setShop(s); })
      .catch((e) => { if (alive) setFailed(e instanceof Error ? e.message : "Couldn't load prices."); });
    cachedGet("canon", api.canon, 30 * 60_000)
      .then((c) => { if (alive) setTitleSa(c.texts.find((t) => t.slug === slug)?.title_sa ?? ""); })
      .catch(() => {});
    return () => { alive = false; };
  }, [visible, titleId, slug]);

  const choices = shop ? editionChoices(shop, slug) : [];
  const first = choices.find((c) => c.titles.length === 1 && c.titles[0] === titleId) ?? choices[0];
  const choice = choices.find((c) => c.item === picked) ?? first;
  const single = (c: EditionChoice) => c.titles.length === 1;
  const saving = (c: EditionChoice) => single(c) ? 0 : choices.filter(single).reduce((sum, x) => sum + x.price, 0) - c.price;
  // The price without a plan, shown struck through when a plan pays less.
  const listOf = (c: EditionChoice) => {
    const sum = c.titles.reduce((total, t) => total + (shop?.prices[t] ?? 0), 0);
    return single(c) ? sum : Math.floor(sum * (shop?.both_discount || 0.9));
  };
  const discount = shop?.discount ?? 0;
  const planName = shop?.member_tier === "plus" ? "Plus" : shop?.member_tier === "lite" ? "Lite" : "";
  const name = shop?.catalogue.find((t) => t.id === slug + ":book")?.name ?? shop?.catalogue.find((t) => t.id === titleId)?.name ?? "";
  const available = shop?.mudra.available ?? 0;
  const short = choice ? Math.max(0, choice.price - available) : 0;
  const listening = titleId.endsWith(":audio");
  const what = !choice ? "" : !single(choice) ? "both" : choice.titles[0].endsWith(":audio") ? "the audiobook" : "the book";

  const getMudra = () => {
    onClose();
    navigation.navigate("Shop", { titleId });
  };

  const buy = async () => {
    if (!choice || busy) return;
    if (short > 0) { getMudra(); return; }
    setBusy(true); setMessage("");
    try {
      attempts.current[choice.item] ??= newSpendId();
      await spendMudra(choice.item, choice.price, attempts.current[choice.item]);
      delete attempts.current[choice.item];
      onBought?.(choice.titles);
      onClose();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Please try again.");
      setShop(await commerceCatalogue().catch(() => shop));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.wrap}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.head}>
            <View style={styles.cover} accessible={false}>
              {!!titleSa && <Text style={styles.coverText} numberOfLines={3}>{titleSa}</Text>}
              <View style={styles.coverRule} />
            </View>
            <View style={styles.headText}>
              <Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text>
              <Text style={styles.title} accessibilityRole="header">
                {name ? `${listening ? "Hear" : "Read"} all of ${name}` : listening ? "Hear the whole audiobook" : "Read the whole book"}
              </Text>
              {shop && (
                <View style={styles.walletRow}>
                  <MudraCoin size={15} />
                  <Text style={styles.wallet}>{available.toLocaleString("en-IN")} in your wallet</Text>
                </View>
              )}
            </View>
          </View>
          {!shop && !failed && <ActivityIndicator color={T.action} />}
          {!!failed && <Text style={styles.note}>{failed}</Text>}
          {shop && choices.length === 0 && <Text style={styles.note}>This is already yours, or not for sale yet.</Text>}
          {shop && choices.length > 0 && choice && (
            <>
              <View style={styles.grid} accessibilityRole="radiogroup">
                {choices.map((c, i) => {
                  const on = c.item === choice.item;
                  return (
                    <Pressable
                      key={c.item}
                      onPress={() => setPicked(c.item)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on }}
                      accessibilityLabel={`${c.label}, ${c.price} Mudrā`}
                      style={[styles.cell, i > 0 && styles.cellDivider, on && styles.cellOn]}
                    >
                      <Text style={[styles.cellLabel, on && styles.cellLabelOn]}>{single(c) ? c.label : "Both"}</Text>
                      {discount > 0 && listOf(c) > c.price && (
                        <Text style={[styles.was, on && styles.cellLabelOn]} accessibilityLabel={`was ${listOf(c)}`}>{listOf(c).toLocaleString("en-IN")}</Text>
                      )}
                      <View style={styles.cellPrice}>
                        <MudraCoin size={16} />
                        <Text style={[styles.cellAmount, on && styles.cellLabelOn]}>{c.price.toLocaleString("en-IN")}</Text>
                      </View>
                      {saving(c) > 0 && <Text style={[styles.saving, on && styles.savingOn]}>{saving(c)} less</Text>}
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.note}>
                {discount > 0 && planName ? `${planName} price: ${discount}% off. ` : ""}Yours for good, on every plan. {what === "the audiobook" ? "Listen offline" : "Read offline"}, with no ads in {what === "both" ? "either" : listening ? "this audiobook" : "this book"}.
              </Text>
              {short > 0 && <Text style={styles.message}>You need {short.toLocaleString("en-IN")} more Mudrā.</Text>}
              {!!message && <Text style={styles.message} accessibilityLiveRegion="polite">{message}</Text>}
              <Pressable
                onPress={() => void buy()}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={short > 0 ? "Get Mudrā" : `Buy ${what} for ${choice.price} Mudrā`}
                style={({ pressed }) => [styles.buy, (pressed || busy) && { opacity: 0.85 }]}
              >
                {busy ? <ActivityIndicator color={T.white} /> : short > 0 ? (
                  <Text style={styles.buyText}>Get Mudrā</Text>
                ) : (
                  <View style={styles.buyRow}>
                    <Text style={styles.buyText}>Buy {what} for</Text>
                    <MudraCoin size={19} />
                    <Text style={styles.buyText}>{choice.price.toLocaleString("en-IN")}</Text>
                  </View>
                )}
              </Pressable>
            </>
          )}
          <View style={styles.foot}>
            {shop ? (
              <Pressable onPress={getMudra} accessibilityRole="link" style={styles.footBtn}>
                <Text style={styles.link}>Get more Mudrā</Text>
              </Pressable>
            ) : <View />}
            <Pressable onPress={onClose} accessibilityRole="button" style={styles.footBtn}>
              <Text style={styles.close}>Not now</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: T.scrim, justifyContent: "flex-end" },
  sheet: { backgroundColor: T.paper, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 26, gap: 16, borderTopWidth: 1, borderColor: T.lineStrong },
  head: { flexDirection: "row", gap: 16, alignItems: "stretch" },
  cover: { width: 84, height: 112, backgroundColor: COVER.page, alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 6 },
  coverText: { fontFamily: F.sa, fontSize: 17, lineHeight: 24, color: COVER.ink, textAlign: "center" },
  coverRule: { width: 28, height: 1, backgroundColor: COVER.rule },
  headText: { flex: 1, justifyContent: "center", gap: 4 },
  eyebrow: { ...ui("bold"), fontSize: 12, letterSpacing: 1, color: T.ink3 },
  title: { ...ui("bold"), fontSize: 21, lineHeight: 26, color: T.ink },
  walletRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  wallet: { ...ui("semibold"), fontSize: 14, color: T.ink2 },
  grid: { flexDirection: "row", borderWidth: 1, borderColor: T.lineStrong },
  cell: { flex: 1, minHeight: 72, paddingVertical: 12, paddingHorizontal: 6, alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: T.surface },
  cellDivider: { borderLeftWidth: 1, borderColor: T.lineStrong },
  cellOn: { backgroundColor: T.ink },
  cellLabel: { ...ui("semibold"), fontSize: 15, color: T.ink },
  // Paper on ink reads in both schemes (T flips them in dark mode).
  cellLabelOn: { color: T.paper },
  cellPrice: { flexDirection: "row", alignItems: "center", gap: 5 },
  cellAmount: { ...ui("bold"), fontSize: 18, color: T.ink, fontVariant: ["tabular-nums"] },
  saving: { ...ui("semibold"), fontSize: 12, color: T.action },
  was: { ...ui("regular"), fontSize: 12, color: T.ink3, textDecorationLine: "line-through" },
  savingOn: { color: T.paper },
  note: { ...ui("regular"), fontSize: 14, lineHeight: 21, color: T.ink2 },
  message: { ...ui("semibold"), fontSize: 14, color: T.wrongInk },
  buy: { minHeight: 54, backgroundColor: T.action, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  buyRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  buyText: { ...ui("bold"), fontSize: 17, color: T.white },
  foot: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footBtn: { minHeight: 44, justifyContent: "center" },
  link: { ...ui("bold"), fontSize: 15, color: T.action },
  close: { ...ui("semibold"), fontSize: 15, color: T.ink3 },
});
