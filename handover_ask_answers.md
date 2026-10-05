# Ask answers sized to the question: handover

Written 2026-10-05 by Claude for the implementing agent (Muse Spark in opencode). You arrive with no
context, so this file carries all of it. You run every test and check in this file yourself and put
the outputs in your hand-back (section 11). Claude then re-runs them as an independent check, against
this file, Drik Panchang and the tests.

**What "verified" means here.** Each finding says how it was checked: *run* (executed), *read* (read in
the code or at the source) or *not verified*. Do the same in your hand-back. The owner treats an
unverified claim stated as fact as a lie.

**Read first.** `HANDOVER.md` section 0 (rules) and section 2 (look). They apply here unchanged and are
summarised in section 0 below. One line in `HANDOVER.md` section 0 is stale: the app now has
over-the-air updates (`expo-updates`, runtime 1.1.0). That changes nothing for you, because you don't
publish.

**Where things stand** [*read*, *run* 2026-10-05]. Talk's Ask mode and the Ask bubble are built and on
`main` (commits 9fe465d and 2aaf9c9). The phone side went out over the air as update `01a10cc8`. The
backend with `/ask/talk` is NOT deployed yet, so Ask in Talk errors on phones until the owner deploys.
Backend suite at hand-over: 1476 passed, 17 skipped.

---

## 0. Rules for this work

- **Don't commit, don't deploy, don't run an EAS build, don't run `eas update`.** The owner does all
  four. Leave the changes in the working tree.
- **Both directions keep working.** The new phone must work against today's backend (no `kind` in the
  card: draw it as today), and the phone already out (update 01a10cc8) must work against the new backend
  (see 3.5). Every new request field is optional; every new response field is read defensively.
- **Copy rule.** No em dashes and no spaced en dashes in anything a user can read, including
  `accessibilityLabel`. No explanatory paragraphs in the UI. Server text shown as prose goes through
  `plain()` (`mobile/src/utils/text.ts`).
- **Look rule.** A coloured surface is a deep solid fill (`fill.*`) with cream text (`onFill.*`). Never
  `accent.*.bg` or the pale tints. Plain content sits on the cream page with hairlines. No lists of
  rounded pills. 16dp side padding.
- **Accessibility.** Every `Pressable` has a role and a label, targets are at least 44dp, colour is
  never the only signal, Sanskrit is never below 18pt, every animation has a Reduce Motion path.
- **No AI notes in the UI.** Never add "written by AI", "checked against the page" or similar text
  (owner, 2026-10-03).
- **Never write Sanskrit from memory.** Devanagari comes from `vidyut.lipi` on a stored key, never typed.
- **Dates and times come from code, never from the model.** Every date, tithi, time or month span in an
  answer is calculated by `backend/app/services/panchang.py` and handed to the model as FACTS. A new
  calculation ships only when it reproduces Drik Panchang's dates for New Delhi in two years (2026 and
  2027), the rule `panchang.SHIPPED_FESTIVALS` already follows. If it does not, the FACTS line says
  "cannot calculate that yet" and nothing is guessed.
- **Primary sources only.** Drik Panchang is the owner's benchmark for calendar numbers. No Wikipedia,
  blogs or search summaries.
- **Leave alone:** the kundli and gun milan maths (`services/kundli.py` positions and dashas,
  `services/milan.py`), the verse and link checks (`services/ask_sources.py`), the streaming protocol
  (add fields only), and the Kāla screens (`mobile/src/kala/`, `screens/Kala*.tsx`). You may import
  `getKalaPrefs` / `loadKalaPrefs` from `mobile/src/kala/prefs.ts`.
- **Checks before hand-back:**
  - `cd backend && PYTHONUTF8=1 ./.venv/Scripts/python.exe -m pytest -q` (use the venv: it has Vidyut).
  - `cd mobile && npx tsc --noEmit`
  - `cd mobile && node scripts/check-contrast.mjs`, `node scripts/check-kala.mjs`, `node scripts/a11y-audit.js`
  - Starting the real backend rewrites `backend/app.db`. Back it up first and restore it by checksum,
    or test through `TestClient` with a temp `DB_PATH` the way `backend/tests/conftest.py` does.
  - Long heredocs fail in Git Bash: write scripts to a file and run the file. Python on Windows writes
    CRLF in text mode; open repo files with `newline=""`.

