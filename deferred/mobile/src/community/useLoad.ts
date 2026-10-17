// Load something for a Group screen, and load it again when the screen comes
// back into view or the community changes (the realtime socket bumps
// `revision`). A newer load always wins over an older one still in flight.

import { useIsFocused } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";

import { friendly } from "./api";
import { useCommunity } from "./CommunityProvider";

export function useLoad<T>(fn: () => Promise<T>, deps: unknown[]) {
  const { revision } = useCommunity();
  const focused = useIsFocused();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(async () => {
    const n = ++seq.current;
    try {
      const next = await fn();
      if (n !== seq.current) return;
      setData(next);
      setError("");
    } catch (e) {
      if (n === seq.current) setError(friendly(e, "Could not load this. Pull down to try again."));
    } finally {
      if (n === seq.current) setLoading(false);
    }
  }, deps);
  useEffect(() => {
    if (!focused) return;
    const t = setTimeout(() => void run(), 120);
    return () => clearTimeout(t);
  }, [run, focused, revision]);
  return { data, error, loading, reload: run, setData };
}
