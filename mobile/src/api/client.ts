// Typed API client against the Sanskritam FastAPI backend.
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

/**
 * Conversation turns carry verdicts the challenge grader never emits. An
 * escape is not an error (§6.3): "no_match" means the graph had no edge, not
 * that the learner was wrong. "revealed" is the escalation ladder giving up
 * on asking and telling — its `diagnosis` carries the answer and must be
 * shown rather than replaced with the generic escape copy.
 */
export type TurnVerdict =
  | Verdict
  | "no_match"
  | "empty"
  | "meta"
  | "revealed"
  /** LLM mode: the learner answered in their own language, not Sanskrit. */
  | "bridge";

/**
 * "llm" — the free-form tutor: any grammatical answer is accepted, Vidyut
 * gates the Sanskrit, and there are no edges to choose from. "graph" — the
 * authored dialogue graph, kept as the fallback when the model is unreachable.
 */
export type ConversationMode = "llm" | "graph";

export interface AttemptResponse {
  verdict: Verdict;
  parsed_features: Record<string, string>;
  accepted_parses: Record<string, string>[];
  diff: Record<string, unknown>[];
  diagnosis: string;
  grammar_note: Record<string, unknown> | null;
  abstained: boolean;
  /**
   * P9-3 / U10-2: the correct form's derivation — present ONLY on a
   * grammatical miss, never on `unsure` (§2.2). Consumed by the Challenge
   * screen via DerivationPlayer; answers grammar, while the LLM gloss
   * (grammar_note) answers meaning — either may be absent.
   */
  derivation: Derivation | null;
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

// ─── Path spine (P7-5) ────────────────────────────────────────────────────

/** One node of the approved-content journey (GET /grammar/path). */
export interface PathNode {
  id: string;
  feature: string;
  kind: string;
  rank: number;
  label_en: string;
  label_hi: string;
  approved_count: number;
  pending_count: number;
  mastery: number;
}

export interface PathSpine {
  nodes: PathNode[];
  features_covered: number;
  features_total: number;
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
  /**
   * Base64 WAV synthesised server-side and returned WITH the turn.
   *
   * Empty when the node has a pre-rendered `audio_url` (no synthesis needed)
   * or when TTS was unavailable — in both cases the client falls back. Its
   * whole point is removing a fourth serial round trip from a turn that
   * already costs three.
   */
  audio_base64?: string;
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
  mode: ConversationMode;
}

/** A learner move ABOUT the conversation rather than in it. */
export type MetaIntent = "explain" | "repeat" | "translate";

export interface TurnResponse {
  verdict: TurnVerdict;
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
  mode: ConversationMode;
  /**
   * LLM mode: at most one short grammar note about the learner's line, raised
   * only when Vidyut found a real error. A word Vidyut cannot read — a name,
   * a place — is never a correction.
   */
  correction: string;
  /** LLM mode: the model was unreachable and this turn is a stand-in. */
  degraded: boolean;
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

// ─── Grammar proof surfaces (U7) ──────────────────────────────────────────

/** A single step of a Pāṇinian derivation (from GET /grammar/derive). */
export interface DerivationStep {
  code: string;
  sutra_text: string;
  sutra_devanagari: string;
  result: string;
}

export interface Derivation {
  result: string;
  step_count: number;
  steps: DerivationStep[];
}

export interface ScanSyllable {
  syllable_devanagari: string;
  weight: string; // 'G' | 'L'
}

export interface Scansion {
  lines: { syllables: ScanSyllable[] }[];
  metre: string | null;
}

export interface WordOrder {
  words: string[];
  equivalent_orders: string[][];
  per_word: { word: string; role: string; ending: string }[];
  wrong_endings: { word: string; wrong_ending: string; effect: string }[];
  refused: string | null;
}

export interface VarnaDistance {
  a: string;
  b: string;
  distance: number;
  axis: string | null;
}

export interface ParadigmCell {
  vibhakti: string;
  vacana: string;
  form: string | null;
  derivation: Derivation | null;
}

export interface Paradigm {
  rows: ParadigmCell[][];
  kind: string;
}

// ─── Ask anywhere (U11 / P19) ─────────────────────────────────────────────
// A session-free explain endpoint with engine-first routing. `routed_to`
// tells the learner which shape of answer they are reading (U11-2: an engine
// answer is a derivation and is authoritative; a model answer is prose and
// is help — they must not look alike).

export interface AskEngineStep {
  code: string;
  sutra: string;
  result: string;
}

export interface AskEngineBlock {
  kind: "parse" | "split" | "scansion" | "info";
  // parse
  word?: string;
  iast?: string;
  stem?: string;
  feature?: string;
  derivation?: { result: string; step_count: number; steps: AskEngineStep[] };
  // split
  joined?: string;
  splits?: { first: string; second: string; first_iast: string; second_iast: string }[];
  // scansion
  lines?: { syllables: ScanSyllable[] }[];
  metre?: string;
  // info
  text?: string;
}

export interface AskResponse {
  routed_to: "engine" | "llm" | "cache" | "engine_fallback";
  explanation: string;
  engine: { routed_to?: string; title?: string; blocks?: AskEngineBlock[]; subject?: string };
  source: "engine" | "llm" | "engine_fallback" | "";
  provider: string;
  cached: boolean;
}

// ─── Writing practice (U12 / P20) ──────────────────────────────────────────

export interface StrokePath {
  d: string;
  dir: "ltr" | "rtl" | "ttb" | "btt";
}

export interface WritingItem {
  id: string;
  tier: number; // 1 letter | 2 mātrā | 3 word
  sort_order: number;
  devanagari: string;
  iast: string;
  gloss: string;
  stroke_paths: StrokePath[];
  challenge_id: string | null;
}

export interface WritingAttemptResponse {
  verdict: "correct" | "wrong" | "unsure";
  abstained: boolean;
  item_id: string;
  item_devanagari: string;
  item_iast: string;
  attempt_id: number | null;
}

// ─── Daily word (U8-4 / P12) — वर्ण-बन्धः ────────────────────────────
// Tile states: exact · near (right place, wrong axis) · present (elsewhere) ·
// absent. `axis` carries the phonetic reason so the four states never collapse
// to colour alone (U5-3).

// ─── Pronunciation (P3 / U9-1) ─────────────────────────────────────────
// Verdicts follow the abstention principle (§2.2 / §3.3): `unsure` /
// `abstained` means the system failed to hear, never that the learner failed.

export interface PronunciationResult {
  verdict: "correct" | "near" | "incorrect" | "unsure";
  transcript: string;
  /** Contrast class name, e.g. "retroflex_vs_dental" — the teachable result. */
  contrast: string;
  confidence: number;
  abstained: boolean;
  diagnosis: string;
  streak_changed: boolean;
}

// ─── Progress (P4 / U9-2) ──────────────────────────────────────────────

export interface ProgressDaily {
  date: string;
  xp: number;
  attempts: number;
  conversation_turns: number;
  pronunciation_attempts: number;
  goal_met: boolean;
  goal_xp: number;
}

export interface ProgressStreak {
  streak: number;
  freezes: number;
  max_freezes: number;
}

export interface ProgressRepair {
  repaired: boolean;
  streak: number;
  freezes_remaining: number;
}

/** One learner-local activity day, for the streak calendar (U9-2). */
export interface ProgressDay {
  date: string;
  xp: number;
  attempts: number;
  goal_met: boolean;
}

export type DailyWordTileState = "exact" | "near" | "present" | "absent";

export interface DailyWordTile {
  character: string;
  state: DailyWordTileState;
  axis: string | null;
}

export interface DailyWordPuzzle {
  date: string;
  available: boolean;
  solved: boolean;
  finished: boolean;
  guesses_used: number;
  max_guesses: number;
  word_length: number;
  clue: string;
  streak: number;
  status: string; // open | solved | finished | no_word
  revealed?: { answer: string; answer_iast: string } | null;
}

export interface DailyWordGuessResponse {
  status: string; // open | solved | finished | completed | refused | no_word
  solved: boolean;
  finished: boolean;
  tiles: DailyWordTile[];
  guesses_used: number;
  max_guesses: number;
  revealed?: { answer: string; answer_iast: string } | null;
  reason?: string;
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

/** Serialize an object into a URL query string, skipping undefined values. */
function toQuery(params: Record<string, unknown>): string {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.join("&");
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

// ─── Endpoint helpers ─────────────────────────────────────────────────

/**
 * Multipart upload for a pronunciation attempt (U9-1). Mirrors uploadSpeech's
 * shape — recorder URI on native, FormData on web — but posts to
 * /pronunciation/attempt with { file, target, target_iast }. The verdict obeys
 * the abstention principle: `unsure`/`abstained` is the system failing to hear,
 * not the learner failing (§2.2 / §3.3).
 */
export async function uploadPronunciation(
  audio: string | Blob | Uint8Array,
  filename: string,
  mime: string,
  target: string,
  targetIast = "",
): Promise<PronunciationResult> {
  const uploadUrl = `${BASE_URL}/pronunciation/attempt`;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  // React Native environment with a file URI
  if (typeof audio === "string") {
    const FileSystem = require("expo-file-system/legacy");
    const uploadType = FileSystem.FileSystemUploadType ? FileSystem.FileSystemUploadType.MULTIPART : 1;
    const res = await FileSystem.uploadAsync(uploadUrl, audio, {
      httpMethod: "POST",
      uploadType,
      fieldName: "file",
      mimeType: mime,
      parameters: { target, target_iast: targetIast },
      headers,
    });
    if (res.status >= 200 && res.status < 300) {
      return JSON.parse(res.body) as PronunciationResult;
    }
    let detail = `Upload failed with status ${res.status}`;
    try {
      const body = JSON.parse(res.body);
      detail = (body as { detail?: string }).detail ?? detail;
    } catch { /* keep status fallback */ }
    throw new ApiError(res.status, detail);
  }

  // Web environment using FormData
  const form = new FormData();
  const file =
    audio instanceof Blob ? audio : new Blob([audio as unknown as BlobPart], { type: mime });
  form.append("file", file, filename);
  form.append("target", target);
  form.append("target_iast", targetIast);

  const res = await fetch(uploadUrl, { method: "POST", headers, body: form });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = (body as { detail?: string }).detail ?? detail;
    } catch { /* keep statusText */ }
    throw new ApiError(res.status, detail);
  }
  return (await res.json()) as PronunciationResult;
}

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