---

## 1. What the owner asked

The owner's complaint: answers are long, with a lot of text a learner might not read. The owner then
said the length must depend on the question, and not be cut to one screen either. Their examples, in
their words (lightly tidied):

| Question | What the owner wants | Kind (section 3) |
|---|---|---|
| What date is today according to Vikram Samvat? | 1 to 2 lines are fine | `fact` |
| What time is Brahma muhurta tomorrow? | short | `fact` |
| When is the next amavasya? | short | `fact` |
| The 12 months in English and Sanskrit, with dates | a table or bullet points | `table` |
| Getting a job through astrology | main things plus a bit of explanation, after asking date of birth and other details | `reading` |
| How is my horoscope today? | (listed with the short ones) | `reading`, short |
| What to eat during a cold, by Ayurveda | a few methods, with a good visual answer | `remedies` |
| What to do when sad, by the Bhagavad Gita | an overview, then a few verses, then ask at the end "want to see more verses?" | `verses` |
| What is the puja vidhi for Navratri? | can be long, but important things only, not everything | `procedure` |

Also: "The hour and day input needs a dropdown" (the birth details form, section 6).

---

## 2. Where things are now

How an answer is made [*read*]:

1. Phone: `mobile/src/screens/Conversation.tsx` `askSubmit` sends the question, the last six turns,
   the place, and saved birth/partner details to `POST /ask/talk/stream` (falls back to `/ask/talk`).
   The Ask bubble (`components/AskSheet.tsx`) goes through `POST /explain` (`routers/explain.py`),
   which calls the same `ask_live.ask` and `ask_live.clip`.
2. Server: `backend/app/routers/ask.py` `_prepare` works out FACTS (`services/ask_facts.py`
   `calendar_facts`), a CHART (`kundli.facts_text`) and a MATCH (`milan.facts_text`), then
   `services/ask_live.py` asks Gemini 3.8 Flash on Vertex with `SYSTEM_PROMPT` and gets one JSON card.
3. `ask_live.clip` holds the JSON to the card shape; `ask_sources.check_card` drops any verse or link
   that fails its check; `_finish` stores shareable answers in `ask_answers` (subject `__ask__`, key
   `ask_live.store_key`).
4. Phone: `mobile/src/components/ask/AnswerCard.tsx` draws the card: title, `when` chip, summary,
   sections (steps / bullets / text), match or chart table, verses, words, links, caution, follow-ups.

Why answers are long today [*read* in `ask_live.py`; lengths of real answers *not verified*, none are
stored]:

- `SYSTEM_PROMPT` opens "Answer fully, clearly and warmly", and its puja line asks for "every step in
  order".
- The SHAPE section allows up to 6 sections of up to 8 items of one to three sentences, plus up to 3
  verses, 6 words, 2 sources and 3 follow-ups. `settings.ask_live_max_tokens` is 2400.
- `clip` caps each item at 90 words and the summary at 120, far above the lengths wanted here, so it
  does not hold the answer short.
- `AnswerCard` shows everything at once; nothing is folded.

---

## 3. Answer kinds

The model picks a `kind` first and writes to that kind's limits. The server enforces the limits in
`clip` (so Flash cannot overfill), and the phone draws each kind its own way.

### 3.1 The card, new fields

All optional; absent means today's behaviour.

```json
{
  "kind": "fact | table | reading | remedies | verses | procedure | explain",
  "table": {"columns": ["", ""], "rows": [["", ""]]},
  "remedies": [{"name": "", "type": "drink | food | herb | oil | practice",
                "what": [""], "how": [""], "when": ""}],
  "verses": [{"sa": "", "ref": "", "meaning": "", "apply": "", "url": ""}],
  "more": {"label": "", "question": ""}
}
```

