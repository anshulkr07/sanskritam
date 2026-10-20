// The story course ("The Burnt Book") as the app receives it from /learn/*.
//
// This file is the contract with the backend builder
// (backend/app/curriculum/pack.py and widgets.py). Change both together.
// Spec: specs/learn-story/IMPLEMENTATION.md.
//
// Conventions the builder guarantees:
// * Every Sanskrit string `sa` has its IAST beside it as `iast` (and
//   `title_sa` → `title_iast`, `name_sa` → `name_iast`, `formula` →
//   `formula_iast`, `answers`/`tiles`/`tokens` → `*_iast`). Devanagari is
//   always the primary display; IAST is smaller and secondary.
// * Learner text is `Bi` ({ en, hi }); `{{संस्कृत}}` inside it marks inline
//   Sanskrit (render in the Sanskrit face) and `**bold**` is bold.
// * Engine claims, image briefs and authors' plot notes never ship.

export interface Bi {
  en: string;
  hi: string;
}

export interface Sutra {
  ref: string; // "1.2.27" or "SS.1"
  sa: string;
  iast: string;
}

export type Ratio = "16:9" | "4:3" | "1:1" | "3:4" | "9:16";

/** A picture. Until the image agent delivers it, `delivered` is false and
 * the app shows its paper placeholder with the alt text (never a broken
 * image). Fit with contain; never crop text that is in the picture. */
export interface Picture {
  id: string;
  alt: Bi;
  ratio: Ratio;
  delivered: boolean;
  phone?: string;
  tablet?: string;
  width?: number;
  height?: number;
}

export interface SaLine {
  sa: string;
  iast: string;
  gloss: Bi;
}

// ─── Index (GET /learn/index) ───────────────────────────────────────────────

export type Template = "prologue" | "scene" | "episode" | "revision" | "check" | "tale";

export interface LessonSummary {
  id: string;
  template: Template;
  title: Bi;
  title_sa: string | null;
  title_iast: string | null;
  minutes: number;
  cards: number;
  practice: number;
  hash: string; // matches the lesson payload's hash; refetch when it changes
}

export interface GhostInfo {
  id: string;
  name_sa: string;
  name_iast: string;
  name: Bi;
  waits_for: Bi;
  freed_line: SaLine;
  clue: SaLine | null;
  portrait: Picture | null;
  freed_image: Picture | null;
}

export interface UnitVideo {
  youtube_id: string;
  channel: string;
  title: string;
  start?: number;
  end?: number;
}

export interface UnitSummary {
  id: string;
  title: Bi;
  title_sa: string | null;
  title_iast?: string;
  status: "ready" | "planned";
  episode: { summary: Bi };
  ghost: GhostInfo | null;
  skills: { id: string; title: Bi; sutras: Sutra[] }[];
  lessons: LessonSummary[]; // ready units only, in order
  planned: { id: string; title: Bi }[]; // the road ahead ("coming soon")
  revision: LessonSummary | null;
  reading?: LessonSummary | null; // optional episode, absent in older cached indexes
  check: LessonSummary | null;
  video: UnitVideo | null;
}

export interface LeafInfo {
  id: string;
  n: number;
  title: Bi;
  title_sa: string;
  title_iast: string;
  about: Bi;
  tale: LessonSummary | null;
  image: Picture | null;
}

export interface Part {
  leaf: LeafInfo | null;
  units: UnitSummary[];
}

export interface Act {
  id: string;
  n: number;
  title: Bi;
  title_sa: string;
  title_iast: string;
  goal: Bi;
  color: string; // the act's colour on the map
  place: { id: string; name_sa: string; name_iast: string; name: Bi } | null;
  map: Picture | null; // painted backdrop for this act's stretch of the map
  parts: Part[];
}

export interface Character {
  id: string;
  name_sa: string;
  name_iast: string;
  name: Bi;
  kind: "human" | "animal" | "ghost" | "divine" | "historical";
  role: Bi;
  portrait: Picture | null;
}

export interface StoryIndex {
  version: string;
  course: { id: string; title: Bi; title_sa: string; title_iast: string; prologue: LessonSummary | null } | null;
  acts: Act[];
  finale_leaves: LeafInfo[]; // the tale that survived (Act V's end)
  characters: Character[];
}

// ─── Story state (GET /learn/state; derived, never stored) ──────────────────

export interface Stop {
  lesson_id: string | null;
  role: "prologue" | "lesson" | "revision" | "reading" | "check" | "coming_soon";
  unit_id: string | null;
  act_id: string | null;
}

export interface StoryState {
  version: string;
  finished: string[];
  current: Stop | null; // null when the road stops at a planned unit
  coming_soon: string | null; // the planned unit the road stops at
  units: Record<string, { status: "ready" | "planned"; done: boolean; finished: number; total: number; ghost_freed: boolean }>;
  ghosts_freed: string[];
  leaves: { id: string; n: number; recovered: boolean }[];
  acts: { id: string; units_done: number; units_total: number }[];
}

