// MiniPlayer — the floating chant bar on the Read shelves.
//
// A remote for the app-wide chant session (listenBus): whatever started it —
// the Listen screen or Book's Chant mode — keeps playing here. Play/pause and
// next work in place; tapping the bar opens the full player at the verse it's
// on. ✕ hides the bar for this session only; the chant continues, and a
// different session brings the bar back. Square, ink, with the verse's
// progress as a line along its top edge.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useSyncExternalStore } from "react";
import { audioTransport } from "../../services/audioTransport";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { COVER_COLOURS } from "../book/covers";
import AlbumArt from "../book/AlbumArt";
import { haptics } from "../../services/haptics";
import { listenBus, useListenBus } from "../../services/listenBus";
import { addressOf } from "../../read/audio";
import { CREAM, GOLD, ui } from "../../read/look";
import { shadow } from "../../theme";
import { shelfTitle } from "../../read/shelves";

const INK = "#2A2019";

export default function MiniPlayer({
  onOpen,
}: {
  onOpen: (bookKey: string, chapter: string | null, index: number) => void;
}) {
  const bus = useListenBus();
  const audio = useSyncExternalStore(audioTransport.subscribe, audioTransport.getSnapshot);
  const session = bus.session;
  if (audio || !session || session.pages.length === 0 || bus.miniHiddenFor === session.id) return null;

  const cur =
    session.pages.find((p) => p.id === bus.playingId) ?? session.pages[bus.at] ?? session.pages[0];
  const dur = bus.durMs || cur?.chant?.duration_ms || 0;
  const frac = dur > 0 && bus.playingId === cur?.id ? Math.min(1, bus.posMs / dur) : 0;
  const title = shelfTitle(session.title);
  const open = () => {
    if (!session.bookKey) return;
    haptics.tap();
    onOpen(session.bookKey, session.chapter, bus.at);
  };

  return (
    <View style={styles.bar}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${frac * 100}%` }]} />
      </View>
      <Pressable
        onPress={open}
        disabled={!session.bookKey}
        style={styles.meta}
        accessibilityRole="button"
        accessibilityLabel={`Open the player, ${title}, ${cur?.source_ref ?? ""}`}
      >
        {session.bookKey ? (
          <AlbumArt bookKey={session.bookKey} titleSa={COVER_COLOURS[session.bookKey]?.titleSa ?? title} size={42} />
        ) : (
          <View style={styles.thumb} />
        )}
        <View style={styles.text}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
            {cur ? ` · ${addressOf(cur)}` : ""}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {bus.isPlaying ? "Playing" : "Paused"}
          </Text>
        </View>
      </Pressable>
      <Pressable
        onPress={() => {
          haptics.tap();
          listenBus.toggle();
        }}
        style={styles.btn}
        accessibilityRole="button"
        accessibilityLabel={bus.isPlaying ? "Pause" : "Play"}
      >
        <Ionicons name={bus.isPlaying ? "pause" : "play"} size={22} color={CREAM} />
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
        <Ionicons name="play-skip-forward" size={18} color={CREAM} />
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
        <Ionicons name="close" size={16} color="rgba(255,248,238,0.82)" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 10,
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: INK,
    paddingLeft: 8,
    ...shadow.card,
  },
  track: { position: "absolute", left: 0, right: 0, top: 0, height: 2, backgroundColor: "rgba(255,248,238,0.18)" },
  fill: { height: 2, backgroundColor: GOLD },
  meta: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, minWidth: 0, minHeight: 60 },
  thumb: { width: 42, height: 42, backgroundColor: "#3B2E25" },
  text: { flex: 1, minWidth: 0 },
  title: { ...ui("semibold"), color: CREAM, fontSize: 14, lineHeight: 18 },
  sub: { ...ui("regular"), color: "rgba(255,248,238,0.82)", fontSize: 12, lineHeight: 16 },
  btn: { width: 44, height: 48, alignItems: "center", justifyContent: "center" },
  close: { width: 36, height: 48, alignItems: "center", justifyContent: "center" },
});
