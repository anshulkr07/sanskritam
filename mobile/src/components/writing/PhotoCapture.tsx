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

import { haptics } from "../../services/haptics";
import type { PhotoRecogniser } from "../../services/photoRecogniser";
import { color, font, radius, script, shadow, space } from "../../theme";

function loadCamera(): unknown {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("expo-camera");
  } catch {
    return null;
  }
}

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
  const cameraRef = useRef<unknown>(null);

  const capture = useCallback(async () => {
    if (busy) return;
    haptics.tap();
    setBusy(true);
    try {
      const ref = cameraRef.current as {
        takePictureAsync?: (opts?: Record<string, unknown>) => Promise<{ uri?: string } | null>;
      } | null;
      const photo = await ref?.takePictureAsync?.({ quality: 0.7, skipProcessing: true });
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
  }, [busy, onResult, recogniser]);

  const ensurePermission = useCallback(async (): Promise<boolean> => {
    try {
      const cam = loadCamera() as {
        useCameraPermissions?: () => [{ granted?: boolean }, () => Promise<{ granted?: boolean }>];
        requestCameraPermissionsAsync?: () => Promise<{ granted?: boolean }>;
      } | null;
      if (cam?.requestCameraPermissionsAsync) {
        const res = await cam.requestCameraPermissionsAsync();
        if (!res?.granted) setDenied(true);
        return !!res?.granted;
      }
      if (cam?.useCameraPermissions) {
        // Hook form cannot be called here; treat as unavailable rather than
        // breaking hook rules — the dev-build pass wires this properly.
        return false;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const begin = useCallback(async () => {
    const ok = await ensurePermission();
    if (ok) {
      setDenied(false);
      await capture();
    }
  }, [capture, ensurePermission]);

  if (!recogniser.ready) {
    return (
      <View style={styles.unavailable} accessible accessibilityRole="text" accessibilityLabel={recogniser.statusNote}>
        <Text style={styles.unavailableTitle}>From paper — coming with the dev build</Text>
        <Text style={styles.unavailableText}>{recogniser.statusNote}</Text>
        <Text style={[styles.reference, script("bold")]}>{reference}</Text>
      </View>
    );
  }

  const cam = loadCamera() as {
    CameraView?: React.ComponentType<Record<string, unknown>>;
  } | null;
  if (!cam?.CameraView) {
    return (
      <View style={styles.unavailable} accessible accessibilityRole="text" accessibilityLabel="Camera preview needs the dev build.">
        <Text style={styles.unavailableTitle}>Camera preview needs the dev build</Text>
        <Text style={styles.unavailableText}>
          The capture module is not in this build. Your photo would be processed on this device and
          discarded — nothing would ever be uploaded.
        </Text>
        <Text style={[styles.reference, script("bold")]}>{reference}</Text>
      </View>
    );
  }
  const CameraView = cam.CameraView;

  return (
    <View style={styles.wrap}>
      <Text style={styles.hint}>
        Frame one letter — keep names and the rest of the page out of shot. The photo is read on
        this device and discarded.
      </Text>
      <View style={styles.viewfinder}>
        <CameraView
          style={styles.preview}
          ref={cameraRef as never}
          facing="back"
        />
        {/* Single-letter framing guide */}
        <View style={styles.frame} pointerEvents="none" />
      </View>
      <Text style={[styles.reference, script("bold")]}>{reference}</Text>
      {denied && <Text style={styles.denied}>Camera access denied. Allow it in settings and try again.</Text>}
      <Pressable
        onPress={begin}
        disabled={busy}
        style={[styles.captureBtn, busy && styles.captureBtnBusy]}
        accessibilityRole="button"
        accessibilityLabel={busy ? "Reading the photo" : "Photograph your writing"}
        accessibilityState={{ busy, disabled: busy }}
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
