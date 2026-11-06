import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ADS_ENABLED, ADS_MODE } from '../services/adsState';
import { adPrivacyOptions } from '../services/ads';
import { HYBRID_COMMERCE } from '../services/commerce';
import { useAdEligibility } from '../hooks/useAdEligibility';
import { color } from '../theme';

// No opt-in and no age question: ads show to every free account, and every
// request is non-personalized and rated G, so it suits any age. Paying for
// Lite or Plus is the way to remove them. Google's privacy choices stay here
// because its consent rules require a way back to them.
export default function AdvertisingSettings() {
  const policy = useAdEligibility();
  const [message, setMessage] = useState('');
  if (!ADS_ENABLED) return null;
  const about = ADS_MODE === 'test' ? 'Google demo ads only. These do not earn money.' : 'Ads keep Sanskritam free. They are never chosen from your activity.';
  const remove = policy?.ad_free ? 'Your plan is ad-free.' : HYBRID_COMMERCE ? 'Lite and Plus remove them; purchased editions have none.' : '';
  return <View style={{paddingVertical: 16, gap: 10}}>
    <Text style={{color: color.ink, fontSize: 18, fontWeight: '700'}}>Advertising</Text>
    <Text style={{color: color.ink}}>{about}{remove ? ' ' + remove : ''}</Text>
    <Pressable accessibilityRole="button" onPress={() => void adPrivacyOptions().catch(e => setMessage(e instanceof Error ? e.message : 'Please try again.'))} style={{paddingVertical: 12}}>
      <Text style={{color: color.saffron}}>Google advertising privacy choices</Text>
    </Pressable>
    {!!message && <Text accessibilityLiveRegion="polite" style={{color: color.ink}}>{message}</Text>}
  </View>;
}
