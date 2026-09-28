// PhotoCapture (U12-4) — write on paper, photograph it, get feedback.
//
// The camera frames a SINGLE letter or word — not a page — which improves
// recognition and, more importantly, keeps a child's name and the rest of
// their exercise book OUT of frame. The photo is processed on-device and
// DISCARDED immediately after recognition: never uploaded, never logged,
// never in a crash report (§2.16).
//
// Both native pieces (camera preview + OCR) resolve dynamically: without the
// dev build this renders the honest unavailable card, exactly like the ink
// canvas does before the ML Kit module ships. Because OCR on beginner
// handwriting is materially less reliable than stroke ink, an unreadable
// photo shows the reference and asks the learner to compare — never a bare
// rejection (P20-4). The server biases the photo path hard toward `unsure`.

import React, { useCallback, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
// expo-camera is an installed dependency — import statically. The hook below
// must run unconditionally (React rules); permission state gates the preview.
import { CameraView, useCameraPermissions } from "expo-camera";

import { haptics } from "../../services/haptics";
import type { PhotoRecogniser } from "../../services/photoRecogniser";
import { color, font, radius, script, shadow, space } from "../../theme";

export default function PhotoCapture({
  reference,
  recogniser,
  onResult,
}: {
  /** The Devanagari target shown beside the viewfinder for comparison. */
  reference: string;
  recogniser: PhotoRecogniser;
  /** (text, confidence) from on-device OCR. The photo is already discarded. */
  onResult: (text: string, confidence: number) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);
  // Preview is usable only after the native camera reports ready — never
  // fire takePictureAsync into an unmounted preview.
  const [cameraReady, setCameraReady] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const capture = useCallback(async () => {
    if (busy || !cameraReady) return;
    haptics.tap();
    setBusy(true);
    try {
      const photo = await cameraRef.current?.takePictureAsync?.({
        quality: 0.7,
        skipProcessing: true,
      });
      const uri = photo?.uri;
      if (!uri) {
        onResult("", 0);
        return;
      }
      try {
        const out = await recogniser.recognise(uri);
        if (out && out.text) onResult(out.text, out.confidence);
        else onResult("", 0);
      } finally {
        // The image is discarded here: no state keeps the uri, nothing is
        // cached, nothing is uploaded (§2.16). There is nothing to delete
        // because nothing retained it.
      }
    } finally {
      setBusy(false);
    }
  }, [busy, cameraReady, onResult, recogniser]);

  const begin = useCallback(async () => {
    // Permission is requested from the capture button, never at mount.
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res?.granted) {
        setDenied(true);
        return;
      }
      setDenied(false);
    }
    await capture();
  }, [capture, permission?.granted, requestPermission]);

  // Without the dev build the OCR seam reports not-ready: the honest
  // unavailable card, exactly like the ink canvas before its module ships.
  if (!recogniser.ready) {
    return (
      <View style={styles.unavailable} accessible accessibilityRole="text" accessibilityLabel={recogniser.statusNote}>
        <Text style={styles.unavailableTitle}>From paper — coming with the dev build</Text>
        <Text style={styles.unavailableText}>{recogniser.statusNote}</Text>
        <Text style={[styles.reference, script("bold")]}>{reference}</Text>
      </View>
    );
  }

  // Camera permission still resolving.
  if (!permission) {
    return (
      <View style={styles.unavailable} accessible accessibilityRole="text" accessibilityLabel="Checking camera access.">
        <Text style={styles.unavailableTitle}>Checking camera access…</Text>
        <Text style={[styles.reference, script("bold")]}>{reference}</Text>
      </View>
    );
  }

  // Permission denied (or not yet granted): explain + offer the system prompt
  // again instead of rendering a dead preview.
  if (!permission.granted) {
    return (
      <View style={styles.unavailable} accessible accessibilityRole="text" accessibilityLabel="Camera access needed to photograph writing.">
        <Text style={styles.unavailableTitle}>Camera access needed</Text>
        <Text style={styles.unavailableText}>
          Frame one letter on paper and it is read on this device, then discarded — nothing is
          ever uploaded. Allow camera access to try it.
        </Text>
        <Pressable
          onPress={() => void begin()}
          accessibilityRole="button"
          accessibilityLabel="Allow camera access"
          style={styles.captureBtn}
        >
          <Text style={styles.captureText}>Allow camera</Text>
        </Pressable>
        <Text style={[styles.reference, script("bold")]}>{reference}</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.hint}>
        Frame one letter — keep names and the rest of the page out of shot. The photo is read on
        this device and discarded.
      </Text>
      <View style={styles.viewfinder}>
        <CameraView
          style={styles.preview}
          ref={cameraRef}
          facing="back"
          onCameraReady={() => setCameraReady(true)}
        />
        {/* Single-letter framing guide */}
        <View style={styles.frame} pointerEvents="none" />
      </View>
      <Text style={[styles.reference, script("bold")]}>{reference}</Text>
      {denied && <Text style={styles.denied}>Camera access denied. Allow it in settings and try again.</Text>}
      <Pressable
        onPress={begin}
        disabled={busy || !cameraReady}
        style={[styles.captureBtn, (busy || !cameraReady) && styles.captureBtnBusy]}
        accessibilityRole="button"
        accessibilityLabel={busy ? "Reading the photo" : "Photograph your writing"}
        accessibilityState={{ busy, disabled: busy || !cameraReady }}
      >
        <Text style={styles.captureText}>{busy ? "Reading…" : "Photograph it"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  hint: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
  },
  viewfinder: {
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: "#1A140D",
    aspectRatio: 4 / 3,
    position: "relative",
  },
  preview: { flex: 1 },
  frame: {
    position: "absolute",
    left: "25%",
    top: "15%",
    width: "50%",
    height: "70%",
    borderWidth: 2,
    borderColor: color.saffron,
    borderRadius: radius.md,
  },
  reference: { fontSize: font.sizes.xl, color: color.ink, textAlign: "center" },
  denied: { fontSize: font.sizes.sm, color: color.badText, textAlign: "center" },
  captureBtn: {
    backgroundColor: color.saffron,
    borderRadius: radius.md,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.button,
  },
  captureBtnBusy: { opacity: 0.6 },
  captureText: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.base,
    color: color.white,
  },
  unavailable: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    alignItems: "center",
    gap: space.sm,
  },
  unavailableTitle: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.base,
    color: color.ink,
    textAlign: "center",
  },
  unavailableText: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
    textAlign: "center",
  },
});
