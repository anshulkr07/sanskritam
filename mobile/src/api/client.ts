// Typed API client against the Sanskritam FastAPI backend.
// Contract mirrors backend/app/schemas.py + routers/ exactly (mapped 2026-08-30).

import { fetch as streamFetch } from "expo/fetch";

import { BASE_URL } from "../config";

export type BridgeLangs = string[];

// ─── Auth ─────────────────────────────────────────────────────────────────

export interface LearnerProfile {
  id: string;
  display_name: string;
  bridge_langs: BridgeLangs;
  sanskrit_ratio: number;
  sanskrit_ratio_setting?: number;
  script_ratio: number;
  feature_mastery: Record<string, number>;
  streak: number;
  voice_minutes_used: number;
}

export interface DevLoginResponse {
  token: string;
  learner: {
    id: string;
    display_name: string;
    bridge_langs: BridgeLangs;
    sanskrit_ratio: number;
    sanskrit_ratio_setting?: number;
    script_ratio: number;
    feature_mastery: Record<string, number>;
    streak: number;
    voice_minutes_used: number;
  };
}

// ─── Learner ──────────────────────────────────────────────────────────────

export interface MeResponse {
  learner: LearnerProfile;
  model: {
    sanskrit_ratio: number;
    sanskrit_ratio_setting: number;
    script_ratio: number;
    feature_mastery: Record<string, number>;
    streak: number;
    bridge_langs: BridgeLangs;
  };
}

// ─── Challenges ───────────────────────────────────────────────────────────

export interface Challenge {
  id: string;
  prompt_l1: string;
  prompt_lang: string;
  target_sanskrit: string;
  target_iast: string;
  features: string[];
  audio_url: string;
  register: string;
}

// ─── Attempts ─────────────────────────────────────────────────────────────

export type Verdict = "correct" | "off_by_one" | "incorrect" | "unsure";

/**
 * Conversation turns carry verdicts the challenge grader never emits. An
 * escape is not an error (§6.3): "no_match" means the graph had no edge, not
 * that the learner was wrong. "revealed" is the escalation ladder giving up
 * on asking and telling — its `diagnosis` carries the answer and must be
 * shown rather than replaced with the generic escape copy.
 */
export type TurnVerdict =
  | Verdict
  | "no_match"
  | "empty"
  | "meta"
  | "revealed"
  /** LLM mode: the learner answered in their own language, not Sanskrit. */
  | "bridge";

/**
 * "llm" — the free-form tutor: any grammatical answer is accepted, Vidyut
 * gates the Sanskrit, and there are no edges to choose from. "graph" — the
 * authored dialogue graph, kept as the fallback when the model is unreachable.
 */
export type ConversationMode = "llm" | "graph";

export interface AttemptResponse {
  verdict: Verdict;
  parsed_features: Record<string, string>;
  accepted_parses: Record<string, string>[];
  diff: Record<string, unknown>[];
  diagnosis: string;
  grammar_note: Record<string, unknown> | null;
  abstained: boolean;
  /**
   * P9-3 / U10-2: the correct form's derivation — present ONLY on a
   * grammatical miss, never on `unsure` (§2.2). Consumed by the Challenge
   * screen via DerivationPlayer; answers grammar, while the LLM gloss
   * (grammar_note) answers meaning — either may be absent.
   */
  derivation: Derivation | null;
  updated_model: {
    sanskrit_ratio: number;
    sanskrit_ratio_setting: number;
    script_ratio: number;
    feature_mastery: Record<string, number>;
    streak: number;
  };
}

// ─── Shloka ───────────────────────────────────────────────────────────────

export interface WordBreakdown {
  word: string;
  meaning: string;
  features: string[];
}

export interface ChantLine {
  i: number;
  text: string;
  kind: "verse" | "speaker";
  start_ms: number;
  end_ms: number;
}

export interface ChantInfo {
  url: string;
  duration_ms: number;
  voice: string;
  lines: ChantLine[];
}

export interface Shloka {
  id: string;
  date: string;
  source_ref: string;
  devanagari: string;
  iast: string;
  metre: string;
  word_breakdown: WordBreakdown[];
  features: string[];
  audio_url: string;
  translation_hi?: string;
  translation_en?: string;
  verse_uid?: string;
  chant?: ChantInfo | null;
}

export interface ShlokaMeaning {
  translation_en: string;
  translation_hi: string;
  /** "db" stored, "llm" just written and stored, "none" nothing to show. */
  source: "db" | "llm" | "none";
}

// P21-4: one row of the canon catalogue — study order, depth, live counts.
export interface CanonText {
  slug: string;
  title_en: string;
  title_sa: string;
  source: string;
  licence: string;
  study_order: number;
  depth: "full" | "studied" | "index";
  tier: string;
  verses_planned: number;
  verses_imported: number;
  coverage: number;
  notes: string;
  ref_prefixes?: string[];
  /** Paged shelf (2026-10-09): served one chapter at a time. Absent on old backends. */
  paged?: boolean;
  /** True when this learner may read only the preview (Plus lock). */
  locked?: boolean;
}

/** One chapter of a paged book (GET /canon/{slug}/chapters). */
export interface PagedChapter {
  chapter: string;
  section: string;
  count: number;
  first_ref: string;
  locked: boolean;
}

export interface PagedChapters {
  slug: string;
  title_en: string;
  title_sa: string;
  tier: string;
  locked: boolean;
  preview: { chapter: string; verses: number | null };
  chapters: PagedChapter[];
}

export interface PagedVerses {
  slug: string;
  chapter: string;
  locked: boolean;
  locked_after: number | null;
  verses: Shloka[];
}

// ─── Varnamala ────────────────────────────────────────────────────────────

export interface VarnamalaChar {
  devanagari: string;
  iast: string;
  place: string | null;
  voicing: string | null;
  kind: string;
  iast_place?: string | null;
  /** Only the full GET /varnamala carries these; the legacy grid does not. */
  id?: string;
  /** Pre-rendered clip path (/audio/varnamala/<id>.wav). Present as a path
   *  convention: the file may not exist, so callers fall back to TTS. */
  audio_url?: string;
}

export interface VarnamalaResponse {
  vowels: VarnamalaChar[];
  consonants: VarnamalaChar[];
  nasals: VarnamalaChar[];
  others: VarnamalaChar[];
}

export interface Feature {
  id: string;
  kind: string;
  rank: number;
  label_en: string;
  label_hi: string;
}

// ─── Path spine (P7-5) ────────────────────────────────────────────────────

/** One node of the approved-content journey (GET /grammar/path). */
export interface PathNode {
  id: string;
  feature: string;
  kind: string;
  rank: number;
  label_en: string;
  label_hi: string;
  approved_count: number;
  pending_count: number;
  mastery: number;
  /** P22-4: a Lesson exists — Path routes Learn first, then Practice. */
  has_lesson?: boolean;
}

export interface PathSpine {
  nodes: PathNode[];
  features_covered: number;
  features_total: number;
}

// ─── Curriculum spine as data (P23 / U15) ───────────────────────────────
// Units → Lessons → typed, gradable Steps. Lesson → Practice → Challenge.

export interface LessonSummary {
  id: string;
  feature_id: string;
  features: string[];
  unit_id: string;
  rank: number;
  title_en: string;
  title_hi: string;
  register: string;
  step_count: number;
  attribution: string;
}

export interface Unit {
  id: string;
  rank: number;
  layer: number;
  title_en: string;
  title_hi: string;
  blurb: string;
  lessons: LessonSummary[];
  progress: number;
}

export interface LessonStep {
  rank: number;
  kind: string;
  payload: Record<string, unknown>;
  abstained: boolean;
}

export interface StepAttempt {
  verdict: Verdict;
  abstained: boolean;
  mastery: Record<string, number>;
  due_at: string | null;
  item_key: string;
}

// ─── Licence registry (P23-4a / U15-7) ──────────────────────────────────

export interface Licence {
  key: string;
  name: string;
  url: string;
  licence: string;
  credit: string;
  taken: string;
}

// ─── Lesson videos (P24) ────────────────────────────────────────────────
// Metadata only — the app never downloads or re-hosts video. `embed` rows
// play through YouTube's own player; `link` rows open the source page.

export interface VideoItem {
  id: string;
  unit_id: string;
  rank: number;
  title: string;
  channel: string;
  youtube_id: string | null;
  url: string;
  lang: string; // teaching medium: en | hi
  duration_s: number; // 0 = unknown, hidden by the client
  playback: "embed" | "link";
  source_key: string;
}

// ─── Review schedule (P23-5) ────────────────────────────────────────────

