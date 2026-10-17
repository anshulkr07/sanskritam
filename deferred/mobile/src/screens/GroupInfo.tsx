// A circle's page, or a friend's: who and what it is, what you can do there.
// A circle you have not joined can be looked at first (public circles only),
// then joined. Admins invite friends, edit the circle and remove learners;
// anyone can leave or report. A friend's page offers a call, removing the
// friendship, reporting and blocking. Every irreversible step asks first.

import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import {
  friendly,
  get,
  levelSa,
  levelShort,
  needsCard,
  post,
  type CallInfo,
  type Conversation,
  type Friends,
  type Person,
} from "../community/api";
import { useCommunity } from "../community/CommunityProvider";
import { T, sa, ui } from "../community/look";
import {
  Avatar,
  Btn,
  CircleMark,
  Confirm,
  Empty,
  IconBtn,
  Notice,
  ScreenHeader,
  SectionHead,
  Sheet,
  SheetRow,
  groupStyles,
} from "../community/parts";
import { PersonRow, circleMeta } from "../community/rows";
import { PersonSheet, ReportSheet, type ReportTarget } from "../community/sheets";
import { useLoad } from "../community/useLoad";
import type { RootStackParamList } from "../navigation/types";
import { useAuth } from "../store/auth";

type Props = NativeStackScreenProps<RootStackParamList, "GroupInfo">;

