// colorScheme — the learner's Light / Dark / Match phone choice.
//
// The palette in src/theme.ts is fixed for the life of the JS: screens build
// their StyleSheets from it when they are first required. So the choice is
// read once at boot (src/Boot.tsx, before App.tsx is required) and a change
// restarts the JS, then reopens Settings where the learner made it.
//
// "Match phone" reads the phone's setting at launch; a change made on the
// phone while the app is open shows at the next launch.

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Updates from "expo-updates";
import { Appearance, DevSettings, Platform } from "react-native";

import { applyScheme, isDarkScheme, type SchemeName } from "../theme";

export type SchemePref = "light" | "dark" | "system";

const KEY = "shabd.pref.appearance";
const REOPEN_KEY = "shabd.boot.reopen";

let pref: SchemePref = "light";

function parse(value: string | null): SchemePref {
  return value === "dark" || value === "system" ? value : "light";
}

export function resolveScheme(p: SchemePref): SchemeName {
  if (p !== "system") return p;
  return Appearance.getColorScheme() === "dark" ? "dark" : "light";
}

/** Boot only: read the choice and paint the palette before any screen loads. */
export async function bootScheme(): Promise<void> {
  try {
    pref = parse(await AsyncStorage.getItem(KEY));
  } catch {
    pref = "light";
  }
  applyScheme(resolveScheme(pref));
}

export function getSchemePref(): SchemePref {
  return pref;
}

/** Save the choice; restart into it when it changes what is on screen. */
export async function setSchemePref(next: SchemePref, reopen = "Settings"): Promise<void> {
  pref = next;
  await AsyncStorage.setItem(KEY, next);
  if ((resolveScheme(next) === "dark") === isDarkScheme()) return;
  await AsyncStorage.setItem(REOPEN_KEY, reopen);
  await restart();
}

/** The drawer screen to reopen after a scheme restart, once. */
export async function takeReopen(): Promise<string | null> {
  try {
    const route = await AsyncStorage.getItem(REOPEN_KEY);
    if (route) await AsyncStorage.removeItem(REOPEN_KEY);
    return route;
  } catch {
    return null;
  }
}

async function restart(): Promise<void> {
  if (Platform.OS === "web") {
    globalThis.location?.reload();
    return;
  }
  if (__DEV__) {
    DevSettings.reload();
    return;
  }
  try {
    await Updates.reloadAsync();
  } catch {
    // A build without expo-updates enabled: DevSettings is the only reload.
    DevSettings.reload();
  }
}