export interface ReviewItem {
  item_key: string;
  kind: string;
  due_at: string;
  stability: number;
  difficulty: number;
  lapses: number;
  last_verdict: string;
}

// ─── Curriculum (U14 / P22) ────────────────────────────────────────────
// Lesson → Practice → Challenge. Lessons carry Vidyut-verified examples and
// pre-computed visual_data the client renders without further derivation.

export interface LessonExample {
  devanagari: string;
  iast: string;
  gloss: string;
  derivation: { result: string; step_count: number; steps: AskEngineStep[] } | { splits: unknown[] } | null;
}

export interface Lesson {
  feature_id: string;
  unit_id: string;
  rank: number;
  title_en: string;
  title_hi: string;
  body: string;
  examples: LessonExample[];
  visual_type: "grid" | "tree" | "state_machine" | "none";
  visual_data: Record<string, unknown>;
  audio_url: string;
  register: string;
}

export interface VocabTopic {
  slug: string;
  title: string;
  description: string;
}

export interface VocabWord {
  topic: string;
  rank: number;
  devanagari: string;
  iast: string;
  gloss: string;
  gender: string;
  stem: string;
  examples: { devanagari: string; iast: string; gloss: string }[];
}

export interface ReaderPassage {  tier: number;
  sort_order: number;
  devanagari: string;
  iast: string;
  word_breakdown: WordBreakdown[];
  parse: { word: string; lemma: string; features: string[]; confident: boolean }[];
  features: string[];
  register: string;
}

// ─── Conversation ─────────────────────────────────────────────────────────

export interface ConversationScenario {
  id: string;
  title: string;
  description: string;
  register: string;
  est_minutes: number;
  node_count: number;
}

export interface ConversationNode {
  id: string;
  kind: string; // 'tutor' | 'repair'
  lang: string;
  devanagari: string;
  iast: string;
  gloss: string;
  audio_url: string;
  /**
   * Base64 WAV synthesised server-side and returned WITH the turn.
   *
   * Empty when the node has a pre-rendered `audio_url` (no synthesis needed)
   * or when TTS was unavailable — in both cases the client falls back. Its
   * whole point is removing a fourth serial round trip from a turn that
   * already costs three.
   */
  audio_base64?: string;
  repair_type: string | null;
}

export interface ConversationEdge {
  id: string;
  lang: string; // 'sa' | 'bridge'
  expected_text: string;
  features: string[];
}

/**
 * The correct Sanskrit, when the learner's line needed one.
 *
 * `roman` is generated server-side by services/iast.py, never by the model:
 * P7-13 found 130 of 264 stored transliterations wrong when an LLM produced
 * them. Both scripts are always populated together, or neither is.
 */
export interface TalkFix {
  needed: boolean;
  devanagari: string;
  roman: string;
  note_en: string;
}

/**
 * One free-form tutor turn, as four distinct jobs rather than a sentence and
 * its translation. Replaces the old `{devanagari, gloss}` pair on ConversationNode,
 * which rendered as a translator because that is exactly what it was.
 *
 * LLM mode only — null in graph mode, where `node` still carries the turn.
 */
export interface TalkTurn {
  /** What the learner said, and which languages it was in. */
  read_back: string;
  fix: TalkFix;
  /** The tutor's own reply, in Sanskrit. */
  reply_devanagari: string;
  /** IAST of reply_devanagari. Server-generated (see TalkFix). */
  reply_roman: string;
  /** The same reply in the learner's own language and script. */
  reply_native: string;
  /** The teaching half. Always English. */
  explain_en: string;
  /** ISO 639-1, settled server-side from what the learner actually said. */
  native_lang: string;
  /** Script key -> a font, via src/services/scriptFonts.ts. */
  native_script: string;
  /** Which detection layer decided: script|marker|stt|llm|sticky|default. */
  lang_source: string;
  /** The learner's line, word for word, each word in its own script. Voice
   * turns only; absent on old backends and always absent for typed lines. */
  heard?: string;
  /** Languages used, in order of first appearance, as English names. */
  heard_langs?: string[];
}

export interface StartResponse {
  session_id: string;
  scenario: {
    id: string;
    title: string;
    description: string;
    est_minutes: number;
  };
  node: ConversationNode;
  edges: ConversationEdge[];
  mode: ConversationMode;
  /** LLM mode: the structured opening turn. Null in graph mode. */
  talk: TalkTurn | null;
}

/** A learner move ABOUT the conversation rather than in it. */
export type MetaIntent = "explain" | "repeat" | "translate";

export interface TurnResponse {
  verdict: TurnVerdict;
  diagnosis: string;
  matched: boolean;
  node: ConversationNode | null;
  edges: ConversationEdge[];
  session_done: boolean;
  escape: boolean;
  ratio_hint: number;
  /**
   * Set when the learner asked about the line instead of answering it. The
   * node did NOT advance and nothing was graded. "repeat" is answered here
   * by replaying the node; "explain"/"translate" need conversationExplain(),
   * a second call by design so the turn itself stays model-free.
   */
  meta_intent: MetaIntent | null;
  mode: ConversationMode;
  /**
   * LLM mode: at most one short grammar note about the learner's line, raised
   * only when Vidyut found a real error. A word Vidyut cannot read — a name,
   * a place — is never a correction.
   */
  correction: string;
  /**
   * LLM mode: the structured turn — read-back, fix, bilingual reply and the
   * English explanation. Null in graph mode. Prefer this over `node`, which
   * is kept so graph mode and older clients still render something.
   */
  talk: TalkTurn | null;
  /** LLM mode: the model was unreachable and this turn is a stand-in. */
  degraded: boolean;
}

export interface ExplainResponse {
  explanation: string;
  /** 'llm' | 'gloss' | 'none' — 'gloss' means the model was unreachable. */
  source: string;
  provider: string;
  line: string;
}

// ─── Speech ───────────────────────────────────────────────────────────────

export interface TTSResponse {
  audio_base64: string;
  duration_hint: number | null;
}

export interface STTResponse {
  transcript: string;
  /** "" when auto-detect heard no language; "sa-IN" when it heard Sanskrit. */
  language_code: string;
  /** Saaras' confidence in `language_code`, auto-detect only. Diagnostic. */
  language_probability?: number | null;
  /** The mix as it was said (Indic words in native script, English in
   * Latin). Absent on old backends; display only, never sent to the tutor. */
  display?: string;
}

// ─── Grammar proof surfaces (U7) ──────────────────────────────────────────

/** A single step of a Pāṇinian derivation (from GET /grammar/derive). */
export interface DerivationStep {
  code: string;
  sutra_text: string;
  sutra_devanagari: string;
  result: string;
}

export interface Derivation {
  result: string;
  step_count: number;
  steps: DerivationStep[];
}

export interface ScanSyllable {
  syllable_devanagari: string;
  weight: string; // 'G' | 'L'
}

export interface Scansion {
  lines: { syllables: ScanSyllable[] }[];
  metre: string | null;
}

export interface WordOrder {
  words: string[];
  equivalent_orders: string[][];
  per_word: { word: string; role: string; ending: string }[];
  wrong_endings: { word: string; wrong_ending: string; effect: string }[];
  refused: string | null;
}

export interface VarnaDistance {
  a: string;
  b: string;
  distance: number;
  axis: string | null;
}

export interface ParadigmCell {
  vibhakti: string;
  vacana: string;
  form: string | null;
  derivation: Derivation | null;
}

export interface Paradigm {
  rows: ParadigmCell[][];
  kind: string;
}

/** GET /grammar/lookup — each candidate re-derives the typed word exactly. */
export interface WordLookupCandidate {
  kind: "noun" | "pronoun" | "verb" | "indeclinable";
  lemma: string;
  lemma_iast: string;
  linga: string | null;
  lakara: string | null;
  /** {vibhakti, vacana} for nouns, {purusha, vacana} for verbs */
  readings: Record<string, string>[];
  plain: { en: string; hi: string };
  /** GET /grammar/derive query for this exact form; empty for indeclinables */
  derive_params: Record<string, string>;
}

export interface WordLookup {
  word: string;
  iast: string;
  candidates: WordLookupCandidate[];
}

// ─── Ask anywhere (U11 / P19) ─────────────────────────────────────────────
// A session-free explain endpoint with engine-first routing. `routed_to`
// tells the learner which shape of answer they are reading (U11-2: an engine
// answer is a derivation and is authoritative; a model answer is prose and
// is help — they must not look alike).

export interface AskEngineStep {
  code: string;
  sutra: string;
  result: string;
}

