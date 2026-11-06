import React, { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { useAdEligibility } from '../hooks/useAdEligibility';
import { loadNativeAd, type LoadedNativeAd } from '../services/ads.native';
import { ADS_MODE } from '../services/adsState';
import { color } from '../theme';

// A native ad card: the Books library (above the second shelf) and the
// audiobook player. Free accounts only; a no-fill or consent gap shows nothing.
export default function SponsoredCard({titleId = ''}: {titleId?: string}) {
  const policy = useAdEligibility(titleId);
  const [loaded, setLoaded] = useState<LoadedNativeAd | null>(null);
  useEffect(() => {
    let active = true, current: LoadedNativeAd | null = null;
    setLoaded(null);
    if (policy?.allowed) void loadNativeAd().then(result => {
      current = result;
      if (!active) { result?.ad.destroy(); current = null; return; }
      setLoaded(result);
    }).catch(() => {}); // No-fill, consent failure and errors leave the screen as it was.
    return () => { active = false; current?.ad.destroy(); };
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
