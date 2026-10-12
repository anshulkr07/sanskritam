# Daily festivals, vrats, and sacred observances: implementation handover

Prepared 12 October 2026 (Asia/Calcutta). This is the specification for the next implementation task. No feature code or production database was changed while preparing this document.

## 1. Objective and user intent

Turn Parva into a useful daily observance experience across festivals, recurring vrats, sacred months, weekly worship, ancestral observances, and eclipses. Home should answer: **What matters today, how do I observe it, and what is coming next?**

The immediate trigger was a Chaturmas card below the daily card that did nothing when tapped. During ongoing Navaratri, the user could not find day 1/day 2, Maa Shailputri, puja vidhi, mantras, or aarti. A calendar date without useful content does not meet the requested outcome.

Navaratri is the first complete implementation and regression case, not the entire scope. Explicitly requested coverage includes Ekadashi, Shravan, Amavasya, Shani Dev worship, Krishna Janmashtami, grahan, sutak, and Pitru Paksha. Extend the same framework to other supported important days rather than making a separate screen for each festival.

The target is complete coverage of a maintained, explicit observance catalog. Do not claim coverage of every Hindu observance worldwide. Track unsupported traditions and missing rules/content instead of silently treating them as complete.

## 2. Confirmed current state

These findings come from reading the current working tree on 12 October 2026. The repository already contains substantial uncommitted and untracked work. Preserve it; do not reset the checkout or restore older versions over it.

| Area | What exists | Gap to resolve |
| --- | --- | --- |
| Calendar rules | `backend/app/services/parva_rules.py` calculates occurrences and period ranges; Navaratri includes date/tithi/Devi entries | Rule presence is not the same as verified support; `SHIPPED_RULES` deliberately excludes some producers |
| Home strip | `mobile/src/components/parva/ParvaStrip.tsx` loads the calendar and displays a main card plus three other rows | Picks a start-date match for today, otherwise the first occurrence; never recognises today's entry inside an ongoing series |
| Calendar ordering | Overlapping periods remain in the response and are sorted by start date | An old, long period such as Chaturmas can take the main position ahead of active Navaratri |
| Navigation | Home/list open `ParvaPage` only when `has_page` is true | Other rows are plain views; there is no basic occurrence detail fallback |
| Page body | `ParvaPage.tsx` renders explanation, materials, steps, vrat guidance, devotional text, regions, Ask, sharing, reminders | Available UI sections do not imply populated festival content |
| Series selector | Page has `dayIdx` and a row of Devi labels | Selection only changes highlighting; it does not render selected-day content or select today automatically |
| Navaratri content | English/Hindi Sharad and Chaitra seeds name nine forms and contain minimal day steps | `do.gather`, `do.steps`, `vrat`, `texts`, and regional sections are empty; day steps mostly say to remember that Devi |
| Publishing | Versioned `ParvaPage` rows; serving defaults to `approved`; import script exists | The 11 October hand-back reports production pages were not imported; current production state was not independently checked here |
| Cache | AsyncStorage calendar cache with five-minute freshness | Key omits timezone, window start, and requested day count; Home/list request English despite a selected app language |
| Reminders | Local opt-in reminders before occurrence dates and Ekadashi parana | No completed daily-series reminders or occurrence-specific notification navigation |

Additional defects to handle in the shared implementation:

- Home calculates its display date in `Asia/Kolkata` instead of the resolved observance location's timezone. Its effect does not refresh just because the day changes or the app resumes.
- Page timing lookup accepts year/place but not an exact occurrence date or selected tradition. It calculates with `north` and chooses the first slug/variant match in the year. Repeated vrats can therefore show the wrong occurrence's timings.
- The page requests a 366-day calendar to find its hero title, but the mobile API helper caps calendar requests at 120 days. This lookup can miss late-year occurrences.
- When `series_days` exists, the page uses the static nine-name list instead of the calculated dated entries. Repeated tithis and folded tithis are lost in the visible navigation.
- Seed tithi spelling and engine spelling can differ, such as `dvitiya`/`dwitiya`. Join content using stable form/content identifiers; do not depend on array index or unnormalised spelling.
- `parva_content.py` currently checks devotional text kinds but does not provide the full source/quote validation needed for rich `texts` or expanded nested day content. Passing today's validator does not establish completeness.

