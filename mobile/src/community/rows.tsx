// Group's list rows: a conversation, a circle, a learner, and a live room.
// Rows sit on the paper with a hairline between them; only a live room is a
// deep card, because it is happening now.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import PaintedBackground from "../components/artwork/PaintedBackground";
import { hubArtwork } from "../components/artwork/hubs";
import { fill } from "../theme";
import { haptics } from "../services/haptics";
import { levelShort, type Conversation, type Person, type Room } from "./api";
import { CREAM, CREAM_SOFT, GOLD, T, shortTime, ui } from "./look";
import { Avatar, Badge, Btn, CircleMark } from "./parts";

function preview(c: Conversation): string {
  if (!c.last_text) return c.kind === "group" ? "No messages yet. Say नमस्ते." : "Say नमस्ते to start.";
  if (c.last_sender === "You") return `You: ${c.last_text}`;
  if (c.kind === "group" && c.last_sender) return `${c.last_sender}: ${c.last_text}`;
  return c.last_text;
}

export function ConversationRow({ c, meId, onPress }: { c: Conversation; meId?: string; onPress: () => void }) {
  const peer = c.kind === "direct" ? c.members.find((m) => m.id !== meId) : undefined;
  const unread = c.unread > 0;
  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${c.name}${c.kind === "group" ? ", circle" : ""}. ${unread ? `${c.unread} new. ` : ""}${preview(c)}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {c.kind === "group" ? (
        <CircleMark id={c.id} name={c.name} size={48} />
      ) : (
        <Avatar id={peer?.id ?? c.id} name={c.name} size={48} online={peer?.online} />
      )}
      <View style={styles.main}>
        <View style={styles.line}>
          <Text style={[styles.name, unread && styles.nameUnread]} numberOfLines={1}>
            {c.name}
          </Text>
          <Text style={[styles.time, unread && { color: T.action }]}>{shortTime(c.updated_at)}</Text>
        </View>
        <View style={styles.line}>
          {c.call_id ? <Ionicons name="call" size={14} color={T.done} /> : null}
          <Text style={[styles.preview, unread && styles.previewUnread]} numberOfLines={1}>
            {c.call_id ? "Audio call on now" : preview(c)}
          </Text>
          <Badge n={c.unread} />
        </View>
      </View>
    </Pressable>
  );
}

export function circleMeta(c: Conversation): string {
  const n = c.member_count;
  return [
    `${n} ${n === 1 ? "learner" : "learners"}`,
    levelShort[c.level] ?? "All levels",
    c.public ? "Open" : "Invite only",
  ].join(" · ");
}

export function CircleRow({
  c,
  onPress,
  right,
}: {
  c: Conversation;
  onPress: () => void;
  right?: React.ReactNode;
}) {
  // The row and its own button are siblings, so a screen reader reaches both.
  return (
    <View style={[styles.row, styles.rowTop]}>
      <Pressable
        onPress={() => {
          haptics.tap();
          onPress();
        }}
        accessibilityRole="button"
        accessibilityLabel={`${c.name}. ${circleMeta(c)}. ${c.topic}`}
        style={({ pressed }) => [styles.rowMain, styles.rowTop, pressed && styles.pressed]}
      >
        <CircleMark id={c.id} name={c.name} size={48} />
        <View style={styles.main}>
          <Text style={styles.name} numberOfLines={1}>
            {c.name}
          </Text>
          {c.topic ? (
            <Text style={styles.topic} numberOfLines={1}>
              {c.topic}
            </Text>
          ) : null}
          <Text style={styles.meta} numberOfLines={1}>
            {circleMeta(c)}
          </Text>
          {c.description ? (
            <Text style={styles.desc} numberOfLines={2}>
              {c.description}
            </Text>
          ) : null}
        </View>
        {right ? null : <Ionicons name="chevron-forward" size={18} color={T.ink3} style={{ alignSelf: "center" }} />}
      </Pressable>
      {right}
    </View>
  );
}

