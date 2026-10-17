import { Platform } from "react-native";
import { request } from "../api/client";
import { commerceCatalogue, ensureCommerce } from "./commerce";

export async function prepareAds() {
  if (Platform.OS === "web") return null;
  const [state, catalogue] = await Promise.all([ensureCommerce(), commerceCatalogue()]);
  if (!catalogue.ads_enabled || !state.enabled || state.tier !== "free") return null;
  const profile = await request<{ adult: boolean; ads_consent: boolean }>("/commerce/profile", {}, true);
  if (!profile.adult || !profile.ads_consent) return null;
  const ads = await import("react-native-google-mobile-ads");
  const consent = await ads.AdsConsent.gatherConsent({ tagForUnderAgeOfConsent: false });
  if (!consent.canRequestAds) return null;
  await ads.default().setRequestConfiguration({ maxAdContentRating: ads.MaxAdContentRating.G, tagForChildDirectedTreatment: false, tagForUnderAgeOfConsent: false });
  await ads.default().initialize();
  return ads;
}

export async function showRewardedExtension(titleId: string, kind: "reading" | "audio" | "practice", target = "") {
  const ads = await prepareAds();
  if (!ads) throw new Error("Optional ads are unavailable. Check your privacy settings or try later.");
  const unit = Platform.OS === "ios" ? process.env.EXPO_PUBLIC_ADMOB_IOS_REWARDED : process.env.EXPO_PUBLIC_ADMOB_ANDROID_REWARDED;
  if (!unit) throw new Error("Rewarded ads are not configured yet.");
  const ticket = await request<{ ticket: string; id: string }>("/commerce/ads/ticket", {
    method: "POST", body: JSON.stringify({ title_id: titleId, kind, target }),
  }, true);
  const reward = ads.RewardedAd.createForAdRequest(unit, { requestNonPersonalizedAdsOnly: true, serverSideVerificationOptions: { customData: ticket.ticket } });
  await new Promise<void>((resolve, reject) => {
    const unsubscribe: (() => void)[] = [];
    const timer = setTimeout(() => { cleanup(); reject(new Error("Ad loading timed out.")); }, 60000);
    let earned = false;
    const cleanup = () => { clearTimeout(timer); unsubscribe.forEach(fn => fn()); };
    unsubscribe.push(reward.addAdEventListener(ads.RewardedAdEventType.LOADED, () => { void reward.show().catch(error => { cleanup(); reject(error); }); }));
    unsubscribe.push(reward.addAdEventListener(ads.RewardedAdEventType.EARNED_REWARD, () => { earned = true; }));
    unsubscribe.push(reward.addAdEventListener(ads.AdEventType.CLOSED, () => { cleanup(); earned ? resolve() : reject(new Error("The ad was closed before the reward was earned.")); }));
    unsubscribe.push(reward.addAdEventListener(ads.AdEventType.ERROR, error => { cleanup(); reject(error); }));
    reward.load();
  });
  // A client callback never grants access. Poll only our verified reward record.
  for (let attempt = 0; attempt < 10; attempt++) {
    const result = await request<{ verified: boolean }>(`/commerce/ads/${ticket.id}`, {}, true);
    if (result.verified) return;
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  throw new Error("Your reward is awaiting server verification. Reopen this chapter shortly.");
}

export async function advertisingPrivacy() {
  if (Platform.OS === "web") return;
  const ads = await import("react-native-google-mobile-ads");
  await ads.AdsConsent.showPrivacyOptionsForm();
}
