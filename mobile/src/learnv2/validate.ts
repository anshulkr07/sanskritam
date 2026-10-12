// LearnV2 catalogue validation — shared by the node check script and tests.
//
// Contract: 6–10 teaching cards per lesson is the design range, but retrieval
// cards extend it: a lesson holds 6–12 cards total with at most 3 practice
// cards. Every card teaches one point on the main path — no disclosure.

import type { LearnV2Lesson } from "./types";

export interface LearnV2Issue {
  lessonId: string;
  cardId: string;
  message: string;
}

const DEVANAGARI_RE = /[\u0900-\u097F]/;

export function validateLearnV2Catalogue(lessons: LearnV2Lesson[]): LearnV2Issue[] {
  const issues: LearnV2Issue[] = [];
  const ids = new Set<string>();
  for (const lesson of lessons) {
    if (ids.has(lesson.id)) {
      issues.push({ lessonId: lesson.id, cardId: "", message: "duplicate lesson id" });
    }
    ids.add(lesson.id);
    if (!lesson.title.en || !lesson.title.hi) {
      issues.push({ lessonId: lesson.id, cardId: "", message: "lesson title must be bilingual" });
    }
    if (!lesson.outcome.en || !lesson.outcome.hi) {
      issues.push({ lessonId: lesson.id, cardId: "", message: "lesson outcome must be bilingual" });
    }
    if (!lesson.titleSa || !DEVANAGARI_RE.test(lesson.titleSa)) {
      issues.push({ lessonId: lesson.id, cardId: "", message: "lesson needs a Devanagari title" });
    }
    if (!lesson.titleIast) {
      issues.push({ lessonId: lesson.id, cardId: "", message: "lesson needs an IAST title" });
    }
    const n = lesson.cards.length;
    if (n < 6 || n > 12) {
      issues.push({ lessonId: lesson.id, cardId: "", message: `lesson holds ${n} cards; contract is 6–12` });
    }
    const practice = lesson.cards.filter((c) => c.kind === "practice").length;
    if (practice === 0) {
      issues.push({ lessonId: lesson.id, cardId: "", message: "lesson needs at least one retrieval card" });
    }
    if (practice > 3) {
      issues.push({ lessonId: lesson.id, cardId: "", message: "at most 3 practice cards per lesson" });
    }
    const cardIds = new Set<string>();
    for (const card of lesson.cards) {
      if (cardIds.has(card.id)) {
        issues.push({ lessonId: lesson.id, cardId: card.id, message: "duplicate card id" });
      }
      cardIds.add(card.id);
      if (!card.title.en || !card.title.hi) {
        issues.push({ lessonId: lesson.id, cardId: card.id, message: "card title must be bilingual" });
      }
      const words = card.body.en.trim().split(/\s+/).length;
      if (words < 10 || words > 110) {
        issues.push({ lessonId: lesson.id, cardId: card.id, message: `English body is ${words} words; keep 10–110` });
      }
      if (!card.body.hi) {
        issues.push({ lessonId: lesson.id, cardId: card.id, message: "card body must be bilingual" });
      }
      // Script-bearing cards must carry both scripts; IAST is never invented.
      const bearsScript =
        (card.example && DEVANAGARI_RE.test(card.example.sa)) ||
        (card.rows ?? []).some((r) => DEVANAGARI_RE.test(r.sa)) ||
        (card.steps ?? []).some((s) => DEVANAGARI_RE.test(s.sa));
      if (bearsScript) {
        const iasts = [
          card.example?.iast ?? "",
          ...(card.rows ?? []).map((r) => r.iast),
          ...(card.steps ?? []).map((s) => s.iast),
        ].filter(Boolean);
        if (iasts.length === 0) {
          issues.push({ lessonId: lesson.id, cardId: card.id, message: "Devanagari without IAST" });
        }
        const alts = card.example?.alt;
        if (card.example && (!alts?.en || !alts?.hi)) {
          issues.push({ lessonId: lesson.id, cardId: card.id, message: "example needs a bilingual alt" });
        }
      }
      if (card.kind === "practice") {
        const p = card.practice;
        if (!p || !p.prompt.en || !p.prompt.hi) {
          issues.push({ lessonId: lesson.id, cardId: card.id, message: "practice needs a bilingual prompt" });
        } else {
          if (p.choices.length < 2 || p.choices.length > 4) {
            issues.push({ lessonId: lesson.id, cardId: card.id, message: "practice needs 2–4 choices" });
          }
          if (p.choices.filter((c) => c.correct).length !== 1) {
            issues.push({ lessonId: lesson.id, cardId: card.id, message: "practice needs exactly one correct choice" });
          }
          if (!p.explain.en || !p.explain.hi) {
            issues.push({ lessonId: lesson.id, cardId: card.id, message: "practice needs a bilingual explanation" });
          }
        }
      }
      if (card.term && (!card.term.sa || !card.term.iast || !card.term.meaning.en || !card.term.meaning.hi)) {
        issues.push({ lessonId: lesson.id, cardId: card.id, message: "term needs sa + iast + bilingual meaning" });
      }
    }
    // Prereqs must name live lessons (no dangling map edges).
    for (const pre of lesson.prereqIds) {
      if (!lessons.some((l) => l.id === pre)) {
        issues.push({ lessonId: lesson.id, cardId: "", message: `unknown prereq ${pre}` });
      }
    }
  }
  return issues;
}
