// Login / entry screen. Stranger-first (U10-1): a fresh install reaches a
// usable session with no typing. Three ways in:
//   • Continue with Google  — an account, for syncing progress across devices
//     (only if a Google client ID is configured; else it says so).
//   • Continue with Apple   — iOS only, required by Guideline 4.8 wherever
//     Google sign-in is offered (only when the native module is available).
//   • Continue as guest     — anonymous local install, one tap, no account.
// This screen is shown by App.tsx whenever the user is not onboarded.
//
// The screen carries no copy beyond the wordmark, the three buttons, an error
// when there is one, and the privacy link: the icon's guru and name are the
// welcome.
//
// Google Sign-In uses the NATIVE SDK (@react-native-google-signin/google-signin),
// not expo-auth-session: the deprecated browser flow uses a custom redirect URI
// that Google rejects for Android OAuth clients ("Custom URI is not enabled").
// The native flow verifies package name + signing-cert SHA-1 via Play Services
// and returns an id_token whose aud is the configured webClientId, which the
// backend (POST /auth/google) verifies. Apple works the same way against
// POST /auth/apple (ES256 identityToken, aud = bundle/Services ID).

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import * as AppleAuthentication from "expo-apple-authentication";
import {
  GoogleSignin,
  isSuccessResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";

import { Gesture, GuruNative } from "../components/guru";
import { useAuth } from "../store/auth";
import { ApiError } from "../api/client";
import { accent, color, font, radius, script, shadow, space } from "../theme";
import { GOOGLE_CLIENT_IDS, GOOGLE_LOGIN_ENABLED, PRIVACY_POLICY_URL } from "../config";

// The icon's cream, so the app opens as a continuation of its launcher icon.
const ICON_CREAM = "#FFF6ED";

// Configure the native Google Sign-In once at module load. `webClientId` is
// the audience of the id_token the SDK returns and what the backend verifies,
// so we pass the Web client ID (which is in the backend's accepted set).
if (GOOGLE_CLIENT_IDS.webClientId) {
  GoogleSignin.configure({ webClientId: GOOGLE_CLIENT_IDS.webClientId });
}

export default function LoginScreen() {
  const { googleLogin, appleLogin, guestLogin, finishOnboarding } = useAuth();
  const { height } = useWindowDimensions();
  const [busy, setBusy] = useState<"none" | "google" | "apple" | "guest">("none");
  const [error, setError] = useState<string | null>(null);
  // Sign in with Apple exists only on iOS with the native module (dev
  // build). Never rendered elsewhere: Guideline 4.8 is an iOS rule.
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
      setError("Google sign-in isn't available in this build.");
      return;
    }
    setBusy("google");
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      if (isSuccessResponse(response)) {
        const idToken = response.data.idToken;
        if (!idToken) {
          setError("Google didn't send a sign-in token. Try again.");
          return;
        }
        await googleLogin(idToken);
        await finishOnboarding();
      }
      // isSuccessResponse === false means the user cancelled; nothing to do.
    } catch (e) {
      // Report the real reason, not one generic line: a closed-testing
      // failure is almost always console config (Play app-signing SHA-1
      // missing from the Android OAuth client, or the OAuth consent screen
      // still in Testing without the tester added), and the code tells the
      // owner which one. Backend rejections (401/501) surface separately.
      const code = String((e as { code?: unknown })?.code ?? "");
      if (code === statusCodes.SIGN_IN_CANCELLED || code === "12501") {
        // User backed out; just re-enable the button.
      } else if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError("Google Play Services isn't available on this device.");
      } else if (e instanceof ApiError && e.status === 501) {
        setError("Google sign-in isn't set up on the server yet (server 501). Tell us you saw this.");
      } else if (e instanceof ApiError && e.status === 401) {
        setError("The server rejected Google's token (server 401). Tell us you saw this.");
      } else if (e instanceof ApiError && e.status === 0) {
        setError("Couldn't reach the server. Check your internet and try again.");
      } else if (code === statusCodes.IN_PROGRESS || code === statusCodes.SIGN_IN_REQUIRED) {
        setError("Sign-in is still running. Wait a moment and try again.");
      } else {
        setError(
          code
            ? `Google sign-in failed (code ${code}). Tell us the code and try again.`
            : "Google sign-in failed. Try again.",
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
        setError("Apple didn't send a sign-in token. Try again.");
        return;
      }
      // Apple sends the name only on first authorization: forward it when
      // present; the backend falls back to the relay-email local part.
      const given = credential.fullName?.givenName?.trim() ?? "";
      const family = credential.fullName?.familyName?.trim() ?? "";
      const name = `${given} ${family}`.trim() || undefined;
      await appleLogin(credential.identityToken, name);
      await finishOnboarding();
    } catch (e) {
      if ((e as { code?: string }).code !== "ERR_REQUEST_CANCELED") {
        setError("Apple sign-in failed. Try again.");
      }
      // Cancelled: user backed out; just re-enable the button.
    } finally {
      setBusy("none");
    }
  };

  const onGuest = async () => {
    setError(null);
    setBusy("guest");
    try {
      await guestLogin();
      await finishOnboarding();
    } catch {
      setError("Couldn't connect. Check your internet and try again.");
      setBusy("none");
    }
  };

  const locked = busy !== "none";
  // The mascot shrinks on short phones so the buttons never scroll off.
  const guruSize = Math.max(140, Math.min(200, Math.round(height * 0.27)));

  return (
    <View style={styles.root}>
      {/* a soft saffron glow at the top, fading into the cream */}
      <LinearGradient
        colors={["rgba(232,91,37,0.20)", "rgba(232,91,37,0.06)", "rgba(255,246,237,0)"]}
        style={styles.glow}
        pointerEvents="none"
      />
      <SafeAreaView style={styles.safe}>
        <View style={styles.top}>
          <GuruNative state="idle" size={guruSize} gesture={Gesture.Anjali} />
          <Text style={[styles.wordmarkSa, script("extrabold")]} accessibilityRole="header">
            संस्कृतम्
          </Text>
          <Text style={styles.wordmark}>Sanskritam</Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            disabled={locked}
            onPress={onGoogle}
            style={({ pressed }) => [styles.btn, styles.googleBtn, pressed && styles.pressed, locked && styles.dim]}
            accessibilityRole="button"
            accessibilityLabel="Continue with Google"
            accessibilityState={{ disabled: locked, busy: busy === "google" }}
          >
            {busy === "google" ? <ActivityIndicator color={color.ink} /> : <GoogleMark />}
            <Text style={styles.googleText}>Continue with Google</Text>
          </Pressable>

          {/* Continue with Apple: iOS only (Guideline 4.8). */}
          {appleAvailable && (
            <Pressable
              disabled={locked}
              onPress={onApple}
              style={({ pressed }) => [styles.btn, styles.appleBtn, pressed && styles.pressed, locked && styles.dim]}
              accessibilityRole="button"
              accessibilityLabel="Continue with Apple"
              accessibilityState={{ disabled: locked, busy: busy === "apple" }}
            >
              {busy === "apple" ? (
                <ActivityIndicator color={color.white} />
              ) : (
                <Ionicons name="logo-apple" size={20} color={color.white} />
              )}
              <Text style={styles.appleText}>Continue with Apple</Text>
            </Pressable>
          )}

          <Pressable
            disabled={locked}
            onPress={onGuest}
            style={({ pressed }) => [styles.btn, styles.guestBtn, pressed && styles.pressed, locked && styles.dim]}
            accessibilityRole="button"
            accessibilityLabel="Continue as guest"
            accessibilityState={{ disabled: locked, busy: busy === "guest" }}
          >
            {busy === "guest" ? (
              <ActivityIndicator color={accent.saffron.fg} />
            ) : (
              <Ionicons name="person-outline" size={19} color={accent.saffron.fg} />
            )}
            <Text style={styles.guestText}>Continue as guest</Text>
          </Pressable>

          {!!error && (
            <Text style={styles.error} accessibilityRole="alert">
              {error}
            </Text>
          )}

          <Pressable
            onPress={() => Linking.openURL(PRIVACY_POLICY_URL).catch(() => {})}
            hitSlop={8}
            accessibilityRole="link"
            accessibilityLabel="Privacy policy"
            style={styles.privacy}
          >
            <Text style={styles.privacyText}>Privacy policy</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

// Google's four-colour "G", drawn rather than faked with a letter on a circle.
function GoogleMark() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48" aria-hidden>
      <Path
        fill="#FFC107"
        d="M43.6 20.1H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"
      />
      <Path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <Path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <Path
        fill="#1976D2"
        d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ICON_CREAM },
  glow: { position: "absolute", left: 0, right: 0, top: 0, height: 340 },
  safe: { flex: 1, paddingHorizontal: space.lg },
  top: { flex: 1, alignItems: "center", justifyContent: "center" },
  wordmarkSa: {
    fontSize: 44,
    lineHeight: 64,
    color: color.saffron,
    marginTop: space.sm,
  },
  wordmark: {
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    fontSize: font.sizes.base,
    color: color.inkSoft,
    letterSpacing: 1.2,
  },
  actions: { gap: space.sm, paddingBottom: space.sm },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    minHeight: 54,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
  },
  pressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  dim: { opacity: 0.55 },
  googleBtn: { backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, ...shadow.card },
  googleText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.base, color: color.ink },
  appleBtn: { backgroundColor: "#000000" },
  appleText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.base, color: color.white },
  guestBtn: { backgroundColor: color.saffronLight },
  guestText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.base, color: accent.saffron.fg },
  error: {
    color: color.badText,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
    fontSize: font.sizes.sm,
    textAlign: "center",
  },
  privacy: { alignSelf: "center", minHeight: 44, justifyContent: "center", paddingHorizontal: space.md },
  privacyText: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.xs, color: color.inkSoft },
});
