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
  terms: { skip_credits: number };
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
  await request("/commerce/titles/unlock", { method: "POST", body: JSON.stringify({ title_id: title.id, expected_credits: title.credits, request_id: newRequestId() }) }, true);
  await refreshCommerce();
  return true;
}

export async function paidHeaders(path: string): Promise<Record<string, string>> {
  const action = path === "/explain/analysis" ? "analysis" : path === "/ask/talk" || path === "/ask/talk/stream" || path === "/explain" || path === "/conversation/explain" ? "ask"
    : path === "/conversation/start" || path === "/conversation/turn" || path === "/speech/tts" ? "voice" : null;
  if (!action || !getAuthToken()) return {};
  const state = await ensureCommerce();
  if (!state.enabled) return {};
  let quote = await request<{ token: string; credits: number; rate: number }>("/commerce/quotes", {
    method: "POST", body: JSON.stringify({ action, seconds: action === "voice" ? 60 : 0 }),
  }, true);
  if (action === "voice") {
    const message = `AI audio costs ${quote.rate} credits/minute, charged in completed 15-second intervals. Choose this reply’s maximum. Unused credits are released.`;
    const seconds = Platform.OS === "web"
      ? Number(globalThis.prompt(message + " Enter 30 or 60 seconds.", "30") || 0)
      : await new Promise<number>(resolve => Alert.alert("Voice reply allowance", message, [
          { text: "Cancel", style: "cancel", onPress: () => resolve(0) },
          { text: `30s · up to ${quote.rate / 2} credits`, onPress: () => resolve(30) },
          { text: `60s · up to ${quote.credits} credits`, onPress: () => resolve(60) },
        ], { cancelable: true, onDismiss: () => resolve(0) }));
    if (seconds !== 30 && seconds !== 60) throw new Error("Voice allowance cancelled");
    if (seconds !== 60) {
      const selected = await request<typeof quote>("/commerce/quotes", { method: "POST", body: JSON.stringify({ action, seconds }) }, true);
      if (selected.rate !== quote.rate && !await confirmSpend("Voice rate changed", `This reply now reserves up to ${selected.credits} credits at ${selected.rate} credits/minute.`)) throw new Error("Voice allowance cancelled");
      quote = selected;
    }
  } else if (!await confirmSpend("Use credits", `A fresh ${action === "analysis" ? "detailed analysis" : "AI answer"} costs up to ${quote.credits} credits. Cached and local answers are free. Failed answers are not charged.`)) {
    throw new Error("Credit purchase cancelled");
  }
  return { "X-Credit-Quote": quote.token, "X-Credit-Request": newRequestId() };
}

export function canPlayInBackground() {
  if (owner !== getAuthToken()) return false;
  return cached ? (!cached.enabled || (cached.background_audio && !!cached.member_until && Date.parse(cached.member_until + "Z") > Date.now())) : offlineUntil > Date.now();
}

AppState.addEventListener("change", state => {
  if (state === "active" && getAuthToken()) void refreshCommerce().catch(() => {});
});
