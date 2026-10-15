// Group (सङ्घः): learning Sanskrit with other people. One page that answers
// "what do I do here?" in order:
//   1. New here: a welcome, then the learner card (level, a line, the rules).
//   2. Start here: three steps, ticked off from what the server says you have
//      done (card, a circle joined, a friend added or asked).
//   3. What is waiting: friend requests, calls on in your circles, live rooms.
//   4. Your chats (circles and friends together, newest first).
//   5. Circles to join and learners to meet, best matches for your level first.
// Everything else is one step away on its own screen: a chat, a circle's
// page, all circles, people, your card, and the forms for a new circle or
// room. Square corners and Learn's paper look throughout (src/community/).

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import PaintedBackground from "../components/artwork/PaintedBackground";
import { unitArtwork } from "../components/path/artwork";
import {
  friendly,
  get,
  needsCard,
  post,
  type CallInfo,
  type Conversation,
  type Friends,
  type MyProfile,
  type Person,
  type Room,
} from "../community/api";
import { useCommunity } from "../community/CommunityProvider";
import { CREAM, CREAM_SOFT, GOLD, T, flags, sa, ui } from "../community/look";
import {
  Avatar,
  Btn,
  Empty,
  IconBtn,
  Notice,
  Overline,
  SectionHead,
  Sheet,
  SheetRow,
} from "../community/parts";
import { CircleRow, ConversationRow, PersonRow, RoomCard } from "../community/rows";
import { PersonSheet, RulesSheet } from "../community/sheets";
import { useLoad } from "../community/useLoad";
import type { TabScreenProps } from "../navigation/types";
import { NumBox } from "../read/ui";
import { fill } from "../theme";
import { Medallion, Segments } from "../trail/ui";
import { useAuth } from "../store/auth";

interface Hub {
  me: MyProfile | null;
  convs: Conversation[];
  discover: Conversation[];
  rooms: Room[];
  friends: Friends;
  learners: Person[];
  partial: string;
}

const NO_FRIENDS: Friends = { friends: [], incoming: [], outgoing: [] };

async function loadHub(): Promise<Hub> {
  const r = await Promise.allSettled([
    get<MyProfile>("/profile"),
    get<Conversation[]>("/conversations"),
    get<Conversation[]>("/conversations?discover=true&limit=24"),
    get<Room[]>("/rooms"),
    get<Friends>("/friends"),
    get<Person[]>("/learners?limit=16"),
  ]);
  const failed = r.find((x): x is PromiseRejectedResult => x.status === "rejected");
  if (failed && r.every((x) => x.status === "rejected")) throw failed.reason;
  const ok = <V,>(x: PromiseSettledResult<V>, fallback: V): V => (x.status === "fulfilled" ? x.value : fallback);
  return {
    me: ok(r[0] as PromiseSettledResult<MyProfile | null>, null),
    convs: ok(r[1] as PromiseSettledResult<Conversation[]>, []),
    discover: ok(r[2] as PromiseSettledResult<Conversation[]>, []),
    rooms: ok(r[3] as PromiseSettledResult<Room[]>, []),
    friends: ok(r[4] as PromiseSettledResult<Friends>, NO_FRIENDS),
    learners: ok(r[5] as PromiseSettledResult<Person[]>, []),
    partial: failed ? friendly(failed.reason, "Part of Group did not load. Pull down to try again.") : "",
  };
}

