# Parva: festivals, vrats and the days that matter: handover

Written 2026-10-10 by Claude for the implementing agent (Muse Spark in opencode). You arrive with no
context, so this file carries all of it. Work through section 13 in order, one phase at a time, and run
every check it lists before you start the next phase.

**What "verified" means here.** Each fact below says how it was checked: *run* (executed, with the
date), *read* (read in the code or at the source, with the date) or *not verified*. Do the same in your
hand-back (section 15). The owner treats an unverified claim stated as fact as a lie.

**Read first.** `HANDOVER.md` section 0 (rules) and section 2 (look). They still apply and are
summarised in section 0 below. `DECISIONS.md`, the Kāla entries of 2026-10-01 to 2026-10-05, explain the
calendar engine you build on.

**Who does what.**
- You: code, scripts, tests, prompts, content drafts, image prompts, and the hand-back.
- The owner: running Vertex batch jobs that cost money (you may run a dry run of at most 5 requests to
  measure cost), generating images, reading drafts, deploying the backend, running the migration,
  building the app, publishing OTA updates, committing.
- You never spend money beyond that dry run, deploy, build, publish or commit.

---

## 0. Rules for this work

- **Don't commit, don't deploy, don't run an EAS build, don't run `eas update`.** Leave changes in the
  working tree.
- **Other sessions' work is in the tree.** `mobile/src/screens/Conversation.tsx` has an uncommitted change
  from another session. Don't touch it.
- **Leave alone:** the phone's calendar engine and the Kāla screens (`mobile/src/kala/`,
  `screens/Kala*.tsx`), except the one entry row in `screens/Kala.tsx` allowed in 10.4; kundli and gun
  milan (`services/kundli.py`, `services/milan.py`); Recite and competitions; Talk and the Ask streaming
  protocol. You may import from `kala/` (prefs, place, today) but not change it.
- **Both directions keep working.** The app on phones must keep working against the new backend, and the
  new app against today's backend until the owner deploys. Every new response field is read defensively.
  A missing endpoint (404) hides the feature: the Home strip simply does not appear. Nothing crashes.
