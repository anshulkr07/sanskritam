import { useCallback, useState, useSyncExternalStore } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { AppState } from 'react-native';
import { useAuth } from '../store/auth';
import { request } from '../api/client';
import { ADS_ENABLED, adsRevision, type AdEligibility } from '../services/adsState';
export function useAdEligibility(titleId = '') {
  const { token } = useAuth();
  const revision = useSyncExternalStore(adsRevision.subscribe, adsRevision.get, adsRevision.get);
  const [state, setState] = useState<AdEligibility | null>(null);
  useFocusEffect(useCallback(() => {
    let active = true;
    setState(null);
    const refresh = () => {
      if (ADS_ENABLED && token) void request<AdEligibility>(`/commerce/ads/eligibility?title_id=${encodeURIComponent(titleId)}`, {}, true)
        .then(value => { if (active) setState(value); }).catch(() => { if (active) setState(null); });
    };
    refresh();
    const sub = AppState.addEventListener('change', value => {
      setState(null); if (value === 'active') refresh();
    });
    return () => { active = false; sub.remove(); setState(null); };
  }, [token, revision, titleId]));
  return state;
}
