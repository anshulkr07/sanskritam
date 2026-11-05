// Web and non-native previews never load an advertising SDK.
export type LoadedNativeAd = never;
export type ShowableAd = { show(): Promise<void> };
export async function prepareAds() { return null; }
export async function adPrivacyOptions() {}
export async function loadNativeAd(): Promise<LoadedNativeAd | null> { return null; }
export async function loadInterstitial(): Promise<ShowableAd | null> { return null; }
export function hasRewardedUnit() { return false; }
export function hasInterstitialUnit() { return false; }
export type RewardKind = 'practice' | 'ask';
export async function watchReward(_title: string, _kind: RewardKind): Promise<string> { throw new Error('Ads are available in the mobile app.'); }
export async function watchAskReward(): Promise<{ granted: boolean; message: string }> { return { granted: false, message: 'Ads are available in the mobile app.' }; }
