// ChantPlayer: bottom bar for Chant mode.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { color } from "../../theme";

export type RepeatMode = "off" | "verse";

export default function ChantPlayer({
  onPrev,
  onToggle,
  playing,
  onNext,
  repeat,
  onRepeat,
  speed,
  onSpeed,
  onLearn,
  follow,
  onFollow,
}: {
  onPrev: () => void;
  onToggle: () => void;
  playing: boolean;
  onNext: () => void;
  repeat: RepeatMode;
  onRepeat: () => void;
  speed: number;
  onSpeed: () => void;
  onLearn: () => void;
  follow: boolean;
  onFollow: () => void;
}) {
  const btn = (label: string, icon: string, fn: () => void, active = false) => (
    <Pressable
      onPress={fn}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={[styles.btn, active && { backgroundColor: color.ink }]}
    >
      <Ionicons name={icon as never} size={20} color={active ? "#FFF8EE" : color.ink} />
    </Pressable>
  );
  return (
    <View style={styles.bar}>
      <View style={styles.row}>
        {btn("Previous verse", "play-skip-back", onPrev)}
        {btn(playing ? "Pause" : "Play", playing ? "pause" : "play", onToggle)}
        {btn("Next verse", "play-skip-forward", onNext)}
        {btn(`Repeat ${repeat}`, "repeat", onRepeat, repeat !== "off")}
        <Pressable
          onPress={onSpeed}
          accessibilityRole="button"
          accessibilityLabel={`Speed ${speed} times`}
          style={styles.speed}
        >
          <Text style={styles.speedText}>{speed}x</Text>
        </Pressable>
        {btn("Learn this verse", "school", onLearn)}
        {!follow && (
          <Pressable
            onPress={onFollow}
            accessibilityRole="button"
            accessibilityLabel="Follow the chant"
            style={styles.follow}
          >
            <Text style={styles.followText}>Follow</Text>
          </Pressable>
        )}
      </View>
      <Text style={styles.credit}>Chant: Vagdhenu, IISc</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderTopWidth: 1, borderTopColor: "#EFE3CE", paddingHorizontal: 16, paddingVertical: 8, gap: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  btn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22 },
  speed: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  speedText: { fontWeight: "800", color: color.ink },
  follow: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  followText: { fontWeight: "800", color: color.ink },
  credit: { fontSize: 12, color: color.inkSoft },
});
