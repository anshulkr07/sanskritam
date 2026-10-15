// Your learner card: the way into Group. Level, one line about you, and
// (the first time) the Saṅgha rules to agree to. A live preview shows what
// other learners will see. Saving the first card is what lets you join
// circles, write, call and add friends; the server checks it too.

import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Ionicons } from "@react-native-vector-icons/ionicons";

import {
  friendly,
  get,
  levelHints,
  levelSa,
  levelShort,
  profile,
  type Level,
  type MyProfile,
} from "../community/api";
import { useCommunity } from "../community/CommunityProvider";
import { T, sa, ui } from "../community/look";
import { Avatar, Btn, Choice, Field, Notice, Overline, ScreenHeader, groupStyles } from "../community/parts";
import { RulesList } from "../community/sheets";
import type { RootStackParamList } from "../navigation/types";
import { haptics } from "../services/haptics";
import { useAuth } from "../store/auth";

type Props = NativeStackScreenProps<RootStackParamList, "GroupCard">;

const LEVELS: Level[] = ["beginner", "intermediate", "advanced", "acharya"];

export default function GroupCardScreen({ navigation }: Props) {
  const { learner } = useAuth();
  const community = useCommunity();
  const [me, setMe] = useState<MyProfile | null>(null);
  const [level, setLevel] = useState<Level>("beginner");
  const [bio, setBio] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let alive = true;
    get<MyProfile>("/profile")
      .then((p) => {
        if (!alive) return;
        setMe(p);
        setLevel(p.level);
        setBio(p.bio);
      })
      .catch((e) => alive && setLoadError(friendly(e, "Could not load your card.")));
    return () => {
      alive = false;
    };
  }, []);

  const first = me ? !me.card : false;
  const name = learner?.display_name || me?.name || "You";
  const save = () => {
    if (busy || !me) return;
    if (first && !agreed) {
      setError("Tick the box to agree to the Saṅgha rules.");
      return;
    }
    setBusy(true);
    setError("");
    profile(level, bio, first && agreed)
      .then(() => {
        haptics.correct();
        void community.refresh().catch(() => {});
        navigation.goBack();
      })
      .catch((e) => setError(friendly(e, "Could not save your card. Try again.")))
      .finally(() => setBusy(false));
  };

  return (
    <View style={groupStyles.page}>
      <ScreenHeader
        title={first ? "Make your learner card" : "Your learner card"}
        sub={first ? "Step 1 of 3 in Group" : "What other learners see"}
        onBack={() => navigation.goBack()}
      />
      <KeyboardAwareScrollView bottomOffset={24} contentContainerStyle={[groupStyles.body, { gap: 22 }]} keyboardShouldPersistTaps="handled">
        {loadError ? <Notice text={loadError} style={{ marginTop: 12 }} /> : null}

        <View style={styles.preview} accessibilityLabel={`Preview: ${name}, ${levelShort[level]}. ${bio}`}>
          <Overline text="How others see you" />
          <View style={styles.previewRow}>
            <Avatar id={learner?.id ?? "me"} name={name} size={56} online />
            <View style={{ flex: 1 }}>
              <Text style={styles.previewName}>{name}</Text>
              <Text style={styles.previewLevel}>
                {levelShort[level]} · <Text style={[sa(14), { color: T.ink3 }]}>{levelSa[level]}</Text>
              </Text>
            </View>
          </View>
          <Text style={[styles.previewBio, !bio.trim() && { color: T.ink3 }]}>
            {bio.trim() ? `“${bio.trim()}”` : "A line about you shows here."}
          </Text>
          <Text style={styles.nameNote}>Your name comes from your account.</Text>
        </View>

        <Choice
          label="Your Sanskrit level"
          value={level}
          onChange={setLevel}
          options={LEVELS.map((l) => ({ key: l, title: levelShort[l], sa: levelSa[l], hint: levelHints[l] }))}
        />

        <Field
          label="A line about you (optional)"
          value={bio}
          onChangeText={setBio}
          max={280}
          multiline
          placeholder="e.g. Reading the Gītā, chapter 2. Happy to practise sandhi."
          hint="What you are reading or want to practise. Keep contact details out of it."
        />

        {first ? (
          <View style={styles.rules}>
            <Text style={styles.rulesTitle}>The Saṅgha rules</Text>
            <RulesList />
            <Pressable
              onPress={() => {
                haptics.tap();
                setAgreed((v) => !v);
                setError("");
              }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: agreed }}
              style={[styles.agree, agreed && styles.agreeOn]}
            >
              <View style={[styles.box, agreed && styles.boxOn]}>
                {agreed ? <Ionicons name="checkmark" size={16} color={T.white} /> : null}
              </View>
              <Text style={styles.agreeText}>I agree to keep to these rules.</Text>
            </Pressable>
          </View>
        ) : null}

        {error ? <Notice text={error} /> : null}
        <Btn
          label={first ? "Make my card" : "Save card"}
          icon={first ? "id-card-outline" : "checkmark"}
          onPress={save}
          busy={busy}
          disabled={!me || (first && !agreed)}
        />
        {first ? (
          <Text style={styles.after}>Next: join a study circle, then add a friend to practise with.</Text>
        ) : null}
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  preview: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.line, padding: 16, gap: 12, marginTop: 14 },
  previewRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  previewName: { ...ui("bold"), fontSize: 20, lineHeight: 26, color: T.ink },
  previewLevel: { ...ui("regular"), fontSize: 14, lineHeight: 20, color: T.ink3 },
  previewBio: { ...ui("regular"), fontSize: 15.5, lineHeight: 23, color: T.ink2 },
  nameNote: { ...ui("regular"), fontSize: 12.5, color: T.ink3 },
  rules: { gap: 14, paddingTop: 18, borderTopWidth: 1, borderTopColor: T.line },
  rulesTitle: { ...ui("bold"), fontSize: 17, color: T.ink },
  agree: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingHorizontal: 14, borderWidth: 1.5, borderColor: T.lineStrong, backgroundColor: T.surface },
  agreeOn: { borderColor: T.action },
  box: { width: 24, height: 24, borderWidth: 1.5, borderColor: T.ink2, alignItems: "center", justifyContent: "center" },
  boxOn: { backgroundColor: T.action, borderColor: T.action },
  agreeText: { ...ui("semibold"), flex: 1, fontSize: 15.5, color: T.ink },
  after: { ...ui("regular"), fontSize: 13.5, lineHeight: 19, color: T.ink3, textAlign: "center", marginTop: -8 },
});
