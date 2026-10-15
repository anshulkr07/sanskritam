// One conversation, full screen over the tab bar: a circle or a friend.
// Newest message at the bottom (an inverted list), a divider for each day,
// consecutive messages from one person grouped. Long-press a message to
// reply, delete (yours, or any in a circle you run), report or block.
// The composer rides above the keyboard (react-native-keyboard-controller,
// as in Talk: Android is edge-to-edge, so the window never resizes).

import { Ionicons } from "@react-native-vector-icons/ionicons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useIsFocused } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ApiError } from "../api/client";
import {
  friendly,
  get,
  levelShort,
  needsCard,
  post,
  type CallInfo,
  type Conversation,
  type Message,
} from "../community/api";
import { Composer, EphemeralMedia } from "../community/ChatMedia";
import { useCommunity } from "../community/CommunityProvider";
import { CREAM, CREAM_SOFT, T, dayLabel, fillFor, ui } from "../community/look";
import { Avatar, Btn, CircleMark, Confirm, Empty, IconBtn, Notice, Sheet, SheetRow } from "../community/parts";
import { ReportSheet, type ReportTarget } from "../community/sheets";
import { usePinAudioBarBelow } from "../components/FloatingAudioBar";
import type { RootStackParamList } from "../navigation/types";
import { fill } from "../theme";
import { useAuth } from "../store/auth";

type Props = NativeStackScreenProps<RootStackParamList, "GroupChat">;

type Item =
  | { type: "msg"; key: string; m: Message; head: boolean; tail: boolean }
  | { type: "day"; key: string; label: string };

const GAP_MS = 5 * 60_000;

function merge(a: Message[], b: Message[]): Message[] {
  const map = new Map(a.map((m) => [m.id, m]));
  b.forEach((m) => map.set(m.id, m));
  return Array.from(map.values()).sort((x, y) => x.id - y.id);
}

const dayOf = (iso: string) => new Date(iso).toDateString();

