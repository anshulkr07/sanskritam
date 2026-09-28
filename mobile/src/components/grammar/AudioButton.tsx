// AudioButton — plays one pre-rendered clip of a Sanskrit string.
//
// Renders nothing without a URL (§2.11: never a dead button), never falls back
// to live synthesis (services/speech.playClip), and only one clip plays at a
// time: starting a clip stops whichever button was playing before.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React from "react";
import { Pressable, StyleSheet } from "react-native";

import { haptics } from "../../services/haptics";
import { playClip, type SpeakHandle } from "../../services/speech";
import { color } from "../../theme";

let stopActive: (() => void) | null = null;

export default function AudioButton({ url, label }: { url?: string; label: string }) {
  const [playing, setPlaying] = React.useState(false);
  const handle = React.useRef<SpeakHandle | null>(null);
  const mounted = React.useRef(true);

  const stop = React.useCallback(() => {
    handle.current?.stop().catch(() => {});
    handle.current = null;
    if (stopActive === stop) stopActive = null;
    if (mounted.current) setPlaying(false);
  }, []);

  React.useEffect(
    () => () => {
      mounted.current = false;
      if (handle.current) stop();
    },
    [stop],
  );

  if (!url) return null;

  const onPress = async () => {
    haptics.tap();
    if (playing) {
      stop();
      return;
    }
    stopActive?.();
    stopActive = stop;
    setPlaying(true);
    try {
      handle.current = await playClip(url, () => {
        handle.current = null;
        if (stopActive === stop) stopActive = null;
        if (mounted.current) setPlaying(false);
      });
      if (!handle.current && mounted.current) setPlaying(false);
    } catch {
      if (mounted.current) setPlaying(false);
    }
  };

  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={playing ? `Stop ${label}` : `Listen: ${label}`}
      accessibilityState={{ selected: playing }}
    >
      <Ionicons name={playing ? "stop-circle" : "volume-medium-outline"} size={20} color={color.saffron} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  pressed: { backgroundColor: color.saffronLight },
});
