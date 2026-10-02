// What every chapter of Kāla is given.

import type { FillName } from "../../theme";
import type { TodayState } from "../useToday";

export interface ChapterProps {
  /** The live reading, shared with the Home card. */
  today: TodayState;
  /** The chapter's colour. */
  tone: FillName;
  /** The width a chart may take, inside the page's side padding. */
  width: number;
}
