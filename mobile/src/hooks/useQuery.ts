// useQuery — cached, deduped fetching with a safe lifecycle (Track C4).
//
// Replaces the bare useState/useEffect/fetch triple in every screen:
//   const { data, loading, failed, retry } = useQuery("units", api.units);
//
// - Caching + in-flight dedupe come from services/apiCache (60s TTL).
// - No setState after unmount (cancelled flag).
// - Opt-in refetch-on-focus via useFocusEffect (tab screens that go stale
//   behind other tabs — Path, Home). Default off: a step player that
//   refetches mid-lesson would be a regression, not a feature.
// - Retry re-fetches bypassing nothing but the failure state (cache still
//   applies on success).

import React from "react";
import { useFocusEffect } from "@react-navigation/native";

import { cachedGet } from "../services/apiCache";

export interface QueryResult<T> {
  data: T | null;
  loading: boolean;
  failed: boolean;
  retry: () => void;
}

export function useQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  opts?: { refetchOnFocus?: boolean; ttlMs?: number },
): QueryResult<T> {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [failed, setFailed] = React.useState(false);
  const [nonce, setNonce] = React.useState(0);
  const fetcherRef = React.useRef(fetcher);
  fetcherRef.current = fetcher;

  const refetchOnFocus = opts?.refetchOnFocus ?? false;
  const ttlMs = opts?.ttlMs;

  const run = React.useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    cachedGet(key, () => fetcherRef.current(), ttlMs).then(
      (d) => {
        if (cancelled) return;
        setData(d);
        setLoading(false);
      },
      () => {
        if (cancelled) return;
        setData(null);
        setFailed(true);
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [key, ttlMs]);

  React.useEffect(() => {
    const cancel = run();
    return cancel;
    // `nonce` re-runs the fetch for retry(); `run` is stable otherwise.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, nonce]);

  useFocusEffect(
    React.useCallback(() => {
      if (!refetchOnFocus) return;
      const cancel = run();
      return cancel;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [run, refetchOnFocus]),
  );

  const retry = React.useCallback(() => setNonce((n) => n + 1), []);

  return { data, loading, failed, retry };
}
