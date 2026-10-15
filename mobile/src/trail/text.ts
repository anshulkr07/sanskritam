// Short status lines shared by the map, the list and the sheets.

import type { GuideLang } from "../api/client";
import { getLearnV2Lesson } from "../learnv2/catalogue";
import type { TrailStop, TrailTool, TrailUnit } from "./course";
import type { StopStatus } from "./progress";
import { PRACTICE_PASS } from "./progress";

export function toolName(tool: TrailTool, lang: GuideLang): string {
  const hi = lang === "hi";
  if (tool.kind === "paradigm") return tool.of === "noun" ? (hi ? "संज्ञा रूप" : "Noun forms") : (hi ? "क्रिया रूप" : "Verb forms");
  if (tool.kind === "book") return hi ? "गीता" : "the Gītā";
  const names: Record<string, [string, string]> = {
    Varnamala: ["Sound map", "ध्वनि नक्शा"],
    Writing: ["Writing", "लेखन"],
    Pingala: ["Rhythm", "लय"],
    Vocab: ["Vocabulary", "शब्दावली"],
    WordLab: ["Word Lab", "शब्द प्रयोगशाला"],
    WordOrder: ["Word order", "शब्द क्रम"],
  };
  const n = names[tool.screen] ?? [tool.screen, tool.screen];
  return hi ? n[1] : n[0];
}

export function stopMeta(stop: TrailStop, status: StopStatus, lang: GuideLang): string {
  const hi = lang === "hi";
  if (status === "done") return hi ? "पूरा" : "Done";
  const min = hi ? `${stop.lesson.minutes} मिनट` : `${stop.lesson.minutes} min`;
  const cards = stop.lesson.cards ? getLearnV2Lesson(stop.lesson.cards)?.cards.length : undefined;
  if (cards) return hi ? `${min} · ${cards} कार्ड` : `${min} · ${cards} cards`;
  if (stop.lesson.cards) return hi ? `${min} · कार्ड पाठ` : `${min} · card lesson`;
  if (stop.lesson.tool) return hi ? `${toolName(stop.lesson.tool, lang)} के साथ` : `with ${toolName(stop.lesson.tool, lang)}`;
  return min;
}

export function practiceMeta(unit: TrailUnit, mastery: number | null, lang: GuideLang): string {
  const hi = lang === "hi";
  if (!unit.graded.length) return unit.practiceTool ? (hi ? `अभ्यास: ${toolName(unit.practiceTool, lang)}` : `Practise: ${toolName(unit.practiceTool, lang)}`) : "";
  if (mastery != null && mastery >= PRACTICE_PASS) return hi ? "जाँचा हुआ · पास" : "Graded · passed";
  if (mastery) return hi ? `जाँचा हुआ · ${Math.round(mastery * 100)}%` : `Graded · ${Math.round(mastery * 100)}%`;
  return hi ? `जाँचा हुआ · ${unit.graded.length} पाठ` : `Graded · ${unit.graded.length} lessons`;
}
