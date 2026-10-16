import { getAuthToken, request } from "../api/client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ensureCommerce, commerceSnapshot, allowOfflineBackground } from "./commerce";

interface Envelope { version: 2; sealed: string }
interface Payload<T> { owner: string; expires: number; licence: string; title_id: string; data: T }
async function currentOwner() {
  if (!getAuthToken()) throw new Error("Sign in to access downloads.");
  const raw = await AsyncStorage.getItem("shabd.cachedProfile");
  const id = raw ? JSON.parse(raw)?.id : null;
  if (!id) throw new Error("Your download account is unavailable. Sign in again.");
  return id as string;
}
async function encryptionKey() {
  const crypto = await import("expo-crypto");
  const secure = await import("expo-secure-store");
  const owner = await currentOwner();
  const name = "sanskrit.vault." + owner.replace(/[^A-Za-z0-9_.-]/g, "_");
  let raw = await secure.getItemAsync(name);
  if (!raw) {
    const generated = await crypto.AESEncryptionKey.generate();
    raw = await generated.encoded("base64");
    await secure.setItemAsync(name, raw, { keychainAccessible: secure.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  }
  return crypto.AESEncryptionKey.import(raw, "base64");
}
export async function seal<T>(data: T, titleId: string): Promise<Envelope> {
  const state = await ensureCommerce();
  if (!state.enabled || !state.offline) throw new Error("An active membership is required for encrypted downloads.");
  const licence = await request<{ owner: string; expires_at: string; licence: string }>(`/commerce/titles/${encodeURIComponent(titleId)}/licence`, {}, true);
  const crypto = await import("expo-crypto");
  const payload: Payload<T> = { owner: licence.owner, expires: Date.parse(licence.expires_at + "Z"), licence: licence.licence, title_id: titleId, data };
  const encrypted = await crypto.aesEncryptAsync(new TextEncoder().encode(JSON.stringify(payload)), await encryptionKey());
  return { version: 2, sealed: await encrypted.combined("base64") };
}
export async function openWithLicence<T>(envelope: Envelope): Promise<Payload<T> | null> {
  try {
    if (envelope.version !== 2) return null;
    const crypto = await import("expo-crypto");
    const plain = await crypto.aesDecryptAsync(crypto.AESSealedData.fromCombined(envelope.sealed), await encryptionKey());
    const payload = JSON.parse(new TextDecoder().decode(plain)) as Payload<T>;
    const secure = await import("expo-secure-store");
    const last = Number(await secure.getItemAsync("sanskrit.vault.clock") || 0);
    const timestamp = Date.now();
    // A clock rollback cannot extend an offline licence.
    if (timestamp < last - 60000 || payload.owner !== await currentOwner()) return null;
    const known = commerceSnapshot();
    if (known?.enabled && (!known.offline || !known.unlocks.some(u => u.title_id === payload.title_id))) return null;
    if (timestamp > payload.expires) {
      if (!known?.offline) return null;
      Object.assign(envelope, await seal(payload.data, payload.title_id));
      return openWithLicence<T>(envelope);
    }
    await secure.setItemAsync("sanskrit.vault.clock", String(Math.max(last, timestamp)));
    allowOfflineBackground(payload.expires);
    return payload;
  } catch { return null; }
}
export async function open<T>(envelope: Envelope): Promise<T | null> { return (await openWithLicence<T>(envelope))?.data ?? null; }
