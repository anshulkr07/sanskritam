// OTA updates over EAS Update (expo-updates).
//
// The native layer checks for an update on every launch and downloads it in
// the background; it applies on the next cold start by itself. This module
// is the JS half: a guarded manual check (Settings) and the restart that
// applies a downloaded update at the learner's tap (UpdateBanner).
//
// Everything here is safe to call in development and in Expo Go: with
// updates disabled every check resolves "unavailable" and applying is a
// no-op, never a rejection.

import * as Updates from "expo-updates";

export type OtaCheck = "ready" | "uptodate" | "unavailable";

/** True only in a release build wired to an update channel. */
export function isOtaEnabled(): boolean {
  try {
    return Updates.isEnabled && !__DEV__;
  } catch {
    return false;
  }
}

/** Channel, runtime and update id for diagnostics and Settings. */
export function otaInfo(): {
  channel: string | null;
  runtime: string | null;
  updateId: string | null;
  embedded: boolean;
} {
  let channel: string | null = null;
  let runtime: string | null = null;
  let updateId: string | null = null;
  let embedded = true;
  try {
    channel = Updates.channel ?? null;
    runtime = Updates.runtimeVersion ?? null;
    updateId = Updates.updateId ?? null;
    embedded = Updates.isEmbeddedLaunch;
  } catch {
    /* updates unavailable: keep the defaults */
  }
  return { channel, runtime, updateId, embedded };
}

/**
 * Check for an update and download it. Never throws: a network failure, a
 * dev build or Expo Go all resolve "unavailable".
 */
export async function checkForAppUpdate(): Promise<OtaCheck> {
  if (!isOtaEnabled()) return "unavailable";
  try {
    const res = await Updates.checkForUpdateAsync();
    if (!res.isAvailable) return "uptodate";
    await Updates.fetchUpdateAsync();
    return "ready";
  } catch {
    return "unavailable";
  }
}

/** Restart onto the downloaded update. No-op where updates are disabled. */
export async function applyAppUpdate(): Promise<void> {
  if (!isOtaEnabled()) return;
  try {
    await Updates.reloadAsync();
  } catch {
    /* the reload either happened or the build cannot reload: nothing to say */
  }
}
