import { request } from "../api/client";
import { invalidateCache } from "./apiCache";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../config";

export const HYBRID_COMMERCE = process.env.EXPO_PUBLIC_HYBRID_COMMERCE === "true";
export type StoreProduct = { id: string; kind: "subscription" | "edition" | "voice_pack"; name: string;
  inr: number; minutes?: number; titles?: string[]; tier?: "lite" | "plus" };
export type CommerceCatalogue = { enabled: boolean; sales_enabled: boolean; account_verified: boolean;
  account_token: string; google_account: string; member_until: string | null; products: StoreProduct[];
  member_tier: "free" | "lite" | "plus" | "pro"; ad_free: boolean; background_audio: boolean;
  catalogue: { id: string; name: string; medium: "book" | "audio"; lite_included: boolean }[];
  included_titles: string[]; downloadable_titles: string[];
  paid_seconds: number; trial_seconds: number; deficit_seconds: number; voice_enabled: boolean;
  owned_titles: string[]; call_active: boolean };
export const commerceCatalogue = () => request<CommerceCatalogue>("/commerce/shop", {}, true);
export async function refreshCommerce() {
  const requestOwner = owner;
  const result = await commerceCatalogue();
  if (owner !== requestOwner) throw new Error("Account changed. Refresh purchases again.");
  if (owner) {
    const prefix = `shabd.edition.licence.${encodeURIComponent(owner)}.`;
    const keys = (await AsyncStorage.getAllKeys()).filter(k => k.startsWith(prefix));
    for (const key of keys) {
      if (owner !== requestOwner) throw new Error("Account changed. Refresh purchases again.");
      const titleId = decodeURIComponent(key.slice(prefix.length));
      const raw = await AsyncStorage.getItem(key);
      try {
        if (raw) {
          const grant = JSON.parse(raw);
          if (grant.owned ? !result.owned_titles.includes(titleId) :
            (grant.premium !== false || result.catalogue.some(t => t.id === titleId)) &&
            !result.downloadable_titles.includes(titleId)) await AsyncStorage.removeItem(key);
        }
      } catch { await AsyncStorage.removeItem(key); }
    }
  }
  invalidateCache("reader"); invalidateCache("paged"); invalidateCache("canon");
  return result;
}

let owner: string | null = null;
export const commerceOwner = () => owner;
export function setCommerceOwner(id: string | null) { owner = id; }
const licenceKey = (id: string, title: string) => `shabd.edition.licence.${encodeURIComponent(id)}.${encodeURIComponent(title)}`;
export async function offlineEditionAllowed(titleId: string, acquire = false): Promise<boolean> {
  if (!HYBRID_COMMERCE) return true;
  const id = owner;
  if (!id) return false;
  if (acquire) {
    // A server refusal must invalidate an earlier subscription download grant.
    let grant;
    try { grant = await editionLicence(titleId); }
    catch (error) { await AsyncStorage.removeItem(licenceKey(id, titleId)); throw error; }
    if (owner !== id || grant.owner !== id) throw new Error("Account changed. Retry the download.");
    await AsyncStorage.setItem(licenceKey(id, titleId), JSON.stringify(grant));
  }
  try {
    const raw = await AsyncStorage.getItem(licenceKey(id, titleId));
    const grant = raw && JSON.parse(raw);
    return owner === id && grant?.owner === id && Date.parse(grant.expires_at + "Z") > Date.now();
  } catch { return false; }
}

// Offline licences are scoped by account and title. Server decides whether the
// edition is free, owned, or temporarily available through membership.
export async function editionLicence(titleId: string) {
  return request<{ licence: string; owner: string; expires_at: string; owned: boolean; premium: boolean }>(
    `/commerce/titles/${encodeURIComponent(titleId)}/licence`, {}, true);
}

export async function renewPreparedMediaUri(uri: string): Promise<string> {
  if (!HYBRID_COMMERCE) return uri;
  const parsed = new URL(uri, BASE_URL);
  if (parsed.origin !== new URL(BASE_URL).origin || parsed.pathname !== "/commerce/media") return uri;
  const ticket = parsed.searchParams.get("ticket");
  if (!ticket) return uri;
  const result = await request<{ url: string }>("/commerce/media/renew", {
    method: "POST", body: JSON.stringify({ ticket }),
  }, true);
  return new URL(result.url, BASE_URL).toString();
}
