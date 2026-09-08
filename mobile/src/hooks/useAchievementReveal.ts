// useAchievementReveal — owns the reveal queue for one screen. Record events,
// newly unlocked defs land in `queue`; render <AchievementReveal> once and
// clear on dismiss. The queue survives nothing — a reveal deferred is a reveal
// dropped, which is correct: never nag about a badge twice.

import { useCallback, useState } from "react";

import {
  recordEvent,
  type AchievementDef,
  type AchievementEvent,
} from "../services/achievements";

export function useAchievementReveal() {
  const [queue, setQueue] = useState<AchievementDef[]>([]);

  const record = useCallback(async (event: AchievementEvent): Promise<AchievementDef[]> => {
    try {
      const fresh = await recordEvent(event);
      if (fresh.length) setQueue((q) => [...q, ...fresh]);
      return fresh;
    } catch {
      /* achievements never break the loop */
      return [];
    }
  }, []);

  const dismiss = useCallback(() => setQueue((q) => q.slice(1)), []);

  return { queue, record, dismiss };
}

export default useAchievementReveal;