// ─── Lesson (GET /learn/lessons/{id}) ───────────────────────────────────────

export interface Source {
  title: string;
  url?: string;
  licence: string;
  note?: string;
}

export interface StoryLesson {
  id: string;
  template: Template;
  title: Bi;
  title_sa: string | null;
  title_iast?: string;
  minutes: number;
  teaches: string[];
  needs: string[];
  review: "draft" | "engine_ok" | "scholar_ok";
  sources: Source[];
  cards: Card[];
  hash: string;
  /** Sanskrit text → recorded clip URL (R2), for the lines of this lesson that have one. */
  audio?: Record<string, string>;
}

interface CardBase {
  id: string;
  title?: Bi;
  image?: Picture;
  visuals?: TeachingVisual[];
  feedback_visuals?: TeachingVisual[];
  /** "panini" cards show only when the learner turns on Pāṇini depth. */
  depth: "core" | "panini";
  skills: string[];
  sutras: Sutra[];
  /** Pre-rendered clips of this card's Sanskrit, in reading order (R2 URLs); absent until the audio is rendered. */
  audio?: string[];
}

export interface VisualItem {
  id: string;
  label?: Bi;
  sa?: string;
  iast?: string;
  meaning?: Bi;
  image?: Picture;
  words: Word[];
  feature?: Bi;
  weights?: string;
}
export interface TeachingVisual {
  id: string;
  kind: 'figures'|'comparison'|'sequence'|'matrix'|'relations'|'worked'|'reading'|'beats';
  title: Bi;
  explanation?: Bi;
  items: VisualItem[];
  edges: {source:string;target:string;label:Bi}[];
  columns: Bi[];
  rows: VisualItem[][];
  source?: string;
  placement: 'before'|'after';
}

export interface Word {
  sa: string;
  iast: string;
  gloss: Bi;
}

export interface Example {
  sa: string;
  iast: string;
  meaning: Bi;
  words: Word[];
  source?: string;
}

export interface Line {
  speaker: string; // character id
  sa?: string;
  iast?: string;
  gloss?: Bi;
  text?: Bi;
}

export interface StoryCard extends CardBase {
  kind: "story";
  narration: Bi;
  lines: Line[];
  quote?: { sa: string; iast: string; gloss: Bi; source: string };
}

export interface TeachCard extends CardBase {
  kind: "teach";
  body: Bi;
  examples: Example[];
  rows: { sa: string; iast: string; gloss: Bi }[];
  steps: { sa: string; iast: string; label: Bi }[];
  formula?: string;
  formula_iast?: string;
  term?: { sa: string; iast: string; meaning: Bi };
}

export interface Cell {
  sa?: string;
  iast?: string;
  text?: Bi;
  highlight: boolean;
}

export interface TableCard extends CardBase {
  kind: "table";
  caption: Bi;
  columns: Bi[];
  rows: Cell[][];
  note?: Bi;
}

export interface Option {
  sa?: string;
  iast?: string;
  text?: Bi;
  correct: boolean;
  why?: Bi; // shown when this wrong option is picked
}

export interface PracticeCard extends CardBase {
  kind: "practice";
  mode: "choice" | "type" | "order" | "match" | "engine";
  prompt: Bi;
  explain: Bi;
  options: Option[];
  answers: string[];
  answers_iast?: string[];
  /** type: every accepted spelling (pause variants added by the builder). */
  accept?: string[];
  tiles: string[];
  tiles_iast?: string[];
  tokens: string[]; // order: the right order; shuffle for display
  tokens_iast?: string[];
  pairs: { left: Option; right: Option }[];
  exercise?: { kind: string; params: Record<string, unknown>; seed: number; item: Record<string, unknown>; answer: unknown };
  /** A story puzzle: the story waits until it is solved. */
  gate: boolean;
  story?: { success: Bi; failure: Bi };
  /** "after": keep IAST hidden until answered (it would give the answer away). */
  roman: "show" | "after";
}

export interface SummaryCard extends CardBase {
  kind: "summary";
  points: { sa?: string; iast?: string; text: Bi }[];
}

export interface ReadingCard extends CardBase {
  kind: "reading";
  passage: { sa: string; iast: string; meaning: Bi; words: Word[] }[];
}

export type RevisionSection =
  | "core" | "conditions" | "exceptions" | "optional" | "blocked"
  | "splitting" | "mistakes" | "panini" | "quick_sheet";

export interface RevisionRow {
  visuals?: TeachingVisual[];
  skill?: string;
  formula?: string;
  formula_iast?: string;
  rule: Bi;
  example?: Example;
  sutras: Sutra[];
  tag: "core" | "good" | "rare";
  /** "<lesson id>#<card id>": the app links "seen in scene N". */
  taught_in?: string;
  /** Met first here (the scenes did not show it). */
  new_here: boolean;
}

export interface RevisionCard extends CardBase {
  kind: "revision";
  section: RevisionSection;
  rows: RevisionRow[];
}

