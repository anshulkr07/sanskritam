// EyesClosedTest: front-camera eyes-closed check (needs build 1.2.0).

import { CameraView } from "expo-camera";
import * as FileSystem from "expo-file-system/legacy";
import React, { useEffect, useRef, useState } from "react";
import { NativeModules, Pressable, StyleSheet, Text, View } from "react-native";

import { summarize, type EyeSample } from "../../recite/eyes";
import { color } from "../../theme";

const APP_VERSION = "1.2.0";

function faceModule(): { detect: (uri: string, opts: object) => Promise<unknown[]> } | null {
  const m = (NativeModules as Record<string, unknown>).FaceDetection;
  if (!m) return null;
  return m as never;
}

export default function EyesClosedTest({
  onDone,
}: {
  onDone: (cameraJson: string, outcome: "closed" | "opened" | "nosee") => void;
}) {
  const [ready, setReady] = useState(false);
  const [running, setRunning] = useState(false);
  const [missing, setMissing] = useState(false);
  const camRef = useRef<CameraView | null>(null);
  const busy = useRef(false);
  const samples = useRef<EyeSample[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const startAt = useRef(0);

  useEffect(() => {
    if (!faceModule()) setMissing(true);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  if (missing) {
    return (
      <View style={styles.root}>
        <Text style={styles.line}>Update the app to use this</Text>
      </View>
    );
  }

  const capture = async () => {
    if (busy.current || !camRef.current) return;
    busy.current = true;
    try {
      const photo = await camRef.current.takePictureAsync({
        quality: 0.2,
        shutterSound: false,
      } as never);
      const uri = (photo as { uri?: string })?.uri;
      if (!uri) return;
      const mod = faceModule();
      let faces: { leftEyeOpenProbability?: number; rightEyeOpenProbability?: number; bounds?: { size?: { height?: number } }; contours?: Record<string, { points?: { x: number; y: number }[] }> }[] = [];
      try {
        const out = (await mod?.detect(uri, {
          performanceMode: "fast",
          classificationMode: "all",
          contourMode: "all",
        })) as never as typeof faces;
        faces = Array.isArray(out) ? out : [];
      } catch {
        faces = [];
      }
      try {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      } catch { /* deleted */ }
      const t = Date.now() - startAt.current;
      if (!running && faces.length === 1) {
        const f = faces[0];
        if ((f.leftEyeOpenProbability ?? 0) > 0.6 && (f.rightEyeOpenProbability ?? 0) > 0.6) {
          setReady(true);
        }
        return;
      }
      if (running) {
        const f = faces[0];
        let mouth: number | null = null;
        try {
          const up = f?.contours?.upperLipBottom?.points ?? [];
          const lo = f?.contours?.lowerLipTop?.points ?? [];
          const h = f?.bounds?.size?.height ?? 0;
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
  };

  useEffect(() => {
    timer.current = setInterval(() => void capture(), 700);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const start = () => {
    samples.current = [];
    startAt.current = Date.now();
    setRunning(true);
  };

  const finish = () => {
    setRunning(false);
    const s = summarize(samples.current, 700, APP_VERSION);
    const outcome = s.face_ratio < 0.5 ? "nosee" : s.eyes_closed_ratio >= 0.85 ? "closed" : "opened";
    onDone(JSON.stringify(s), outcome);
  };

  return (
    <View style={styles.root}>
      <CameraView ref={camRef} facing="front" animateShutter={false} style={styles.preview} />
      {!running ? (
        <Pressable
          onPress={start}
          disabled={!ready}
          accessibilityRole="button"
          accessibilityLabel={ready ? "Start the recitation" : "Frame your face first"}
          style={styles.btn}
        >
          <Text style={styles.btnText}>{ready ? "Start" : "Frame your face"}</Text>
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
  preview: { height: 160, borderRadius: 12 },
  btn: { minHeight: 48, alignItems: "center", justifyContent: "center", backgroundColor: color.ink, borderRadius: 12 },
  btnText: { color: "#FFF8EE", fontWeight: "800" },
  finish: { minHeight: 120, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#D9C9AE", borderRadius: 12 },
  line: { fontSize: 14, color: color.ink },
});
