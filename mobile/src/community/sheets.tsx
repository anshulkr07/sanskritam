// Group's shared sheets: the Saṅgha rules, reporting something, and a
// learner's card with what you can do about them (add, message, remove,
// report, block). Square, one primary action each.

import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { friendly, levelShort, levelSa, post, report, type Conversation, type Person, type ReportKind } from "./api";
import { useCommunity } from "./CommunityProvider";
import { T, ui } from "./look";
import { Avatar, Btn, Confirm, Sheet, SheetRow } from "./parts";

export const RULES: { title: string; text: string }[] = [
  { title: "Be kind", text: "Everyone here is learning. Mistakes are how Sanskrit is learnt, so correct gently." },
  { title: "Keep it about learning", text: "Sanskrit, the texts, and how to study them." },
  { title: "Nothing hurtful", text: "No hate, harassment, sexual content, scams or spam." },
  { title: "Keep details private", text: "Do not share phone numbers, addresses or anyone else's details." },
  { title: "Report what breaks these", text: "Long-press a message, or open a circle or a learner, to report it. Circle admins can delete messages and remove learners." },
];

export function RulesList() {
  return (
    <View style={styles.rules}>
      {RULES.map((r, i) => (
        <View key={r.title} style={styles.rule}>
          <Text style={styles.ruleNum}>{i + 1}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.ruleTitle}>{r.title}</Text>
            <Text style={styles.ruleText}>{r.text}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export function RulesSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Saṅgha rules" sub="What everyone in Group agrees to.">
      <RulesList />
      <Btn label="Close" kind="outline" onPress={onClose} style={{ marginTop: 16 }} />
    </Sheet>
  );
}

const REASONS = [
  "Spam or advertising",
  "Rude or hurtful",
  "Sexual or violent",
  "Not about learning",
  "Shares private details",
  "Something else",
];

export interface ReportTarget {
  kind: ReportKind;
  id: string;
  /** What is being reported, in words: "Bharat's message", "Gītā circle". */
  label: string;
}

export function ReportSheet({ target, onClose }: { target: ReportTarget | null; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setBusy(false);
    setError("");
    setDone(false);
  }, [target?.id, target?.kind]);
  const send = (reason: string) => {
    if (!target || busy) return;
    setBusy(true);
    setError("");
    report(target.kind, target.id, reason)
      .then(() => setDone(true))
      .catch((e) => setError(friendly(e, "Could not send the report. Try again.")))
      .finally(() => setBusy(false));
  };
  return (
    <Sheet
      visible={!!target}
      onClose={onClose}
      title={done ? "Thank you" : `Report ${target?.label ?? ""}`}
      sub={done ? undefined : "What is wrong with it?"}
    >
      {done ? (
        <>
          <Text style={styles.body}>
            The report is saved for the Sanskritam team to review. You can also block the learner so you no longer see
            them.
          </Text>
          <Btn label="Done" onPress={onClose} style={{ marginTop: 16 }} />
        </>
      ) : (
        <>
          {REASONS.map((r) => (
            <SheetRow key={r} icon="flag-outline" label={r} onPress={() => send(r)} disabled={busy} />
          ))}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Btn label="Cancel" kind="outline" onPress={onClose} style={{ marginTop: 16 }} disabled={busy} />
        </>
      )}
    </Sheet>
  );
}

/**
 * A learner's card. What it offers follows the friendship: add, accept,
 * cancel, or message and remove; report and block always.
 */
export function PersonSheet({
  person,
  onClose,
  onMessage,
  needCard,
}: {
  person: Person | null;
  onClose: () => void;
  /** Open (or create) the direct chat with this friend. */
  onMessage: (c: Conversation) => void;
  /** Called instead of an action that needs your learner card. */
  needCard: () => boolean;
}) {
  const community = useCommunity();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [state, setState] = useState<string | null | undefined>(undefined);
  const [confirm, setConfirm] = useState<"block" | "remove" | null>(null);
  const [reporting, setReporting] = useState<ReportTarget | null>(null);
  useEffect(() => {
    setState(person?.friendship);
    setError("");
    setBusy(false);
    setConfirm(null);
  }, [person?.id, person?.friendship]);
  if (!person) return <Sheet visible={false} onClose={onClose}><View /></Sheet>;
  const first = person.name.split(/\s+/)[0] || person.name;
  const act = (action: string, after?: (r: unknown) => void) => {
    if (busy) return;
    if (action === "request" && needCard()) return;
    setBusy(true);
    setError("");
    post<unknown>("/friends", { user_id: person.id, action })
      .then((r) => {
        after?.(r);
        void community.refresh().catch(() => {});
      })
      .catch((e) => setError(friendly(e)))
      .finally(() => setBusy(false));
  };
  const message = () => {
    if (busy) return;
    setBusy(true);
    post<Conversation>("/direct", { user_id: person.id })
      .then((c) => {
        onClose();
        onMessage(c);
      })
      .catch((e) => setError(friendly(e)))
      .finally(() => setBusy(false));
  };
  return (
    <>
      <Sheet visible={!confirm && !reporting} onClose={onClose}>
        <View style={styles.personTop}>
          <Avatar avatarUrl={person.avatar_url} id={person.id} name={person.name} size={64} online={person.online} />
          <View style={{ flex: 1 }}>
            <Text style={styles.personName}>{person.name}</Text>
            <Text style={styles.personMeta}>
              {levelShort[person.level] ?? "Beginner"} · <Text style={styles.personSa}>{levelSa[person.level] ?? ""}</Text>
              {person.online ? "  ·  Online now" : ""}
            </Text>
          </View>
        </View>
        {person.bio ? <Text style={styles.bio}>“{person.bio}”</Text> : null}
        <View style={styles.personActions}>
          {state === "accepted" ? (
            <Btn label={`Message ${first}`} icon="chatbubble-outline" onPress={message} busy={busy} />
          ) : state === "incoming" ? (
            <Btn label="Accept friend request" icon="checkmark" onPress={() => act("accept", () => setState("accepted"))} busy={busy} />
          ) : state === "pending" ? (
            <Btn label="Cancel request" kind="outline" onPress={() => act("cancel", () => setState(null))} busy={busy} />
          ) : (
            <Btn label="Add friend" icon="person-add-outline" onPress={() => act("request", () => setState("pending"))} busy={busy} />
          )}
          {state === "pending" ? <Text style={styles.waiting}>Request sent. You can chat once {first} accepts.</Text> : null}
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={{ marginTop: 8 }}>
          {state === "accepted" ? (
            <SheetRow icon="person-remove-outline" label="Remove friend" onPress={() => setConfirm("remove")} />
          ) : null}
          <SheetRow icon="flag-outline" label={`Report ${first}`} onPress={() => setReporting({ kind: "learner", id: person.id, label: first })} />
          <SheetRow icon="ban-outline" label={`Block ${first}`} tone="danger" onPress={() => setConfirm("block")} />
        </View>
      </Sheet>
      <Confirm
        visible={confirm === "remove"}
        title={`Remove ${first}?`}
        body="Your chat with them closes. You can send a new friend request later."
        confirm="Remove"
        danger
        busy={busy}
        onClose={() => setConfirm(null)}
        onConfirm={() =>
          act("remove", () => {
            setConfirm(null);
            setState(null);
          })
        }
      />
      <Confirm
        visible={confirm === "block"}
        title={`Block ${first}?`}
        body="They will not be able to message, call or friend you, and you will not see their messages in circles. The friendship ends."
        confirm="Block"
        danger
        busy={busy}
        onClose={() => setConfirm(null)}
        onConfirm={() =>
          act("block", () => {
            setConfirm(null);
            onClose();
          })
        }
      />
      <ReportSheet target={reporting} onClose={() => setReporting(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  rules: { gap: 14 },
  rule: { flexDirection: "row", gap: 12 },
  ruleNum: { ...ui("bold"), width: 26, height: 26, textAlign: "center", lineHeight: 24, fontSize: 14, color: T.action, borderWidth: 1.5, borderColor: T.action },
  ruleTitle: { ...ui("semibold"), fontSize: 15.5, lineHeight: 21, color: T.ink },
  ruleText: { ...ui("regular"), fontSize: 14, lineHeight: 20, color: T.ink2 },
  body: { ...ui("regular"), fontSize: 15.5, lineHeight: 23, color: T.ink2 },
  error: { ...ui("medium"), fontSize: 14, lineHeight: 20, color: T.wrongInk, marginTop: 10 },
  personTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  personName: { ...ui("bold"), fontSize: 21, lineHeight: 27, color: T.ink },
  personMeta: { ...ui("regular"), fontSize: 14, lineHeight: 20, color: T.ink3 },
  personSa: { fontFamily: "TiroDevanagariSanskrit_400Regular", fontWeight: "400", fontSize: 14, color: T.ink3 },
  bio: { ...ui("regular"), fontSize: 15.5, lineHeight: 23, color: T.ink2, marginTop: 14 },
  personActions: { gap: 8, marginTop: 16 },
  waiting: { ...ui("regular"), fontSize: 13.5, lineHeight: 19, color: T.ink3 },
});
