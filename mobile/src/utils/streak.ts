// Day streaks, computed from the learner's activity history.
//
// `learner.streak` from /me is NOT a day count: the backend adds one per
// correct challenge answer and resets it on a wrong one (adaptive.py
// update_streak). A flame next to that number told learners they had lost a
// streak they never broke. The day streak is derived here from
// GET /progress/history, whose dates are learner-local.

import type { ProgressDay } from "../api/client";

/** A day counts when anything at all was practised on it. */
export function isActiveDay(d: ProgressDay | undefined): boolean {
  if (!d) return false;
  return (
    (d.xp ?? 0) > 0 ||
    (d.attempts ?? 0) > 0 ||
    (d.conversation_turns ?? 0) > 0 ||
    (d.pronunciation_attempts ?? 0) > 0
  );
}

function parseDay(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

export function dayKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function shiftDay(key: string, delta: number): string {
  const d = parseDay(key);
  d.setUTCDate(d.getUTCDate() + delta);
  return dayKey(d);
}

/** The device's local date as YYYY-MM-DD. */
export function localToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/**
 * Consecutive practised days ending today. A streak is still alive while
 * today is empty, so an empty today counts back from yesterday.
 */
export function dayStreak(days: ProgressDay[], today: string): number {
  const active = new Set(days.filter(isActiveDay).map((d) => d.date));
  let cursor = active.has(today) ? today : shiftDay(today, -1);
  let n = 0;
  while (active.has(cursor)) {
    n += 1;
    cursor = shiftDay(cursor, -1);
  }
  return n;
}

export interface CalendarCell {
  key: string;
  /** The day of the month. */
  day: number;
  active: boolean;
  goal: boolean;
  isToday: boolean;
  future: boolean;
}

/**
 * A weekday-aligned calendar of the last `weeks` weeks: Sunday-first columns,
 * the current week last, so a header row of S M T W T F S lines up. Days after
 * today are marked `future` (an empty cell, not a missed day).
 */
export function weekGrid(days: ProgressDay[], today: string, weeks = 5): CalendarCell[] {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const weekday = parseDay(today).getUTCDay(); // 0 = Sunday
  const start = shiftDay(today, -(weekday + 7 * (weeks - 1)));
  const cells: CalendarCell[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const key = shiftDay(start, i);
    const rec = byDate.get(key);
    cells.push({
      key,
      day: parseDay(key).getUTCDate(),
      active: isActiveDay(rec),
      goal: !!rec && rec.goal_met,
      isToday: key === today,
      future: key > today,
    });
  }
  return cells;
}
