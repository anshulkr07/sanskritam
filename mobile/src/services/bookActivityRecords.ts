// Read sets are monotonic: two offline devices can add different pages to
// the same compact chunk without replacing each other's reading history.
export const READ_PREFIX = "shabd.read.pages.v1.";
export function mergeReadRecords(oldValue: string, newValue: string): string {
  try {
    const old = JSON.parse(oldValue), next = JSON.parse(newValue);
    if (old.book !== next.book || old.chapter !== next.chapter || !Array.isArray(old.pages) || !Array.isArray(next.pages)) return newValue;
    const pages = new Map<string, number>();
    for (const row of [...old.pages, ...next.pages]) if (Array.isArray(row) && typeof row[0] === "string" && Number.isInteger(row[1]) && row[1] >= 0) pages.set(row[0], row[1]);
    return JSON.stringify({ book: next.book, chapter: next.chapter, pages: [...pages].sort(([a], [b]) => a.localeCompare(b)) });
  } catch { return newValue; }
}
