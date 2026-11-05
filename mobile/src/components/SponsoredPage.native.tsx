import React, { useEffect } from 'react';
import { Image, Text, View } from 'react-native';
import { useBookPage } from './book/PageCurlBook';
import { getReaderAd } from '../read/readerAds.native';
import { ADS_MODE } from '../services/adsState';

type Props = { adKey: string; live: boolean; page: string; ink: string; soft: string; line: string };

// A full page in the book that is an ad, labelled as one with Google's
// AdChoices icon in its corner. The ad itself is drawn only while this is the
// page being read: a neighbour page lying under the turning leaf shows the
// frame alone, so Google never counts an ad nobody could see. App content
// never overlaps the ad (AdMob native policy); the hint sits below it.
export default function SponsoredPage({ adKey, live, page, ink, soft, line }: Props) {
  const { invalidate } = useBookPage();
  const loaded = getReaderAd(adKey);
  // The curl draws from a snapshot of this page: retake it when the ad appears.
  useEffect(() => { invalidate(); }, [live, loaded, invalidate]);
  const label = ADS_MODE === 'test' ? 'Test advertisement · no revenue' : 'Advertisement';
  const frame = { borderWidth: 1, borderColor: line, padding: 16, gap: 12, backgroundColor: page } as const;
  return <View style={{ flex: 1, backgroundColor: page, paddingHorizontal: 20, paddingVertical: 24, justifyContent: 'center', gap: 14 }}>
    {live && loaded ? (() => {
      const { sdk, ad } = loaded;
      const ratio = ad.mediaContent?.aspectRatio && ad.mediaContent.aspectRatio > 0 ? ad.mediaContent.aspectRatio : 16 / 9;
      return <sdk.NativeAdView nativeAd={ad} style={frame}>
        <Text style={{ color: soft, fontSize: 12, letterSpacing: 0.5 }}>{label}</Text>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', paddingRight: 24 }}>
          {ad.icon && <sdk.NativeAsset assetType={sdk.NativeAssetType.ICON}><Image source={{ uri: ad.icon.url }} style={{ width: 44, height: 44 }} /></sdk.NativeAsset>}
          <View style={{ flex: 1, minWidth: 0 }}>
            <sdk.NativeAsset assetType={sdk.NativeAssetType.HEADLINE}><Text style={{ color: ink, fontSize: 18, fontWeight: '700' }}>{ad.headline}</Text></sdk.NativeAsset>
            {!!ad.advertiser && <sdk.NativeAsset assetType={sdk.NativeAssetType.ADVERTISER}><Text style={{ color: soft, fontSize: 13 }}>{ad.advertiser}</Text></sdk.NativeAsset>}
          </View>
        </View>
        {/* At least 120 dp each way, or Google serves no video (native policy). */}
        <sdk.NativeMediaView resizeMode="contain" style={{ width: '100%', aspectRatio: ratio, minHeight: 120, maxHeight: 320 }} />
        {!!ad.body && <sdk.NativeAsset assetType={sdk.NativeAssetType.BODY}><Text style={{ color: ink, fontSize: 15, lineHeight: 22 }}>{ad.body}</Text></sdk.NativeAsset>}
        {!!ad.callToAction && <sdk.NativeAsset assetType={sdk.NativeAssetType.CALL_TO_ACTION}>
          <Text style={{ color: ink, fontWeight: '700', borderWidth: 1, borderColor: ink, paddingVertical: 12, textAlign: 'center' }}>{ad.callToAction}</Text>
        </sdk.NativeAsset>}
      </sdk.NativeAdView>;
    })() : <View style={[frame, { minHeight: 220, justifyContent: 'flex-start' }]}>
      <Text style={{ color: soft, fontSize: 12, letterSpacing: 0.5 }}>{label}</Text>
    </View>}
    <Text style={{ color: soft, fontSize: 13, textAlign: 'center' }}>Turn the page to keep reading</Text>
  </View>;
}
