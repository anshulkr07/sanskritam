import { Platform } from "react-native";
import { get, Message } from "./api";
const cacheName = "sanskrit-ephemeral-media-v1";
const objects = new Map<string, string>();
export async function cachedMedia(message: Message): Promise<string> {
  const expires = Date.parse(message.expires_at || "");
  if (!Number.isFinite(expires) || expires <= Date.now())
    throw Error("expired");
  // Always authorize first. A cache hit must never bypass current membership.
  const { url } = await get<{ url: string }>(`/media/${message.media_id}`);
  if (Platform.OS === "web") {
    if (!globalThis.caches) return url;
    const cache = await caches.open(cacheName);
    for (const key of await cache.keys()) {
      const cached = await cache.match(key);
      if (Number(cached?.headers.get("x-media-expires")) <= Date.now())
        await cache.delete(key);
    }
    const key = new URL(
      `/__community_media/${message.media_id}`,
      location.origin,
    ).href;
    let response = await cache.match(key);
    if (!response) {
      const fresh = await fetch(url);
      if (!fresh.ok)
        throw Error(
          fresh.status === 404 ? "expired" : "Could not load attachment.",
        );
      response = new Response(await fresh.blob(), {
        headers: {
          "Content-Type":
            fresh.headers.get("Content-Type") || "application/octet-stream",
          "x-media-expires": String(expires),
        },
      });
      await cache.put(key, response.clone());
    }
    const old = objects.get(message.media_id!);
    if (old) return old;
    const object = URL.createObjectURL(await response.blob());
    objects.set(message.media_id!, object);
    return object;
  }
  const fs = await import("expo-file-system/legacy");
  const directory = fs.cacheDirectory + "community-media/";
  await fs.makeDirectoryAsync(directory, { intermediates: true });
  for (const name of await fs.readDirectoryAsync(directory)) {
    if (Number(name.split("_")[0]) <= Date.now())
      await fs.deleteAsync(directory + name, { idempotent: true });
  }
  const path =
    directory +
    `${expires}_${message.media_id}.${message.kind === "image" ? "webp" : "m4a"}`;
  if ((await fs.getInfoAsync(path)).exists) return path;
  const result = await fs.downloadAsync(url, path);
  if (result.status !== 200) {
    await fs.deleteAsync(path, { idempotent: true });
    throw Error(
      result.status === 404 ? "expired" : "Could not load attachment.",
    );
  }
  return path;
}
export async function removeCachedMedia(message: Message) {
  if (Platform.OS === "web") {
    const object = objects.get(message.media_id!);
    if (object) {
      URL.revokeObjectURL(object);
      objects.delete(message.media_id!);
    }
    if (globalThis.caches) {
      const cache = await caches.open(cacheName);
      await cache.delete(
        new URL(`/__community_media/${message.media_id}`, location.origin).href,
      );
    }
  } else {
    const fs = await import("expo-file-system/legacy");
    const path =
      fs.cacheDirectory +
      `community-media/${Date.parse(message.expires_at || "")}_${message.media_id}.${message.kind === "image" ? "webp" : "m4a"}`;
    await fs.deleteAsync(path, { idempotent: true });
  }
}
