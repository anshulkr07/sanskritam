// usePlaySession: one hook for the start → answer → finish lifecycle shared
// by all seven games. Remembered casual settings live on the device under
// shabd.playv2.<game>.

import { createContext, useContext, useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { playApi, type FinishResult, type GameSessionView } from "./client";
import type { SetupChoice } from "./parts";

const rememberKey = (game: string) => `shabd.playv2.${game}`;

export function loadRemembered(game: string): Promise<Record<string, unknown>> {
  return AsyncStorage.getItem(rememberKey(game))
    .then((raw) => (raw ? (JSON.parse(raw) as Record<string, unknown>) : {}))
    .catch(() => ({}));
}

export type PlaySessionController = ReturnType<typeof useSoloPlaySession>;
export const PlaySessionContext = createContext<PlaySessionController | null>(null);

export function usePlaySession(game: string): PlaySessionController {
  const live = useContext(PlaySessionContext);
  const solo = useSoloPlaySession(game);
  return live ?? solo;
}

function useSoloPlaySession(game: string) {
  const [session, setSession] = useState<GameSessionView | null>(null);
  const [result, setResult] = useState<FinishResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedAt = useRef<number>(0);

  const start = useCallback(async (choice: SetupChoice, matchId?: string) => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      void AsyncStorage.setItem(rememberKey(game), JSON.stringify(choice.difficulty));
      const s = await playApi.startSession({
        game, mode: choice.mode, difficulty: choice.difficulty,
        answer_lang: choice.answerLang ?? "sa",
        idempotency_key: `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        match_id: matchId,
      });
      startedAt.current = Date.now();
      setSession(s);
      return s;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setBusy(false);
    }
  }, [game]);

  const answer = useCallback(async (action: Record<string, unknown>) => {
    if (!session) return null;
    try {
      return await playApi.answer(session.id, action);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    }
  }, [session]);

  const finish = useCallback(async (extra?: { window_ms?: number; outcome?: string }) => {
    if (!session) return null;
    setBusy(true);
    try {
      const r = await playApi.finish(session.id, {
        elapsed_ms: Date.now() - startedAt.current,
        window_ms: extra?.window_ms,
        outcome: extra?.outcome ?? "finish",
      });
      setResult(r);
      return r;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setBusy(false);
    }
  }, [session]);

  const abandon = useCallback(async (serverFailure = false) => {
    if (!session) return;
    try {
      await playApi.abandon(session.id, serverFailure);
    } catch { /* best effort */ }
  }, [session]);

  const hint = useCallback(async () => {
    if (!session) return null;
    try {
      return await playApi.hint(session.id);
    } catch {
      return null;
    }
  }, [session]);

  useEffect(() => () => { void abandon(); }, [abandon]);

  const reset = useCallback(() => {
    setSession(null);
    setResult(null);
    setError(null);
  }, []);

  return { session, result, busy, error, start, answer, finish, abandon, hint, reset, setBusy, setError };
}
