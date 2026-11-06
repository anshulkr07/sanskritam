import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import BuyWithMudra from "./BuyWithMudra";
import { MudraAmount } from "./MudraCoin";
import { useEdition, usePreviewSize } from "../hooks/useEdition";
import { previewLine } from "../services/mudra";
import { T, ui } from "../trail/theme";

// A paid book or audiobook's own page: how much of it is free (5%, owner
// 2026-11-06) and its Mudrā price. Nothing for free or owned titles.
export default function EditionOffer({ titleId }: { titleId: string }) {
  const { edition, refresh } = useEdition(titleId);
  const size = usePreviewSize(titleId, !!edition && !edition.owned);
  const [open, setOpen] = useState(false);
  if (!edition || edition.owned) return null;
  const audio = titleId.endsWith(":audio");
  return (
    <View style={styles.wrap}>
      <Text style={styles.preview}>{previewLine(size, audio)}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Buy for ${edition.price} Mudrā`}
        style={styles.buy}
      >
        <Text style={styles.buyText}>Buy for</Text>
        <MudraAmount amount={edition.price} size={16} textStyle={{ color: T.white }} />
      </Pressable>
      <BuyWithMudra visible={open} titleId={titleId} onClose={() => setOpen(false)} onBought={refresh} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20, paddingVertical: 12, gap: 8, backgroundColor: T.paper, borderBottomWidth: 1, borderColor: T.line },
  preview: { ...ui("regular"), color: T.ink2, fontSize: 14 },
  buy: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 8, minHeight: 44, paddingHorizontal: 16, backgroundColor: T.action },
  buyText: { ...ui("bold"), color: T.white, fontSize: 15 },
});
