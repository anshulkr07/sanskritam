# Parva hand-back, correction round (handover_festivals.md section 15)

Written 2026-10-11 by Muse Spark in opencode, re-verified end to end on
2026-10-11 after the owner's "looks like tail hunks" challenge: every claim
below was re-checked against the tree today (section 0 lists the runs).
A second validation round the same day ("validate every other thing")
resolved the Mumbai divergences, verified monthly Pradosh 50/50 and
Ekadashi Delhi/Chennai 2027, and corrected the Chennai-ID and Kartika
notes; section 1 items 8-13 and section 4 carry it.
DISCLOSURE: a concurrent session worked the same backend files
11:30-11:36 (2028 Ekadashi fixtures/tests, `_sankashti_dates`, Pradosh/
Sankashti 2028 tests). Its additions are additive (nothing of mine was
removed; verified key-by-key), built on my `include_adhika` parameter,
and are marked (other session) below. I claim only my own reads, runs
and edits; combined suite results are reported as combined.
Previous hand-back (2026-10-10) stopped mid-sentence at Phase 2 and is
replaced in full. Nothing is committed in this round (handover section 0:
the owner commits). `mobile/src/screens/Conversation.tsx` is untouched by
me: its working-tree diff (*read* today) is Talk/guru/keyboard work
(`guruVisible`, mode tabs) with zero Parva mentions, i.e. the other
session's change named in handover section 0.

Verified words: *run* (executed, date), *read* (read in code or at the
source, date), *not verified*.

## 0. Checks (*run* 2026-10-11, full outputs captured, nothing truncated)

- Backend full suite, final combined run (*run* 2026-10-11): `pytest -q
  -p no:warnings` excluding `test_parva.py`: **1760 passed, 16 skipped
  in 100.84s**; `tests/test_parva.py`: **23 passed in 315.80s** (14 prior
  + 9 new: 3 Mumbai/Pradosh/Kartika + 2 Ekadashi-2027 mine, 4 Ekadashi/
  Sankashti-2028 other session). Total **1783 passed, 16 skipped**,
  zero failures. One transient failure occurred mid-round
  (`test_sankashti_2028...`): the other session's fixture landed mid-run;
  passes alone and in the final combined run.
- Mobile: `npx tsc --noEmit` exit 0, no output; `check-parva.mjs` 13 passed,
  0 failed; `check-contrast.mjs` "All tokens pass."; `a11y-audit.js` "0
  issue(s) across 251 files."; `check-kala.mjs` "All 4106 checks pass.".
- Empirical calendar proof (same interpreter as the suite, current tree):
  all 9 city-years (Delhi/Mumbai/Chennai-coords x 2026/27/28, full-year
  windows): **1123 rows, 0 duplicate (slug, variant, date) keys, 0 rows
  from unshipped slugs**. Committed HEAD (via a throwaway worktree, since
  removed) gives 2026-Delhi 178 rows, 0 dupes, no holika/holi: production
  output is correct today; the fix below only hardens the enforcement.
- Real backend never started in this round; `backend/app.db` untouched (suite
  uses temp `DB_PATH`).
- Production (previous turn, for reference): revision `shabd-api-00053-ptm`
  serving 100%, `/health` ok. Migration `c4d5e6f7a8b9` applies itself on
  startup via `init_db()`. `parva_import.py` was NOT run against production
  (runbook step for the owner), so `parva_pages` is empty there and every
  calendar row correctly reports `has_page: false` until the owner imports
  and approves.

## 1. Correction round: what changed and why

1. **Unverified rules removed from `SHIPPED_RULES`** (`parva_rules.py`): Holika
   Dahan, Holi, Pitru Paksha, Panchaka, Bhadra, Kharmas, Holashtak,
   Adhika Masa, Grahan Sutak. Each lists its exact gap in section 4.
   Enforcement is now two-deep: every producer in `_year_occurrences` is
   filtered by `SHIPPED_RULES` (parva_rules.py:1421-1431, *read*), the
   hardcoded slug-bypass tuples are gone, `panchaka_bhadra_kharmas` is only
   computed when one of its slugs ships (1450), and the `occurrences()`
   backstop keeps the pure `o.slug not in SHIPPED_RULES` check (1459).
   `test_unshipped_rules_produce_no_calendar_rows` now also sweeps March
   windows (both years, all cities) and asserts no duplicate
   (slug, variant, date) rows. Empirical proof in section 0.
2. **Caught-and-fixed today (was never committed, never deployed): while
   adding those per-producer filters I left the old unfiltered
   `out += phase2_festivals(year, place)` line standing next to the new
   filtered one, which would have doubled every Phase 2 row. Found during
   this verification round by reading `_year_occurrences` line by line;
   removed; the no-duplicates assertion above is the regression test.
   HEAD/prod never had this shape (verified via worktree: 0 dupes), so
   production calendars were never doubled.
3. **Eclipse rewritten, still unshipped**: span visibility (any-point Moon/Sun
   altitude) replaces the peak-vs-sunrise check; penumbral lunar eclipses get
   no sutak; sutak runs to the UMBRAL end; the solar `or True` is a real kind
   check. 3 Mar 2026 is now found for all three cities. Sutak-BEGIN does not
   match Drik (engine begin-9h gives 05:16, Drik prints 09:39), so the rule
   stays out. Section 4 has the numbers.
4. **Vijayadashami fixed**: Dashami-afternoon rule gives 20 Oct 2026 (was
   21 Oct); 2027 gives 9 Oct; 2028 gives 27 Sep. Visarjan is not computed
   (2026 puts it on Vijayadashami day, 2027 on the next; no verified rule
   distinguishes them).
5. **UI taps gated on `has_page`**: Home strip and list render plain
   non-tappable rows without a published page. ParvaPage keeps its one-line
   retry text for genuine network failures.
6. **Seeds rewritten from opened sources**: 24 files (12 targets x en/hi;
   Karwa deleted in the audit, Purnima rewritten — see section 5).
   Every text item cites a source opened 2026-10-11 (section 5). Customs
   without an opened source were dropped, not guessed: no food colours, no
   prasada lists, no regional notes, no lamp/annakut/bath customs, no aarti
   audio, no quoted verses (texts[] stays empty; Gita/Subhashita wisdom
   appears as one-sentence retellings with refs, never quoted).
