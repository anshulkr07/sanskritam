// Local festival reminders, scheduled on the phone. The server learns
// nothing about them. Inexact triggers only (no SCHEDULE_EXACT_ALARM).

import AsyncStorage from "@react-native-async-storage/async-storage";

import { t } from "../i18n";
import type { ParvaCalendar } from "./api";

const FOLLOW_KEY = "shabd.parva.follow";
const UNAVAIL_KEY = "shabd.parva.remindUnavailable";
const CHANNEL_ID = "parva";

type NotifMod = typeof import("expo-notifications");

let mod: NotifMod | null | undefined;
function notif(): NotifMod | null {
  if (mod !== undefined) return mod;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require("expo-notifications") as NotifMod;
  } catch {
    mod = null;
  }
  return mod;
}

export function remindersUnavailable(): boolean {
  return false;
}

async function markUnavailable(): Promise<void> {
  try {
    await AsyncStorage.setItem(UNAVAIL_KEY, "1");
  } catch {
    /* ignore */
  }
}

export async function isRemindUnavailable(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(UNAVAIL_KEY)) === "1";
  } catch {
    return false;
  }
}

export async function followedSlugs(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(FOLLOW_KEY);
    const v = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export async function setFollowed(slug: string, on: boolean): Promise<string[]> {
  const cur = new Set(await followedSlugs());
  if (on) cur.add(slug);
  else cur.delete(slug);
  const next = [...cur];
  try {
    await AsyncStorage.setItem(FOLLOW_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

async function ensureChannel(N: NotifMod): Promise<boolean> {
  try {
    if ("setNotificationChannelAsync" in N) {
      await (N as unknown as {
        setNotificationChannelAsync: (id: string, o: object) => Promise<unknown>;
      }).setNotificationChannelAsync(CHANNEL_ID, { name: "Festivals", importance: 3 });
    }
    return true;
  } catch {
    return false;
  }
}

/** Ask for permission when turning a bell or the Settings row on, never on launch. */
export async function ensurePermission(): Promise<boolean> {
  const N = notif();
  if (!N || !("getPermissionsAsync" in N)) {
    await markUnavailable();
    return false;
  }
  try {
    const cur = await N.getPermissionsAsync();
    if (cur.granted) {
      await ensureChannel(N);
      return true;
    }
    const req = await N.requestPermissionsAsync();
    if (!req.granted) return false;
    await ensureChannel(N);
    return true;
  } catch {
    await markUnavailable();
    return false;
  }
}

/** Reschedule ours (tagged data.parva) whenever the cache refreshes. At most 30. */
export async function rescheduleFromCalendar(cal: ParvaCalendar | null): Promise<void> {
  const N = notif();
  if (!N || !("scheduleNotificationAsync" in N)) {
    await markUnavailable();
    return;
  }
  try {
    const followed = new Set(await followedSlugs());
    if (followed.size === 0) return;
    // Cancel ours only.
    try {
      const all = await N.getAllScheduledNotificationsAsync();
      for (const s of all) {
        const d = (s.content.data ?? {}) as Record<string, unknown>;
        if (d.parva) {
          try {
            await N.cancelScheduledNotificationAsync(s.identifier);
          } catch {
            /* ignore */
          }
        }
      }
    } catch {
      /* listing failed: still try to add */
    }
    const items: { at: Date; title: string; body: string }[] = [];
    for (const o of cal?.occurrences ?? []) {
      if (!followed.has(o.slug) || !o.date) continue;
      const d = new Date(`${o.date}T00:00:00`);
      if (Number.isNaN(d.getTime())) continue;
      // Evening before at 19:00.
      const eve = new Date(d);
      eve.setDate(eve.getDate() - 1);
      eve.setHours(19, 0, 0, 0);
      if (eve.getTime() > Date.now()) {
        items.push({ at: eve, title: o.title, body: t("parva.reminderEvening", { title: o.title }) });
      }
      // Ekadashi parana start.
      if (o.slug === "ekadashi") {
        const par = (o.times ?? []).find((x) => x.key === "parana" && x.start);
        if (par?.start) {
          const at = new Date(par.start);
          if (!Number.isNaN(at.getTime()) && at.getTime() > Date.now()) {
            items.push({ at, title: o.title, body: t("parva.reminderParana", { title: o.title }) });
          }
        }
      }
    }
    items.sort((a, b) => a.at.getTime() - b.at.getTime());
    let n = 0;
    for (const it of items.slice(0, 30)) {
      try {
        await N.scheduleNotificationAsync({
          content: { title: it.title, body: it.body, data: { parva: true } },
          // Inexact date trigger; no exact alarm permission needed.
          trigger: { type: "date", date: it.at } as never,
        });
        n++;
      } catch {
        await markUnavailable();
        return;
      }
    }
    void n;
  } catch {
    await markUnavailable();
  }
}
