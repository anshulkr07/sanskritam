// Typed API client against the Shabd FastAPI backend.
// Contract mirrors backend/app/schemas.py + routers/ exactly (mapped 2026-08-30).

import { BASE_URL } from "../config";

export type BridgeLangs = string[];

// ─── Auth ─────────────────────────────────────────────────────────────────

export interface LearnerProfile {
  id: string;
  display_name: string;
  bridge_langs: BridgeLangs;
  sanskrit_ratio: number;
  script_ratio: number;
  feature_mastery: Record<string, number>;
  streak: number;
  voice_minutes_used: number;
}

export interface DevLoginResponse {
  token: string;
  learner: {
    id: string;
    display_name: string;
    bridge_langs: BridgeLangs;
    sanskrit_ratio: number;
    sanskrit_ratio_setting?: number;
    script_ratio: number;
    feature_mastery: Record<string, number>;
    streak: number;
    voice_minutes_used: number;
  };
}

// ─── Learner ──────────────────────────────────────────────────────────────

export interface MeResponse {
  learner: LearnerProfile;
  model: {
    sanskrit_ratio: number;
    sanskrit_ratio_setting: number;
    script_ratio: number;
    feature_mastery: Record<string, number>;
    streak: number;
    bridge_langs: BridgeLangs;
  };
}

// ─── Challenges ───────────────────────────────────────────────────────────

export interface Challenge {
  id: string;
  prompt_l1: string;
  prompt_lang: string;
  target_sanskrit: string;
  target_iast: string;
  features: string[];
  audio_url: string;
  register: string;
}

// ─── Attempts ─────────────────────────────────────────────────────────────

export type Verdict = "correct" | "off_by_one" | "incorrect" | "unsure";

export interface AttemptResponse {
  verdict: Verdict;
  parsed_features: Record<string, string>;
  accepted_parses: Record<string, string>[];
  diff: Record<string, unknown>[];
  diagnosis: string;
  grammar_note: Record<string, unknown> | null;
  abstained: boolean;
  updated_model: {
    sanskrit_ratio: number;
    sanskrit_ratio_setting: number;
    script_ratio: number;
    feature_mastery: Record<string, number>;
    streak: number;
  };
}

// ─── Shloka ───────────────────────────────────────────────────────────────

export interface WordBreakdown {
  word: string;
  meaning: string;
  features: string[];
}

export interface Shloka {
  id: string;
  date: string;
  source_ref: string;
  devanagari: string;
  iast: string;
  metre: string;
  word_breakdown: WordBreakdown[];
  features: string[];
  audio_url: string;
}

// ─── Varnamala ────────────────────────────────────────────────────────────

export interface VarnamalaChar {
  devanagari: string;
  iast: string;
  place: string | null;
  voicing: string | null;
  kind: string;
  iast_place: string | null;
}

export interface VarnamalaResponse {
  vowels: VarnamalaChar[];
  consonants: VarnamalaChar[];
  nasals: VarnamalaChar[];
  others: VarnamalaChar[];
}

export interface Feature {
  id: string;
  kind: string;
  rank: number;
  label_en: string;
  label_hi: string;
}

// ─── Conversation ─────────────────────────────────────────────────────────

export interface ConversationScenario {
  id: string;
  title: string;
  description: string;
  register: string;
  est_minutes: number;
  node_count: number;
}

export interface ConversationNode {
  id: string;
  kind: string; // 'tutor' | 'repair'
  lang: string;
  devanagari: string;
  iast: string;
  gloss: string;
  audio_url: string;
  repair_type: string | null;
}

export interface ConversationEdge {
  id: string;
  lang: string; // 'sa' | 'bridge'
  expected_text: string;
  features: string[];
}

export interface StartResponse {
  session_id: string;
  scenario: {
    id: string;
    title: string;
    description: string;
    est_minutes: number;
  };
  node: ConversationNode;
  edges: ConversationEdge[];
}

/** A learner move ABOUT the conversation rather than in it. */
export type MetaIntent = "explain" | "repeat" | "translate";

export interface TurnResponse {
  verdict: Verdict;
  diagnosis: string;
  matched: boolean;
  node: ConversationNode | null;
  edges: ConversationEdge[];
  session_done: boolean;
  escape: boolean;
  ratio_hint: number;
  /**
   * Set when the learner asked about the line instead of answering it. The
   * node did NOT advance and nothing was graded. "repeat" is answered here
   * by replaying the node; "explain"/"translate" need conversationExplain(),
   * a second call by design so the turn itself stays model-free.
   */
  meta_intent: MetaIntent | null;
}

export interface ExplainResponse {
  explanation: string;
  /** 'llm' | 'gloss' | 'none' — 'gloss' means the model was unreachable. */
  source: string;
  provider: string;
  line: string;
}

// ─── Speech ───────────────────────────────────────────────────────────────

export interface TTSResponse {
  audio_base64: string;
  duration_hint: number | null;
}

export interface STTResponse {
  transcript: string;
  language_code: string;
}

// ─── Client ───────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

async function request<T>(path: string, init: RequestInit = {}, withAuth = false): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (withAuth && authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, `Network error reaching ${BASE_URL}${path}`);
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = (body as { detail?: string }).detail ?? detail;
    } catch {
      /* non-JSON error body — keep statusText */
    }
    throw new ApiError(res.status, detail);
  }
  return (await res.json()) as T;
}