- **Copy rule.** No em dashes and no spaced en dashes in anything a user can read, in English or Hindi,
  including `accessibilityLabel` and notification text. No explanatory paragraphs in the UI chrome: a
  title, short labels, one-line errors that say what happened and what to do. Festival page bodies are
  numbered one-sentence steps and short lists, never paragraphs (the owner's Kāla rule: "from the basics:
  numbered one-sentence steps, still no paragraphs"). Server text shown as prose goes through `plain()`
  (`mobile/src/utils/text.ts`).
- **Look rule.** A coloured surface is a deep solid fill (`fill.*` in `mobile/src/theme.ts`) with cream
  text (`onFill.*`). Never use the pale tints (`accent.*.bg`, `color.saffronLight`, `color.okBg`,
  `color.unsureBg`, `color.warnBg`, `color.surfaceMuted`) as a background. Plain content sits on the page
  with hairlines. No lists of rounded pills. No coloured left bar on a rounded card. 16dp side padding.
- **Accessibility.** Every `Pressable` has a role and a label. Targets at least 44dp. Colour is never the
  only signal. Sanskrit and Hindi Devanagari never below 18pt (`sized()` in `hooks/useTypeScale.tsx`).
  Every animation has a Reduce Motion path (`hooks/useReducedMotion.ts`). Paintings are decorative for
  screen readers unless the page says what they show in text.
- **No AI notes in the UI.** Never add "written by AI", "generated", "checked by a model" or similar
  (owner, 2026-10-03). The source labels of section 4.3 are not AI notes: they say where a line comes
  from (a text, a calculation, a custom), and the owner asked for them (decision 3).
- **Never write Sanskrit from memory.** Every Sanskrit string a user sees comes from the database
  (`shlokas`), an engine (`vidyut`, through `backend/scripts/gen_kala_names.py`'s pattern) or a named
  source you opened and recorded. Hindi names of festivals, tithis and months come from Drik Panchang's
  Hindi pages (`lang=hi`), compared by code-point hash the way `mobile/scripts/check-kala.mjs` does it,
  never retyped.
- **Sources rule.** Never use Wikipedia, Wiktionary, blogs, or a search engine's summary as evidence
  (owner, 2026-10-01). A story, a rule or a vidhi rests on the text itself (a Purāṇa chapter, a
  dharmaśāstra digest), a dictionary of record, or a printed edition you opened. A date or a time is
  held to Drik Panchang, which the owner accepts as the calculation reference (every calendar test in
  this repo is held to it). Record each source's URL and the date you read it.
- **Licences.** GRETIL e-texts are CC BY-NC-SA 4.0 and this app is paid: don't quote verse text from
  GRETIL in the app. Use GRETIL to read and to find references; take the shown text from the app's own
  `shlokas` rows, from sa.wikisource (CC BY-SA; credit it and add a row in `backend/app/seeds/licences.py`)
  or from a public-domain printed edition. sanskritdocuments.org forbids commercial use: never take text
  from it. Drik Panchang's text and images are copyrighted: read it for dates and times only, never copy
  its words, lists of steps or pictures.
- **Privacy.** The place the phone sends with a date query is used for that answer and not stored, as the
  privacy policy already says (`routers/legal.py`, "Your place, for location-aware features"). Don't
  write it to the database, don't log it, don't put it in an error report. Round it to 0.1 degree on the
  phone before sending. Reminders are scheduled on the phone; the server learns nothing about them.
- **Stack.** Expo SDK 57, React Native 0.86.3. Read the versioned docs before using any Expo API:
  https://docs.expo.dev/versions/v57.0.0/ (`mobile/AGENTS.md` says so).
- **Checks before every hand-back:**
  - `cd backend && PYTHONUTF8=1 ./.venv/Scripts/python.exe -m pytest -q`
  - `cd mobile && npx tsc --noEmit`
  - `cd mobile && node scripts/check-contrast.mjs`, `node scripts/check-kala.mjs`,
    `node scripts/a11y-audit.js`, and the new `node scripts/check-parva.mjs` (10.11).
  - Starting the real backend rewrites `backend/app.db`. Back it up and restore it by checksum, or test
    through `TestClient` with a temp `DB_PATH` the way `backend/tests/conftest.py` does.
  - Long heredocs fail in Git Bash: write scripts to a file and run the file. Python on Windows writes
    CRLF in text mode; open repo files with `newline=""`.

---

## 1. What the owner decided

On 2026-10-09 the owner asked for one place that says what today is and what is coming, why it is kept,
the occasion behind it, what to do, how to keep the vrat (what to eat and not), the puja vidhi, aartis,
muhurat times, Navarātri day by day with a picture of that day's form of the Devī, Pitṛ Pakṣa (what to do
and not), sūtak, amāvasyā, pūrṇimā "and many other things. All in a very good way." On 2026-10-10 they
answered five questions:

| # | Question | Decision |
|---|---|---|
| 1 | New app or this one? | "Same app for now." |
| 2 | Deity paintings generated or commissioned? | "Generated." |
| 3 | Sūtak and śrāddha: as the texts say (with varṇa), as families practise, or both? | "Both and label." |
| 4 | Languages? | "Both english and hindi, will later expand to other major languages." |
| 5 | Which Ekādaśī tradition? | "Mostly the ancient and trusted ones." The owner does not trust ISKCON's calendar. |

How to read decision 5: the default is the Smārta rule, as the dharmaśāstra digests set it (the
Nirṇayasindhu and the Dharmasindhu; section 6.2 says what to read). Don't use ISKCON's or any
organisation's published calendar as a source or a test. Don't show a second "Vaiṣṇava" date in this
work (section 12).

**Not decided yet.** Build the default, as a setting where one is named, and list these again in your
hand-back:

| Question | Default you build | Setting |
|---|---|---|
| Name of the feature on screen | "Festivals" / "त्योहार और व्रत" as the title; "Parva" only in code | strings |
| Pages served before the owner reads them | only `approved` pages; drafts that pass every automatic check are `auto_ok` and not served | `parva_serve_statuses` (default `["approved"]`) |
| Festival artwork | owner-authorized generated deity images may be bundled and displayed directly; remote uploads retain their asset statuses | `parva_art_serve_statuses` governs remote uploads only |
| Menstruation rules for puja and vrat | not mentioned on any page | content rule 11.6 |
| Reminder times | 19:00 the evening before; and at the start of a pāraṇa window | code constants |
| How far ahead the calendar is fetched | 60 days | `PARVA_DAYS_AHEAD` (phone) |
| Hindi for the rest of the app | not in this work (section 12) | none |

---

## 2. What exists today

### 2.1 The server's calendar (`backend/app/services/panchang.py`, *read* 2026-10-09, *run* 2026-10-09)

- Pure functions over `astronomy-engine` 2.1.19 (MIT): `sunrise`, `sunset`, `moonrise`, `tithi_at`,
  `nakshatra_at`, `yoga_at`, `karana_at`, `month_of` (amanta and purnimanta names), `day()` (one date as
  plain words, used by Ask), `samvat`, `brahma_muhurta`, `next_ekadashi/amavasya/purnima`,
  `months_of_year`.
- **Festival rules.** `_FESTIVALS` holds 24 rows: name, aliases, amanta month, paksha, tithi, and the
  part of the day in which the tithi must be current (`sunrise`, `forenoon`, `midday`, `afternoon`,
  `pradosh`, `midnight`, `moonrise`). `festival(name, year, place)` returns a date or a (start, end)
  range. **Policy, keep it:** a rule ships only when it reproduces Drik Panchang's dates for two years;
  never hardcode a date to pass a test. `SHIPPED_FESTIVALS` has 16. Refused today: Makara Sankranti,
  Ugadi, Holika Dahan, Holi, Raksha Bandhan, Krishna Janmashtami, Govardhan Puja, Maha Navami.
- Tests: `tests/test_panchang.py` (Drik's festival dates for New Delhi, 2026 and 2027, read 2026-10-01)
  and `tests/test_ask_kinds.py` (Drik day pages, Amāvasyā and Pūrṇimā year lists, Navarātri pages, read
  2026-10-05).
- Only New Delhi has ever been checked.
- **Three known bugs, listed in `DECISIONS.md` (Kāla entry, "Three things the port does not copy"):**
  1. `_next_crossing` falls back to `span / 13` degrees a day whenever the value wraps past 360 inside its
     two-day window. The phone's port does not have this bug. *Run* 2026-10-09: on 11 October 2026 the
     server ends Vaidhṛti yoga at 22:01 IST, the phone at 21:04, Drik Panchang at 21:05; the server's own
     longitudes sum to 0.005 degrees at Drik's minute, so the astronomy is right and the search is wrong.
     Vaidhṛti (the 27th yoga) always takes this path. Nakshatra ends near the Revatī/Aśvinī wrap were 16
     and 17 minutes late on 27 and 28 September 2026. DECISIONS.md measured up to 120 (nakshatra) and 200
     (yoga) minutes over 185 instants.
  2. `month_of` names the dark half of an added month after the next month (7 June 2026 "Adhika Ashadha"
     for what is still Adhika Jyeshtha).
  3. `samvat()` turns the year on a fixed 22 March.
- Ask (`services/ask_facts.py`) uses `day()` and `festival()` and sends the model the yoga's name only,
  and "nakshatra until about HH:MM" (*read* 2026-10-09).
- The Python package has `SearchLunarEclipse`, `SearchLocalSolarEclipse`, `SearchGlobalSolarEclipse`
  and their `Next*` partners (*run* 2026-10-10).

### 2.2 The phone's calendar (*read* 2026-10-09)

- `mobile/src/kala/engine.ts` is a port of `panchang.py` (same library, `astronomy-engine` in
  `package.json`), held to the server by `scripts/check-kala.mjs`. It computes the day's windows: Brahma
  muhūrta, Abhijit (the eighth of fifteen parts of daylight), Rāhu kāla, Yamaganda, Gulika.
- `kala/prefs.ts`: `getKalaPrefs()`, `subscribeKalaPrefs()`, tradition (`north`, `deccan`, `gujarat`,
  `tamil`, `kerala`, `bengal`) and script. `kala/useToday.ts`: `resolvePlace()` and the place the learner
  chose. `services/place.ts` and `components/PlaceChooser.tsx`: the city picker (GeoNames search through
  `GET /places/search`, 90 bundled cities offline).
- The phone has **no festival rules**. It shows Ekādaśī only as "the eleventh tithi begins".
- Home (`screens/Home.tsx`): a "Daily" section with `<TithiCard />` first. Tapping the card opens Kāla.
- Six bottom tabs (`navigation/MainTabs.tsx`): Home, Path, Talk, Play, Grammar, Read. Root stack routes
  are in `mobile/App.tsx`, their types in `navigation/types.ts`.

### 2.3 What Drik Panchang shows for this season (New Delhi, *read* 2026-10-09)

Use these as test fixtures; they show why "day N of Navarātri" is not a date.

- **Sharad Navarātri 2026** (`/navratri/ashwin-shardiya-navratri-dates.html?year=2026`): 11 Oct
  Pratipadā, ghaṭasthāpana, Śailaputrī; 12 Dvitīyā, Brahmacāriṇī; 13 Tṛtīyā, Candraghaṇṭā; 14
  Caturthī, Kūṣmāṇḍā; 15 Pañcamī, Skandamātā; 16 Ṣaṣṭhī, Kātyāyanī; 17 Saptamī, Kālarātri; **18 Saptamī
  again, no new form**; **19 Aṣṭamī: Durgā Aṣṭamī, Mahāgaurī, Sandhi Pūjā 10:27 to 11:15, and Mahā
  Navamī**; 20 Navamī: Āyudha Pūjā, Navamī homa, Navarātri pāraṇa, Durgā visarjan, Vijayadaśamī. The
  server's sunrise tithis agree: Saptamī at sunrise on both 17 and 18 Oct (*run*).
- **Ghaṭasthāpana, 11 Oct 2026** (`/navratri/shardiya-navratri-ghatasthapana.html?year=2026`):
  muhurat 06:19 to 10:12; Abhijit 11:44 to 12:31; both marked as falling in "prohibited" Citrā nakṣatra
  and Vaidhṛti yoga. 06:19 to 10:12 is the first third of daylight with the engine's sunrise 06:19 and
  sunset 17:56, and 11:44 to 12:31 is the engine's Abhijit (*run*, arithmetic on the engine's times).
- **Sandhi Pūjā** 10:27 to 11:15 is 24 minutes either side of the end of Aṣṭamī; the server ends Aṣṭamī
  at 10:52 on 19 Oct (*run*).
- Drik says the colour of each Navarātri day follows the weekday and is worn "especially in Maharashtra
  and Gujarat". Treat it as a custom (4.3).
- Pitṛ Pakṣa 2026: 27 Sep to 10 Oct (`tests/test_panchang.py`). Drik's per-tithi śrāddha page is
  `/shraddha/pitru-paksha-shraddha-dates.html` (in its menu; contents *not read*).
- Drik's Ekādaśī list is `/vrats/ekadashidates.html` (in its menu; contents *not read*). Ignore its
  ISKCON list (decision 5).
- The URL `/navratri/ghatasthapana-date-time.html` is a 404.
- Next dates already matched to Drik (`tests/test_panchang.py`): Karwa Chauth 29 Oct, Diwali 8 Nov,
  Govardhan 10 Nov (refused by the engine today), Bhai Dooj 11 Nov, Chhath 15 Nov, Kārtika Pūrṇimā 24 Nov
  2026; Chaitra Navarātri 7 to 15 Apr 2027 (`tests/test_ask_kinds.py`).

### 2.4 Texts the backend already reads (*read* 2026-10-09)

`services/ask_sources.py` `LIBRARY` maps 44 GRETIL plaintext files, among them the Mārkaṇḍeya Purāṇa
chapters 1 to 93 (so the Devī Māhātmya), the Garuḍa Purāṇa, the Viṣṇu, Agni, Śiva (books 1 and 7) and
Bhāgavata Purāṇas, the Devī Gītā and Manusmṛti. There is **no Padma Purāṇa** (the usual home of the
Ekādaśī stories), **no Nirṇayasindhu** and **no Dharmasindhu**. `Manusmṛti` 5.83 (GRETIL numbering, "=
M 5.82"): a brahmin is pure after ten days, a king after twelve, a vaiśya after fifteen, a śūdra after a
month (*read* on GRETIL 2026-10-09).

### 2.5 Content pipeline you can reuse (*read* 2026-10-10)

- `services/vertex_batch.py`: Gemini through Vertex AI batch jobs with the owner's service account
  (`vertex_credentials.json`, repo root, ignored by git). The owner's rule: Gemini only through Vertex
  batch for stored content; no Google Search grounding (its terms forbid storing grounded results).
- `services/daily_content.py` and the `content_jobs` table: a staged pipeline (propose, cite, check,
  store) moved one bounded step per `POST /admin/content/tick`. Copy its shape; don't change it.
- `FactCard` (`models.py`) shows how a stored card carries `claim_kind` (`text|tradition|modern`),
  `text_name`, `ref`, `source_url` and `status`.
- `services/storage.py`: `R2Storage` (Cloudflare R2) for owned assets. Chant audio already lives there.
- Alembic head is `b9c0d1e2f3a4` (*run* 2026-10-10). Your migration's `down_revision` is that, unless the
  head has moved when you start: run `alembic heads` first.

### 2.6 Paintings (*read* 2026-10-10)

`specs/path-art/README.md`: the Path card paintings were generated on 2026-10-09 in the Read covers'
watercolour and gouache style, exported as WebP (600 px cards, 1200 px wide hero, quality 86), with the
full prompts kept in that README. Keep the record-keeping; deity images use watercolor and gouache,
while Learn and Play may use other suitable styles (owner update, 2026-10-14).

### 2.7 Notifications (*read* 2026-10-09 and 2026-10-10)

- `expo-notifications` ~57.0.17 is in `package.json` but not in `app.json` plugins. Whether the native
  module is inside the build on phones is *not verified*.
- No code in `mobile/src` asks for notification permission. `services/push.ts` loads the module with a
  `require` inside `try`. The server's notify job runs with `transport=None` (a dry run) and there is no
  `google-services.json`, so server push cannot reach a phone.
- Expo SDK 57 docs (*read* 2026-10-09): a local notification can be scheduled for a date
  (`DateTriggerInput`) and needs no FCM. On Android 13 the user opts in through a system prompt that only
  appears after a notification channel exists. Exact-minute alarms need `SCHEDULE_EXACT_ALARM` in the
  manifest, which needs a new build. This work schedules inexact reminders only.

### 2.8 Other things to know

- `app.json`: version 1.3.0, `runtimeVersion` policy `appVersion`. Anything native (a new plugin, a
  permission) needs a new build and a new app version; JS goes out by OTA.
- `expo-keep-awake` comes with `expo` (in `node_modules/expo/package.json`); `expo-sharing` and
  `react-native-view-shot` are dependencies; there is no `expo-image` (use React Native `Image`).
- The app has no translation layer. All UI text is English literals in the components (a rough grep found
  about 680 distinct literals in `mobile/src`, *run* 2026-10-10; the true count is higher). Fonts for ten
  Indian scripts are already bundled (`services/scriptFonts.ts`).

---

## 3. The whole thing in one picture

```
 panchang.py (fixed)          observance rules (new, parva_rules.py)
        │                               │
        └──────────► GET /parva/calendar?from&days&lat&lon&tz&tradition&lang
                                        │   occurrences: slug, dates, times, labels
 parva_pages (DB) ◄── import ◄── drafts (Vertex batch) ◄── passages from texts
        │                               │
        └──────────► GET /parva/page/{slug}?lang&year&lat&lon&tz
                                        │
 Phone: Home strip ─► Observance page ─► do-it-now mode / share / Ask
        cached 60 days ─► local reminders (expo-notifications, on the phone)
```

---

## 4. Shared definitions

### 4.1 Observance and occurrence

- An **observance** is a kind of day: `ekadashi`, `purnima`, `amavasya`, `sankranti`, `pradosh`,
  `sankashti`, `masik_shivaratri`, a named festival (`diwali`), a **series** (`sharad_navaratri`,
  `chaitra_navaratri`, `pitru_paksha`, `diwali_days`) or a **period** (`grahan_sutak`, `panchaka`,
  `bhadra`, `kharmas`, `holashtak`, `adhika_masa`). Each has a stable ASCII `slug`.
- An **occurrence** is one observance on real dates for one place: `slug`, `variant` (for named
  sub-kinds, e.g. the Ekādaśī's name), `date` (local), `end_date` for ranges, `times` (named instants and
  windows), and for series the `day` entries.
- **A series day follows the tithi, never a count of dates.** Navarātri's forms are attached to tithis.
  A tithi that holds two sunrises gives two dates with the same form (18 Oct 2026 shows "Saptamī,
  second day"); a tithi with no sunrise is folded into the date Drik gives for it.

### 4.2 Tradition

Use the learner's Kāla tradition (`getKalaPrefs().tradition`) for month names (amanta or purnimanta) and
for regional notes. Date rules are the Smārta rules for every tradition in this work (decision 5).

### 4.3 Source labels

Every item on a page (a step, a rule, a food, a time, a story step) carries one `basis`:

| basis | Means | Shown as (en / hi) |
|---|---|---|
| `text` | stated in a text; carries `text_name`, `ref` (chapter.verse) and `source_url` | "Text: Devī Māhātmya 2.9" / "ग्रन्थ: देवीमाहात्म्य 2.9" |
| `calc` | worked out by the app for the learner's place | "For Pune" / "पुणे के लिए" |
| `custom` | what families do; carries `region` (or `all`) and a `source_url` you opened | "Custom, Bengal" / "परम्परा, बंगाल" |

Labels are one short line in `inkSoft` under the item, not a badge. A `text` item without a reference
that you opened is not a `text` item: drop it or make it `custom` with its source. A `custom` item
without any source is dropped. These label words are placeholders: put them in the strings file and list
them in the hand-back for the owner.

### 4.4 Language

`lang` is `en` or `hi`. Every page exists in both or is not served. Sanskrit lines are the same in both
(Devanagari, with roman below in `en` and only Devanagari in `hi`). Build everything so that a third
language is a new strings file and a new `lang` value, with no code change (section 12 has the cost of
the rest of the app).

---

## 5. Backend, part A: fix the engine first

### 5.1 `_next_crossing`

Replace the fallback. Unwrap the value (`(value(hi) - lo_v) % period`) so a wrap is a normal crossing,
then bisect. Keep the function's contract. Remove `return lo + timedelta(days=span / 13.0)`.

Tests (`tests/test_panchang_crossings.py`, new):
- 11 Oct 2026, New Delhi: Vaidhṛti ends 21:05 ±2 min; on 10 Oct Indra ends 22:02 ±2 min (Drik).
- 27 and 28 Sep 2026: Uttara Bhādrapadā ends 11:07 ±2, Revatī ends 10:16 ±2 (the phone's engine; read
  Drik's day pages for these two dates and hold to Drik if it differs by more than two minutes; say which).
- A sweep: every nakshatra and yoga end the server reports over 2026 agrees with the phone engine within
  one minute. Extend `backend/scripts/gen_kala_fixtures.py` only if the owner's Kāla session has not;
  otherwise generate a separate fixture.

### 5.2 `month_of` in an added month

The dark half of an adhika month keeps the adhika month's name in both conventions. Test: 7 June 2026 is
in Adhika Jyeṣṭha (Drik's day page; read it and record the date read). Festivals never fall in an adhika
month (`_dates_for_tithi` already skips them); keep that.

### 5.3 `samvat()`

Turn the Vikrama year at Chaitra Śukla Pratipadā computed from the lunations, not at 22 March. Test it
against Drik for 2026 and 2027.

Run the whole suite after each fix. Ask's answers change only in times.

---

## 6. Backend, part B: the rules (`services/parva_rules.py`, new)

### 6.1 Shape

- One module, pure functions, no database, built on `panchang.py`. Move nothing out of `panchang.py`;
  import from it. `festival()` and `_FESTIVALS` stay where they are for Ask.
- `occurrences(start: date, days: int, place: dict, tradition: str) -> list[Occurrence]`, sorted, one
  entry per occurrence. `Occurrence` is a dataclass serialised as in 7.3.
- Every rule has a `RULE_SOURCES` entry: the text and place it was read (6.2), and the Drik pages it is
  held to. A rule with no source and no passing Drik test is not in `SHIPPED_RULES` and produces nothing.
- **Hold each rule to Drik Panchang for 2026, 2027 and 2028**, for **New Delhi, Mumbai and Chennai**
  (Drik's city setting; record how you set it). Times within ±2 minutes. Keep what you read in
  `tests/fixtures/drik_parva/*.json` with the URL and date read for each row, as
  `tests/fixtures/drik_milan/pairs.json` does. A rule that fails any of the nine city-years is not
  shipped; say which and by how much in the hand-back. Never hardcode a date.

### 6.2 What to read for the rules

- The Smārta date rules are in the dharmaśāstra digests: Kamalākara Bhaṭṭa's **Nirṇayasindhu** and
  Kāśīnātha Upādhyāya's **Dharmasindhu**. Neither is on GRETIL. Look for public-domain printed editions on
  archive.org (`advancedsearch.php?q=...&fl[]=identifier&output=json`, then `/metadata/<id>` and
  `/download/<id>/<name>_djvu.txt` for the OCR text). Open the section for each rule you implement
  (Ekādaśī and its pāraṇa, Navarātri and ghaṭasthāpana, śrāddha and the Mahālaya fortnight, grahaṇa
  sūtaka, āśauca) and record edition, page and URL in `RULE_SOURCES`.
- If you cannot find a rule in either book, the rule may still ship on the Drik tests alone, marked
  `source: "Drik Panchang only"`; list every such rule in the hand-back.
- Customs (food lists, colours, prasāda) are not rules; they belong to pages (section 8), labelled
  `custom`.

### 6.3 The rules, in phase order

**Phase 1**
- **Ekādaśī.** The fasting day by the Smārta rule; its name from the amanta month and paksha (26 names
  including the two of an added month; take the names from Drik's Ekādaśī list in English and Hindi by
  hash, and their source text from 8.2); the **pāraṇa window** on the next day as Drik prints it, with
  the rule found in 6.2 (the Hari Vāsara is the usual reason a window starts late; confirm at the source).
  Some years Drik gives two days for Smārtas; hold to what it prints and show both if it does.
- **Pūrṇimā and Amāvasyā**, each month, with the names Drik gives (for example Sharad Pūrṇimā, Kārtika
  Pūrṇimā, Mauni Amāvasyā, Sarvapitṛ or Mahālaya Amāvasyā) and the weekday names (an Amāvasyā on Monday
  or Saturday). A pūrṇimā vrat day and a pūrṇimā date can differ: show the vrat day as Drik does.
- **The Diwali run:** Dhanteras, Naraka Caturdaśī, Lakṣmī Pūjā (Diwali, with Drik's pradoṣa muhurat),
  Govardhan Pūjā (fix the refused rule), Bhai Dooj; plus Karwa Chauth (moonrise time) and Chhath (sunset
  and sunrise arghya days).
- **Saṅkrānti** each month, and Makara Saṅkrānti (fix the refused 2027 date; the phone engine's note says
  Drik's sankranti moments run about ten minutes later because of a 25 arcsecond ayanamsa difference:
  find the rule Drik uses for the civil date and hold to it).

**Phase 2**
- Pradoṣa (Trayodaśī in the pradoṣa window, with the weekday names), Saṅkaṣṭī Caturthī (with moonrise),
  Vināyaka Caturthī, Māsik Śivarātri, Māsik Durgāṣṭamī.
- The other refused festivals: Holikā Dahan (Bhadrā matters: see the period rule), Holi, Rakṣā Bandhan
  (Bhadrā), Janmāṣṭamī (Smārta date only), Ugādi, Mahā Navamī. Plus Mahāśivarātri's niśītha time, Rāma
  Navamī's madhyāhna time, Gaṇeśa Caturthī's madhyāhna time.

**Phase 3: series**
- **Navarātri, both.** Day entries per 4.1 with the form attached to the tithi; ghaṭasthāpana muhurat
  (first third of daylight on Pratipadā) and the Abhijit alternative, with the Citrā and Vaidhṛti notes
  when they apply (2.3); Sandhi Pūjā; Mahā Aṣṭamī and Mahā Navamī as Drik dates them; pāraṇa; Vijayadaśamī.
  Hold to Drik's Navarātri pages for 2026 to 2028, both Navarātris.
- **Pitṛ Pakṣa.** The fortnight's range, and the date of each tithi's śrāddha by the afternoon
  (aparāhṇa) rule as Drik's śrāddha page prints it, including the special days that page names. Plus
  `shraddha_date(tithi, paksha, month, year, place)` for "find my śrāddha date" (10.7).

**Phase 4: periods**
- **Grahaṇa and sūtaka.** Eclipses from `SearchLunarEclipse` and `SearchLocalSolarEclipse` for the place.
  An eclipse not visible at the place gets no sūtaka (confirm this rule at 6.2's source and on Drik's
  eclipse pages). Sūtaka start as the source and Drik give it. Hold to Drik's eclipse pages for every
  eclipse 2026 to 2028 for the three cities.
- **Pañcaka** (the Moon in the last five nakshatras, with Drik's start and end), **Bhadrā** (Viṣṭi
  karaṇa), **Kharmās** (the Sun in Dhanu and in Mīna), **Holāṣṭaka**, **Adhika māsa**, **Cāturmāsa**.

---

## 7. Backend, part C: tables and endpoints

### 7.1 Migration (`parva_pages`, `parva_art`)

`parva_pages`:

| column | type | note |
|---|---|---|
| `id` | String(32) pk | |
| `slug` | String(64), index | observance slug |
| `variant` | String(64), default "" | e.g. the Ekādaśī name; "" for the observance as a whole |
| `lang` | String(5) | `en` or `hi` |
| `version` | Integer | starts at 1; a new import adds a version |
| `body` | JSON | section 8.3 |
| `sources` | JSON | list of {text_name, ref, url, read_on} |
| `status` | String(12), index | `draft`, `auto_ok`, `approved`, `withdrawn` |
| `checked_on` | String(10) | date the automatic checks passed |
| `approved_on` | String(10) | set by the owner's import (14) |
| `created_at` | DateTime | |

Unique (`slug`, `variant`, `lang`, `version`). Withdrawn rows are kept, never deleted.

`parva_art`: `key` (pk, e.g. `navadurga_shailaputri`), `url`, `width`, `height`, `prompt` (Text),
`checklist` (JSON, 9.2), `status` (`draft`, `approved`, `withdrawn`), `created_at`.

### 7.2 Settings (`app/config.py`)

`parva_serve_statuses` (`["approved"]`), `parva_art_serve_statuses` (`["approved"]`),
`parva_max_days` (120).

### 7.3 `GET /parva/calendar` (new `routers/parva.py`)

Query: `start` (YYYY-MM-DD, default today at the place), `days` (1 to `parva_max_days`, default 60),
`lat`, `lon` (required, rounded by the phone), `tz` (IANA), `tradition`, `lang`.

Response:
```json
{
  "place_label": "Pune",
  "occurrences": [
    {
      "slug": "ekadashi", "variant": "papankusha",
      "title": "Papankusha Ekadashi", "title_local": "पापांकुशा एकादशी",
      "date": "2026-10-22", "end_date": null,
      "times": [
        {"key": "tithi", "start": "2026-10-21T14:12:00+05:30", "end": "2026-10-22T14:49:00+05:30"},
        {"key": "parana", "start": "...", "end": "..."}
      ],
      "day": null,
      "has_page": true, "art_url": "https://...webp"
    }
  ]
}
```
(The example shows the shape only; its name and times are not checked.) Series occurrences carry `day`
entries `{date, tithi_key, label, form_key}`. `has_page` is true only when a page in `lang` has a served
status. Titles: English from the rule table; `title_local` from Drik's Hindi names by hash (section 0, "Never write Sanskrit from memory").

No auth needed beyond what other read endpoints use; don't record the call with the place. Compute per
request; an in-process LRU keyed by (rounded place, start, days, tradition, lang) is fine. Never persist
it.

### 7.4 `GET /parva/page/{slug}`

Query: `variant`, `lang`, and optionally the place and `year` for the "times" section. Returns the
latest served version's `body`, `sources`, the art URL if served, and the calculated times for the next
occurrence. 404 when nothing is served.

### 7.5 `GET /parva/shraddha-date` (Phase 3)

Query: `tithi` (1 to 30), `year`, place. Returns the date in that year's Pitṛ Pakṣa. Nothing stored.

### 7.6 Tests (`tests/test_parva.py`)

Rule fixtures (6.1), the endpoints through `TestClient` with a temp DB, `has_page` logic, status
filtering, `lang` fallback (none: a page missing in `hi` is not served in `hi`), 404s, and a test that
the place never reaches the database or the log (capture logs, assert the rounded coordinates are absent).

---

## 8. Content: writing the pages

### 8.1 Pages in Phase 1

`ekadashi` (one page for the observance, plus one short `variant` page per name with its story),
`purnima`, `amavasya` (with variants for the named ones), `sankranti`, `diwali_days` (Dhanteras, Naraka
Caturdaśī, Lakṣmī Pūjā, Govardhan, Bhai Dooj as variants), `karwa_chauth`, `chhath`, `kartika_purnima`.
Later phases: one page per rule they add; Navarātri gets a series page and nine form variants; Pitṛ Pakṣa
a series page with the special days; `grahan_sutak` and `ashaucha` (sūtak after a birth or a death) as
period pages.

### 8.2 Sources to open

- **Navarātri, Durgā:** the Devī Māhātmya (Mārkaṇḍeya Purāṇa, in `LIBRARY`). The nine forms' names and
  their dhyāna verses: find the text that gives them (the "prathamaṃ śailaputrī" list is commonly said to
  come from the Devī Kavaca; that is *not verified*). Record the edition. If a form's dhyāna verse cannot
  be sourced, its page shows no verse.
- **Ekādaśī stories:** the Padma Purāṇa (Uttarakhaṇḍa) as commonly cited, or the Bhaviṣyottara Purāṇa
  (*not verified*). Neither is in `LIBRARY`. Find a public-domain printed edition (archive.org) or
  sa.wikisource; add to `LIBRARY` only through the existing `ask_sources.py` pattern if the owner agrees
  (ask in the hand-back; don't change Ask now).
- **Śrāddha, Pitṛ Pakṣa:** the Garuḍa Purāṇa and the Viṣṇu Purāṇa (in `LIBRARY`), Manusmṛti chapter 3,
  and the digests of 6.2.
- **Sūtak (āśauca):** Manusmṛti 5.57 onward (5.83 is in 2.4), Yājñavalkya Smṛti's āśauca section, and
  the digests. Decision 3: show the text's rule as a `text` item, including the varṇa grading where the
  text has it, quoted as what the text says, and family practice as `custom` items with their region and
  source. Never phrase either as the app's own instruction about anyone's caste.
- **Aartis:** Hindi aartis are not Sanskrit. Many are old enough to be out of copyright, but a printed
  edition can still be in copyright. Take the words only from a public-domain printed edition you
  opened (archive.org), record it, and add a licence row. No aarti audio in this work (recordings are
  copyrighted; section 12).
- **Sanskrit mantras and stotras:** from `shlokas` rows when the app has the verse; otherwise
  sa.wikisource with a licence row. The Vedic tarpaṇa and śrāddha mantras: show them only with a source
  you opened.
- **Customs:** each food list, colour, prasāda and regional note needs a source you opened (a printed
  book on vrats, a regional almanac, a published study). Drik Panchang may be read to learn what is
  commonly listed, never copied, and is not by itself a source for a custom.

### 8.3 Page body (JSON, same shape in every language)

```
{
  "summary": "one line: what this day is",
  "why": [ {"step": "...", "basis": "text", "text_name": "...", "ref": "...", "source_url": "..."} ],
  "do": { "gather": [items], "steps": [items] },
  "vrat": { "eat": [items], "avoid": [items], "break": [items], "who_should_eat": [items] },
  "dont": [items],
  "texts": [ {"kind": "mantra|stotra|aarti", "title": "...", "shloka_id": "...",
              "devanagari": "...", "iast": "...", "meaning": "...", "source_url": "...", "licence": "..."} ],
  "regions": [ {"region": "bengal", "items": [items]} ],
  "series_days": [ {"tithi_key": "...", "form_key": "...", "summary": "...", "steps": [items]} ]
}
```
Each `item` is `{text, basis, ...source fields}` as in 4.3. Limits: `summary` 120 characters; a step 160;
`why` 4 to 8 steps; `steps` at most 12; lists at most 10.

`who_should_eat`: every vrat page lists who should not fast or should take only fruit (people who are
pregnant, diabetic, on regular medicines, ill, children, the elderly). Look for the texts' own
exemptions and label them `text`; the rest is a `custom` item sourced as in 8.2. It is content, not a
disclaimer; keep the existing doctor's-treatment rule: never tell anyone to stop or replace medicine.

### 8.4 Drafting (`services/parva_content.py`, `backend/scripts/parva_drafts.py`)

- A script builds Vertex batch requests: one per (slug, variant, lang), carrying the passages code
  extracted from the sources (8.2), the observance's facts (names, rule, times are not included: times
  are calculated live), the JSON schema of 8.3, and the rules: one-sentence steps, no dashes, no
  paragraphs, every `text` item cites a passage given in the request, nothing about a source not given,
  Hindi written as plain modern Hindi (not Sanskritised beyond the terms themselves).
- Sanskrit in the output is ignored: code fills `texts[].devanagari` and `iast` from the source rows.
- Same pipeline shape as `daily_content.py` (`content_jobs`, `kind="parva"`), or a standalone script the
  owner runs; your choice, say which. Run a dry run of at most 5 requests and report the cost per page.
- **Automatic checks** before a draft becomes `auto_ok`: valid schema; limits; no em or spaced en dash;
  every `text` item's `ref` is in the request's passages and its quote (if any) appears in the passage;
  every `custom` item has a `source_url`; the `en` and `hi` versions have the same item count per
  section; no forbidden phrases (section 11). Failures are written to the job's `stats` with reasons.
- Drafts are written to `backend/app/seeds/parva/<slug>[.<variant>].<lang>.json` so the owner can read
  them in the repo; `backend/scripts/parva_import.py` loads files into `parva_pages` with their status.
  The owner approves by changing `"status"` to `"approved"` in the file and importing (14).

---

## 9. Paintings

### 9.1 What to paint

Phase 1: one painting per Phase 1 page (Lakṣmī for Diwali, Viṣṇu for Ekādaśī, the full and new moon
over water for Pūrṇimā and Amāvasyā, Chhath's sunset arghya, the Karwa Chauth moon). Phase 3: the nine
forms of the Devī, Durgā for the Navarātri series, and a river scene for Pitṛ Pakṣa.
Include the appropriate gods on deity-associated festival pages. Decorative imagery is allowed on
other observance pages when useful. Owner update, 2026-10-14: deity images are explicitly requested.

### 9.2 Iconography checklist

For each deity painting, check recognizable traditional iconography: number of arms, held objects,
mount, complexion and head attributes. Record the intended depiction and generation prompt.
A sourced dhyāna verse is useful context when available, but is not a prerequisite for generating,
saving or displaying deity artwork. Do not present generated art as a verified textual quotation.

### 9.3 Making them

- Style: deity images use watercolor and gouache (owner refinement, 2026-10-14).
  Learn and Play may use other appropriate styles. Keep festival art warm,
  calm, devotional, natural anatomy, no text in the image, no frame, no watermark, faces dignified.
  Never sexualised, never gory (Kālarātri is fierce but drawn with reverence; follow the verse, not a
  horror look).
- Keep one prompt per image in `specs/generated-art/manifest.json` and preserve full-resolution masters
  in the workspace. Generate with the built-in ImageGen tool; the owner has authorized this work.
- `backend/scripts/parva_art_import.py`: takes the owner's chosen file per key, converts to WebP (1200 px
  wide hero, quality 86), uploads through `get_storage()` to `parva-art/<key>.webp`, writes the
  `parva_art` row as `draft`.

---

## 10. Phone

### 10.1 Strings and language (`mobile/src/i18n/`, new)

- `strings.en.ts`, `strings.hi.ts`, `t(key, params)`, and `useLang()` reading a new pref
  `appLanguage` (`"en" | "hi"`, default `"en"`; stored like the other prefs in `services/prefs.ts`).
- Only the new festival screens and the Home strip use `t()` in this work. Design it for the whole app:
  flat keys, no string built by concatenation (use params), plural-safe, and a test that every key in
  `en` exists in `hi`.
- Settings gets one row: "App language: English / हिन्दी" with a note line "Festivals for now" kept short.
  Hindi strings are written by you, then listed in the hand-back for a native speaker to read.

### 10.2 Data (`mobile/src/parva/`, new)

- `api.ts`: `parvaCalendar()`, `parvaPage()`, `shraddhaDate()` in `api/client.ts` style. A 404 or network
  error returns null.
- `cache.ts`: the last calendar response per (rounded place, tradition, lang) in AsyncStorage with its
  fetch date; refetch daily or when the place, tradition or language changes. The Home strip renders
  from cache first, so it works offline.
- Place: `resolvePlace()` from `kala/useToday.ts`, rounded to 0.1 degree before sending.

### 10.3 Home strip (`components/parva/ParvaStrip.tsx`)

Directly under `<TithiCard />` in Home's Daily section:
- If something is kept today: one row, painting thumbnail (or none), title, one-line summary, the key
  time ("Pāraṇa 06:26 to 08:41" style, from `times`), opening the page.
- "Coming up": the next three occurrences with "Tomorrow" / "In 3 days" / the date; "All" opens the list.
- Hidden entirely if the calendar is null. No skeleton flash after the first load.

### 10.4 List (`screens/Parva.tsx`, route `Parva`)

By month, the next 60 days then "Load more" up to 120. Filters: All, Vrats, Festivals. One link into it
from the Kāla hub: a single row in `screens/Kala.tsx` above the six chapters; change nothing else there.

### 10.5 Page (`screens/ParvaPage.tsx`, route `ParvaPage`, params `{slug, variant?, date?}`)

Order, with sections hidden when empty:
1. Painting (if served) with the title over a deep fill band, the date ("Today", "Tomorrow", "Sun 11
   Oct"), the summary.
2. Times for the place: the tithi span; the day's key times from `times`; then the phone's own Rāhu
   kāla and Abhijit for that date from `kala/engine.ts` (import only). Each time labelled `calc`.
3. Why (story steps), each with its label.
4. What to do: "Gather" list, then numbered steps. A button "Start" opens the do-it-now mode (10.6).
5. Vrat: eat, avoid, how to break, who should eat.
6. Texts: Devanagari (18pt or more), roman in `en`, meaning; a play button only when the verse has chant
   audio in the app (`shlokas` audio, from the Recite work).
7. Don't.
8. Regions: the learner's tradition's region first.
9. "Ask about this day": opens Talk in Ask mode with a prefilled question in the page's language.
10. Share (10.8).

Series pages (Navarātri, Pitṛ Pakṣa, Diwali days) open on today's day, with the days as a horizontal
row of dates; each day shows its form or rite, painting and steps.

### 10.6 Do-it-now mode

Full screen, one step at a time, large type (the learner's text size plus two steps), next and back,
the screen kept awake (`expo-keep-awake`, `activateKeepAwakeAsync` on open, deactivate on close; read
the SDK 57 page first). No timers, no sound.

### 10.7 Find my śrāddha date (Pitṛ Pakṣa page, Phase 3)

Pick the tithi of passing (both halves, Pratipadā to Amāvasyā, names from `sanskritNames.ts` through
the existing helpers) and get this year's date at the place. Nothing about the person is asked or kept.
The tone of the whole page is gentle; see 11.

### 10.8 Share

A share card rendered with `react-native-view-shot` (title, date, painting, one line) and shared with
`expo-sharing`; the text fallback uses React Native `Share`. No link to Drik or any other almanac.

### 10.9 Reminders (`parva/reminders.ts`)

- A bell on each page and a Settings row "Festival reminders". Turning either on asks for permission
  then (never on launch). On Android create the channel first so the system prompt can appear (2.7).
- Feature-detect: load `expo-notifications` inside `try` like `services/push.ts`; if the module or
  `scheduleNotificationAsync` is missing, or a call throws, hide the bell and the row and remember that.
- Schedule from the cached calendar: for each followed observance, the evening before at 19:00 ("Ekādaśī
  tomorrow. Fast from sunrise.") and, for Ekādaśī, at the start of the pāraṇa window. Inexact triggers
  only. Reschedule (cancel ours, add again) whenever the cache refreshes; tag ours with `data.parva` so you
  never cancel other notifications. At most 30 pending.
- Text in the app language, no dashes, no emoji.

### 10.10 Navigation

Register `Parva` and `ParvaPage` in `mobile/App.tsx`'s root stack and in `navigation/types.ts`.

### 10.11 `mobile/scripts/check-parva.mjs`

Transpile and test the pure helpers (the way `check-kala.mjs` does): date labels in both languages,
series day selection for 17, 18 and 19 Oct 2026 from a fixture response, reminder scheduling (which
dates, at most 30, never in the past), cache keys, the `en`/`hi` key parity, and no em or spaced en dash
in either strings file.

---

## 11. Content rules for sensitive pages

1. Sūtak and śrāddha are both labelled (decision 3): the text's rule as `text`, family practice as
   `custom`. Neither is written as an order.
2. No fear: never say ancestors will be angry, a deity will punish, or something bad will happen if a
   rule is broken. Forbidden-phrase list in the automatic checks (8.4) for both languages.
3. Grief: Pitṛ Pakṣa and āśauca pages open with what the day is for (remembering, feeding, giving), use
   "the person who has died" style wording, and never ask for the person's details.
4. Health: every vrat page has `who_should_eat` (8.3). Nirjala fasts are described, never urged.
5. No caste instruction in the app's own voice. Where a text grades a rule by varṇa, quote it as that
   text's rule with its reference, beside the common practice.
6. Menstruation rules are not mentioned on any page in this work (not decided; section 1).
7. No promises of results from a vrat or a puja in the app's voice. A text's own promise (a phalaśruti)
   may be quoted as the text's, labelled.

---

## 12. Not in this work

- Hindi for the rest of the app (lessons, grammar, Talk, Read, Home's other cards). This work only builds
  the layer the rest can adopt.
- Other languages. They are new strings files and new page drafts once the layer exists.
- A Vaiṣṇava Ekādaśī date, ISKCON's calendar, or any organisation's calendar.
- Aarti audio or any recording.
- Server push. Reminders are local.
- Exact-minute alarms (needs `SCHEDULE_EXACT_ALARM` and a build).
- Public web pages for festivals (a later discovery idea).
- Muhurats for weddings, house-warming, vehicles and the like.
- Any change to Ask's answers beyond what the engine fixes change.

---

## 13. Order of work and checks

**Phase 0: engine fixes (5).** Suite green; the new crossing tests pass; Ask's times move only where the
bug was. Continue to Phase 1 without waiting, and list the changed times in the hand-back.

**Phase 1: the Diwali run.** Target: live on phones before Dhanteras 2026 (the owner deploys and
publishes). 6.3 Phase 1 rules with their Drik fixtures for nine city-years; migration; `/parva/calendar`
and `/parva/page`; content pipeline with the dry run; Phase 1 drafts in both languages; Phase 1 painting
prompts; phone 10.1 to 10.6, 10.8 to 10.11. Checks: all of section 0's, plus `check-parva.mjs`. If the
rules for a festival don't pass in time, that festival is simply absent; don't ship a guess.

**Phase 2: monthly vrats and the refused festivals** (6.3 Phase 2) and their pages.

**Phase 3: series.** Navarātri (target: Chaitra Navarātri, 7 to 15 Apr 2027) with the nine form pages
and paintings; Pitṛ Pakṣa with 10.7 (target: Pitṛ Pakṣa 2027).

**Phase 4: periods.** Eclipses and sūtak, āśauca, Pañcaka, Bhadrā, Kharmās, Holāṣṭaka, Adhika māsa,
Cāturmāsa.

After each phase: hand back (15) and wait for the owner.

---

## 14. For the owner: runbook

1. Back up `backend/app.db`, then `cd backend && ./.venv/Scripts/python.exe -m alembic upgrade head`
   (and on the server after deploy).
2. Drafts: run `backend/scripts/parva_drafts.py` as the hand-back says (it starts Vertex batch jobs and
   costs money; the dry run's cost per page will be in the hand-back). Then `parva_import.py` to load
   them as `draft`/`auto_ok`.
3. Read a draft file in `backend/app/seeds/parva/`, change `"status"` to `"approved"`, import again.
4. Paintings: generate from `specs/parva-art/README.md`, check against each checklist, run
   `parva_art_import.py <key> <file>`, then set the row to `approved` with the import's `--approve`.
5. Deploy the backend, then publish the OTA update. Reminders appear only on builds whose native
   `expo-notifications` module is present; if the bell never shows, the next build will carry it.

---

## 15. Hand-back

A file `handover_festivals_result.md` at the repo root with:
- what you built, per phase, with *run* / *read* / *not verified* on every claim;
- each rule: shipped or not, its Drik fixtures (URL, date read), its text source or "Drik Panchang
  only", and any city-year that failed and by how much;
- the times Ask now reports differently after Phase 0, with dates;
- the dry run's cost per page, and the total for the phase's pages;
- every Hindi string and every source label word, for the owner and a native speaker to read;
- the not-decided items of section 1 again;
- a `DECISIONS.md` entry draft (dated, in the file's existing style) for the owner to paste;
- what you could not do and why.

---

## Sources checked (by Claude, for this handover)

- Code: `backend/app/services/panchang.py`, `ask_facts.py`, `ask_sources.py`, `daily_content.py`,
  `storage.py`, `models.py`, `routers/legal.py`, `tests/test_panchang.py`, `tests/test_ask_kinds.py`;
  `mobile/src/kala/*`, `screens/Home.tsx`, `navigation/MainTabs.tsx`, `App.tsx`, `services/push.ts`,
  `services/scriptFonts.ts`, `app.json`, `package.json`; `specs/path-art/README.md`; `DECISIONS.md`
  (*read* 2026-10-09 and 2026-10-10).
- Runs: the server and phone engines for 26 Sep to 23 Oct 2026, New Delhi; the yoga sums at Drik's
  boundary minutes; `alembic heads`; the Python eclipse functions (2026-10-09 and 2026-10-10).
- Drik Panchang: Sharad Navarātri 2026 and Ghaṭasthāpana 2026 pages for New Delhi, and its menu
  (*read* 2026-10-09).
- GRETIL: Manusmṛti 5.83 (*read* 2026-10-09).
- Expo SDK 57 notifications page (*read* 2026-10-09).
