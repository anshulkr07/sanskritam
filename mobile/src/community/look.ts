// Group's look is Learn and Read's: paper, ink, one action colour, square
// corners everywhere (owner, 2026-10-13), Mukta for the interface and Tiro
// for Sanskrit. Each person and each circle gets one deep fill, picked from
// its id so it never changes, with cream type on it (every fill below holds
// cream at 5.5:1 or more, WCAG formula, computed for theme.ts).

import AsyncStorage from "@react-native-async-storage/async-storage";

import { fill } from "../theme";

export { T, ui, sa } from "../trail/theme";

export const CREAM = "#FFF8EE";
export const CREAM_SOFT = "rgba(255,248,238,0.82)";
export const CREAM_FAINT = "rgba(255,248,238,0.22)";
/** Small labels on the deep fills used here (teal, maroon, ink). */
export const GOLD = "#F2C879";

const FILLS = [fill.teal, fill.sage, fill.rose, fill.slate, fill.gold, fill.saffron, fill.maroon];

/** The same deep fill for the same id, every time. */
export function fillFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return FILLS[Math.abs(h) % FILLS.length];
}

/** "Anaya Rao" → "AR"; a Devanagari name keeps its first letter. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  if (/[ऀ-ॿ]/.test(words[0][0])) return Array.from(words[0])[0];
  return words
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

const DAY = 86_400_000;

/** "09:41" today, "Tue" this week, "12 Oct" before that. */
export function shortTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (d.getTime() >= startToday) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (d.getTime() >= startToday - 6 * DAY) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

/** "Today", "Yesterday", "Tuesday", "12 October 2025". */
export function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(now) - start(d)) / DAY);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return d.toLocaleDateString([], { weekday: "long" });
  return d.toLocaleDateString([], {
    day: "numeric",
    month: "long",
    ...(d.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
}

/** Per-learner flags for this device (the welcome was skipped, the path hidden). */
export const flags = {
  async get(owner: string | undefined, name: string): Promise<boolean> {
    if (!owner) return false;
    try {
      return (await AsyncStorage.getItem(`shabd.group.${owner}.${name}`)) === "1";
    } catch {
      return false;
    }
  },
  async set(owner: string | undefined, name: string): Promise<void> {
    if (!owner) return;
    await AsyncStorage.setItem(`shabd.group.${owner}.${name}`, "1").catch(() => {});
  },
};
