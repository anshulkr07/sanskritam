// Games client: deck, daily, result and board endpoints.

import { api } from "../api/client";

export async function gamesDeck(game: string, set?: string, topic?: string) {
  return api.gamesDeck(game, set, topic);
}

export async function gamesDaily() {
  return api.gamesDaily();
}

export async function gamesResult(body: { game: string; mode: string; score: number; moves?: number; duration_ms?: number; daily?: boolean; found?: number; total?: number }) {
  return api.gamesResult(body);
}

export async function varnaJaal() {
  return api.varnaJaal();
}

export async function gamesPools(kind?: string) {
  return api.gamesPools(kind);
}