export interface AskEngineBlock {
  kind: "parse" | "split" | "scansion" | "info";
  // parse
  word?: string;
  iast?: string;
  stem?: string;
  feature?: string;
  derivation?: { result: string; step_count: number; steps: AskEngineStep[] };
  // split
  joined?: string;
  splits?: { first: string; second: string; first_iast: string; second_iast: string }[];
  // scansion
  lines?: { syllables: ScanSyllable[] }[];
  metre?: string;
  // info
  text?: string;
}

export interface AskResponse {
  routed_to: "engine" | "llm" | "cache" | "engine_fallback";
  explanation: string;
  engine: { routed_to?: string; title?: string; blocks?: AskEngineBlock[]; subject?: string };
  source: "engine" | "llm" | "engine_fallback" | "";
  provider: string;
  cached: boolean;
  /** A shaped answer for wider questions. Absent on old backends. */
  card?: AskCard | null;
}

export interface AskCardSection {
  heading: string;
  style: string;
  items: string[];
}

export interface AskCard {
  title: string;
  title_sa: string;
  title_iast: string;
  when: { text: string; note: string };
  summary: string;
  sections: AskCardSection[];
  /** The answer kind. Absent on old backends, drawn as today. */
  kind?: string;
  table?: AskTable | null;
  remedies?: AskRemedy[] | null;
  /** Offer to go further, verses kind only. Absent unless the model set it. */
  more?: { label: string; question: string } | null;
  terms: { sa: string; iast: string; meaning: string }[];
  caution: string;
  place_needed: boolean;
  // Ask mode's wider card (services/ask_live.py). Optional: the Sarvam card
  // and old backends send none of these.
  /** Verses that passed the server's check against the text. */
  verses?: AskVerse[];
  /** Links that opened on a trusted site. */
  sources?: { title: string; url: string; site: string }[];
  follow_ups?: string[];
  needs_birth?: boolean;
  needs_partner?: boolean;
}

export interface AskTable {
  columns: string[];
  rows: string[][];
}

export interface AskRemedy {
  name: string;
  type: string;
  what: string[];
  how: string[];
  when: string;
}

export interface AskVerse {
  sa: string;
  iast: string;
  /** The text, with its verse number only when the number was checked too. */
  ref: string;
  meaning: string;
  /** One line on living the verse, verses kind only. */
  apply?: string;
  /** Where the verse was found; "" when the app holds it. */
  url: string;
  site: string;
  shloka_id?: string;
}

/** One place from GET /places/search. */
export interface PlaceHit {
  label: string;
  name: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
  tz: string;
}

export interface AskPlace {
  lat: number;
  lon: number;
  tz: string;
  label: string;
}

// ─── Ask mode in Talk (POST /ask/talk) ───────────────────────────────────
// The phone keeps the thread and sends the last few turns with each new
// question; the server keeps none.

export interface AskTurn {
  q: string;
  a: string;
}

/** Birth details for a chart. Used for the calculation, never stored server-side. */
export interface AskBirth {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM, 24-hour; "" when unknown
  time_known: boolean;
  lat: number;
  lon: number;
  tz: string;
  label: string;
}

export interface AskChartPlanet {
  key: string;
  name: string;
  name_sa: string;
  sign_en: string;
  sign_sa: string;
  sign_roman: string;
  deg: string;
  house: number;
  nakshatra: string;
  pada: number;
  retro: boolean;
  dignity: string;
}

export interface AskChart {
  time_known: boolean;
  lagna: { sign_en: string; sign_sa: string; sign_roman: string; deg: string; nakshatra: string; pada: number } | null;
  planets: AskChartPlanet[];
  moon_sign_en: string;
  moon_sign_sa: string;
  nakshatra: string;
  pada: number;
  dasha: {
    maha: { lord: string; start: string; end: string } | null;
    antar: { lord: string; start: string; end: string } | null;
  };
  conventions: { ayanamsa: string; houses: string; node: string };
}

/** One of the eight kootas of a gun milan, as the server calculated it. */
export interface AskKoota {
  key: string;
  name: string;
  max: number;
  points: number;
  boy: string;
  girl: string;
}

export interface AskMatchSide {
  nakshatra: string;
  pada: number;
  rashi: string;
  rashi_en: string;
  /** Where Mars counts from by the common Manglik rule; empty when not Manglik. */
  manglik_from: string[];
}

export interface AskMatch {
  boy: AskMatchSide;
  girl: AskMatchSide;
  kootas: AskKoota[];
  total: number;
  max: number;
  verdict: string;
  nadi_dosha: boolean;
  bhakoot_dosha: boolean;
  /** Which Nadi/Bhakoot exception decided those two kootas; "" when none did. */
  exception?: string;
}

/** A card still being written: title, summary, sections, kind, table and remedies. */
export type AskPartialCard = Pick<
  AskCard,
  "title" | "title_sa" | "title_iast" | "summary" | "sections" | "kind" | "table" | "remedies"
>;

export interface AskTalkOptions {
  history?: AskTurn[];
  lang?: string;
  sttLang?: string;
  place?: AskPlace | null;
  birth?: AskBirth | null;
  /** The other person, for gun milan; sent only with `birth`. */
  partner?: AskBirth | null;
  askerIs?: "boy" | "girl";
  /** The learner's Kala tradition, for month lists. */
  tradition?: string;
}

export interface AskTalkResponse {
  card: AskCard | null;
  explanation: string;
  /** ISO 639-1 code of the answer's language. */
  lang: string;
  /** Script key the client maps to a font. */
  script: string;
  routed_to: "llm" | "cache" | "fallback";
  cached: boolean;
  /** "birth" or "partner" when a reading needs those details. */
  needs: "" | "birth" | "partner";
  provider: string;
  chart: AskChart | null;
  match?: AskMatch | null;
}

function askBody(question: string, opts: AskTalkOptions): string {
  return JSON.stringify({
    question,
    history: opts.history ?? [],
    ...(opts.lang ? { lang: opts.lang } : {}),
    ...(opts.sttLang ? { stt_lang: opts.sttLang } : {}),
    ...(opts.place ? { place: opts.place } : {}),
    ...(opts.birth ? { birth: opts.birth } : {}),
    ...(opts.birth && opts.partner ? { partner: opts.partner, asker_is: opts.askerIs ?? "boy" } : {}),
    ...(opts.tradition ? { tradition: opts.tradition } : {}),
  });
}

// ─── Writing practice (U12 / P20) ──────────────────────────────────────────

export interface StrokePath {
  d: string;
  dir: "ltr" | "rtl" | "ttb" | "btt";
}

export interface WritingItem {
  id: string;
  tier: number; // 1 letter | 2 mātrā | 3 word
  sort_order: number;
  devanagari: string;
  iast: string;
  gloss: string;
  stroke_paths: StrokePath[];
  challenge_id: string | null;
}

export interface WritingAttemptResponse {
  verdict: "correct" | "wrong" | "unsure";
  abstained: boolean;
  item_id: string;
  item_devanagari: string;
  item_iast: string;
  attempt_id: number | null;
  /** What the photo check read (POST /writing/photo-check only). */
  recognised_text?: string;
}

// ─── Daily word (U8-4 / P12) — वर्ण-बन्धः ────────────────────────────
// Tile states: exact · near (right place, wrong axis) · present (elsewhere) ·
// absent. `axis` carries the phonetic reason so the four states never collapse
// to colour alone (U5-3).

// ─── Pronunciation (P3 / U9-1) ─────────────────────────────────────────
// Verdicts follow the abstention principle (§2.2 / §3.3): `unsure` /
// `abstained` means the system failed to hear, never that the learner failed.

export interface PronunciationResult {
  verdict: "correct" | "near" | "incorrect" | "unsure";
  transcript: string;
  /** Contrast class name, e.g. "retroflex_vs_dental" — the teachable result. */
  contrast: string;
  confidence: number;
  abstained: boolean;
  diagnosis: string;
  streak_changed: boolean;
}

// ─── Progress (P4 / U9-2) ──────────────────────────────────────────────

export interface ProgressDaily {
  date: string;
  xp: number;
  attempts: number;
  conversation_turns: number;
  pronunciation_attempts: number;
  goal_met: boolean;
  goal_xp: number;
}

export interface ProgressStreak {
  streak: number;
  freezes: number;
  max_freezes: number;
}

export interface ProgressRepair {
  repaired: boolean;
  streak: number;
  freezes_remaining: number;
}

/** One learner-local activity day, for the streak calendar (U9-2). */
export interface ProgressDay {
  date: string;
  xp: number;
  attempts: number;
  conversation_turns?: number;
  pronunciation_attempts?: number;
  goal_met: boolean;
}

export type DailyWordTileState = "exact" | "near" | "present" | "absent";

export interface DailyWordTile {
  character: string;
  state: DailyWordTileState;
  axis: string | null;
}

