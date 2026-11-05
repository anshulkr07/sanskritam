// Web and non-native previews: no ad pages (see readerAds.native.ts).
export type AdPlacement = { after: number; key: string };

const none: AdPlacement[] = [];
const ignore = (_key: string | null) => {};

export function useReaderAds(_opts: {
  titleId: string; chapterKey: string; at: number; pageCount: number; hasNext: boolean;
}): { placements: AdPlacement[]; onShown: (key: string | null) => void } {
  return { placements: none, onShown: ignore };
}
