// EyesClosedTest: front-camera eyes-closed check, driven by the Recite
// screen (handover_games_daily_multiplayer §7: the check starts with the
// scored interval and stops the moment the learner stops).
//
// Expo Camera v57 has no on-device face detection of its own, so stills are
// classified with `@react-native-ml-kit/face-detection` (on-device ML Kit,
// in the shipped build). Before `running`, samples only answer "is one face
// in frame with eyes open?" (onReady). While `running`, every sample is kept;
// when `running` turns false the summary goes to onDone. Without the native
// face module (Expo Go, web) the preview still shows, no samples are made and
// the server counts the attempt as `no_face`. No photo leaves the phone.

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

export function faceDetectFn(): ((uri: string, opts: object) => Promise<MlFace[]>) | null {
  try {
    // Static literal require so Metro can resolve it; guarded so Expo Go /
    // web (no native linking) falls back instead of crashing.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { NativeModules: NM } = require("react-native");
    if (!NM?.FaceDetection) return null;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("@react-native-ml-kit/face-detection");
    const FD = mod?.default ?? mod;
    if (FD?.detect && typeof FD.detect === "function") {
      return (uri: string, opts: object) => FD.detect(uri, opts) as Promise<MlFace[]>;
    }
    const m = (NativeModules as Record<string, unknown>).FaceDetection as
      | { detect?: (uri: string, opts: object) => Promise<MlFace[]> }
      | undefined;
    if (m?.detect) return (uri, opts) => m.detect!(uri, opts);
    return null;
  } catch {
    return null;
  }
}

export type EyesOutcome = "closed" | "opened" | "nosee";

export default function EyesClosedTest({
  running,
  onReady,
  onDone,
}: {
  running: boolean;
  onReady?: (ready: boolean) => void;
  onDone: (cameraJson: string, outcome: EyesOutcome) => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [ready, setReady] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [mountError, setMountError] = useState("");
  const [detectAvailable] = useState(() => faceDetectFn() !== null);
  const camRef = useRef<CameraView | null>(null);
  const busy = useRef(false);
  const samples = useRef<EyeSample[]>([]);
  const startAt = useRef(0);
  const runningRef = useRef(running);
  const wasRunning = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  runningRef.current = running;

  useEffect(() => { onReady?.(ready); }, [ready, onReady]);

  // running: false -> true starts a fresh sample set; true -> false reports.
  useEffect(() => {
    if (running && !wasRunning.current) {
      samples.current = [];
      startAt.current = Date.now();
    } else if (!running && wasRunning.current) {
      const s = summarize(samples.current, INTERVAL_MS, APP_VERSION);
      const outcome: EyesOutcome = s.face_ratio < 0.5 ? "nosee" : s.eyes_closed_ratio >= 0.85 ? "closed" : "opened";
      onDoneRef.current(JSON.stringify(s), outcome);
    }
    wasRunning.current = running;
  }, [running]);

  const capture = useCallback(async () => {
    if (busy.current || !camRef.current || !cameraReady) return;
    if (!permission?.granted) return;
    const detect = faceDetectFn();
    if (!detect) return;
    busy.current = true;
    try {
      const photo = await camRef.current.takePictureAsync({ quality: 0.2, shutterSound: false });
      const uri = (photo as { uri?: string })?.uri;
      if (!uri) return;
      let faces: MlFace[] = [];
      try {
        const out = await detect(uri, { performanceMode: "fast", classificationMode: "all", contourMode: "all" });
        faces = Array.isArray(out) ? out : [];
      } catch {
        faces = [];
      }
      try { await FileSystem.deleteAsync(uri, { idempotent: true }); } catch { /* deleted */ }
      if (!runningRef.current) {
        const f = faces[0];
        setReady(faces.length === 1 && (f.leftEyeOpenProbability ?? 0) > 0.6 && (f.rightEyeOpenProbability ?? 0) > 0.6);
        return;
      }
      const f = faces[0];
      let mouth: number | null = null;
      try {
        const up = f?.contours?.upperLipBottom?.points ?? [];
        const lo = f?.contours?.lowerLipTop?.points ?? [];
        const h = f?.frame?.height ?? f?.bounds?.size?.height ?? 0;
        if (up.length && lo.length && h) {
          const mid = (p: { x: number; y: number }[]) => p.reduce((a, b) => a + b.y, 0) / p.length;
          mouth = Math.abs(mid(up) - mid(lo)) / h;
        }
      } catch { mouth = null; }
      samples.current.push({
        t: Date.now() - startAt.current,
        faces: faces.length,
        leftOpen: f?.leftEyeOpenProbability ?? null,
        rightOpen: f?.rightEyeOpenProbability ?? null,
        mouthGap: mouth,
      });
    } finally {
      busy.current = false;
    }
  }, [cameraReady, permission?.granted]);

  useEffect(() => {
    if (!cameraReady || !permission?.granted) return;
    const t = setInterval(() => void capture(), INTERVAL_MS);
    return () => clearInterval(t);
  }, [cameraReady, permission?.granted, capture]);

  if (!permission) {
    return (
      <View style={[styles.preview, styles.previewOff]}>
        <Text style={styles.line}>Loading camera…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    const blocked = permission.canAskAgain === false;
    return (
      <View style={[styles.preview, styles.previewOff]}>
        <Text style={styles.line}>Camera access is off</Text>
        <Text style={styles.offHint}>
          The eyes-closed check uses the front camera. Photos are checked on this phone and never sent.
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
    );
  }

  const status = !cameraReady
    ? "Starting the front camera…"
    : !detectAvailable
      ? "Face check is not in this app version. This try will not count for the leaderboard."
      : running
        ? "Checking your eyes"
        : ready
          ? "Face found. Ready."
          : "Hold the phone so your face fills the frame, eyes open.";

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
      <View style={styles.statusRow} accessibilityLiveRegion="polite">
        <View style={[styles.dot, { backgroundColor: ready || running ? "#2C5F50" : color.inkFaint }]} />
        <Text style={styles.hint}>{status}</Text>
      </View>
      {!!mountError && (
        <Text style={styles.error} accessibilityRole="alert">{mountError} Close other camera apps and reopen this screen.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 6 },
  preview: { height: 180, overflow: "hidden", backgroundColor: "#1B1712" },
  previewOff: { alignItems: "center", justifyContent: "center", gap: 8, padding: 12 },
  btn: { minHeight: 48, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF8EE", paddingHorizontal: 16 },
  btnText: { color: "#1B1712", fontWeight: "800" },
  offHint: { fontSize: 13, color: "#E8DCC8", textAlign: "center" },
  line: { fontSize: 14, color: "#FFF8EE", fontWeight: "700" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  hint: { fontSize: 13, color: color.inkSoft, flexShrink: 1 },
  error: { fontSize: 14, color: color.badText },
});