  googleLogin: (idToken: string, bridgeLangs: BridgeLangs = ["en", "hi"], timezone?: string) =>
    request<DevLoginResponse>("/auth/google", {
      method: "POST",
      body: JSON.stringify({
        id_token: idToken,
        bridge_langs: bridgeLangs,
        timezone,
      }),
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

  todayShloka: () => request<Shloka>("/shlokas/today", {}, true),

  // U13/P21: the reader corpus — full list in date order, instrumentation included.
  listShlokas: () => request<Shloka[]>("/shlokas", {}, true),

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

  // Ask anywhere (U11 / P19) — session-free, engine-first.
  ask: (surface: string, subject: string, question = "") =>
    request<AskResponse>(
      "/explain",
      {
        method: "POST",
        body: JSON.stringify({ surface, subject, question }),
      },
      true,
    ),

  // Writing practice (U12 / P20) — recognition runs ON-DEVICE (§2.16); the
  // server sees only the recognised string + confidence, never strokes.
  writingItems: (tier?: number) =>
    request<WritingItem[]>(
      "/writing/items" + (tier ? `?tier=${tier}` : ""),
      {},
      true,
    ),
  writingAttempt: (itemId: string, recognisedText: string, confidence: number, source: "ink" | "photo") =>
    request<WritingAttemptResponse>(
      "/writing/attempt",
      {
        method: "POST",
        body: JSON.stringify({
          item_id: itemId,
          recognised_text: recognisedText,
          confidence,
          source,
        }),
      },
      true,
    ),

  // Grammar proof surfaces (U7) — local computation, no quota.
  deriveWord: (params: {
    dhatu?: string; lakara?: string; purusha?: string; vacana?: string;
    pratipadika?: string; linga?: string; vibhakti?: string;
  }) =>
    request<Derivation>("/grammar/derive?" + toQuery(params)),

  scansion: (text: string) =>
    request<Scansion>("/grammar/scansion?text=" + encodeURIComponent(text)),

  sandhiSplit: (joined: string) =>
    request<{ candidates: { first: string; second: string; first_valid: boolean; second_valid: boolean }[] }>(
      "/grammar/sandhi?joined=" + encodeURIComponent(joined),
    ),

  wordOrder: (sentence: string) =>
    request<WordOrder>("/grammar/word-order?sentence=" + encodeURIComponent(sentence)),

  varnaDistance: (a: string, b: string) =>
    request<VarnaDistance>("/grammar/varna-distance?a=" + encodeURIComponent(a) + "&b=" + encodeURIComponent(b)),

  paradigm: (params: { pratipadika?: string; linga?: string; dhatu?: string; lakara?: string }) =>
    request<Paradigm>("/grammar/paradigm?" + toQuery(params)),

  // Approved-content spine for the journey path (P7-5)
  pathSpine: () => request<PathSpine>("/grammar/path", {}, true),

  // Daily word (U8-4 / P12) — वर्ण-बन्धः
  dailyWord: () => request<DailyWordPuzzle>("/daily-word", {}, true),

  dailyWordGuess: (guess: string) =>
    request<DailyWordGuessResponse>(
      "/daily-word/guess",
      { method: "POST", body: JSON.stringify({ guess }) },
      true,
    ),

  // Pronunciation (P3 / U9-1)
  pronunciationAttempt: (
    audio: string | Blob | Uint8Array,
    filename: string,
    mime: string,
    target: string,
    targetIast = "",
  ) => uploadPronunciation(audio, filename, mime, target, targetIast),

  // Progress (P4 / U9-2)
  progressDaily: () => request<ProgressDaily>("/progress/daily", {}, true),
  progressStreak: () => request<ProgressStreak>("/progress/streak", {}, true),
  progressRepair: () =>
    request<ProgressRepair>("/progress/repair", { method: "POST" }, true),
  progressHistory: (days = 35) =>
    request<ProgressDay[]>(`/progress/history?days=${days}`, {}, true),
};

export default api;