- `apply`: one line on how to live the verse (verses kind only).
- `more`: an offer to go further, shown as the last chip. Only the `verses` kind sets it ("See more
  verses" in the answer's language). The model writes `label` and `question` in the answer language. The
  server then appends the refs already shown, in roman, so the next answer does not repeat them:
  `question + " (not: Bhagavad Gita 2.14, 2.47)"`. The refs are read from the verses that passed the
  check.

### 3.2 Limits per kind

"Words" counts the prose, not the Sanskrit of a verse or the cells of a table.

| Kind | Use it for | Summary | Body | `clip` caps |
|---|---|---|---|---|
| `fact` | a date, a time, a name, a yes or no | 1 to 2 sentences, the date or time from FACTS first | nothing else; up to 2 follow-ups | summary 45 words; drop sections, terms, verses, sources |
| `table` | a set of like things to list or compare | 1 sentence | `table`: 2 to 5 columns, up to 14 rows, a few words a cell; dates only from FACTS | columns 5, rows 14, cell 8 words, summary 30 words; drop sections |
| `reading` | the learner's own chart, match or day | 2 to 3 sentences, the direct answer | "Main points": 3 to 5 items, each the finding and a short why (house, lord, dasha, transit); "Remedies": 1 to 2 items | 2 sections, 5 items, 40 words an item, summary 70 words |
| `remedies` | what to eat, drink or do for a complaint | 1 to 2 sentences | 3 to 5 `remedies`: `name` up to 5 words, `what` up to 5 short items, `how` up to 4 short steps, `when` one line (when and how much); optional "Avoid" section of up to 4 items | remedies 5; what 5 items of 5 words; how 4 steps of 18 words; when 15 words; 1 section of 4 items |
| `verses` | what a text teaches on a theme | an overview in 2 to 3 sentences | 2 to 3 verses, each with `meaning` and `apply`; `more` | verses 3; meaning 45 words; apply 22 words; at most 1 section of 3 items |
| `procedure` | a puja vidhi, a vrata, a ritual | 1 to 2 sentences | "What you need" (up to 10 short items); "Steps" (up to 12, one line each); the key mantra in `verses` (up to 2); "Avoid" (up to 3) | 4 sections; need items 6 words; steps 22 words; verses 2 |
| `explain` | everything else (what is dharma, trigonometry in the Vedas) | 2 to 3 sentences | 2 to 4 sections of up to 4 items, one sentence each; up to 2 verses; up to 4 words | 4 sections, 4 items, 35 words an item, summary 70 words |

An unknown or missing `kind` is treated as `explain`. A `table` with no rows, or `remedies` with none,
falls back to `explain`, with the summary kept. Keep `title` (8 words) and `follow_ups` (3) as today, but
`fact` gets at most 2 follow-ups.

### 3.3 The prompt

In `SYSTEM_PROMPT` (`backend/app/services/ask_live.py`):

- Opening: replace "Answer fully, clearly and warmly" with: answer clearly and warmly, as long as the
  question needs and no longer.
- The festivals line: replace "the samagri, the preparation, the sankalpa, every step in order, the
  mantras, aarti, prasad, and regional differences" with "what matters most: the samagri, the main
  steps in order, the key mantra, and a regional difference only when it changes what to do".
- Replace the SHAPE section's "sections" line with a LENGTH AND SHAPE section built from table 3.2.
  A draft to adapt:

```
LENGTH AND SHAPE
First choose "kind", then keep to its limits. Say what matters; leave out what a learner would skip.
- "fact": a date, a time, a name, a yes or no. "summary" gives the answer in one or two sentences,
  the date or time from FACTS first. Nothing else, and at most 2 "follow_ups".
- "table": the learner asked to list or compare like things. "summary" is one sentence. "table" has
  "columns" (2 to 5 short headers) and "rows" (a few words a cell). Dates come only from FACTS.
- "reading": the learner's own chart, match or day. "summary": the direct answer in two or three
  sentences. Then a section "Main points" of 3 to 5 items, each a finding and a short why from the
  CHART (house, lord, dasha, transit), and a section "Remedies" of 1 or 2 items.
- "remedies": what to eat, drink or do for a complaint. "summary" in one or two sentences, then 3 to 5
  "remedies", each with "name", "type" (drink, food, herb, oil or practice), "what" (what goes in),
  "how" (up to 4 short steps) and "when" (when and how much, one line).
- "verses": what a text teaches on a theme. "summary": an overview in two or three sentences. Then 2 or
  3 "verses", each with "meaning" and "apply" (one line on living it). Set "more" with "label" (offering
  more verses) and "question" (asking for more verses on the same theme), both in the answer language.
- "procedure": a puja vidhi, a vrata or a ritual. Only what matters: a section "What you need" (up to 10
  short items), a section "Steps" (up to 12 steps, one line each), the key mantra in "verses", and at
  most 3 items in a section "Avoid".
- "explain": anything else. "summary" in two or three sentences, then 2 to 4 short sections of up to 4
  items, one sentence each.
```

- Add `"kind"`, `"table"`, `"remedies"`, `"more"` and the verse `"apply"` to the JSON template at the end
  of the prompt.
- Leave BE TRUE, FACTS AND CHART, HEALTH, YOGA AND FEELINGS and VERSES AND SOURCES as they are. That
  includes the self-harm rule and the rule never to tell anyone to stop a doctor's treatment.

**A shape hint** (recommended). In `ask_live.user_message`, add one line `SHAPE HINT: <kind>` before
"Learner asks", when code can tell:
- `fact` for the FACTS questions of section 4 (a Brahma muhurta, next-tithi or today's-date question);
- `table` when MONTHS FACTS are present;
- `reading` when a CHART or MATCH is present.

The model still decides. Say in the prompt that the hint is a hint.

### 3.4 Server changes in `ask_live.py`

- `clip`: read `kind` (default `explain`), apply table 3.2's caps, keep `table`, `remedies`, `more`
  and the verse `apply`, cleaned with `_text` like every other field. `table` cells may hold Devanagari;
  no other check is needed.
- `partial_card`: also pass `kind`, `table` and `remedies` while streaming (they hold no verse or link,
  so they need no check). `more` and verses still wait for the final event.
- `flatten` (history, listen, report): add the table rows as lines (`Chaitra | चैत्र | 19 Mar to 17
  Apr`) and each remedy as a line (name: what; how; when).
- `store_key`: prefix the key with `v2|`, so no card stored under the old prompt is served again (none
  exist in production; there may be local ones).
- `routers/ask.py` `_finish`: after `check_card`, build `more.question` from the verses that survived
  (3.1). If none survived, drop `more`.
- The Sarvam fallback (`services/explainer.py` `_WIDE_PROMPT`) returns the old shape with no `kind`. It
  is drawn as `explain`; `clip`'s `explain` caps now shorten it too. No change needed there.

### 3.5 The phone already out

Update 01a10cc8's `AnswerCard` knows nothing of `table`, `remedies`, `more` or `apply`. So for those two
kinds the server also writes the content into `sections`, for that phone only:
- `table`: one `bullets` section, a row per item: `Chaitra · चैत्र · 19 Mar to 17 Apr`;
- `remedies`: one `steps` section per remedy, with the heading = name.

The new `AnswerCard` ignores `sections` when it draws a `table` or `remedies` card. `flatten` then has a
single text form for both.

---

## 4. Calculated facts the short answers need

All in `backend/app/services/ask_facts.py` (detection and FACTS lines) and
`backend/app/services/panchang.py` (calculation). Today FACTS have [*read*]:
- the day's tithi, the month in both conventions and the Vikram Samvat year;
- nakshatra, yoga, karana, sunrise and sunset;
- one festival when its name is in the question, for the 14 festivals in `SHIPPED_FESTIVALS`.

Nothing below exists yet. Each new FACTS line also sets `when_text` (the gold chip on the card) to the
thing asked about, not to today's date.

### 4.1 Brahma muhurta

- **Detect:** brahma muhurta, brahma muhurat, brahm muhurt, ब्रह्म मुहूर्त (add to `CALENDAR_Q`).
- **Target day:** tomorrow when the question says tomorrow, kal or कल; otherwise today if today's has
  not ended, else tomorrow.
- **Rule to test first:** the 14th of the night's 15 muhurtas. Night = the previous sunset to this
  sunrise, a muhurta = night ÷ 15. Start = sunrise − 2 muhurtas, end = sunrise − 1 muhurta.
- **Benchmark:** Drik Panchang's day page for New Delhi shows Brahma Muhurta. Compare three dates near
  21 March, 21 June and 21 December 2026 to the minute (±1). If Drik's times are a fixed 96 and 48
  minutes before sunrise instead, use that rule. Ship only when all three match. Record the dates and
  Drik's times in the test.
- **FACTS line:** `- Brahma muhurta on 6 Oct 2026: 04:39 to 05:27 (sunrise 06:15).` (Numbers
  illustrative.)

### 4.2 The next amavasya, purnima, ekadashi

- **Detect:** amavasya, amavas, अमावस्या, purnima, poornima, पूर्णिमा, ekadashi, एकादशी, with or without
  "next" or "when".
- **Calculate:** the next occurrence after now, giving the tithi's begin and end times
  (`_tithi_start_instant`, `tithi_at`) and its day. The day is the civil date whose sunrise falls inside
  the tithi. When no sunrise does (a kshaya tithi), use the date it begins.
- **Benchmark:** Drik Panchang's year lists of Amavasya and Purnima dates for 2026 and 2027. Check every
  one, not a sample. If the sunrise rule misses any, say which. Then ship the begin and end times only,
  and write the day as "cannot calculate that yet".
- **Ekadashi:** its fasting day follows other rules (Dashami viddha, Smarta and Vaishnava). Ship
  Ekadashi's day only if a rule reproduces Drik's fasting dates for both years; otherwise give the
  tithi's begin and end only.
- **FACTS line:** `- Next Amavasya: begins 20 Oct 2026 17:02, ends 21 Oct 2026 15:37; the day is 21 Oct
  2026.`

### 4.3 The months of the year, for the table

- **Detect:** month or months, maas, masa, mahine, महीने, मास, together with list, all, 12, twelve,
  names, बारह or सभी; or "Hindu months".
- **Calculate the months of the current Vikram Samvat year, Chaitra first.** Use 13 rows when there is
  an adhika month (`panchang._lunations`, `amanta_month`, the adhika test in `month_of`).
  - Amanta months run new moon to new moon; purnimanta months run full moon to full moon.
  - A civil day belongs to the month in progress at its sunrise. So a month's first day is the first
    date whose sunrise is after the month's opening moon, and its last day is the last date whose sunrise
    is before the next one.
- **Which convention:** the phone sends the learner's Kāla tradition (new optional `tradition` in
  `TalkRequest`, from `getKalaPrefs().tradition`; also on `/explain` for the Ask bubble).
  - `north` gets purnimanta.
  - `deccan` and `gujarat` get amanta.
  - `tamil`, `kerala` and `bengal` get amanta, plus a FACTS note that their calendars count solar
    months, which this list does not.
  - Missing means north.
  - Put the tradition into the store key whenever MONTHS FACTS are present.
- **Names:** roman from `panchang.MONTHS`. Devanagari from `vidyut.lipi` on the SLP1 stems already in
  `backend/scripts/gen_kala_names.py` `MONTHS` (the phone's Kāla names come from the same stems). Never
  type Devanagari. If you move the stems into a shared module, the script's output must not change and
  `check-kala.mjs` must still pass.
- **Benchmark:** Drik Panchang's daily page shows the amanta and purnimanta month names. For every month
  boundary of 2026, check the last day of one month and the first day of the next.
- **FACTS block:** `MONTHS (Vikram Samvat 2083, purnimanta, calculated for New Delhi):` then a line per
  month, `Chaitra | चैत्र | 4 Mar to 2 Apr 2026`. (Dates illustrative.)
- Gujarat counts its Vikram Samvat from Kartika. The year number in FACTS is Chaitradi; label it so.

### 4.4 Navratri

- **Add festival rows:** "Chaitra Navratri" (Chaitra Shukla 1 to 9) and "Sharad Navratri" (Ashwina
  Shukla 1 to 9).
- **Aliases:** navratri, navaratri, नवरात्रि, ghatasthapana. Do not alias "Durga Puja": Bengal's dates
  differ.
- **Ranges:** today the `range` kind is hard-coded to tithis 16 and 30 (Pitru Paksha). Give range rows
  their own start and end tithi.
- **Benchmark:** Drik Panchang's Navratri pages for 2026 and 2027, start and end dates. Navratri can run
  8 or 10 days when a tithi is lost or repeated, so compare both ends. Ship only if both years match;
  add them to `SHIPPED_FESTIVALS` and to `tests/test_panchang.py` like the others.
- **Ghatasthapana muhurta** (the time) is not calculated. The prompt already forbids times not in
  FACTS. Keep it so.

### 4.5 Today, for a daily horoscope

The CHART already lists today's transits, each with its house from the natal Moon [*read*
`kundli.facts_text`]. Add two lines, only when the question is about today (horoscope today, aaj ka
rashifal, राशिफल, daily horoscope, today):

- today's Moon sign and its house from the natal Moon;
- today's nakshatra and its tara counted from the birth nakshatra (`milan.tara_of`,
  `milan.TARA_NAMES`).

