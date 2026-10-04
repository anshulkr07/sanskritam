// Privacy policy — a drawer screen, so it carries the hamburger like Progress
// and Settings. It shows the backend's /privacy page (the page the Play
// listing links) in a WebView, inside the app.
//
// It used to open in a Custom Tab (expo-web-browser), which on Android goes
// through a transparent proxy activity. After the hardware back button the
// app stayed dead to touch until a second back (owner's report, 2026-10-05;
// the proxy is the suspected cause). A WebView never leaves the app.
//
// Pages on our own backend (the policy links /delete-account) open in place,
// and hardware back steps back through them before it leaves the screen.
// Anything else (the contact email) goes to the phone's own app for it.

import { useDrawerStatus } from "@react-navigation/drawer";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useRef, useState } from "react";
import { ActivityIndicator, BackHandler, Linking, Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { Button } from "../components/ui";
import { BASE_URL } from "../config";
import { color, font, radius, shadow, space } from "../theme";

const PAGE = `${BASE_URL}/privacy`;

export default function PrivacyScreen() {
  const web = useRef<WebView>(null);
  const canGoBack = useRef(false);
  // An open drawer gets the back press first: it closes, the page stays.
  const drawerOpen = useRef(false);
  drawerOpen.current = useDrawerStatus() === "open";
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  // Bumped by Retry: a new key mounts a fresh WebView.
  const [attempt, setAttempt] = useState(0);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (drawerOpen.current || !canGoBack.current) return false;
        web.current?.goBack();
        return true;
      });
      return () => sub.remove();
    }, []),
  );

  const retry = () => {
    setFailed(false);
    setLoading(true);
    setAttempt((n) => n + 1);
  };

  // react-native-webview has no web build; the browser can frame the page.
  if (Platform.OS === "web") {
    return (
      <View style={styles.safe}>
        <iframe src={PAGE} title="Privacy policy" style={{ border: 0, flex: 1, width: "100%", height: "100%" }} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      {failed ? (
        <View style={styles.errorWrap}>
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Couldn't load the privacy policy.</Text>
            <Text style={styles.errorSub}>Check your connection and try again.</Text>
            <Button label="Retry" onPress={retry} style={{ marginTop: space.md }} />
          </View>
        </View>
      ) : (
        <>
          <WebView
            key={attempt}
            ref={web}
            source={{ uri: PAGE }}
            style={styles.web}
            onShouldStartLoadWithRequest={(req) => {
              if (req.url.startsWith(`${BASE_URL}/`) || req.url === "about:blank") return true;
              Linking.openURL(req.url).catch(() => {});
              return false;
            }}
            onNavigationStateChange={(nav) => {
              canGoBack.current = nav.canGoBack;
            }}
            onLoadEnd={() => setLoading(false)}
            onError={() => setFailed(true)}
            onHttpError={() => setFailed(true)}
          />
          {loading && (
            <View style={styles.loading} pointerEvents="none">
              <ActivityIndicator color={color.saffron} size="large" />
            </View>
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  // The page paints the same paper colour, so there is no white flash.
  web: { flex: 1, backgroundColor: color.bg },
  loading: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  errorWrap: { padding: space.lg },
  errorCard: { backgroundColor: color.surface, borderRadius: radius.lg, padding: space.lg, ...shadow.card },
  errorTitle: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.base, color: color.ink },
  errorSub: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
    marginTop: 4,
  },
});