## 3. Coverage inventory: establish and maintain this before claiming completion

This table describes current code, not a live production audit or a fresh calendar accuracy certification.

| Observance | Current rule state | Current page/content state | Required work |
| --- | --- | --- | --- |
| Sharad/Chaitra Navaratri | In shipped allowlist; dated Devi entries exist | Minimal en/hi seeds | Complete daily content, dated navigation, active Home card |
| Ekadashi | In allowlist; variants and parana calculations exist | Generic and selected variant seeds | Verify exact occurrence selection; fill variant-specific coverage and vrat guidance |
| Amavasya | In allowlist | No current en/hi page seed in the inspected folder | Sourced significance/observance content and any named-day variations |
| Purnima/Kartika Purnima | In allowlist | Seeds exist | Review actual completeness and enrich relevant guidance |
| Shravan | Lunar calendar primitives exist, but no dedicated Shravan period producer/allowlist entry found | No dedicated page found | Tradition-aware month boundaries, Somvar/other applicable days, period and daily content |
| Shani Dev | No dedicated Saturday worship or Shani Jayanti producer/page found | No dedicated page found | Separate weekly worship from annual Jayanti; source and verify both |
| Krishna Janmashtami | In allowlist as `janmashtami` | No current page seed found | Sourced vidhi/devotional content and explicit tradition/timing handling |
| Chaturmas | In allowlist; start/end calculation exists | No current page seed found | Useful period page, practices, endpoint links, active status |
| Pitru Paksha | Producer exists but is excluded from allowlist | Page UI has a shraddha-date tool; no current page seed found | Verify daily tithi mapping/rules, publish content, enable only after validation |
| Grahan/sutak | Producer exists but `grahan_sutak` is excluded | No current page seed found | Local eclipse evidence, applicability, verified sutak rules, separate availability states |
| Other supported festivals/vrats | Many entries in allowlist: Diwali sequence, Pradosh, Sankashti, etc. | Coverage varies; some seeds exist, others do not | Audit every target and fill gaps using the shared framework |

Create a machine-readable catalog/report with slug, aliases, type, recurrence, supported traditions, rule verification references, en/hi content status, missing sections, and publication status. Date availability, content readiness, and publication must remain separate fields. A basic information page should not be counted as a complete observance guide.

Keep aliases for user spelling/search: Navratri/Navaratri, Shravan/Shravana, Pitra/Pitru Paksha, Janamasthami/Janmashtami. Resolve to stable internal slugs.

## 4. Product behavior

### Home: today and coming up

- Use one resolved location, timezone, language, and tradition consistently for calendar fetch, selection, labels, details, and reminders.
- Surface today's dated observances and the current day of active series. Example: `Navaratri · Day 2` with `Maa Brahmacharini` beneath it.
- Show active long periods such as Shravan and Chaturmas as supporting context. They must not crowd out a current festival day.
- Handle multiple same-day observances visibly. Use documented, deterministic priorities; do not discard all but one.
- Keep upcoming events separate from active periods; show actual future dates and appropriate relative labels.
- Refresh at location-local day rollover, app resume/screen focus, and relevant preference changes. Offline cached dates should be reclassified against the current date.
- Every displayed calendar item must have a useful destination. When rich content is unavailable, open a basic page with verified dates/status and an honest content-availability message. Do not expose drafts, invent guidance, or make a styled card silently ignore taps.

### Festival and observance pages

Use shared layouts driven by type, with only applicable sections:

| Type | Examples | Page behavior |
| --- | --- | --- |
| Single-day festival | Janmashtami, Ganesh Chaturthi | Significance, exact date/timings, materials, vidhi, devotional text, regional notes |
| Recurring vrat | Ekadashi, Pradosh, Amavasya | Occurrence-specific name/date, relevant fasting guidance, break-fast window where applicable |
| Sacred period | Shravan, Chaturmas | Start/end, current status, relevant dates within the period, shared practices |
| Dated series | Navaratri, Pitru Paksha | Actual calculated date entries, selected-day content, previous/today/next navigation |
| Weekly worship | Saturday Shani Dev worship, Shravan Somvar | Applicable local date and practice; clearly distinguish annual festivals |
| Astronomical event | Lunar/solar eclipse | Local visibility and contact times; separately sourced religious applicability/guidance |

