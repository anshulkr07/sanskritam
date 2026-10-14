import type { AskBirth, AskTalkResponse } from "../api/client";
import { plain } from "../utils/text";

export function rashiDateLabel(date: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

export function rashiProfileKey(profile: AskBirth): string {
  return [profile.date, profile.time, profile.time_known, profile.lat, profile.lon, profile.tz].join("|");
}

/** Prefer the purpose-built summary, never the full chart explanation. */
export function rashiSummary(response: Pick<AskTalkResponse, "card" | "explanation">): string {
  const clean = plain(response.card?.summary?.trim() || response.explanation).replace(/\*\*|__|^#+\s*/gm, "").replace(/\s+/g, " ").trim();
  const sentences = clean.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) ?? [];
  let result = "";
  let count = 0;
  for (const sentence of sentences) {
    if (count === 3 || (result + sentence).trim().split(/\s+/).length > 75) break;
    result += sentence.trim() + " "; count++;
  }
  if (result.trim()) return result.trim();
  // An old backend may send a single lengthy paragraph. Keep a word-boundary
  // excerpt rather than overflowing Home or cutting in the middle of a word.
  const words = clean.split(/\s+/).filter(Boolean);
  return words.length > 75 ? words.slice(0, 75).join(" ") + "…" : clean;
}