export interface DailyWordPuzzle {
  date: string;
  available: boolean;
  solved: boolean;
  finished: boolean;
  guesses_used: number;
  max_guesses: number;
  word_length: number; // Unicode code points (the typing fallback)
  /** Akṣara count: how many slots the tapping game shows. */
  letters?: number;
  /** Whole akṣaras to tap: the word's own plus near-miss distractors. Absent
   *  from a backend that predates the bank; the screen then falls back to typing. */
  bank?: string[];
  clue: string;
  streak: number;
  status: string; // open | solved | finished | no_word
  /** Set once the game has ended, so a returning learner sees the word. */
  revealed?: { answer: string; answer_iast: string } | null;
}

export interface DailyWordGuessResponse {
  status: string; // open | solved | finished | completed | refused | no_word
  solved: boolean;
  finished: boolean;
  tiles: DailyWordTile[];
  guesses_used: number;
  max_guesses: number;
  revealed?: { answer: string; answer_iast: string } | null;
  reason?: string;
}

// ─── Grammar guide (Grammar tab: chapters → topics, English + Hindi) ──
// GET /grammar/guide (index) and /grammar/guide/topics/{id}. Every learner-
// facing string is an {en, hi} pair; Sanskrit arrives with lipi IAST, an
// optional pre-rendered clip, and `checked` when the engine verified it.

export type GuideLang = "en" | "hi";

export interface Loc {
  en: string;
  hi: string;
}

export interface GuideSanskrit {
  sa: string;
  iast: string;
  checked?: boolean;
  audio_url?: string;
}

export interface GuideWord extends GuideSanskrit {
  gloss: Loc;
}

export interface GuideExample extends GuideSanskrit {
  meaning: Loc;
  words?: GuideWord[];
  source?: Loc;
}

export interface GuideSanskritCell extends GuideSanskrit {
  split?: [string, string];
}

export type GuideCell = GuideSanskritCell | { text: Loc };

export type GuideBlock =
  | { kind: "text"; text: Loc }
  | { kind: "analogy"; text: Loc }
  | { kind: "callout"; tone: "tip" | "watch" | "fact"; text: Loc }
  | { kind: "steps"; items: Loc[] }
  | { kind: "examples"; title?: Loc; items: GuideExample[] }
  | { kind: "wild"; items: GuideExample[] }
  | { kind: "formula"; a: GuideSanskrit; b: GuideSanskrit; result: GuideSanskrit; rule: Loc }
  | { kind: "table"; caption: Loc; columns: Loc[]; rows: GuideCell[][]; stem?: string; note?: Loc };

export interface GuideDeeper {
  title: Loc;
  level: number;
  blocks: GuideBlock[];
}

export interface GuideQuizOption {
  sa?: string;
  iast?: string;
  checked?: boolean;
  text?: Loc;
}

export interface GuideQuiz {
  prompt: Loc;
  options: GuideQuizOption[];
  answer: number;
  explain: Loc;
}

export interface GuideProof {
  type: "derive" | "paradigm" | "sandhi" | "word-order" | "scansion";
  label: Loc;
  params: Record<string, string>;
}

export interface GuideGlossaryItem {
  id: string;
  term_sa: string;
  term_iast: string;
  meaning: Loc;
  topic_id: string;
  audio_url?: string;
}

export interface GuideChapter {
  id: string;
  rank: number;
  title: Loc;
  title_sa: string;
  title_iast: string;
  blurb: Loc;
  icon: string;
  topic_ids: string[];
}

export interface GuideTopicSummary {
  id: string;
  chapter_id: string;
  rank: number;
  level: number; // 1 beginner · 2 intermediate · 3 advanced
  title: Loc;
  title_sa: string;
  title_iast: string;
  summary: Loc;
  minutes: number;
  feature_ids: string[];
  has_quiz: boolean;
}

export interface GuideTopicRef {
  id: string;
  title: Loc;
  title_sa: string;
}

export interface GuideIndex {
  version: string;
  chapters: GuideChapter[];
  topics: GuideTopicSummary[];
  glossary: GuideGlossaryItem[];
}

export interface GuideTopic extends GuideTopicSummary {
  chapter: { id: string; title: Loc; title_sa: string; position: number; count: number };
  term: (GuideSanskrit & { meaning: Loc }) | null;
  blocks: GuideBlock[];
  deeper: GuideDeeper[];
  quiz: GuideQuiz[];
  proofs: GuideProof[];
  terms: GuideGlossaryItem[];
  related: GuideTopicRef[];
  prev: GuideTopicRef | null;
  next: GuideTopicRef | null;
  attribution: string;
}

/** GET /grammar/derive query — every field optional, lists comma-joined.
 *  A type alias (not an interface) so it passes as a query record. */
export type DeriveParams = {
  dhatu?: string;
  lakara?: string;
  purusha?: string;
  vacana?: string;
  pratipadika?: string;
  linga?: string;
  vibhakti?: string;
  gana?: string;
  aupadeshika?: string;
  prayoga?: string;
  sanadi?: string;
  prefixes?: string;
  krt?: string;
  taddhita?: string;
  stem_type?: string;
  avyaya?: string;
  expect?: string;
}

// ─── Story deck (Discover Sanskrit) ───────────────────────────────────
// Backend-driven, read-only: chapters with ranked cards. Reading writes
// nothing — progress (last index) stays in AsyncStorage on the device.

export interface StoryCard {
  id: string;
  chapter_id: string;
  rank: number;
  title_en: string;
  title_hi: string;
  body: string;
  example_dev: string;
  example_iast: string;
  example_gloss: string;
  deep_link: string;
  deep_link_label: string;
  attribution: string;
}

export interface StoryChapter {
  id: string;
  rank: number;
  title_en: string;
  title_hi: string;
  blurb: string;
  cards: StoryCard[];
}

// ─── Word journey (one Sanskrit word's routes into other languages) ───
// Backend-driven, read-only: GET /word-origins/today, /word-origins and
// /word-origins/{id}. Every field is optional-safe: an old backend answers
// 404 (the Home card hides), and a new backend may omit fields the client
// reads defensively.

export interface WordHop {
  lang?: string;
  form?: string;
  roman?: string;
  gloss?: string;
}

export interface WordRoute {
  id?: string;
  lang?: string;
  lang_name?: string;
  word?: string;
  script?: string;
  roman?: string;
  gloss?: string;
  kind?: string;
  /** Worked out server-side: borrowed | travelled | related | traced. */
  relation?: string;
  confidence?: string;
  hops?: WordHop[] | null;
  sources?: string[];
  /** On a route the daily pipeline wrote: the page that states its origin. */
  source_url?: string;
  source_site?: string;
}

export interface WordSource {
  key?: string;
  name?: string;
  url?: string;
}

export interface WordOrigin {
  id?: string;
  sanskrit?: { dev?: string; iast?: string };
  stem?: { dev?: string; iast?: string };
  gloss?: string;
  attested?: string;
  note?: string;
  routes?: WordRoute[];
  sources?: WordSource[];
}

export interface WordOriginSummary {
  id?: string;
  sanskrit?: { dev?: string; iast?: string };
  gloss?: string;
  languages?: string[];
  scheduled_date?: string;
}

export interface WordToday {
  date?: string;
  available?: boolean;
  origin?: WordOrigin | null;
  headline_route_id?: string;
}

// ─── Do you know (one fact a day, resting on a quoted verse) ───
// Backend-driven, read-only: GET /facts/today, /facts and /facts/{id}. Every
// field is optional-safe: an old backend answers 404 and the Home card hides.

export interface Fact {
  id?: string;
  fact?: string;
  /** Who says so: text | tradition | modern. */
  claim_kind?: string;
  text_name?: string;
  ref?: string;
  devanagari?: string;
  iast?: string;
  translation?: string;
  explanation?: string;
  source_url?: string;
  source_site?: string;
  scheduled_date?: string;
}

export interface FactToday {
  date?: string;
  available?: boolean;
  fact?: Fact | null;
}

export interface FactSummary {
  id?: string;
  fact?: string;
  text_name?: string;
  ref?: string;
  scheduled_date?: string;
}

// ─── Recite + competitions (handover_recite) ────────────────────────────

export interface CompetitionPiece {
  source_ref: string;
  verse_uid: string;
}

export interface Competition {
  id: string;
  slug: string;
  kind: string;
  opens_at: string;
  closes_at: string;
  results_at: string;
  status: string;
  pieces: CompetitionPiece[];
  me?: { best_percent: number | null; rank: number | null; attempts_today: number; attempts_left: number } | null;
}

export interface ReciteAkshara {
  t: string;
  band: "ok" | "fix" | "unclear";
  heard?: string;
}

