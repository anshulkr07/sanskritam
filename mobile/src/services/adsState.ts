// Ads are a build switch of their own (EXPO_PUBLIC_ADS_MODE), apart from the
// Shop: they can launch before purchases do. Who sees them is the server's
// call (/commerce/ads/eligibility): every free account, never paying members.
export const ADS_MODE = process.env.EXPO_PUBLIC_ADS_MODE || 'off';
export const ADS_ENABLED = ['test', 'live'].includes(ADS_MODE);
export type AdEligibility = { allowed: boolean; enabled: boolean; ad_free: boolean };
let revision = 0;
const listeners = new Set<() => void>();
export const adsRevision = { get: () => revision, subscribe: (fn: () => void) => {
  listeners.add(fn); return () => { listeners.delete(fn); };
}, changed: () => { revision++; listeners.forEach(fn => fn()); } };
