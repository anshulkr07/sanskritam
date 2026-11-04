import { HYBRID_COMMERCE } from './commerce';
export const ADS_MODE = process.env.EXPO_PUBLIC_ADS_MODE || 'off';
export const ADS_ENABLED = HYBRID_COMMERCE && ['test', 'live'].includes(ADS_MODE);
export type AdEligibility = { allowed: boolean; enabled: boolean; adult: boolean; opted_in: boolean; ad_free: boolean };
let revision = 0;
const listeners = new Set<() => void>();
export const adsRevision = { get: () => revision, subscribe: (fn: () => void) => {
  listeners.add(fn); return () => { listeners.delete(fn); };
}, changed: () => { revision++; listeners.forEach(fn => fn()); } };
