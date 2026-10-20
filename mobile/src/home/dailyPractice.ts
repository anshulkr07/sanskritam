// dailyPractice — what Home's "Today's practice" card shows: the next lesson
// in whichever Learn the learner has (the story course or the trail), what is
// due for review in that same Learn, and the verse they were last reading.
//
// Owner's report (2026-10-20): the old card "doesn't show correct things".
// It always opened the trail's lesson player, even with the story course on;
// counted the old review queue beside the story course's own; never named
// the book being read; and hid all but one of these behind a goal picker.

import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";

import { api } from "../api/client";
import { useGuideLang } from "../hooks/useGuide";
import { getLearnV2LastLesson } from "../learnv2/progress";
import { cachedGet } from "../services/apiCache";
import { progressStorage, subscribeProgress } from "../services/progressStorage";
import { getReview, lessonSummaries } from "../story/api";
import { useCourse } from "../story/course";
import { useLearnMode } from "../story/mode";
import { courseComplete, currentContext } from "../story/selectors";
import { TRAIL, findStopByCards, stageStops } from "../trail/course";
import { loadTrailCardDoneMap } from "../trail/progress";
import { plain } from "../utils/text";

type Navigate = (route: string, params?: object) => void;

export interface PracticeLesson {
  /** Sanskrit title, when the lesson has one. */
  titleSa: string | null;
  title: string;
  /** "Consonants · lesson 4 of 5 · 6 min" */
  meta: string;
  /** Lessons finished in this unit, and how many it has. */
  done: number;
  total: number;
  open: () => void;
}

export interface PracticeData {
  /** loading: not read yet · ready: `lesson` is set · complete: nothing left · error: could not load */
  state: "loading" | "ready" | "complete" | "error";
  lesson: PracticeLesson | null;
  /** Reviews due now; null while unknown (offline, signed out). */
  due: number | null;
  openReview: () => void;
  reading: { label: string; open: () => void } | null;
  openLearn: () => void;
}

// ── The verse last read ─────────────────────────────────────────────────

interface Resume { bookKey: string; chapter?: string; index?: number; ref?: string }

function useReading(navigate: Navigate): PracticeData["reading"] {
  const [resume, setResume] = useState<Resume | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  useFocusEffect(useCallback(() => {
    let alive = true;
    const load = async () => {
      let r: Resume | null = null;
      try {
        const raw = await progressStorage.getItem("shabd.read.resume");
        const parsed = raw ? (JSON.parse(raw) as Partial<Resume>) : null;
        r = typeof parsed?.bookKey === "string" ? (parsed as Resume) : null;
      } catch {
        r = null;
      }
      if (!alive) return;
      setResume(r);
      if (r && !r.ref) {
        const canon = await cachedGet("canon", api.canon, 30 * 60_000).catch(() => null);
        const text = canon?.texts.find((t) => t.slug === r.bookKey);
        if (alive) setTitle(text ? plain(text.title_en) : null);
      }
    };
    void load();
    const unsubscribe = subscribeProgress(() => { void load(); });
    return () => { alive = false; unsubscribe(); };
  }, []));
  if (!resume) return null;
  const { bookKey, chapter, index } = resume;
  const label = resume.ref || title;
  if (!label) return null;
  return { label: `Continue ${label}`, open: () => navigate("Book", { bookKey, chapter, index }) };
}

// ── The story course ────────────────────────────────────────────────────

