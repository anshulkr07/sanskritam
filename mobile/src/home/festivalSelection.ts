import type { ParvaOccurrence } from "../parva/api";

/** Keep today's dated entries and ongoing observances; hide future entries. */
export function homeFestivalOccurrences(occurrences: ParvaOccurrence[], today: string): ParvaOccurrence[] {
  return occurrences.filter((o) => o.day?.some((day) => day.date === today) ||
    (o.date != null && o.date <= today && today <= (o.end_date ?? o.date)));
}
