import type { GuideTopicSummary, LessonSummary, Unit } from "../api/client";
import { LEARNV2_LESSONS } from "./catalogue";
import { COURSE_CHAPTERS } from "./courseOutline";

export function releasedLessons(units: Unit[]): LessonSummary[] {
  return units.flatMap((unit) => unit.lessons.filter((lesson) =>
    !(lesson.title_en ?? "").startsWith("[staged]") && (lesson.rank ?? 0) < 900,
  ));
}

export function chapterLessons(chapterId: string, units: Unit[]): LessonSummary[] {
  const features = new Set(COURSE_CHAPTERS.find((chapter) => chapter.id === chapterId)?.featureIds ?? []);
  return releasedLessons(units).filter((lesson) => features.has(lesson.feature_id));
}

export function chapterCards(chapterId: string) {
  return LEARNV2_LESSONS.filter((lesson) =>
    chapterId === "verbs" ? lesson.id === "verbs-number" :
    chapterId === "sandhi" ? lesson.id.startsWith("sandhi-") : false,
  );
}

export function unlockedUnitIds(units: Unit[]): Set<string> {
  const ordered = [...units].sort((a, b) => a.rank - b.rank);
  return new Set(ordered.filter((unit, index) => index === 0 || ordered[index - 1].progress > 0).map((unit) => unit.id));
}

export function searchLearning(query: string, units: Unit[], topics: GuideTopicSummary[]) {
  const needle = query.normalize("NFC").trim().toLowerCase();
  const matches = (...texts: string[]) => texts.some((text) => text.normalize("NFC").toLowerCase().includes(needle));
  return {
    lessons: needle ? releasedLessons(units).filter((lesson) => matches(lesson.title_en, lesson.title_hi, lesson.feature_id)) : [],
    topics: needle ? topics.filter((topic) => matches(topic.id, topic.chapter_id, topic.title.en, topic.title.hi, topic.title_sa, topic.title_iast, topic.summary.en, topic.summary.hi)) : [],
    cards: needle ? LEARNV2_LESSONS.filter((lesson) => matches(lesson.id, lesson.title.en, lesson.title.hi, lesson.titleSa, lesson.titleIast, lesson.unit.en, lesson.unit.hi, lesson.outcome.en, lesson.outcome.hi)) : [],
  };
}