export interface ReciteLine {
  i: number;
  aksharas: ReciteAkshara[];
}

export interface ReciteResult {
  status: "scored" | "unclear";
  percent: number | null;
  mode: string;
  counts: { ok: number; fix: number; unclear: number };
  lines: ReciteLine[];
  tips: { kind: string; text: string }[];
  perfect: boolean;
  heard: string;
  review?: { verdict: string; due_at: string };
  counted?: boolean;
  why_not?: string;
  best_percent?: number | null;
  rank?: number | null;
  is_new_best?: boolean;
}

// ─── Client ───────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

/** Serialize an object into a URL query string, skipping undefined values. */
function toQuery(params: Record<string, unknown>): string {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.join("&");
}

async function request<T>(path: string, init: RequestInit = {}, withAuth = false): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (withAuth && authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, `Network error reaching ${BASE_URL}${path}`);
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = (body as { detail?: string }).detail ?? detail;
    } catch {
      /* non-JSON error body — keep statusText */
    }
    throw new ApiError(res.status, detail);
  }
  // 204 No Content (DELETE /me) has no body to parse.
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/**
 * Multipart request — used for /speech/stt with recorded audio.
 * Accepts a file URI string (React Native), Blob, or Uint8Array.
 * The backend reads `file` as a FormFile with `language_code`/`mode` form fields.
 */
export async function uploadSpeech(
  audio: string | Blob | Uint8Array,
  filename: string,
  mime: string,
  languageCode = "sa-IN",
  mode = "transcribe",
): Promise<STTResponse> {
  const uploadUrl = `${BASE_URL}/speech/stt`;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  // React Native environment with a file URI
  if (typeof audio === "string") {
    const FileSystem = require("expo-file-system/legacy");
    const uploadType = FileSystem.FileSystemUploadType ? FileSystem.FileSystemUploadType.MULTIPART : 1;
    const res = await FileSystem.uploadAsync(uploadUrl, audio, {
      httpMethod: "POST",
      uploadType: uploadType,
      fieldName: "file",
      mimeType: mime,
      parameters: {
        language_code: languageCode,
        mode: mode,
      },
      headers,
    });

    if (res.status >= 200 && res.status < 300) {
      return JSON.parse(res.body) as STTResponse;
    } else {
      let detail = `Upload failed with status ${res.status}`;
      try {
        const body = JSON.parse(res.body);
        detail = body.detail ?? detail;
      } catch { }
      throw new ApiError(res.status, detail);
    }
  }

  // Web environment using FormData
  const form = new FormData();
  const file =
    audio instanceof Blob ? audio : new Blob([audio as unknown as BlobPart], { type: mime });
  form.append("file", file, filename);
  form.append("language_code", languageCode);
  form.append("mode", mode);

  const res = await fetch(uploadUrl, {
    method: "POST",
    headers,
    body: form,
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = (body as { detail?: string }).detail ?? detail;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, detail);
  }
  return (await res.json()) as STTResponse;
}

/**
 * Upload a photographed letter or word to be read and graded on the server
 * (POST /writing/photo-check). The server reads it with Sarvam Document
 * Intelligence, keeps only the recognised text, and discards the image.
 *
 * The image is the raw request body (the item id is in the query), not
 * multipart: the server holds it in memory only, and a multipart upload over
 * 1 MB is spooled to a temp file on its disk.
 *
 * Throws ApiError; callers fall back to on-device reading for 404/405
 * (endpoint not deployed yet), 429 (rate limit) and 5xx/network failures.
 */
export async function uploadWritingPhoto(itemId: string, uri: string): Promise<WritingAttemptResponse> {
  const uploadUrl = `${BASE_URL}/writing/photo-check?item_id=${encodeURIComponent(itemId)}`;
  const headers: Record<string, string> = { Accept: "application/json", "Content-Type": "image/jpeg" };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const FileSystem = require("expo-file-system/legacy");
  const uploadType = FileSystem.FileSystemUploadType ? FileSystem.FileSystemUploadType.BINARY_CONTENT : 0;
  let res: { status: number; body: string };
  try {
    res = await FileSystem.uploadAsync(uploadUrl, uri, {
      httpMethod: "POST",
      uploadType,
      headers,
    });
  } catch {
    throw new ApiError(0, `Network error reaching ${uploadUrl}`);
  }
  if (res.status >= 200 && res.status < 300) {
    return JSON.parse(res.body) as WritingAttemptResponse;
  }
  let detail = `Upload failed with status ${res.status}`;
  try {
    detail = (JSON.parse(res.body) as { detail?: string }).detail ?? detail;
  } catch {
    /* non-JSON error body: keep the status line */
  }
  throw new ApiError(res.status, detail);
}

// ─── Endpoint helpers ─────────────────────────────────────────────────

/**
 * Multipart upload for a pronunciation attempt (U9-1). Mirrors uploadSpeech's
 * shape — recorder URI on native, FormData on web — but posts to
 * /pronunciation/attempt with { file, target, target_iast }. The verdict obeys
 * the abstention principle: `unsure`/`abstained` is the system failing to hear,
 * not the learner failing (§2.2 / §3.3).
 */
export async function uploadPronunciation(
  audio: string | Blob | Uint8Array,
  filename: string,
  mime: string,
  target: string,
  targetIast = "",
): Promise<PronunciationResult> {
  const uploadUrl = `${BASE_URL}/pronunciation/attempt`;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  // React Native environment with a file URI
  if (typeof audio === "string") {
    const FileSystem = require("expo-file-system/legacy");
    const uploadType = FileSystem.FileSystemUploadType ? FileSystem.FileSystemUploadType.MULTIPART : 1;
    const res = await FileSystem.uploadAsync(uploadUrl, audio, {
      httpMethod: "POST",
      uploadType,
      fieldName: "file",
      mimeType: mime,
      parameters: { target, target_iast: targetIast },
      headers,
    });
    if (res.status >= 200 && res.status < 300) {
      return JSON.parse(res.body) as PronunciationResult;
    }
    let detail = `Upload failed with status ${res.status}`;
    try {
      const body = JSON.parse(res.body);
      detail = (body as { detail?: string }).detail ?? detail;
    } catch { /* keep status fallback */ }
    throw new ApiError(res.status, detail);
  }

  // Web environment using FormData
  const form = new FormData();
  const file =
    audio instanceof Blob ? audio : new Blob([audio as unknown as BlobPart], { type: mime });
  form.append("file", file, filename);
  form.append("target", target);
  form.append("target_iast", targetIast);

  const res = await fetch(uploadUrl, { method: "POST", headers, body: form });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = (body as { detail?: string }).detail ?? detail;
    } catch { /* keep statusText */ }
    throw new ApiError(res.status, detail);
  }
  return (await res.json()) as PronunciationResult;
}

/**
 * Upload a recitation for scoring (POST /recite/score). Mirrors
 * uploadPronunciation shape. 404 hides the feature with one line.
 */
export async function uploadRecite(
  audio: string,
  opts: { verseUid: string; unit: string; mode?: string; purpose?: string; hideLevel?: number },
): Promise<ReciteResult> {
  const uploadUrl = `${BASE_URL}/recite/score`;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  const FileSystem = require("expo-file-system/legacy");
  const uploadType = FileSystem.FileSystemUploadType ? FileSystem.FileSystemUploadType.MULTIPART : 1;
  const res = await FileSystem.uploadAsync(uploadUrl, audio, {
    httpMethod: "POST",
    uploadType,
    fieldName: "file",
    mimeType: "audio/m4a",
    parameters: {
      verse_uid: opts.verseUid,
      unit: opts.unit,
      mode: opts.mode ?? "strict",
      purpose: opts.purpose ?? "practise",
      hide_level: String(opts.hideLevel ?? 0),
    },
    headers,
  });
  if (res.status >= 200 && res.status < 300) return JSON.parse(res.body) as ReciteResult;
  let detail = `Upload failed with status ${res.status}`;
  try {
    detail = (JSON.parse(res.body) as { detail?: string }).detail ?? detail;
  } catch { /* keep */ }
  throw new ApiError(res.status, detail);
}

/**
 * Upload a competition attempt (POST /competitions/{id}/attempts).
 */