export default function GroupScreen({ navigation }: TabScreenProps<"Group">) {
  const { learner } = useAuth();
  const community = useCommunity();
  const hub = useLoad(loadHub, []);
  const [welcomeSkipped, setWelcomeSkipped] = useState<boolean | null>(null);
  const [pathHidden, setPathHidden] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [person, setPerson] = useState<Person | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let alive = true;
    void Promise.all([flags.get(learner?.id, "welcome"), flags.get(learner?.id, "path")]).then(([w, p]) => {
      if (!alive) return;
      setWelcomeSkipped(w);
      setPathHidden(p);
    });
    return () => {
      alive = false;
    };
  }, [learner?.id]);

  const data = hub.data;
  const me = data?.me ?? null;
  const card = me ? me.card : community.status.card;
  const audio = community.status.audio_enabled;
  const nav = navigation as unknown as { navigate: (route: string, params?: object) => void };

  /** Send a learner without a card to make one; true when that happened. */
  const needCard = () => {
    if (card) return false;
    nav.navigate("GroupCard", { first: true });
    return true;
  };

  const act = (key: string, fn: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(key);
    setError("");
    fn()
      .then(() => community.refresh().catch(() => {}))
      .catch((e) => {
        if (needsCard(e)) nav.navigate("GroupCard", { first: true });
        else setError(friendly(e));
      })
      .finally(() => setBusy(null));
  };

  const joinRoom = (r: Room) => {
    if (needCard()) return;
    act(`room:${r.id}`, () =>
      community.join({ id: r.id, title: r.title, kind: "audio_room", host_id: r.host.id }),
    );
  };
  const joinCall = (c: Conversation) =>
    act(`call:${c.id}`, async () => {
      const info = await post<CallInfo>(`/conversations/${c.id}/call`);
      await community.join(info);
    });
  const answer = (p: Person, accept: boolean) =>
    act(`req:${p.id}`, async () => {
      const r = await post<Conversation | { ok: boolean }>("/friends", {
        user_id: p.id,
        action: accept ? "accept" : "decline",
      });
      if (accept && "id" in r) nav.navigate("GroupChat", { id: r.id });
    });
  const addFriend = (p: Person) => {
    if (needCard()) return;
    act(`add:${p.id}`, () => post("/friends", { user_id: p.id, action: "request" }));
  };

  const steps = useMemo(() => {
    const inCircle = (data?.convs ?? []).some((c) => c.kind === "group");
    const hasFriend = (data?.friends.friends.length ?? 0) + (data?.friends.outgoing.length ?? 0) > 0;
    return [
      {
        key: "card",
        done: !!me?.card,
        title: "Make your learner card",
        text: "Your level and a line about you, so others know where you are.",
        cta: "Make my card",
        go: () => nav.navigate("GroupCard", { first: !me?.card }),
      },
      {
        key: "circle",
        done: inCircle,
        title: "Join a study circle",
        text: "Read a text or practise a topic with learners at your level.",
        cta: "Find a circle",
        go: () => nav.navigate("GroupCircles"),
      },
      {
        key: "friend",
        done: hasFriend,
        title: "Add a friend",
        text: "Chat one to one, swap voice notes, and practise speaking on a call.",
        cta: "Find learners",
        go: () => nav.navigate("GroupPeople"),
      },
    ];
    // nav is stable for this screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, me?.card]);
  const doneCount = steps.filter((s) => s.done).length;
  const showWelcome = !!data && !!me && !me.card && welcomeSkipped === false;
  const showPath = !!data && !!me && !showWelcome && doneCount < steps.length && !pathHidden;

  const myLevel = me?.level ?? "beginner";
  const toJoin = useMemo(() => {
    const score = (c: Conversation) => (c.level === myLevel ? 2000 : c.level === "all" ? 1000 : 0) + c.member_count;
    return (data?.discover ?? []).filter((c) => !c.joined).sort((a, b) => score(b) - score(a)).slice(0, 3);
  }, [data?.discover, myLevel]);
  const toMeet = useMemo(() => {
    const score = (p: Person) => (p.online ? 2000 : 0) + (p.level === myLevel ? 1000 : 0);
    return (data?.learners ?? [])
      .filter((p) => !p.friendship || p.friendship === "declined")
      .sort((a, b) => score(b) - score(a))
      .slice(0, 3);
  }, [data?.learners, myLevel]);
  const calls = (data?.convs ?? []).filter((c) => c.kind === "group" && c.call_id && community.active?.id !== c.call_id);
  const requests = data?.friends.incoming ?? [];
  const chats = data?.convs ?? [];

  const refresh = () => {
    setRefreshing(true);
    void Promise.all([hub.reload(), community.refresh().catch(() => {})]).finally(() => setRefreshing(false));
  };

  return (
    <SafeAreaView style={styles.page} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title} accessibilityRole="header">
            Group
          </Text>
          <Text style={[sa(20), styles.titleSa]}>सङ्घः</Text>
        </View>
        <IconBtn icon="add" label="Start something new" onPress={() => setNewOpen(true)} />
        <Pressable
          onPress={() => nav.navigate("GroupCard", { first: !card })}
          accessibilityRole="button"
          accessibilityLabel={card ? "Your learner card" : "Make your learner card"}
          hitSlop={6}
          style={styles.me}
        >
          <Avatar id={learner?.id ?? "me"} name={learner?.display_name || "You"} size={36} />
          {!card && !!data ? <View style={styles.meDot} /> : null}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={T.ink3} colors={[T.action]} />}
        showsVerticalScrollIndicator={false}
      >
        {hub.error && !data ? (
          <Empty icon="cloud-offline-outline" title="Group did not load" text={hub.error}>
            <Btn label="Try again" kind="outline" onPress={() => void hub.reload()} />
          </Empty>
        ) : null}
        {!data && !hub.error ? <Loading /> : null}
        {data?.partial ? <Notice text={data.partial} onRetry={() => void hub.reload()} style={styles.gap} /> : null}
        {error ? <Notice text={error} style={styles.gap} /> : null}

        {showWelcome ? (
          <Welcome
            onStart={() => nav.navigate("GroupCard", { first: true })}
            onSkip={() => {
              setWelcomeSkipped(true);
              void flags.set(learner?.id, "welcome");
            }}
            onRules={() => setRulesOpen(true)}
          />
        ) : null}

        {showPath ? (
          <View style={[styles.path, styles.gap]}>
            <View style={styles.pathHead}>
              <Overline text="Start here" color={T.action} />
              <Text style={styles.pathCount}>
                {doneCount} of {steps.length} done
              </Text>
              {doneCount > 0 ? (
                <Pressable
                  onPress={() => {
                    setPathHidden(true);
                    void flags.set(learner?.id, "path");
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Hide these steps"
                  hitSlop={10}
                >
                  <Text style={styles.pathHide}>Hide</Text>
                </Pressable>
              ) : null}
            </View>
            <View style={{ flexDirection: "row" }}>
              <Segments total={steps.length} filled={doneCount} color={T.action} />
            </View>
            {steps.map((s, i) => {
              const now = !s.done && steps.findIndex((x) => !x.done) === i;
              return (
                <View key={s.key} style={styles.step}>
                  <NumBox state={s.done ? "done" : now ? "now" : "ahead"} label={String(i + 1)} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.stepTitle, s.done && styles.stepDone]}>{s.title}</Text>
                    {!s.done ? <Text style={styles.stepText}>{s.text}</Text> : null}
                    {now ? (
                      <Btn label={s.cta} small onPress={s.go} style={{ alignSelf: "flex-start", marginTop: 8 }} />
                    ) : !s.done ? (
                      <Pressable onPress={s.go} accessibilityRole="button" hitSlop={8} style={{ alignSelf: "flex-start" }}>
                        <Text style={styles.stepLink}>{s.cta}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        {requests.length > 0 ? (
          <View style={styles.section}>
            <SectionHead
              title={requests.length === 1 ? "A friend request" : `${requests.length} friend requests`}
              link={requests.length > 3 ? "See all" : undefined}
              onLink={() => nav.navigate("GroupPeople")}
            />
            {requests.slice(0, 3).map((p) => (
              <PersonRow
                key={p.id}
                p={p}
                sub={`Wants to learn with you · ${p.level === "acharya" ? "Ācārya" : p.level[0].toUpperCase() + p.level.slice(1)}`}
                onPress={() => setPerson({ ...p, friendship: "incoming" })}
                right={
                  <View style={styles.reqBtns}>
                    <Btn label="Accept" small busy={busy === `req:${p.id}`} onPress={() => answer(p, true)} />
                    <IconBtn icon="close" label={`Decline ${p.name}`} color={T.ink2} onPress={() => answer(p, false)} disabled={!!busy} />
                  </View>
                }
              />
            ))}
          </View>
        ) : null}

        {calls.map((c) => (
          <View key={c.id} style={[styles.callBar, styles.gap]}>
            <Ionicons name="call" size={20} color={CREAM} />
            <View style={{ flex: 1 }}>
              <Text style={styles.callTitle} numberOfLines={1}>
                Audio call on in {c.name}
              </Text>
              <Text style={styles.callSub}>Your mic starts off when you join.</Text>
            </View>
            <Btn label="Join" kind="cream" small busy={busy === `call:${c.id}`} onPress={() => joinCall(c)} />
          </View>
        ))}

        {data && data.rooms.length > 0 ? (
          <View style={styles.section}>
            <SectionHead
              title="Live now"
              link={audio ? "Start a room" : undefined}
              onLink={() => {
                if (!needCard()) nav.navigate("GroupNew", { kind: "room" });
              }}
            />
            <View style={{ gap: 10, marginTop: 4 }}>
              {data.rooms.map((r) => (
                <RoomCard
                  key={r.id}
                  r={r}
                  mine={r.host.id === learner?.id}
                  busy={busy === `room:${r.id}`}
                  onJoin={() => joinRoom(r)}
                />
              ))}
            </View>
          </View>
        ) : null}

        {data ? (
          <View style={styles.section}>
            <SectionHead
              title="Your chats"
              link={chats.some((c) => c.kind === "group") ? "All circles" : undefined}
              onLink={() => nav.navigate("GroupCircles")}
            />
            {chats.length ? (
              <View>
                {chats.map((c) => (
                  <ConversationRow
                    key={c.id}
                    c={c}
                    meId={learner?.id}
                    onPress={() => nav.navigate("GroupChat", { id: c.id })}
                  />
                ))}
              </View>
            ) : (
              <Text style={styles.quiet}>
                Circles you join and friends you chat with will be listed here, newest first.
              </Text>
            )}
          </View>
        ) : null}

        {toJoin.length > 0 ? (
          <View style={styles.section}>
            <SectionHead title="Circles to join" link="See all" onLink={() => nav.navigate("GroupCircles")} />
            {toJoin.map((c) => (
              <CircleRow key={c.id} c={c} onPress={() => nav.navigate("GroupInfo", { id: c.id })} />
            ))}
          </View>
        ) : data && !data.discover.some((c) => !c.joined) ? (
          <View style={styles.section}>
            <SectionHead title="Study circles" />
            <Text style={styles.quiet}>No open circle to join yet. Start one around the text you are reading.</Text>
            <Btn
              label="Start a circle"
              kind="outline"
              small
              icon="add"
              onPress={() => {
                if (!needCard()) nav.navigate("GroupNew", { kind: "circle" });
              }}
              style={{ alignSelf: "flex-start", marginTop: 10 }}
            />
          </View>
        ) : null}

        {toMeet.length > 0 ? (
          <View style={styles.section}>
            <SectionHead title="Learners to meet" link="See all" onLink={() => nav.navigate("GroupPeople")} />
            {toMeet.map((p) => (
              <PersonRow
                key={p.id}
                p={p}
                onPress={() => setPerson(p)}
                right={
                  <Btn
                    label="Add"
                    icon="person-add-outline"
                    kind="outline"
                    small
                    busy={busy === `add:${p.id}`}
                    onPress={() => addFriend(p)}
                    accessibilityLabel={`Add ${p.name} as a friend`}
                  />
                }
              />
            ))}
          </View>
        ) : null}

        {data && audio && data.rooms.length === 0 ? (
          <View style={[styles.quietCard, styles.section]}>
            <Ionicons name="radio-outline" size={22} color={T.ink2} />
            <View style={{ flex: 1 }}>
              <Text style={styles.quietTitle}>No live room right now</Text>
              <Text style={styles.quietText}>Start one. Others listen in with their mic off and raise a hand to speak.</Text>
            </View>
            <Btn
              label="Start"
              kind="outline"
              small
              onPress={() => {
                if (!needCard()) nav.navigate("GroupNew", { kind: "room" });
              }}
              accessibilityLabel="Start a live room"
            />
          </View>
        ) : null}

        {data ? (
          <Pressable
            onPress={() => nav.navigate("Friends")}
            accessibilityRole="button"
            accessibilityLabel="Weekly practice with a friend"
            style={({ pressed }) => [styles.weekly, styles.section, pressed && { opacity: 0.85 }]}
          >
            <Medallion art="hub:play:friends" size={48} />
            <View style={{ flex: 1 }}>
              <Text style={styles.quietTitle}>Weekly practice with a friend</Text>
              <Text style={styles.quietText}>Share a goal of 20 rounds in Play. It earns a badge, never rank.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={T.ink3} />
          </Pressable>
        ) : null}

        {data ? (
          <View style={styles.footer}>
            <Text style={styles.footerText}>Respect the learner. Make room for mistakes.</Text>
            <Btn label="Saṅgha rules" kind="quiet" small onPress={() => setRulesOpen(true)} />
          </View>
        ) : null}
      </ScrollView>

      <Sheet visible={newOpen} onClose={() => setNewOpen(false)} title="Start something">
        <SheetRow
          icon="people-outline"
          label="New study circle"
          detail="Read a text or practise a topic with others"
          onPress={() => {
            setNewOpen(false);
            if (!needCard()) nav.navigate("GroupNew", { kind: "circle" });
          }}
        />
        <SheetRow
          icon="radio-outline"
          label="Start a live room"
          detail={audio ? "Audio only. You host; others listen in and raise a hand." : "Live audio is not switched on yet."}
          disabled={!audio}
          onPress={() => {
            setNewOpen(false);
            if (!needCard()) nav.navigate("GroupNew", { kind: "room" });
          }}
        />
        <SheetRow
          icon="chatbubble-outline"
          label="Message a friend"
          detail="Pick one of your friends"
          onPress={() => {
            setNewOpen(false);
            nav.navigate("GroupPeople");
          }}
        />
        <SheetRow
          icon="search"
          label="Find a circle"
          detail="Open circles, by level and text"
          onPress={() => {
            setNewOpen(false);
            nav.navigate("GroupCircles");
          }}
        />
      </Sheet>
      <RulesSheet visible={rulesOpen} onClose={() => setRulesOpen(false)} />
      <PersonSheet
        person={person}
        onClose={() => {
          setPerson(null);
          void hub.reload();
        }}
        onMessage={(c) => nav.navigate("GroupChat", { id: c.id })}
        needCard={needCard}
      />
    </SafeAreaView>
  );
}

function Welcome({ onStart, onSkip, onRules }: { onStart: () => void; onSkip: () => void; onRules: () => void }) {
  return (
    <View style={styles.gap}>
      <View style={styles.hero}>
        <PaintedBackground source={unitArtwork("u5")} banner denseText />
        <Overline text="Learn together" color={GOLD} />
        <Text style={styles.heroTitle}>Learn Sanskrit with other learners</Text>
        <Text style={styles.heroText}>Study circles, friends to practise with, and rooms where Sanskrit is spoken aloud.</Text>
      </View>
      <View style={styles.features}>
        <Feature
          icon="people"
          tone={fill.teal}
          title="Study circles"
          text="A group around one text or topic, at your level. Ask, share, read together."
        />
        <Feature
          icon="chatbubbles"
          tone={fill.rose}
          title="Friends"
          text="Chat one to one, send voice notes, and call to practise speaking."
        />
        <Feature
          icon="radio"
          tone={fill.maroon}
          title="Live rooms"
          text="Listen in with your mic off. Raise your hand when you are ready to speak."
        />
      </View>
      <Text style={styles.welcomeNote}>
        First, a learner card: your level and a line about you. It takes a minute, and it is how others find you.
      </Text>
      <Btn label="Make my learner card" icon="id-card-outline" onPress={onStart} />
      <View style={styles.welcomeLinks}>
        <Btn label="Look around first" kind="quiet" small onPress={onSkip} />
        <Btn label="Saṅgha rules" kind="quiet" small onPress={onRules} />
      </View>
    </View>
  );
}

function Feature({ icon, tone, title, text }: { icon: "people" | "chatbubbles" | "radio"; tone: string; title: string; text: string }) {
  return (
    <View style={styles.feature}>
      <View style={[styles.featureIcon, { backgroundColor: tone }]}>
        <Ionicons name={icon} size={20} color={CREAM} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureText}>{text}</Text>
      </View>
    </View>
  );
}

function Loading() {
  return (
    <View style={{ gap: 12, marginTop: 8 }} accessibilityLabel="Loading Group">
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={styles.skeletonRow}>
          <View style={styles.skeletonMark} />
          <View style={{ flex: 1, gap: 8 }}>
            <View style={[styles.skeletonLine, { width: "55%" }]} />
            <View style={[styles.skeletonLine, { width: "80%" }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: T.paper },
  header: { flexDirection: "row", alignItems: "center", gap: 2, paddingLeft: 20, paddingRight: 12, paddingTop: 6, paddingBottom: 8 },
  titleRow: { flex: 1, flexDirection: "row", alignItems: "baseline", gap: 10 },
  title: { ...ui("bold"), fontSize: 30, lineHeight: 38, color: T.ink },
  titleSa: { color: T.ink3 },
  me: { marginLeft: 6 },
  meDot: { position: "absolute", top: -3, right: -3, width: 12, height: 12, backgroundColor: T.action, borderWidth: 2, borderColor: T.paper },
  body: { paddingHorizontal: 16, paddingBottom: 48 },
  gap: { marginTop: 12 },
  section: { marginTop: 26 },
  hero: { backgroundColor: fill.teal, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 20, minHeight: 196, justifyContent: "flex-end", gap: 6, overflow: "hidden" },
  heroTitle: { ...ui("bold"), fontSize: 25, lineHeight: 31, color: CREAM, maxWidth: "80%" },
  heroText: { ...ui("regular"), fontSize: 15, lineHeight: 22, color: CREAM_SOFT, maxWidth: "78%" },
  features: { marginTop: 16, gap: 14 },
  feature: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  featureIcon: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  featureTitle: { ...ui("semibold"), fontSize: 16, lineHeight: 22, color: T.ink },
  featureText: { ...ui("regular"), fontSize: 14.5, lineHeight: 21, color: T.ink2 },
  welcomeNote: { ...ui("regular"), fontSize: 14.5, lineHeight: 21, color: T.ink2, marginTop: 18, marginBottom: 12, paddingTop: 14, borderTopWidth: 1, borderTopColor: T.line },
  welcomeLinks: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  path: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.line, padding: 16, gap: 12 },
  pathHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  pathCount: { ...ui("regular"), flex: 1, fontSize: 13.5, color: T.ink3 },
  pathHide: { ...ui("semibold"), fontSize: 14, color: T.ink2 },
  step: { flexDirection: "row", gap: 12, alignItems: "flex-start", paddingTop: 4 },
  stepTitle: { ...ui("semibold"), fontSize: 16, lineHeight: 22, color: T.ink, marginTop: 5 },
  stepDone: { color: T.ink3 },
  stepText: { ...ui("regular"), fontSize: 14, lineHeight: 20, color: T.ink2 },
  stepLink: { ...ui("semibold"), fontSize: 14, color: T.action, marginTop: 4 },
  reqBtns: { flexDirection: "row", alignItems: "center", gap: 2 },
  callBar: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: fill.teal, paddingVertical: 12, paddingLeft: 14, paddingRight: 10 },
  callTitle: { ...ui("semibold"), fontSize: 15.5, lineHeight: 21, color: CREAM },
  callSub: { ...ui("regular"), fontSize: 13, lineHeight: 18, color: CREAM_SOFT },
  quiet: { ...ui("regular"), fontSize: 14.5, lineHeight: 21, color: T.ink3, marginTop: 6 },
  quietCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderWidth: 1, borderColor: T.line, borderStyle: "dashed" },
  quietTitle: { ...ui("semibold"), fontSize: 15.5, lineHeight: 21, color: T.ink },
  quietText: { ...ui("regular"), fontSize: 13.5, lineHeight: 19, color: T.ink2 },
  weekly: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, backgroundColor: T.surface, borderWidth: 1, borderColor: T.line },
  footer: { alignItems: "center", marginTop: 32, gap: 2 },
  footerText: { ...ui("regular"), fontSize: 13.5, color: T.ink3, textAlign: "center" },
  skeletonRow: { flexDirection: "row", gap: 12, alignItems: "center", paddingVertical: 8 },
  skeletonMark: { width: 48, height: 48, backgroundColor: T.line },
  skeletonLine: { height: 10, backgroundColor: T.line },
});