For series, select the explicitly requested date/day when supplied; otherwise today if active, the first day if upcoming, and a clearly labelled date if past. Update heading, date, significance, vidhi, texts, and guidance together when selection changes. Show both chronological festival day and tithi; they are not always interchangeable.

Calendar dates remain the authority for day order. Content should resolve by stable form/day identifiers so a repeated tithi can share a Devi's content without losing either dated entry. Support multiple relevant entries on a date and separate concluding events such as Vijayadashami.

Navigation, sharing, Ask context, and notification links must carry the exact occurrence and selected day. A generic page opened later should not accidentally reset the user to a different year's or month's occurrence.

### Date reference for the initial regression

The New Delhi 2026 calendar lists 11 October as day 1/Shailputri, 12 October as day 2/Brahmacharini, and 13 October as day 3/Chandraghanta. The project fixture also includes a repeated Saptami later in the festival. Freeze the clock in tests rather than depending on the developer machine's current date.

Reference checked during this conversation: [Drik Panchang, New Delhi Sharad Navratri 2026](https://www.drikpanchang.com/navratri/ashwin-shardiya-navratri-dates.html?year=2026&geoname-id=1261481). This is a fixture reference for this location/year, not a date rule for all locations and years.

## 5. Content requirements and provenance

For each supported observance, produce English and Hindi content with applicable sections:

1. Short explanation and significance, including the named Devi/deity/day.
2. Materials needed and a practical household puja sequence.
3. Mantra/stotra/aarti with verified original text, script, transliteration, meaning, and source.
4. Offerings and vrat/parana guidance where applicable, identifying tradition-specific practices.
5. Regional/family variations labelled as such rather than stated as universal rules.
6. Source references with exact work/passage or authoritative practice reference, URL, retrieval date, and text reuse/licence information where relevant.

For Navaratri, complete all nine forms plus shared daily worship, Ghatasthapana, relevant Ashtami/Navami practices, and concluding observances. A shared Durga aarti may be reused across days if accurately labelled; do not manufacture a separate aarti for every form.

For Pitru Paksha, distinguish general remembrance, family practice, and tithi-based shraddha selection. Preserve exceptions in verified guidance; do not reduce all cases to an unexplained date picker.

For Shravan, explicitly resolve amanta/purnimanta and regional conventions before assigning the period and its Mondays. Existing tradition options are `north`, `deccan`, `gujarat`, `tamil`, `kerala`, and `bengal`; an option's presence does not prove every observance is correctly supported for it.

For Shani Dev, Saturday devotional content and Shani Jayanti are distinct catalog items. Avoid guaranteed-result claims.

For eclipses, separate astronomical calculations from religious guidance. Verify local visibility, eclipse type, applicable start/end contacts, and tradition rules. Do not use the existing fixed 9/12-hour sutak calculation as a verified universal rule. The current source comments explicitly report a sutak-start mismatch. Penumbral/non-visible cases require their own verified treatment. Any solar viewing instructions must use current authoritative guidance.

North Indian household observance in en/hi is a proposed first content package, not a user-confirmed exclusive tradition. Make it explicit, then expand coverage. Do not label incomplete regional support as complete.

Research can use models to assist drafting, but source text and ritual claims must be checked against opened sources. Do not reconstruct Sanskrit from memory or generate new ritual instructions. Label source uncertainty and withhold unverified specifics while retaining a useful basic detail page.

Audio and commissioned deity art can follow the complete text experience. They are optional enhancements, not prerequisites for tapping a festival or reading a mantra. Reuse existing media systems when suitable; do not create a second playback stack for this feature.

## 6. Data and API changes

Build on existing Parva tables/routes and page versioning. The following is a proposed contract, to be refined during implementation with backward compatibility:

- Catalog definition: stable slug/type/aliases, recurrence, priority, applicable traditions, rule evidence, language coverage, content completeness.
- Occurrence identity: slug, variant, exact observed date/start/end, tradition, resolved timezone/location context, and dated entries for series. It must distinguish multiple occurrences of a recurring vrat in one year.
- Per-day content: stable day/form key plus significance, materials/steps, devotional texts, applicable vrat guidance, and sources. Keep shared festival content separate and define explicit merge/override behavior.
- Availability: distinguish verified calendar information, basic detail, complete guide, unavailable tradition, and unpublished content. Avoid overloading `has_page` as all of these.
- Eclipse records: astronomical event identity/local visibility separate from sutak rule status and applicability. An uncertain sutak formula must not force a fabricated time or suppress independently verified eclipse information.

Extend `GET /parva/page/{slug}` to resolve the requested occurrence date and tradition, not just the first matching occurrence in a year. Reuse the same context for calendar and page calculation. Introduce a basic occurrence detail path/response that works without an approved rich body. Decide exact route shape during implementation.

Remove the truncated full-year title lookup. Carry authoritative occurrence metadata or fetch the exact occurrence through a supported API contract. The default/max browse windows are currently 60/120 days; do not silently rely on a 366-day request through a 120-day client.

Update cache identity or coverage checks to include timezone and requested window/start, and invalidate when relevant preferences change. Version cache storage if response shape changes. Cache useful published page bodies as well as dates if offline guides are part of the release; show stale state honestly and avoid presenting old timing data as freshly verified.

Strengthen schema validation for nested per-day content, devotional original text, source references, and translation parity. Existing `passages.json` tracks source metadata; metadata alone cannot validate a full Sanskrit quotation. Preserve the draft/auto_ok/approved lifecycle and ensure the latest eligible version wins, including documented withdrawal/rollback behavior.

Keep `gen_parva_seeds.py`, seed files, and import behavior consistent. Editing JSON alone while leaving a generator that erases rich sections would undo the feature on the next generation run.

## 7. File map

| Path relative to repository root | Work |
| --- | --- |
| `mobile/src/screens/Home.tsx` | Placement of Parva experience under daily content |
| `mobile/src/components/parva/ParvaStrip.tsx` | Active-day selection, ranking, navigation, refresh, language/timezone |
| `mobile/src/screens/Parva.tsx` | Catalog browsing, filters, occurrence destinations, missing-content states |
| `mobile/src/screens/ParvaPage.tsx` | Real selected-day content, dated navigation, precise metadata/timings |
| `mobile/src/parva/api.ts` | Typed catalog/occurrence/day content and query contract |
| `mobile/src/parva/cache.ts`, `keys.ts` | Correct cache coverage/identity and offline data |
| `mobile/src/parva/reminders.ts` | Occurrence/day identity, opt-in scheduling, deep links |
| `mobile/src/navigation/types.ts`, `mobile/App.tsx` | Route parameters and notification navigation as required |
| `mobile/src/i18n/` | English/Hindi labels and translation parity |
| `mobile/src/kala/`, `mobile/src/services/place.ts` | Existing location/calendar tradition integration |
| `backend/app/services/parva_rules.py` | Verified producers, dated entries, shipped allowlist |
| `backend/app/services/panchang.py` | Existing astronomy/tithi/lunar-month primitives |
| `backend/app/routers/parva.py` | Exact occurrence retrieval, basic detail, availability |
| `backend/app/models.py`, `backend/migrations/versions/` | Extend persistence only if needed; retain page versioning |
| `backend/app/services/parva_content.py` | Nested schema, source checks, completeness checks |
| `backend/app/seeds/parva/` | Reviewed multilingual page bodies and source registry |
| `backend/scripts/gen_parva_seeds.py`, `parva_drafts.py`, `parva_import.py` | Repeatable authoring and publication/import pipeline |
| `backend/tests/test_parva.py`, `backend/tests/fixtures/drik_parva/` | Rule/API/fixture regression coverage |
| `mobile/scripts/check-parva.mjs` | Existing checks; extend to exercise actual production selection helpers |

Read `mobile/AGENTS.md` before implementation. It requires the exact Expo v57 documentation before writing mobile code. No mobile feature code was written in this handover task.

Use `handover_festivals.md` and `handover_festivals_result.md` as existing design/evidence references. Recheck their claims against current code, especially production status and rule enablement. Do not copy previous test counts into a new implementation report as if freshly run.

## 8. Implementation sequence

### A. Baseline and common framework

1. Record current diffs and inspect existing tests without overwriting ongoing work.
2. Establish catalog/coverage reporting and explicit observance types.
3. Extract pure production helpers for active-date selection, dated-series content resolution, ranking, and occurrence identity.
4. Fix Home/list timezone, language, rollover/resume, cache coverage, and useful destinations for missing rich content.
5. Fix API exact occurrence/tradition lookup and selected-day route context.

### B. Complete Navaratri end to end

1. Research and prepare shared guidance plus all nine forms in en/hi.
2. Render real dated entries and resolve each selection's content; preserve repeated/shortened tithis.
3. Validate/import the reviewed content into a development database.
4. Demonstrate Home day 1/day 2, opening on the correct day, and browsing the full series with vidhi/texts.

### C. Expand the requested catalog

Complete Ekadashi variants/parana, Amavasya/Purnima, Janmashtami, Shravan and its relevant weekdays, Shani weekly worship/Jayanti, Chaturmas, and Pitru Paksha. For every item, finish rule evidence, multilingual content, and working UI together. Also audit existing shipped festivals such as the Diwali sequence and monthly vrats for the same completeness standard.

### D. Eclipses and sutak

Resolve outstanding rule evidence and local visibility/contact issues before enabling religious timing rules. Publish verified astronomical information and explicitly sourced applicability independently. Add tests for visible/non-visible, partial/total/penumbral where relevant, daylight/horizon boundaries, and tradition-dependent behavior.

### E. Release and operational verification

Run checks, review content, import eligible versions into the correct deployed database, deploy API/app changes compatibly, and verify on a real device. Ensure content survives redeployment. Test reminder permission denial and local notification navigation. Produce a final coverage report with remaining unsupported cases.

A successful Navaratri demo is an intermediate milestone. Do not mark the entire task complete while the other explicitly requested categories remain unresolved.

## 9. Verification and acceptance criteria

Use deterministic clock and place fixtures plus tests of production helpers/API behavior. Existing script comments about series selection do not prove the current screen displays selected-day content; test the actual shared implementation.

| Scenario | Required result |
| --- | --- |
| Delhi, 11 Oct 2026 | Home surfaces Navaratri day 1/Shailputri; tap shows that day's guide |
| Delhi, 12 Oct 2026 | Home surfaces day 2/Brahmacharini even though the series began yesterday |
| Chaturmas overlaps Navaratri | Long period remains accessible without replacing the active festival day |
| Repeated/shortened tithi | Actual dated entries are retained; content maps to the correct form, not array position |
| Change selected day | Heading/date, description, vidhi, devotional text and applicable guidance change together |
| Open a later Ekadashi | API and page show that occurrence's name/timings/parana, not January's first match |
| Late-year festival | Correct hero metadata without a truncated full-year calendar request |
| Midnight/resume | Active day updates in the observance timezone without restarting the app |
| Change language/place/tradition | Calendar, body, availability and cache agree with preferences |
| Request 60 then 120 days | Cached shorter response does not prevent loading the longer window |
| Rich body missing | Item opens useful verified information; no silent tap or fabricated sections |
| Offline after loading | Available cached details work; stale dates/timings are handled explicitly |
| Shravan regional boundaries | Period and relevant weekdays match independently verified selected conventions |
| Shani Saturday vs Jayanti | Weekly worship and annual observance remain distinct |
| Pitru Paksha | Verified range/day mapping; shraddha lookup and exception guidance remain coherent |
| Grahan/sutak | Correct location-specific evidence and clear applicability; unverified timings are withheld |
| Reminders | Opt-in, future-only, no duplicate scheduling, and correct occurrence/day opens |
| Publication | Unpublished/withdrawn versions do not leak into served content |

Suggested development checks from their respective directories, after implementation:

```powershell
# backend: use an isolated test/development database
.\.venv\Scripts\python.exe -m pytest tests/test_parva.py -q
.\.venv\Scripts\python.exe scripts/parva_import.py --check-only

# mobile
npx tsc --noEmit
node scripts/check-parva.mjs
```

Important: the current import script calls `init_db()` and opens the configured database even with `--check-only`. Set an isolated test/development database through the existing configuration before validation; do not describe it as guaranteed free of database side effects.

Add meaningful API tests for exact occurrence/date/tradition lookup, basic detail availability, content version eligibility, and nested content validation. Run relevant calendar/i18n/accessibility checks and a device walkthrough. Broaden tests when shared rules/contracts change, using the repository's normal workflow.

Content review must verify Sanskrit, transliteration, Hindi meaning, references, regional attribution, and readability. Long aartis should remain readable with large type; day navigation must expose selection and useful dates to screen readers. Do not treat an empty section as completed content merely because it passes a schema check.

## 10. Publication and deployment runbook

1. Reinspect the deployed API revision and content database. The reported empty production pages are historical evidence, not a fresh production diagnosis.
2. Verify the actual database destination, backup/restore procedure, migration behavior, and storage persistence. Keep credentials out of documentation and output.
3. Validate source evidence and en/hi data; prepare eligible publication versions using the existing status lifecycle. Never change serving to include every draft to make taps work.
4. In an isolated environment, import with the existing script, for example `scripts/parva_import.py --slug sharad_navaratri`; check resulting versions and availability through authenticated API requests. Import Chaitra/shared content as appropriate.
5. Deploy API schema/contract changes compatibly, then the appropriate mobile update/build according to existing deployment workflow. Treat new native capabilities separately from JavaScript-only changes.
6. Import reviewed content into the verified production database as part of a repeatable release step, not an accidental developer-machine write. Migrations creating tables alone do not populate page bodies.
7. Verify actual Home card, exact day/occurrence page, language selection, timings, missing-content destination, and optional reminder links on the device.
8. Record release revision, content versions, evidence/check results, supported catalog/traditions, and remaining gaps. Include a rollback procedure that actually prevents withdrawn content from remaining served or cached.

Completion means the shared daily experience works, the explicitly requested catalog has verified and published useful coverage, and real API/device behavior has been demonstrated. Honest unsupported states are required where evidence is unresolved, but they are remaining coverage work and must be reported as such.

## 11. Cleanup performed while preparing this handover

Removed only identified disposable or duplicate material:

- Root `ERROR)`: empty accidental shell artifact.
- Root `m[0]).slice(0`: accidental saved evaluation syntax-error response.
- `icons - Copy/`: 57 files, approximately 30.6 MiB. Every file had an identical SHA-256 counterpart at the same relative path under `icons/`; no references to the copied directory were found in the searched project files. Original assets remain.
- Root `.pytest_cache/` and `backend/.pytest_cache/`.
- Python bytecode caches at `backend/app/__pycache__/`, `backend/app/routers/__pycache__/`, `backend/app/services/__pycache__/`, `backend/app/seeds/__pycache__/`, `backend/tests/__pycache__/`, and `backend/scripts/__pycache__/`.

The inspected cache folders contained 293 generated files, approximately 7.3 MiB. Together with the duplicate assets and two shell artifacts, the cleanup removed 352 files, approximately 38 MiB. Caches may be recreated during later runs.

Existing handovers, source changes, untracked source/fixtures, environment backups, credentials, databases, runtime storage, generated chant audio/review records, and design/demo artifacts were retained. Their names or ignored status alone do not establish that they are unwanted. The copied icons and shell artifacts were tracked, so their removal appears as intentional deletions in Git; no commit was created.

## 12. Suggested instruction for the implementing agent

> Implement `handover_observances.md` in the current working tree. Preserve existing uncommitted work and read applicable repository instructions. Build the reusable daily observance framework, complete Navaratri first, then complete the other explicitly requested categories using the coverage inventory. Fix active-day selection, exact occurrence/tradition retrieval, dated-series rendering, language/timezone/cache behavior, and silent non-interactive cards. Research and validate en/hi devotional content with source evidence. Keep unverified calendar and sutak rules out of served timing guidance until verified. Demonstrate production-helper/API tests and real device behavior, and report actual published coverage and unresolved gaps. Do not stop at importing today's minimal seeds or at a Navaratri-only demo.
