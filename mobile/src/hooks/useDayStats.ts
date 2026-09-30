// Day-based progress numbers, computed from the activity history.
//
// `learner.streak` (from /me) is NOT days: the backend adds one per correct
// challenge answer and resets it on a wrong one (adaptive.py update_streak).
// Every streak the app shows is derived here instead, from GET /progress/daily
// (today's learner-local date and XP) and GET /progress/history.

import { useCallback, useState } from "react";

import { api, type ProgressDaily, type ProgressDay } from "../api/client";
import { cachedGet } from "../services/apiCache";
import { dayStreak, isActiveDay } from "../utils/streak";

export interface DayStats {
  /** Consecutive practised days ending today (or yesterday). */
  streak: number;
  /** Days practised in the last 90. */
  practised: number;
  daily: ProgressDaily;
  history: ProgressDay[];
}

const TTL_MS = 20_000;

/** Load once now; call `refresh()` again when the numbers may have moved. */
export function useDayStats(): { stats: DayStats | null; failed: boolean; refresh: () => void } {
  const [stats, setStats] = useState<DayStats | null>(null);
  const [failed, setFailed] = useState(false);

  const refresh = useCallback(() => {
    setFailed(false);
    Promise.all([
      cachedGet("progress-daily", api.progressDaily, TTL_MS),
      cachedGet("progress-history-90", () => api.progressHistory(90), TTL_MS),
    ])
      .then(([daily, history]) =>
        setStats({
          daily,
          history,
          streak: dayStreak(history, daily.date),
          practised: history.filter(isActiveDay).length,
        }),
      )
      .catch(() => setFailed(true));
  }, []);

  return { stats, failed, refresh };
}
