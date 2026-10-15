import { fetchGuideTopic } from "../services/grammarGuide";
import { findStopByCards } from "../trail/course";
import { getLearnV2Lesson } from "./catalogue";
import { guideCardLesson } from "./guideCards";
import type { LearnV2Lesson } from "./types";

export async function loadCardLesson(id: string): Promise<LearnV2Lesson> {
  const authored = getLearnV2Lesson(id);
  if (authored) return authored;
  if (id.startsWith("guide:")) return guideCardLesson(id, [await fetchGuideTopic(id.slice(6))]);
  const stop = findStopByCards(id);
  if (!stop) throw new Error(`Unknown lesson ${id}`);
  const topics = await Promise.all(stop.lesson.topics.map(fetchGuideTopic));
  return guideCardLesson(id, topics, stop.lesson.title);
}