export function PersonRow({
  p,
  onPress,
  right,
  sub,
}: {
  p: Person;
  onPress: () => void;
  right?: React.ReactNode;
  sub?: string;
}) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => {
          haptics.tap();
          onPress();
        }}
        accessibilityRole="button"
        accessibilityLabel={`${p.name}. ${sub ?? levelShort[p.level] ?? ""}${p.online ? ". Online" : ""}`}
        style={({ pressed }) => [styles.rowMain, pressed && styles.pressed]}
      >
        <Avatar id={p.id} name={p.name} size={44} online={p.online} />
        <View style={styles.main}>
          <Text style={styles.name} numberOfLines={1}>
            {p.name}
            {p.role === "admin" ? <Text style={styles.admin}>{"  ADMIN"}</Text> : null}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {sub ?? [levelShort[p.level] ?? "Beginner", p.online ? "Online" : ""].filter(Boolean).join(" · ")}
          </Text>
          {p.bio && !sub ? (
            <Text style={styles.desc} numberOfLines={1}>
              {p.bio}
            </Text>
          ) : null}
        </View>
      </Pressable>
      {right}
    </View>
  );
}

/** A room happening now: deep fill, the reciting painting, one way in. */
export function RoomCard({
  r,
  onJoin,
  busy,
  mine,
}: {
  r: Room;
  onJoin: () => void;
  busy: boolean;
  mine: boolean;
}) {
  const count = r.participant_count;
  return (
    <View style={styles.room} accessible={false}>
      <PaintedBackground source={hubArtwork("play:recite")} banner denseText />
      <View style={styles.roomTop}>
        <View style={styles.roomLive}>
          <View style={styles.roomDot} />
          <Text style={styles.roomLiveText}>LIVE</Text>
        </View>
        <Text style={styles.roomLevel}>{levelShort[r.level] ?? "All levels"}</Text>
      </View>
      <Text style={styles.roomTitle} numberOfLines={2}>
        {r.title}
      </Text>
      {r.topic ? (
        <Text style={styles.roomTopic} numberOfLines={2}>
          {r.topic}
        </Text>
      ) : null}
      <View style={styles.roomFoot}>
        <Avatar id={r.host.id} name={r.host.name} size={30} />
        <Text style={styles.roomHost} numberOfLines={1}>
          {mine ? "You are hosting" : `Hosted by ${r.host.name}`}
          {count !== undefined ? ` · ${count} in the room` : ""}
        </Text>
      </View>
      <Btn
        label={mine ? "Back to your room" : "Listen in"}
        icon={mine ? "radio" : "headset-outline"}
        kind="cream"
        onPress={onJoin}
        busy={busy}
        style={{ alignSelf: "flex-start", marginTop: 4 }}
        accessibilityLabel={`${mine ? "Back to your room" : "Listen in to"} ${r.title}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.line },
  rowMain: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 12 },
  rowTop: { alignItems: "flex-start" },
  pressed: { backgroundColor: T.surface },
  main: { flex: 1, minWidth: 0, gap: 2 },
  line: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { ...ui("semibold"), flex: 1, fontSize: 16, lineHeight: 22, color: T.ink },
  nameUnread: { ...ui("bold") },
  time: { ...ui("regular"), fontSize: 12.5, color: T.ink3 },
  preview: { ...ui("regular"), flex: 1, fontSize: 14, lineHeight: 20, color: T.ink3 },
  previewUnread: { ...ui("medium"), color: T.ink },
  topic: { ...ui("medium"), fontSize: 14, lineHeight: 20, color: T.ink2 },
  meta: { ...ui("regular"), fontSize: 13, lineHeight: 18, color: T.ink3 },
  desc: { ...ui("regular"), fontSize: 14, lineHeight: 20, color: T.ink2, marginTop: 2 },
  admin: { ...ui("bold"), fontSize: 11, letterSpacing: 1, color: T.action },
  room: { backgroundColor: fill.maroon, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16, gap: 6, overflow: "hidden" },
  roomTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  roomLive: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 7, height: 24, backgroundColor: T.wrong },
  roomDot: { width: 7, height: 7, backgroundColor: CREAM },
  roomLiveText: { ...ui("bold"), fontSize: 11.5, letterSpacing: 1.3, color: CREAM },
  roomLevel: { ...ui("bold"), fontSize: 12, letterSpacing: 0.6, color: GOLD },
  roomTitle: { ...ui("bold"), fontSize: 20, lineHeight: 26, color: CREAM, maxWidth: "78%" },
  roomTopic: { ...ui("regular"), fontSize: 14.5, lineHeight: 21, color: CREAM_SOFT, maxWidth: "78%" },
  roomFoot: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  roomHost: { ...ui("medium"), flexShrink: 1, fontSize: 13.5, color: CREAM },
});
