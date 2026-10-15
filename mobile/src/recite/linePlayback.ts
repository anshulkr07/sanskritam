// linePlayback: play one chant line (a segment of a verse's audio).
// Shared by the daily card (Shloka) and Learn's listen step: create a
// throwaway expo-audio player, seek to the line, stop a beat after it ends.
// The caller owns stopping the previous segment (stop() the returned handle).

import { createManagedAudioPlayer } from "../services/managedAudio";

export interface ChantSegment {
  start_ms: number;
  end_ms: number;
}

export interface SegmentHandle {
  stop: () => void;
}

export async function playChantSegment(
  resolveUrl: (url: string) => Promise<string> | string,
  chantUrl: string,
  seg: ChantSegment,
  speed: number,
): Promise<SegmentHandle> {
  const url = await resolveUrl(chantUrl);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = createManagedAudioPlayer(url, undefined, "Recitation line") as any;
  await p.seekTo(seg.start_ms / 1000);
  try {
    p.setPlaybackRate?.(speed, "high");
  } catch {
    /* keep */
  }
  p.play();
  const stopAt = seg.end_ms + 150;
  let sub: { remove(): void } | null = null;
  try {
    sub = p.addListener("playbackStatusUpdate", (st: { isLoaded: boolean; currentTime: number }) => {
      if (st.isLoaded && st.currentTime * 1000 >= stopAt) {
        try {
          p.pause();
        } catch {
          /* gone */
        }
        try {
          sub?.remove();
        } catch {
          /* gone */
        }
      }
    });
  } catch {
    /* keep playing without the auto-stop */
  }
  return {
    stop: () => {
      try {
        sub?.remove();
      } catch {
        /* gone */
      }
      try {
        p.pause();
      } catch {
        /* gone */
      }
      try {
        p.remove?.();
      } catch {
        /* gone */
      }
      try {
        p.release?.();
      } catch {
        /* gone */
      }
    },
  };
}