export default function GroupChatScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const { learner } = useAuth();
  const community = useCommunity();
  const focused = useIsFocused();
  const insets = useSafeAreaInsets();
  const keyboard = useReanimatedKeyboardAnimation();
  // The keyboard's height counts the system bar the composer already pads for.
  const lift = useAnimatedStyle(() => ({
    paddingBottom: Math.max(0, -keyboard.height.value - insets.bottom),
  }));

  const [chat, setChat] = useState<Conversation | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [paging, setPaging] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState("");
  const [shut, setShut] = useState("");
  const [reply, setReply] = useState<Message | null>(null);
  const [picked, setPicked] = useState<Message | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "delete" | "block"; m: Message } | null>(null);
  const [reporting, setReporting] = useState<ReportTarget | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  // The audio bar would cover the composer, so it sits under the header,
  // call bar and notices instead, wherever they end.
  const [chromeEnd, setChromeEnd] = useState<number | null>(null);
  usePinAudioBarBelow(focused ? chromeEnd : null);
  const seq = useRef(0);
  const paged = useRef(false);
  const lastRead = useRef(0);
  const list = useRef<FlatList<Item>>(null);

  const load = useCallback(async () => {
    const n = ++seq.current;
    try {
      const [cr, mr] = await Promise.allSettled([
        get<Conversation>(`/conversations/${id}`),
        get<Message[]>(`/conversations/${id}/messages`),
      ]);
      if (n !== seq.current) return;
      if (cr.status === "rejected") throw cr.reason;
      setChat(cr.value);
      if (mr.status === "rejected") {
        const e = mr.reason;
        if (e instanceof ApiError && (e.status === 403 || e.status === 404)) {
          setShut(cr.value.joined ? e.message : "");
          setMsgs([]);
          return;
        }
        throw e;
      }
      const rows = mr.value;
      setShut("");
      setFailure("");
      setMsgs((old) => merge(old, rows));
      if (!paged.current) setHasMore(rows.length === 50);
      const newest = rows.length ? rows[rows.length - 1].id : 0;
      if (newest > lastRead.current) {
        lastRead.current = newest;
        void post(`/conversations/${id}/read`, { message_id: newest })
          .then(() => community.refresh(true))
          .catch(() => {});
      }
    } catch (e) {
      if (n !== seq.current) return;
      if (e instanceof ApiError && (e.status === 403 || e.status === 404)) setShut(e.message);
      else setFailure(friendly(e, "Could not load the messages."));
    } finally {
      if (n === seq.current) setLoading(false);
    }
    // community.refresh is stable per sign-in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!focused) return;
    const t = setTimeout(() => void load(), 80);
    return () => clearTimeout(t);
  }, [load, focused, community.revision]);

  const older = async () => {
    if (paging || !hasMore || !msgs.length) return;
    setPaging(true);
    paged.current = true;
    try {
      const rows = await get<Message[]>(`/conversations/${id}/messages?before=${msgs[0].id}`);
      setMsgs((old) => merge(rows, old));
      setHasMore(rows.length === 50);
    } catch (e) {
      setFailure(friendly(e, "Could not load earlier messages."));
    } finally {
      setPaging(false);
    }
  };

  const items = useMemo(() => {
    const out: Item[] = [];
    for (let i = msgs.length - 1; i >= 0; i--) {
      const m = msgs[i];
      const prev = msgs[i - 1];
      const next = msgs[i + 1];
      const joined = (a?: Message, b?: Message) =>
        !!a &&
        !!b &&
        a.sender.id === b.sender.id &&
        a.kind !== "deleted" &&
        b.kind !== "deleted" &&
        dayOf(a.created_at) === dayOf(b.created_at) &&
        Date.parse(b.created_at) - Date.parse(a.created_at) < GAP_MS;
      out.push({ type: "msg", key: `m${m.id}`, m, head: !joined(prev, m), tail: !joined(m, next) });
      if (!prev || dayOf(prev.created_at) !== dayOf(m.created_at))
        out.push({ type: "day", key: `d${dayOf(m.created_at)}`, label: dayLabel(m.created_at) });
    }
    return out;
  }, [msgs]);

  const group = chat?.kind === "group";
  const admin = group && chat?.role === "admin";
  const peer = chat?.kind === "direct" ? chat.members.find((m) => m.id !== learner?.id) : undefined;
  const online = chat?.members.filter((m) => m.online && m.id !== learner?.id).length ?? 0;
  const sub = !chat
    ? ""
    : group
      ? `${chat.member_count} ${chat.member_count === 1 ? "learner" : "learners"}${online ? ` · ${online} online` : ""}`
      : peer?.online
        ? "Online now"
        : `${levelShort[peer?.level ?? "beginner"]} · friend`;
  const inThisCall = !!chat?.call_id && community.active?.id === chat.call_id;
  const cardReady = community.ready ? community.status.card : true;

  const toCard = () => navigation.navigate("GroupCard", { first: true });
  const info = () => chat && navigation.navigate("GroupInfo", { id: chat.id });

  const run = (fn: () => Promise<unknown>, after?: () => void) => {
    if (busy) return;
    setBusy(true);
    setActionError("");
    fn()
      .then(() => {
        after?.();
        void load();
        void community.refresh().catch(() => {});
      })
      .catch((e) => {
        if (needsCard(e)) toCard();
        else setActionError(friendly(e));
      })
      .finally(() => setBusy(false));
  };

  const call = () => {
    if (!chat) return;
    if (inThisCall) {
      community.expand();
      return;
    }
    run(async () => {
      const callInfo = await post<CallInfo>(`/conversations/${chat.id}/call`);
      await community.join(callInfo);
    });
  };

  const joinCircle = () => {
    if (!chat) return;
    if (!community.status.card && community.ready) return toCard();
    run(() => post(`/groups/${chat.id}/join`));
  };

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
      <IconBtn icon="chevron-back" label="Back" onPress={() => navigation.goBack()} />
      <Pressable
        onPress={info}
        accessibilityRole="button"
        accessibilityLabel={chat ? `${chat.name}. ${sub}. Details` : "Details"}
        style={styles.headMain}
      >
        {chat ? (
          group ? (
            <CircleMark id={chat.id} name={chat.name} size={38} />
          ) : (
            <Avatar id={peer?.id ?? chat.id} name={chat.name} size={38} online={peer?.online} />
          )
        ) : (
          <View style={styles.headSkeleton} />
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.headTitle} numberOfLines={1}>
            {chat?.name ?? route.params.name ?? ""}
          </Text>
          <Text style={styles.headSub} numberOfLines={1}>
            {sub}
          </Text>
        </View>
      </Pressable>
      {chat?.joined && community.status.audio_enabled ? (
        <IconBtn
          icon={inThisCall ? "call" : "call-outline"}
          label={inThisCall ? "Open the call" : chat.call_id ? "Join the call" : "Start an audio call"}
          color={chat.call_id ? T.done : T.ink}
          onPress={call}
          disabled={busy}
        />
      ) : null}
      <IconBtn icon="ellipsis-vertical" label={group ? "Circle details" : "Friend details"} onPress={info} />
    </View>
  );

  const bottom = shut ? (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <Text style={styles.barText}>{shut}</Text>
      <Btn label="Back" kind="outline" small onPress={() => navigation.goBack()} />
    </View>
  ) : chat && group && !chat.joined ? (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <Text style={styles.barText}>Join this circle to read and write in it.</Text>
      <Btn label="Join circle" small busy={busy} onPress={joinCircle} />
    </View>
  ) : !cardReady ? (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <Text style={styles.barText}>Make your learner card to write here. It takes a minute.</Text>
      <Btn label="Make card" small onPress={toCard} />
    </View>
  ) : chat ? (
    <Composer
      cid={chat.id}
      reply={reply}
      clearReply={() => setReply(null)}
      onNeedsCard={toCard}
      onSent={() => {
        void load();
        list.current?.scrollToOffset({ offset: 0, animated: true });
        void community.refresh().catch(() => {});
      }}
    />
  ) : null;

  const p = picked;
  const mine = !!p && p.sender.id === learner?.id;
  return (
    <View style={styles.page}>
      <View onLayout={(e) => setChromeEnd(e.nativeEvent.layout.y + e.nativeEvent.layout.height)}>
        {header}
        {chat?.call_id ? (
          <View style={styles.callBar}>
            <View style={styles.callDot} />
            <Text style={styles.callText} numberOfLines={1}>
              {inThisCall ? "You are in this call" : "Audio call on now"}
            </Text>
            <Btn label={inThisCall ? "Open" : "Join"} kind="cream" small onPress={call} busy={busy} />
          </View>
        ) : null}
        {failure ? <Notice text={failure} onRetry={() => void load()} /> : null}
        {actionError ? <Notice text={actionError} /> : null}
      </View>
      <Animated.View style={[{ flex: 1 }, lift]}>
        {loading && !msgs.length ? (
          <View style={styles.center}>
            <ActivityIndicator color={T.action} />
          </View>
        ) : !msgs.length ? (
          <View style={styles.center}>
            {chat && group && !chat.joined ? (
              <Empty
                icon="lock-closed-outline"
                title={chat.name}
                text={chat.description || "Join to see what the circle is reading and talking about."}
              />
            ) : (
              <Empty
                icon="chatbubble-ellipses-outline"
                title="Begin with नमस्ते"
                text="Text stays here. Photos and voice notes disappear after 48 hours. Long-press a message to reply to it or report it."
              />
            )}
          </View>
        ) : (
          <FlatList
            ref={list}
            inverted
            data={items}
            keyExtractor={(it) => it.key}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            onEndReached={() => void older()}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              paging ? (
                <ActivityIndicator color={T.action} style={{ marginVertical: 14 }} />
              ) : !hasMore ? (
                <Text style={styles.start}>
                  {group ? `This is the start of ${chat?.name ?? "the circle"}.` : "This is the start of your chat."}
                </Text>
              ) : null
            }
            renderItem={({ item }) =>
              item.type === "day" ? (
                <View style={styles.day}>
                  <View style={styles.dayRule} />
                  <Text style={styles.dayText}>{item.label}</Text>
                  <View style={styles.dayRule} />
                </View>
              ) : (
                <Bubble
                  m={item.m}
                  own={item.m.sender.id === learner?.id}
                  group={group}
                  head={item.head}
                  tail={item.tail}
                  onLong={() => setPicked(item.m)}
                />
              )
            }
          />
        )}
        {bottom}
      </Animated.View>

      <Sheet visible={!!p && !confirm && !reporting} onClose={() => setPicked(null)}>
        {p ? (
          <>
            <Text style={styles.pickedFrom}>{mine ? "Your message" : p.sender.name}</Text>
            {p.content ? (
              <Text style={styles.pickedText} numberOfLines={3}>
                {p.content}
              </Text>
            ) : null}
            <View style={{ marginTop: 8 }}>
              {p.kind !== "deleted" && !p.hidden && chat?.joined ? (
                <SheetRow
                  icon="return-up-back"
                  label="Reply"
                  onPress={() => {
                    setReply(p);
                    setPicked(null);
                  }}
                />
              ) : null}
              {p.kind !== "deleted" && (mine || admin) ? (
                <SheetRow
                  icon="trash-outline"
                  label={mine ? "Delete for everyone" : "Delete as circle admin"}
                  tone="danger"
                  onPress={() => setConfirm({ kind: "delete", m: p })}
                />
              ) : null}
              {!mine && p.kind !== "deleted" ? (
                <SheetRow
                  icon="flag-outline"
                  label="Report message"
                  onPress={() =>
                    setReporting({ kind: "message", id: String(p.id), label: `${p.sender.name.split(/\s+/)[0]}'s message` })
                  }
                />
              ) : null}
              {!mine ? (
                <SheetRow
                  icon="ban-outline"
                  label={`Block ${p.sender.name.split(/\s+/)[0]}`}
                  tone="danger"
                  onPress={() => setConfirm({ kind: "block", m: p })}
                />
              ) : null}
            </View>
          </>
        ) : null}
      </Sheet>
      <Confirm
        visible={confirm?.kind === "delete"}
        title="Delete this message?"
        body="It is removed for everyone in the chat. This cannot be undone."
        confirm="Delete"
        danger
        busy={busy}
        onClose={() => setConfirm(null)}
        onConfirm={() =>
          confirm &&
          run(
            () => post(`/conversations/${id}/messages/${confirm.m.id}/delete`),
            () => {
              setMsgs((old) => old.map((m) => (m.id === confirm.m.id ? { ...m, kind: "deleted", content: "", media_id: null } : m)));
              setConfirm(null);
              setPicked(null);
            },
          )
        }
      />
      <Confirm
        visible={confirm?.kind === "block"}
        title={`Block ${confirm?.m.sender.name ?? ""}?`}
        body="You will not see their messages in circles, and they cannot message, call or friend you. Any friendship ends."
        confirm="Block"
        danger
        busy={busy}
        onClose={() => setConfirm(null)}
        onConfirm={() =>
          confirm &&
          run(
            () => post("/friends", { user_id: confirm.m.sender.id, action: "block" }),
            () => {
              setConfirm(null);
              setPicked(null);
              if (!group) navigation.goBack();
            },
          )
        }
      />
      <ReportSheet
        target={reporting}
        onClose={() => {
          setReporting(null);
          setPicked(null);
        }}
      />
    </View>
  );
}

