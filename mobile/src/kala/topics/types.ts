// What every basics card of Kāla is given.

import type { ChapterProps } from "../chapters/types";

export interface TopicProps extends ChapterProps {
  /** A month to open on (the months card), 0 Caitra to 11 Phalguna. */
  month?: number;
  /** Brings the card's chart back into view, after a pick lower down. */
  scrollToTop?: () => void;
}