Plain arithmetic on positions the app already calculates; no new astronomy.

---

## 5. Phone: drawing each kind

In `mobile/src/components/ask/AnswerCard.tsx`, with new pieces in `components/ask/`. Types in
`mobile/src/api/client.ts` (`AskCard`: optional `kind`, `table`, `remedies`, `more`; `AskVerse.apply`;
`AskPartialCard` gains `kind`, `table`, `remedies`).

| Kind | How it looks |
|---|---|
| `fact` | The answer large (20pt bold), the gold `when` chip, follow-ups. No section blocks. |
| `table` | `AnswerTable.tsx`: header row in the section-head style, rows with hairlines on the cream page, a cell with Devanagari at 18pt or more, horizontal scroll when the columns do not fit. Each row is one accessible element whose label joins its cells. |
| `remedies` | `RemedyTiles.tsx`: one full-width tile per remedy, a deep fill (`fillAt(i)`) with cream text. An Ionicons glyph by type (`cafe-outline` drink, `restaurant-outline` food, `leaf-outline` herb, `water-outline` oil, `body-outline` practice), the name in bold, "What goes in" as one line, "How" as numbered lines, "When" as one line. No pills. Check the cream-on-fill pairs in `check-contrast.mjs`. |
| `verses` | Overview, then the verses as today with `apply` under the meaning, then the `more` chip last, drawn like a follow-up. It calls `askSubmit(more.question, { display: more.label })`, so the thread shows the label, not the long question. |
| `procedure` | "What you need" as a checklist the learner can tick while preparing (local state only, role `checkbox`, 44dp). "Steps" numbered, the number in a small `fill.ink` circle with cream text. The mantra as a verse, "Avoid" as bullets. |
| `reading` | Main points first, then "Remedies". The chart table folds behind a "Show the chart" row (it is nine planets long). A match keeps its table open: it is the answer. |
| `explain`, or no kind | As today. |

