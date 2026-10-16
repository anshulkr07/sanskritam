// MiniPlayer — the floating chant bar on the Read shelf.
//
// A remote for the app-wide chant session (listenBus): whatever started it —
// the Listen screen or Book's Chant mode — keeps playing here. Play/pause,
// previous and next work in place; tapping the bar opens the full player at
// the verse it's on. ✕ hides the bar for this session only; the chant
// continues, and a different session brings the bar back.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useSyncExternalStore } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { audioTransport } from "../../services/audioTransport";

import { haptics } from "../../services/haptics";
import { listenBus, useListenBus } from "../../services/listenBus";
import { color, shadow } from "../../theme";
import { plain } from "../../utils/text";

export default function MiniPlayer({
  onOpen,
  floating = false,
  style,
}: {
  onOpen: (bookKey: string, chapter: string | null, index: number) => void;
  floating?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bus = useListenBus();
  const audio = useSyncExternalStore(audioTransport.subscribe, audioTransport.getSnapshot);
  const session = bus.session;
  if (floating ? audio?.kind !== "audiobook" : !!audio) return null;
  if (!session || session.pages.length === 0 || bus.miniHiddenFor === session.id) return null;

  const cur =
    session.pages.find((p) => p.id === bus.playingId) ?? session.pages[bus.at] ?? session.pages[0];
  const open = () => {
    if (!session.bookKey) return;
    haptics.tap();
    onOpen(session.bookKey, session.chapter, bus.at);
  };

  return (
    <View style={[styles.bar, style]}>
      <Pressable
        onPress={open}
        disabled={!session.bookKey}
        style={styles.meta}
        accessibilityRole="button"
        accessibilityLabel={`Open the player, ${plain(session.title)}, ${cur?.source_ref ?? ""}`}
      >
        <View style={styles.eq}>
          <View style={[styles.eqBar, styles.eqA]} />
          <View style={[styles.eqBar, styles.eqB, !bus.isPlaying && styles.eqStill]} />
          <View style={[styles.eqBar, styles.eqC, !bus.isPlaying && styles.eqStill]} />
        </View>
        <View style={styles.text}>
          <Text style={styles.title} numberOfLines={1}>
            {plain(session.title)}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {cur?.source_ref ?? ""}
            {session.pages.length ? ` · verse ${bus.at + 1} of ${session.pages.length}` : ""}
          </Text>
        </View>
      </Pressable>
      <Pressable
        onPress={() => {
          haptics.tap();
          listenBus.step(-1);
        }}
        style={styles.btn}
        accessibilityRole="button"
        accessibilityLabel="Previous verse"
      >
        <Ionicons name="play-skip-back" size={16} color={color.white} />
      </Pressable>
      <Pressable
        onPress={() => {
          haptics.tap();
          listenBus.toggle();
        }}
        style={styles.play}
        accessibilityRole="button"
        accessibilityLabel={bus.isPlaying ? "Pause" : "Play"}
      >
        <Ionicons name={bus.isPlaying ? "pause" : "play"} size={18} color={color.white} />
      </Pressable>
      <Pressable
        onPress={() => {
          haptics.tap();
          listenBus.step(1);
        }}
        style={styles.btn}
        accessibilityRole="button"
        accessibilityLabel="Next verse"
      >
        <Ionicons name="play-skip-forward" size={16} color={color.white} />
      </Pressable>
      <Pressable
        onPress={() => {
          haptics.tap();
          listenBus.dismissMini();
        }}
        style={styles.close}
        accessibilityRole="button"
        accessibilityLabel="Hide the mini player"
      >
        <Ionicons name="close" size={16} color="rgba(255,248,238,0.7)" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: color.ink,
    borderRadius: 16,
    paddingLeft: 12,
    paddingRight: 2,
    paddingVertical: 6,
    ...shadow.card,
  },
  meta: { flex: 1, flexDirection: "row", alignItems: "center", minWidth: 0 },
  eq: { flexDirection: "row", alignItems: "flex-end", gap: 2, height: 18, marginRight: 10 },
  eqBar: { width: 3, borderRadius: 2, backgroundColor: "#F2C879" },
  eqA: { height: 9 },
  eqB: { height: 16 },
  eqC: { height: 12 },
  eqStill: { opacity: 0.45 },
  text: { flex: 1, minWidth: 0 },
  title: { color: "#FFF8EE", fontWeight: "800", fontSize: 13 },
  sub: { color: "rgba(255,248,238,0.6)", fontWeight: "600", fontSize: 11, marginTop: 1 },
  btn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  play: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.saffronBtn,
  },
  close: { width: 34, height: 40, alignItems: "center", justifyContent: "center" },
});
