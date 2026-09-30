// PhotoCapture (U12-4) — write on paper, photograph it, get feedback.
//
// The camera frames a SINGLE letter or word, not a page: better for reading
// and it keeps a child's name and the rest of their exercise book out of shot.
// This component only takes the picture; the Writing screen sends it to the
// server check (Sarvam Document Intelligence), falling back to on-device
// reading, and never keeps the image after the result.
//
// takePictureAsync runs with orientation processing ON (skipProcessing false):
// skipping it discards `quality` and can return a rotated image.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Image, Linking, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

import { Button } from "../ui";
import { haptics } from "../../services/haptics";
import { color, font, radius, shadow, space } from "../../theme";

export default function PhotoCapture({
  busy,
  thumbnail,
  onCapture,
}: {
  /** True while the last photo is being checked. */
  busy: boolean;
  /** The photo just taken, shown while it is checked. Parent clears it after. */
  thumbnail: string | null;
  /** The photo's file uri, or null when the camera returned nothing. */
  onCapture: (uri: string | null) => void;
}) {
  const { width: winW } = useWindowDimensions();
  const size = Math.min(340, winW - space.lg * 2);
  const [permission, requestPermission] = useCameraPermissions();
  // Never fire takePictureAsync into a preview that has not started.
  const [cameraReady, setCameraReady] = useState(false);
  const [shooting, setShooting] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const shoot = useCallback(async () => {
    if (busy || shooting || !cameraReady) return;
    haptics.press();
    setShooting(true);
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.5 });
      onCapture(photo?.uri ?? null);
    } catch {
      onCapture(null);
    } finally {
      setShooting(false);
    }
  }, [busy, shooting, cameraReady, onCapture]);

  if (!permission) {
    return <View style={[styles.box, { width: size, height: size }]} />;
  }

  if (!permission.granted) {
    const blocked = permission.canAskAgain === false;
    return (
      <View style={[styles.box, styles.center, { width: size, height: size }]}>
        <Ionicons name="camera-outline" size={40} color={color.inkSoft} />
        <Text style={styles.title}>Camera access is off</Text>
        <Button
          label={blocked ? "Open settings" : "Allow camera"}
          tone="tonal"
          size="md"
          onPress={() => (blocked ? Linking.openSettings() : requestPermission())}
        />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={[styles.box, { width: size, height: size }]}>
        {thumbnail ? (
          <>
            <Image source={{ uri: thumbnail }} style={styles.fill} resizeMode="cover" />
            <View style={styles.checking} accessible accessibilityRole="progressbar" accessibilityLabel="Checking">
              <ActivityIndicator color={color.white} />
              <Text style={styles.checkingText}>Checking…</Text>
            </View>
          </>
        ) : (
          <>
            <CameraView
              ref={cameraRef}
              style={styles.fill}
              facing="back"
              onCameraReady={() => setCameraReady(true)}
            />
            {/* single-letter framing guide */}
            <View style={styles.frame} pointerEvents="none" />
          </>
        )}
      </View>
      {!thumbnail && (
        <Pressable
          onPress={shoot}
          disabled={busy || shooting || !cameraReady}
          accessibilityRole="button"
          accessibilityLabel="Take photo"
          accessibilityState={{ disabled: busy || shooting || !cameraReady, busy: shooting }}
          style={({ pressed }) => [
            styles.shutter,
            (busy || shooting || !cameraReady) && { opacity: 0.5 },
            pressed && { transform: [{ scale: 0.94 }] },
          ]}
        >
          <View style={styles.shutterInner} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: space.md },
  box: {
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: color.surfaceMuted,
    borderWidth: 1,
    borderColor: color.border,
  },
  center: { alignItems: "center", justifyContent: "center", gap: space.sm, padding: space.lg },
  title: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.base, color: color.ink },
  fill: { flex: 1 },
  frame: {
    position: "absolute",
    left: "22%",
    top: "18%",
    width: "56%",
    height: "64%",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.9)",
    borderRadius: radius.md,
  },
  checking: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(59,46,37,0.55)",
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
  },
  checkingText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.base, color: color.white },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: color.surface,
    borderWidth: 4,
    borderColor: color.saffronBtn,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.button,
  },
  shutterInner: { width: 48, height: 48, borderRadius: 24, backgroundColor: color.saffronBtn },
});
