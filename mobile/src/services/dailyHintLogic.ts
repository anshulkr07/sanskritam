// One free hint a day per learner, shared by every exercise in the app. Pure rules only; the store is dailyHint.ts.
export interface HintRecord { day: string; used: boolean }
const pad = (n: number) => String(n).padStart(2, '0');
/** The learner's local calendar day, e.g. 2026-10-20. */
export const hintDay = (date: Date = new Date()): string => date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
/** A record from another day (or none) means today's hint is still unspent. */
export const hintAvailable = (record: HintRecord | null | undefined, today: string): boolean => !record || record.day !== today || !record.used;
export const parseHintRecord = (raw: string | null): HintRecord | null => {
  if (!raw) return null;
  try { const v = JSON.parse(raw) as Partial<HintRecord>; return typeof v?.day === 'string' && typeof v.used === 'boolean' ? { day: v.day, used: v.used } : null; } catch { return null; }
};
