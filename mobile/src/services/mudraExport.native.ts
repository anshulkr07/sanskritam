// Shop B's "Download CSV" (owner, 2026-11-06): the whole Mudrā history from
// the server, saved in the app's cache and handed to the share sheet, where it
// can go to Files, Drive, email or a chat.

import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { getAuthToken } from "../api/client";
import { BASE_URL } from "../config";

export async function downloadMudraHistory(): Promise<void> {
  const token = getAuthToken();
  const response = await fetch(`${BASE_URL}/commerce/mudra/history.csv`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error(response.status === 503 ? "Purchases are being prepared." : "Couldn't download the history. Try again.");
  const text = await response.text();
  const file = new File(Paths.cache, `mudra-history-${new Date().toISOString().slice(0, 10)}.csv`);
  if (file.exists) file.delete();
  file.create();
  file.write(text);
  if (!(await Sharing.isAvailableAsync())) throw new Error("Saving files is not available on this device.");
  await Sharing.shareAsync(file.uri, { mimeType: "text/csv", dialogTitle: "Mudrā history", UTI: "public.comma-separated-values-text" });
}