export default function GroupInfoScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const { learner } = useAuth();
  const community = useCommunity();
  const page = useLoad(async () => {
    const [c, f] = await Promise.all([
      get<Conversation>(`/conversations/${id}`),
      get<Friends>("/friends").catch(() => ({ friends: [], incoming: [], outgoing: [] }) as Friends),
    ]);
    return { c, f };
  }, [id]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<"leave" | "remove-friend" | "block" | null>(null);
  const [removing, setRemoving] = useState<Person | null>(null);
  const [memberMenu, setMemberMenu] = useState<Person | null>(null);
  const [person, setPerson] = useState<Person | null>(null);
  const [reporting, setReporting] = useState<ReportTarget | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invited, setInvited] = useState<string[]>([]);

  const c = page.data?.c;
  const f = page.data?.f;
  const card = community.ready ? community.status.card : true;
  const toCard = () => navigation.navigate("GroupCard", { first: true });

  const relation = useMemo(() => {
    const map = new Map<string, string>();
    f?.friends.forEach((p) => map.set(p.id, "accepted"));
    f?.outgoing.forEach((p) => map.set(p.id, "pending"));
    f?.incoming.forEach((p) => map.set(p.id, "incoming"));
    return map;
  }, [f]);

  const run = (fn: () => Promise<unknown>, after?: () => void) => {
    if (busy) return;
    setBusy(true);
    setError("");
    fn()
      .then(() => {
        after?.();
        void page.reload();
        void community.refresh().catch(() => {});
      })
      .catch((e) => {
        if (needsCard(e)) toCard();
        else setError(friendly(e));
      })
      .finally(() => setBusy(false));
  };

  const openChat = () => {
    if (!c) return;
    const routes = navigation.getState().routes;
    const prev = routes[routes.length - 2];
    if (prev?.name === "GroupChat" && (prev.params as { id?: string } | undefined)?.id === c.id) navigation.goBack();
    else navigation.replace("GroupChat", { id: c.id, name: c.name });
  };
  const call = () =>
    c &&
    run(async () => {
      const info = await post<CallInfo>(`/conversations/${c.id}/call`);
      await community.join(info);
    });

  if (!c) {
    return (
      <View style={groupStyles.page}>
        <ScreenHeader title={route.params.name ?? ""} onBack={() => navigation.goBack()} />
        {page.error ? (
          <Empty icon="alert-circle-outline" title="Not available" text={page.error}>
            <Btn label="Back" kind="outline" onPress={() => navigation.goBack()} />
          </Empty>
        ) : (
          <Empty icon="hourglass-outline" title="Loading" text="One moment." />
        )}
      </View>
    );
  }

  const group = c.kind === "group";
  const admin = group && c.role === "admin";
  const peer = !group ? c.members.find((m) => m.id !== learner?.id) : undefined;
  const others = c.members.filter((m) => m.id !== learner?.id);
  const heir = others.find((m) => m.role !== "admin") ?? others[0];
  const candidates = (f?.friends ?? []).filter((p) => !c.members.some((m) => m.id === p.id));
  const audio = community.status.audio_enabled;
  const first = (name: string) => name.split(/\s+/)[0] || name;

  return (
    <View style={groupStyles.page}>
      <ScreenHeader
        title={group ? c.name : peer?.name ?? c.name}
        sub={group ? (c.public ? "Open study circle" : "Invite-only study circle") : "Friend"}
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={groupStyles.body}>
        {error ? <Notice text={error} style={{ marginTop: 8 }} /> : null}
        {group ? (
          <>
            <View style={styles.top}>
              <CircleMark id={c.id} name={c.name} size={72} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.name}>{c.name}</Text>
                {c.topic ? <Text style={styles.topic}>{c.topic}</Text> : null}
                <Text style={groupStyles.meta}>{circleMeta(c)}</Text>
              </View>
            </View>
            {c.description ? <Text style={styles.desc}>{c.description}</Text> : null}
            <View style={styles.actions}>
              {c.joined ? (
                <>
                  <Btn label="Open the chat" icon="chatbubbles-outline" onPress={openChat} />
                  <View style={styles.actionRow}>
                    {audio ? (
                      <Btn
                        label={c.call_id ? "Join the call" : "Audio call"}
                        icon="call-outline"
                        kind="outline"
                        onPress={call}
                        busy={busy}
                        style={{ flex: 1 }}
                      />
                    ) : null}
                    {admin ? (
                      <Btn label="Invite friends" icon="person-add-outline" kind="outline" onPress={() => setInviteOpen(true)} style={{ flex: 1 }} />
                    ) : null}
                  </View>
                  {admin ? (
                    <Btn
                      label="Edit circle"
                      icon="create-outline"
                      kind="outline"
                      onPress={() => navigation.navigate("GroupNew", { kind: "circle", editId: c.id })}
                    />
                  ) : null}
                </>
              ) : (
                <>
                  <Btn
                    label="Join circle"
                    icon="enter-outline"
                    busy={busy}
                    onPress={() => {
                      if (!card) return toCard();
                      run(() => post(`/groups/${c.id}/join`), () => navigation.replace("GroupChat", { id: c.id, name: c.name }));
                    }}
                  />
                  <Text style={styles.joinNote}>
                    {card
                      ? "You can read everything said so far and leave whenever you like."
                      : "Make your learner card first. It takes a minute."}
                  </Text>
                </>
              )}
            </View>

            <SectionHead title={`Learners · ${c.member_count}`} style={{ marginTop: 26 }} />
            {c.members.map((m) => (
              <PersonRow
                key={m.id}
                p={m}
                sub={m.id === learner?.id ? "You" : undefined}
                onPress={() => (m.id === learner?.id ? undefined : setPerson({ ...m, friendship: relation.get(m.id) ?? null }))}
                right={
                  admin && m.id !== learner?.id ? (
                    <IconBtn icon="ellipsis-horizontal" label={`Options for ${m.name}`} color={T.ink2} onPress={() => setMemberMenu(m)} />
                  ) : undefined
                }
              />
            ))}

            <View style={styles.danger}>
              {c.joined ? (
                <Btn label="Leave circle" icon="exit-outline" kind="danger" onPress={() => setConfirm("leave")} />
              ) : null}
              <Btn
                label="Report this circle"
                icon="flag-outline"
                kind="quiet"
                small
                onPress={() => setReporting({ kind: "circle", id: c.id, label: c.name })}
              />
            </View>
          </>
        ) : peer ? (
          <>
            <View style={styles.top}>
              <Avatar avatarUrl={peer.avatar_url} id={peer.id} name={peer.name} size={72} online={peer.online} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.name}>{peer.name}</Text>
                <Text style={groupStyles.meta}>
                  {levelShort[peer.level]} · <Text style={[sa(14), { color: T.ink3 }]}>{levelSa[peer.level]}</Text>
                </Text>
                <Text style={[groupStyles.meta, peer.online && { color: T.doneInk }]}>
                  {peer.online ? "Online now" : "Friend"}
                </Text>
              </View>
            </View>
            {peer.bio ? <Text style={styles.desc}>“{peer.bio}”</Text> : null}
            <View style={styles.actions}>
              <Btn label={`Message ${first(peer.name)}`} icon="chatbubble-outline" onPress={openChat} />
              {audio ? <Btn label="Audio call" icon="call-outline" kind="outline" busy={busy} onPress={call} /> : null}
            </View>
            <View style={{ marginTop: 22 }}>
              <SheetRow icon="person-remove-outline" label="Remove friend" detail="Your chat closes; you can ask again later" onPress={() => setConfirm("remove-friend")} />
              <SheetRow icon="flag-outline" label={`Report ${first(peer.name)}`} onPress={() => setReporting({ kind: "learner", id: peer.id, label: first(peer.name) })} />
              <SheetRow icon="ban-outline" label={`Block ${first(peer.name)}`} tone="danger" onPress={() => setConfirm("block")} />
            </View>
          </>
        ) : null}
      </ScrollView>

      <Confirm
        visible={confirm === "leave"}
        title={`Leave ${c.name}?`}
        body={
          admin && heir
            ? `You run this circle. When you leave, ${heir.name} becomes its admin.`
            : admin
              ? "You are the last learner here. The circle closes and nobody new can find it."
              : c.public
                ? "You can join again later from Circles."
                : "It is invite only, so you would need the admin to invite you again."
        }
        confirm="Leave"
        danger
        busy={busy}
        onClose={() => setConfirm(null)}
        onConfirm={() =>
          run(
            () => post(`/groups/${c.id}/leave`),
            () => {
              setConfirm(null);
              navigation.navigate("MainTabs");
            },
          )
        }
      />
      <Confirm
        visible={confirm === "remove-friend"}
        title={`Remove ${peer ? first(peer.name) : ""}?`}
        body="Your chat closes. You can send a new friend request later."
        confirm="Remove"
        danger
        busy={busy}
        onClose={() => setConfirm(null)}
        onConfirm={() =>
          peer &&
          run(
            () => post("/friends", { user_id: peer.id, action: "remove" }),
            () => {
              setConfirm(null);
              navigation.navigate("MainTabs");
            },
          )
        }
      />
      <Confirm
        visible={confirm === "block"}
        title={`Block ${peer ? first(peer.name) : ""}?`}
        body="They will not be able to message, call or friend you, and you will not see their messages in circles."
        confirm="Block"
        danger
        busy={busy}
        onClose={() => setConfirm(null)}
        onConfirm={() =>
          peer &&
          run(
            () => post("/friends", { user_id: peer.id, action: "block" }),
            () => {
              setConfirm(null);
              navigation.navigate("MainTabs");
            },
          )
        }
      />
      <Sheet visible={!!memberMenu} onClose={() => setMemberMenu(null)} title={memberMenu?.name} sub={memberMenu ? levelShort[memberMenu.level] : undefined}>
        <SheetRow
          icon="id-card-outline"
          label="See their card"
          onPress={() => {
            const m = memberMenu;
            setMemberMenu(null);
            if (m) setPerson({ ...m, friendship: relation.get(m.id) ?? null });
          }}
        />
        <SheetRow
          icon="remove-circle-outline"
          label="Remove from circle"
          detail="They cannot rejoin unless you invite them"
          tone="danger"
          onPress={() => {
            setRemoving(memberMenu);
            setMemberMenu(null);
          }}
        />
      </Sheet>
      <Confirm
        visible={!!removing}
        title={`Remove ${removing?.name ?? ""}?`}
        body="They leave the circle at once and cannot join again unless you invite them."
        confirm="Remove"
        danger
        busy={busy}
        onClose={() => setRemoving(null)}
        onConfirm={() =>
          removing && run(() => post(`/groups/${c.id}/remove`, { user_id: removing.id }), () => setRemoving(null))
        }
      />
      <Sheet
        visible={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite friends"
        sub="Friends you invite join the circle straight away."
      >
        {candidates.length ? (
          candidates.map((p) => (
            <PersonRow
              key={p.id}
              p={p}
              onPress={() => {}}
              right={
                invited.includes(p.id) ? (
                  <Text style={styles.invited}>Invited</Text>
                ) : (
                  <Btn
                    label="Invite"
                    kind="outline"
                    small
                    disabled={busy}
                    onPress={() => run(() => post(`/groups/${c.id}/invite`, { user_id: p.id }), () => setInvited((v) => [...v, p.id]))}
                  />
                )
              }
            />
          ))
        ) : (
          <Text style={styles.joinNote}>
            {f?.friends.length ? "All your friends are already here." : "Add friends first, then invite them here."}
          </Text>
        )}
        <Btn label="Done" kind="outline" onPress={() => setInviteOpen(false)} style={{ marginTop: 16 }} />
      </Sheet>
      <PersonSheet
        person={person}
        onClose={() => {
          setPerson(null);
          void page.reload();
        }}
        onMessage={(conv) => navigation.navigate("GroupChat", { id: conv.id, name: conv.name })}
        needCard={() => {
          if (card) return false;
          toCard();
          return true;
        }}
      />
      <ReportSheet target={reporting} onClose={() => setReporting(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: 16 },
  name: { ...ui("bold"), fontSize: 22, lineHeight: 28, color: T.ink },
  topic: { ...ui("medium"), fontSize: 15, lineHeight: 21, color: T.ink2 },
  desc: { ...ui("regular"), fontSize: 15.5, lineHeight: 23, color: T.ink2, marginTop: 16 },
  actions: { gap: 10, marginTop: 20 },
  actionRow: { flexDirection: "row", gap: 10 },
  joinNote: { ...ui("regular"), fontSize: 13.5, lineHeight: 19, color: T.ink3 },
  danger: { marginTop: 30, gap: 8, alignItems: "stretch" },
  invited: { ...ui("semibold"), fontSize: 14, color: T.doneInk },
});
