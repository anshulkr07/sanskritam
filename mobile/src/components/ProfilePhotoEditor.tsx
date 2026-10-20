import React, { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../store/auth";
import { chooseProfilePhoto, removeProfilePhoto, linkCommunityAccount } from "../services/profilePhoto";
const friendly = (e: unknown, fallback = "Please try again.") => e instanceof Error ? e.message : fallback;
import ProfileImage from "./ProfileImage";
import { color } from "../theme";

export default function ProfilePhotoEditor() {
  const { learner, refresh } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { void refresh(); }, [refresh]);
  const change = async (remove = false) => {
    if (busy) return;
    setError(""); setBusy(true);
    try {
      const result = await (remove ? removeProfilePhoto() : chooseProfilePhoto());
      if (result) await refresh();
    } catch (e) { setError(friendly(e, "Could not update your picture. Try again.")); }
    finally { setBusy(false); }
  };
  const link = async (provider: "google" | "apple") => {
    if (busy) return;
    setError(""); setBusy(true);
    try {
      if (await linkCommunityAccount(provider)) await refresh();
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (!["ERR_REQUEST_CANCELED", "SIGN_IN_CANCELLED", "12501"].includes(code || ""))
        setError(friendly(e, "Could not verify sign-in. Try again."));
    } finally { setBusy(false); }
  };
  // Settings' first row (option S1): a square picture, the name, and the
  // picture action as a text link. Sign-in links and notes sit under it.
  const verified = !learner?.community_suspended && !!learner?.community_verified;
  return <View style={styles.wrap}>
    <View style={styles.row}>
      <View style={styles.avatar}>
        <Text style={styles.initial}>{learner?.display_name?.charAt(0).toUpperCase() || "?"}</Text>
        <ProfileImage uri={learner?.avatar_url} />
      </View>
      <Text style={styles.name} numberOfLines={1}>{learner?.display_name || "Friend"}</Text>
      {verified && <Pressable disabled={busy} onPress={() => void change()} accessibilityRole="button" style={styles.link}>
        <Text style={styles.linkText}>{busy ? "Checking…" : learner?.avatar_url ? "Change photo" : "Add photo"}</Text>
      </Pressable>}
    </View>
    {verified && !!learner?.avatar_url && <Pressable disabled={busy} onPress={() => void change(true)} accessibilityRole="button" style={styles.remove}>
      <Text style={styles.removeText}>Remove picture</Text>
    </Pressable>}
    {verified && <Text style={styles.hint}>Pictures are checked for harmful content before they are saved. Avoid contact details and identity documents.</Text>}
    {learner?.community_suspended ? <Text style={styles.error}>Profile changes are restricted. Contact support for a review.</Text> : !learner?.community_verified ?
      <View style={{ gap: 8 }}>
        <Text style={styles.hint}>Sign in to add an account picture. Linking a new account keeps your current learning profile.</Text>
        {Platform.OS !== "web" ? <Pressable disabled={busy} style={styles.button} onPress={() => void link("google")} accessibilityRole="button">
          <Text style={styles.buttonText}>Continue with Google</Text>
        </Pressable> : <Text style={styles.hint}>Open the installed app to verify your sign-in.</Text>}
        {Platform.OS === "ios" && <Pressable disabled={busy} style={styles.button} onPress={() => void link("apple")} accessibilityRole="button">
          <Text style={styles.buttonText}>Continue with Apple</Text>
        </Pressable>}
      </View> : null}
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
  </View>;
}

const styles = StyleSheet.create({
  wrap: { gap: 8, paddingTop: 8, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: color.border },
  row: { flexDirection: "row", gap: 12, alignItems: "center" },
  avatar: { width: 40, height: 40, overflow: "hidden", backgroundColor: color.saffronBtn, alignItems: "center", justifyContent: "center" },
  initial: { color: color.white, fontSize: 18, fontFamily: "Nunito_800ExtraBold" },
  name: { flex: 1, color: color.ink, fontSize: 16, fontFamily: "Nunito_800ExtraBold", fontWeight: "800" },
  link: { minHeight: 44, justifyContent: "center" },
  linkText: { color: color.saffronText, fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 13 },
  button: { alignSelf: "flex-start", borderWidth: 1, borderColor: color.ink, paddingHorizontal: 14, height: 40, justifyContent: "center" },
  buttonText: { color: color.ink, fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 14 },
  remove: { alignSelf: "flex-start", minHeight: 36, justifyContent: "center" }, removeText: { color: color.inkSoft, fontFamily: "Nunito_700Bold", fontSize: 13 },
  hint: { color: color.inkSoft, fontFamily: "Nunito_600SemiBold", fontSize: 12.5, lineHeight: 19 },
  error: { color: color.badText, fontFamily: "Nunito_700Bold", fontSize: 13, lineHeight: 19 },
});
