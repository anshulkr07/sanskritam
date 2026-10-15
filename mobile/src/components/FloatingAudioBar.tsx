import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useEffect, useState, useSyncExternalStore } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { audioTransport } from "../services/audioTransport";
import { color } from "../theme";

// A screen with its own controls where the bar would sit (Group chat's
// composer) pins the bar just under its top chrome instead: `below` is where
// that chrome ends, from the top of the screen. The owner token keeps a
// screen that is leaving from unpinning the one that replaced it.
let pin: { owner: object; below: number } | null = null;
const pinListeners = new Set<() => void>();
const emitPin = () => pinListeners.forEach(listener => listener());
const subscribePin = (listener: () => void) => { pinListeners.add(listener); return () => { pinListeners.delete(listener); }; };
const pinnedBelow = () => pin?.below ?? null;

/** Pins the bar under the screen's top chrome while `below` is set; null releases it. */
export function usePinAudioBarBelow(below: number | null) {
  const [owner] = useState(() => ({}));
  useEffect(() => {
    if (below == null) return;
    pin = { owner, below };
    emitPin();
    return () => {
      if (pin?.owner !== owner) return;
      pin = null;
      emitPin();
    };
  }, [owner, below]);
}

export default function FloatingAudioBar({ inTabs = false, atTop = false }: { inTabs?: boolean; atTop?: boolean }) {
  const audio = useSyncExternalStore(audioTransport.subscribe, audioTransport.getSnapshot);
  const below = useSyncExternalStore(subscribePin, pinnedBelow);
  const insets = useSafeAreaInsets();
  if (!audio) return null;
  const bottom = Math.max(insets.bottom, 8) + (inTabs ? 64 : 12);
  const place = atTop ? { top: insets.top + 52 } : below != null ? { top: below + 8 } : { bottom };
  return <View pointerEvents="box-none" style={[styles.anchor, place]}>
    <View style={[styles.bar, audio.minimized && styles.compact]}>
      <Pressable onPress={() => audioTransport.toggle()} accessibilityRole="button"
        accessibilityLabel={audio.playing ? "Pause audio" : "Resume audio"} style={styles.button}>
        <Ionicons name={audio.playing ? "pause" : "play"} size={23} color="#FFF8EE" />
      </Pressable>
      {!audio.minimized && <View style={styles.label}>
        <Text numberOfLines={1} style={styles.title}>{audio.title}</Text>
        <Text style={styles.status}>{audio.playing ? "Playing" : "Paused"}{audio.duration > 0 ? ` · ${audio.position}s / ${audio.duration}s` : ""}</Text>
      </View>}
      <Pressable onPress={() => audio.minimized ? audioTransport.expand() : audioTransport.minimize()}
        accessibilityRole="button" accessibilityLabel={audio.minimized ? "Expand audio player" : "Minimize audio player"} style={styles.button}>
        <Ionicons name={audio.minimized ? "chevron-back" : "chevron-forward"} size={20} color="#FFF8EE" />
      </Pressable>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  anchor: { position: "absolute", left: 16, right: 16, alignItems: "flex-end", zIndex: 100 },
  bar: { backgroundColor: "#293C35", borderRadius: 18, flexDirection: "row", alignItems: "center", width: "100%", padding: 4, borderWidth: 1, borderColor: color.border },
  compact: { width: 100 },
  button: { width: 44, height: 48, alignItems: "center", justifyContent: "center" },
  label: { flex: 1, paddingHorizontal: 6 },
  title: { color: "#FFF8EE", fontFamily: "Nunito_700Bold", fontSize: 14 },
  status: { color: "#E3EADF", fontFamily: "Nunito_400Regular", fontSize: 12 },
});
