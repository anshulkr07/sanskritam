// Upload one calibration recording (multipart) — mirrors the competition
// upload pattern (file URI on native via expo-file-system/legacy).

import { Platform } from "react-native";

import { BASE_URL } from "../config";
import { getAuthToken } from "./client";

export async function uploadCalibration(
  audio: string,
  body: { prompt_id: string; label: string; speaker_alias: string; device: string; consent: boolean },
): Promise<void> {
  const url = `${BASE_URL}/recite-calibration`;
  const headers: Record<string, string> = {};
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  if (Platform.OS === "web") {
    throw new Error("Calibration capture needs the native app.");
  }
  const FileSystem = require("expo-file-system/legacy");
  const uploadType = FileSystem.FileSystemUploadType
    ? FileSystem.FileSystemUploadType.MULTIPART : 1;
  const res = await FileSystem.uploadAsync(url, audio, {
    httpMethod: "POST",
    uploadType,
    fieldName: "file",
    mimeType: "audio/mp4",
    parameters: {
      prompt_id: body.prompt_id,
      label: body.label,
      speaker_alias: body.speaker_alias,
      device: body.device,
      consent: String(body.consent),
    },
    headers,
  });
  if (res.status < 200 || res.status >= 300) {
    let detail = res.statusText;
    try { detail = (JSON.parse(res.body) as { detail?: string }).detail ?? detail; } catch { /* keep */ }
    throw new Error(detail);
  }
}
