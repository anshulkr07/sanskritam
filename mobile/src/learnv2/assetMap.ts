// LearnV2 static asset map — built ONLY from files that exist in this repo.
//
// No guessed runtime require paths: every value below is a literal require of
// a file present under mobile/assets/learn-v2/. Pending art (requests without
// a ready delivery) never enters this map; cards with no entry render their
// native diagram/text fallback, never a broken URI or blank lesson.

export type LearnV2AssetId = "verbs-reading-single" | "verbs-reading-dual" | "verbs-reading-plural";

export interface LearnV2Asset {
  /** Static image source for <Image>. */
  source: number;
  /** Original JPEG dimensions and scene boundary, before its baked caption. */
  width: number;
  height: number;
  sceneHeight: number;
  captionColor: string;
  /** Accessible description (also in the card's example.alt). */
  altEn: string;
  altHi: string;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const single = require("../../assets/learn-v2/verbs-reading-single-v1.jpg");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const dual = require("../../assets/learn-v2/verbs-reading-dual-v1.jpg");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const plural = require("../../assets/learn-v2/verbs-reading-plural-v1.jpg");

export const LEARNV2_ASSETS: Record<LearnV2AssetId, LearnV2Asset> = {
  "verbs-reading-single": {
    source: single,
    width: 900,
    height: 600,
    sceneHeight: 390,
    captionColor: "#073E40",
    altEn: "One learner reading an open book.",
    altHi: "एक विद्यार्थी खुली पुस्तक पढ़ता हुआ।",
  },
  "verbs-reading-dual": {
    source: dual,
    width: 900,
    height: 600,
    sceneHeight: 400,
    captionColor: "#87361F",
    altEn: "Exactly two learners reading books.",
    altHi: "दो विद्यार्थी पुस्तकें पढ़ते हुए।",
  },
  "verbs-reading-plural": {
    source: plural,
    width: 900,
    height: 600,
    sceneHeight: 408,
    captionColor: "#194E32",
    altEn: "A group of learners reading books.",
    altHi: "विद्यार्थियों का समूह पुस्तकें पढ़ता हुआ।",
  },
};

export function getLearnV2Asset(id: string): LearnV2Asset | undefined {
  return (LEARNV2_ASSETS as Record<string, LearnV2Asset>)[id];
}
