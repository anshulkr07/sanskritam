// useDerivation — drives the animated derivation player state (U7-1).
//
// Holds the current step index, derives whether a step is a "bookkeeping" step
// (result did not change), and computes the diffed span between the previous
// and current step's `result` so the player can animate *only* the segment
// that changed. The player is scrubbable and never autoplays by default.

import { useEffect, useMemo, useState } from "react";

import type { Derivation, DerivationStep } from "../api/client";

export interface DerivedStep {
  step: DerivationStep;
  /** True when the form-under-construction did not change this step. */
  bookkeeping: boolean;
  /** Diff-hint: the changed span between the previous and this result. */
  changed: string | null;
}

/** Returns the substring that differs between two "A + B + C" style results. */
export function diffResult(prev: string, next: string): string | null {
  if (!prev || !next) return next || null;
  // Find the differing segment: longest common prefix, then suffix.
  let p = 0;
  const max = Math.min(prev.length, next.length);
  while (p < max && prev[p] === next[p]) p++;
  let s = 0;
  while (
    s < max - p &&
    prev[prev.length - 1 - s] === next[next.length - 1 - s]
  ) {
    s++;
  }
  const midNext = next.slice(p, next.length - s);
  return midNext || null;
}

export interface UseDerivationResult {
  derivation: Derivation | null;
  loading: boolean;
  error: string | null;
  steps: DerivedStep[];
  current: number;
  stepCount: number;
  /** 0..1 progress for the scrubber. */
  setCurrent: (i: number) => void;
  next: () => void;
  prev: () => void;
  atEnd: boolean;
  atStart: boolean;
}

/**
 * Loads a derivation via the given fetch function and exposes player state.
 * `fetchFn` returns a `Derivation` (or null when `steps` is empty, which the
 * backend guarantees by design — P9-1.4). Never autoplays.
 */
export function useDerivation(
  fetchFn: () => Promise<Derivation | null>,
): UseDerivationResult {
  const [derivation, setDerivation] = useState<Derivation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrentRaw] = useState(0);

  const steps = useMemo(() => {
    if (!derivation) return [];
    return derivation.steps.map((step, i) => {
      const prev = i > 0 ? derivation.steps[i - 1].result : "";
      return {
        step,
        bookkeeping: prev !== "" && prev === step.result,
        changed: i === 0 ? step.result : diffResult(prev, step.result),
      };
    });
  }, [derivation]);

  // Load on mount (the caller keys the fetch by query).
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fetchFn()
      .then((d) => {
        if (!alive) return;
        setDerivation(d && d.steps && d.steps.length ? d : null);
        setCurrentRaw(0);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Could not load derivation");
        setDerivation(null);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stepCount = derivation?.step_count ?? 0;

  const setCurrent = (i: number) => {
    if (stepCount === 0) return;
    setCurrentRaw(Math.max(0, Math.min(stepCount - 1, i)));
  };
  const next = () => setCurrent(current + 1);
  const prev = () => setCurrent(current - 1);

  return {
    derivation,
    loading,
    error,
    steps,
    current,
    stepCount,
    setCurrent,
    next,
    prev,
    atEnd: stepCount === 0 || current >= stepCount - 1,
    atStart: current <= 0,
  };
}