Also:
- `liveCard` (Conversation.tsx) passes `kind`, `table` and `remedies` through while streaming.
- `listenText` (Conversation.tsx) reads by kind:
  - `fact`: the summary;
  - `table`: the summary only;
  - `remedies`: the summary, then each name and its `when`;
  - `verses`: the overview and each meaning;
  - `procedure`: the summary and the steps;
  - others: as now. Keep the 1,200-character cap.
- Old backend: no `kind`, so everything draws as today.
- Optional: replace `ASK_STARTERS` (Conversation.tsx) with five of the owner's examples in section 1.

---

## 6. Birth form dropdowns

`mobile/src/components/ask/BirthForm.tsx` has number boxes for day, month and year and a 24-hour
"HH:MM" box [*read*]. Make them dropdowns, in JavaScript: a native date picker would need a new Play
build, and these must go out over the air.

- New `mobile/src/components/Dropdown.tsx`:
  - a field that looks like today's inputs (44dp, 1.5dp `outline`, white, the value or a placeholder);
  - it opens a React Native `Modal` sheet with a `FlatList` of options: 48dp rows, `getItemLayout`, and
    `initialScrollIndex` on the current value;
  - each option has role `button` and `accessibilityState.selected`;
  - the sheet has a Close button; `animationType` is `"none"` under Reduce Motion.
