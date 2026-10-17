// Play v2 client: sessions, answers, leaderboards, friends, matches, share.
// Mirrors backend/app/routers/{play,social,matches,share}.py exactly.

import { request } from "../../api/client";

// ── Types ────────────────────────────────────────────────────────────────────

export interface CatalogGame {
  key: string;
  title: string;
  sa: string;
  subtitle: string;
  tint: string;
  ranked: boolean;
  ranked_spec: Record<string, unknown>;
  casual_difficulties: { label: string; [k: string]: unknown }[];
  local_modes: string[];
  live_modes: string[];
  setup_remember: string[];
  rules_text: string;
  requires_media: string;
}

export interface PlayCatalog {
  games: CatalogGame[];
  practice: { name: string; kind: string; title: string; route: string }[];
  ranked_attempts_per_day: number;
  goal_rounds: number;
}

export interface PlaySummary {
  day: string;
  rank_today: {
    rank: number | null;
    points: number;
    change_since_visit: number;
    period_end: string;
    unranked_yet: boolean;
    explain_ist: string;
  };
  goal: { label: string; done: number; target: number; streak: number };
  daily_word: { done: boolean; solved: boolean; guesses: number };
  competition: { id: string; title: string; pieces: number; closes_at: string } | null;
  friend_goal: {
    week: string; goal_id: string;
    partner: { learner_id: string; name: string };
    mine: number; partner_rounds: number; total: number;
    target: number; min_each: number; max_per_day: number;
    status: string; reward: { key: string; kind: string };
  } | null;
  last_week_total: number | null;
}

export interface Allocations {
  day: string;
  games: Record<string, { used: number; limit: number; left: number }>;
  ist: boolean;
}

export interface GameSessionView {
  resume_state?: Record<string, unknown>;
  id: string;
  game: string;
  mode: string;
  ruleset: string;
  answer_lang: string;
  status: string;
  deadline: string | null;
  ranked_spec: Record<string, unknown> | null;
  pack: unknown;
  result: Record<string, unknown> | null;
  score: number | null;
}

export interface FinishResult {
  session_id: string;
  game: string;
  score: number;
  ranked: boolean;
  ranked_eligible: boolean;
  eligibility_reason: string;
  rubric: string;
  breakdown: Record<string, unknown>;
  best_today: number;
  attempts_left: number;
  daily_total: number;
  daily_games: { game: string; score: number }[];
  goal_rounds_done: number;
  repeat: boolean;
}

export interface LeaderRow {
  rank: number;
  learner_id: string;
  name: string;
  score: number;
  participation: number;
  is_me: boolean;
}

export interface Leaderboard {
  period: string;
  period_key: string;
  board: string;
  scope: string;
  period_end: string;
  rows: LeaderRow[];
  total: number;
  me: LeaderRow | null;
  empty: boolean;
  frozen?: boolean;
}

// Number Builder prompt shapes
export interface NumberSlot {
  id: string;
  kind: "sign" | "coef" | "unit" | "scale" | "marker" | "digit";
  group: string | null;
  coef_kind: string | null;
  digit_index: number | null;
  label: string;
  options: { semantic_id: string; dev?: string; roman?: string; text?: string }[];
}

export interface NumberPrompt {
  index: number;
  display_international: string;
  display_indian: string;
  slots: NumberSlot[];
}

export interface NumberPack {
  prompts: NumberPrompt[];
  answer_lang: string;
  grouping: string;
  engine_version: string;
  convention: string;
}

// Word Groups / Pada Path / Smriti / Rush / Varna views
export interface WordGroupsPack {
  board_id: string;
  group_size: number;
  groups_total: number;
  max_wrong: number;
  tiles: { id: string; sa: string; iast: string; meaning: string; show_roman?: boolean }[];
}

export interface PadaPathPack {
  prompts: {
    index: number;
    id: string;
    type: "sentence" | "quotation";
    tiles: { id: string; sa: string; iast: string }[];
    meaning: string;
    source: string;
    explanation: string;
    show_roman?: boolean;
  }[];
}

