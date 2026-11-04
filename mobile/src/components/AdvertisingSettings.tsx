import React, { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { request } from '../api/client';
import { ADS_ENABLED, ADS_MODE, adsRevision, type AdEligibility } from '../services/adsState';
import { adPrivacyOptions, prepareAds } from '../services/ads';
import { useAdEligibility } from '../hooks/useAdEligibility';
import { color } from '../theme';
export default function AdvertisingSettings() {
  const policy = useAdEligibility();
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  if (!ADS_ENABLED) return null;
  const update = async (enabled: boolean) => {
    setBusy(true); setMessage('');
    try {
      const result = await request<AdEligibility>('/commerce/ads/preferences', {method: 'PUT', body: JSON.stringify({adult: enabled || !!policy?.adult, opted_in: enabled})}, true);
      adsRevision.changed();
      if (enabled && !result.enabled) setMessage('Advertising is not enabled for this release yet.');
      else if (enabled && result.allowed && !await prepareAds()) setMessage('Google consent is not ready. Advertising remains unavailable.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Please try again.'); }
    finally { setBusy(false); }
  };
  const enable = () => Alert.alert('Optional advertising', 'Advertising is available only to adults in this release. Google may process device identifiers, IP address and ad interactions. You can turn this off anytime. Are you 18 or older and would you like to enable it?', [
    {text: 'Cancel', style: 'cancel'}, {text: 'I’m 18+ · enable', onPress: () => void update(true)},
  ]);
  return <View style={{paddingVertical: 16, gap: 10}}>
    <Text style={{color: color.ink, fontSize: 18, fontWeight: '700'}}>Advertising</Text>
    <Text style={{color: color.ink}}>{ADS_MODE === 'test' ? 'Google demo ads only. These do not earn money.' : 'Optional ads help support free learning.'} Lite and Plus are ad-free; purchased editions contain no ads.</Text>
    {!policy?.ad_free && <Pressable accessibilityRole="button" disabled={busy || !policy} onPress={() => policy?.opted_in ? void update(false) : enable()} style={{paddingVertical: 12}}>
      <Text style={{color: color.saffron}}>{policy?.opted_in ? 'Turn off optional ads' : 'Enable optional ads'}</Text>
    </Pressable>}
    <Pressable accessibilityRole="button" disabled={busy} onPress={() => void adPrivacyOptions().catch(e => setMessage(e.message))} style={{paddingVertical: 12}}>
      <Text style={{color: color.saffron}}>Google advertising privacy choices</Text>
    </Pressable>
    {!!message && <Text accessibilityLiveRegion="polite" style={{color: color.ink}}>{message}</Text>}
  </View>;
}
