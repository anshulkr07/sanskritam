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

export const socialApi = {
  friends: () =>
    request<{ friends: { learner_id: string; name: string; alias: string }[]; requests: { learner_id: string; name: string }[] }>(
      "/social/friends", {}, true),

  request: (learnerId: string) =>
    request<{ status: string }>("/social/friends/request", {
      method: "POST", body: JSON.stringify({ learner_id: learnerId }),
    }, true),

  respond: (learnerId: string, accept: boolean) =>
    request<{ status: string }>("/social/friends/respond", {
      method: "POST", body: JSON.stringify({ learner_id: learnerId, accept }),
    }, true),

  remove: (learnerId: string) =>
    request<{ removed: boolean }>(`/social/friends/${learnerId}/remove`, {
      method: "POST", body: JSON.stringify({}),
    }, true),

  block: (learnerId: string, reason = "") =>
    request<{ blocked: boolean }>(`/social/friends/${learnerId}/block`, {
      method: "POST", body: JSON.stringify({ reason }),
    }, true),

  alias: (learnerId: string, alias: string) =>
    request<{ alias: string }>(`/social/friends/${learnerId}/alias`, {
      method: "POST", body: JSON.stringify({ alias }),
    }, true),

  joinGoal: (partnerId: string) =>
    request<PlaySummary["friend_goal"]>("/social/friend-goal/join", {
      method: "POST", body: JSON.stringify({ partner_id: partnerId }),
    }, true),

  goal: () =>
    request<{ goal: PlaySummary["friend_goal"] }>("/social/friend-goal", {}, true),

  credit: (sessionRef: string) =>
    request<{ credited: unknown[] }>("/social/friend-goal/credit", {
      method: "POST", body: JSON.stringify({ session_ref: sessionRef }),
    }, true),
};

export const matchApi = {
  action: (matchId: string, action: Record<string, unknown>, idem: string) =>
    request<Record<string, unknown>>(`/play/matches/${matchId}/actions`, {
      method: "POST", body: JSON.stringify({ action, idem }),
    }, true),
  createRoom: (body: { game: string; ruleset?: string; answer_lang?: string; config?: Record<string, unknown> }) =>
    request<MatchSnapshot>("/play/matches/rooms", {
      method: "POST", body: JSON.stringify(body),
    }, true),

  joinRoom: (code: string) =>
    request<MatchSnapshot>("/play/matches/rooms/join", {
      method: "POST", body: JSON.stringify({ code }),
    }, true),

  resume: () =>
    request<{ match: MatchSnapshot | null }>("/play/matches/resume", {}, true),

  ready: (matchId: string, ready: boolean) =>
    request<{ ready: boolean }>(`/play/matches/rooms/${matchId}/ready`, {
      method: "POST", body: JSON.stringify({ ready }),
    }, true),

  config: (matchId: string, config: Record<string, unknown>) =>
    request<{ config: Record<string, unknown> }>(`/play/matches/rooms/${matchId}/config`, {
      method: "POST", body: JSON.stringify({ config }),
    }, true),

  host: (matchId: string, to: string) =>
    request<{ host: string }>(`/play/matches/rooms/${matchId}/host`, {
      method: "POST", body: JSON.stringify({ to }),
    }, true),

  start: (matchId: string) =>
    request<{ status: string; seconds: number }>(`/play/matches/rooms/${matchId}/start`, {
      method: "POST", body: JSON.stringify({}),
    }, true),

  leave: (matchId: string) =>
    request<{ status: string }>(`/play/matches/rooms/${matchId}/leave`, {
      method: "POST", body: JSON.stringify({}),
    }, true),

  rematch: (matchId: string) =>
    request<{ rematch?: string; code?: string; votes_pending?: boolean }>(
      `/play/matches/rooms/${matchId}/rematch`, {
        method: "POST", body: JSON.stringify({}),
      }, true),

  ticket: (matchId: string) =>
    request<{ ticket: string; ws: string; protocol: number }>(
      `/play/matches/${matchId}/ticket`, {}, true),

  snapshot: (matchId: string) =>
    request<MatchSnapshot>(`/play/matches/${matchId}`, {}, true),

  enqueue: (body: { game: string; ruleset?: string; answer_lang?: string; band?: string }) =>
    request<{ matched: boolean; match_id?: string; code?: string; waiting?: boolean }>(
      "/play/matches/queue", { method: "POST", body: JSON.stringify(body) }, true),

  queueStatus: () =>
    request<{ matched: boolean; waiting?: boolean; match_id?: string; game?: string; waited_seconds?: number; offer_solo_after?: number }>(
      "/play/matches/queue", {}, true),

  cancelQueue: () =>
    request<{ cancelled: boolean }>("/play/matches/queue/cancel", {
      method: "POST", body: JSON.stringify({}),
    }, true),
};

export const shareApi = {
  createLink: (body: { kind: string; payload: Record<string, unknown>; ttl?: string }) =>
    request<{ code: string; url: string; expires_at: string }>("/share/links", {
      method: "POST", body: JSON.stringify(body),
    }, true),

  revoke: (code: string) =>
    request<{ revoked: boolean }>("/share/links/revoke", {
      method: "POST", body: JSON.stringify({ code }),
    }, true),

  resolve: (code: string) =>
    request<{ kind: string; payload: Record<string, unknown>; expires_at: string | null }>(
      `/share/links/${encodeURIComponent(code)}`),

  event: (body: { code?: string; event: string; meta?: Record<string, unknown> }) =>
    request<{ ok: boolean }>("/share/events", {
      method: "POST", body: JSON.stringify(body),
    }, true),
};

// WS URL from the API base (http→ws).
export function wsUrl(base: string, path: string): string {
  return base.replace(/^http/, "ws") + path;
}
