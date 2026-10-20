// Names for the tools a Learn lesson can open.

import type { GuideLang } from "../api/client";
import type { TrailTool } from "./course";

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
