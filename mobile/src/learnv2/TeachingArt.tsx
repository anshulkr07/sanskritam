import React, { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { useGuideLang } from "../hooks/useGuide";
import { useTypeScale } from "../hooks/useTypeScale";
import { getLearnV2Asset } from "./assetMap";
import { sceneHeightOf } from "./sceneCrop";

/** Crop the generated caption area and rebuild it with selectable native text.
 * Caption height grows with type scale; artwork never determines a sound rule.
 */
export default function TeachingArt({ assetId, sa, iast }: { assetId: string; sa?: string; iast?: string }) {
  const { lang } = useGuideLang();
  const { sized } = useTypeScale();
  const [failed, setFailed] = useState(false);
  const asset = getLearnV2Asset(assetId);
  if (!asset) return null;
  const scene = sceneHeightOf(assetId, asset.sceneHeight);
  const caption = sa ?? asset.labels.sa;
  const roman = iast ?? asset.labels.iast;
  return <View style={styles.frame}>
    {!failed && <View style={{ width: "100%", aspectRatio: asset.width / scene, overflow: "hidden" }}
      accessible accessibilityRole="image" accessibilityLabel={lang === "hi" ? asset.altHi : asset.altEn}>
      <Image source={asset.source} resizeMode="contain" accessible={false} onError={() => setFailed(true)}
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: `${asset.height / scene * 100}%` }} />
    </View>}
    {failed && !caption && <Text style={{ padding: 12 }}>{lang === "hi" ? asset.altHi : asset.altEn}</Text>}
    {!!caption && <View style={[styles.caption, { backgroundColor: asset.captionColor }]}>
      <Text selectable style={[styles.sa, { fontSize: sized(34, { sanskrit: true }), lineHeight: sized(51, { sanskrit: true }) }]}>{caption}</Text>
      {!!roman && <Text selectable style={[styles.iast, { fontSize: sized(17), lineHeight: sized(26) }]}>{roman}</Text>}
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  frame: { width: "100%", overflow: "hidden", marginVertical: 8 },
  caption: { padding: 12, alignItems: "center" },
  sa: { fontFamily: "TiroDevanagariSanskrit_400Regular", color: "#FFF8EE", textAlign: "center" },
  iast: { fontFamily: "Mukta_500Medium", fontWeight: "500", color: "#FFF8EE", textAlign: "center" },
});