function Bubble({
  m,
  own,
  group,
  head,
  tail,
  onLong,
}: {
  m: Message;
  own: boolean;
  group: boolean;
  head: boolean;
  tail: boolean;
  onLong: () => void;
}) {
  const time = new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (m.kind === "deleted" || m.hidden) {
    return (
      <View style={[styles.slot, own ? styles.slotOwn : null, { marginTop: head ? 10 : 3 }]}>
        <View style={styles.gone}>
          <Ionicons name={m.hidden ? "eye-off-outline" : "trash-outline"} size={14} color={T.ink3} />
          <Text style={styles.goneText}>
            {m.hidden ? "Message from a blocked learner" : own ? "You deleted this message" : "Message deleted"}
          </Text>
        </View>
      </View>
    );
  }
  const showAvatar = group && !own;
  return (
    <View style={[styles.slot, own ? styles.slotOwn : null, { marginTop: head ? 10 : 3 }]}>
      {showAvatar ? (
        <View style={styles.avatarSlot}>{tail ? <Avatar id={m.sender.id} name={m.sender.name} size={30} /> : null}</View>
      ) : null}
      <Pressable
        onLongPress={onLong}
        delayLongPress={300}
        accessibilityRole="text"
        accessibilityHint="Long-press for reply, report and more"
        accessibilityLabel={`${own ? "You" : m.sender.name}, ${time}. ${m.content || (m.kind === "image" ? "Photo" : "Voice note")}`}
        style={({ pressed }) => [styles.bubble, own ? styles.own : styles.theirs, pressed && { opacity: 0.9 }]}
      >
        {group && !own && head ? (
          <Text style={[styles.sender, { color: fillFor(m.sender.id) }]} numberOfLines={1}>
            {m.sender.name}
            <Text style={styles.senderLevel}>{"  " + (levelShort[m.sender.level] ?? "")}</Text>
          </Text>
        ) : null}
        {m.reply ? (
          <View style={[styles.quote, own ? styles.quoteOwn : styles.quoteTheirs]}>
            <Text style={[styles.quoteName, own && { color: CREAM }]} numberOfLines={1}>
              {m.reply.name}
            </Text>
            <Text style={[styles.quoteText, own && { color: CREAM_SOFT }]} numberOfLines={2}>
              {m.reply.content}
            </Text>
          </View>
        ) : null}
        {m.kind !== "text" ? <EphemeralMedia message={m} own={own} /> : null}
        {m.content ? <Text style={[styles.text, own && { color: CREAM }]}>{m.content}</Text> : null}
        <Text style={[styles.time, own && { color: CREAM_SOFT }]}>{time}</Text>
      </Pressable>
    </View>
  );
}

