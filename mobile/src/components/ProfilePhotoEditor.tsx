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
  return <View style={styles.wrap}>
    <View style={styles.row}>
      <View style={styles.avatar}>
        <Text style={styles.initial}>{learner?.display_name?.charAt(0).toUpperCase() || "?"}</Text>
        <ProfileImage uri={learner?.avatar_url} />
      </View>
      <View style={{ flex: 1, gap: 10 }}>
        <Pressable disabled={busy} onPress={() => void change()} accessibilityRole="button" style={styles.button}>
          <Text style={styles.buttonText}>{busy ? "Checking picture…" : learner?.avatar_url ? "Change profile picture" : "Upload profile picture"}</Text>
        </Pressable>
        {!!learner?.avatar_url && <Pressable disabled={busy} onPress={() => void change(true)} accessibilityRole="button" style={styles.remove}>
          <Text style={styles.removeText}>Remove picture</Text>
        </Pressable>}
      </View>
    </View>
    <Text style={styles.hint}>Your optional account picture is checked for harmful content before it is saved. Avoid contact details and identity documents.</Text>
    {learner?.community_suspended ? <Text style={styles.error}>Profile changes are restricted. Contact support for a review.</Text> : !learner?.community_verified ?
      <View style={{ gap: 10 }}>
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
  wrap: { gap: 12, paddingVertical: 12 }, row: { flexDirection: "row", gap: 16, alignItems: "center" },
  avatar: { width: 64, height: 64, borderRadius: 32, overflow: "hidden", backgroundColor: color.saffronBtn, alignItems: "center", justifyContent: "center" },
  initial: { color: color.white, fontSize: 24, fontFamily: "Nunito_700Bold" },
  button: { backgroundColor: color.saffronBtn, paddingHorizontal: 14, minHeight: 44, justifyContent: "center", borderRadius: 10 },
  buttonText: { color: color.white, fontFamily: "Nunito_700Bold", fontSize: 14 },
  remove: { minHeight: 44, justifyContent: "center" }, removeText: { color: color.inkSoft, fontFamily: "Nunito_700Bold", fontSize: 14 },
  hint: { color: color.inkSoft, fontFamily: "Nunito_400Regular", fontSize: 13, lineHeight: 19 },
  error: { color: color.badText, fontFamily: "Nunito_700Bold", fontSize: 13, lineHeight: 19 },
});
