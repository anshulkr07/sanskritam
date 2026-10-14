// Friends: list, pending requests, invite by name search-lite (server-side
// learner id), the weekly cooperative goal, block/remove. No public chat —
// multiplayer communication is preset reactions only.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { socialApi, type PlaySummary } from "../games/v2/client";
import { color, fill, font, onFill, radius, space } from "../theme";
import { haptics } from "../services/haptics";

type Props = {
  navigation: { goBack: () => void; navigate: (r: string, p?: object) => void };
};

interface FriendsData {
  friends: { learner_id: string; name: string; alias: string }[];
  requests: { learner_id: string; name: string }[];
}

export default function FriendsScreen(_props: Props) {
  const [data, setData] = useState<FriendsData | null>(null);
  const [goal, setGoal] = useState<PlaySummary["friend_goal"]>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    socialApi.friends().then(setData).catch(() => setData({ friends: [], requests: [] }));
    socialApi.goal().then((g) => setGoal(g.goal)).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  const respond = async (id: string, accept: boolean) => {
    haptics.tap();
    try {
      await socialApi.respond(id, accept);
      load();
    } catch { setMsg("Couldn't respond. Try again."); }
  };

  const remove = (id: string, name: string) => {
    Alert.alert(`Remove ${name}?`, "You can send a new friend request later.", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => void socialApi.remove(id).then(load) },
    ]);
  };

  const block = (id: string, name: string) => {
    Alert.alert(`Block ${name}?`, "They will not see you in play, and the friendship ends.", [
      { text: "Cancel", style: "cancel" },
      { text: "Block", style: "destructive", onPress: () => void socialApi.block(id).then(load) },
    ]);
  };

  const joinGoal = (id: string, name: string) => {
    haptics.tap();
    void socialApi.joinGoal(id)
      .then(() => load())
      .catch(() => setMsg("Start a goal with an accepted friend."));
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* The stack header already says "Friends" with a back arrow. */}
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => _props.navigation.navigate("RoomLobby", { mode: "friends" })}
          accessibilityRole="button" accessibilityLabel="Play with friends"
          style={styles.goalCard}>
          <Text style={styles.goalHead}>Play with friends</Text>
          <Text style={styles.goalBody}>Create a room and share its code, or join your friend's room.</Text>
        </Pressable>
        {goal && (
          <View style={styles.goalCard}>
            <Text style={styles.goalHead}>Weekly goal with {goal.partner.name}</Text>
            <Text style={styles.goalBody}>
              {goal.total}/{goal.target} rounds together · you {goal.mine}, them {goal.partner_rounds}
            </Text>
            <Text style={styles.goalBody}>
              {goal.status === "completed" ? "Completed — the badge is yours." :
                `At least ${goal.min_each} rounds each · up to ${goal.max_per_day} a day count.`}
            </Text>
          </View>
        )}

        {!!data?.requests.length && (
          <>
            <Text style={styles.section}>Requests</Text>
            {data.requests.map((r) => (
              <View key={r.learner_id} style={styles.requestRow}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{initials(r.name)}</Text></View>
                <Text style={styles.name} numberOfLines={1}>{r.name}</Text>
                <Pressable onPress={() => void respond(r.learner_id, true)} accessibilityRole="button"
                  accessibilityLabel={`Accept ${r.name}`} style={styles.accept}>
                  <Ionicons name="checkmark" size={20} color={onFill.text} />
                </Pressable>
                <Pressable onPress={() => void respond(r.learner_id, false)} accessibilityRole="button"
                  accessibilityLabel={`Decline ${r.name}`} style={styles.decline}>
                  <Ionicons name="close" size={20} color={color.inkSoft} />
                </Pressable>
              </View>
            ))}
          </>
        )}

        <Text style={styles.section}>Friends</Text>
        {data && data.friends.length === 0 && (
          <Text style={styles.empty}>
            No friends yet. Invite someone from a match, or share a challenge from any result —
            opening your link brings them here.
          </Text>
        )}
        {(data?.friends ?? []).map((f) => (
          <View key={f.learner_id} style={styles.row}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{initials(f.alias || f.name)}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{f.alias || f.name}</Text>
              <Text style={styles.sub} numberOfLines={1}>{f.alias ? f.name : ""}</Text>
            </View>
            {!goal && (
              <Pressable onPress={() => joinGoal(f.learner_id, f.name)} accessibilityRole="button"
                accessibilityLabel={`Start the weekly goal with ${f.name}`} style={styles.goalBtn}>
                <Text style={styles.goalBtnText}>Weekly goal</Text>
              </Pressable>
            )}
            <Pressable onPress={() => remove(f.learner_id, f.name)} accessibilityRole="button"
              accessibilityLabel={`Remove ${f.name}`} style={styles.iconBtn}>
              <Ionicons name="person-remove-outline" size={18} color={color.inkSoft} />
            </Pressable>
            <Pressable onPress={() => block(f.learner_id, f.name)} accessibilityRole="button"
              accessibilityLabel={`Block ${f.name}`} style={styles.iconBtn}>
              <Ionicons name="ban-outline" size={18} color={color.inkSoft} />
            </Pressable>
          </View>
        ))}
        {!!msg && <Text style={styles.msg}>{msg}</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

function initials(name: string): string {
  return name.trim().split(/\s+/).map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase() || "S";
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  body: { padding: space.lg, gap: 8 },
  goalCard: { backgroundColor: fill.sage, borderRadius: radius.lg, padding: space.md, gap: 4 },
  goalHead: { color: onFill.text, fontWeight: "800", fontSize: font.sizes.base },
  goalBody: { color: onFill.soft, fontSize: font.sizes.sm },
  section: { fontWeight: "800", fontSize: 18, color: color.ink, marginTop: space.sm },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: color.border },
  requestRow: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: 10 },
  name: { flex: 1, fontWeight: "700", color: color.ink, fontSize: font.sizes.base },
  sub: { color: color.inkSoft, fontSize: font.sizes.xs },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: color.surfaceMuted, alignItems: "center", justifyContent: "center" },
  avatarText: { color: color.inkSoft, fontWeight: "800" },
  accept: { width: 44, height: 44, borderRadius: 22, backgroundColor: fill.sage, alignItems: "center", justifyContent: "center" },
  decline: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: color.border, alignItems: "center", justifyContent: "center" },
  goalBtn: { borderWidth: 1.5, borderColor: color.ink, borderRadius: radius.md, minHeight: 40, paddingHorizontal: space.sm, justifyContent: "center" },
  goalBtnText: { fontWeight: "700", fontSize: font.sizes.xs, color: color.ink },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  empty: { color: color.inkSoft, lineHeight: 22 },
  msg: { color: color.badText, fontSize: font.sizes.sm, textAlign: "center", marginTop: space.sm },
});
