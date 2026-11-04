import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useAdEligibility } from '../hooks/useAdEligibility';
import { watchReward } from '../services/ads';
import { ADS_MODE } from '../services/adsState';
import { color } from '../theme';
export default function RewardedAccess({titleId}: {titleId: string}) {
  const policy = useAdEligibility(titleId);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  if (!policy?.allowed) return null;
  const audio = titleId.endsWith(':audio');
  const watch = async () => {
    if (busy) return;
    setBusy(true); setMessage('');
    try { setMessage(await watchReward(titleId, audio ? 'audio' : 'reading')); }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Ad unavailable. Try later.'); }
    finally { setBusy(false); }
  };
  return <View style={{padding: 12, gap: 6}}>
    <Text style={{color: color.ink}}>{ADS_MODE === 'test' ? 'Demo reward flow: no content is unlocked.' : audio ? 'Optional ad: add two minutes of listening preview for 24 hours.' : 'Optional ad: unlock the next available chapter, or five more verses, for 24 hours.'}</Text>
    <Pressable accessibilityRole="button" disabled={busy} onPress={() => void watch()} style={{paddingVertical: 12}}>
      <Text style={{color: color.saffron, fontWeight: '700'}}>{busy ? 'Preparing ad…' : ADS_MODE === 'test' ? 'Watch Google test ad' : 'Watch ad for extra access'}</Text>
    </Pressable>
    {!!message && <Text accessibilityLiveRegion="polite" style={{color: color.ink}}>{message}</Text>}
  </View>;
}