/**
 * Multipart request — used for /speech/stt with recorded audio.
 * Accepts a file URI string (React Native), Blob, or Uint8Array.
 * The backend reads `file` as a FormFile with `language_code`/`mode` form fields.
 */
export async function uploadSpeech(
  audio: string | Blob | Uint8Array,
  filename: string,
  mime: string,
  languageCode = "sa-IN",
  mode = "transcribe",
): Promise<STTResponse> {
  const uploadUrl = `${BASE_URL}/speech/stt`;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  // React Native environment with a file URI
  if (typeof audio === "string") {
    const FileSystem = require("expo-file-system/legacy");
    const uploadType = FileSystem.FileSystemUploadType ? FileSystem.FileSystemUploadType.MULTIPART : 1;
    const res = await FileSystem.uploadAsync(uploadUrl, audio, {
      httpMethod: "POST",
      uploadType: uploadType,
      fieldName: "file",
      mimeType: mime,
      parameters: {
        language_code: languageCode,
        mode: mode,
      },
      headers,
    });

    if (res.status >= 200 && res.status < 300) {
      return JSON.parse(res.body) as STTResponse;
    } else {
      let detail = `Upload failed with status ${res.status}`;
      try {
        const body = JSON.parse(res.body);
        detail = body.detail ?? detail;
      } catch { }
      throw new ApiError(res.status, detail);
    }
  }

  // Web environment using FormData
  const form = new FormData();
  const file =
    audio instanceof Blob ? audio : new Blob([audio as unknown as BlobPart], { type: mime });
  form.append("file", file, filename);
  form.append("language_code", languageCode);
  form.append("mode", mode);

  const res = await fetch(uploadUrl, {
    method: "POST",
    headers,
    body: form,
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = (body as { detail?: string }).detail ?? detail;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, detail);
  }
  return (await res.json()) as STTResponse;
}

// ─── Endpoint helpers ─────────────────────────────────────────────────────

export const api = {
  health: () => request<{ status: string; version: string }>("/health"),

  devLogin: (displayName: string, bridgeLangs: BridgeLangs = ["en", "hi"]) =>
    request<DevLoginResponse>("/auth/dev-login", {
      method: "POST",
      body: JSON.stringify({ display_name: displayName, bridge_langs: bridgeLangs }),
    }),

  anonLogin: (installId: string, bridgeLangs: BridgeLangs = ["en", "hi"]) =>
    request<DevLoginResponse>("/auth/anonymous", {
      method: "POST",
      body: JSON.stringify({ install_id: installId, bridge_langs: bridgeLangs }),
    }),

  me: () => request<MeResponse>("/me", {}, true),

  updateRatio: (body: { sanskrit_ratio?: number; script_ratio?: number }) =>
    request<MeResponse>("/me", { method: "PATCH", body: JSON.stringify(body) }, true),

  nextChallenge: (register = "laukika", mode = "text") =>
    request<Challenge>(`/challenges/next?register=${register}&mode=${mode}`, {}, true),

  listChallenges: (register = "laukika") =>
    request<Challenge[]>(`/challenges?register=${register}`, {}, true),

  submitAttempt: (challengeId: string, responseText: string) =>
    request<AttemptResponse>(
      "/attempts",
      { method: "POST", body: JSON.stringify({ challenge_id: challengeId, response_text: responseText }) },
      true,
    ),

  todayShloka: () => request<Shloka>("/shlokas/today"),

  varnamala: () => request<VarnamalaResponse>("/grammar/varnamala"),

  features: () => request<Feature[]>("/grammar/features", {}, true),

  // Conversation
  conversationScenarios: () =>
    request<{ scenarios: ConversationScenario[] }>("/conversation/scenarios", {}, true),
  conversationStart: (scenarioId?: string) =>
    request<StartResponse>(
      "/conversation/start",
      { method: "POST", body: JSON.stringify({ scenario_id: scenarioId ?? null }) },
      true,
    ),
  conversationTurn: (sessionId: string, transcript: string, edgeId?: string) =>
    request<TurnResponse>(
      "/conversation/turn",
      {
        method: "POST",
        body: JSON.stringify({ session_id: sessionId, transcript, edge_id: edgeId ?? null }),
      },
      true,
    ),
  /**
   * Explain a tutor line. Runs off the turn path, so it is slower (~2 s) than
   * a turn and safe to await only after the turn has already rendered.
   * `text` targets an earlier bubble; omit it for the current node.
   */
  conversationExplain: (
    sessionId: string,
    opts: { question?: string; text?: string; translateOnly?: boolean } = {},
  ) =>
    request<ExplainResponse>(
      "/conversation/explain",
      {
        method: "POST",
        body: JSON.stringify({
          session_id: sessionId,
          question: opts.question ?? "",
          text: opts.text ?? "",
          translate_only: opts.translateOnly ?? false,
        }),
      },
      true,
    ),

  // Speech
  tts: (text: string, languageCode = "hi-IN", speaker = "aditya", pace = 1.0) =>
    request<TTSResponse>(
      "/speech/tts",
      {
        method: "POST",
        body: JSON.stringify({ text, language_code: languageCode, speaker, pace }),
      },
      true,
    ),

  stt: (audio: string | Blob | Uint8Array, filename = "recording.wav", mime = "audio/wav", languageCode = "sa-IN") =>
    uploadSpeech(audio, filename, mime, languageCode, "transcribe"),
};

export default api;