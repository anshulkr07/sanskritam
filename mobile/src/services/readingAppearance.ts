import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";

export const READING_SECTIONS = ["verse", "roman", "meaning", "hindi"] as const;
export type ReadingSection = typeof READING_SECTIONS[number];
export type SectionAppearance = { textColor: string | null; bold: boolean; scale: number };
/**
 * Where the verse's painting goes (owner, 2026-10-20). "pages": the painting
 * on a page of its own, then the verse on the next (option A). "top": the
 * painting at the head of the verse page, the verse below it (option D, the
 * default). "plain": no painting (option E). The earlier painting-behind-text
 * layout is retired; a saved Illustrated choice opens as "top", a saved
 * Plain paper choice stays plain.
 */
export const READING_LAYOUTS = ["pages", "top", "plain"] as const;
export type ReadingLayout = typeof READING_LAYOUTS[number];
export type ReadingAppearance = { layout: ReadingLayout; illustrated: boolean; imageOpacity: number; textOpacity: number; textColor: string | null; roman: boolean; sections: Record<ReadingSection, SectionAppearance> };
const defaultSections = (): ReadingAppearance["sections"] => Object.fromEntries(READING_SECTIONS.map(key => [key, { textColor: null, bold: false, scale: 1 }])) as ReadingAppearance["sections"];
export const DEFAULT_READING_APPEARANCE: ReadingAppearance = { layout: "top", illustrated: true, imageOpacity: 0.48, textOpacity: 1, textColor: null, roman: false, sections: defaultSections() };
const KEY = "shabd.read.appearance.v1";
export function normalizeReadingAppearance(value: Partial<ReadingAppearance> | null): ReadingAppearance {
  const number = (n: unknown, fallback: number, min: number) => typeof n === "number" && Number.isFinite(n) ? Math.max(min, Math.min(1, n)) : fallback;
  const sections = defaultSections();
  for (const key of READING_SECTIONS) {
    const saved = value?.sections?.[key];
    sections[key] = {
      textColor: typeof saved?.textColor === "string" && /^#[a-f\d]{6}$/i.test(saved.textColor) ? saved.textColor : null,
      bold: saved?.bold === true,
      scale: typeof saved?.scale === "number" && Number.isFinite(saved.scale) ? Math.max(.85, Math.min(1.5, saved.scale)) : 1,
    };
  }
  const layout: ReadingLayout = READING_LAYOUTS.includes(value?.layout as ReadingLayout) ? value!.layout as ReadingLayout
    : value?.illustrated === false ? "plain" : "top";
  return {
    layout,
    roman: value?.roman === true,
    sections,
    // Kept for older readers of the saved value: true unless the layout is plain.
    illustrated: layout !== "plain",
    imageOpacity: number(value?.imageOpacity, 0.48, 0),
    textOpacity: number(value?.textOpacity, 1, 0.5),
    textColor: typeof value?.textColor === "string" && /^#[a-f\d]{6}$/i.test(value.textColor) ? value.textColor : null,
  };
}
export function useReadingAppearance() {
  const [appearance, setAppearance] = useState(DEFAULT_READING_APPEARANCE);
  const changed = useRef(false);
  useEffect(() => {
    let alive = true;
    void AsyncStorage.getItem(KEY).then(raw => { if (raw && alive && !changed.current) setAppearance(normalizeReadingAppearance(JSON.parse(raw))); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const latest = useRef(appearance);
  latest.current = appearance;
  useEffect(() => {
    if (!changed.current) return;
    const timer = setTimeout(() => { void AsyncStorage.setItem(KEY, JSON.stringify(appearance)).catch(() => {}); }, 160);
    return () => clearTimeout(timer);
  }, [appearance]);
  useEffect(() => () => { if (changed.current) void AsyncStorage.setItem(KEY, JSON.stringify(latest.current)).catch(() => {}); }, []);
  const update = (patch: Partial<ReadingAppearance>) => {
    changed.current = true;
    setAppearance(current => {
      const next = normalizeReadingAppearance({ ...current, ...patch });
      return next;
    });
  };
  return { appearance, updateAppearance: update };
}
