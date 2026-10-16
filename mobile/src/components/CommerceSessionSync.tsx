import { useEffect } from "react";
import { AppState } from "react-native";
import { useAuth } from "../store/auth";
import { commerceCatalogue, refreshCommerce } from "../services/commerce";
import { connectStore, restorePurchases } from "../services/storePurchases";

export default function CommerceSessionSync() {
  const { token } = useAuth();
  useEffect(() => {
    if (!token) return;
    let alive = true;
    let syncing = false;
    let lastRestore = 0;
    const sync = async () => {
      if (!alive || syncing) return;
      syncing = true;
      try {
        await refreshCommerce();
        const catalogue = await commerceCatalogue();
        if (alive && catalogue.enabled && catalogue.sales_enabled && catalogue.account_verified && Date.now() - lastRestore > 3600000) {
          await connectStore(() => {});
          if (alive) await restorePurchases();
          lastRestore = Date.now();
        }
      } catch { /* Offline licences remain usable until their signed expiry. */ }
      finally { syncing = false; }
    };
    void sync();
    const listener = AppState.addEventListener("change", state => { if (state === "active") void sync(); });
    return () => { alive = false; listener.remove(); };
  }, [token]);
  return null;
}