export interface VideoCard extends CardBase {
  kind: "video";
  youtube_id: string;
  channel: string;
  start?: number;
  end?: number;
}

// ─── Explore widgets: params as built (inputs + what the engine supplied) ───

interface WidgetBase {
  /** IAST for every Sanskrit string the widget can show. */
  iast: Record<string, string>;
}

export type PlaceId = "kantha" | "talu" | "murdha" | "danta" | "oshtha" | "nasika";

export interface LetterBuilderBuilt extends WidgetBase {
  bases: string[];
  signs: string[];
  halves: string[];
  targets: string[];
}

export interface MouthMapBuilt extends WidgetBase {
  letters: string[];
  places: Record<string, PlaceId[]>;
  place_names: Partial<Record<PlaceId, { en: string; hi: string; sa: string; iast: string }>>;
}

export interface FormExplorerBuilt extends WidgetBase {
  stems: { stem: string; linga: "Pum" | "Stri" | "Napumsaka"; gloss?: Bi }[];
  roots: { dhatu: string; lakaras: string[]; gloss?: Bi }[];
  vibhaktis: string[];
  vacanas: string[];
  paradigms: (
    | { stem: string; linga: string; rows: { vibhakti: string; vacana: string; form: string | null }[][] }
    | { dhatu: string; lakara: string; rows: { purusha: string; vacana: string; form: string | null }[][] }
  )[];
}

export interface RoleArrowsBuilt extends WidgetBase {
  sentence: { sa: string; iast: string; role: string; gloss: Bi }[];
  meaning: Bi;
}

export interface TimeSliderBuilt extends WidgetBase {
  forms: { label: Bi; sa: string; iast: string; meaning: Bi }[];
}

export interface WordShuffleBuilt extends WidgetBase {
  words: string[];
  meaning: Bi;
  /** Words that follow another word and never open a sentence (च, वा, हि…). */
  not_first?: string[];
}

export interface SandhiMixerBuilt extends WidgetBase {
  pairs: { first: string; second: string; joined: string; sutras: Sutra[] }[];
}

export interface CompoundUnpackerBuilt extends WidgetBase {
  compound: string;
  parts: string[];
  kind: "tatpurusha" | "karmadharaya" | "dvigu" | "dvandva" | "bahuvrihi" | "avyayibhava";
  vigraha: string;
  meaning: Bi;
}

export interface WordFactoryBuilt extends WidgetBase {
  roots: { dhatu: string; gloss: Bi }[];
  suffixes: { krt: string; label: Bi }[];
  results: Record<string, string>; // "<dhātu>|<krt>" → the word the engine made
}

export interface MarkWordsBuilt extends WidgetBase {
  passage: string[];
  targets: string[];
}

export interface RhythmTapperBuilt extends WidgetBase {
  lines: string[];
  scan: { line: string; syllables: string[]; weights: string; metre: string | null }[]; // weights: "L"/"G" per syllable
}

export interface DerivationStepperBuilt extends WidgetBase {
  target: string;
  steps: { sutra: string; sa: string; iast: string; result: string }[];
}

interface ExploreBase extends CardBase {
  kind: "explore";
  prompt: Bi;
  roman: "show" | "after";
}

export type ExploreCard =
  | (ExploreBase & { widget: "letter_builder"; params: LetterBuilderBuilt })
  | (ExploreBase & { widget: "mouth_map"; params: MouthMapBuilt })
  | (ExploreBase & { widget: "form_explorer"; params: FormExplorerBuilt })
  | (ExploreBase & { widget: "role_arrows"; params: RoleArrowsBuilt })
  | (ExploreBase & { widget: "time_slider"; params: TimeSliderBuilt })
  | (ExploreBase & { widget: "word_shuffle"; params: WordShuffleBuilt })
  | (ExploreBase & { widget: "sandhi_mixer"; params: SandhiMixerBuilt })
  | (ExploreBase & { widget: "compound_unpacker"; params: CompoundUnpackerBuilt })
  | (ExploreBase & { widget: "word_factory"; params: WordFactoryBuilt })
  | (ExploreBase & { widget: "mark_words"; params: MarkWordsBuilt })
  | (ExploreBase & { widget: "rhythm_tapper"; params: RhythmTapperBuilt })
  | (ExploreBase & { widget: "derivation_stepper"; params: DerivationStepperBuilt });

export type Card =
  | StoryCard | TeachCard | TableCard | ExploreCard | PracticeCard
  | SummaryCard | ReadingCard | RevisionCard | VideoCard;

// ─── Writes ─────────────────────────────────────────────────────────────────

/** POST /learn/attempts — once per lesson, when it ends. */
export interface AttemptsBody {
  lesson_id: string;
  results: { card_id: string; verdict: "correct" | "off_by_one" | "incorrect" | "unsure" }[];
}

/** POST /learn/test-out — after the unit check was finished with POST
 * /progress/card-lesson and passed (80% or more). */
export interface TestOutBody {
  unit_id: string;
  checks_right: number;
  checks_total: number;
}
