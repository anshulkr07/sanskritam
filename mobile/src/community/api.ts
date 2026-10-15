import { request, getAuthToken, ApiError } from "../api/client";
import { BASE_URL } from "../config";
import { Platform } from "react-native";
export type Level = "beginner" | "intermediate" | "advanced" | "acharya";
export const levels = [
  "all",
  "beginner",
  "intermediate",
  "advanced",
  "acharya",
] as const;
export const levelLabels: Record<string, string> = {
  all: "All levels",
  beginner: "Beginner · प्रारम्भिकः",
  intermediate: "Intermediate · मध्यमः",
  advanced: "Advanced · उत्तमः",
  acharya: "Ācārya · आचार्यः",
};
/** The level on its own, for tags and filters. */
export const levelShort: Record<string, string> = {
  all: "All levels",
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  acharya: "Ācārya",
};
export const levelSa: Record<string, string> = {
  beginner: "प्रारम्भिकः",
  intermediate: "मध्यमः",
  advanced: "उत्तमः",
  acharya: "आचार्यः",
};
/** What each level means, so a learner can place themselves. */
export const levelHints: Record<string, string> = {
  beginner: "Learning the script and first words",
  intermediate: "Reading simple verses with some help",
  advanced: "Reading texts with a dictionary at hand",
  acharya: "Teaching, or reading fluently",
};
export interface Person {
  id: string;
  name: string;
  level: Level;
  bio: string;
  online: boolean;
  friendship?: string | null;
  /** In a circle's member list: "admin" or "member". */
  role?: string;
}
/** Your own profile; `card` is false until you make your learner card. */
export interface MyProfile extends Person {
  card: boolean;
}
export interface Conversation {
  id: string;
  kind: "direct" | "group";
  name: string;
  description: string;
  topic: string;
  level: string;
  public: boolean;
  joined: boolean;
  role: string | null;
  members: Person[];
  member_count: number;
  last_text: string;
  /** "You", a name, or "" when there is no message yet. */
  last_sender: string;
  updated_at: string;
  unread: number;
  call_id: string | null;
}
export interface Room {
  participant_count?: number;
  speakers?: { id: string; name: string }[];
  id: string;
  title: string;
  topic: string;
  level: string;
  host: Person;
}
export interface Message {
  id: number;
  sender: Person;
  kind: "text" | "image" | "audio" | "deleted";
  content: string;
  /** From a learner you blocked (or who blocked you): no content is sent. */
  hidden?: boolean;
  created_at: string;
  media_id: string | null;
  expires_at: string | null;
  duration: number;
  client_id: string;
  reply: { id: number; name: string; content: string } | null;
}
export interface CallInfo {
  initiated?: boolean;
  expires_at?: string;
  id: string;
  title: string;
  kind: "audio_room" | "default";
  conversation_id?: string;
  host_id?: string;
}
export interface Status {
  unread: number;
  live: number;
  /** Friend requests waiting for you. */
  requests: number;
  /** Whether you have a learner card. */
  card: boolean;
  incoming: CallInfo[];
  audio_enabled: boolean;
}
export interface Friends {
  friends: Person[];
  incoming: Person[];
  outgoing: Person[];
}
export const get = <T>(path: string) =>
  request<T>("/community" + path, {}, true);
export const post = <T>(path: string, body: unknown = {}) =>
  request<T>(
    "/community" + path,
    { method: "POST", body: JSON.stringify(body) },
    true,
  );
export const put = <T>(path: string, body: unknown = {}) =>
  request<T>(
    "/community" + path,
    { method: "PUT", body: JSON.stringify(body) },
    true,
  );
export const profile = (level: Level, bio: string, rules = false) =>
  put<MyProfile>("/profile", { level, bio, rules });
export type ReportKind = "message" | "circle" | "learner";
export const report = (kind: ReportKind, id: string, reason: string) =>
  post<void>("/report", { kind, id, reason });
/** The server's answer when an action needs a learner card first. */
export const NEEDS_CARD = 428;
export function needsCard(e: unknown) {
  return e instanceof ApiError && e.status === NEEDS_CARD;
}
/** A sentence for the learner: the server's own words, or a plain fallback. */
export function friendly(e: unknown, fallback = "That did not work. Try again.") {
  if (e instanceof ApiError) {
    if (e.status === 0) return "No connection. Check your internet and try again.";
    if (e.status >= 500 && e.status !== 502 && e.status !== 503)
      return "Something went wrong on our side. Try again in a moment.";
    return e.message || fallback;
  }
  return e instanceof Error && e.message ? e.message : fallback;
}
export function clientId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}
export async function uploadMedia(
  cid: string,
  uri: string,
  mime: string,
  duration = 0,
) {
  const url = BASE_URL + `/community/conversations/${cid}/media`;
  const headers = { Authorization: `Bearer ${getAuthToken()}` };
  if (Platform.OS !== "web") {
    const fs = await import("expo-file-system/legacy");
    const res = await fs.uploadAsync(url, uri, {
      httpMethod: "POST",
      uploadType: fs.FileSystemUploadType.MULTIPART,
      fieldName: "file",
      mimeType: mime,
      parameters: { duration: String(duration) },
      headers,
    });
    const body = JSON.parse(res.body);
    if (res.status >= 400)
      throw new ApiError(res.status, body.detail || "Upload failed.");
    return body as { id: string; expires_at: string };
  }
  const blob = await (await fetch(uri)).blob();
  const data = new FormData();
  data.append(
    "file",
    blob,
    mime.startsWith("image/") ? "photo.webp" : "voice.webm",
  );
  data.append("duration", String(duration));
  const res = await fetch(url, { method: "POST", headers, body: data });
  const body = await res.json();
  if (!res.ok) throw new ApiError(res.status, body.detail || "Upload failed.");
  return body as { id: string; expires_at: string };
}
export function socketUrl() {
  return BASE_URL.replace(/^http/, "ws") + "/community/realtime";
}
