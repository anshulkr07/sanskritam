// Parva reminder taps: open the exact occurrence/day.
// Mounted once inside the NavigationContainer. No-ops when
// expo-notifications is absent (reminders then report unavailable).

import { useNavigation } from "@react-navigation/native";
import { useEffect } from "react";

type NotifMod = typeof import("expo-notifications");

function loadMod(): NotifMod | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-notifications") as NotifMod;
  } catch {
    return null;
  }
}

export default function ParvaNotifyNav() {
  const nav = useNavigation() as unknown as { navigate: (r: string, p?: object) => void };
  useEffect(() => {
    const N = loadMod();
    if (!N || !("addNotificationResponseReceivedListener" in N)) return;
    let sub: { remove: () => void } | undefined;
    try {
      sub = N.addNotificationResponseReceivedListener((resp) => {
        try {
          const d = (resp?.notification?.request?.content?.data ?? {}) as Record<string, unknown>;
          if (!d.parva || typeof d.slug !== "string") return;
          nav.navigate("ParvaPage", {
            slug: d.slug,
            variant: typeof d.variant === "string" ? d.variant : "",
            date: typeof d.date === "string" ? d.date : undefined,
            dayDate: typeof d.dayDate === "string" ? d.dayDate : undefined,
            tradition: typeof d.tradition === "string" && d.tradition ? d.tradition : undefined,
          });
        } catch {
          /* a dead tap never breaks the app */
        }
      });
    } catch {
      return;
    }
    return () => {
      try {
        sub?.remove();
      } catch {
        /* ignore */
      }
    };
  }, [nav]);
  return null;
}
