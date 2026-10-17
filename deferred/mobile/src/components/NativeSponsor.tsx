import React, { useEffect, useState } from "react";
import { View, Text, Platform } from "react-native";
import { prepareAds } from "../services/ads";
import { request } from "../api/client";
import { subscribeCommerce, commerceSnapshot } from "../services/commerce";

type AdModule = typeof import("react-native-google-mobile-ads");
export default function NativeSponsor() {
  const [state, setState] = useState<{ module: AdModule; ad: import("react-native-google-mobile-ads").NativeAd } | null>(null);
  useEffect(() => {
    let alive = true;
    let current: import("react-native-google-mobile-ads").NativeAd | null = null;
    const unsubscribe = subscribeCommerce(() => {
      const snapshot = commerceSnapshot();
      if (snapshot?.tier !== "free" || !snapshot.enabled) { current?.destroy(); current = null; setState(null); }
    });
    void (async () => {
      const module = await prepareAds();
      if (!module || !alive) return;
      const unit = Platform.OS === "ios" ? process.env.EXPO_PUBLIC_ADMOB_IOS_NATIVE : process.env.EXPO_PUBLIC_ADMOB_ANDROID_NATIVE;
      if (!unit) return;
      await request("/commerce/ads/ticket", { method: "POST", body: JSON.stringify({ kind: "native", title_id: "", target: "discovery" }) }, true);
      current = await module.NativeAd.createForAdRequest(unit, { requestNonPersonalizedAdsOnly: true, startVideoMuted: true });
      if (alive) setState({ module, ad: current }); else current.destroy();
    })().catch(() => {});
    return () => { alive = false; unsubscribe(); current?.destroy(); };
  }, []);
  if (!state) return null;
  const { NativeAdView, NativeAsset, NativeAssetType, NativeMediaView } = state.module;
  return <NativeAdView nativeAd={state.ad} style={{ padding: 14, backgroundColor: "#fff", borderRadius: 12, gap: 8 }}>
    <Text style={{ fontSize: 11, color: "#645747" }}>Advertisement</Text>
    <NativeAsset assetType={NativeAssetType.HEADLINE}><Text style={{ fontSize: 16, fontWeight: "700" }}>{state.ad.headline}</Text></NativeAsset>
    <NativeMediaView style={{ height: 140 }} />
    <NativeAsset assetType={NativeAssetType.BODY}><Text>{state.ad.body}</Text></NativeAsset>
    <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}><Text style={{ color: "#9e481b", paddingVertical: 10 }}>{state.ad.callToAction}</Text></NativeAsset>
  </NativeAdView>;
}
