// Spending Mudrā: books, audiobooks and Guru minutes, owned for good. The
// server checks the price and the balance; the app shows both first.

import { request } from "../api/client";
import { refreshCommerce, type CommerceCatalogue } from "./commerce";

export type SpendResult = { item: string; price: number; balance: number; available: number; owned_titles: string[] };

/** One id per purchase attempt, reused on a retry, so a retry after a lost
 *  reply is charged once (the server keys the spend on it). */
export function newSpendId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export async function spendMudra(item: string, expected: number, requestId: string): Promise<SpendResult> {
  const result = await request<SpendResult>("/commerce/mudra/spend", {
    method: "POST", body: JSON.stringify({ item, request_id: requestId, expected }),
  }, true);
  await refreshCommerce().catch(() => {});
  return result;
}

export type EditionChoice = { item: string; label: string; price: number; titles: string[] };

/** What can be bought for one book: its book, its audiobook, or both (less
 *  while neither is owned), each only when priced and not owned yet. */
export function editionChoices(shop: CommerceCatalogue, slug: string): EditionChoice[] {
  const book = slug + ":book", audio = slug + ":audio";
  // Members pay their plan's price; the server charges the same.
  const priceOf = (id: string) => shop.member_prices?.[id] ?? shop.prices[id];
  const priced = (id: string) => priceOf(id) && !shop.owned_titles.includes(id) ? priceOf(id) : 0;
  const out: EditionChoice[] = [];
  if (priced(book)) out.push({ item: "title:" + book, label: "Book", price: priced(book), titles: [book] });
  if (priced(audio)) out.push({ item: "title:" + audio, label: "Audiobook", price: priced(audio), titles: [audio] });
  if (priced(book) && priced(audio)) {
    out.push({ item: "both:" + slug, label: "Book + audiobook", price: Math.floor((priced(book) + priced(audio)) * (shop.both_discount || 0.9)), titles: [book, audio] });
  }
  return out;
}

/** "gita:book" -> "gita". */
export const slugOf = (titleId: string) => titleId.split(":")[0] ?? titleId;

/** How much of an edition is free (owner, 2026-11-06): 5% of a book's pages,
 *  picked once and the same for everyone, or an audiobook's first 5%. */
export type TitlePreview = {
  title_id: string; medium: "book" | "audio"; owned: boolean; percent: number;
  pages?: number; of?: number; free_ms?: number; of_ms?: number;
};

export function titlePreview(titleId: string): Promise<TitlePreview> {
  return request<TitlePreview>(`/commerce/titles/${encodeURIComponent(titleId)}/preview`, {}, true);
}

/** "9 min", "1 h 20 min", "40 sec". */
export function spokenLength(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (ms < 60_000) return `${Math.max(1, Math.round(ms / 1000))} sec`;
  if (minutes < 60) return `${minutes} min`;
  return minutes % 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes / 60} h`;
}

/** The one-line description of a free preview. */
export function previewLine(p: TitlePreview | null, audio: boolean): string {
  if (audio) {
    return p?.free_ms && p.of_ms ? `Free preview: the first ${spokenLength(p.free_ms)} of ${spokenLength(p.of_ms)}` : "Free preview: the first 5%";
  }
  return p?.pages && p.of ? `Free preview: ${p.pages} of ${p.of} pages, from across the book` : "Free preview: 5% of the pages";
}

export type LedgerItem = { label: string; amount: number; at: string };

/** The shop's ledger: the latest Mudrā added and spent, newest first. */
export async function mudraHistory(): Promise<LedgerItem[]> {
  return (await request<{ items: LedgerItem[] }>("/commerce/mudra/history", {}, true)).items;
}
