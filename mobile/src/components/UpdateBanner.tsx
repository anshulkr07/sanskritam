// UpdateBanner — the non-blocking "restart to apply" prompt for OTA updates.
//
// EAS Update downloads a new bundle in the background on launch and would
// otherwise apply it silently on the next cold start. When the download is
// ready this banner offers the restart now; "Later" dismisses it for the
// session and the update still applies on the next start. It renders nothing
// in development, in Expo Go, or when no update is pending.

import * as Updates from "expo-updates";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { haptics } from "../services/haptics";
import { applyAppUpdate } from "../services/ota";
import { color, fill, font, onFill, radius, shadow, space } from "../theme";

export default function UpdateBanner() {
  const { isUpdatePending } = Updates.useUpdates();
  const [dismissed, setDismissed] = useState(false);
  const insets = useSafeAreaInsets();

  if (!isUpdatePending || dismissed) return null;

  const restart = () => {
    haptics.tap();
    void applyAppUpdate();
  };
  const later = () => {
    haptics.tap();
    setDismissed(true);
  };

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View
        style={[styles.bar, { marginTop: insets.top + 8 }]}
        accessible
        accessibilityRole="alert"
        accessibilityLabel="A new version is ready. Restart to apply it, or continue later."
      >
        <Text style={styles.text} numberOfLines={2}>
          A new version is ready.
        </Text>
        <Pressable
          onPress={restart}
          style={styles.restart}
          accessibilityRole="button"
          accessibilityLabel="Restart to apply the update"
        >
          <Text style={styles.restartText}>Restart</Text>
        </Pressable>
        <Pressable
          onPress={later}
          style={styles.later}
          accessibilityRole="button"
          accessibilityLabel="Apply the update later"
        >
          <Text style={styles.laterText}>Later</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, top: 0, alignItems: "center", zIndex: 50 },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    marginHorizontal: space.md,
    backgroundColor: fill.ink,
    borderRadius: radius.pill,
    paddingLeft: space.md,
    paddingRight: space.xs,
    paddingVertical: space.xs,
    ...shadow.card,
  },
  text: {
    flex: 1,
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    fontSize: font.sizes.sm,
    color: onFill.text,
  },
  restart: {
    minHeight: 44,
    justifyContent: "center",
    backgroundColor: color.saffronBtn,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
  },
  restartText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm, color: color.white },
  later: { minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: space.xs },
  laterText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: onFill.soft },
});