- **Date:** Day (1 to the number of days in the chosen month and year; a chosen day clamps when the month
  changes), Month (Jan to Dec by name), Year (this year down to 1900).
- **Time:** Hour (1 to 12), Minute (00 to 59, every minute: birth time matters to the minute), AM/PM.
  "I don't know the time" stays and disables them.
- **Data:** keep `services/birth.ts` `parseBirth` and the stored `AskBirth` shape (`time` is still
  24-hour "HH:MM"). Add pure helpers there: `daysInMonth(m, y)`, `to24h(h12, min, ampm)` and
  `from24h(hhmm)`, which fills the dropdowns from saved details. Drop "24-hour" from the label and the
  error text.
- The partner form (`who="partner"`) is the same component, so it gets the same dropdowns.

---

## 7. Small fixes found while reading

- `backend/app/services/kundli.py` `facts_text` ends with "Gun milan (matching two charts) is not
  calculated by the app yet." That is no longer true, and it now sits next to a MATCH block. Remove the
  line. No test depends on it [*read*].

---

## 8. Tests and checks

**Backend** (`backend/tests/test_ask_live.py` has `FakeProvider` and fixtures to copy):
- `clip` per kind, using table 3.2's caps:
  - an over-long answer of each kind comes back within the caps;
  - an unknown kind becomes `explain`;
  - an empty `table` or `remedies` falls back with the summary kept.
