// useBookPages: the verse list a Book screen reads, shared by Book (Read /
// Chant) and Listen so both open the same verse at the same index.
// Tier books, paged chapters and plain books resolve exactly as the Reader's
// contents page lists them, so `index` means the same verse everywhere.

import { useCallback, useEffect, useMemo, useState } from "react";

import { api, type Shloka } from "../api/client";
import { useQuery } from "./useQuery";
import { setReadingChapter, setReadingPosition } from "../services/readingProgress";
import { bookVerses, tierVerses } from "../utils/verses";
import { isPaged, positionKey } from "../utils/paged";
import { progressStorage } from "../services/progressStorage";
import { loadOfflineBook, type OfflineBook } from "../services/offlineBooks";

export function useBookPages(bookKey: string, chapter?: string | null) {
  const [offline, setOffline] = useState<OfflineBook | null>(null);
  useEffect(() => {
    let alive = true; setOffline(null);
    void loadOfflineBook(bookKey, chapter).then(pack => { if (alive) setOffline(pack); });
    return () => { alive = false; };
  }, [bookKey, chapter]);
  const { data: verses } = useQuery("reader-verses", api.listShlokas, { ttlMs: 30 * 60_000 });
  const { data: canon } = useQuery("canon", api.canon, { ttlMs: 30 * 60_000 });
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
  const { data: pagedVerses } = useQuery(
    pagedText && pagedChapter !== null ? `paged-${bookKey}-${pagedChapter}` : "paged-none",
    () =>
      pagedText && pagedChapter !== null
        ? api.canonVerses(bookKey, pagedChapter).then((d) => d.verses)
        : Promise.resolve(null),
  );

  const pages: Shloka[] = useMemo(() => {
    if (tier) return tierRows?.length ? tierVerses(tierRows) : offline?.pages ?? [];
    if (pagedText && pagedChapter !== null) return pagedVerses?.length ? pagedVerses : offline?.pages ?? [];
    const rows = bookVerses(bookKey, verses ?? [], canon?.texts ?? []);
    return rows?.length ? rows : offline?.pages ?? [];
  }, [tier, tierRows, bookKey, verses, canon, pagedText, pagedChapter, pagedVerses, offline]);

  const title = useMemo(
    () => (canon?.texts ?? []).find((c) => c.slug === bookKey)?.title_en ?? offline?.title ?? bookKey,
    [canon, bookKey, offline],
  );
  const titleSa = useMemo(
    () => (canon?.texts ?? []).find((c) => c.slug === bookKey)?.title_sa ?? "",
    [canon, bookKey],
  );

  // Reading position persists wherever the page goes (read scrub or chant).
  const persistAt = useCallback(
    (i: number) => {
      void progressStorage.setItem("shabd.read.resume", JSON.stringify({ bookKey, chapter: pagedChapter ?? undefined, index: i }));
      if (pagedText && pagedChapter !== null) {
        void setReadingPosition(positionKey(bookKey, pagedChapter), i);
        void setReadingChapter(bookKey, pagedChapter);
      } else {
        void setReadingPosition(bookKey, i);
      }
    },
    [bookKey, pagedText, pagedChapter],
  );

  return { pages, pagedText, pagedChapter, title, titleSa, persistAt };
}
