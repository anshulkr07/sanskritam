import { useEffect, useState } from "react";
import { getBookActivity, type BookActivity } from "../services/bookActivity";
import { subscribeProgress } from "../services/progressStorage";
export function useBookActivity() {
  const [activity, setActivity] = useState<BookActivity>({});
  useEffect(() => {
    let alive = true, generation = 0;
    const reload = () => { const run = ++generation; void getBookActivity().then(value => { if (alive && run === generation) setActivity(value); }).catch(() => {}); };
    const unsubscribe = subscribeProgress(reload); reload();
    return () => { alive = false; unsubscribe(); };
  }, []);
  return activity;
}
