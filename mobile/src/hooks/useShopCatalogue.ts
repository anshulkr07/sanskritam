import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";

import { HYBRID_COMMERCE, commerceCatalogue, type CommerceCatalogue } from "../services/commerce";
import { useAuth } from "../store/auth";

export function useShopCatalogue(): CommerceCatalogue | null {
  const { token } = useAuth();
  const [loaded, setLoaded] = useState<{ token: string; catalogue: CommerceCatalogue } | null>(null);

  useFocusEffect(useCallback(() => {
    if (!HYBRID_COMMERCE || !token) return;
    let active = true;
    void commerceCatalogue().then(catalogue => {
      if (active) setLoaded({ token, catalogue });
    }).catch(() => {});
    return () => { active = false; };
  }, [token]));

  return loaded && loaded.token === token ? loaded.catalogue : null;
}
