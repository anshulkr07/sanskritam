// Start a study circle, start a live room, or edit a circle you run.
// A circle: a name, what it studies, the text or topic, a level, and open
// or invite only. A room: a title, a topic and a level; it goes live at once
// with you as host and your mic off.

import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Ionicons } from "@react-native-vector-icons/ionicons";

import {
  friendly,
  get,
  levelHints,
  levelSa,
  levelShort,
  needsCard,
  post,
  put,
  type Conversation,
  type Room,
} from "../community/api";
import { useCommunity } from "../community/CommunityProvider";
import { T, ui } from "../community/look";
import { Btn, Choice, Field, Notice, ScreenHeader, groupStyles } from "../community/parts";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "GroupNew">;

type LevelKey = "all" | "beginner" | "intermediate" | "advanced" | "acharya";
const LEVEL_OPTIONS: { key: LevelKey; title: string; sa?: string; hint?: string }[] = [
  { key: "all", title: "Every level", hint: "Beginners and fluent readers together" },
  ...(["beginner", "intermediate", "advanced", "acharya"] as const).map((l) => ({
    key: l,
    title: levelShort[l],
    sa: levelSa[l],
    hint: levelHints[l],
  })),
];

export default function GroupNewScreen({ navigation, route }: Props) {
  const { kind, editId } = route.params;
  const community = useCommunity();
  const room = kind === "room";
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState<LevelKey>("all");
  const [open, setOpen] = useState<"open" | "invite">("open");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(!editId);

  useEffect(() => {
    if (!editId) return;
    let alive = true;
    get<Conversation>(`/conversations/${editId}`)
      .then((c) => {
        if (!alive) return;
        setName(c.name);
        setDescription(c.description);
        setTopic(c.topic);
        setLevel((c.level as LevelKey) || "all");
        setOpen(c.public ? "open" : "invite");
        setLoaded(true);
      })
      .catch((e) => alive && setError(friendly(e)));
    return () => {
      alive = false;
    };
  }, [editId]);

  const submit = () => {
    if (busy || !name.trim()) return;
    setBusy(true);
    setError("");
    const body = room
      ? { title: name.trim(), topic: topic.trim(), level }
      : { name: name.trim(), description: description.trim(), topic: topic.trim(), level, public: open === "open" };
    const go = async () => {
      if (room) {
        const r = await post<Room>("/rooms", body);
        await community.join({ id: r.id, title: r.title, kind: "audio_room", host_id: r.host.id });
        navigation.goBack();
      } else if (editId) {
        await put<Conversation>(`/groups/${editId}`, body);
        navigation.goBack();
      } else {
        const c = await post<Conversation>("/groups", body);
        navigation.replace("GroupChat", { id: c.id, name: c.name });
      }
      void community.refresh().catch(() => {});
    };
    go()
      .catch((e) => {
        if (needsCard(e)) navigation.replace("GroupCard", { first: true });
        else setError(friendly(e));
      })
      .finally(() => setBusy(false));
  };

  const title = room ? "Start a live room" : editId ? "Edit circle" : "New study circle";
  return (
    <View style={groupStyles.page}>
      <ScreenHeader
        title={title}
        sub={room ? "Audio only · you host" : editId ? "Only you, the admin, can change this" : "You will be its admin"}
        onBack={() => navigation.goBack()}
      />
      <KeyboardAwareScrollView bottomOffset={24} contentContainerStyle={[groupStyles.body, { gap: 22, paddingTop: 16 }]} keyboardShouldPersistTaps="handled">
        {room ? (
          <View style={styles.note}>
            <Ionicons name="radio-outline" size={20} color={T.ink2} />
            <Text style={styles.noteText}>
              Rooms are audio only and go live as soon as you start. Your mic starts off. Listeners raise a hand, and you
              choose who speaks. The room ends when you leave.
            </Text>
          </View>
        ) : null}
        <Field
          label={room ? "Room title" : "Circle name"}
          value={name}
          onChangeText={setName}
          max={80}
          autoFocus={!editId}
          placeholder={room ? "e.g. Ordering food in Sanskrit" : "e.g. Gītā reading circle"}
        />
        {!room ? (
          <Field
            label="What will you study together? (optional)"
            value={description}
            onChangeText={setDescription}
            max={500}
            multiline
            placeholder="e.g. One verse a day from chapter 2, with word-by-word meanings. Questions welcome."
          />
        ) : null}
        <Field
          label={room ? "Topic (optional)" : "Text or topic (optional)"}
          value={topic}
          onChangeText={setTopic}
          max={room ? 160 : 80}
          placeholder={room ? "e.g. Numbers 1 to 10, then prices" : "e.g. Bhagavad Gītā, chapter 2"}
        />
        <Choice label="Who is it for?" value={level} onChange={setLevel} options={LEVEL_OPTIONS} />
        {!room ? (
          <Choice
            label="Who can join?"
            value={open}
            onChange={setOpen}
            options={[
              { key: "open", title: "Anyone", hint: "Listed in Circles; any learner with a card can join" },
              { key: "invite", title: "Invite only", hint: "Hidden; you add friends to it" },
            ]}
          />
        ) : null}
        {error ? <Notice text={error} /> : null}
        <Btn
          label={room ? "Go live" : editId ? "Save changes" : "Create circle"}
          icon={room ? "radio" : editId ? "checkmark" : "add"}
          onPress={submit}
          busy={busy}
          disabled={!loaded || !name.trim() || (room && !community.status.audio_enabled)}
        />
        {room && !community.status.audio_enabled ? (
          <Text style={styles.off}>Live audio is not switched on yet, so rooms cannot start.</Text>
        ) : null}
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  note: { flexDirection: "row", gap: 12, padding: 14, backgroundColor: T.surface, borderWidth: 1, borderColor: T.line },
  noteText: { ...ui("regular"), flex: 1, fontSize: 14, lineHeight: 20, color: T.ink2 },
  off: { ...ui("regular"), fontSize: 13.5, color: T.ink3, textAlign: "center", marginTop: -8 },
});
