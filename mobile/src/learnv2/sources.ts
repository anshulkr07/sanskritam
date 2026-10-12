// LearnV2 display sources — the on-device provenance behind the map's
// "Sources & credits" sheet. Mirrors specs/learn-v2/sources.jsonl (the
// canonical record); this file is the bilingual display copy. Licence names
// are exact; credit lines match the registry verbatim where reused.

import type { LearnV2Lang } from "./types";

export interface LearnV2SourceRow {
  lessonId: string;
  title: Record<LearnV2Lang, string>;
  origin: string;
  sourceTitle: string;
  sourceUrl: string;
  licence: string;
  licenceUrl: string;
  adaptation: Record<LearnV2Lang, string>;
}

export const LEARNV2_SOURCES: LearnV2SourceRow[] = [
  {
    lessonId: "verbs-number",
    title: { en: "One, two and many readers", hi: "एक, दो और अनेक पाठक" },
    origin: "adapted_external",
    sourceTitle: "learnsanskrit.org — Core verbs; The present tense",
    sourceUrl: "https://learnsanskrit.org/guide/verbs-1/the-present-tense/",
    licence: "CC BY 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by/4.0/",
    adaptation: {
      en: "Original 10-card lesson; examples paṭhati/paṭhataḥ/paṭhanti kept, wording and Hindi rewritten.",
      hi: "मूल 10-कार्ड पाठ; उदाहरण रखे, शब्द और हिंदी नए लिखे।",
    },
  },
  {
    lessonId: "sandhi-boundary",
    title: { en: "Where words meet", hi: "जहाँ शब्द मिलते हैं" },
    origin: "existing_project",
    sourceTitle: "Sandhi pilot ch. 1 after Whitney, Sanskrit Grammar §§109–125, 149",
    sourceUrl: "https://en.wikisource.org/wiki/Sanskrit_Grammar_(Whitney)/Chapter_III",
    licence: "public domain",
    licenceUrl: "https://en.wikisource.org/wiki/Sanskrit_Grammar_(Whitney)/Chapter_III",
    adaptation: {
      en: "Pilot cards re-authored into 9 no-disclosure cards; qualifications merged into main bodies.",
      hi: "pilot कार्ड 9 बिना-disclosure कार्डों में; शर्तें मुख्य पाठ में मिलाईं।",
    },
  },
  {
    lessonId: "sandhi-like-vowels",
    title: { en: "Two vowels of one family", hi: "एक परिवार के दो स्वर" },
    origin: "adapted_external",
    sourceTitle: "learnsanskrit.org — Vowel sandhi (Like vowels)",
    sourceUrl: "https://learnsanskrit.org/guide/sandhi/vowel-sandhi/",
    licence: "CC BY 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by/4.0/",
    adaptation: {
      en: "Rule cross-checked with Whitney §126; devālaya/atīva/sūktam examples kept, wording original.",
      hi: "नियम Whitney §126 से मिलान; उदाहरण रखे, शब्द मूल।",
    },
  },
  {
    lessonId: "sandhi-a-combinations",
    title: { en: "When a meets a different vowel", hi: "जब अ भिन्न स्वर से मिले" },
    origin: "existing_project",
    sourceTitle: "Sandhi pilot ch. 3 after Whitney §127",
    sourceUrl: "https://en.wikisource.org/wiki/Sanskrit_Grammar_(Whitney)/Chapter_III",
    licence: "public domain",
    licenceUrl: "https://en.wikisource.org/wiki/Sanskrit_Grammar_(Whitney)/Chapter_III",
    adaptation: {
      en: "devendra/maheśvara/hitopadeśaḥ/maharṣiḥ/sadaiva/jalaughaḥ verified standard; guṇa/vṛddhi terms defined on first use.",
      hi: "उदाहरण मानक सत्यापित; गुण/वृद्धि पहले प्रयोग पर परिभाषित।",
    },
  },
  {
    lessonId: "sandhi-glides",
    title: { en: "A vowel becomes a glide", hi: "स्वर glide बनता है" },
    origin: "existing_project",
    sourceTitle: "Sandhi pilot ch. 4 after Whitney §129",
    sourceUrl: "https://en.wikisource.org/wiki/Sanskrit_Grammar_(Whitney)/Chapter_III",
    licence: "public domain",
    licenceUrl: "https://en.wikisource.org/wiki/Sanskrit_Grammar_(Whitney)/Chapter_III",
    adaptation: {
      en: "ityapi/nadyatra/svāgatam/pitrādeśaḥ verified; negatives (atīva, nadī vahati) kept.",
      hi: "उदाहरण सत्यापित; नकारात्मक स्थितियाँ (अतीव, नदी वहति) रखीं।",
    },
  },
  {
    lessonId: "sandhi-e-o",
    title: { en: "The special behaviour of e and o", hi: "ए और ओ का विशेष व्यवहार" },
    origin: "existing_project",
    sourceTitle: "Sandhi pilot ch. 5 after Whitney §§131–135",
    sourceUrl: "https://en.wikisource.org/wiki/Sanskrit_Grammar_(Whitney)/Chapter_III",
    licence: "public domain",
    licenceUrl: "https://en.wikisource.org/wiki/Sanskrit_Grammar_(Whitney)/Chapter_III",
    adaptation: {
      en: "Internal ay/av labelled schematic; te'pi / ta āgatāḥ / tasyā api / tāveva verified standard.",
      hi: "आंतरिक अय्/अव् schematic चिह्नित; बाह्य रूप मानक सत्यापित।",
    },
  },
  {
    lessonId: "sandhi-protected",
    title: { en: "When the ordinary rule stops", hi: "जब साधारण नियम रुकता है" },
    origin: "existing_project",
    sourceTitle: "Sandhi pilot ch. 6 after Whitney §§136–138",
    sourceUrl: "https://en.wikisource.org/wiki/Sanskrit_Grammar_(Whitney)/Chapter_III",
    licence: "public domain",
    licenceUrl: "https://en.wikisource.org/wiki/Sanskrit_Grammar_(Whitney)/Chapter_III",
    adaptation: {
      en: "pragṛhya endings, amī, prefix/augment specials verified; all specialist forms labelled.",
      hi: "प्रगृह्य, अमी, उपसर्ग/augment विशेष सत्यापित; विशेष रूप चिह्नित।",
    },
  },
];

export const LEARNV2_REGISTRY_NOTE: Record<LearnV2Lang, string> = {
  en: "Full credits ship in Licences (drawer). Practice here is local retrieval: it never writes mastery, XP or reviews.",
  hi: "पूर्ण श्रेय Licences (drawer) में है। यहाँ अभ्यास स्थानीय है: mastery, XP या review कभी नहीं लिखता।",
};
