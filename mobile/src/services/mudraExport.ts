// Web: the browser downloads the Mudrā history CSV directly.

import { getAuthToken } from "../api/client";
import { BASE_URL } from "../config";

export async function downloadMudraHistory(): Promise<void> {
  const token = getAuthToken();
  const response = await fetch(`${BASE_URL}/commerce/mudra/history.csv`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error(response.status === 503 ? "Purchases are being prepared." : "Couldn't download the history. Try again.");
  const url = URL.createObjectURL(await response.blob());
  const doc = (globalThis as { document?: { createElement: (tag: string) => { href: string; download: string; click: () => void } } }).document;
  if (!doc) throw new Error("Downloads need a browser.");
  const link = doc.createElement("a");
  link.href = url;
  link.download = `mudra-history-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
