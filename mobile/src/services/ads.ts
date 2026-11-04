// Web and non-native previews never load an advertising SDK.
export async function prepareAds() { return null; }
export async function adPrivacyOptions() {}
export async function watchReward(_title: string, _kind: 'reading' | 'audio'): Promise<string> { throw new Error('Ads are available in the mobile app.'); }
