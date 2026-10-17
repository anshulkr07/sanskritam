/** Web fallback; Metro selects ads.native.ts in native builds. */
export async function prepareAds(): Promise<typeof import("react-native-google-mobile-ads") | null> { return null; }
export async function showRewardedExtension(_titleId: string, _kind: "reading" | "audio" | "practice", _target = "") {
  throw new Error("Optional rewarded ads are available in the Android and iOS apps.");
}
export async function advertisingPrivacy() { return; }
