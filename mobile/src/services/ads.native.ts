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

// Expo inlines EXPO_PUBLIC_* only when written out in full, hence the table.
const LIVE_UNITS = {
  native: { ios: process.env.EXPO_PUBLIC_ADMOB_IOS_NATIVE, android: process.env.EXPO_PUBLIC_ADMOB_ANDROID_NATIVE },
  rewarded: { ios: process.env.EXPO_PUBLIC_ADMOB_IOS_REWARDED, android: process.env.EXPO_PUBLIC_ADMOB_ANDROID_REWARDED },
  interstitial: { ios: process.env.EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL, android: process.env.EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL },
};

export function adUnit(sdk: SDK, format: 'native' | 'rewarded' | 'interstitial') {
  if (ADS_MODE === 'test') return format === 'native' ? sdk.TestIds.NATIVE : format === 'rewarded' ? sdk.TestIds.REWARDED : sdk.TestIds.INTERSTITIAL;
  const id = Platform.OS === 'ios' ? LIVE_UNITS[format].ios : LIVE_UNITS[format].android;
  if (!id || !/^ca-app-pub-\d+\/\d+$/.test(id) || id.includes('3940256099942544')) throw new Error('Ad unit is not configured.');
  return id;
}

/** Rewarded units are optional in live builds until paid editions are on sale. */
export function hasRewardedUnit(): boolean {
  if (ADS_MODE === 'test') return true;
  return !!(Platform.OS === 'ios' ? LIVE_UNITS.rewarded.ios : LIVE_UNITS.rewarded.android);
}

/** The audiobook player's full-screen ads need their own (optional) unit. */
export function hasInterstitialUnit(): boolean {
  if (!ADS_ENABLED) return false;
  if (ADS_MODE === 'test') return true;
  return !!(Platform.OS === 'ios' ? LIVE_UNITS.interstitial.ios : LIVE_UNITS.interstitial.android);
}

export type ShowableAd = { show(): Promise<void> };
const LOAD_LIMIT_MS = 30_000;

/** A full-screen ad (image or video), loaded and waiting. Its show()
 *  resolves when the ad closes, fails or cannot show, never rejects. Null when
 *  ads are off for this account, consent is not settled, or there is no unit.
 *  Non-personalized and rated G, like every request here (prepareAds). */
export async function loadInterstitial(): Promise<ShowableAd | null> {
  if (!hasInterstitialUnit()) return null;
  const sdk = await prepareAds();
  if (!sdk) return null;
  const ad = sdk.InterstitialAd.createForAdRequest(adUnit(sdk, 'interstitial'), { requestNonPersonalizedAdsOnly: true });
  await new Promise<void>((resolve, reject) => {
    const offs: (() => void)[] = [];
    const done = (error?: unknown) => { clearTimeout(limit); offs.forEach(off => off()); if (error) reject(error); else resolve(); };
    const limit = setTimeout(() => done(new Error('Ad load timed out.')), LOAD_LIMIT_MS);
    offs.push(ad.addAdEventListener(sdk.AdEventType.LOADED, () => done()));
    offs.push(ad.addAdEventListener(sdk.AdEventType.ERROR, error => done(error ?? new Error('No ad.'))));
    try { ad.load(); } catch (error) { done(error ?? new Error('Ad failed to load.')); }
  });
  return {
    show: () => new Promise<void>(resolve => {
      const offs: (() => void)[] = [];
      const done = () => { offs.forEach(off => off()); resolve(); };
      offs.push(ad.addAdEventListener(sdk.AdEventType.CLOSED, done));
      offs.push(ad.addAdEventListener(sdk.AdEventType.ERROR, done));
      try { void ad.show().catch(done); } catch { done(); }
    }),
  };
}

export type LoadedNativeAd = { sdk: SDK; ad: import('react-native-google-mobile-ads').NativeAd };

/** One native ad, ready to show, or null when ads are off for this account,
 *  consent is not settled, or Google has nothing to fill (no ticket needed).
 *  Every request is the kind that is safe at any age: non-personalized and,
 *  through prepareAds, rated G. */
export async function loadNativeAd(): Promise<LoadedNativeAd | null> {
  const sdk = await prepareAds();
  if (!sdk) return null;
  const ad = await sdk.NativeAd.createForAdRequest(adUnit(sdk, 'native'), {
    requestNonPersonalizedAdsOnly: true, startVideoMuted: true,
    adChoicesPlacement: sdk.NativeAdChoicesPlacement.TOP_RIGHT,
  });
  return { sdk, ad };
}

// Previews are a fixed 5% for everyone (owner, 2026-11-06): an ad never opens
// more of a book or audiobook. It can add practice time or Ask answers.
export type RewardKind = 'practice' | 'ask';

export async function watchReward(title: string, kind: RewardKind): Promise<string> {
  return (await runReward(title, kind)).message;
}

/** "Watch an ad to keep asking": adds to today's own AI allowance once Google
 *  confirms the view to the server (services/quota.ad_bonus). */
export function watchAskReward(): Promise<{ granted: boolean; message: string }> {
  return runReward('', 'ask');
}

async function runReward(title: string, kind: RewardKind): Promise<{ granted: boolean; message: string }> {
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
    if (!earned) return { granted: false, message: 'Ad closed before completion. No extra access was granted.' };
    checkOwner();
    if (ADS_MODE === 'test') return { granted: false, message: 'Google test ad completed. Demo ads do not grant paid content or generate revenue.' };
    for (let attempt = 0; attempt < 10; attempt++) {
      const status = await request<{verified: boolean}>(`/commerce/ads/${ticket.id}`, {}, true);
      checkOwner();
      if (status.verified) {
        if (kind === 'ask') return { granted: true, message: 'Thank you. You can keep asking today.' };
        await refreshCommerce();
        return { granted: true, message: 'Extra practice time is ready for 24 hours.' };
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return { granted: false, message: kind === 'ask' ? 'Ad completed. It is being confirmed; ask again in a moment.' : 'Ad completed. Server verification is pending; reopen the edition shortly.' };
  } finally { rewardedBusy = false; }
}
