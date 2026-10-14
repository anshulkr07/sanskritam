import * as Notifications from "expo-notifications";
import { ensurePermission } from "./reminders";

export type WindowReminder = { slug: string; variant: string; date: string; dayDate: string; tradition: string; tz: string; timingKey: string; start: string; title: string };
const identity = (w: WindowReminder) => [w.slug, w.variant, w.dayDate, w.timingKey, w.start].join("|");

export async function windowReminderIds(): Promise<string[]> {
  try { return (await Notifications.getAllScheduledNotificationsAsync()).map(n => String(n.content.data?.windowId ?? "")).filter(Boolean); }
  catch { return []; }
}
export function windowReminderId(w: WindowReminder): string { return identity(w); }

/** Toggle an individual published window, without cancelling other reminders. */
export async function toggleWindowReminder(w: WindowReminder): Promise<boolean> {
  const id = identity(w);
  const all = await Notifications.getAllScheduledNotificationsAsync();
  const existing = all.filter(n => n.content.data?.windowId === id);
  if (existing.length) { await Promise.all(existing.map(n => Notifications.cancelScheduledNotificationAsync(n.identifier))); return false; }
  const at = new Date(new Date(w.start).getTime() - 15 * 60000);
  if (!Number.isFinite(at.getTime()) || at.getTime() <= Date.now()) throw new Error("This reminder time has passed.");
  if (!await ensurePermission()) throw new Error("Allow notifications to set a reminder.");
  await Notifications.scheduleNotificationAsync({ content: { title: w.title, body: `${w.timingKey.replace(/_/g, " ")} begins in 15 minutes.`, data: { ...w, parvaWindow: true, windowId: id } }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at } });
  return true;
}
