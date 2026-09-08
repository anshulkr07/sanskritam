// Login / entry screen. Stranger-first (U10-1): a fresh install reaches a
// usable session with no typing. Three ways in:
//   • Continue with Google  — an account, for syncing progress across devices
//     (only if a Google client ID is configured; else the button is disabled).
//   • Continue with Apple   — iOS only, required by Guideline 4.8 wherever
//     Google sign-in is offered (only when the native module is available).
//   • Continue as Guest     — anonymous local install, one tap, no account.
// This screen is shown by App.tsx whenever the user is not onboarded.
//
// Google Sign-In uses the NATIVE SDK (@react-native-google-signin/google-signin),
// not expo-auth-session: the deprecated browser flow uses a custom redirect URI
// that Google rejects for Android OAuth clients ("Custom URI is not enabled").
// The native flow verifies package name + signing-cert SHA-1 via Play Services
// and returns an id_token whose aud is the configured webClientId — which the
// backend (POST /auth/google) verifies. Apple works the same way against
// POST /auth/apple (ES256 identityToken, aud = bundle/Services ID).

import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import * as AppleAuthentication from "expo-apple-authentication";
import {
  GoogleSignin,
  isSuccessResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";

import { useAuth } from "../store/auth";
import { color, font, radius, shadow, space } from "../theme";
import { GOOGLE_CLIENT_IDS, GOOGLE_LOGIN_ENABLED } from "../config";

// Configure the native Google Sign-In once at module load. `webClientId` is
// the audience of the id_token the SDK returns and what the backend verifies,
// so we pass the Web client ID (which is in the backend's accepted set).
if (GOOGLE_CLIENT_IDS.webClientId) {
  GoogleSignin.configure({ webClientId: GOOGLE_CLIENT_IDS.webClientId });
}

export default function LoginScreen() {
  const { googleLogin, appleLogin, guestLogin, finishOnboarding } = useAuth();
  const [busy, setBusy] = useState<"none" | "google" | "apple" | "guest">("none");
  const [error, setError] = useState<string | null>(null);
  // Sign in with Apple exists only on iOS with the native module (dev
  // build). Never rendered elsewhere — Guideline 4.8 is an iOS rule.
  const [appleAvailable, setAppleAvailable] = useState(Platform.OS === "ios");
  useEffect(() => {
    if (Platform.OS !== "ios") return;
    AppleAuthentication.isAvailableAsync()
      .then(setAppleAvailable)
      .catch(() => setAppleAvailable(false));
  }, []);

  const onGoogle = async () => {
    setError(null);
    if (!GOOGLE_LOGIN_ENABLED) {
      setError(
        "Google sign-in isn't configured yet (GOOGLE client ID missing). " +
          "Use Continue as Guest for now.",
      );
      return;
    }
    setBusy("google");
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      if (isSuccessResponse(response)) {
        const idToken = response.data.idToken;
        if (!idToken) {
          setError("Google didn't return an identity token. Please try again.");
          return;
        }
        await googleLogin(idToken);
        await finishOnboarding();
      }
      // isSuccessResponse === false means the user cancelled; nothing to do.
    } catch (e) {
      if ((e as { code?: string }).code === statusCodes.SIGN_IN_CANCELLED) {
        // User backed out; just re-enable the button.
      } else if ((e as { code?: string }).code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError("Google Play Services isn't available on this device.");
      } else {
        setError(
          e instanceof Error ? e.message : "Google sign-in failed. Please try again.",
        );
      }
    } finally {
      setBusy("none");
    }
  };

  const onApple = async () => {
    setError(null);
    setBusy("apple");
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        setError("Apple didn't return an identity token. Please try again.");
        return;
      }
      // Apple sends the name only on first authorization — forward it when
      // present; the backend falls back to the relay-email local part.
      const given = credential.fullName?.givenName?.trim() ?? "";
      const family = credential.fullName?.familyName?.trim() ?? "";
      const name = `${given} ${family}`.trim() || undefined;
      await appleLogin(credential.identityToken, name);
      await finishOnboarding();
    } catch (e) {
      if ((e as { code?: string }).code !== "ERR_REQUEST_CANCELED") {
        setError(
          e instanceof Error ? e.message : "Apple sign-in failed. Please try again.",
        );
      }
      // Cancelled: user backed out; just re-enable the button.
    } finally {
      setBusy("none");
    }
  };

  const onGuest = async () => {    setError(null);
    setBusy("guest");
    try {
      await guestLogin();
      await finishOnboarding();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not connect. Is the backend running?");
      setBusy("none");
    }
  };

  const gDisabled = busy !== "none" || !GOOGLE_LOGIN_ENABLED;

  return (
    <LinearGradient colors={[color.bg, "#FFF1DD"]} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          {/* Lockup */}
          <View style={styles.logoRow}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoGlyph}>श्</Text>
            </View>
            <Text style={styles.logoWord}>Sanskritam</Text>
          </View>
          <Text style={styles.tagline}>Speak Sanskrit. A word at a time.</Text>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.heading}>नमस्ते 🙏</Text>
            <Text style={styles.subheading}>
              Sign in to save your progress across devices — or just jump in as a guest.
            </Text>

            {/* Continue with Google */}
            <Pressable
              disabled={busy !== "none"}
              onPress={onGoogle}
              style={({ pressed }) => [
                styles.googleBtn,
                pressed && styles.googleBtnPressed,
                (busy !== "none" || !GOOGLE_LOGIN_ENABLED) && styles.btnDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
            >
              <View style={styles.googleIcon}>
                <Text style={styles.googleIconText}>G</Text>
              </View>
              <Text style={styles.googleBtnText}>
                {busy === "google" ? "Connecting…" : "Continue with Google"}
              </Text>
            </Pressable>

            {/* Continue with Apple — iOS only (Guideline 4.8). */}
            {appleAvailable && (
              <Pressable
                disabled={busy !== "none"}
                onPress={onApple}
                style={({ pressed }) => [
                  styles.appleBtn,
                  pressed && styles.googleBtnPressed,
                  busy !== "none" && styles.btnDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Continue with Apple"
              >
                <Text style={styles.appleIconText}></Text>
                <Text style={styles.appleBtnText}>
                  {busy === "apple" ? "Connecting…" : "Continue with Apple"}
                </Text>
              </Pressable>
            )}

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Continue as Guest */}
            <Pressable
              disabled={busy !== "none"}
              onPress={onGuest}
              style={({ pressed }) => [
                styles.guestBtn,
                pressed && styles.guestBtnPressed,
                busy !== "none" && styles.btnDisabledSaffron,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Continue as Guest"
            >
              {busy === "guest" ? (
                <ActivityIndicator color={color.white} />
              ) : (
                <Text style={styles.guestBtnText}>Continue as Guest</Text>
              )}
            </Pressable>
            <Text style={styles.guestHint}>No account needed — start learning in seconds.</Text>

            {!!error && <Text style={styles.error}>{error}</Text>}
          </View>

          <Text style={styles.footnote}>
            Your tutor speaks a little Sanskrit and a lot of your language,{'\n'}and raises the
            Sanskrit share as you grow.
          </Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
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
    marginBottom: space.lg,
    lineHeight: 20,
  },
  // Google button — white with border and the recognisable G.
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    backgroundColor: color.surface,
    borderWidth: 2,
    borderColor: color.border,
    borderRadius: radius.md,
    paddingVertical: space.md,
    ...shadow.button,
  },
  googleBtnPressed: { transform: [{ translateY: 1 }] },
  googleIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#4285F4",
    alignItems: "center",
    justifyContent: "center",
  },
  googleIconText: {
    color: color.white,
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: 14,
  },
  googleBtnText: {
    color: color.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.base,
  },
  // Apple button — black filled,  icon.
  appleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    backgroundColor: color.ink,
    borderRadius: radius.md,
    paddingVertical: space.md,
    marginTop: space.sm,
    minHeight: 52,
    ...shadow.button,
  },
  appleIconText: {
    color: color.white,
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: 16,
  },
  appleBtnText: {
    color: color.white,
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.base,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    marginVertical: space.md,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: color.border },
  dividerText: {
    color: color.inkFaint,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
    fontSize: font.sizes.sm,
  },
  // Guest button — saffron filled.
  guestBtn: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    backgroundColor: color.saffron,
    borderRadius: radius.md,
    paddingVertical: space.md,
    ...shadow.button,
  },
  guestBtnPressed: { transform: [{ translateY: 1 }] },
  guestBtnText: {
    color: color.white,
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.base,
  },
  guestHint: {
    marginTop: space.sm,
    textAlign: "center",
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    fontSize: font.sizes.xs,
    color: color.inkFaint,
  },
  btnDisabled: { opacity: 0.5 },
  btnDisabledSaffron: { opacity: 0.7 },
  error: {
    marginTop: space.md,
    color: color.badText,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
    fontSize: font.sizes.sm,
    textAlign: "center",
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