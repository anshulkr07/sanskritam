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

import { cachedGet, peekCache } from "../services/apiCache";

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
  const ttlMs = opts?.ttlMs;
  const cached = peekCache<T>(key, ttlMs);
  const [state, setState] = React.useState<{
    key: string; data: T | null; loading: boolean; failed: boolean;
  }>(() => ({
    key, data: cached ?? null, loading: cached === undefined, failed: false,
  }));
  const [nonce, setNonce] = React.useState(0);
  const fetcherRef = React.useRef(fetcher);
  fetcherRef.current = fetcher;

  const refetchOnFocus = opts?.refetchOnFocus ?? false;

  const run = React.useCallback(() => {
    let cancelled = false;
    const hit = peekCache<T>(key, ttlMs);
    if (hit !== undefined) {
      setState({ key, data: hit, loading: false, failed: false });
      return () => { cancelled = true; };
    }
    setState((prev) => ({
      key,
      data: prev.key === key ? prev.data : null,
      loading: prev.key !== key || prev.data === null,
      failed: false,
    }));
    cachedGet(key, () => fetcherRef.current(), ttlMs).then(
      (d) => {
        if (cancelled) return;
        setState({ key, data: d, loading: false, failed: false });
      },
      () => {
        if (cancelled) return;
        setState({ key, data: null, loading: false, failed: true });
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

  // A new key must never briefly show the previous book/chapter's data while
  // its effect is waiting to run. A cached destination renders on this frame.
  const shown = state.key === key ? state : {
    data: cached ?? null, loading: cached === undefined, failed: false,
  };
  return { data: shown.data, loading: shown.loading, failed: shown.failed, retry };
}
