// The learner's wall clock at a place, and times of day written for them.
//
// The calendar needs two things only a clock can give: today's civil date
// where the learner is, and how long ago their midnight was. Both come from
// Intl with the place's time zone. Where Intl cannot do that, the phone's own
// zone stands in, which is right whenever the phone is where the place is.

import type { CivilDate } from "./engine";
import type { WallClock } from "./today";

const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Parts {
  date: CivilDate;
  hour: number;
  minute: number;
}

function partsAt(at: Date, tz: string): Parts {
  try {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const found: Record<string, number> = {};
    for (const p of fmt.formatToParts(at)) found[p.type] = Number(p.value);
    const { year, month, day, hour, minute } = found;
    if ([year, month, day, hour, minute].every((n) => Number.isFinite(n))) {
      // Some engines write midnight as 24.
      return { date: { y: year, m: month, d: day }, hour: hour % 24, minute };
    }
  } catch {
    /* no Intl, or a zone it does not know: the phone's own zone below */
  }
  return {
    date: { y: at.getFullYear(), m: at.getMonth() + 1, d: at.getDate() },
    hour: at.getHours(),
    minute: at.getMinutes(),
  };
}

/** The civil date and minutes since midnight at a place. */
export function wallClockAt(at: Date, tz: string): WallClock {
  const p = partsAt(at, tz);
  return { date: p.date, minutes: p.hour * 60 + p.minute };
}

/** A writer of times of day at a place: "12:36", or "10:16 Fri" when the
 *  moment falls on another day than `now`. */
export function clockTextFor(tz: string, now: Date): (d: Date) => string {
  const today = partsAt(now, tz).date;
  return (d: Date) => {
    const p = partsAt(d, tz);
    const hhmm = `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
    if (p.date.y === today.y && p.date.m === today.m && p.date.d === today.d) return hhmm;
    const weekday = new Date(Date.UTC(p.date.y, p.date.m - 1, p.date.d)).getUTCDay();
    return `${hhmm} ${WEEKDAYS_SHORT[weekday]}`;
  };
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Minutes since the place's midnight at an instant, seconds as a fraction. */
export function minutesOfDayAt(at: Date, tz: string): number {
  const p = partsAt(at, tz);
  return p.hour * 60 + p.minute + (at.getTime() % 60000) / 60000;
}

/** The instant the place's civil date began, for a wall clock read at `at`. */
export function localMidnight(at: Date, clock: WallClock): Date {
  return new Date(Math.floor(at.getTime() / 60000) * 60000 - clock.minutes * 60000);
}

/** A writer of calendar dates at a place: "17 Oct", or "17 Oct 2027" when
 *  the year is not `now`'s. */
export function dateTextFor(tz: string, now: Date): (d: Date) => string {
  const thisYear = partsAt(now, tz).date.y;
  return (d: Date) => {
    const p = partsAt(d, tz).date;
    const base = `${p.d} ${MONTHS_SHORT[p.m - 1]}`;
    return p.y === thisYear ? base : `${base} ${p.y}`;
  };
}

/** A writer of moments at a place: "12:36" today, "Sat 17 Oct, 19:05"
 *  on any other day. */
export function whenTextFor(tz: string, now: Date): (d: Date) => string {
  const today = partsAt(now, tz).date;
  return (d: Date) => {
    const p = partsAt(d, tz);
    const hhmm = `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
    if (p.date.y === today.y && p.date.m === today.m && p.date.d === today.d) return hhmm;
    const weekday = new Date(Date.UTC(p.date.y, p.date.m - 1, p.date.d)).getUTCDay();
    return `${WEEKDAYS_SHORT[weekday]} ${p.date.d} ${MONTHS_SHORT[p.date.m - 1]}, ${hhmm}`;
  };
}

/** A length of time in hours and minutes: "11 h 53 m". */
export function spanText(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h === 0 ? `${m} m` : `${h} h ${String(m).padStart(2, "0")} m`;
}

/** The phone's own time zone, or India's when it will not say. */
export function deviceTimeZone(): string {
  try {
    return new Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
  } catch {
    return "Asia/Kolkata";
  }
}
