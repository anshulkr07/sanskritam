// ChantPlayer: bottom bar for Chant mode.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { RepeatMode } from "../../recite/chantClock";
import { REPEAT_ORDER } from "../../recite/chantClock";
import { color } from "../../theme";

export type { RepeatMode };
export { REPEAT_ORDER };
const REPEAT_LABEL: Record<RepeatMode, string> = {
  off: "Repeat off",
  verse: "Repeat verse",
  chapter: "Repeat chapter",
};

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
  onListen,
  follow,
  onFollow,
  verseRef,
  position,
  focus,
  onFocus,
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
  /** Open the Listen screen. Absent on the Listen screen itself. */
  onListen?: () => void;
  follow: boolean;
  onFollow: () => void;
  /** "Yoga Sūtra 1.48" — the verse now playing, for the player bar. */
  verseRef?: string;
  /** "12 of 195" — where it sits in the chapter. */
  position?: string;
  /** Focused previous/current/next view instead of the whole chapter list. */
  focus?: boolean;
  onFocus?: () => void;
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
      {!!(verseRef || position) && (
        <View style={styles.nowRow}>
          <Text style={styles.now} numberOfLines={1}>
            {[verseRef, position].filter(Boolean).join(" · ")}
          </Text>
          {!!onFocus && (
            <Pressable
              onPress={onFocus}
              accessibilityRole="switch"
              accessibilityState={{ checked: !!focus }}
              accessibilityLabel="Focused previous, current and next verses"
              style={styles.focusBtn}
            >
              <Text style={[styles.focusText, focus && styles.focusTextOn]}>
                {focus ? "Focused" : "Focus"}
              </Text>
            </Pressable>
          )}
        </View>
      )}
      <View style={styles.row}>
        {btn("Previous verse", "play-skip-back", onPrev)}
        {btn(playing ? "Pause" : "Play", playing ? "pause" : "play", onToggle)}
        {btn("Next verse", "play-skip-forward", onNext)}
        {btn(REPEAT_LABEL[repeat], "repeat", onRepeat, repeat !== "off")}
        <Pressable
          onPress={onSpeed}
          accessibilityRole="button"
          accessibilityLabel={`Speed ${speed} times`}
          style={styles.speed}
        >
          <Text style={styles.speedText}>{speed}x</Text>
        </Pressable>
        {btn("Learn this verse", "school", onLearn)}
        {onListen && btn("Open Listen", "headphones", onListen)}
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
  now: { fontSize: 13, fontWeight: "700", color: color.ink, flex: 1 },
  nowRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  focusBtn: { minHeight: 32, justifyContent: "center", paddingHorizontal: 8 },
  focusText: { fontSize: 12, fontWeight: "700", color: color.inkSoft },
  focusTextOn: { color: color.ink },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  btn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22 },
  speed: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  speedText: { fontWeight: "800", color: color.ink },
  follow: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  followText: { fontWeight: "800", color: color.ink },
  credit: { fontSize: 12, color: color.inkSoft },
});
