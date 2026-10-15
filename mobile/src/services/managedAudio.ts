import { createAudioPlayer } from "expo-audio";
import { audioTransport } from "./audioTransport";
import { offlineAudioUrl } from "./offlineBooks";

// Preserve the Expo player contract so existing verse timing and playback
// callbacks keep working. Sound effects deliberately use Expo directly.
export function createManagedAudioPlayer(
  source: Parameters<typeof createAudioPlayer>[0],
  options?: Parameters<typeof createAudioPlayer>[1],
  title = "Audio",
): ReturnType<typeof createAudioPlayer> {
  const resolved = typeof source === "string" ? offlineAudioUrl(source) : source;
  const player = createAudioPlayer(resolved, options);
  let id = 0;
  let removed = false;
  const play = () => {
    if (removed) return;
    if (!id || audioTransport.getSnapshot()?.id !== id) {
      id = audioTransport.claim(title, { play, pause });
    }
    try { player.play(); audioTransport.update(id, { playing: true }); }
    catch (error) { audioTransport.release(id); throw error; }
  };
  const pause = () => {
    if (removed) return;
    player.pause(); audioTransport.update(id, { playing: false });
  };
  const subscription = player.addListener("playbackStatusUpdate", status => {
    if (status.didJustFinish || status.error) { audioTransport.release(id); return; }
    audioTransport.update(id, {
      playing: status.playing,
      position: Math.floor(status.currentTime || 0),
      duration: Math.floor(status.duration || 0),
    });
  });
  const remove = () => {
    if (removed) return;
    removed = true; subscription.remove(); audioTransport.release(id); player.remove();
  };
  return new Proxy(player, {
    get(target, property) {
      if (property === "play") return play;
      if (property === "pause") return pause;
      if (property === "remove" || property === "release") return remove;
      const value = Reflect.get(target, property, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
    set(target, property, value) { return Reflect.set(target, property, value, target); },
  });
}
