import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Modal,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
  Pressable,
  Switch,
} from "react-native";
import {
  useSafeAreaInsets,
  SafeAreaView,
} from "react-native-safe-area-context";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../store/auth";
import { color } from "../theme";
import {
  get,
  post,
  profile,
  Person,
  Conversation,
  Room,
  Message,
  Level,
  levels,
  levelLabels,
  CallInfo,
} from "../community/api";
import { Action, useCommunity } from "../community/CommunityProvider";
import { Composer, EphemeralMedia } from "../community/ChatMedia";
type Tab = "Rooms" | "Chats" | "Groups" | "Friends";
export default function GroupScreen() {
  const { learner } = useAuth();
  const community = useCommunity();
  const focused = useIsFocused();
  const [tab, setTab] = useState<Tab>("Rooms"),
    [query, setQuery] = useState(""),
    [level, setLevel] = useState("all");
  const [rooms, setRooms] = useState<Room[]>([]),
    [chats, setChats] = useState<Conversation[]>([]),
    [discovered, setDiscovered] = useState<Conversation[]>([]),
    [people, setPeople] = useState<Person[]>([]);
  const [friends, setFriends] = useState<{
    friends: Person[];
    incoming: Person[];
    outgoing: Person[];
  }>({ friends: [], incoming: [], outgoing: [] });
  const [chat, setChat] = useState<Conversation | null>(null),
    [modal, setModal] = useState<"room" | "group" | "profile" | null>(null),
    [invite, setInvite] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [discover, setDiscover] = useState(false);
  const [myLevel, setMyLevel] = useState<Level>("beginner"),
    [bio, setBio] = useState("");
  useEffect(() => {
    if (modal === "profile")
      void get<Person>("/profile")
        .then((p) => {
          setMyLevel(p.level);
          setBio(p.bio);
        })
        .catch(() => {});
  }, [modal]);
  const serial = useRef(0),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const load = useCallback(async () => {
    if (!focused) return;
    const current = ++serial.current;
    try {
      const [r, c, d, f, p] = await Promise.all([
        tab === "Rooms" ? get<Room[]>("/rooms") : Promise.resolve(null),
        chat || tab === "Chats" || tab === "Groups"
          ? get<Conversation[]>("/conversations")
          : Promise.resolve(null),
        tab === "Groups" && discover
          ? get<Conversation[]>("/conversations?discover=true")
          : Promise.resolve(null),
        tab === "Friends" || invite
          ? get<typeof friends>("/friends")
          : Promise.resolve(null),
        tab === "Friends"
          ? get<Person[]>(
              `/learners?q=${encodeURIComponent(query)}&level=${level}`,
            )
          : Promise.resolve(null),
      ]);
      if (current !== serial.current || !mounted.current) return;
      if (r) setRooms(r);
      if (c) setChats(c);
      if (d) setDiscovered(d);
      if (f) setFriends(f);
      if (p) setPeople(p);
      setError("");
      if (c)
        setChat((old) => (old ? c.find((x) => x.id === old.id) || null : null));
    } catch (e) {
      if (mounted.current)
        setError(
          e instanceof Error
            ? e.message
            : "Could not load Group. Pull to retry.",
        );
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [query, level, tab, discover, !!chat, !!invite, focused]);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 250);
    return () => clearTimeout(timer);
  }, [load, community.revision]);
  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {};
    }, [load]),
  );
  useEffect(() => {
    if (!chat) return;
    const h = BackHandler.addEventListener("hardwareBackPress", () => {
      setChat(null);
      return true;
    });
    return () => h.remove();
  }, [!!chat]);
  const run = (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    void fn()
      .catch((e) => setError(e.message || "That action failed. Try again."))
      .finally(() => {
        setBusy(false);
        void load();
        void community.refresh().catch(() => {});
      });
  };
  const openDirect = (p: Person) =>
    run(async () => {
      const c = await post<Conversation>("/direct", { user_id: p.id });
      setChat(c);
      setTab("Chats");
    });
  const friendAction = (p: Person, action: string) =>
    run(async () => {
      const c = await post<Conversation | { ok: boolean }>("/friends", {
        user_id: p.id,
        action,
      });
      if (action === "accept" && "id" in c) {
        setChat(c);
        setTab("Chats");
      }
    });
  const joinRoom = (r: Room) =>
    run(async () => {
      await community.join({
        id: r.id,
        title: r.title,
        kind: "audio_room",
        host_id: r.host.id,
      });
    });
  const callChat = (c: Conversation) =>
    run(async () => {
      const info = await post<CallInfo>(`/conversations/${c.id}/call`);
      await community.join(info);
    });
  if (chat)
    return (
      <ChatView
        key={chat.id}
        chat={chat}
        busy={busy}
        error={error}
        back={() => setChat(null)}
        call={() => callChat(chat)}
        invite={() => setInvite(chat)}
        refresh={load}
        footer={
          invite && (
            <InviteDialog
              group={invite}
              friends={friends.friends}
              close={() => setInvite(null)}
              onInvite={(p) =>
                run(async () => {
                  await post(`/groups/${invite.id}/invite`, { user_id: p.id });
                  setInvite(null);
                })
              }
            />
          )
        }
      />
    );
  const filteredRooms = rooms.filter(
    (r) =>
      (level === "all" || r.level === "all" || r.level === level) &&
      `${r.title} ${r.topic}`.toLowerCase().includes(query.toLowerCase()),
  );
  const groups = (
    discover ? discovered : chats.filter((c) => c.kind === "group")
  ).filter(
    (c) =>
      (level === "all" || c.level === "all" || c.level === level) &&
      `${c.name} ${c.topic}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={s.page}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.eyebrow}>सङ्घः · LEARN TOGETHER</Text>
          <Text style={s.title}>Group</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit community profile"
          onPress={() => setModal("profile")}
          style={s.avatar}
        >
          <Text style={s.initial}>
            {(learner?.display_name || "L").slice(0, 1)}
          </Text>
        </Pressable>
      </View>
      <View style={s.tabs}>
        {(["Rooms", "Chats", "Groups", "Friends"] as Tab[]).map((t) => (
          <Pressable
            key={t}
            accessibilityRole="tab"
            accessibilityState={{ selected: t === tab }}
            onPress={() => {
              setTab(t);
              setQuery("");
            }}
            style={[s.tab, t === tab && s.tabOn]}
          >
            <Text
              style={[s.tabText, t === tab && { color: color.saffronText }]}
            >
              {t}
              {t === "Chats" && community.status.unread > 0
                ? ` ${community.status.unread}`
                : t === "Rooms" && rooms.length > 0
                  ? ` ${rooms.length}`
                  : ""}
            </Text>
          </Pressable>
        ))}
      </View>
      <ScrollView
        contentContainerStyle={s.body}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => {
              setLoading(true);
              void load();
            }}
          />
        }
      >
        {!!error && <Notice text={error} retry={() => void load()} />}
        {tab === "Rooms" && (
          <LinearGradient
            colors={["#F6E4C7", "#FFF0DC"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.hero}
          >
            <View style={s.row}>
              <Ionicons
                name="radio-outline"
                size={26}
                color={color.saffronText}
              />
              <Text style={s.eyebrow}>संभाषणम्</Text>
            </View>
            <Text style={s.heroTitle}>
              A little Sanskrit.{"\n"}A real conversation.
            </Text>
            <Text style={s.copy}>
              Listen, find your words, and speak with fellow learners. Every
              level belongs here.
            </Text>
            <View style={s.row}>
              <Action
                primary
                label="Start Sanskrit room"
                disabled={busy || !community.status.audio_enabled}
                onPress={() => setModal("room")}
              />
              <Text style={s.note}>Audio only</Text>
            </View>
            {!community.status.audio_enabled && (
              <Text style={s.note}>
                Live audio will open when the service is configured.
              </Text>
            )}
          </LinearGradient>
        )}
        <View style={s.search}>
          <Ionicons name="search" size={18} color={color.inkSoft} />
          <TextInput
            accessibilityLabel={`Search ${tab.toLowerCase()}`}
            placeholder={
              tab === "Friends"
                ? "Find Sanskrit learners…"
                : `Search ${tab.toLowerCase()}…`
            }
            value={query}
            onChangeText={setQuery}
            style={s.searchInput}
          />
        </View>
        {tab !== "Chats" && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6 }}
          >
            {levels.map((l) => (
              <Pressable
                key={l}
                accessibilityRole="button"
                accessibilityState={{ selected: level === l }}
                onPress={() => setLevel(l)}
                style={[s.chip, level === l && s.chipOn]}
              >
                <Text style={s.note}>
                  {l === "all"
                    ? "All levels"
                    : l === "acharya"
                      ? "Ācārya"
                      : l[0].toUpperCase() + l.slice(1)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
        {loading && <ActivityIndicator color={color.saffron} />}
        {tab === "Rooms" && (
          <>
            <Section
              title="Live rooms"
              subtitle="Enter as a listener. Raise your hand when you’re ready."
            />
            {filteredRooms.map((r) => (
              <View key={r.id} style={s.card}>
                <View style={s.row}>
                  <Text style={s.live}>● LIVE</Text>
                  <Text style={s.note}>{levelLabels[r.level]}</Text>
                </View>
                <Text style={s.cardTitle}>{r.title}</Text>
                {!!r.topic && <Text style={s.copy}>{r.topic}</Text>}
                <View style={s.row}>
                  <Avatar person={r.host} />
                  {r.speakers
                    ?.filter((p) => p.id !== r.host.id)
                    .slice(0, 2)
                    .map((p) => (
                      <View key={p.id} style={s.avatar}>
                        <Text style={s.initial}>{p.name.slice(0, 1)}</Text>
                      </View>
                    ))}
                  <View style={{ flex: 1 }}>
                    <Text style={s.name}>{r.host.name}</Text>
                    <Text style={s.note}>
                      {r.participant_count === undefined
                        ? "Hosting"
                        : `${r.participant_count} connected`}
                    </Text>
                  </View>
                  <Action
                    label="Join room"
                    primary
                    disabled={busy}
                    onPress={() => joinRoom(r)}
                  />
                </View>
              </View>
            ))}
            {!loading && !filteredRooms.length && (
              <Empty
                icon="radio-outline"
                title="The circle is quiet"
                text="Start a room and give someone their first Sanskrit conversation."
              />
            )}
          </>
        )}
        {tab === "Chats" && (
          <>
            <Section
              title="Your conversations"
              subtitle="A space to ask, share, and practise."
            />
            {chats
              .filter(
                (c) =>
                  c.kind === "direct" &&
                  c.name.toLowerCase().includes(query.toLowerCase()),
              )
              .map((c) => (
                <ConversationCard
                  key={c.id}
                  chat={c}
                  onPress={() => setChat(c)}
                />
              ))}
            {!loading && !chats.some((c) => c.kind === "direct") && (
              <Empty
                icon="chatbubbles-outline"
                title="Start with a friend"
                text="Find a learner in Friends. Accept a request to open a private chat."
              />
            )}
          </>
        )}
        {tab === "Groups" && (
          <>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Section
                  title="Study circles"
                  subtitle="Find your people. Keep learning."
                />
              </View>
              <Action
                primary
                label="Create group"
                onPress={() => setModal("group")}
              />
            </View>
            <View style={s.row}>
              <Action
                label="My groups"
                primary={!discover}
                onPress={() => setDiscover(false)}
              />
              <Action
                label="Discover public"
                primary={discover}
                onPress={() => setDiscover(true)}
              />
            </View>
            {groups.map((c) => (
              <View key={c.id} style={s.card}>
                <View style={s.row}>
                  <View style={s.avatar}>
                    <Ionicons
                      name="people-outline"
                      size={24}
                      color={color.saffronText}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardTitle}>{c.name}</Text>
                    <Text style={s.note}>
                      {c.public ? "Public" : "Private"} · {c.member_count}{" "}
                      learners · {levelLabels[c.level]}
                    </Text>
                  </View>
                </View>
                {!!c.description && <Text style={s.copy}>{c.description}</Text>}
                {!!c.topic && <Text style={s.tag}>{c.topic}</Text>}
                <Action
                  label={c.joined ? "Open group" : "Join group"}
                  disabled={busy}
                  onPress={() =>
                    c.joined
                      ? setChat(c)
                      : run(async () => {
                          const joined = await post<Conversation>(
                            `/groups/${c.id}/join`,
                          );
                          setChat(joined);
                        })
                  }
                />
              </View>
            ))}
            {!loading && !groups.length && (
              <Empty
                icon="people-outline"
                title={
                  discover
                    ? "A new community begins here"
                    : "Your circle is waiting"
                }
                text={
                  discover
                    ? "Create a public group around a text, topic, or daily practice."
                    : "Create a group or discover public study circles."
                }
              />
            )}
          </>
        )}
        {tab === "Friends" && (
          <>
            {friends.incoming.length > 0 && (
              <>
                <Section title="Friend requests" />
                {friends.incoming.map((p) => (
                  <PersonCard key={p.id} person={p}>
                    <Action
                      primary
                      label="Accept"
                      disabled={busy}
                      onPress={() => friendAction(p, "accept")}
                    />
                    <Action
                      label="Decline"
                      disabled={busy}
                      onPress={() => friendAction(p, "decline")}
                    />
                  </PersonCard>
                ))}
              </>
            )}
            {friends.outgoing.length > 0 && (
              <>
                <Section title="Requests sent" />
                {friends.outgoing.map((p) => (
                  <PersonCard key={p.id} person={p}>
                    <Action
                      label="Cancel request"
                      disabled={busy}
                      onPress={() => friendAction(p, "cancel")}
                    />
                  </PersonCard>
                ))}
              </>
            )}
            <Section title="My friends" />
            {friends.friends.map((p) => (
              <PersonCard key={p.id} person={p}>
                <Action
                  label="Chat"
                  disabled={busy}
                  onPress={() => openDirect(p)}
                />
                <Action
                  label="Call"
                  disabled={busy || !community.status.audio_enabled}
                  onPress={() =>
                    run(async () => {
                      const c = await post<Conversation>("/direct", {
                        user_id: p.id,
                      });
                      const info = await post<CallInfo>(
                        `/conversations/${c.id}/call`,
                      );
                      await community.join(info);
                    })
                  }
                />
                <Action
                  label="Block"
                  disabled={busy}
                  onPress={() => friendAction(p, "block")}
                />
              </PersonCard>
            ))}
            <Section
              title="Find Sanskrit learners"
              subtitle="Set up your community profile to be discoverable too."
            />
            {people
              .filter((p) => p.friendship !== "accepted")
              .map((p) => (
                <PersonCard key={p.id} person={p}>
                  <Action
                    label={
                      p.friendship === "pending"
                        ? "Requested"
                        : p.friendship === "incoming"
                          ? "Accept request"
                          : "Add friend"
                    }
                    disabled={busy || p.friendship === "pending"}
                    onPress={() =>
                      friendAction(
                        p,
                        p.friendship === "incoming" ? "accept" : "request",
                      )
                    }
                  />
                </PersonCard>
              ))}
            {!loading && !people.length && (
              <Empty
                icon="person-add-outline"
                title="Meet the next learner"
                text="Learners who set up their community profile appear here."
              />
            )}
          </>
        )}
        <Text style={[s.note, { textAlign: "center", marginVertical: 12 }]}>
          Respect the learner. Make room for mistakes.
        </Text>
      </ScrollView>
      <CreateDialog
        kind={modal}
        close={() => setModal(null)}
        busy={busy}
        level={myLevel}
        bio={bio}
        setLevel={setMyLevel}
        setBio={setBio}
        error={error}
        submit={(body) =>
          run(async () => {
            if (modal === "profile") {
              await profile(myLevel, bio);
              setModal(null);
            } else if (modal === "group") {
              const c = await post<Conversation>("/groups", body);
              setModal(null);
              setTab("Groups");
              setChat(c);
            } else {
              const r = await post<Room>("/rooms", body);
              setModal(null);
              await community.join({
                id: r.id,
                title: r.title,
                kind: "audio_room",
                host_id: r.host.id,
              });
            }
          })
        }
      />
    </SafeAreaView>
  );
}
function ChatView({
  chat,
  busy,
  error,
  back,
  call,
  invite,
  refresh,
  footer,
}: {
  chat: Conversation;
  busy: boolean;
  error: string;
  back: () => void;
  call: () => void;
  invite: () => void;
  refresh: () => Promise<void>;
  footer: React.ReactNode;
}) {
  const { learner } = useAuth(),
    community = useCommunity();
  const [messages, setMessages] = useState<Message[]>([]),
    [reply, setReply] = useState<Message | null>(null),
    [failure, setFailure] = useState(""),
    [loading, setLoading] = useState(true),
    [hasMore, setHasMore] = useState(false),
    [details, setDetails] = useState(false),
    [paging, setPaging] = useState(false);
  const focused = useIsFocused();
  const scroll = useRef<ScrollView>(null),
    nearBottom = useRef(true),
    requestNo = useRef(0);
  const load = useCallback(async () => {
    if (!focused) return;
    const seq = ++requestNo.current;
    try {
      const rows = await get<Message[]>(`/conversations/${chat.id}/messages`);
      if (seq !== requestNo.current) return;
      setMessages((old) => {
        const map = new Map(old.map((m) => [m.id, m]));
        rows.forEach((m) => map.set(m.id, m));
        return Array.from(map.values()).sort((a, b) => a.id - b.id);
      });
      setHasMore(rows.length === 50);
      setFailure("");
      if (rows.length)
        await post(`/conversations/${chat.id}/read`, {
          message_id: rows[rows.length - 1].id,
        });
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "Could not load messages.");
    } finally {
      setLoading(false);
    }
  }, [chat.id, focused]);
  useEffect(() => {
    void load();
  }, [load, community.revision]);
  const older = async () => {
    if (paging || !messages.length) return;
    setPaging(true);
    nearBottom.current = false;
    try {
      const rows = await get<Message[]>(
        `/conversations/${chat.id}/messages?before=${messages[0].id}`,
      );
      setMessages((old) => [...rows, ...old]);
      setHasMore(rows.length === 50);
    } catch (e) {
      setFailure(String(e));
    } finally {
      setPaging(false);
    }
  };
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={s.page}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <View style={s.chatHeader}>
          <Action label="Back" onPress={back} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Conversation details"
            onPress={() => setDetails((v) => !v)}
            style={{ flex: 1 }}
          >
            <Text style={s.cardTitle} numberOfLines={1}>
              {chat.name}
            </Text>
            <Text style={s.note}>
              {chat.kind === "group"
                ? `${chat.member_count} ${chat.member_count === 1 ? "learner" : "learners"} · ${chat.public ? "Public" : "Private"}`
                : chat.members.find((p) => p.id !== learner?.id)?.online
                  ? "Online"
                  : "Private conversation"}
            </Text>
          </Pressable>
          <Action
            label="Audio call"
            disabled={busy || !community.status.audio_enabled}
            onPress={call}
          />
        </View>
        {chat.call_id && (
          <View style={s.callBanner}>
            <Text style={[s.note, { flex: 1, color: color.okText }]}>
              ● Audio call live
            </Text>
            <Action label="Join call" disabled={busy} onPress={call} />
          </View>
        )}
        {details && (
          <View style={s.details}>
            <Text style={s.copy}>
              {chat.description || "Practise together, one message at a time."}
            </Text>
            <Text style={s.note}>
              {chat.members.map((p) => p.name).join(" · ")}
            </Text>
            {chat.kind === "group" && (
              <View style={s.row}>
                {chat.role === "admin" && (
                  <Action label="Invite a friend" onPress={invite} />
                )}
                <Action
                  label="Leave group"
                  onPress={() =>
                    void post(`/groups/${chat.id}/leave`)
                      .then(() => {
                        back();
                        void refresh();
                      })
                      .catch((e) => setFailure(e.message))
                  }
                />
              </View>
            )}
          </View>
        )}
        {(error || failure) && (
          <Notice text={error || failure} retry={() => void load()} />
        )}
        <ScrollView
          ref={scroll}
          style={{ flex: 1 }}
          contentContainerStyle={s.messages}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={100}
          onScroll={(e) => {
            const { contentOffset, layoutMeasurement, contentSize } =
              e.nativeEvent;
            nearBottom.current =
              contentOffset.y + layoutMeasurement.height >=
              contentSize.height - 90;
          }}
          onContentSizeChange={() => {
            if (nearBottom.current)
              scroll.current?.scrollToEnd({ animated: true });
          }}
        >
          {hasMore && (
            <Action
              label={paging ? "Loading…" : "Earlier messages"}
              disabled={paging}
              onPress={() => void older()}
            />
          )}
          {loading && <ActivityIndicator color={color.saffron} />}
          {!loading && !messages.length && (
            <Empty
              icon="chatbubble-ellipses-outline"
              title="Begin with नमस्ते"
              text="Text stays in your chat. Photos and voice notes expire after 48 hours."
            />
          )}
          {messages.map((m) => {
            const own = m.sender.id === learner?.id;
            return (
              <View
                key={m.id}
                style={[s.bubble, own ? s.ownBubble : s.theirBubble]}
              >
                {!own && (
                  <Text style={s.sender}>
                    {m.sender.name} ·{" "}
                    {levelLabels[m.sender.level]?.split(" · ")[0]}
                  </Text>
                )}
                {m.reply && (
                  <View style={s.quote}>
                    <Text style={s.sender}>{m.reply.name}</Text>
                    <Text style={s.note} numberOfLines={2}>
                      {m.reply.content}
                    </Text>
                  </View>
                )}
                {m.kind !== "text" && <EphemeralMedia message={m} />}
                {!!m.content && <Text style={s.messageText}>{m.content}</Text>}
                <View style={s.row}>
                  <Text style={[s.note, { flex: 1 }]}>
                    {new Date(m.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Reply to ${m.sender.name}`}
                    onPress={() => setReply(m)}
                    style={{ padding: 8 }}
                  >
                    <Ionicons
                      name="return-up-back"
                      size={17}
                      color={color.inkSoft}
                    />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </ScrollView>
        <Composer
          cid={chat.id}
          reply={reply}
          clearReply={() => setReply(null)}
          onSent={() => {
            nearBottom.current = true;
            void load();
            void community.refresh().catch(() => {});
          }}
        />
      </KeyboardAvoidingView>
      {footer}
    </SafeAreaView>
  );
}
function CreateDialog({
  kind,
  close,
  submit,
  busy,
  level,
  bio,
  setLevel,
  setBio,
  error,
}: {
  kind: "room" | "group" | "profile" | null;
  close: () => void;
  submit: (b: unknown) => void;
  busy: boolean;
  level: Level;
  bio: string;
  setLevel: (l: Level) => void;
  setBio: (s: string) => void;
  error: string;
}) {
  const [name, setName] = useState(""),
    [description, setDescription] = useState(""),
    [topic, setTopic] = useState(""),
    [selected, setSelected] = useState("all"),
    [isPublic, setPublic] = useState(true);
  const insets = useSafeAreaInsets();
  useEffect(() => {
    setName("");
    setDescription("");
    setTopic("");
    setSelected("all");
    setPublic(true);
  }, [kind]);
  return (
    <Modal
      visible={!!kind}
      transparent
      animationType="slide"
      onRequestClose={() => !busy && close()}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={s.scrim}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }}
        >
          <View style={[s.sheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={s.row}>
              <Text style={[s.cardTitle, { flex: 1 }]}>
                {kind === "profile"
                  ? "Your community profile"
                  : kind === "room"
                    ? "Start a Sanskrit room"
                    : "Create a study group"}
              </Text>
              <Action label="Close" disabled={busy} onPress={close} />
            </View>
            {kind === "profile" ? (
              <>
                <Text style={s.copy}>
                  Your name, level, and bio will be visible to other learners.
                </Text>
                <TextInput
                  accessibilityLabel="Community bio"
                  style={s.input}
                  placeholder="What would you like to practise?"
                  value={bio}
                  onChangeText={setBio}
                  multiline
                  maxLength={280}
                />
              </>
            ) : (
              <>
                <TextInput
                  accessibilityLabel={
                    kind === "room" ? "Room title" : "Group name"
                  }
                  style={s.input}
                  placeholder={
                    kind === "room"
                      ? "e.g. A first conversation in Sanskrit"
                      : "e.g. Gītā reading circle"
                  }
                  value={name}
                  onChangeText={setName}
                  maxLength={80}
                />
                <TextInput
                  accessibilityLabel="Topic or prompt"
                  style={s.input}
                  placeholder="Topic or prompt (optional)"
                  value={topic}
                  onChangeText={setTopic}
                  maxLength={80}
                />
                {kind === "group" && (
                  <>
                    <TextInput
                      accessibilityLabel="Group description"
                      style={s.input}
                      placeholder="What will you study together?"
                      value={description}
                      onChangeText={setDescription}
                      multiline
                      maxLength={500}
                    />
                    <View style={s.row}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.name}>
                          {isPublic ? "Public group" : "Private group"}
                        </Text>
                        <Text style={s.note}>
                          {isPublic
                            ? "Anyone can discover and join."
                            : "Only invited friends can join."}
                        </Text>
                      </View>
                      <Switch
                        accessibilityLabel="Public group"
                        value={isPublic}
                        onValueChange={setPublic}
                      />
                    </View>
                  </>
                )}
              </>
            )}
            <Text style={s.name}>Sanskrit level</Text>
            <View style={s.row}>
              {levels
                .filter((l) => kind !== "profile" || l !== "all")
                .map((l) => (
                  <Pressable
                    key={l}
                    accessibilityRole="button"
                    onPress={() =>
                      kind === "profile" ? setLevel(l as Level) : setSelected(l)
                    }
                    style={[
                      s.chip,
                      (kind === "profile" ? level : selected) === l && s.chipOn,
                    ]}
                  >
                    <Text style={s.note}>{levelLabels[l]}</Text>
                  </Pressable>
                ))}
            </View>
            {!!error && <Text style={{ color: color.badText }}>{error}</Text>}
            <Action
              primary
              disabled={busy || (kind !== "profile" && !name.trim())}
              label={
                busy
                  ? "Saving…"
                  : kind === "profile"
                    ? "Save profile"
                    : kind === "room"
                      ? "Go live"
                      : "Create group"
              }
              onPress={() =>
                submit(
                  kind === "room"
                    ? { title: name.trim(), topic, level: selected }
                    : {
                        name: name.trim(),
                        description,
                        topic,
                        level: selected,
                        public: isPublic,
                      },
                )
              }
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
function InviteDialog({
  group,
  friends,
  close,
  onInvite,
}: {
  group: Conversation;
  friends: Person[];
  close: () => void;
  onInvite: (p: Person) => void;
}) {
  const candidates = friends.filter(
    (p) => !group.members.some((m) => m.id === p.id),
  );
  return (
    <Modal visible transparent animationType="slide" onRequestClose={close}>
      <View style={s.scrim}>
        <View style={s.sheet}>
          <Text style={s.cardTitle}>Invite a friend to {group.name}</Text>
          <ScrollView style={{ maxHeight: 380 }}>
            {candidates.map((p) => (
              <PersonCard key={p.id} person={p}>
                <Action label="Invite" onPress={() => onInvite(p)} />
              </PersonCard>
            ))}
            {!candidates.length && (
              <Text style={s.copy}>
                All your friends are here. Add friends to invite more learners.
              </Text>
            )}
          </ScrollView>
          <Action label="Close" onPress={close} />
        </View>
      </View>
    </Modal>
  );
}
function Avatar({ person }: { person: Person }) {
  return (
    <View style={s.avatar}>
      <Text style={s.initial}>{person.name.slice(0, 1)}</Text>
      {person.online && <View style={s.online} />}
    </View>
  );
}
function PersonCard({
  person,
  children,
}: {
  person: Person;
  children: React.ReactNode;
}) {
  return (
    <View style={s.card}>
      <View style={s.row}>
        <Avatar person={person} />
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{person.name}</Text>
          <Text style={s.note}>{levelLabels[person.level]}</Text>
          {!!person.bio && <Text style={s.copy}>{person.bio}</Text>}
        </View>
      </View>
      <View style={s.row}>{children}</View>
    </View>
  );
}
function ConversationCard({
  chat,
  onPress,
}: {
  chat: Conversation;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={s.card}>
      <View style={s.row}>
        <View style={s.avatar}>
          <Text style={s.initial}>{chat.name.slice(0, 1)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{chat.name}</Text>
          <Text style={s.note} numberOfLines={1}>
            {chat.last_text || "Say नमस्ते"}
          </Text>
        </View>
        <View style={{ gap: 6, alignItems: "flex-end" }}>
          <Text style={s.note}>
            {new Date(chat.updated_at).toLocaleDateString([], {
              month: "short",
              day: "numeric",
            })}
          </Text>
          {chat.unread > 0 && <Text style={s.unread}>{chat.unread}</Text>}
        </View>
      </View>
    </Pressable>
  );
}
function Empty({
  icon,
  title,
  text,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  text: string;
}) {
  return (
    <View style={s.empty}>
      <View style={s.emptyIcon}>
        <Ionicons name={icon} size={32} color={color.saffronText} />
      </View>
      <Text style={s.cardTitle}>{title}</Text>
      <Text style={[s.copy, { textAlign: "center", maxWidth: 290 }]}>
        {text}
      </Text>
    </View>
  );
}
function Section({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ gap: 4, marginTop: 6 }}>
      <Text style={s.cardTitle}>{title}</Text>
      {subtitle && <Text style={s.copy}>{subtitle}</Text>}
    </View>
  );
}
function Notice({ text, retry }: { text: string; retry: () => void }) {
  return (
    <View style={s.notice}>
      <Text accessibilityRole="alert" style={{ color: color.badText, flex: 1 }}>
        {text}
      </Text>
      <Action label="Retry" onPress={retry} />
    </View>
  );
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  eyebrow: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 11,
    letterSpacing: 1.5,
    color: color.saffronText,
  },
  title: { fontFamily: "Nunito_800ExtraBold", fontSize: 30, color: color.ink },
  tabs: {
    flexDirection: "row",
    marginHorizontal: 16,
    padding: 4,
    backgroundColor: color.surfaceMuted,
    borderRadius: 16,
  },
  tab: {
    flex: 1,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  tabOn: { backgroundColor: color.surface },
  tabText: { fontFamily: "Nunito_700Bold", fontSize: 13, color: color.inkSoft },
  body: { padding: 20, paddingBottom: 28, gap: 16 },
  hero: { borderRadius: 24, padding: 22, gap: 15 },
  heroTitle: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 27,
    lineHeight: 34,
    color: color.ink,
  },
  copy: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 14,
    lineHeight: 22,
    color: color.inkSoft,
  },
  note: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 12,
    lineHeight: 18,
    color: color.inkSoft,
  },
  row: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  card: {
    backgroundColor: color.surface,
    borderRadius: 20,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: color.border,
  },
  cardTitle: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 18,
    color: color.ink,
  },
  name: { fontFamily: "Nunito_700Bold", fontSize: 15, color: color.ink },
  live: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 11,
    color: color.okText,
    letterSpacing: 1,
  },
  tag: { fontFamily: "Nunito_700Bold", fontSize: 12, color: color.saffronText },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: color.saffronLight,
    alignItems: "center",
    justifyContent: "center",
  },
  initial: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 21,
    color: color.saffronText,
  },
  online: {
    position: "absolute",
    bottom: 1,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: color.ok,
    borderWidth: 2,
    borderColor: color.surface,
  },
  search: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    paddingHorizontal: 14,
    backgroundColor: color.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: color.border,
  },
  searchInput: {
    flex: 1,
    minHeight: 46,
    color: color.ink,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 14,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  chipOn: { backgroundColor: color.saffronLight, borderColor: color.saffron },
  empty: { alignItems: "center", paddingVertical: 30, gap: 12 },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: color.saffronLight,
    alignItems: "center",
    justifyContent: "center",
  },
  unread: {
    backgroundColor: color.saffronBtn,
    color: "white",
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 12,
    minWidth: 24,
    textAlign: "center",
    padding: 4,
    borderRadius: 12,
  },
  scrim: { flex: 1, justifyContent: "flex-end", backgroundColor: "#3B2E2570" },
  sheet: {
    backgroundColor: color.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    gap: 16,
  },
  input: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: 14,
    padding: 14,
    minHeight: 48,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 16,
    color: color.ink,
  },
  notice: {
    padding: 12,
    backgroundColor: color.badBg,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderBottomWidth: 1,
    borderColor: color.border,
  },
  messages: { padding: 16, gap: 12, flexGrow: 1 },
  bubble: {
    padding: 12,
    borderRadius: 18,
    gap: 6,
    maxWidth: "92%",
    minWidth: 140,
  },
  ownBubble: {
    alignSelf: "flex-end",
    backgroundColor: color.saffronLight,
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    alignSelf: "flex-start",
    backgroundColor: color.surface,
    borderBottomLeftRadius: 4,
  },
  sender: {
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
    color: color.saffronText,
  },
  messageText: { fontSize: 18, lineHeight: 29, color: color.ink },
  quote: {
    borderLeftWidth: 3,
    borderColor: color.saffron,
    padding: 8,
    backgroundColor: "#FFFFFF80",
    borderRadius: 6,
  },
  callBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: color.okBg,
    padding: 10,
  },
  details: { padding: 14, gap: 10, backgroundColor: color.surfaceMuted },
});
