import { dateTextFor, localMidnight, wallClockAt } from "../kala/clock";
import { nextMoonPhase, sunDay } from "../kala/engine";
import type { Snapshot } from "../kala/today";

export function homeTime(at: Date, tz: string): string {
  const minutes = wallClockAt(at, tz).minutes;
  const hour = Math.floor(minutes / 60);
  return `${hour % 12 || 12}:${String(minutes % 60).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
}

function civilDay(at: Date, tz: string): number {
  const { y, m, d } = wallClockAt(at, tz).date;
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

export function homeMoment(at: Date, tz: string, now: Date): string {
  const difference = civilDay(at, tz) - civilDay(now, tz);
  const prefix = difference === 0 ? "" : difference === 1 ? "Tomorrow, " : `${dateTextFor(tz, now)(at)}, `;
  return `${prefix}${homeTime(at, tz)}`;
}

export interface MoonMilestone {
  name: "Poornima" | "Amavasya";
  full: boolean;
  at: Date;
  underway: boolean;
}

export function homeSkyDetails(snap: Snapshot) {
  const tz = snap.place.tz;
  const day = sunDay(localMidnight(snap.at, snap.clock), snap.place);
  const sun = day && civilDay(day.sunrise, tz) === civilDay(snap.at, tz) ? day : null;
  const full = snap.tithi.number <= 15;
  const underway = snap.tithi.number === 15 || snap.tithi.number === 30;
  // A tithi is a lunar day, not the exact full/new moon instant. Count down
  // to the start of tithi 15 (168°) or 30 (348°), matching the card's date.
  const at = underway ? snap.tithi.start : nextMoonPhase(snap.at, full ? 168 : 348);
  const moon: MoonMilestone | null = at ? { name: full ? "Poornima" : "Amavasya", full, at, underway } : null;
  return { sun, moon };
}

export function moonCountdown(moon: MoonMilestone, now: Date, tz: string): string {
  if (moon.underway) return `${moon.name} today`;
  const days = Math.max(0, civilDay(moon.at, tz) - civilDay(now, tz));
  if (days === 0) return `${moon.name} begins today`;
  return `${days} ${days === 1 ? "day" : "days"} to go for ${moon.name}`;
}
