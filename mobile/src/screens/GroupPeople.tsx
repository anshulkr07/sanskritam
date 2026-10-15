// People: friend requests waiting for you, your friends (tap to chat), the
// requests you sent, and learners to find by name and level. Only learners
// who made a learner card are listed.

import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  friendly,
  get,
  levelShort,
  levels,
  needsCard,
  post,
  type Conversation,
  type Friends,
  type Person,
} from "../community/api";
import { useCommunity } from "../community/CommunityProvider";
import { T, ui } from "../community/look";
import {
  Btn,
  Chips,
  Empty,
  IconBtn,
  Notice,
  ScreenHeader,
  SearchBox,
  SectionHead,
  groupStyles,
} from "../community/parts";
import { PersonRow } from "../community/rows";
import { PersonSheet } from "../community/sheets";
import { useLoad } from "../community/useLoad";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "GroupPeople">;

const LEVEL_CHIPS = levels.map((l) => ({ key: l as string, label: levelShort[l] }));

export default function GroupPeopleScreen({ navigation }: Props) {
  const community = useCommunity();
  const [query, setQuery] = useState("");
  const [typed, setTyped] = useState("");
  const [level, setLevel] = useState("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [person, setPerson] = useState<Person | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Search after a short pause, not on every key.
  useEffect(() => {
    const t = setTimeout(() => setQuery(typed.trim()), 300);
    return () => clearTimeout(t);
  }, [typed]);
  const friends = useLoad(() => get<Friends>("/friends"), []);
  const found = useLoad(
    () => get<Person[]>(`/learners?q=${encodeURIComponent(query)}&level=${level}&limit=60`),
    [query, level],
  );
  const card = community.ready ? community.status.card : true;
  const toCard = () => navigation.navigate("GroupCard", { first: true });

  const act = (key: string, p: Person, action: string, after?: (r: unknown) => void) => {
    if (busy) return;
    if (action === "request" && !card) return toCard();
    setBusy(key);
    setError("");
    post<unknown>("/friends", { user_id: p.id, action })
      .then((r) => {
        after?.(r);
        void friends.reload();
        void found.reload();
        void community.refresh().catch(() => {});
      })
      .catch((e) => {
        if (needsCard(e)) toCard();
        else setError(friendly(e));
      })
      .finally(() => setBusy(null));
  };
  const chat = (p: Person) => {
    if (busy) return;
    setBusy(`chat:${p.id}`);
    setError("");
    post<Conversation>("/direct", { user_id: p.id })
      .then((c) => navigation.navigate("GroupChat", { id: c.id, name: c.name }))
      .catch((e) => setError(friendly(e)))
      .finally(() => setBusy(null));
  };

  const f = friends.data;
  const strangers = (found.data ?? []).filter((p) => p.friendship !== "accepted");
  const filtering = !!query || level !== "all";

  return (
    <View style={groupStyles.page}>
      <ScreenHeader title="People" sub="Friends and learners to meet" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={groupStyles.body}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void Promise.all([friends.reload(), found.reload()]).finally(() => setRefreshing(false));
            }}
            colors={[T.action]}
          />
        }
      >
        {error ? <Notice text={error} style={{ marginTop: 12 }} /> : null}
        {friends.error ? <Notice text={friends.error} onRetry={() => void friends.reload()} style={{ marginTop: 12 }} /> : null}

        {f && f.incoming.length > 0 ? (
          <View style={styles.section}>
            <SectionHead title="Waiting for you" />
            {f.incoming.map((p) => (
              <PersonRow
                key={p.id}
                p={p}
                sub={`Wants to learn with you · ${levelShort[p.level]}`}
                onPress={() => setPerson({ ...p, friendship: "incoming" })}
                right={
                  <View style={styles.pair}>
                    <Btn
                      label="Accept"
                      small
                      busy={busy === `acc:${p.id}`}
                      onPress={() =>
                        act(`acc:${p.id}`, p, "accept", (r) => {
                          if (r && typeof r === "object" && "id" in r)
                            navigation.navigate("GroupChat", { id: (r as Conversation).id, name: p.name });
                        })
                      }
                    />
                    <IconBtn icon="close" label={`Decline ${p.name}`} color={T.ink2} disabled={!!busy} onPress={() => act(`dec:${p.id}`, p, "decline")} />
                  </View>
                }
              />
            ))}
          </View>
        ) : null}

        <View style={styles.section}>
          <SectionHead title={f?.friends.length ? `Friends · ${f.friends.length}` : "Friends"} />
          {f && f.friends.length ? (
            f.friends.map((p) => (
              <PersonRow
                key={p.id}
                p={p}
                onPress={() => chat(p)}
                right={
                  <IconBtn icon="chatbubble-outline" label={`Message ${p.name}`} color={T.action} disabled={!!busy} onPress={() => chat(p)} />
                }
              />
            ))
          ) : f ? (
            <Text style={styles.quiet}>No friends yet. Find a learner below and add them; you can chat once they accept.</Text>
          ) : null}
        </View>

        {f && f.outgoing.length > 0 ? (
          <View style={styles.section}>
            <SectionHead title="Requests you sent" />
            {f.outgoing.map((p) => (
              <PersonRow
                key={p.id}
                p={p}
                sub="Waiting for them to accept"
                onPress={() => setPerson({ ...p, friendship: "pending" })}
                right={
                  <Btn label="Cancel" kind="quiet" small busy={busy === `can:${p.id}`} onPress={() => act(`can:${p.id}`, p, "cancel")} />
                }
              />
            ))}
          </View>
        ) : null}

        <View style={styles.section}>
          <SectionHead title="Find learners" />
          <View style={styles.tools}>
            <SearchBox value={typed} onChange={setTyped} placeholder="Search learners by name" />
            <Chips options={LEVEL_CHIPS} value={level} onChange={setLevel} />
          </View>
          {found.error ? <Notice text={found.error} onRetry={() => void found.reload()} style={{ marginTop: 10 }} /> : null}
          {strangers.map((p) => (
            <PersonRow
              key={p.id}
              p={p}
              onPress={() => setPerson(p)}
              right={
                p.friendship === "pending" ? (
                  <Text style={styles.sent}>Requested</Text>
                ) : p.friendship === "incoming" ? (
                  <Btn label="Accept" small busy={busy === `acc:${p.id}`} onPress={() => act(`acc:${p.id}`, p, "accept")} />
                ) : (
                  <Btn
                    label="Add"
                    icon="person-add-outline"
                    kind="outline"
                    small
                    busy={busy === `add:${p.id}`}
                    onPress={() => act(`add:${p.id}`, p, "request")}
                    accessibilityLabel={`Add ${p.name} as a friend`}
                  />
                )
              }
            />
          ))}
          {found.data && !strangers.length ? (
            <Empty
              icon="search"
              title={filtering ? "Nobody matches" : "No one to show yet"}
              text={
                filtering
                  ? "Try another name or level."
                  : "Learners appear here once they make a learner card. Invite a friend who is learning too."
              }
            />
          ) : null}
        </View>
      </ScrollView>
      <PersonSheet
        person={person}
        onClose={() => {
          setPerson(null);
          void friends.reload();
          void found.reload();
        }}
        onMessage={(c) => navigation.navigate("GroupChat", { id: c.id, name: c.name })}
        needCard={() => {
          if (card) return false;
          toCard();
          return true;
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 22 },
  tools: { gap: 10, marginTop: 6, marginBottom: 4 },
  pair: { flexDirection: "row", alignItems: "center", gap: 2 },
  quiet: { ...ui("regular"), fontSize: 14.5, lineHeight: 21, color: T.ink3, marginTop: 6 },
  sent: { ...ui("semibold"), fontSize: 13.5, color: T.ink3 },
});
