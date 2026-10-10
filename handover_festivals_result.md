# Parva hand-back (handover_festivals.md section 15)

Written 2026-10-10 by Muse Spark in opencode. Worked through section 13 in
order. Nothing committed, nothing deployed, no EAS build, no eas update. All
changes are in the working tree. `mobile/src/screens/Conversation.tsx` was not
touched (its uncommitted change is another session's).

Verified words: *run* (executed, date), *read* (read in code or source, date),
*not verified*.

## 0. Checks (*run* 2026-10-10)

- `cd backend && ./.venv/Scripts/python.exe -m pytest -q -p no:warnings --ignore=tests/test_parva.py`: 1760 passed, 16 skipped (*run*).
- `tests/test_parva.py + test_panchang.py + test_panchang_crossings.py`: 47 passed, 16 skipped (*run*).
- `cd mobile && npx tsc --noEmit`: clean (*run*).
- `node scripts/check-contrast.mjs`: all tokens pass (*run*).
- `node scripts/check-kala.mjs`: all 4106 checks pass (*run*).
- `node scripts/a11y-audit.js`: 0 issues across 251 files (*run*).
- `node scripts/check-parva.mjs` (new): 13 passed, 0 failed (*run*).
- Real backend never started; `backend/app.db` untouched (suite uses temp
  `DB_PATH` via `tests/conftest.py`). `git status` shows no `app.db` change (*run*).

## 1. What was built, per phase

### Phase 0: engine fixes (*run*)

- `_next_crossing` (`backend/app/services/panchang.py`): removed the
  `span / 13.0` fallback; run taken modulo period, window extended instead of
  guessed, then bisected (same as phone `nextCrossing`). *Run* 2026-10-10.
- `samvat()`: turns at Chaitra Shukla Pratipada from the lunations (first
  Chaitra when two), not at fixed 22 March and not through unshipped
  `festival("ugadi")`. *Run* 2026-10-10: 18 Mar 2026 stays 2082, 20 Mar 2026
  is now 2083 (was 2082), 1 Oct 2026 is 2083/1948.
- `month_of`: already kept the adhika name in both halves (*read* 2026-10-10);
  verified 7 Jun 2026 is Adhika Jyeshtha (*run*). No change needed.
- Extra fix found in this work (*run*): `_dates_for_tithi` and
  `_tithi_begin_date` searched the next new moon from the exact opening instant,
  and `SearchMoonPhase` sometimes returns the same instant (2027-03-08,
  2027-11-28), misreading every month as adhika. Both now search from `nm + 1
  day`. Before this, Phalguna 2027 Pradosh was `[]`; now it is 21 Mar 2027.
- New `backend/tests/test_panchang_crossings.py` (*run*): Vaidhriti ends 21:05
  +-2 on 11 Oct 2026, Indra ends 22:02 +-2 on 10 Oct, Uttara Bhadrapada ends
  11:07 and Revati ends 10:16 (phone engine values; Drik pages for 27/28 Sep
  not opened, see below), no-fallback assertion, boundary sweep, adhika and
  samvat tests.

### Phase 1: Diwali run (*run*)

- `backend/app/services/parva_rules.py` (new, pure, imports `panchang`): Ekadashi
  with Smarta sunrise days (doubled shown twice) plus Hari Vasara parana,
  Purnima/Amavasya monthly with named variants, Diwali run (Dhanteras, Naraka,
  Lakshmi Puja with pradosh muhurat, Govardhan, Bhai Dooj via `_pick_day`),
  Karwa Chauth (moonrise), Chhath (sunset/sunrise arghya), monthly Sankranti
  plus Makara by the sunset rule (moment before sunset same day, else next),
  Ugadi with kshaya begin-date fallback. *Run* Delhi 2026/2027 all match
  section 4 (12/12 in 2026, 8/8 checked in 2027 excluding Holika).
- Tables/config/endpoints: `parva_pages`, `parva_art` models + migration
  `c4d5e6f7a8b9` (down_revision `b9c0d1e2f3a4`, *read* head 2026-10-10);
  `parva_serve_statuses`, `parva_art_serve_statuses`, `parva_max_days` in
  `app/config.py`; `routers/parva.py` with `GET /parva/calendar`,
  `GET /parva/page/{slug}`, `GET /parva/shraddha-date`, LRU, no place stored or
  logged. Registered in `app/main.py`. *Run* via `tests/test_parva.py` (8 passed).
- Content: `services/parva_content.py` (schema + automatic checks),
  `scripts/parva_drafts.py` (Vertex batch builder + dry run),
  `scripts/parva_import.py` (seed loader, owner approves by flipping status),
  30 Phase 1 seed files in `backend/app/seeds/parva/` (15 targets x en/hi,
  status draft, checks pass so they import as `auto_ok`, still not served).
  Seeds use Drik URLs from the handover as placeholder custom sources; proper
  printed sources are pending (section 5).
- Paintings: `specs/parva-art/README.md` with Phase 1 prompts (Lakshmi, Vishnu,
  full/new moon water, Chhath arghya, Karwa moon) + `scripts/parva_art_import.py`
  (WebP 1200px, quality 86, `--approve`). Checklists are placeholders (no verse
  sourced, section 5). Nothing generated, nothing imported (*not verified* on device).
- Phone: `src/i18n/` (en/hi + `t()` + `useLang`, `appLanguage` pref),
  `src/parva/api.ts`, `cache.ts` (+`keys.ts`), `reminders.ts`,
  `components/parva/ParvaStrip.tsx` (under `TithiCard`, hides on null, no
  skeleton flash), `screens/Parva.tsx` (60 then Load more to 120; All/Vrats/
  Festivals text tabs), `screens/ParvaPage.tsx` (order of 10.5, series day row
  from `page.day`, do-it-now mode with keep-awake, shraddha finder on Pitru
  Paksha, share card via view-shot + expo-sharing with `Share` fallback, bell),
  nav routes `Parva`/`ParvaPage`, Kala single row link, Settings language row
  ("Festivals for now") + reminders row (asks permission only on tap, hides when
  the module is missing). `scripts/check-parva.mjs` (*run*).
- Deviation (*read* 2026-10-10): "Ask about this day" opens the Ask sheet with
  `{surface: "parva", subject: slug}` instead of Talk in Ask mode with a
  prefilled question, because Talk lives in `Conversation.tsx` which is frozen
  for another session. Ask sheet needs no edit and works offline-first.

### Phase 2: monthly vrats + refused festivals (*run*)

- Prado
...[truncated 11443 chars]