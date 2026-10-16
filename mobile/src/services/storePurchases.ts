/** Web fallback; purchases are handled by the native stores. */
import { Linking } from "react-native";
export async function connectStore(_onMessage: (message: string) => void): Promise<{ id: string; displayPrice: string }[]> { return []; }
export async function buyProduct(_id: string) { throw new Error("Purchases are available in the Android and iOS apps."); }
export async function restorePurchases() { throw new Error("Restore purchases in the store app, then sign in to this account."); }
export async function manageSubscription() { await Linking.openURL("https://play.google.com/store/account/subscriptions"); }
