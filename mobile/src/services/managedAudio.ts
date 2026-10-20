import { createAudioPlayer } from "expo-audio";
import { audioTransport, type AudioKind } from "./audioTransport";
import { needsOfflineAudioResolution, onOfflineAudioInvalidated, resolveOfflineAudio } from "./protectedAudio";

let lockOwner: { clear(): void } | null = null;

// Preserve the Expo player contract so existing verse timing and playback
// callbacks keep working. Sound effects deliberately use Expo directly.
export function createManagedAudioPlayer(
  source: Parameters<typeof createAudioPlayer>[0],
  options?: Parameters<typeof createAudioPlayer>[1],
  title = "Audio",
  retainLockScreenOnFinish = false,
  kind: AudioKind = "audio",
): ReturnType<typeof createAudioPlayer> {
  type Source = Parameters<typeof createAudioPlayer>[0];
  const player = createAudioPlayer(null, options);
  let sourceVersion = 0;
  let releaseSource = () => {};
  let ready: Promise<void> = Promise.resolve();
  let wantsPlay = false;
  let preparing = false;
  const statusListeners = new Set<(status: typeof player.currentStatus) => void>();
  const replace = (next: Source) => {
    const version = ++sourceVersion;
    preparing = true;
    ready = (async () => {
      const uri = typeof next === "string" ? next : typeof next === "object" ? next?.uri : undefined;
      const lease = uri && needsOfflineAudioResolution(uri) ? await resolveOfflineAudio(uri) : null;
      if (removed || version !== sourceVersion) { lease?.release(); return; }
      const previousRelease = releaseSource;
      releaseSource = lease?.release ?? (() => {});
      try { player.replace(lease ? typeof next === "object" ? { ...next, uri: lease.uri } : lease.uri : next ?? null); }
      finally { previousRelease(); }
      preparing = false;
      if (wantsPlay) player.play();
    })();
    void ready.catch(error => {
      if (removed || version !== sourceVersion) return;
      preparing = false; wantsPlay = false; setLock(false); audioTransport.release(id);
      const status = { ...player.currentStatus, error: error instanceof Error ? error.message : "Couldn't open saved audio.", playing: false };
      for (const listener of statusListeners) listener(status);
    });
  };
  let id = 0;
  let removed = false;
  let lockActive = false;
  const owner = { clear: () => setLock(false) };
  const setLock = (active: boolean, metadata?: Parameters<typeof player.setActiveForLockScreen>[1], lockOptions?: Parameters<typeof player.setActiveForLockScreen>[2]) => {
    if (active && lockOwner && lockOwner !== owner) lockOwner.clear();
    if (!active && !lockActive) return;
    try {
      player.setActiveForLockScreen(active, metadata ?? { title, artist: "Sanskritam" }, lockOptions);
      lockActive = active;
      if (active) lockOwner = owner;
      else if (lockOwner === owner) lockOwner = null;
    } catch { /* Web/older native players can still play in the foreground. */ }
  };
  const play = () => {
    if (removed) return;
    if (!id || audioTransport.getSnapshot()?.id !== id) {
      id = audioTransport.claim(title, { play, pause }, kind);
    }
    wantsPlay = true;
    try {
      if (!lockActive) setLock(true);
      if (!preparing) player.play(); audioTransport.update(id, { playing: true });
    }
    catch (error) { setLock(false); audioTransport.release(id); throw error; }
  };
  const pause = () => {
    if (removed) return;
    wantsPlay = false;
    player.pause(); audioTransport.update(id, { playing: false });
  };
  const subscription = player.addListener("playbackStatusUpdate", status => {
    if (status.didJustFinish || status.error) {
      if (!retainLockScreenOnFinish || status.error) setLock(false);
      audioTransport.release(id); return;
    }
    audioTransport.update(id, {
      playing: status.playing,
      position: Math.floor(status.currentTime || 0),
      duration: Math.floor(status.duration || 0),
    });
  });
  const remove = () => {
    if (removed) return;
    removed = true; sourceVersion++; wantsPlay = false; subscription.remove(); unsubscribeInvalidation(); statusListeners.clear(); setLock(false); audioTransport.release(id); try { player.remove(); } finally { releaseSource(); }
  };
  const unsubscribeInvalidation = onOfflineAudioInvalidated(remove);
  replace(source);
  return new Proxy(player, {
    get(target, property) {
      if (property === "play") return play;
      if (property === "pause") return pause;
      if (property === "remove" || property === "release") return remove;
      if (property === "setActiveForLockScreen") return setLock;
      if (property === "replace") return replace;
      if (property === "seekTo") return async (...args: Parameters<typeof player.seekTo>) => { await ready; if (!removed) await player.seekTo(...args); };
      if (property === "addListener") return (event: string, callback: (status: typeof player.currentStatus) => void) => {
        if (event !== "playbackStatusUpdate") return player.addListener(event as "playbackStatusUpdate", callback);
        statusListeners.add(callback);
        const sub = player.addListener(event, callback);
        return { remove: () => { statusListeners.delete(callback); sub.remove(); } };
      };
      const value = Reflect.get(target, property, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
    set(target, property, value) { return Reflect.set(target, property, value, target); },
  });
}
