// Birth details for Ask mode's kundli answers.
//
// Kept on this phone only (AsyncStorage), so a learner types them once. They
// go to the server in the POST body of an Ask question that needs a chart,
// and the server uses them for the calculation and keeps nothing
// (backend/app/routers/ask.py). "Forget" removes them from the phone.

import AsyncStorage from "@react-native-async-storage/async-storage";

import type { AskBirth } from "../api/client";

const STORE_KEY = "shabd.birth";

export async function getBirth(): Promise<AskBirth | null> {
  try {
    const raw = await AsyncStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const b = JSON.parse(raw) as AskBirth;
    return b && b.date && typeof b.lat === "number" ? b : null;
  } catch {
    return null;
  }
}

export async function setBirth(b: AskBirth): Promise<void> {
  try {
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(b));
  } catch {
    // Not remembered; the answer still works this time.
  }
}

export async function forgetBirth(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORE_KEY);
  } catch {
    // Nothing to do.
  }
}

// The other person for gun milan, kept the same way, with which side of the
// match the learner is (the kootas read the boy's side and the girl's).

const PARTNER_KEY = "shabd.partner";

export interface SavedPartner {
  birth: AskBirth;
  askerIs: "boy" | "girl";
}

export async function getPartner(): Promise<SavedPartner | null> {
  try {
    const raw = await AsyncStorage.getItem(PARTNER_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as SavedPartner;
    return p && p.birth && p.birth.date && (p.askerIs === "boy" || p.askerIs === "girl") ? p : null;
  } catch {
    return null;
  }
}

export async function setPartner(p: SavedPartner): Promise<void> {
  try {
    await AsyncStorage.setItem(PARTNER_KEY, JSON.stringify(p));
  } catch {
    // Not remembered; the answer still works this time.
  }
}

export async function forgetPartner(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PARTNER_KEY);
  } catch {
    // Nothing to do.
  }
}

/** "15 Jun 1990, 11:00, New Delhi" for the form's summary line. */
export function describeBirth(b: AskBirth): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const [y, m, d] = b.date.split("-").map((n) => parseInt(n, 10));
  const day = y && m && d ? `${d} ${months[m - 1]} ${y}` : b.date;
  return [day, b.time_known ? b.time : "time unknown", b.label].filter(Boolean).join(", ");
}

/**
 * Check what was typed. Returns the details or a message saying what to fix.
 * Day, month and year are separate boxes; the time is 24-hour.
 */
export function parseBirth(
  day: string,
  month: string,
  year: string,
  clock: string,
  timeKnown: boolean,
  place: { lat: number; lon: number; tz: string; label: string } | null,
  today: Date = new Date(),
): { birth: AskBirth } | { error: string } {
  const d = parseInt(day, 10);
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  if (!(y >= 1900 && y <= today.getFullYear()) || !(m >= 1 && m <= 12) || !(d >= 1 && d <= 31)) {
    return { error: "Enter the date as day, month and year." };
  }
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) {
    return { error: "That date does not exist." };
  }
  if (probe.getTime() > today.getTime()) {
    return { error: "The date is in the future." };
  }
  let time = "";
  if (timeKnown) {
    const t = /^\s*(\d{1,2})[:.](\d{2})\s*$/.exec(clock);
    const hh = t ? parseInt(t[1], 10) : -1;
    const mm = t ? parseInt(t[2], 10) : -1;
    if (!(hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59)) {
      return { error: "Enter the time as hours and minutes, 24-hour, like 14:30." };
    }
    time = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  }
  if (!place) {
    return { error: "Choose the place of birth." };
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    birth: {
      date: `${y}-${pad(m)}-${pad(d)}`,
      time,
      time_known: timeKnown,
      lat: place.lat,
      lon: place.lon,
      tz: place.tz,
      label: place.label,
    },
  };
}
