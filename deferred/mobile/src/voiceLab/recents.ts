// The last companion spoken with, so the Voice tab can offer to carry on.
// One short key, written when a call starts and read when the hub appears;
// nothing else about a call is stored on the device.

import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "shabd.voice.recent.v1";

export async function readLastCompanion(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function rememberCompanion(id: string) {
  AsyncStorage.setItem(KEY, id).catch(() => {});
}
