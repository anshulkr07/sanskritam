import { Alert, AppState, Platform } from "react-native";
import { request, getAuthToken } from "../api/client";

export interface Wallet {
  enabled: boolean; tier: string; member_until: string | null; balance: number; available: number;
  reserved: number; deficit: number; slots: number | null; offline: boolean; background_audio: boolean;
  unlocks: { id: string; title_id: string; expires_at: string }[];
  cooldowns: { id: string; until: string }[];
  supporter_badges?: string[];
}
export interface CommerceTitle { id: string; slug: string; medium: "book" | "audio"; name: string; credits: number; metadata: { affiliates?: { label: string; url: string; disclosure: string }[] } }
export interface CommerceCatalogue {
  enabled: boolean; sales_enabled: boolean; ads_enabled: boolean; account_token: string; google_account: string;
  products: { id: string; kind: string; credits: number; inr: number; tier?: string }[]; titles: CommerceTitle[];
  account_verified: boolean;
}
let cached: Wallet | null = null;
let owner: string | null = null;
let refreshed = 0;
let offlineUntil = 0;
const subscribers = new Set<() => void>();
export const commerceSnapshot = () => cached;
export const subscribeCommerce = (listener: () => void) => { subscribers.add(listener); return () => { subscribers.delete(listener); }; };
export function resetCommerce() { cached = null; refreshed = 0; offlineUntil = 0; owner = getAuthToken(); subscribers.forEach(fn => fn()); void import("./offlineBooks").then(m => m.resetOfflineAudio()); }
export function allowOfflineBackground(until: number) { offlineUntil = Math.max(offlineUntil, until); }
export async function refreshCommerce(): Promise<Wallet> {
  if (owner !== getAuthToken()) resetCommerce();
  const token = getAuthToken();
  const data = await request<Wallet>("/commerce/wallet", {}, true);
  if (token === getAuthToken()) {
    const changed = JSON.stringify([cached?.tier, cached?.unlocks]) !== JSON.stringify([data.tier, data.unlocks]);
    cached = data; refreshed = Date.now(); subscribers.forEach(fn => fn());
    if (changed) {
      const { invalidateCache } = await import("./apiCache");
      ["reader-", "canon", "paged-"].forEach(prefix => invalidateCache(prefix));
      void import("./offlineBooks").then(m => m.reconcileOfflineAccess()).catch(() => {});
    }
  }
  return data;
}
export async function ensureCommerce() {
  if (owner !== getAuthToken()) resetCommerce();
  if (!cached || Date.now() - refreshed > 60000) return refreshCommerce();
  return cached;
}
export const commerceCatalogue = () => request<CommerceCatalogue>("/commerce/catalogue", {}, true);
export const newRequestId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
export function formatMinor(amount: number, currency: string) {
  const formatter = new Intl.NumberFormat(undefined, { style: "currency", currency });
  return formatter.format(amount / 10 ** (formatter.resolvedOptions().maximumFractionDigits ?? 2));
}

export async function confirmSpend(title: string, message: string): Promise<boolean> {
  if (Platform.OS === "web") return globalThis.confirm(message);
  return new Promise(resolve => Alert.alert(title, message, [
    { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
    { text: "Continue", onPress: () => resolve(true) },
  ], { cancelable: true, onDismiss: () => resolve(false) }));
}

export async function unlockTitle(title: CommerceTitle) {
  const state = await ensureCommerce();
  const message = `${title.name}: ${title.credits} credits. Uses one ${title.medium === "audio" ? "audiobook" : "book"} slot. Access lasts ${state.tier === "free" ? "365 days" : "through membership, then 365 days"}. ${state.offline ? "Offline access is available while subscribed." : "Streaming/online access only; foreground audio only."}`;
  if (!await confirmSpend("Unlock title", message)) return false;
  await request("/commerce/titles/unlock", { method: "POST", body: JSON.stringify({ title_id: title.id, request_id: newRequestId() }) }, true);
  await refreshCommerce();
  return true;
}

export async function paidHeaders(path: string): Promise<Record<string, string>> {
  const action = path === "/ask/talk" || path === "/ask/talk/stream" || path === "/explain" || path === "/conversation/explain" ? "ask"
    : path === "/conversation/start" || path === "/conversation/turn" || path === "/speech/tts" ? "voice" : null;
  if (!action || !getAuthToken()) return {};
  const state = await ensureCommerce();
  if (!state.enabled) return {};
  const quote = await request<{ token: string; credits: number; rate: number }>("/commerce/quotes", {
    method: "POST", body: JSON.stringify({ action, seconds: action === "voice" ? 60 : 0 }),
  }, true);
  const message = action === "voice" ? `AI audio costs ${quote.rate} credits per minute in completed 15-second intervals. Reserve up to ${quote.credits} credits for this response. Unused credits are released.`
    : `A fresh AI answer costs up to ${quote.credits} credits. Cached and local answers are free. Failed answers are not charged.`;
  if (!await confirmSpend("Use credits", message)) throw new Error("Credit purchase cancelled");
  return { "X-Credit-Quote": quote.token, "X-Credit-Request": newRequestId() };
}

export function canPlayInBackground() {
  if (owner !== getAuthToken()) return false;
  return cached ? (!cached.enabled || (cached.background_audio && !!cached.member_until && Date.parse(cached.member_until + "Z") > Date.now())) : offlineUntil > Date.now();
}

AppState.addEventListener("change", state => {
  if (state === "active" && getAuthToken()) void refreshCommerce().catch(() => {});
});
