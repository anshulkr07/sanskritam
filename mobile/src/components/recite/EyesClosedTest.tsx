// EyesClosedTest: front-camera eyes-closed check (needs dev build 1.2.0+).
//
// Expo Camera v57 has no on-device face detection of its own, so stills are
// classified with `@react-native-ml-kit/face-detection` (on-device ML Kit,
// already in package.json). In Expo Go the native module is absent — the
// preview still loads, but no samples are produced and the server counts the
// attempt as `no_face`. That honest fallback replaces the old "Update the app"
// branch, which hid the CameraView entirely (the "front camera not loading"
// report) and never asked for permission.

import { CameraView, useCameraPermissions } from "expo-camera";
import * as FileSystem from "expo-file-system/legacy";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Linking, NativeModules, Pressable, StyleSheet, Text, View } from "react-native";

import { summarize, type EyeSample } from "../../recite/eyes";
import { color } from "../../theme";

const APP_VERSION = "1.3.0";
const INTERVAL_MS = 700;

type MlFace = {
  leftEyeOpenProbability?: number;
  rightEyeOpenProbability?: number;
  // ML Kit shape: `frame`. Old code read `bounds.size.height` and always got 0.
  frame?: { width?: number; height?: number };
  bounds?: { size?: { height?: number } };
  contours?: Record<string, { points?: { x: number; y: number }[] }>;
};

function faceDetectFn(): ((uri: string, opts: object) => Promise<MlFace[]>) | null {
  try {
    // Static literal require so Metro can resolve it; guarded so Expo Go /
    // web (no native linking) falls back instead of crashing. Same seam as
    // photoRecogniser.ts.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { NativeModules: NM } = require("react-native");
    if (!NM?.FaceDetection) return null;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("@react-native-ml-kit/face-detection");
    const FD = mod?.default ?? mod;
    if (FD?.detect && typeof FD.detect === "function") {
      return (uri: string, opts: object) => FD.detect(uri, opts) as Promise<MlFace[]>;
    }
    // Native module present but JS proxy missing (partial link): call it directly.
    const m = (NativeModules as Record<string, unknown>).FaceDetection as
      | { detect?: (uri: string, opts: object) => Promise<MlFace[]> }
      | undefined;
    if (m?.detect) return (uri, opts) => m.detect!(uri, opts);
    return null;
  } catch {
    return null;
  }
}

