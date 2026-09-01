// Onboarding / login. Dev-login via display name (backend has no password
// auth yet). The "one tap" reuse of a saved name keeps re-entry frictionless.

import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../store/auth";
import { color, font, radius, shadow, space } from "../theme";

export default function LoginScreen() {
  const { login, displayName, loading } = useAuth();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill with the remembered name (if any) so re-login is one tap.
  useEffect(() => {
    if (displayName) setName(displayName);
  }, [displayName]);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed || loading) return;
    setBusy(true);
    setError(null);
    try {
      await login(trimmed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not connect. Is the backend running?");
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = name.trim().length > 0 && !busy;

  return (
    <LinearGradient colors={[color.bg, "#FFF1DD"]} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboard}
        >
          <View style={styles.content}>
            {/* Lockup */}
            <View style={styles.logoRow}>
              <View style={styles.logoBadge}>
                <Text style={styles.logoGlyph}>श्</Text>
              </View>
              <Text style={styles.logoWord}>Shabd</Text>
            </View>
            <Text style={styles.tagline}>Speak Sanskrit. A word at a time.</Text>

            {/* Card */}
            <View style={styles.card}>
              <Text style={styles.heading}>नमस्ते 🙏</Text>
              <Text style={styles.subheading}>What should we call you?</Text>

              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={color.inkFaint}
                style={styles.input}
                autoCorrect={false}
                autoCapitalize="words"
                returnKeyType="go"
                onSubmitEditing={submit}
                editable={!busy}
              />

              {!!error && <Text style={styles.error}>{error}</Text>}

              <Pressable
                disabled={!canSubmit}
                onPress={submit}
                style={({ pressed }) => [
                  styles.signupBtn,
                  !canSubmit && styles.signupBtnDisabled,
                  pressed && styles.signupBtnPressed,
                ]}
              >
                <Text style={styles.signupText}>{busy ? "Starting…" : "Start learning"}</Text>
              </Pressable>
            </View>

            <Text style={styles.footnote}>
              Your tutor speaks a little Sanskrit and a lot of your language,{`\n`}and raises the
              Sanskrit share as you grow.
            </Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  keyboard: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: space.lg,
    justifyContent: "center",
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: space.sm, marginBottom: space.xs },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: color.saffron,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.button,
  },
  logoGlyph: { color: color.white, fontSize: 24, fontWeight: "800" },
  logoWord: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.xxl,
    color: color.ink,
  },
  tagline: {
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
    fontSize: font.sizes.base,
    color: color.inkSoft,
    marginBottom: space.xl,
  },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.xl,
    padding: space.lg,
    ...shadow.card,
  },
  heading: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.xl,
    color: color.ink,
  },
  subheading: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
    marginTop: space.xs,
    marginBottom: space.md,
  },
  input: {
    borderWidth: 2,
    borderColor: color.border,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.md - 2,
    fontSize: font.sizes.base,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
    color: color.ink,
    backgroundColor: color.surface,
  },
  error: {
    color: color.bad,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
    fontSize: font.sizes.sm,
    marginTop: space.sm,
  },
  signupBtn: {
    marginTop: space.md,
    backgroundColor: color.saffron,
    borderRadius: radius.md,
    paddingVertical: space.md + 2,
    alignItems: "center",
    ...shadow.button,
  },
  signupBtnPressed: { transform: [{ translateY: 1 }] },
  signupBtnDisabled: { opacity: 0.5 },
  signupText: {
    color: color.white,
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.base,
  },
  footnote: {
    marginTop: space.lg,
    textAlign: "center",
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    fontSize: font.sizes.sm,
    color: color.inkFaint,
    lineHeight: 20,
  },
});