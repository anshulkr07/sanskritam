import React, { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useFocusEffect, useNavigation, type NavigationProp } from "@react-navigation/native";
import { HYBRID_COMMERCE, commerceCatalogue } from "../services/commerce";
import type { RootStackParamList } from "../navigation/types";
import { color } from "../theme";
import { useAuth } from "../store/auth";
import RewardedAccess from './RewardedAccess';

export default function EditionOffer({ titleId }: { titleId: string }) {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { token } = useAuth();
  const [offer, setOffer] = useState<{ owned: boolean; member: boolean; lite: boolean; tier: string; canBuy: boolean } | null>(null);
  useFocusEffect(useCallback(() => {
    let alive = true;
    setOffer(null);
    if (HYBRID_COMMERCE) void commerceCatalogue().then(s => {
      const title = s.catalogue.find(t => t.id === titleId);
      if (alive) setOffer(title
        ? { owned: s.owned_titles.includes(titleId), member: s.included_titles.includes(titleId),
          lite: title.lite_included, tier: s.member_tier === "lite" ? "Lite" : "Plus",
          canBuy: s.products.some(p => p.kind === "edition" && p.titles?.includes(titleId)) } : null);
    }).catch(() => { if (alive) setOffer(null); });
    return () => { alive = false; };
  }, [titleId, token]));
  if (!HYBRID_COMMERCE || !offer) return null;
  const label = offer.owned ? "Purchased · keep this edition" : offer.member
    ? `Included with ${offer.tier}${offer.canBuy ? ` · buy to keep${offer.tier === "Lite" ? " and download" : ""}` : ""}`
    : `Preview · ${offer.canBuy ? "buy this edition or " : ""}access with ${offer.lite ? "Lite or Plus" : "Plus"}`;
  return <View style={{ padding: 12, backgroundColor: color.bg }}>
    <Pressable accessibilityRole="button" onPress={() => navigation.navigate("Shop", { titleId })}>
      <Text style={{ color: color.saffron, fontWeight: "700" }}>{label}</Text>
    </Pressable>
    {!offer.owned && !offer.member && <RewardedAccess titleId={titleId} />}
  </View>;
}
