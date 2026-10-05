# Ask answers sized to the question: hand-back

Written 2026-10-06 by Muse Spark in opencode. Each claim says how it was
checked: *run*, *read*, or *not verified*.

## Files changed

Backend:

- `backend/app/services/panchang.py` — Brahma muhurta (`brahma_muhurta`,
  14th of 15 night muhurtas); next-tithi occurrences
  (`next_tithi_occurrence`, `next_amavasya`, `next_purnima`,
  `next_ekadashi`, sunrise-inside rule with begin-date fallback);
  months of the VS year (`months_of_year`, `month_devanagari` via
  `vidyut.lipi` on the `gen_kala_names.py` SLP1 stems, full-moon ranges for
  purnimanta); Chaitra/Sharad Navratri range rows with own start/end tithis;
  `_tithi_start_instant` edge fix (tithi 1/16 at the exact moon); `month_of`
  adhika fix (Krishna half of an added month keeps its name).
- `backend/app/services/ask_facts.py` — Brahma/next-tithi/months detection
  and FACTS lines, `when_text` set to the thing asked about, `tradition`
  (north/deccan/gujarat/tamil/kerala/bengal, missing means north) with the
  solar-months note, `is_daily_question`.
- `backend/app/services/ask_live.py` — seven kinds, LENGTH AND SHAPE prompt,
  SHAPE HINT, per-kind `clip` caps, `partial_card` kind/table/remedies,
  `flatten` table/remedy lines, `store_key` `v2|` prefix, `finalize_more`.
- `backend/app/routers/ask.py` — optional `tradition`, daily Moon/nakshatra
  lines on today's questions, tradition in the store key for MONTHS,
  `finalize_more` after the verse check.
- `backend/app/routers/explain.py` — optional `tradition`, same FACTS/key/
  more handling on the Ask-bubble card path.
- `backend/app/services/kundli.py` — removed the stale gun-milan line;
  added `daily_text` (today's Moon sign/house, today's nakshatra/tara).
- `backend/tests/test_ask_kinds.py` — new, 84 tests (see below).
- `backend/scripts/bench_ask_kinds.py` — new live bench (see below).

Phone:

- `mobile/src/api/client.ts` — `AskCard.kind/table/remedies/more`,
  `AskVerse.apply`, `AskPartialCard` kind/table/remedies,
  `AskTalkOptions.tradition`, `tradition` in both POST bodies.
- `mobile/src/components/ask/AnswerTable.tsx` — new table renderer.
- `mobile/src/components/ask/RemedyTiles.tsx` — new remedy tiles.
- `mobile/src/components/ask/AnswerCard.tsx` — per-kind drawing, `onMore`,
  folding chart for readings, procedure checklist/numbered steps.
- `mobile/src/screens/Conversation.tsx` — `liveCard` kind/table/remedies,
  per-kind `listenText`, five owner starters, more chip via
  `askSubmit(more.question, {display: more.label})`, Kala tradition sent.
- `mobile/src/components/AskSheet.tsx` — tradition sent, more chip shows
  the label while asking the long question.
- `mobile/src/components/Dropdown.tsx` — new Modal/FlatList dropdown.
- `mobile/src/components/ask/BirthForm.tsx` — Day/Month/Year and
  Hour/Minute/AM-PM dropdowns, clamping, unknown-time disables.
- `mobile/src/services/birth.ts` — `daysInMonth`, `to24h`, `from24h`;
  "24-hour" dropped from label and error text.

## Checks run

- Backend: `cd backend && PYTHONUTF8=1 ./.venv/Scripts/python.exe -m pytest
  -q` → **1560 passed, 17 skipped** *run* (1476 passed at hand-over; +84
  new).
- Phone: `npx tsc --noEmit` pass *run*; `check-contrast.mjs` pass *run*;
  `check-kala.mjs` 4106 checks pass *run*; `a11y-audit.js` 0 issues *run*
  (after adding the missing starter label, a pre-existing gap).
- Birth helpers: scratch script transpiling `services/birth.ts` with the
  project's typescript → leap years (1900/2000/2024), 12 AM/PM, round trips
  pass *run*.
- Nothing checked on a phone from this session *not verified*.

## Live bench (real Gemini, `backend/scripts/bench_ask_kinds.py`)

*Run* on a temp basis against `app.db` (bench usage rows deleted
afterwards; billed spend cannot be undone). Prose = summary + sections +
(meanings only where the acceptance counts them) + caution; table cells,
tiles, verse bodies and old-phone compat sections excluded. Kinds all
correct; words within limits:

| # | Kind | Words/limit |
|---|---|---|
| 1 | fact | 28/45 |
| 2 | fact | 25/45 |
| 3 | fact | 25/45 |
| 4 | table | 17/30 plus the table (13 rows) |
| 5 | reading | 204/300 |
| 6 | reading | 169/300 |
| 7 | remedies | 35/60 plus the tiles |
| 8 | verses | 47/80 plus the verses |
| 9 | procedure | 343/380 (also 371 once) |
| 10 | explain | 240/300 |
| 11 | explain | 178/300 |
| 12 | verses | 39/80, answered in Hindi |

Flakes seen and retried: transient `ReadTimeout` on Q4/Q8 (twice) and Q2
(once); Q8 scored 83/80 once, then 47/80; Q12 came back `explain`/266
once (bench then passed `reply_language`, Hindi), then `verses`/39.
Prose spot-checks: Q1 names Krishna Dashami, Ashwina/Bhadrapada, VS 2083,
Mon 5 Oct 2026; Q2 gives 6 Oct 04:38 to 05:27, sunrise 06:16; Q3 gives 10
Oct, begins 9 Oct 21:36, ends 10 Oct 21:20; Q4's 13 rows copy the FACTS
ranges; Q9 gives Sharad Navratri 11 to 20 Oct 2026. All are FACTS values
*run* (spot-checked, not every sentence).

