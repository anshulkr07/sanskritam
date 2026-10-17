// ContestRules: numbered legal points from the server + eligibility steps.
// Entry needs, in order: Google/Apple sign-in, public name, 18+, rules
// acceptance, recording consent. Each step saves to the server so a partial
// save never blocks the next one (backend PUT accepts partial bodies).

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ApiError, api } from "../api/client";
import type { RootStackParamList } from "../navigation/types";
import { color } from "../theme";
import { plain } from "../utils/text";

const CONSENT_KEY = "shabd.recite.cameraConsent";

type Props = NativeStackScreenProps<RootStackParamList, "ContestRules">;

function errText(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.message) return e.message;
    if (e.status === 422) return "That name is not allowed. Use 3 to 24 letters, spaces, dots, dashes or underscores.";
    return `Could not save (${e.status}). Check your connection and try again.`;
  }
  return "Could not save. Check your connection and try again.";
}

export default function ContestRulesScreen({ navigation }: Props) {
  const [rules, setRules] = useState<string[]>([]);
  const [version, setVersion] = useState("");
  const [rulesFailed, setRulesFailed] = useState(false);

  const [name, setName] = useState("");
  const [savedName, setSavedName] = useState("");
  const [ageDone, setAgeDone] = useState(false);
  const [rulesDone, setRulesDone] = useState(false);
  const [consentDone, setConsentDone] = useState(false);

  const [busy, setBusy] = useState<"none" | "name" | "age" | "rules" | "consent">("none");
  const [error, setError] = useState("");
  const [doneMsg, setDoneMsg] = useState("");

  useEffect(() => {
    api.competitionRules().then((r) => {
      setRules(r.rules ?? []);
      setVersion(r.version ?? "");
      if (!(r.rules ?? []).length) setRulesFailed(true);
    }).catch(() => setRulesFailed(true));
    api.publicProfile().then((p) => {
      setName(p.public_name ?? "");
      setSavedName(p.public_name ?? "");
      setAgeDone(!!p.age_confirmed);
      setRulesDone(!!p.rules_version);
      setConsentDone(!!p.recordings_consent);
    }).catch(() => {});
  }, []);

  const saveName = async () => {
    setError("");
    setDoneMsg("");
    const v = name.trim();
    if (v.length < 3 || v.length > 24) {
      setError("Public name needs 3 to 24 characters.");
      return;
    }
    setBusy("name");
    try {
      const p = await api.savePublicProfile({ public_name: v });
      setSavedName(p.public_name);
      setDoneMsg("Name saved.");
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy("none");
    }
  };

  const saveAge = async () => {
    setError("");
    setDoneMsg("");
    setBusy("age");
    try {
      await api.savePublicProfile({ age_confirmed: true });
      setAgeDone(true);
      setDoneMsg("Age confirmed.");
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy("none");
    }
  };

  const accept = async () => {
    setError("");
    setDoneMsg("");
    if (!version) {
      setError("Rules are still loading. Wait a moment and try again.");
      return;
    }
    setBusy("rules");
    try {
      await AsyncStorage.setItem(CONSENT_KEY, "1");
      const p = await api.savePublicProfile({ rules_version: version, rules_accepted: true });
      setRulesDone(!!p.rules_version);
      setDoneMsg("Rules accepted.");
      maybeDone(!!p.rules_version, consentDone, !!savedName, ageDone);
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy("none");
    }
  };

  const saveConsent = async () => {
    setError("");
    setDoneMsg("");
    setBusy("consent");
    try {
      await api.savePublicProfile({ recordings_consent: true });
      setConsentDone(true);
      setDoneMsg("Recording consent saved.");
      maybeDone(rulesDone, true, !!savedName, ageDone);
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy("none");
    }
  };

  const maybeDone = (r: boolean, c: boolean, hasName: boolean, age: boolean) => {
    if (r && c && hasName && age) {
      setDoneMsg("You are entered. Going back to the competition.");
      setTimeout(() => navigation.goBack(), 600);
    }
  };

  const allDone = !!savedName && ageDone && rulesDone && consentDone;

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Text style={styles.title} accessibilityRole="header">Competition rules</Text>
      {rulesFailed && (
        <Text style={styles.hint}>Could not load the rules. Check your connection and reopen this page.</Text>
      )}
      {rules.map((r, i) => (
        <Text key={i} style={styles.point}>{i + 1}. {plain(r)}</Text>
      ))}
      {!!version && <Text style={styles.hint}>Rules version {version}</Text>}

      <Text style={styles.section}>1. Your public name</Text>
      <Text style={styles.hint}>Shown on leaderboards and certificates. Guest accounts also need Google or Apple sign-in to enter.</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="e.g. ShlokaFan"
        autoCapitalize="none"
        accessibilityLabel="Public name"
        style={styles.input}
      />
      <Pressable onPress={() => void saveName()} accessibilityRole="button" accessibilityLabel="Save public name" style={styles.sec}>
        <Text style={styles.secText}>{busy === "name" ? "Saving" : savedName ? "Save name" : "Save name"} {savedName ? `(${savedName})` : ""}</Text>
      </Pressable>

      <Text style={styles.section}>2. Age</Text>
      <Pressable onPress={() => void saveAge()} accessibilityRole="button" accessibilityLabel="I am 18 or older" style={styles.sec}>
        <Text style={styles.secText}>{ageDone ? "Confirmed: 18 or older" : "I am 18 or older"}</Text>
      </Pressable>

      <Text style={styles.section}>3. Accept the rules</Text>
      <View style={styles.row}>
        <Pressable onPress={() => void accept()} accessibilityRole="button" accessibilityLabel="I accept the rules" style={styles.accept}>
          {busy === "rules" ? <ActivityIndicator color="#FFF8EE" /> : <Text style={styles.acceptText}>{rulesDone ? "Accepted" : "I accept"}</Text>}
        </Pressable>
      </View>

      <Text style={styles.section}>4. Recording consent</Text>
      <Text style={styles.hint}>Your best recording of each verse is kept privately until 30 days after the results so entries can be checked, then deleted.</Text>
      <Pressable onPress={() => void saveConsent()} accessibilityRole="button" accessibilityLabel="I agree to recording storage" style={styles.sec}>
        <Text style={styles.secText}>{consentDone ? "Consent saved" : "I agree"}</Text>
      </Pressable>

      {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
      {!!doneMsg && <Text style={styles.ok}>{doneMsg}</Text>}
      {allDone && (
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Back to competition" style={styles.accept}>
          <Text style={styles.acceptText}>Back to competition</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 8, paddingBottom: 120 },
  title: { fontSize: 22, fontWeight: "800", color: color.ink },
  point: { fontSize: 14, color: color.ink, lineHeight: 21 },
  hint: { fontSize: 13, color: color.inkSoft },
  section: { fontSize: 16, fontWeight: "800", color: color.ink, marginTop: 12 },
  input: { minHeight: 48, borderWidth: 1.5, borderColor: "#D9C9AE", borderRadius: 12, paddingHorizontal: 12, fontSize: 16, color: color.ink, backgroundColor: "#FFFDF8" },
  row: { flexDirection: "row", gap: 8 },
  accept: { minHeight: 48, flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: color.ink, borderRadius: 12, marginTop: 4 },
  acceptText: { color: "#FFF8EE", fontWeight: "800" },
  sec: { minHeight: 48, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#D9C9AE", borderRadius: 12, marginTop: 4 },
  secText: { color: color.ink, fontWeight: "700" },
  error: { fontSize: 14, color: color.badText, marginTop: 8 },
  ok: { fontSize: 14, color: color.ink, fontWeight: "700", marginTop: 8 },
});
