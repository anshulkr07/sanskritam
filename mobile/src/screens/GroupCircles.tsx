// Study circles: the ones you are in, then open circles to join, with a
// search and a level filter. Tapping an open circle shows its page first;
// joining is one button there.

import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { get, levelShort, levels, type Conversation, type MyProfile } from "../community/api";
import { useCommunity } from "../community/CommunityProvider";
import { T, ui } from "../community/look";
import { Badge, Btn, Chips, Empty, Notice, ScreenHeader, SearchBox, SectionHead, groupStyles } from "../community/parts";
import { CircleRow } from "../community/rows";
import { useLoad } from "../community/useLoad";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "GroupCircles">;

const LEVEL_CHIPS = levels.map((l) => ({ key: l as string, label: levelShort[l] }));

export default function GroupCirclesScreen({ navigation }: Props) {
  const community = useCommunity();
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const page = useLoad(async () => {
    const [mine, open, me] = await Promise.all([
      get<Conversation[]>("/conversations"),
      get<Conversation[]>("/conversations?discover=true"),
      get<MyProfile>("/profile").catch(() => null),
    ]);
    return { mine: mine.filter((c) => c.kind === "group"), open: open.filter((c) => !c.joined), me };
  }, []);

  const match = (c: Conversation) =>
    (level === "all" || c.level === level || c.level === "all") &&
    `${c.name} ${c.topic} ${c.description}`.toLowerCase().includes(query.trim().toLowerCase());
  const mine = useMemo(() => (page.data?.mine ?? []).filter(match), [page.data, query, level]); // eslint-disable-line react-hooks/exhaustive-deps
  const open = useMemo(() => {
    const myLevel = page.data?.me?.level;
    const score = (c: Conversation) => (c.level === myLevel ? 2000 : c.level === "all" ? 1000 : 0) + c.member_count;
    return (page.data?.open ?? []).filter(match).sort((a, b) => score(b) - score(a));
  }, [page.data, query, level]); // eslint-disable-line react-hooks/exhaustive-deps
  const card = page.data?.me ? page.data.me.card : community.status.card;
  const create = () =>
    card ? navigation.navigate("GroupNew", { kind: "circle" }) : navigation.navigate("GroupCard", { first: true });
  const filtering = !!query.trim() || level !== "all";

  return (
    <View style={groupStyles.page}>
      <ScreenHeader
        title="Study circles"
        sub="Learn with others around one text or topic"
        onBack={() => navigation.goBack()}
        right={<Btn label="New" icon="add" small onPress={create} style={{ marginRight: 8 }} accessibilityLabel="New study circle" />}
      />
      <ScrollView
        contentContainerStyle={groupStyles.body}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void page.reload().finally(() => setRefreshing(false));
            }}
            colors={[T.action]}
          />
        }
      >
        <View style={styles.tools}>
          <SearchBox value={query} onChange={setQuery} placeholder="Search by name, text or topic" />
          <Chips options={LEVEL_CHIPS} value={level} onChange={setLevel} />
        </View>
        {page.error ? <Notice text={page.error} onRetry={() => void page.reload()} style={{ marginTop: 12 }} /> : null}
        {!page.data && !page.error ? <Text style={styles.loading}>Loading circles…</Text> : null}

        {page.data && mine.length > 0 ? (
          <View style={styles.section}>
            <SectionHead title="Your circles" />
            {mine.map((c) => (
              <CircleRow
                key={c.id}
                c={c}
                onPress={() => navigation.navigate("GroupChat", { id: c.id, name: c.name })}
                right={c.unread > 0 ? <Badge n={c.unread} style={{ alignSelf: "center" }} /> : undefined}
              />
            ))}
          </View>
        ) : null}

        {page.data ? (
          <View style={styles.section}>
            <SectionHead title={filtering ? "Open circles that match" : "Open circles"} />
            {open.length ? (
              open.map((c) => (
                <CircleRow key={c.id} c={c} onPress={() => navigation.navigate("GroupInfo", { id: c.id, name: c.name })} />
              ))
            ) : (
              <Empty
                icon="people-outline"
                title={filtering ? "No circle matches" : "No open circle yet"}
                text={
                  filtering
                    ? "Try another word or level, or start the circle you are looking for."
                    : "Be the first: start a circle around the text you are reading, and others will find it here."
                }
              >
                <Btn label="Start a circle" icon="add" onPress={create} />
              </Empty>
            )}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tools: { gap: 10, marginTop: 12 },
  section: { marginTop: 22 },
  loading: { ...ui("regular"), fontSize: 14.5, color: T.ink3, marginTop: 20, textAlign: "center" },
});
