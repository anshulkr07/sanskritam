import React, { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useFocusEffect, useNavigation, type NavigationProp } from "@react-navigation/native";
import { HYBRID_COMMERCE, commerceCatalogue } from "../services/commerce";
import type { RootStackParamList } from "../navigation/types";
import { color } from "../theme";

export default function EditionOffer({ titleId }: { titleId: string }) {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [offer, setOffer] = useState<{ owned: boolean; member: boolean } | null>(null);
  useFocusEffect(useCallback(() => {
    let alive = true;
    if (HYBRID_COMMERCE) void commerceCatalogue().then(s => {
      if (alive) setOffer(s.products.some(p => p.titles?.includes(titleId))
        ? { owned: s.owned_titles.includes(titleId), member: !!s.member_until } : null);
    }).catch(() => { if (alive) setOffer(null); });
    return () => { alive = false; };
  }, [titleId]));
  if (!HYBRID_COMMERCE || !offer) return null;
  return <View style={{ padding: 12, backgroundColor: color.bg }}>
    <Pressable accessibilityRole="button" onPress={() => navigation.navigate("Shop", { titleId })}>
      <Text style={{ color: color.saffron, fontWeight: "700" }}>{offer.owned ? "Purchased · keep this edition" : offer.member ? "Included with Plus · buy to keep" : "Preview · buy this edition or access with Plus"}</Text>
    </Pressable>
  </View>;
}