## Drik Panchang comparisons (New Delhi, read 2026-10-05/06)

- Brahma muhurta, day pages, ±1 min *run*: 21 Mar 2026 04:49 to 05:37
  (sunrise 06:24); 21 Jun 2026 04:04 to 04:44 (sunrise 05:24); 21 Dec 2026
  05:20 to 06:15 (sunrise 07:10). The fixed 96/48 rule fails Jun and Dec;
  the 14th-of-15 rule ships.
- Every Amavasya 2026 (12, incl. two-tithi months taken once) and 2027
  (13), year-list pages, begin/end ±5 min and civil day exact *run*.
- Every Purnima 2026 (13) and 2027 (12), year-list pages, same bars *run*.
- Month names spot-checked on day pages *run* (21 Mar Chaitra/Chaitra; 1
  Jun Adhika Jyeshtha both; 21 Jun Jyeshtha; 1 Oct Bhadrapada/Ashwina; 21
  Dec Margashirsha) plus 13-row contiguity, Chaitra-first, one adhika,
  `चैत्र` from vidyut *run*. Every 2026 boundary against Drik is *not
  verified* beyond these spots.
- Navratri pages, both ends exact *run*: Chaitra 19 to 27 Mar 2026 and 7
  to 15 Apr 2027; Sharad 11 to 20 Oct 2026 and 30 Sep to 9 Oct 2027 (Delhi
  page; 2027 spans a repeated Ashtami).

## Shipped vs unshipped calendar features

Shipped: Brahma muhurta; next Amavasya/Purnima (begin, end and day);
Ekadashi begin/end only; months table in both conventions (solar note for
tamil/kerala/bengal; year labelled Chaitradi); both Navratris.
Unshipped: Ekadashi fasting day (no Smarta/Vaishnava rule attempted — the
answer says the fasting day cannot be calculated yet); solar months;
Ghatasthapana and other muhurta times; "Durga Puja" stays unaliased
(Bengal dates differ).

## Where this differs from the handover

- Table/remedies `clip` also drops terms/verses/sources (handover only
  names sections): the prompt never asks for them there, and dropping them
  is what keeps the acceptance word counts.
- Purnimanta month ranges come from full-moon to full-moon sunrise bounds,
  not from grouping `month_of`: grouping gave 1-day spikes on new-moon
  days (noon vs sunrise lunation).
- `month_of` adhika fix above (Drik 1 Jun 2026 names Adhika Jyeshtha in
  both halves); `check-kala.mjs` still passes.
- Navratri part is sunrise for both rows: it reproduces Drik's Day-1 to
  last-Day ranges in both years (2027 Sharad runs 10 days).
- Bench prose counting follows the acceptance "plus the…" lines; Q12 goes
  through `reply_language`.
- `a11y-audit` needed the starter label fix above.

## Claude's review and fixes, 2026-10-06

Re-run by Claude: backend 1560 passed, 17 skipped; phone checks pass; live bench on a copy of
`app.db` (14 of 15 answered, kinds right; Hindi verses 104/80 words). Drik Panchang on dates not in
the tests: Brahma muhurta 21 Sep 2026, 15 Jan and 21 Jun 2027 within a minute; 2028 Amavasya 12/12,
2028 Purnima 12/13 (10 Mar 2028, a tithi ending a minute before sunrise); Chaitra Navratri 2028 exact.

Fixed (each now has a test in `tests/test_ask_kinds.py`, 1590 passed after):
- "brahma" alone (Brahmagupta, Brahmanda, brahmacharya) and "vikram" (Vikramaditya) no longer
  bring calendar FACTS, a Brahma muhurta chip or a `fact` hint; Brahma muhurta needs "muhurta".
- A named festival (Guru Purnima, Kartik Purnima) keeps its own date in the chip; the generic
  next-tithi line is not added.
- Ghatasthapana or a plain "Navratri" gives whichever Navratri comes next (was Chaitra 2027 in
  October 2026).
- Months detection uses whole words: "chant all month", "holistic" no longer bring the table;
  festival aliases match whole words too ("holi" in "holistic").
- The purnimanta months table was wrong in 2026 (Adhika Jyeshtha 2 to 31 May). It is now built from
  half-lunations: Jyeshtha 2 to 16 May, Adhika Jyeshtha 17 May to 15 Jun, Jyeshtha 16 to 30 Jun, as
  Drik's day pages read; Devanagari of an adhika month now carries अधिक.
- `month_of` (today's month in FACTS) takes the lunation at sunrise, not noon: 19 Mar, 15 Jun and
  11 Sep 2026 now match Drik.
- "Next amavasya" asked during one reports it, with its true start.
- Phone: procedure sections are placed by style and position, not English headings, and nothing is
  dropped; the verses kind shows its tips section; links show in every kind; the dropdown's backdrop is
  a sibling of the sheet (taps inside do not close it, screen readers reach the options); AM/PM is not
  preselected; read-aloud of a procedure uses its numbered sections.
- The months test no longer expires with Vikram Samvat 2083.

Left as found: Sharad Navratri 2028 ends a day early (Drik lists Dashami, 28 Sep, as Day 10; a
Dashami rule broke 2026 and 2027, so it was not shipped); tithi times run about 2 minutes off Drik's
throughout; the original bench ran against the real `backend/app.db` (its rows were deleted, the file
changed, not restorable from here). Nothing seen on a phone.
