// Onboarding / login. Three light steps: display name, bridge language(s),
// starting Sanskrit ratio. Skippable — "Skip for now" creates an anonymous
// learner with defaults and lands on Home.

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

type Step = "name" | "langs" | "ratio";

export default function LoginScreen() {
  const { login, finishOnboarding, displayName, loading } = useAuth();
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [langs, setLangs] = useState<string[]>(["en", "hi"]);
  const [ratio, setRatio] = useState(0.3);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill remembered name
  useEffect(() => {
    if (displayName) setName(displayName);
  }, [displayName]);

  const submit = async () => {
    if (step === "name") {
      const trimmed = name.trim();
      if (!trimmed) return;
      setStep("langs");
      return;
    }
    if (step === "langs") {
      setStep("ratio");
      return;
    }
    // Final step: login and finish onboarding
    const trimmed = name.trim() || "Learner";
    setBusy(true);
    setError(null);
    try {
      await login(trimmed);
      await finishOnboarding();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not connect. Is the backend running?");
    } finally {
      setBusy(false);
    }
  };

  const skip = async () => {
    try {
      const trimmed = name.trim() || "Learner";
      await login(trimmed);
      await finishOnboarding();
    } catch {
      // Even if login fails, mark onboarded so the user sees the app
      await finishOnboarding();
    }
  };

  const toggleLang = (lang: string) => {
    setLangs((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
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
              {step === "name" && (
                <>
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
                </>
              )}

              {step === "langs" && (
                <>
                  <Text style={styles.heading}>भाषा</Text>
                  <Text style={styles.subheading}>
                    Which languages do you speak? I'll use them to help you learn.
                  </Text>
                  <View style={styles.langRow}>
                    {["en", "hi"].map((l) => (
                      <Pressable
                        key={l}
                        onPress={() => toggleLang(l)}
                        style={[
                          styles.langChip,
                          langs.includes(l) && styles.langChipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.langChipText,
                            langs.includes(l) && styles.langChipTextActive,
                          ]}
                        >
                          {l === "en" ? "English" : "हिन्दी"}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}

              {step === "ratio" && (
                <>
                  <Text style={styles.heading}>Sanskrit share</Text>
                  <Text style={styles.subheading}>
                    How much Sanskrit do you want to hear?{'\n'}
                    I start mostly in your language and add more Sanskrit as you grow.
                  </Text>
                  <View style={styles.ratioDisplay}>
                    <Text style={styles.ratioLabel}>
                      {ratio <= 0.2 ? "Mostly English" :
                       ratio <= 0.4 ? "Mostly Hindi" :
                       ratio <= 0.6 ? "Balanced" :
                       ratio <= 0.8 ? "Mostly Sanskrit" :
                       "Almost all Sanskrit"}
                    </Text>
                    <Text style={styles.ratioValue}>{Math.round(ratio * 100)}%</Text>
                    <Text style={styles.ratioHint}>Sanskrit</Text>
                  </View>
                  {/* Simple slider approximation using text-based controls */}
                  <View style={styles.sliderRow}>
                    {[0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8].map((v) => (
                      <Pressable
                        key={v}
                        onPress={() => setRatio(v)}
                        style={[
                          styles.sliderDot,
                          Math.abs(ratio - v) < 0.05 && styles.sliderDotActive,
                        ]}
                      />
                    ))}
                  </View>
                </>
              )}

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
                <Text style={styles.signupText}>
                  {busy ? "Starting…" : step === "ratio" ? "Start learning" : "Next"}
                </Text>
              </Pressable>

              {/* Skip for now */}
              {step === "name" && (
                <Pressable onPress={skip} style={styles.skipBtn}>
                  <Text style={styles.skipText}>Skip for now</Text>
                </Pressable>
              )}
            </View>

            <Text style={styles.footnote}>
              Your tutor speaks a little Sanskrit and a lot of your language,{'\n'}and raises the
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
  langRow: {
    flexDirection: "row",
    gap: space.sm,
  },
  langChip: {
    flex: 1,
    paddingVertical: space.md,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: color.border,
    alignItems: "center",
  },
  langChipActive: {
    borderColor: color.saffron,
    backgroundColor: color.saffronBg,
  },
  langChipText: {
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    fontSize: font.sizes.base,
    color: color.ink,
  },
  langChipTextActive: {
    color: color.saffron,
  },
  ratioDisplay: {
    alignItems: "center",
    marginVertical: space.md,
  },
  ratioLabel: {
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
    fontSize: font.sizes.md,
    color: color.inkSoft,
  },
  ratioValue: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.xxl,
    color: color.saffron,
    marginTop: space.xs,
  },
  ratioHint: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    fontSize: font.sizes.xs,
    color: color.inkFaint,
  },
  sliderRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: space.xs,
    marginBottom: space.md,
    marginTop: space.xs,
  },
  sliderDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: color.border,
  },
  sliderDotActive: {
    backgroundColor: color.saffron,
    width: 20,
    height: 20,
    borderRadius: 10,
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
  skipBtn: {
    marginTop: space.sm,
    alignItems: "center",
    paddingVertical: space.sm,
  },
  skipText: {
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
    fontSize: font.sizes.sm,
    color: color.inkFaint,
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