export interface SmritiPackView {
  pairs: number;
  deck: string;
  count: number;
  positions: { id: number }[];
  degraded?: boolean;
}

export interface RushPack {
  questions: {
    index: number;
    task: string;
    prompt: string;
    iast: string;
    image: string;
    audio: string;
    options: string[];
  }[];
  window_ms: number;
}

export interface VarnaPack {
  size: number;
  cells: string[];
  words: { meaning: string; akshara_count: number }[];
  required: number;
}

// Matches
export interface MatchSnapshot {
  match_id: string;
  code: string;
  game: string;
  kind: "private" | "quick";
  ruleset: string;
  answer_lang: string;
  status: "lobby" | "countdown" | "active" | "resolving" | "results" | "closed";
  host: string;
  config: Record<string, unknown>;
  seq: number;
  deadline: string | null;
  players: {
    learner_id: string;
    alias: string;
    is_host: boolean;
    ready: boolean;
    connected: boolean;
    score: number;
    forfeited: boolean;
    progress: Record<string, unknown>;
  }[];
  pack: unknown;
  own_state: Record<string, unknown>;
  own_done?: boolean;
  rematch_id?: string | null;
  rematch_voted?: boolean;
  result: { standings: { learner_id: string; alias: string; score: number; rank: number; forfeited: boolean }[]; note: string } | null;
  ticket?: string;
}

// ── API ──────────────────────────────────────────────────────────────────────

const q = (params: Record<string, string | number | undefined>) => {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join("&")}` : "";
};

export const playApi = {
  summary: () =>
    request<PlaySummary>("/play/summary", {}, true),

  catalog: () =>
    request<PlayCatalog>("/play/catalog", {}, true),

  allocations: () =>
    request<Allocations>("/play/allocations", {}, true),

  startSession: (body: {
    game: string; mode: string; difficulty?: Record<string, unknown>;
    answer_lang?: string; idempotency_key: string; match_id?: string;
  }) =>
    request<GameSessionView>("/play/sessions", {
      method: "POST", body: JSON.stringify(body),
    }, true),

  session: (id: string) =>
    request<GameSessionView>(`/play/sessions/${id}`, {}, true),

  answer: (id: string, action: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/play/sessions/${id}/answer`, {
      method: "POST", body: JSON.stringify(action),
    }, true),

  hint: (id: string) =>
    request<{ status: string; note: string }>(`/play/sessions/${id}/hint`, {
      method: "POST", body: JSON.stringify({}),
    }, true),

  finish: (id: string, body: { elapsed_ms?: number; window_ms?: number; outcome?: string }) =>
    request<FinishResult>(`/play/sessions/${id}/finish`, {
      method: "POST", body: JSON.stringify(body),
    }, true),

  abandon: (id: string, serverFailure = false) =>
    request<{ status: string }>(`/play/sessions/${id}/abandon`, {
      method: "POST", body: JSON.stringify({ server_failure: serverFailure }),
    }, true),

  dailyWordFinish: (body: { date: string; guesses: number; solved: boolean; finished: boolean }) =>
    request<{ score: number; repeat: boolean; breakdown: Record<string, unknown> }>(
      "/play/daily-word/finish", { method: "POST", body: JSON.stringify(body) }, true),

  leaderboard: (opts: { period?: string; board?: string; scope?: string; key?: string; limit?: number; offset?: number } = {}) =>
    request<Leaderboard>(`/play/leaderboard${q({
      period: opts.period ?? "daily", board: opts.board ?? "combined",
      scope: opts.scope ?? "everyone", key: opts.key,
      limit: opts.limit, offset: opts.offset,
    })}`, {}, true),

  history: () =>
    request<{ rounds: Record<string, unknown>[] }>("/play/history", {}, true),
};


export function wsUrl(base: string, path: string): string { return base.replace(/^http/, "ws") + path; }