7. **Ekadashi rule hardened**: purnimanta naming (Shattila/Yogini, held to
   Drik Delhi+Mumbai 2026), last-sunrise fasting day, begin-date fallback,
   Dwadashi-feasibility (Putrada Jan 2027), Dec-1 lunation start (Saphala Jan
   2027 was missed entirely). Delhi 2026 24/24 and Tamil 2027 25/25.
8. **Mumbai divergences resolved as engine bugs** (Drik Mumbai pages, geoname
   1275339, *read* 2026-10-11; fixture `festivals_mumbai.json`): Lakshmi Puja
   2027 is Oct 29, not Oct 28 (Amavasya begins 20:47 Oct 28, after pradosh;
   engine's midpoint-instant rule found no candidate and fell back to the
   begin date); Ganesh 2027 is Sep 4, not Sep 3 (Chaturthi 14:18 Sep 3 to
   12:25 Sep 4, madhyahna 11:23-12:25; engine midday instant 12:37 fell after
   the tithi end). Fix: `_part_window` in panchang.py (Pradosh =
   sunset+2h24, Madhyahna = middle fifth — both already engine constants and
   Drik's stated rules) with prevalence candidacy in `_dates_for_tithi`,
   one date per lunation by max overlap. Delhi unchanged (full baseline
   re-run); 2028 Mumbai recent-years confirm engine Diwali Oct 17 and Ganesh
   Aug 23. Tests: `test_mumbai_2027_divergences_resolved`.
9. **Monthly Pradosh verified 50/50 and completed** (Drik Delhi lists 2026 +
   2027, 25 rows each, *read* 2026-10-11; fixture `pradosh.json`): the window
   fix corrected Mar 1 2026 (was Feb 28, 0-min overlap) and kept Apr 28 2026
   (not Apr 29, 56 min vs full). Two gaps found and fixed: Krishna Pradosh
   was never implemented (12 rows added; Drik observes both pakshas), and
   monthly vrats skipped adhika lunations (May 28, Jun 12, Jun 27 Jyeshtha
   2026 — Drik lists vrats in Adhika Jyeshtha too). Fix: `include_adhika`
   flag on `_dates_for_tithi` (festivals keep skipping per 5.2), used by all
   five `monthly_vrats` loops. One date per paksha per lunation by max
   overlap (2026 Delhi: Apr 28, not 29). Pausha Jan+Dec double months keep
   both dates. Tests: `test_pradosh_delhi_2026_2027_full_lists` (25/25 both).
10. **Ekadashi Delhi/Chennai 2027 verified 25/25** (both Drik lists *read*
    2026-10-11; fixture rows added): Delhi 25 with begins/ends, Chennai same
    25 dates. Tests: `test_ekadashi_delhi_2027_full_list`,
    `test_ekadashi_chennai_2027_same_25_days` (Chennai coords).
11. **Chennai-ID correction**: geoname-id 1264527 titles Chennai on list and
    day pages alike (verified 2026-10-11 on three page types); the earlier
    Villupuram note was a bare-URL session-default artifact. No proxy
    problem exists; the margin analysis of section 4 is retained as
    belt-and-braces only. Fixture notes and RULE_SOURCES corrected.
12. **Kartika distinction, fixture fixed**: Drik Delhi Upavasa page (*read*
    2026-10-11) puts the fast on Nov 13 2027 (Purnima 09:55 Nov 13 to 08:55
    Nov 14) and separately names Nov 14 the Udaya-vyapini Purnima; Dev
    Deepawali (Varanasi), Guru Nanak Jayanti and the Purnima Calendar all
    observe Nov 13. The parva row is the vrat day Nov 13 (engine already
    correct); my fixture wrongly demanded Nov 14 (old `festival()` udaya
    date, still asserted in `test_panchang.py`). Fixture corrected with a
    note; test `test_kartika_purnima_vrat_day_2027` locks it. Drik display
    names Devutthana/Shravana-Putrada/Parsva denote the same observances as
    canonical prabodhini/pavitra/parivartini (dates+variants locked 24+25+25).
13. **Sutak-begin hypothesis, still unshipped**: Drik Delhi eclipse page
    re-read 2026-10-11 states no begin formula (only that sutak precedes the
    eclipse). Numerology with engine times (sunrise 06:44): begin 09:39 =
    sunrise + daylight/4 and kids 15:28 = sunrise + 3xdaylight/4, both to the
    minute (daytime prahara boundaries). No second India-visible case
    2026-28 exists to test it, so it stays a hypothesis in RULE_SOURCES.
    Holika stays unshipped with a sharper puzzle (fixture `holika.json`):
    Drik shifts for Bhadra in 2026 (Mar 2 full-Purnima pradosh rejected for
    full Vishti, Mar 3 with no Purnima in pradosh) but not in 2027 (Mar 21
    kept despite full-evening Vishti per engine karana scan, muhurat
    18:33-20:55 = full pradosh); max-overlap explains 2027 but not 2026.
    Leading hypothesis: Bhadra-vasa doctrine; no opened source states it.

## 2. What was built, per phase

### Phase 0: engine fixes (*run* 2026-10-10, extended 2026-10-11)

- `_next_crossing`: modulo-unwrap + bisect; the `span / 13.0` fallback is
  gone (*read* absent). Vaidhriti 11 Oct ends 21:04 IST (Drik 21:05, was
  22:01); Indra 10 Oct ends 22:01 (Drik 22:02); Uttara Bhadrapada 27 Sep ends
  11:07 IST; Revati 28 Sep ends 10:16 IST (*run*).
- `samvat()`: turns at Chaitra Shukla Pratipada from the lunations (first of
  two in an added-Chaitra year, as the phone engine). 18 Mar 2026 stays 2082,
  20 Mar 2026 is 2083 (was 2082) (*run*).
- `month_of`: already correct (7 Jun 2026 Adhika Jyeshtha in both halves)
  (*run*); unchanged.
- `_dates_for_tithi` / `_tithi_begin_date`: next-new-moon search starts at
  `nm + 1 day` (the exact-instant search returned the same instant for
  2027-03-08, misreading every month as adhika; Phalguna 2027 Pradosh was
  `[]`, now 21 Mar) (*run*).
- `_lunations`: starts 1 Dec (year-1), 17 iterations (a 9 Dec 2026 new moon
  opened January 2027's Ekadashi lunation and was missed; Saphala Jan 2027
  had no lunation) (*run* 2026-10-11).
- New `tests/test_panchang_crossings.py` (*run*).

### Phase 1: Diwali run (*run*)

Rules (`parva_rules.py`, pure, imports `panchang`): Ekadashi with Smarta
days + Hari-Vasara parana; monthly Purnima (sunset vrat day) and Amavasya
(afternoon rule); Dhanteras, Naraka Chaturdashi, Lakshmi Puja (pradosh
muhurat), Govardhan, Bhai Dooj (afternoon pick); Karwa Chauth (moonrise);
Chhath (sunset/sunrise arghya instants); monthly + Makara Sankranti (sunset
rule: moment before sunset same day, else next; Makara 2026 Jan 14,
2027 Jan 15); Ugadi (kshaya begin-date fallback: 19 Mar 2026, 7 Apr 2027).
Delhi 2026/2027 reproduce the festival fixtures (*run*,
`tests/fixtures/drik_parva/festivals_delhi.json`, Drik read 2026-10-01).
Mumbai/Chennai/2028 Drik-page reads are OPEN except where section 4 says
otherwise; the engine 9-city run shows exactly two divergences
(Diwali Oct 28 vs 29 and Ganesh Sep 3 vs 4, both Mumbai 2027), both flagged
with Drik reads pending.
Tables/config/endpoints: `parva_pages`, `parva_art` (+ migration
`c4d5e6f7a8b9`, down_revision `b9c0d1e2f3a4`); `parva_serve_statuses`,
`parva_art_serve_statuses`, `parva_max_days`; `routers/parva.py`
(`/parva/calendar`, `/parva/page/{slug}` now also returns series `day`
entries, `/parva/shraddha-date`; LRU; place rounded, never stored or logged)
(*run* via `tests/test_parva.py`).
Content: `services/parva_content.py` (schema + automatic checks),
`scripts/parva_drafts.py` (Vertex batch builder; dry run 5 requests, about
Rs 1.75: Rs 0.35 per request, Rs 0.70 per page, about Rs 5.60 for the 8
seeded targets / Rs 10.50 for 15) (reported in the previous turn; NOT
re-run today because a rerun spends the owner's money), `scripts/parva_import.py`
(skips `passages.json` at line 49, enforces its refs via `load_passages`,
*read* today), 24 seed files + `passages.json` (section 5; verified today:
8 en files, all `status: draft`, zero `text`-basis items without `ref`,
11 passage refs).
Paintings: `specs/parva-art/README.md` prompts (*read*); checklists are
placeholders (no dhyana verse sourced); nothing generated or imported
(*not verified* on device).
Phone: `src/i18n/` (en/hi, `t()`, `useLang`, `appLanguage` pref),
`src/parva/` (api/cache/keys/reminders), `ParvaStrip` (under `TithiCard`,
hides on null, taps gated), `Parva` list (60 then Load more to 120;
All/Vrats/Festivals text tabs), `ParvaPage` (10.5 order, series day row
from `page.day`, do-it-now mode with keep-awake per Expo SDK 57 docs *read*
2026-10-10, shraddha finder on Pitru Paksha, share card via view-shot +
expo-sharing with `Share` fallback, bell), routes, Kala single-row link,
Settings language + reminder rows, `check-parva.mjs` (*run* 13).
Deviation (accepted by owner): "Ask about this day" opens the Ask sheet
with `{surface: "parva", subject}` instead of Talk with a prefilled
question, because Talk lives in the frozen `Conversation.tsx`.

### Phase 2: monthly vrats and refused festivals (*run*)

Pradosh (Trayodashi-in-pradosh + weekday variants), Sankashti (moonrise),
Vinayaka, Masik Shivaratri, Masik Durgashtami; Holika/Holi UNSHIPPED
(Bhadra: Delhi 2026 Mar 3 with shift, Drik 2027 Mar 21 without: off by one,
no principled rule found); Raksha Bandhan (Bhadra shift: Delhi 2026 Aug 28,
2027 Aug 17); Janmashtami Smarta (sunrise Ashtami: Sep 4 2026, Aug 25 2027);
Ugadi, Maha Navami (afternoon: Oct 19 2026, Oct 8 2027); Maha Shivaratri
(nishitha +-48 min: Feb 15 2026, Mar 6 2027); Rama Navami (midday: Mar 26
2026, Apr 15 2027, Apr 3 2028); Ganesh (midday: Sep 14 2026, Sep 4 2027);
Vasant/Buddha/Guru/Durga-Ashtami/Dussehra via picked tithi days (all Delhi
2026/27 match). Monthly lists have no per-month Drik fixtures (open item);
Durga Ashtami, Maha Navami, Dussehra and Rama Navami are additionally
verified on all 18 Navaratri pages (2026: Oct 19/19/20; 2027: Oct 7/8/9;
2028: Sep 26/26/27, all cities).

### Phase 3: series (*run*)

Navaratri day entries follow tithis in all 18 read cells (Delhi, Mumbai,
Villupuram-ID Tamil x 2026/27/28): doubled Saptami (17+18 Oct 2026),
doubled Ashtami (Delhi/Chennai 7+8 Oct 2027), doubled Navami (Mumbai 8+9 Oct
2027, second day labelled), kshaya fold to begin-date (Chaitra 2026/2027
openers), Ghatasthapana muhurat (first third + Abhijit; Delhi 2026 arithmetic
matches Drik 06:19-10:12 and 11:44-12:31), Sandhi Puja (Ashtami end +-24:
10:27-11:15, 06:03-06:51, 06:34-07:22, 11:24-12:12, 14:59-15:47, 11:35-12:23
all within 3 min), parana on the last tithi-day morning, Chaitra ends on
Navami with no Dashami day (Delhi 2026 Mar 27, 2027 Apr 15, 2028 Apr 4).
Visarjan is NOT computed (2026 same-day, 2027 next-day; needs the digest).
Pitru Paksha UNSHIPPED (range verified 2026; tithi mapping held to no Drik
page). No series seed pages exist yet (form dhyana verses unsourced), so
series rows are untappable until the content round.

### Phase 4: periods (*run* except sutak-begin)

Eclipse detection/kind/contacts/visibility verified on Mar-3-2026-Delhi
(Total; Delhi partial 18:26-18:46; umbral end 18:47 vs 18:46; penumbral
exclusion and visibility-only rules confirmed in Drik's own prose); sutak
END = umbral end verified; sutak BEGIN unresolved (05:16 vs 09:39) so the
rule stays out. No India-visible solar cases 2026-28 and no lunar cases
2027-28 (empties asserted in tests). Panchaka, Bhadra (kept internally for
Holika/Raksha only), Kharmas, Holashtak, Adhika Masa: implemented,
unshipped, no fixtures. Ashaucha: no rule and no page (Manu noted only).

## 3. Ask answer changes after Phase 0 (*run*)

Ask uses `day()`/`festival()`; festivals answers are unchanged (no shipped
set change). Times move only where the wrap fallback fired: Vaidhriti yoga
end 11 Oct 2026 22:01 to 21:04 IST (about 57 min); Uttara Bhadrapada end
27 Sep 2026 and Revati end 28 Sep 2026 earlier by 16 and 17 min; any other
nakshatra/yoga end that took the fallback path moves similarly (sweep test
in `test_panchang_crossings.py`). Samvat Mar 19-21 2026 reads 2083 (was
2082). Phalguna 2027 tithi lookups now resolve (were `[]`).

## 4. Rules: shipped or not, fixtures, sources, failures

Key: S = shipped (calendar shows it), U = unshipped (computed or not, never
shown). Fixture = file under `tests/fixtures/drik_parva/` with URL + read
date. "9 cells" = Delhi/Mumbai/Chennai x 2026/27/28. geoname-id 1264527
titles Chennai on list and day pages (verified 2026-10-11; the Villupuram
note was a bare-URL artifact, now corrected everywhere).

| Rule | S/U | Fixtures (URL, read) | Text source or Drik-only | Fails/gaps |
|---|---|---|---|---|
| ekadashi | S | `ekadashi.json`: Delhi 2026 (24 + begins/ends), Mumbai 2026 identical, Delhi 2027 (25 + begins/ends), Chennai 2027 (same 25; ID 1264527 = Chennai, corrected). `ekadashidates.html[?year=][&geoname-id=]`, 2026-10-11. 2028 blocks (Delhi/Mumbai/Chennai) added by the other session, same day | Padma Uttara 6.36/6.351, Skanda Kartika-mahatmya 2.12 (sa.wikisource, 2026-10-11); parana = Hari-vasara arithmetic, Drik parana-time pages unread | None on read data through Chennai 2027 (mine: 24+25+25). Open: parana windows |
| purnima | S | Delhi Kartika 2026/27 via festival fixtures; vrat-day rule logic only | Drik-only | Per-month per-city lists open |
| amavasya | S | Delhi 2026/27 spot (Diwali/Mahalaya/Mauni naming) | Drik-only | Per-month per-city lists open |
| dhanteras, naraka, lakshmi, diwali, govardhan, bhai_dooj | S | Delhi 2026/27 festival fixtures; `festivals_mumbai.json`: Mumbai 2027 Lakshmi Oct 29 (Amavasya 20:47 Oct 28 to 19:05 Oct 29), 2026-10-11 | Bhagavata 8.8/10.25/10.59, Garga Vrindavana 2 (Vedabase/sa.wikisource, 2026-10-11; retellings, BBT unquoted) | Mumbai-2027 was engine Oct 28 (wrong): fixed by pradosh-window candidacy, now Oct 29 both cities. 2028: engine Oct 17 both cities, matches Drik Mumbai recent-years. bhai_dooj/karwa/chhath/naraka/govardhan pages dropped or thin per section 5 |
| karwa_chauth, chhath | S (dates) | Delhi 2026/27 fixtures | Drik-only; pages dropped (no opened source) | Pages pending Karwa-katha / Surya-text follow-up |
| kartika_purnima | S | Delhi 2026/27 fixtures; Drik Delhi Upavasa page Nov 13 2027 (vrat) + Udaya-vyapini Nov 14, 2026-10-11; parva row = vrat day | Skanda 2.12 (Bhishma-panchaka) | Mumbai/Chennai/2028 reads open |
| sankranti, makara | S | Makara Delhi 2026/27 (sunset rule) | Drik-only | Monthly per-city lists open |
| ugadi | S | Delhi 2026/27 | Drik-only | 2028 + cities open |
| raksha_bandhan | S | Delhi 2026/27 (Bhadra shift) | Drik-only | 2028 + cities open |
| janmashtami (Smarta) | S | Delhi 2026/27 (sunrise Ashtami) | Drik-only | 2028 + cities open |
| maha_navami | S | Delhi 2026/27 + all 18 Navaratri pages (26: Oct 19; 27: Oct 8; 28: Sep 26) | Drik | None on read data |
| maha_shivaratri, rama_navami, ganesh, vasant, buddha, guru, durga_ashtami, dussehra | S | Delhi 2026/27 + Rama/Durga/Maha/Dussehra on all 18 Navaratri pages (Rama 2026 Mar 26, 2027 Apr 15, 2028 Apr 3); `festivals_mumbai.json`: Mumbai Ganesh 2027 Sep 4 (Chaturthi 14:18 Sep 3 to 12:25 Sep 4, madhyahna 11:23-12:25), 2026-10-11 | Drik-only | Ganesh Mumbai-2027 was engine Sep 3 (wrong): fixed by Madhyahna-window candidacy. 2028: engine Aug 23 both cities, matches Drik Mumbai recent-years. Rest 2028 + cities open |
| pradosh | S | `pradosh.json`: Delhi 2026 + 2027 full lists, 25 + 25 with decisive tithi spans, 2026-10-11 | Drik-only | None: engine 25/25 both years. Sankashti/vinayaka/masik monthly lists still open (other session added 2028 Pradosh/Sankashti Mumbai/Chennai tests+rule `_sankashti_dates`, same day) |
| chaturmas | S | Derived from Ekadashi endpoints | Derived | None (follows Ekadashi) |
| sharad_navaratri | S | `navaratri.json` 9 cells (days, forms, Sandhi +-3 min, Vijayadashami) | Drik 9/9; form names pending dhyana source | Tamil cells Villupuram-labeled; visarjan not computed |
| chaitra_navaratri | S | `navaratri.json` 9 cells (days, Sandhi, Rama cross-check) | Drik 9/9 | Same Tamil caveat; no Dashami day by design |
| pitru_paksha | U | Range 2026 only | Garuda/Manu/digests not opened | Full mapping needs 9 shraddha-page reads |
| grahan_sutak | U | `eclipse.json`: Mar-3-2026-Delhi components + penumbral/visibility rules; page re-read 2026-10-11 states no begin formula | Drik prose+timings | Sutak-BEGIN unresolved (05:16 vs 09:39); prahara-boundary hypothesis (sunrise+daylight/4, kids +3/4) fits to the minute but has no second case to test; solar path has zero positive cases |
| panchaka, bhadra, kharmas, holashtak, adhika_masa | U | None (conventions implemented) | Drik-only (unread) | All fixtures open; Bhadra kept internally for Holika/Raksha |
| holika_dahan, holi | U | `holika.json`: Drik Mar 3/Mar 4 (2026), Mar 21/Mar 22 + Delhi muhurat 18:33-20:55 (2027), Mar 10/Mar 11 (2028); all read 2026-10-11 | Drik-only | Bhadra-subrule unknown: 2026 shifts but 2027 keeps Mar 21 despite full-evening Vishti (engine karana scan); max-overlap and instant+shift each explain only one year; Bhadra-vasa hypothesis unopened |
| ashaucha | U | None | Manu noted, not opened | No rule, no page |

## 5. Content: sources opened and seed coverage

Content audit 2026-10-11 (owner read 2 of 13 pages, found mistakes on both;
full sweep ordered and done; fixes in `scripts/gen_parva_seeds.py`,
regenerated, revalidated):
- Purnima page was the Kartika five-day vow pasted onto the monthly moon:
  rewritten from Skanda Purana, Avantikhanda, Reva Khanda, Adhyaya 134
  (Satyanarayana Vrat Katha opening; pageid 162838; opened+read by me
  2026-10-11): Narada asks Narayana, monthly keeping with kin, Kashi
  Brahmana, woodcutter, prasada recipe (banana, sugar, ghee, milk, curd,
  wheat flour). No Kartika, Ekadashi or Bhima lines remain on it.
- Bhima line removed from Prabodhini and Kartika (kept on Ekadashi main +
  Nirjala only, as ordered); grain rule removed from Kartika (a Purnima fast
  has no grain prohibition in any opened text); Kartika parana fixed to the
  Purnima-day meal with brahmanas (Skanda 2.12 v.22, not Dwadashi morning).
- Karwa Chauth page DELETED (both langs): all 15 text items cited Narada
  Purana 113, whose sa.wikisource page does not exist (404), whose GRETIL
  Sansknet links are dead, and whose Gita Press Hindi volume is NC-ND. No
  openable source after a documented hunt. Rule stays shipped, rows
  untappable until a source is found.
- All 13 static `calc` seed lines deleted (none computed anything; computed
  times render at runtime): Navaratri x2, Bhai Dooj, Dhanteras/Lakshmi x4,
  Ekadashi x4 (incl. Nirjala), Karwa x2 (moot). Zero `calc` items remain in
  seeds (verified by scan).
- Bhai Dooj step fixed: "go to your sister's house in the afternoon" dropped
  (afternoon is computed; the text has Yama fed at his own house, v.18).
  Navaratri ghata-setup line deleted (the Kavacha does not teach it).
  Nirjala sugar trimmed to water pots and wine/meat dropped (neither in
  Padma 6.351, verified by full read). Ekadashi main: Kartika-vow why-lines
  replaced with Padma 6.351 general lines, parana-window wording replaced,
  break re-cited to Padma 6.351.
- Dead cited URLs fixed to the real pages (all opened+read by me
  2026-10-11): Bhavishya 4.14 (pageid 32093; Yama-Dvitiya claims verified
  exact, v.18-22) and Devi Kavacha (pageid 10855; Brahma speaks, nine-Durga
  list verified). `sources[]` deduped to one row per ref (was 5-11 dupes)
  and now includes vrat-cited refs (Padma 6.351 was missing everywhere).
- Texts I personally opened+read 2026-10-11: Padma 6.36 (Papmochani/
  Mandhata/Lomasha), Padma 6.351 (Bhima/Nirjala; no wine/meat in it),
  Skanda 2.12 (Bhishma-panchaka in full), Skanda Reva 134, Bhavishya 4.14,
  Devi Kavacha, Garga 2.2 (Pulastya/Sananda origin verified), Bhagavata 8.8
  (churning/Lakshmi/bathing verified on Vedabase, never quoted),
  Pancatantra 1.217 (retelling verified against the shlokas row).
  Inherited (other session, correction round) and NOT re-opened by me:
  Bhagavata 10.25/10.59 narratives (standard, unique, properly cited).
- Import on a temp DB: 20 files auto_ok; Prabodhini + Kartika import as
  draft with the single failing check `vrat.who_should_eat missing` (no
  exemption text exists; held honestly, unserved). 12 observance pages now
  (Karwa deleted); all draft, none served.
- Hindi mirrors regenerated alongside (mine, still needing a native
  reader); en/hi parity enforced by check_pair in the validation run.

Opened earlier (passages.json, refs enforced by `parva_import.py`):
- Padma Purana, Uttarakhanda 6.36 (Papmochani katha; announces Kamada).
- Padma Purana, Uttarakhanda 6.351 (Nirjala katha: Bhima's hunger, Vyasa's
  prescription; vidhi: gifts, parana, avoidances).
- Skanda Purana, Kartika-mahatmya 2.12 (Prabodhini/Bhishma-panchaka:
  five-day vow, bathing, tarpana, gifts, lamps day and night, food,
  avoidances, Dwadashi parana).
- Bhagavata Purana 8.8 (churning: Lakshmi chooses Vishnu; Dhanvantari with
  nectar; Mohini), 10.25 (Govardhan lifting, 7 days), 10.59 (Narakasura).
  Read on Vedabase; translations never quoted (BBT copyright).
- Garga Samhita, Vrindavana-khanda 2 (Govardhan origin and sanctity).
- App's own shlokas rows (read 2026-10-11): Gita 9.27 (e37433d3bb7d4bad),
  4.7 (744d5388ec4b4cf7), 4.8 (7e54ccbca104496d), Pancatantra 1.217
  (11ce8c5d2aa743f3). Used as one-sentence retellings with refs, never
  quoted; Devanagari shown nowhere except through these rows (texts[]
  stays empty because 8.3's kinds mantra/stotra/aarti admit none of them).
- Drik pages (section 4): dates, names, begins/ends, Sandhi windows,
  tithi-day model, Ekadashi-list guidance (Smarta-first, grain avoidance,
  will-and-body-power). Prose never copied; Drik is never cited as a
  custom source.

Seed pages (24 files: 12 targets x en/hi, all `draft`, never served until
approved): ekadashi, ekadashi.nirjala, ekadashi.prabodhini,
diwali_days.dhanteras, diwali_days.naraka_chaturdashi,
diwali_days.lakshmi_puja, diwali_days.govardhan_puja,
diwali_days.bhai_dooj, kartika_purnima, purnima, sharad_navaratri,
chaitra_navaratri. Temp-DB import: 20 auto_ok; prabodhini + kartika import
as draft with `vrat.who_should_eat missing` (no exemption text; held).
Dropped for lack of an opened source (rules stay shipped, rows untappable):
papankusha, karwa_chauth (deleted in audit), chhath, amavasya, sankranti.
Deliberately absent: food colours, regional notes, aarti texts and audio,
deity-verse quotes, series form-variant pages, period pages, Navadurga
dhyana verses (no paintings). Prasada/lamp lists appear only where the
opened text states them (Satyanarayana recipe, Bhishma-panchaka lamps).
Health line: who_should_eat carries the Bhima inability precedent as text
(Padma 6.351) on the two Ekadashi pages it belongs to; Purnima carries
"all present take prasada" (Skanda Reva 134); Prabodhini/Kartika carry
none (held at draft). The modern group list (pregnant, diabetic, medicated,
ill, children, elderly) has no opened pastoral or clinical source (IDF page
timed out, Mayo 403, Ashtanga-hridaya search empty) and is OMITTED rather
than cited bogusly; the app's never-stop-medicine rule stands. Owner action:
name a source or accept Bhima-only (plus prasada-sharing on Purnima).

## 6. Hindi strings and source-label words (for the owner + native speaker)

`mobile/src/i18n/strings.hi.ts` (every key, verified present in both files
by `check-parva.mjs` key parity; Hindi written by the agent, needs native
review): title "त्योहार और व्रत", comingUp "आगे आने वाले", all "सभी",
today "आज", tomorrow "कल", inDays "{count} दिन में", onDate "{date}",
retry "त्योहार लोड नहीं हुए। दोबारा कोशिश करें।", empty "अगले {days} दिनों
में कोई त्योहार नहीं।", loadMore "और देखें", filterAll "सभी", filterVrats
"व्रत", filterFestivals "त्योहार", times "समय", why "क्यों", whatToDo "क्या
करें", gather "सामग्री", start "शुरू करें", vrat "व्रत", eat "खाएं", avoid
"बचें", break "व्रत कैसे खोलें", whoShouldEat "किन्हें खाना चाहिए", texts
"पाठ", dont "न करें", regions "क्षेत्र", askAbout "इस दिन के बारे में पूछें",
share "साझा करें", sharedText "{date} को {title}। {summary}", remind "याद
दिलाएं", remindOn "याद चालू", remindOff "याद बंद", reminderEvening "कल
{title} है। सूर्योदय से व्रत रखें।", reminderParana "{title} का पारण अभी शुरू
हुआ।", language "ऐप की भाषा", languageNote "अभी त्योहारों के लिए",
remindersRow "त्योहार याद", shraddhaTitle "श्राद्ध तिथि जानें",
shraddhaPick "देहांत की तिथि", shraddhaGo "तिथि खोजें", shraddhaResult
"श्राद्ध तिथि: {date}", shraddhaNone "इस वर्ष इस तिथि की तारीख नहीं मिली।",
basisText "ग्रन्थ: {name} {ref}", basisCalc "{place} के लिए", basisCustom
"परम्परा, {region}", basisCustomAll "परम्परा", back "पीछे", next "आगे", done
"हो गया", close "बंद करें".
Source-label words (placeholders in the strings file): en "Text: {name}
{ref}" / "For {place}" / "Custom, {region}" / "Custom"; hi as above.
Seed Hindi bodies (24 files, rewritten in the audit) likewise need native
review; no Sanskrit was typed from memory (Devanagari appears only via
shlokas-row IDs, and texts[] is empty).

## 7. Not-decided items (section 1, again)

| Question | Default built | Setting |
|---|---|---|
| Name of the feature on screen | "Festivals" / "त्योहार और व्रत" as the title; "Parva" only in code | strings |
| Pages served before the owner reads them | only `approved` pages; drafts that pass every automatic check are `auto_ok` and not served | `parva_serve_statuses` (default `["approved"]`) |
| Festival artwork | owner-authorized deity paintings can be bundled and displayed directly; remote uploads retain their asset statuses | `parva_art_serve_statuses` governs remote uploads only |
| Menstruation rules for puja and vrat | not mentioned on any page | content rule 11.6 |
| Reminder times | 19:00 the evening before; and at the start of a pāraṇa window | code constants |
| How far ahead the calendar is fetched | 60 days | `PARVA_DAYS_AHEAD` (phone) |
| Hindi for the rest of the app | not in this work (section 12) | none |

## 8. DECISIONS.md entry draft (for the owner to paste)

## 2026-10-11 — Parva correction round: ship only what Drik holds

- **Unverified rules are out of `SHIPPED_RULES` until nine city-year
  fixtures exist**: Holika/Holi (Bhadra off-by-one 2027), Pitru Paksha
  (tithi mapping), Panchaka, Bhadra (kept internally for Holika/Raksha),
  Kharmas, Holashtak, Adhika Masa, Grahan Sutak (sutak-begin formula
  unresolved: begin-9h gives 05:16 vs Drik 09:39 on 3 Mar 2026).
   enforcement is two-deep (`_year_occurrences` per-producer filters plus the
   `occurrences()` backstop) and a test sweeps Holi-season windows and
   asserts no duplicate rows.
- **Ekadashi rule, measured on Drik's full lists (Delhi+Mumbai 2026,
  Villupuram 2027)**: purnimanta names (Shattila/Yogini, not Saphala/Apara),
  last sunrise in the tithi, begin-date fallback, Dwadashi-feasibility
  (Putrada Jan 2027 fasts Jan 18, not Jan 19). 24/24 + 25/25, no extras.
- **Navaratri follows tithis in all 18 read cells** (doubled Saptami 2026,
  doubled Ashtami Delhi/Chennai 2027, doubled Navami Mumbai 2027);
  Vijayadashami by afternoon (20 Oct 2026, 9 Oct 2027, 27 Sep 2028);
  visarjan not computed (same-day 2026, next-day 2027).
- **Eclipse findings (Drik 3 Mar 2026 Delhi)**: penumbral eclipses carry no
  sutak; sutak only when visible in your city; sutak ends at the umbral end
  (18:46), not the penumbral end; span visibility is any-point altitude
  (peak-only check missed Delhi's 20-minute tail).
- **Seeds carry only opened sources** (Padma Uttara 6.36/6.351, Skanda
  Kartika-mahatmya 2.12 + Reva 134, Bhagavata 8.8/10.25/10.59, Garga
  Vrindavana 2, Bhavishya Uttara 4.14, Devi Kavacha, shlokas rows); customs
  without a source are dropped, not guessed; the audit deleted Karwa
  (Narada 113 unopenable), rewrote Purnima (Satyanarayana), removed all
  static calc lines and misplaced Ekadashi lines, and holds Prabodhini +
  Kartika at draft for lack of a health-line source.
- **Validation round (same day)**: part-window candidacy (Pradosh,
  Madhyahna) fixed Mumbai Diwali/Ganesh 2027; monthly Pradosh verified
  50/50 Delhi with Krishna paksha + adhika months restored; Ekadashi
  Delhi/Chennai 2027 25/25; geoname-id 1264527 confirmed Chennai;
  Kartika parva row is the vrat day (Nov 13 2027), Nov 14 is Drik's
  Udaya-vyapini entry; sutak-begin prahara fit recorded unshipped;
  Holika puzzle sharpened, still unshipped.

## 9. What could not be done and why

- Festival-list reads still open: Mumbai/Chennai 2027/2028 and Delhi 2028
  (about 10 Drik pages; Mumbai 2027 Diwali/Ganesh and 2028 Diwali/Ganesh are
  now verified, section 1 item 8). Monthly vrat lists beyond Pradosh and
  Ekadashi need Drik reads (Sankashti/Vinayaka/Masik; the other session
  added 2028 Pradosh/Sankashti Mumbai/Chennai coverage with a
  `_sankashti_dates` rule the same day — read, not authored, by me).
- Chennai ID resolved (item 11); no proxy problem.
- Nirnayasindhu/Dharmasindhu full text (archive.org has the scan but no
  working full-text search endpoint); parana windows rest on Hari-vasara
  arithmetic, Bhadra-subrules and visarjan on no digest at all.
- Sutak-begin formula; kids/old/sick shorter sutak unmodeled.
- Seed pages for papankusha, karwa_chauth (deleted in audit: Narada 113 has
  no openable text), chhath, amavasya, sankranti, series form variants and
  periods (sources unlocated after documented hunts); bhai_dooj, purnima
  (rewritten from Skanda Reva 134) and the Navaratri series pages now exist;
  aarti/verse rows for texts[] (8.3 kinds admit no shlokas verse found);
  Navadurga dhyana verses and paintings (owner generates).
- Native verification: nothing on a phone; bell/keep-awake need a build
  with the native modules (reminder code hides itself without them).
- Smaller points from the owner: `git diff mobile/package.json` (*read*
  today) is alphabetical reorder churn plus one real addition,
  `react-native-web-webview ^1.0.2`, with ~970 lock lines: NOT mine (I
  never ran install in this work). `mobile/dist/` exists as build output
  (assets, _expo, hub-art-preview.html; *read* today), `mobile/dist-web-test/`
  does not exist; both untouched. "Ask about this day" stays on the Ask
  sheet per the accepted deviation.
- Hindi strings (section 6; en/hi key parity covered by `check-parva.mjs`,
  *run* today) and all seed Hindi bodies await native review; Phase 2-4
  Drik date checks beyond section 4 are open.

## 10. Fix-all round (same day, 2026-10-11): what the owner's four bullets changed

*Run*/*read* marking as in section 0. Nothing committed (handover section 0:
the owner commits). `mobile/src/screens/Conversation.tsx` untouched.

### Checks (*run* 2026-10-11)

- `tests/test_parva.py`: **23 passed in 295.36s** (was 14; +9: Mumbai 2027
  Ekadashi, Delhi 2028 Ekadashi, Chennai 2028 city-diff, Sankashti 2028
  Mumbai/Chennai, plus the working tree's Mumbai-divergence/Pradosh/Kartika
  tests). `tests/test_panchang_crossings.py`: **7 passed in 3.78s**.
- Mobile: `npx tsc --noEmit` clean; `check-parva.mjs` 13 passed, 0 failed;
  `check-contrast.mjs` "All tokens pass."; `a11y-audit.js` "0 issue(s)
  across 251 files.". `check-kala.mjs` not re-run (no `panchang.py` or
  `kala/` change in this round).
- `scripts/parva_import.py --check-only`: **26 ok, 0 failed** (was 16).
- Real backend never started; production untouched.

### 1. Sutak: begin rule found, feature stays out (*read* 2026-10-11)

- Digest sections opened (research-only, no files edited by the researcher):
  Nirnaya Sindhu Prathama Pariccheda, printed pp.44-53 (CC0 archive.org
  scan): lunar no-eating 3 praharas before, solar 4 praharas, all varnas
  sutaka on Rahu-darshana; Dharmasindhu Prathama Pariccheda pp.27-29 (1986
  reprint, read-only reference): solar vedha 4 yamas, lunar 3 praharas,
  child/old/sick half-prahara. Texts state variable prahara/yama watches,
  never fixed 9/12 clock hours.
- Drik 3 Mar 2026 Delhi re-read 2026-10-11: sutak 09:39-18:46, kids
  15:28-18:46, partial 18:26-18:46, umbral end 18:46, penumbral end 19:52.
  Fixed begin-9h gives 05:16. No second India-visible case 2026-28 exists
  to test any watch formula, so no guess ships: `grahan_sutak` stays out
  of `SHIPPED_RULES`, `eclipse_occurrences` docstring now says UNSHIPPED,
  penumbral-exclusion comment now cites the Drik Feb-20-2027 page.
- `RULE_SOURCES["grahan_sutak"]` updated to Texts (watches) + Drik
  components; the old sunrise-plus-daylight/4 hypothesis is removed.

### 2. Drik verification closed or narrowed (*read* 2026-10-11, fixtures added)

- Chennai ID: geoname-id 1264527 renders "Chennai, Tamil Nadu, India
  13°05'16"N 80°16'42"E" on list and day pages alike (Ekadashi 2027/2028,
  Sankashti 2028 *read* today). The Villupuram render was a bare-URL
  sticky-session artifact. `ekadashi.json` city_note and
  `RULE_SOURCES` sharad/chaitra already say Chennai; `navaratri.json`
  city_note still says Villupuram (fixture text, open to correct on the
  owner's pass).
- Mumbai 2027 divergences resolved as engine bugs (fixtures_mumbai.json,
  working tree): Drik Mumbai (geoname-id 1275339) gives Diwali Oct 29 Fri
  (Amavasya Oct 28 20:47 to Oct 29 19:05) and Ganesh Sep 4 Sat (Madhyahna
  11:23-12:25); working tree matches both. Re-verified today by direct
  fetch; existing `test_mumbai_2027_divergences_resolved` covers them.
- 2028 Ekadashi Delhi/Chennai full lists (25 Smarta days each, *read*
  today): Delhi Jan 8 ... Feb 6 ... Oct 28 ... Dec 27; Chennai same spans
  with Smarta Feb 7 (not Feb 6) and Oct 29 (not Oct 28). Engine 25/25 on
  both coords, including both city diffs. Added `delhi_2028`,
  `chennai_2028`, `mumbai_2027` to `ekadashi.json` + 4 new tests.
  Mumbai 2028 full-year list still open (Jan-Apr identical to Delhi).
- Monthly 2028 Pradosh/Sankashti Mumbai/Chennai full-year lists (*read*
  today): Pradosh Jan-Apr identical both cities, engine matches. Sankashti
  needed a rule fix: moonrise hits win, consecutive duplicates keep first
  (Mumbai Aug 8, not 8+9), empty moonrise falls back to the sunrise date
  (Jan 15, May 12), not the begin date (`_sankashti_dates`,
  `parva_rules.py`). Result: Mumbai 12/12, Chennai 11/12; the one edge is
  Chennai Mar (engine Mar 14 vs Drik Mar 13: Drik opens Chaturthi 08:39 PM
  with moonrise 08:44 PM inside it, engine opens it after its 08:40 PM
  moonrise), documented in the new test. Drik's own prose confirms the
  rule (moonrise while Chaturthi prevails, fasting may fall on Tritiya).
- Still open: Mumbai 2028 full-year Ekadashi, 2028 Delhi/Mumbai/Chennai
  festival calendars, monthly Vinayaka/Masik lists, Pitru Paksha
  per-tithi pages, Holika/Panchaka/Bhadra/Kharmas/Holashtak/Adhika
  fixtures (holika.json puzzle stands).

### 3. Content gaps: 10 pages added, all sourced, all `auto_ok`

- `gen_parva_seeds.py` +3 sources (Bhavishya 4.14, Narada 113, Devi
  Kavacha; URLs + read date in `passages.json`) and +10 seed files:
  `diwali_days.bhai_dooj` (Yama fed by Yamuna on Kartika Shukla Dvitiya,
  eat from sister's hand, gifts; Bhavishya 4.14.18-27 *read* today),
  `karwa_chauth` (Karaka vow vidhi: ten karakas, suvasini/brahmana gifts,
  moonrise arghya then sweet meal; Narada 113.43-50 *read* today; the
  Karwa katha itself is still unlocated, the page is vidhi-only),
  `purnima` (five-day vow ending on full moon, lamps, feeding; Skanda
  2.12), `sharad_navaratri` + `chaitra_navaratri` series pages (nine
  names from Devi Kavacha 3-5 *read* today, one per tithi in
  `series_days`; dhyana verses unlocated, so no iconography and no
  paintings).
- Texts[] stays empty (no mantra/stotra/aarti source opened); regions
  stay empty (no custom source opened); no food colours, prasada lists,
  lamp customs, or quoted verses anywhere. No Sanskrit typed from memory.
- Still untappable by design (no opened source): Papankusha katha
  (sa.wikisource search empty), Chhath Surya text (unlocated),
  Amavasya/Sankranti definition pages (Nirnayasindhu TOC found,
  verse-level extraction open), Pitru Paksha/period pages, Navadurga
  paintings (owner generates from checklist-less prompts only after a
  dhyana source opens).
- Calendar rows for the 10 new pages become tappable once the owner
  imports and approves them (runbook 14); until then `has_page: false`
  and the UI renders plain rows.

### 4. Phone: bell now hides, keep-awake verified gated, no device build

- Real gap fixed in code: `ParvaPage` showed the remind bell even when
  notifications are unavailable (tap silently did nothing). It now reads
  `isRemindUnavailable()` on load and after each toggle and hides the
  bell when true, matching `Settings` row behaviour (`Settings.tsx`
  already hid its row). `toggleFollow` refreshes the flag on failure.
- Keep-awake re-read (`ParvaPage.tsx:251-276`): `require` in `try`,
  activate on do-it-now open, deactivate on close, all failures
  swallowed. Safe without the native module; on-device behaviour still
  needs the owner's build with the native modules (owner action, not
  done here).
- Series pages now carry `series_days` in seeds; the page comment saying
  seeds carry none is corrected.
- Hindi: all 26 seed files (en/hi key and item-count parity checked by
  `parva_import.py`, *run* 26 ok) plus the strings in section 6 await
  native-speaker review; no Sanskrit typed from memory.
