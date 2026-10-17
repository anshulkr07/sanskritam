import { Platform, Linking } from "react-native";
import { request } from "../api/client";
import { commerceCatalogue, refreshCommerce, type CommerceCatalogue } from "./commerce";

type IAP = typeof import("react-native-iap");
let connected: Promise<IAP> | null = null;
let catalogue: CommerceCatalogue | null = null;
let notify: (message: string) => void = () => {};
const inFlight = new Set<string>();

async function deliver(iap: IAP, purchase: import("react-native-iap").Purchase) {
  const key = purchase.id;
  if (inFlight.has(key)) return;
  inFlight.add(key);
  try {
    const proof = purchase.purchaseToken || (Platform.OS === "ios" ? await iap.getTransactionJwsIOS(purchase.productId) : null);
    if (!proof) throw new Error("The store has not provided a completed purchase proof yet.");
    const result = await request<{ finish_transaction: boolean; store_finished: boolean }>("/commerce/purchases/verify", {
      method: "POST", body: JSON.stringify({ provider: Platform.OS === "ios" ? "apple" : "google", product_id: purchase.productId, proof }),
    }, true);
    if (result.finish_transaction && !result.store_finished) {
      const product = catalogue?.products.find(p => p.id === purchase.productId);
      await iap.finishTransaction({ purchase, isConsumable: product?.kind !== "subscription" });
    }
    await refreshCommerce();
    notify("Purchase verified. Your account is updated.");
  } catch (error) {
    // Leave the transaction unfinished: the store will deliver it again.
    notify(error instanceof Error ? error.message : "Verification pending. Restore purchases to retry.");
  } finally { inFlight.delete(key); }
}

export async function connectStore(onMessage: (message: string) => void) {
  notify = onMessage;
  if (Platform.OS !== "android" && Platform.OS !== "ios") throw new Error("Purchases are available in the Android and iOS apps.");
  catalogue = await commerceCatalogue();
  if (!catalogue.enabled || !catalogue.sales_enabled) return [];
  connected ??= (async () => {
    const iap = await import("react-native-iap");
    await iap.initConnection();
    iap.purchaseUpdatedListener(purchase => { void deliver(iap, purchase); });
    iap.purchaseErrorListener(error => notify(error.message));
    return iap;
  })().catch(error => { connected = null; throw error; });
  const iap = await connected;
  const subscriptions = catalogue.products.filter(p => p.kind === "subscription").map(p => p.id);
  const products = catalogue.products.filter(p => p.kind !== "subscription").map(p => p.id);
  const results = await Promise.all([
    iap.fetchProducts({ skus: subscriptions, type: "subs" }),
    iap.fetchProducts({ skus: products, type: "in-app" }),
  ]);
  return results.flatMap(result => result ?? []);
}

export async function buyProduct(productId: string) {
  const iap = connected && await connected;
  if (!iap || !catalogue?.sales_enabled) throw new Error("The store is not ready.");
  if (!catalogue.account_verified) throw new Error("Link your Google or Apple sign-in before purchasing.");
  const product = catalogue.products.find(p => p.id === productId);
  if (!product) throw new Error("Unknown product");
  if (product.kind === "subscription") {
    const existing = (await iap.getAvailablePurchases()).find(p => catalogue?.products.some(item => item.id === p.productId && item.kind === "subscription") && p.productId !== productId);
    const previous = catalogue.products.find(p => p.id === existing?.productId);
    const upgrade = (product.inr > (previous?.inr ?? 0));
    const products = await iap.fetchProducts({ skus: [productId], type: "subs" });
    const subscription = products?.find(p => p.id === productId);
    const offers = subscription && "subscriptionOfferDetailsAndroid" in subscription ? subscription.subscriptionOfferDetailsAndroid : null;
    const token = offers?.find(offer => !offer.offerId)?.offerToken || offers?.[0]?.offerToken;
    await iap.requestPurchase({ type: "subs", request: {
      apple: { sku: productId, appAccountToken: catalogue.account_token, andDangerouslyFinishTransactionAutomatically: false },
      google: { skus: [productId], obfuscatedAccountId: catalogue.google_account,
        purchaseToken: existing?.purchaseToken,
        replacementMode: existing ? (upgrade ? 2 : 6) : undefined,
        subscriptionOffers: token ? [{ sku: productId, offerToken: token }] : [] },
    } });
  } else {
    await iap.requestPurchase({ type: "in-app", request: {
      apple: { sku: productId, appAccountToken: catalogue.account_token, andDangerouslyFinishTransactionAutomatically: false },
      google: { skus: [productId], obfuscatedAccountId: catalogue.google_account },
    } });
  }
}

export async function restorePurchases() {
  const iap = connected && await connected;
  if (!iap) throw new Error("Connect to the store first.");
  for (const purchase of await iap.getAvailablePurchases()) await deliver(iap, purchase);
  await refreshCommerce();
}

export function manageSubscription() {
  return Linking.openURL(Platform.OS === "ios" ? "https://apps.apple.com/account/subscriptions" : "https://play.google.com/store/account/subscriptions");
}
