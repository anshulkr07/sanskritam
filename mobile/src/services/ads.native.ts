import { AppState, Platform } from 'react-native';
import { request } from '../api/client';
import { refreshCommerce, commerceOwner } from './commerce';
import { ADS_ENABLED, ADS_MODE, adsRevision, type AdEligibility } from './adsState';
import { audioTransport } from './audioTransport';

type SDK = typeof import('react-native-google-mobile-ads');
let initialization: Promise<SDK | null> | null = null;
let rewardedBusy = false;
export async function prepareAds(): Promise<SDK | null> {
  if (!ADS_ENABLED) return null;
  initialization ??= (async () => {
    const sdk = await import('react-native-google-mobile-ads');
    await sdk.AdsConsent.gatherConsent();
    if (!(await sdk.AdsConsent.getConsentInfo()).canRequestAds) return null;
    if (!(await request<AdEligibility>('/commerce/ads/eligibility', {}, true)).allowed) return null;
    await sdk.default().setRequestConfiguration({ maxAdContentRating: sdk.MaxAdContentRating.G,
      testDeviceIdentifiers: ADS_MODE === 'test' ? ['EMULATOR'] : [] });
    await sdk.default().initialize();
    return sdk;
  })().catch(error => { initialization = null; throw error; });
  const sdk = await initialization;
  if (!sdk) initialization = null;
  // Never cache an earlier permission decision after a privacy-choice change.
  return sdk && (await sdk.AdsConsent.getConsentInfo()).canRequestAds ? sdk : null;
}
export async function adPrivacyOptions() {
  if (!ADS_ENABLED) return;
  const sdk = await import('react-native-google-mobile-ads');
  await sdk.AdsConsent.requestInfoUpdate();
  const info = await sdk.AdsConsent.getConsentInfo();
  if (info.privacyOptionsRequirementStatus === sdk.AdsConsentPrivacyOptionsRequirementStatus.REQUIRED) {
    await sdk.AdsConsent.showPrivacyOptionsForm();
  }
  initialization = null; adsRevision.changed();
}
export function adUnit(sdk: SDK, format: 'native' | 'rewarded') {
  if (ADS_MODE === 'test') return format === 'native' ? sdk.TestIds.NATIVE : sdk.TestIds.REWARDED;
  const id = Platform.OS === 'ios'
    ? format === 'native' ? process.env.EXPO_PUBLIC_ADMOB_IOS_NATIVE : process.env.EXPO_PUBLIC_ADMOB_IOS_REWARDED
    : format === 'native' ? process.env.EXPO_PUBLIC_ADMOB_ANDROID_NATIVE : process.env.EXPO_PUBLIC_ADMOB_ANDROID_REWARDED;
  if (!id || !/^ca-app-pub-\d+\/\d+$/.test(id) || id.includes('3940256099942544')) throw new Error('Ad unit is not configured.');
  return id;
}

export async function watchReward(title: string, kind: 'reading' | 'audio'): Promise<string> {
  if (rewardedBusy) throw new Error('An ad is already being prepared.');
  const owner = commerceOwner();
  const checkOwner = () => { if (!owner || commerceOwner() !== owner) throw new Error('Account changed. Reopen this edition.'); };
  rewardedBusy = true;
  try {
    if (!(await request<AdEligibility>(`/commerce/ads/eligibility?title_id=${encodeURIComponent(title)}`, {}, true)).allowed) throw new Error('Ads are unavailable. Review Advertising in Settings.');
    const sdk = await prepareAds();
    checkOwner();
    if (!sdk) throw new Error('Advertising consent is not ready.');
    const ticket = await request<{ticket: string; id: string}>('/commerce/ads/ticket', {
      method: 'POST', body: JSON.stringify({title_id: title, kind}),
    }, true);
    checkOwner();
    const ad = sdk.RewardedAd.createForAdRequest(adUnit(sdk, 'rewarded'), {
      requestNonPersonalizedAdsOnly: true, serverSideVerificationOptions: {customData: ticket.ticket},
    });
    const earned = await new Promise<boolean>((resolve, reject) => {
      let reward = false, done = false;
      const disposers: (() => void)[] = [];
      const finish = (error?: Error) => {
        if (done) return; done = true; clearTimeout(timeout); disposers.forEach(fn => fn());
        error ? reject(error) : resolve(reward);
      };
      const timeout = setTimeout(() => finish(new Error('Ad timed out. Please try later.')), 120_000);
      disposers.push(ad.addAdEventListener(sdk.RewardedAdEventType.EARNED_REWARD, () => { reward = true; }));
      disposers.push(ad.addAdEventListener(sdk.AdEventType.CLOSED, () => finish()));
      disposers.push(ad.addAdEventListener(sdk.AdEventType.ERROR, error => finish(error)));
      disposers.push(ad.addAdEventListener(sdk.RewardedAdEventType.LOADED, () => {
        void (async () => {
          const eligible = await request<AdEligibility>(`/commerce/ads/eligibility?title_id=${encodeURIComponent(title)}`, {}, true);
          if (done) return;
          checkOwner();
          if (!eligible.allowed || AppState.currentState !== 'active') throw new Error('Ad cancelled. Reopen this edition to try again.');
          if (audioTransport.getSnapshot()?.playing) audioTransport.toggle();
          await ad.show();
        })().catch(error => finish(error));
      }));
      try { ad.load(); } catch (error) { finish(error instanceof Error ? error : new Error('Ad failed to load.')); }
    });
    if (!earned) return 'Ad closed before completion. No extra access was granted.';
    checkOwner();
    if (ADS_MODE === 'test') return 'Google test ad completed. Demo ads do not grant paid content or generate revenue.';
    for (let attempt = 0; attempt < 10; attempt++) {
      const status = await request<{verified: boolean}>(`/commerce/ads/${ticket.id}`, {}, true);
      checkOwner();
      if (status.verified) { await refreshCommerce(); return 'Extra access is ready for 24 hours. Reopen this edition to refresh.'; }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return 'Ad completed. Server verification is pending; reopen the edition shortly.';
  } finally { rewardedBusy = false; }
}