- 3.5: a `table` and a `remedies` card also carry the `sections` the old phone draws.
- `more`: built from the surviving verses with "(not: ...)"; dropped when no verse survives.
- Streaming: partial events carry `kind`, `table` and `remedies`; `more` and verses only in `final`.
- `store_key` begins `v2|`; the tradition is in the key when MONTHS FACTS are present.
- FACTS against Drik Panchang (section 4). Each test's reference dates are typed from Drik's pages,
  with a comment saying which page and the date read:
  - Brahma muhurta on three dates;
  - every Amavasya and Purnima of 2026 and 2027 (and Ekadashi if it ships);
  - the 2026 month boundaries;
  - Chaitra and Sharad Navratri 2026 and 2027.
  - If you cannot open Drik Panchang, leave those features unshipped. Say so in the hand-back; Claude
    will check them.
- Prompt contract: `SYSTEM_PROMPT` names all seven kinds and the template carries the new fields.
- The kundli line of section 7 is gone.

**A live length bench** (recommended, about ₹5 of Gemini): `backend/scripts/bench_ask_kinds.py`.
- Run the section 9 questions through `ask_live.ask` and `clip`, on a temp database. Use the invented
  birth details `1990-06-15 11:00 New Delhi`, as `test_ask_live.py` does.
- Print and save to `backend/results/ask_kinds_bench/` each question's kind and prose word count.
- `vertex_credentials.json` sits at the repo root (gitignored). Never print, log or commit it.

**Phone:**
- `tsc`, `check-contrast`, `check-kala` and `a11y-audit` pass.
- The pure helpers (`daysInMonth`, `to24h`, `from24h`) are checked with a scratch script that
  transpiles `services/birth.ts` with the project's `typescript` (there is no jest). Leap years,
  12 AM, 12 PM.
- Nothing can be checked on a phone from your session; say so.

---

## 9. Acceptance

The answers to these must come back in the kind given and within its limits, on a real Gemini call (the
bench above). The words column is prose only.

| # | Question | Kind | Words at most |
|---|---|---|---|
| 1 | What is today's date according to Vikram Samvat? | fact | 45 |
| 2 | What time is Brahma muhurta tomorrow? | fact | 45 |
| 3 | When is the next amavasya? | fact | 45 |
| 4 | List the 12 months in English and Sanskrit with their dates | table | 30 plus the table |
| 5 | How can I get a job through astrology? (with birth details) | reading | 300 |
| 6 | How is my horoscope today? (with birth details) | reading | 300 |
| 7 | What should I eat when I have a cold, according to Ayurveda? | remedies | 60 plus the tiles |
| 8 | What should I do when I am sad, according to the Bhagavad Gita? | verses | 80 plus the verses |
| 9 | What is the puja vidhi for Navratri? | procedure | 380 |
| 10 | What is dharma? | explain | 300 |
| 11 | Is there trigonometry in the Vedas or Upanishads? | explain | 300 |
| 12 | Question 8 in Hindi | verses | as 8, answered in Hindi |

Also:
- Questions 5 and 6 without birth details ask for them (the birth form), as today.
- The "more verses" chip on question 8 brings verses not shown before.
- Every date and time in 1 to 4 and 9 is a FACTS value. Where something cannot be calculated yet, the
  answer says so.

---

## 10. Not in this work

- Solar months for Tamil, Kerala and Bengal (the phone's Kāla engine has them; the backend does not).
- Ghatasthapana and other muhurta times beyond Brahma muhurta.
- Answering FACTS questions without the model at all (a calculated template in each language). Worth
  doing later: free and instant.
- Changing the model or `ask_live_max_tokens`.

---

## 11. Hand-back

Write it as a short Markdown file next to this one (`handover_ask_answers_result.md`):
- every file changed;
- what was *run* (tests with counts, the bench table with each question's kind and word count, the
  Drik comparisons with dates), what was *read*, and what is *not verified*;
- which calendar features shipped and which were left unshipped, and why;
- anything in this file you changed your mind about, and why.
