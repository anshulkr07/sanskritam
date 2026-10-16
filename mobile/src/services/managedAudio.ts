import { createAudioPlayer } from "expo-audio";
import { audioTransport, type AudioKind } from "./audioTransport";
import { offlineAudioUrl } from "./offlineBooks";

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
  const resolved = typeof source === "string" ? offlineAudioUrl(source) : source;
  const player = createAudioPlayer(resolved, options);
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
    try {
      if (!lockActive) setLock(true);
      player.play(); audioTransport.update(id, { playing: true });
    }
    catch (error) { setLock(false); audioTransport.release(id); throw error; }
  };
  const pause = () => {
    if (removed) return;
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
    removed = true; subscription.remove(); setLock(false); audioTransport.release(id); player.remove();
  };
  return new Proxy(player, {
    get(target, property) {
      if (property === "play") return play;
      if (property === "pause") return pause;
      if (property === "remove" || property === "release") return remove;
      if (property === "setActiveForLockScreen") return setLock;
      if (property === "replace") return (next: Parameters<typeof player.replace>[0]) => player.replace(typeof next === "string" ? offlineAudioUrl(next) : next);
      const value = Reflect.get(target, property, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
    set(target, property, value) { return Reflect.set(target, property, value, target); },
  });
}
