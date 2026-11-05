// Is this book or audiobook for sale, at what Mudrā price, and is it already
// owned? Null for free titles and in builds without the Shop.

import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";

import { useAuth } from "../store/auth";
import { HYBRID_COMMERCE, commerceCatalogue } from "../services/commerce";
import { titlePreview, type TitlePreview } from "../services/mudra";

/** price: what this learner pays; list: the price without a plan. */
export type Edition = { price: number; list: number; owned: boolean };

export function useEdition(titleId: string): { edition: Edition | null; refresh: () => void } {
  const { token } = useAuth();
  const [edition, setEdition] = useState<Edition | null>(null);
  const [tick, setTick] = useState(0);
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      if (!HYBRID_COMMERCE || !token) {
        setEdition(null);
        return;
      }
      void commerceCatalogue()
        .then((s) => {
          if (!alive) return;
          const list = s.prices?.[titleId];
          setEdition(list ? { price: s.member_prices?.[titleId] ?? list, list, owned: s.owned_titles.includes(titleId) } : null);
        })
        .catch(() => { if (alive) setEdition(null); });
      return () => { alive = false; };
    }, [titleId, token, tick]),
  );
  return { edition, refresh: () => setTick((t) => t + 1) };
}

/** How much of a paid edition is free; null until known or when not needed. */
export function usePreviewSize(titleId: string, wanted: boolean): TitlePreview | null {
  const [size, setSize] = useState<TitlePreview | null>(null);
  useEffect(() => {
    if (!wanted) { setSize(null); return; }
    let alive = true;
    void titlePreview(titleId).then((p) => { if (alive) setSize(p); }).catch(() => {});
    return () => { alive = false; };
  }, [titleId, wanted]);
  return size;
}
