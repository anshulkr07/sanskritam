// useBookPages: the verse list a Book screen reads, shared by Book (Read /
// Chant) and Listen so both open the same verse at the same index.
// Tier books, paged chapters and plain books resolve exactly as the Reader's
// contents page lists them, so `index` means the same verse everywhere.
// A paged book also carries its chapter list here, so the fullscreen Book can
// turn onto the next (and back to the previous) chapter.

import { useCallback, useEffect, useMemo, useState } from "react";

import { api, request, type PagedChapter, type Shloka } from "../api/client";
import { useQuery } from "./useQuery";
import { setReadingChapter, setReadingPosition } from "../services/readingProgress";
import { bookVerses, tierVerses } from "../utils/verses";
import { isPaged, positionKey } from "../utils/paged";
import { progressStorage } from "../services/progressStorage";
import { loadOfflineBook, type OfflineBook } from "../services/offlineBooks";

export function useBookPages(bookKey: string, chapter?: string | null, medium: "book" | "audio" = "book") {
  const [offline, setOffline] = useState<OfflineBook | null>(null);
  useEffect(() => {
    let alive = true; setOffline(null);
    void loadOfflineBook(bookKey, chapter, medium).then(pack => { if (alive) setOffline(pack); });
    return () => { alive = false; };
  }, [bookKey, chapter, medium]);
  const { data: verses } = useQuery("reader-verses", api.listShlokas, { ttlMs: 30 * 60_000 });
  const { data: canon, loading: canonLoading } = useQuery("canon", api.canon, { ttlMs: 30 * 60_000 });
  const tier = bookKey.startsWith("graded-") ? parseInt(bookKey.slice("graded-".length), 10) : 0;
  const { data: tierRows } = useQuery(
    `reader-tier-${tier}`,
    () => (tier ? api.readerTier(tier) : Promise.resolve([])),
  );
  const pagedText = useMemo(
    () => (canon?.texts ?? []).find((c) => c.slug === bookKey && isPaged(c)) ?? null,
    [canon, bookKey],
  );
  const pagedChapter = chapter ?? null;
  // The chapter list (and where the next/previous chapter is); paged only.
  const { data: pagedChapters } = useQuery(
    pagedText ? `paged-chapters-${bookKey}` : "paged-chapters-none",
    () => (pagedText ? api.canonChapters(bookKey) : Promise.resolve(null)),
  );
  const {
    data: pagedData,
    loading: pagedLoading,
    failed: pagedFailed,
    retry: pagedRetry,
  } = useQuery(
    pagedText && pagedChapter !== null ? `paged-${bookKey}-${pagedChapter}` : "paged-none",
    () =>
      pagedText && pagedChapter !== null
        ? api.canonVerses(bookKey, pagedChapter)
        : Promise.resolve(null),
  );
  const pagedVerses = pagedData?.verses ?? null;
  const { data: audioData } = useQuery(
    medium === "audio" ? `reader-audio-${bookKey}-${chapter ?? "all"}` : "reader-audio-none",
    () => medium === "audio" ? request<{ verses: Shloka[] }>(`/commerce/titles/${encodeURIComponent(bookKey + ":audio")}/content${chapter != null ? `?chapter=${encodeURIComponent(chapter)}` : ""}`, {}, true).catch(() => null) : Promise.resolve(null),
    { ttlMs: 4 * 60_000, refetchOnFocus: true },
  );

  const pages: Shloka[] = useMemo(() => {
    if (medium === "audio" && audioData?.verses) return audioData.verses;
    if (tier) return tierRows?.length ? tierVerses(tierRows) : offline?.pages ?? [];
    if (pagedText && pagedChapter !== null) return pagedVerses?.length ? pagedVerses : offline?.pages ?? [];
    const rows = bookVerses(bookKey, verses ?? [], canon?.texts ?? []);
    return rows?.length ? rows : offline?.pages ?? [];
  }, [tier, tierRows, bookKey, verses, canon, pagedText, pagedChapter, pagedVerses, offline, medium, audioData]);

  const title = useMemo(
    () => (canon?.texts ?? []).find((c) => c.slug === bookKey)?.title_en ?? offline?.title ?? bookKey,
    [canon, bookKey, offline],
  );
  const titleSa = useMemo(
    () => (canon?.texts ?? []).find((c) => c.slug === bookKey)?.title_sa ?? "",
    [canon, bookKey],
  );

  const chapters: PagedChapter[] | null = pagedChapters?.chapters ?? null;
  // Reading a chapter waits while its verses are fetched (or while the
  // catalogue that says the book is paged is still arriving).
  const chapterLoading = pagedChapter !== null && (pagedLoading || (!pagedText && canonLoading));
  const chapterFailed = pagedChapter !== null && pagedFailed;

  // Reading position persists wherever the page goes (read scrub or chant).
  const persistAt = useCallback(
    (i: number) => {
      void progressStorage.setItem("shabd.read.resume", JSON.stringify({ bookKey, chapter: pagedChapter ?? undefined, index: i }));
      if (pagedChapter !== null) {
        void setReadingPosition(positionKey(bookKey, pagedChapter), i);
        void setReadingChapter(bookKey, pagedChapter);
      } else {
        void setReadingPosition(bookKey, i);
      }
    },
    [bookKey, pagedChapter],
  );

  return {
    pages,
    pagedText,
    pagedChapter,
    chapters,
    chapterLoading,
    chapterFailed,
    chapterRetry: pagedRetry,
    title,
    titleSa,
    persistAt,
  };
}
