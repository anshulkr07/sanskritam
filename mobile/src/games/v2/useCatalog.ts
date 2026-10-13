// useCatalog: fetches the Play catalog once and picks one game by key.

import { useEffect, useState } from "react";

import { playApi, type CatalogGame, type PlayCatalog } from "./client";

let cache: PlayCatalog | null = null;
let inflight: Promise<PlayCatalog> | null = null;

function fetchCatalog(): Promise<PlayCatalog> {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = playApi.catalog().then((c) => {
      cache = c;
      return c;
    }).finally(() => { inflight = null; });
  }
  return inflight;
}

export function useCatalog(): PlayCatalog | null {
  const [catalog, setCatalog] = useState<PlayCatalog | null>(cache);
  useEffect(() => {
    if (cache) return;
    let on = true;
    void fetchCatalog().then((c) => { if (on) setCatalog(c); }).catch(() => {});
    return () => { on = false; };
  }, []);
  return catalog;
}

export function useCatalogGame(key: string): CatalogGame | null {
  const catalog = useCatalog();
  return catalog?.games.find((g) => g.key === key) ?? null;
}
