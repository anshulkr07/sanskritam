// Push registration (P13 client half) — best-effort, never blocking.
//
// expo-notifications is NOT a dependency of this project yet (P13 sits behind
// P8: do not send notifications to a product with no users). So this module
// resolves the native token only when the package is present (dynamic require
// behind a try/catch) and no-ops otherwise — no package.json change, no crash
// on a build without the module, no-op on web. When the P13 client ships for
// real (install expo-notifications + config plugin + dev build), this same
// seam starts returning real Expo push tokens with zero call-site changes.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

import { api } from "../api/client";

const INSTALL_ID_KEY = "shabd.installId";
const PUSH_SENT_KEY = "shabd.push.sent";

async function getDeviceId(): Promise<string> {
  try {
    let id = await AsyncStorage.getItem(INSTALL_ID_KEY);
    if (!id) {
      id = `dev-${Date.now().toString(36)}-${Math.floor(Math.random() * 0xffff).toString(36)}`;
      await AsyncStorage.setItem(INSTALL_ID_KEY, id);
    }
    return id;
  } catch {
    return "unknown-device";
  }
}

function getExpoToken(): Promise<string | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Notifications = require("expo-notifications");
    return Notifications.getExpoPushTokenAsync()
      .then((t: { data?: string } | string) =>
        typeof t === "string" ? t : (t?.data ?? null),
      )
      .catch(() => null);
  } catch {
    return Promise.resolve(null);
  }
}

/** Register this device for the daily return loop. Never throws. */
export async function registerPushToken(): Promise<boolean> {
  try {
    const [deviceId, token] = await Promise.all([getDeviceId(), getExpoToken()]);
    if (!token) return false; // module absent or permission denied — fine
    const already = await AsyncStorage.getItem(PUSH_SENT_KEY).catch(() => null);
    if (already === token) return true; // registered before, skip the call
    await api.registerPushToken(deviceId, token, Platform.OS);
    await AsyncStorage.setItem(PUSH_SENT_KEY, token).catch(() => {});
    return true;
  } catch {
    return false;
  }
}

export default { registerPushToken };
