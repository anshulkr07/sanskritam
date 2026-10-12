// useBookPages: the verse list a Book screen reads, shared by Book (Read /
// Chant) and Listen so both open the same verse at the same index.
// Tier books, paged chapters and plain books resolve exactly as the Reader's
// contents page lists them, so `index` means the same verse everywhere.

import { useCallback, useMemo } from "react";

import { api, type Shloka } from "../api/client";
import { useQuery } from "./useQuery";
import { setReadingChapter, setReadingPosition } from "../services/readingProgress";
import { bookVerses, tierVerses } from "../utils/verses";
import { isPaged, positionKey } from "../utils/paged";

export function useBookPages(bookKey: string, chapter?: string | null) {
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
    if (tier) return tierVerses(tierRows ?? []);
    if (pagedText && pagedChapter !== null) return pagedVerses ?? [];
    return bookVerses(bookKey, verses ?? [], canon?.texts ?? []) ?? [];
  }, [tier, tierRows, bookKey, verses, canon, pagedText, pagedChapter, pagedVerses]);

  const title = useMemo(
    () => (canon?.texts ?? []).find((c) => c.slug === bookKey)?.title_en ?? bookKey,
    [canon, bookKey],
  );

  // Reading position persists wherever the page goes (read scrub or chant).
  const persistAt = useCallback(
    (i: number) => {
      if (pagedText && pagedChapter !== null) {
        void setReadingPosition(positionKey(bookKey, pagedChapter), i);
        void setReadingChapter(bookKey, pagedChapter);
      } else {
        void setReadingPosition(bookKey, i);
      }
    },
    [bookKey, pagedText, pagedChapter],
  );

  return { pages, pagedText, pagedChapter, title, persistAt };
}