export default function EyesClosedTest({
  onDone,
}: {
  onDone: (cameraJson: string, outcome: "closed" | "opened" | "nosee") => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [ready, setReady] = useState(false);
  const [running, setRunning] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [mountError, setMountError] = useState("");
  const [detectAvailable] = useState(() => faceDetectFn() !== null);
  const [noFaceNote, setNoFaceNote] = useState(false);
  const camRef = useRef<CameraView | null>(null);
  const busy = useRef(false);
  const samples = useRef<EyeSample[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const startAt = useRef(0);
  const runningRef = useRef(false);
  runningRef.current = running;

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const capture = useCallback(async () => {
    // Never fire takePictureAsync into a preview that has not started
    // (expo-camera v57: wait for onCameraReady) or without permission.
    if (busy.current || !camRef.current || !cameraReady) return;
    if (!permission?.granted) return;
    const detect = faceDetectFn();
    // No native face module (Expo Go / web): keep the preview up, but there
    // is nothing to sample — the server will count this as no_face.
    if (!detect) return;
    busy.current = true;
    try {
      const photo = await camRef.current.takePictureAsync({
        quality: 0.2,
        shutterSound: false,
      });
      const uri = (photo as { uri?: string })?.uri;
      if (!uri) return;
      let faces: MlFace[] = [];
      try {
        const out = await detect(uri, {
          performanceMode: "fast",
          classificationMode: "all",
          contourMode: "all",
        });
        faces = Array.isArray(out) ? out : [];
      } catch {
        faces = [];
      }
      try {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      } catch { /* deleted */ }
      const t = Date.now() - startAt.current;
      if (!runningRef.current && faces.length === 1) {
        const f = faces[0];
        if ((f.leftEyeOpenProbability ?? 0) > 0.6 && (f.rightEyeOpenProbability ?? 0) > 0.6) {
          setReady(true);
        }
        return;
      }
      if (runningRef.current) {
        const f = faces[0];
        let mouth: number | null = null;
        try {
          const up = f?.contours?.upperLipBottom?.points ?? [];
          const lo = f?.contours?.lowerLipTop?.points ?? [];
          const h = f?.frame?.height ?? f?.bounds?.size?.height ?? 0;
          if (up.length && lo.length && h) {
            const mid = (p: { x: number; y: number }[]) =>
              p.reduce((a, b) => a + b.y, 0) / p.length;
            mouth = Math.abs(mid(up) - mid(lo)) / h;
          }
        } catch { mouth = null; }
        samples.current.push({
          t,
          faces: faces.length,
          leftOpen: f?.leftEyeOpenProbability ?? null,
          rightOpen: f?.rightEyeOpenProbability ?? null,
          mouthGap: mouth,
        });
      }
    } finally {
      busy.current = false;
    }
  }, [cameraReady, permission?.granted]);

  useEffect(() => {
    if (timer.current) clearInterval(timer.current);
    // Sample only while the preview is live; the cadence matches eyes.ts.
    if (!cameraReady || !permission?.granted) return;
    timer.current = setInterval(() => void capture(), INTERVAL_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [running, cameraReady, permission?.granted, capture]);

  const start = () => {
    samples.current = [];
    startAt.current = Date.now();
    setNoFaceNote(false);
    setRunning(true);
  };

  const finish = () => {
    setRunning(false);
    const s = summarize(samples.current, INTERVAL_MS, APP_VERSION);
    const outcome = s.face_ratio < 0.5 ? "nosee" : s.eyes_closed_ratio >= 0.85 ? "closed" : "opened";
    if (outcome === "nosee") setNoFaceNote(true);
    onDone(JSON.stringify(s), outcome);
  };

  // Permission still loading — keep a placeholder so the layout does not jump.
  if (!permission) {
    return (
      <View style={styles.root}>
        <View style={[styles.preview, styles.previewOff]}>
          <Text style={styles.line}>Loading camera…</Text>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    const blocked = permission.canAskAgain === false;
    return (
      <View style={styles.root}>
        <View style={[styles.preview, styles.previewOff]}>
          <Text style={styles.line}>Camera access is off</Text>
          <Text style={styles.hint}>
            Allow the front camera so the competition can check your eyes are closed. Photos stay on this phone.
          </Text>
          <Pressable
            onPress={() => (blocked ? void Linking.openSettings() : void requestPermission())}
            accessibilityRole="button"
            accessibilityLabel={blocked ? "Open settings" : "Allow camera"}
            style={styles.btn}
          >
            <Text style={styles.btnText}>{blocked ? "Open settings" : "Allow camera"}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView
        ref={camRef}
        facing="front"
        animateShutter={false}
        mirror
        onCameraReady={() => {
          setCameraReady(true);
          setMountError("");
        }}
        onMountError={(e) => setMountError(e?.message ?? "Camera did not start.")}
        style={styles.preview}
      />
      {!!mountError && (
        <Text style={styles.error} accessibilityRole="alert">{mountError} Close other camera apps and reopen this screen.</Text>
      )}
      {!detectAvailable && (
        <Text style={styles.hint}>
          Face check is not available in this build (needs a dev build with the on-device face module).
          The camera still shows, but this try will not count for the leaderboard.
        </Text>
      )}
      {!cameraReady && !mountError && <Text style={styles.hint}>Starting front camera…</Text>}
      {noFaceNote && (
        <Text style={styles.hint}>Face not seen enough — prop the phone so the front camera sees you.</Text>
      )}
      {!running ? (
        <Pressable
          onPress={start}
          disabled={!ready || !cameraReady}
          accessibilityRole="button"
          accessibilityLabel={ready ? "Start the recitation" : "Frame your face first"}
          accessibilityState={{ disabled: !ready || !cameraReady }}
          style={[styles.btn, (!ready || !cameraReady) && { opacity: 0.5 }]}
        >
          <Text style={styles.btnText}>
            {!cameraReady ? "Starting camera…" : ready ? "Start" : "Frame your face (eyes open)"}
          </Text>
        </Pressable>
      ) : (
        <Pressable
          onPress={finish}
          accessibilityRole="button"
          accessibilityLabel="Finish"
          style={styles.finish}
        >
          <Text style={styles.btnText}>Tap anywhere to finish</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 8 },
  preview: { height: 220, borderRadius: 12, overflow: "hidden", backgroundColor: "#1B1712" },
  previewOff: { alignItems: "center", justifyContent: "center", gap: 8, padding: 12 },
  btn: { minHeight: 48, alignItems: "center", justifyContent: "center", backgroundColor: color.ink, borderRadius: 12, paddingHorizontal: 12 },
  btnText: { color: "#FFF8EE", fontWeight: "800" },
  finish: { minHeight: 120, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#D9C9AE", borderRadius: 12 },
  line: { fontSize: 14, color: color.ink, fontWeight: "700" },
  hint: { fontSize: 13, color: color.inkSoft },
  error: { fontSize: 14, color: color.badText },
});