const OWN = fill.teal;
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: T.paper },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 4,
    paddingBottom: 6,
    backgroundColor: T.paper,
    borderBottomWidth: 1,
    borderBottomColor: T.line,
  },
  headMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48, minWidth: 0 },
  headSkeleton: { width: 38, height: 38, backgroundColor: T.line },
  headTitle: { ...ui("bold"), fontSize: 17, lineHeight: 22, color: T.ink },
  headSub: { ...ui("regular"), fontSize: 12.5, lineHeight: 17, color: T.ink3 },
  callBar: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: fill.teal, paddingVertical: 8, paddingLeft: 16, paddingRight: 10 },
  callDot: { width: 8, height: 8, backgroundColor: "#7BD99A" },
  callText: { ...ui("semibold"), flex: 1, fontSize: 14.5, color: CREAM },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 16 },
  list: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6 },
  start: { ...ui("regular"), fontSize: 13, color: T.ink3, textAlign: "center", marginVertical: 16 },
  day: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 18, marginBottom: 4 },
  dayRule: { flex: 1, height: 1, backgroundColor: T.line },
  dayText: { ...ui("semibold"), fontSize: 12.5, letterSpacing: 0.4, color: T.ink3 },
  slot: { flexDirection: "row", alignItems: "flex-end", gap: 6, justifyContent: "flex-start" },
  slotOwn: { justifyContent: "flex-end" },
  avatarSlot: { width: 30 },
  bubble: { maxWidth: "82%", paddingHorizontal: 12, paddingTop: 8, paddingBottom: 6, gap: 4 },
  own: { backgroundColor: OWN },
  theirs: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.line },
  sender: { ...ui("bold"), fontSize: 13.5, lineHeight: 18 },
  senderLevel: { ...ui("regular"), fontSize: 12, color: T.ink3 },
  quote: { paddingLeft: 8, paddingVertical: 4, borderLeftWidth: 3 },
  quoteOwn: { borderLeftColor: CREAM, backgroundColor: "rgba(255,248,238,0.10)" },
  quoteTheirs: { borderLeftColor: T.action, backgroundColor: T.paper },
  quoteName: { ...ui("semibold"), fontSize: 12.5, color: T.ink },
  quoteText: { ...ui("regular"), fontSize: 13, lineHeight: 18, color: T.ink2 },
  text: { ...ui("regular"), fontSize: 16.5, lineHeight: 25, color: T.ink },
  time: { ...ui("regular"), fontSize: 11, color: T.ink3, alignSelf: "flex-end" },
  gone: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderStyle: "dashed", borderColor: T.lineStrong },
  goneText: { ...ui("regular"), fontSize: 13.5, color: T.ink3 },
  bar: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: T.line, backgroundColor: T.surface },
  barText: { ...ui("regular"), flex: 1, fontSize: 14.5, lineHeight: 20, color: T.ink2 },
  pickedFrom: { ...ui("semibold"), fontSize: 14, color: T.ink3 },
  pickedText: { ...ui("regular"), fontSize: 16, lineHeight: 24, color: T.ink, marginTop: 4 },
});
