import React, { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import type { NativeAd } from 'react-native-google-mobile-ads';
import { useAdEligibility } from '../hooks/useAdEligibility';
import { request } from '../api/client';
import { prepareAds, adUnit } from '../services/ads.native';
import { ADS_MODE } from '../services/adsState';
import { color } from '../theme';

export default function SponsoredCard({titleId = ''}: {titleId?: string}) {
  const policy = useAdEligibility(titleId);
  const [loaded, setLoaded] = useState<{sdk: NonNullable<Awaited<ReturnType<typeof prepareAds>>>; ad: NativeAd} | null>(null);
  useEffect(() => {
    let active = true, native: NativeAd | null = null;
    setLoaded(null);
    if (policy?.allowed) void (async () => {
      const sdk = await prepareAds();
      if (!sdk || !active) return;
      await request('/commerce/ads/ticket', {method: 'POST', body: JSON.stringify({title_id: titleId, kind: 'native'})}, true);
      if (!active) return;
      native = await sdk.NativeAd.createForAdRequest(adUnit(sdk, 'native'), {requestNonPersonalizedAdsOnly: true, startVideoMuted: true});
      if (!active) { native.destroy(); native = null; return; }
      setLoaded({sdk, ad: native});
    })().catch(() => {}); // No-fill, consent failure and caps leave the reading flow intact.
    return () => { active = false; native?.destroy(); };
  }, [policy, titleId]);
  if (!policy?.allowed || !loaded) return null;
  const {sdk, ad} = loaded;
  return <View style={{padding: 16, backgroundColor: color.bg, gap: 6}}>
    <Text style={{color: color.ink, fontSize: 12}}>{ADS_MODE === 'test' ? 'Test advertisement · no revenue' : 'Advertisement'}</Text>
    <sdk.NativeAdView nativeAd={ad} style={{padding: 12, gap: 8, minHeight: 170}}>
      {ad.icon && <sdk.NativeAsset assetType={sdk.NativeAssetType.ICON}><Image source={{uri: ad.icon.url}} style={{width: 48, height: 48}} /></sdk.NativeAsset>}
      <sdk.NativeAsset assetType={sdk.NativeAssetType.HEADLINE}><Text style={{color: color.ink, fontWeight: '700', paddingRight: 24}}>{ad.headline}</Text></sdk.NativeAsset>
      <sdk.NativeAsset assetType={sdk.NativeAssetType.BODY}><Text style={{color: color.ink}}>{ad.body}</Text></sdk.NativeAsset>
      <sdk.NativeMediaView style={{height: 140}} />
      <sdk.NativeAsset assetType={sdk.NativeAssetType.CALL_TO_ACTION}><Text style={{padding: 12, color: color.ink, fontWeight: '700'}}>{ad.callToAction}</Text></sdk.NativeAsset>
    </sdk.NativeAdView>
  </View>;
}
