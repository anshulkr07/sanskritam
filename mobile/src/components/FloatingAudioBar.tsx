import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useSyncExternalStore } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { audioTransport } from "../services/audioTransport";
import { color } from "../theme";

export default function FloatingAudioBar({ inTabs = false, atTop = false }: { inTabs?: boolean; atTop?: boolean }) {
  const audio = useSyncExternalStore(audioTransport.subscribe, audioTransport.getSnapshot);
  const insets = useSafeAreaInsets();
  if (!audio) return null;
  const bottom = Math.max(insets.bottom, 8) + (inTabs ? 64 : 12);
  return <View pointerEvents="box-none" style={[styles.anchor, atTop ? { top: insets.top + 52 } : { bottom }]}>
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
