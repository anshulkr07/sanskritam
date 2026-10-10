// Parva network layer in api/client.ts style. A 404 or network error
// returns null so the Home strip simply hides (both directions keep working).

import { ApiError, getAuthToken } from "../api/client";
import { BASE_URL } from "../config";

export const PARVA_DAYS_AHEAD = 60;
export const PARVA_MAX_DAYS = 120;

export interface ParvaTime {
  key: string;
  start: string | null;
  end: string | null;
}

export interface ParvaDay {
  date: string;
  tithi_key: string;
  label: string;
  form_key: string;
}

export interface ParvaOccurrence {
  slug: string;
  variant: string;
  title: string;
  title_local: string;
  date: string | null;
  end_date: string | null;
  times: ParvaTime[];
  day: ParvaDay[] | null;
  has_page: boolean;
  art_url: string;
}

export interface ParvaCalendar {
  place_label: string;
  occurrences: ParvaOccurrence[];
}

export interface ParvaPageBody {
  slug: string;
  variant: string;
  lang: string;
  body: Record<string, unknown>;
  sources: Record<string, unknown>[];
  art_url: string;
  times: ParvaTime[];
  date: string | null;
  end_date: string | null;
  day?: ParvaDay[] | null;
}

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const token = getAuthToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}${path}`, { headers });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function q(params: Record<string, string | number | undefined>): string {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
}

export function parvaCalendar(opts: {
  start: string;
  days: number;
  lat: number;
  lon: number;
  tz: string;
  tradition: string;
  lang: string;
  label?: string;
}): Promise<ParvaCalendar | null> {
  return getJson<ParvaCalendar>(
    `/parva/calendar?${q({ ...opts, days: Math.min(opts.days, PARVA_MAX_DAYS) })}`,
  );
}

export function parvaPage(opts: {
  slug: string;
  variant?: string;
  lang: string;
  year?: number;
  lat?: number;
  lon?: number;
  tz?: string;
}): Promise<ParvaPageBody | null> {
  const { slug, ...rest } = opts;
  return getJson<ParvaPageBody>(`/parva/page/${encodeURIComponent(slug)}?${q(rest)}`);
}

export function shraddhaDate(opts: {
  tithi: number;
  year: number;
  lat: number;
  lon: number;
  tz: string;
}): Promise<{ date: string } | null> {
  return getJson<{ date: string }>(`/parva/shraddha-date?${q(opts)}`);
}

export { ApiError };