export function useStoryPractice(navigate: Navigate): PracticeData {
  // Story or Simple, whichever the learner chose at the top of Learn.
  const track = useLearnMode();
  const { index, state, error } = useCourse(track);
  const { lang } = useGuideLang();
  const [due, setDue] = useState<number | null>(null);
  const reading = useReading(navigate);
  const finished = state?.finished.join("|");
  useFocusEffect(useCallback(() => {
    let alive = true;
    getReview().then((r) => { if (alive) setDue(r.due_count); }).catch(() => { if (alive) setDue(null); });
    return () => { alive = false; };
  }, [finished]));
  const openLearn = () => navigate("Learn", { screen: "StoryHome" });
  const openReview = () => navigate("Learn", { screen: "StoryReview", initial: false });
  const base = { due, openReview, reading, openLearn };
  if (!index || !state) return { ...base, state: error ? "error" : "loading", lesson: null };
  const summary = lessonSummaries(index).find((l) => l.id === state.current?.lesson_id);
  const unit = currentContext(index, state)?.unit;
  if (courseComplete(index, state) || state.coming_soon || !summary || !unit) {
    return { ...base, state: "complete", lesson: null };
  }
  const scene = unit.lessons.findIndex((l) => l.id === summary.id);
  const where = summary.template === "prologue" ? "Prologue"
    : summary.template === "check" ? "Unit check"
      : scene >= 0 ? `${track === "simple" ? "Lesson" : "Scene"} ${scene + 1} of ${unit.lessons.length}` : "Revision";
  const progress = state.units[unit.id];
  return {
    ...base,
    state: "ready",
    lesson: {
      titleSa: summary.title_sa,
      title: summary.title[lang] || summary.title.en,
      meta: `${unit.title[lang] || unit.title.en} · ${where} · ${summary.minutes} min`,
      done: progress?.finished ?? 0,
      total: progress?.total ?? unit.lessons.length,
      open: () => navigate("Learn", { screen: "StoryLesson", params: { lessonId: summary.id, track }, initial: false }),
    },
  };
}

// ── The trail ───────────────────────────────────────────────────────────

const CARD_LESSONS = TRAIL.flatMap((s) => stageStops(s));

export function useTrailPractice(navigate: Navigate): PracticeData {
  const { lang } = useGuideLang();
  const [lessonId, setLessonId] = useState<string | null | undefined>(undefined);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [due, setDue] = useState<number | null>(null);
  const reading = useReading(navigate);
  useFocusEffect(useCallback(() => {
    let alive = true;
    const load = async () => {
      const last = await getLearnV2LastLesson();
      const map = await loadTrailCardDoneMap(last ? [last] : []);
      if (!alive) return;
      setDone(map);
      setLessonId(last && !map[last] ? last : CARD_LESSONS.find((s) => !map[s.lesson.cards])?.lesson.cards ?? null);
    };
    void load().catch(() => { if (alive) setLessonId(null); });
    const unsubscribe = subscribeProgress(() => { void load().catch(() => {}); });
    api.reviewDue(1).then((r) => { if (alive) setDue(r.due_count); }).catch(() => { if (alive) setDue(null); });
    return () => { alive = false; unsubscribe(); };
  }, []));
  const base = { due, openReview: () => navigate("DailyReview"), reading, openLearn: () => navigate("Learn") };
  if (lessonId === undefined) return { ...base, state: "loading", lesson: null };
  if (lessonId === null) return { ...base, state: "complete", lesson: null };
  const stop = findStopByCards(lessonId);
  const open = () => navigate("LearnV2Lesson", { lessonId });
  if (!stop) {
    return { ...base, state: "ready", lesson: { titleSa: null, title: "Continue your lesson", meta: "", done: 0, total: 0, open } };
  }
  const { unit, lesson } = stop;
  const at = unit.lessons.findIndex((l) => l.cards === lesson.cards);
  return {
    ...base,
    state: "ready",
    lesson: {
      // Trail lessons have no Sanskrit title of their own.
      titleSa: null,
      title: lesson.title[lang] || lesson.title.en,
      meta: `${unit.title[lang] || unit.title.en} · lesson ${at + 1} of ${unit.lessons.length} · ${lesson.minutes} min`,
      done: unit.lessons.filter((l) => done[l.cards]).length,
      total: unit.lessons.length,
      open,
    },
  };
}