export async function uploadCompetitionAttempt(
  competitionId: string,
  audio: string,
  opts: { verseUid: string; camera: string; hidden: boolean },
): Promise<ReciteResult> {
  const uploadUrl = `${BASE_URL}/competitions/${encodeURIComponent(competitionId)}/attempts`;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  const FileSystem = require("expo-file-system/legacy");
  const uploadType = FileSystem.FileSystemUploadType ? FileSystem.FileSystemUploadType.MULTIPART : 1;
  const res = await FileSystem.uploadAsync(uploadUrl, audio, {
    httpMethod: "POST",
    uploadType,
    fieldName: "file",
    mimeType: "audio/m4a",
    parameters: {
      verse_uid: opts.verseUid,
      camera: opts.camera,
      hidden: opts.hidden ? "true" : "false",
    },
    headers,
  });
  if (res.status >= 200 && res.status < 300) return JSON.parse(res.body) as ReciteResult;
  let detail = `Upload failed with status ${res.status}`;
  try {
    detail = (JSON.parse(res.body) as { detail?: string }).detail ?? detail;
  } catch { /* keep */ }
  throw new ApiError(res.status, detail);
}

export const api = {
  health: () => request<{ status: string; version: string }>("/health"),

  devLogin: (displayName: string, bridgeLangs: BridgeLangs = ["en", "hi"]) =>
    request<DevLoginResponse>("/auth/dev-login", {
      method: "POST",
      body: JSON.stringify({ display_name: displayName, bridge_langs: bridgeLangs }),
    }),

  anonLogin: (installId: string, bridgeLangs: BridgeLangs = ["en", "hi"]) =>
    request<DevLoginResponse>("/auth/anonymous", {
      method: "POST",
      body: JSON.stringify({ install_id: installId, bridge_langs: bridgeLangs }),
    }),

  googleLogin: (idToken: string, bridgeLangs: BridgeLangs = ["en", "hi"], timezone?: string) =>
    request<DevLoginResponse>("/auth/google", {
      method: "POST",
      body: JSON.stringify({
        id_token: idToken,
        bridge_langs: bridgeLangs,
        timezone,
      }),
    }),

  // Sign in with Apple (Guideline 4.8 companion to Google). The identityToken
  // comes from the platform flow; displayName is forwarded only when Apple
  // supplies it (first authorization) — the backend falls back otherwise.
  appleLogin: (
    idToken: string,
    displayName?: string,
    bridgeLangs: BridgeLangs = ["en", "hi"],
    timezone?: string,
  ) =>
    request<DevLoginResponse>("/auth/apple", {
      method: "POST",
      body: JSON.stringify({
        id_token: idToken,
        display_name: displayName ?? null,
        bridge_langs: bridgeLangs,
        timezone,
      }),
    }),

  me: () => request<MeResponse>("/me", {}, true),

  // Hard-deletes the account and all its learning data — Google Play requires
  // deletion inside the app. 204 on success.
  deleteMe: () => request<void>("/me", { method: "DELETE" }, true),

  updateRatio: (body: { sanskrit_ratio?: number; script_ratio?: number }) =>
    request<MeResponse>("/me", { method: "PATCH", body: JSON.stringify(body) }, true),

  nextChallenge: (register = "laukika", mode = "text") =>
    request<Challenge>(`/challenges/next?register=${register}&mode=${mode}`, {}, true),

  listChallenges: (register = "laukika") =>
    request<Challenge[]>(`/challenges?register=${register}`, {}, true),

  submitAttempt: (challengeId: string, responseText: string) =>
    request<AttemptResponse>(
      "/attempts",
      { method: "POST", body: JSON.stringify({ challenge_id: challengeId, response_text: responseText }) },
      true,
    ),

  todayShloka: () => request<Shloka>("/shlokas/today", {}, true),

  // A verse's meaning in English and Hindi. Stored meaning comes straight
  // back; a verse with none is written once on the server and stored, so the
  // first learner to open it waits a few seconds. Never fails for a missing
  // meaning: source is "none" and both strings are empty.
  shlokaMeaning: (shlokaId: string) =>
    request<ShlokaMeaning>(`/shlokas/${encodeURIComponent(shlokaId)}/meaning`, {}, true),

  // U13/P21: the reader corpus — full list in date order, instrumentation included.
  listShlokas: () => request<Shloka[]>("/shlokas", {}, true),

  // P21-4: the canon catalogue — study order, depth, live imported counts.
  // Paged shelf: ?include=paged asks for every row with paged/locked. An old
  // backend ignores the parameter and returns the classic rows without paged.
  canon: () => request<{ texts: CanonText[] }>("/canon?include=paged", {}, true),

  // Paged books, one chapter at a time (2026-10-09). Defensive reads: an old
  // backend answers 404 and the shelf shows the 12 old books only.
  canonChapters: (slug: string) =>
    request<PagedChapters>(`/canon/${encodeURIComponent(slug)}/chapters`, {}, true),

  canonVerses: (slug: string, chapter: string) =>
    request<PagedVerses>(
      `/canon/${encodeURIComponent(slug)}/verses?chapter=${encodeURIComponent(chapter)}`,
      {},
      true,
    ),

  // P23-4a / U15-7: the licence registry — name, wording, credit verbatim.
  licences: () => request<Licence[]>("/licences", {}, true),
  /** Any city above 5,000 people (GeoNames), best match first. */
  searchPlaces: (q: string, limit = 12) =>
    request<PlaceHit[]>(`/places/search?q=${encodeURIComponent(q)}&limit=${limit}`, {}, true),

  // P24: lesson videos — ranked metadata for a unit (or a lesson in it).
  videos: (opts: { unitId?: string; lang?: string; playback?: string } = {}) => {
    const q = toQuery({ unit_id: opts.unitId, lang: opts.lang, playback: opts.playback });
    return request<VideoItem[]>(`/videos${q ? `?${q}` : ""}`, {}, true);
  },

  lessonVideos: (lessonId: string) =>
    request<VideoItem[]>(`/videos?lesson_id=${encodeURIComponent(lessonId)}`, {}, true),

  // P23-5: the review schedule — the honest "N due today".
  reviewDue: (limit = 20) =>
    request<{ due_count: number; items: ReviewItem[] }>(
      `/review/due?limit=${limit}`,
      {},
      true,
    ),

  // P23-2: generated exercises — no table, no review queue. The answer is
  // never in a generate() payload; grade() rebuilds from the same seed.
  exerciseKinds: () => request<{ kinds: string[] }>("/exercises/kinds", {}, true),

  generateExercise: (kind: string, params: Record<string, unknown>, seed: number) =>
    request<Record<string, unknown>>(
      "/exercises/generate",
      { method: "POST", body: JSON.stringify({ kind, params, seed }) },
      true,
    ),

  gradeExercise: (
    kind: string,
    params: Record<string, unknown>,
    seed: number,
    answer: Record<string, unknown>,
  ) =>
    request<{ verdict: Verdict; abstained: boolean }>(
      "/exercises/grade",
      { method: "POST", body: JSON.stringify({ kind, params, seed, answer }) },
      true,
    ),

  // The full grid (ids and audio paths) when the backend has it; the legacy
  // grid otherwise, so a new app still works against an older backend.
  varnamala: async (): Promise<VarnamalaResponse> => {
    try {
      return await request<VarnamalaResponse>("/varnamala");
    } catch (e) {
      if (e instanceof ApiError && (e.status === 404 || e.status === 405)) {
        return request<VarnamalaResponse>("/grammar/varnamala");
      }
      throw e;
    }
  },

  features: () => request<Feature[]>("/grammar/features", {}, true),

  // Conversation
  conversationScenarios: () =>
    request<{ scenarios: ConversationScenario[] }>("/conversation/scenarios", {}, true),
  conversationStart: (scenarioId?: string) =>
    request<StartResponse>(
      "/conversation/start",
      { method: "POST", body: JSON.stringify({ scenario_id: scenarioId ?? null }) },
      true,
    ),
  /**
   * Submit one learner utterance.
   *
   * `sttLang` is the language code Saaras reported when the turn came from
   * voice. It is a free, strong signal for romanized speech that a script
   * scan cannot read ("naan porein" is Latin letters but Tamil), and the
   * server folds it into its own detection. Omit it for typed input.
   */
  conversationTurn: (
    sessionId: string,
    transcript: string,
    opts: { edgeId?: string; sttLang?: string } = {},
  ) =>
    request<TurnResponse>(
      "/conversation/turn",
      {
        method: "POST",
        body: JSON.stringify({
          session_id: sessionId,
          transcript,
          edge_id: opts.edgeId ?? null,
          stt_lang: opts.sttLang ?? null,
        }),
      },
      true,
    ),
  /**
   * Explain a tutor line. Runs off the turn path, so it is slower (~2 s) than
   * a turn and safe to await only after the turn has already rendered.
   * `text` targets an earlier bubble; omit it for the current node.
   */
  conversationExplain: (
    sessionId: string,
    opts: { question?: string; text?: string; translateOnly?: boolean } = {},
  ) =>
    request<ExplainResponse>(
      "/conversation/explain",
      {
        method: "POST",
        body: JSON.stringify({
          session_id: sessionId,
          question: opts.question ?? "",
          text: opts.text ?? "",
          translate_only: opts.translateOnly ?? false,
        }),
      },
      true,
    ),

  // Speech
  tts: (text: string, languageCode = "hi-IN", speaker = "aditya", pace = 1.0) =>
    request<TTSResponse>(
      "/speech/tts",
      {
        method: "POST",
        body: JSON.stringify({ text, language_code: languageCode, speaker, pace }),
      },
      true,
    ),

  /**
   * Transcribe learner audio.
   *
   * Defaults to "unknown" — auto-detect — rather than a fixed language. Talk
   * used to pin this to "sa-IN", which forced a Kannada or Telugu speaker's
   * words through a Sanskrit model and got back mush. Plain Saaras v4
   * auto-detect has the opposite failure (it translates spoken Sanskrit into
   * English), so for "unknown" the server runs both and keeps the faithful
   * one. The response's `language_code` says which language they actually
   * spoke: "sa-IN" when it was Sanskrit.
   *
   * Throws ApiError 413 for a recording past Saaras' 30-second limit.
   */
  stt: (audio: string | Blob | Uint8Array, filename = "recording.wav", mime = "audio/wav", languageCode = "unknown") =>
    uploadSpeech(audio, filename, mime, languageCode, "transcribe"),

  // Ask anywhere (U11 / P19) — session-free, engine-first. New fields are
  // optional so old backends keep working: they ignore what they do not know.
  ask: (
    surface: string,
    subject: string,
    question = "",
    opts: { screenText?: string; place?: AskPlace | null; cards?: boolean; tradition?: string } = {},
  ) =>
    request<AskResponse>(
      "/explain",
      {
        method: "POST",
        body: JSON.stringify({
          surface,
          subject,
          question,
          ...(opts.screenText ? { screen_text: opts.screenText } : {}),
          ...(opts.place ? { place: opts.place } : {}),
          ...(opts.cards ? { cards: true } : {}),
          ...(opts.tradition ? { tradition: opts.tradition } : {}),
        }),
      },
      true,
    ),

  /**
   * One question in Talk's Ask mode. `history` is the thread so far (the
   * server keeps none), `lang` the language the thread has been answered in.
   * `birth` goes in the POST body only, for a chart; the server does not
   * store or log it.
   */
  askTalk: (question: string, opts: AskTalkOptions = {}) =>
    request<AskTalkResponse>("/ask/talk", { method: "POST", body: askBody(question, opts) }, true),

  /**
   * The same question, answered while it is written (POST /ask/talk/stream,
   * server-sent events read through expo/fetch). `onPartial` receives the
   * card so far (title, summary, sections, kind, table and remedies; verses
   * and more wait for the check); the resolved value is the whole checked
   * answer, as /ask/talk returns it. Throws ApiError on a refused request
   * or an error event, like `request` does.
   */
  askTalkStream: async (
    question: string,
    opts: AskTalkOptions,
    onPartial: (card: AskPartialCard) => void,
  ): Promise<AskTalkResponse> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    };
    if (authToken) headers.Authorization = `Bearer ${authToken}`;
    let res: Awaited<ReturnType<typeof streamFetch>>;
    try {
      res = await streamFetch(`${BASE_URL}/ask/talk/stream`, {
        method: "POST",
        headers,
        body: askBody(question, opts),
      });
    } catch {
      throw new ApiError(0, `Network error reaching ${BASE_URL}/ask/talk/stream`);
    }
    if (!res.ok) {
      let detail = res.statusText;
      try {
        detail = ((await res.json()) as { detail?: string }).detail ?? detail;
      } catch {
        /* keep statusText */
      }
      throw new ApiError(res.status, detail);
    }
    if (!res.body) throw new ApiError(0, "The answer could not be streamed.");
    const reader = res.body.getReader();
    // Lines are cut at the newline byte before decoding: a newline is never
    // part of a multi-byte character, so no Devanagari letter is split.
    const decoder = new TextDecoder();
    let pending = new Uint8Array(0);
    let final: AskTalkResponse | null = null;
    const handle = (line: string) => {
      if (!line.startsWith("data: ")) return;
      const ev = JSON.parse(line.slice(6)) as {
        type: string;
        card?: AskPartialCard;
        response?: AskTalkResponse;
        status?: number;
        detail?: string;
      };
      if (ev.type === "partial" && ev.card) onPartial(ev.card);
      else if (ev.type === "final" && ev.response) final = ev.response;
      else if (ev.type === "error") throw new ApiError(ev.status ?? 500, ev.detail ?? "No answer right now.");
    };
    for (;;) {
      const { done, value } = await reader.read();
      if (value && value.length) {
        const joined = new Uint8Array(pending.length + value.length);
        joined.set(pending);
        joined.set(value, pending.length);
        let start = 0;
        for (let i = 0; i < joined.length; i++) {
          if (joined[i] === 10) {
            handle(decoder.decode(joined.subarray(start, i)).replace(/\r$/, ""));
            start = i + 1;
          }
        }
        pending = joined.slice(start);
      }
      if (done) break;
    }
    if (pending.length) handle(decoder.decode(pending));
    if (!final) throw new ApiError(0, "The answer stopped before it finished.");
    return final;
  },

  /**
   * Flag AI-generated content (Play AI-Generated Content policy). The report
   * carries the question, the answer and an optional reason, each clipped to
   * 2000 characters. Returns 204. Rate limited to 20 a day per learner.
   */
  reportContent: (body: {
    surface: "talk" | "ask" | "fact" | "word";
    question: string;
    answer: string;
    reason?: string;
  }) =>
    request<void>(
      "/feedback/report",
      {
        method: "POST",
        body: JSON.stringify({
          surface: body.surface,
          question: (body.question || "").slice(0, 2000),
          answer: (body.answer || "").slice(0, 2000),
          reason: (body.reason || "").slice(0, 2000),
        }),
      },
      true,
    ),

  // Writing practice (U12 / P20) — recognition runs ON-DEVICE (§2.16); the
  // server sees only the recognised string + confidence, never strokes.
  writingItems: (tier?: number) =>
    request<WritingItem[]>(
      "/writing/items" + (tier ? `?tier=${tier}` : ""),
      {},
      true,
    ),
  writingAttempt: (itemId: string, recognisedText: string, confidence: number, source: "ink" | "photo") =>
    request<WritingAttemptResponse>(
      "/writing/attempt",
      {
        method: "POST",
        body: JSON.stringify({
          item_id: itemId,
          recognised_text: recognisedText,
          confidence,
          source,
        }),
      },
      true,
    ),

  writingPhotoCheck: (itemId: string, uri: string) => uploadWritingPhoto(itemId, uri),

  // Grammar proof surfaces (U7) — local computation, no quota.
  deriveWord: (params: DeriveParams) =>
    request<Derivation>("/grammar/derive?" + toQuery(params)),

  scansion: (text: string) =>
    request<Scansion>("/grammar/scansion?text=" + encodeURIComponent(text)),

  sandhiSplit: (joined: string) =>
    request<{ candidates: { first: string; second: string; first_valid: boolean; second_valid: boolean }[] }>(
      "/grammar/sandhi?joined=" + encodeURIComponent(joined),
    ),

  lookupWord: (word: string) =>
    request<WordLookup>("/grammar/lookup?word=" + encodeURIComponent(word)),

  wordOrder: (sentence: string) =>
    request<WordOrder>("/grammar/word-order?sentence=" + encodeURIComponent(sentence)),

  varnaDistance: (a: string, b: string) =>
    request<VarnaDistance>("/grammar/varna-distance?a=" + encodeURIComponent(a) + "&b=" + encodeURIComponent(b)),

  paradigm: (params: {
    pratipadika?: string; linga?: string; dhatu?: string; lakara?: string;
    gana?: string; aupadeshika?: string; prayoga?: string; sanadi?: string;
    prefixes?: string; stem_type?: string;
  }) =>
    request<Paradigm>("/grammar/paradigm?" + toQuery(params)),

  // Approved-content spine for the journey path (P7-5)
  pathSpine: () => request<PathSpine>("/grammar/path", {}, true),

  // Grammar guide — chapters → topics, English + Hindi, no quota.
  guideIndex: () => request<GuideIndex>("/grammar/guide", {}, true),
  guideTopic: (topicId: string) =>
    request<GuideTopic>(`/grammar/guide/topics/${encodeURIComponent(topicId)}`, {}, true),

  // Curriculum (U14 / P22) — Lesson → Practice → Challenge; vocab; graded
  // reading. Static content: no quota, but still auth-bound like /shlokas.
  // P23: lessons are addressable by id (steps) as well as by feature.
  units: () => request<Unit[]>("/units", {}, true),

  lessons: (unitId?: string) =>
    request<LessonSummary[]>(
      "/lessons" + (unitId ? `?unit_id=${encodeURIComponent(unitId)}` : ""),
      {},
      true,
    ),

  lessonSteps: (lessonId: string) =>
    request<LessonStep[]>(`/lessons/${encodeURIComponent(lessonId)}/steps`, {}, true),

  attemptStep: (lessonId: string, rank: number, answer: Record<string, unknown>) =>
    request<StepAttempt>(
      `/lessons/${encodeURIComponent(lessonId)}/steps/${rank}/attempt`,
      { method: "POST", body: JSON.stringify({ answer }) },
      true,
    ),

  lesson: (featureId: string) =>
    request<Lesson>(`/lessons/${encodeURIComponent(featureId)}`, {}, true),

  vocabTopics: () => request<{ topics: VocabTopic[] }>("/vocab/topics", {}, true),

  vocab: (topic: string) =>
    request<VocabWord[]>(`/vocab/${encodeURIComponent(topic)}`, {}, true),

  readerTier: (tier: number) =>
    request<ReaderPassage[]>(`/reader/${tier}`, {}, true),

  // Story deck (Discover Sanskrit) — read-only, no quota.
  storyChapters: () => request<StoryChapter[]>("/story/chapters", {}, true),

  storyCards: (chapterId?: string) =>
    request<StoryCard[]>(
      "/story/cards" + (chapterId ? `?chapter_id=${encodeURIComponent(chapterId)}` : ""),
      {},
      true,
    ),

  // Daily word (U8-4 / P12) — वर्ण-बन्धः
  dailyWord: () => request<DailyWordPuzzle>("/daily-word", {}, true),

  // Word journey — one Sanskrit word's routes into other languages.
  wordToday: () => request<WordToday>("/word-origins/today", {}, true),
  wordOrigins: () => request<{ origins: WordOriginSummary[] }>("/word-origins", {}, true),
  wordOrigin: (id: string) => request<WordOrigin>(`/word-origins/${encodeURIComponent(id)}`, {}, true),

  // Do you know — one fact a day, with the verse it rests on.
  factToday: () => request<FactToday>("/facts/today", {}, true),
  facts: () => request<{ facts: FactSummary[] }>("/facts", {}, true),
  fact: (id: string) => request<Fact>(`/facts/${encodeURIComponent(id)}`, {}, true),
  // With `letters` (the guess already split into akṣaras) the server scores
  // whole akṣaras; without, the original code-point scoring.
  dailyWordGuess: (guess: string, letters?: string[]) =>
    request<DailyWordGuessResponse>(
      "/daily-word/guess",
      {
        method: "POST",
        body: JSON.stringify(letters ? { guess, mode: "akshara", letters } : { guess }),
      },
      true,
    ),

  // Pronunciation (P3 / U9-1)
  pronunciationAttempt: (
    audio: string | Blob | Uint8Array,
    filename: string,
    mime: string,
    target: string,
    targetIast = "",
  ) => uploadPronunciation(audio, filename, mime, target, targetIast),

  // Progress (P4 / U9-2)
  progressDaily: () => request<ProgressDaily>("/progress/daily", {}, true),
  progressStreak: () => request<ProgressStreak>("/progress/streak", {}, true),
  progressRepair: () =>
    request<ProgressRepair>("/progress/repair", { method: "POST" }, true),
  progressHistory: (days = 35) =>
    request<ProgressDay[]>(`/progress/history?days=${days}`, {}, true),

  // Play games (HANDOVER 5.7): no vendor calls, no quota.
  gamesDeck: (game: string, set?: string, topic?: string) => {
    const q = new URLSearchParams({ game });
    if (set) q.set("set", set);
    if (topic) q.set("topic", topic);
    return request<{ game: string; set: string; count: number; items: { sa: string; iast: string; meaning: string; topic: string }[] }>(`/games/deck?${q.toString()}`, {}, true);
  },
  gamesDaily: () =>
    request<{ date: string; game: string; goal: { type: string; value: number; label: string }; done: boolean; streak: number }>("/games/daily", {}, true),
  gamesResult: (body: { game: string; mode: string; score: number; moves?: number; duration_ms?: number; daily?: boolean; found?: number; total?: number }) =>
    request<{ xp: number; best: number; is_best: boolean; daily_done: boolean; streak: number }>("/games/result", { method: "POST", body: JSON.stringify(body) }, true),
  varnaJaal: () =>
    request<{ date: string; size: number; cells: string[]; words: { aksharas: string[]; sa: string; iast: string; meaning: string }[] }>("/games/varna-jaal", {}, true),
  gamesPools: (kind?: string) =>
    request<{ kind?: string; count?: number; params?: Record<string, unknown>[]; kinds?: string[] }>(`/games/pools${kind ? `?kind=${encodeURIComponent(kind)}` : ""}`, {}, true),

  // Notify (P13) — token collection. Registration is best-effort: a failure
  // here must never block the learner (the daily job simply has no token).
  registerPushToken: (deviceId: string, token: string, platform = "") =>
    request<{ device_id: string; platform: string; dead: boolean }>(
      "/me/push-tokens",
      { method: "POST", body: JSON.stringify({ device_id: deviceId, token, platform }) },
      true,
    ),
  removePushToken: (deviceId: string) =>
    request<{ removed: boolean }>(`/me/push-tokens?device_id=${encodeURIComponent(deviceId)}`, { method: "DELETE" }, true),

  // Recite (handover_recite 8-9): scoring, due verses, competitions.
  reciteDue: () =>
    request<{ items: { verse_uid: string; source_ref: string; due_at: string; last_percent: number | null }[] }>(
      "/recite/due", {}, true,
    ).catch((e) => {
      if (e instanceof ApiError && e.status === 404) return { items: [] };
      throw e;
    }),
  competitionCurrent: () =>
    request<{
      open: Competition | null;
      next: Competition | null;
      last: { competition: Competition; my_rank: number | null; certificate_code: string | null } | null;
    }>("/competitions/current", {}, true).catch((e) => {
      if (e instanceof ApiError && e.status === 404) return { open: null, next: null, last: null };
      throw e;
    }),
  competitionLeaderboard: (id: string, limit = 50) =>
    request<{ status: string; rows: { rank: number; public_name: string; percent: number }[]; me: { rank: number; percent: number } | null }>(
      `/competitions/${encodeURIComponent(id)}/leaderboard?limit=${limit}`, {}, true,
    ),
  competitionResults: (id: string) =>
    request<{ rows: { rank: number; public_name: string; percent: number }[]; me: { rank: number | null; percent: number | null; certificate_code: string | null } | null }>(
      `/competitions/${encodeURIComponent(id)}/results`, {}, true,
    ),
  competitionMaster: (month?: string) =>
    request<{
      month: string;
      rows: { rank: number; public_name: string; wins: number; seconds: number; thirds: number }[];
      me: { rank: number; public_name: string; wins: number; seconds: number; thirds: number } | null;
      winner: { public_name: string; wins: number; claim_code: string } | null;
    }>(`/competitions/master${month ? `?month=${encodeURIComponent(month)}` : ""}`, {}, true).catch((e) => {
      if (e instanceof ApiError && e.status === 404) return { month: "", rows: [], me: null, winner: null };
      throw e;
    }),
  competitionRules: () =>
    request<{ version: string; rules: string[] }>("/competitions/rules", {}, true).catch(() => ({ version: "", rules: [] })),
  publicProfile: () =>
    request<{ public_name: string; age_confirmed: boolean; rules_version: string; recordings_consent: boolean }>(
      "/me/public-profile", {}, true,
    ).catch((e) => {
      if (e instanceof ApiError && e.status === 404) return { public_name: "", age_confirmed: false, rules_version: "", recordings_consent: false };
      throw e;
    }),
  savePublicProfile: (body: { public_name?: string; age_confirmed?: boolean; rules_version?: string; rules_accepted?: boolean; recordings_consent?: boolean }) =>
    request<{ public_name: string; age_confirmed: boolean; rules_version: string; recordings_consent: boolean }>(
      "/me/public-profile", { method: "PUT", body: JSON.stringify(body) }, true,
    ),
  myCertificates: () =>
    request<{ certificates: { code: string; kind: string; rank: number; competition_id: string | null; month: string | null; piece_ref: string }[] }>(
      "/me/certificates", {}, true,
    ).catch((e) => {
      if (e instanceof ApiError && e.status === 404) return { certificates: [] };
      throw e;
    }),
};

export default api;