# Sanskritam: Home-only implementation handoff

Date: 2026-10-13. Implementation checkpoint: Home-only work is in the working tree.

## 1. Final owner decisions and scope

This document records the approved design and scope. The current working tree contains a first implementation pass; see the checkpoint below for what is implemented and what still needs editorial or device work.

## Implementation checkpoint

Implemented in this pass: Home Explained Today context and square surfaces; a cohesive festival card; festival detail timing motion, selected-place calculations, local japa count and pre-window reminders; Word Journey language-branch presentation and five-item history; Do You Know share previews and a more evidence-led fact-generation prompt; the revised daily cards; and opt-in Home daily rashi setup. The Home Words entry is removed and Discover is labelled Introduction. Introduction now appears near the top because the existing story storage records only a bookmark, not a completion state.

Verification completed: mobile `npx tsc --noEmit`; mobile `node scripts/check-contrast.mjs` (all checked tokens pass); backend `python -m pytest -q tests/test_daily_content.py` (32 passed); backend `py_compile` for the edited fact-generation service; and `git diff --check` on the implementation files.

Still open: add and dictionary-check more regional/international Word Journey routes; approve/import the correct Navratri day artwork; review and expand festival editorial content and validate city/tradition-specific reminders on a device; verify the post/story export, notification tap-through and japa persistence on native devices; and add a real story completion marker if Introduction should move down after completion. Current fact prompt changes affect future generated content; existing approved fact records still need editorial review. The shared Shloka stack screen is the Home daily-shloka destination; the Read tab and shared reader were not changed.

The owner's latest instruction overrides the earlier, broader request: **only Home; do not change Learn, Talk, Play or Read.** For this handoff, Home includes the hub and its festival, Word Journey, Do You Know and daily-content experiences. It does not include teaching, writing, games or reading-library features merely because Home links to them.

| Area | Final decision |
| --- | --- |
| Today card | Use the **Explained** variation, option 2 in the Today preview. |
| Visual identity | Keep the current theme, palette, font families and navigation identity. This is a refinement, not a new theme. |
| Corners | Square corners on app-owned Home cards, buttons, inputs, panels, sheets and share layouts. No pills or rounded rectangular surfaces in this scope. |
| Daily Shloka / Daily Word | Reject the preview's pink-and-green pairing. Use existing deep slate and deep ink fills with cream text. |
| Festivals, Word Journey, Do You Know, Rashi | Proceed with the approved Home-focused direction, subject to the accuracy and engineering requirements below. |
| Varnamala | Leave the existing single-page experience and animation unchanged in this task. |
| Writing / pronunciation / lessons | Excluded by the final Home-only instruction. |
| Learn / Talk / Play / Read | No visual, functional or content changes. |

Do not implement the earlier Varnamala microphone/scoring work, animation retiming, writing calibration, stroke animations, camera flow or learning-page redesign under this handoff. These are deferred, not silently considered completed.

### Strict boundaries

- Do not change global theme radii, typography, spacing or colour defaults to achieve the Home design. Apply Home-scoped styles or an explicit opt-in component variant that leaves all other consumers unchanged.
- Do not restyle the shared tab bar, app-wide drawer, Guru, Ask, shared reader or shared learning components.
- Add only the route registrations/types and backward-compatible data support necessary for the Home features. No navigation restructuring.
- A shared destination must retain its existing presentation outside Home. Prefer a small Home-specific presentation layer over changing a shared screen's default behaviour.
- Preserve existing Varnamala, Writing, lesson and game destinations even when their entry tile appears on Home.
- The separate Daily Word **puzzle** belongs to Play and must remain intact. The new Home Daily Word is a vocabulary feature, not that puzzle.
- Do not reinterpret older handovers as authorization to expand this task or repeat their historical release/version changes.

## 2. Design references and precedence

The reviewed local prototype is at `http://127.0.0.1:8766/walkthrough.html` while its local preview server is running.

Preview files are outside the repository at:

`C:/Users/AnshulKumar/.codex/visualizations/2026/10/13/01a135b5-ed5e-74d2-be26-1109a7957245/shabd-review/`

Relevant files: `walkthrough.html`, `walkthrough.css`, `walkthrough.js`, `today-variations.html`, `full-home-preview.png`, `full-festival-preview.png`.

Precedence: this handoff's final owner decisions, then the current application's established identity, then the preview's approved layout and interactions. In particular, do not copy the preview's rounded corners, pink/green daily cards or simplified Varnamala. The prototype contains simulated interactions and example data; it is not production logic or an authoritative source for festival times.

The owner rejected a substantial theme/font redesign. Do not revive the earlier theme alternatives. Use the product name Sanskritam; retain existing internal identifiers and storage prefixes.

## 3. Visual treatment within Home

Reuse the existing tokens in `mobile/src/theme.ts`:

- Paper background: `#FFF8EE`; primary ink: `#3B2E25`; secondary ink: `#7A6A5C`.
- Slate: `#2F4677`; teal: `#17535C`; maroon: `#5E2216`; established saffron accents for actions.
- Light text on deep fills: `#FFF8EE`. Do not use pale pink or pale green feature panels.
- Existing Nunito UI fonts and Baloo 2 Devanagari headings; retain existing script-specific font coverage. Do not introduce a new font family or globally redistribute font roles.
- Daily Shloka: deep slate with cream text. Daily Word: deep ink with cream text. Verify secondary text, icons, pressed states and disabled states as well as headings.

Set the corner radius of Home-owned surfaces and controls to zero, including image masks, badges, tab-like selectors, dialogs and exported share cards. Do not simply modify the global `radius` object. Audit hardcoded radii in the affected views as well.

Actual moon/clock geometry can remain circular: these are diagrams, not rounded container styling. Preserve meaningful astronomy graphics without circular button frames or pill labels. Native system permission/share dialogs are outside the app's visual control.

Use restrained dividers, generous alignment and clear hierarchy. Avoid decorative nested boxes, floating loose text, excessive badges and repetitive action buttons. Keep existing side padding and safe areas. Touch targets remain at least 44dp even when visually compact. Sanskrit text respects the existing type-scale minimum. All motion supports Reduce Motion; information must remain available without animation.

## 4. Home hub and Explained Today card

Keep the greeting, existing Guru scale, streak/XP behaviour and navigation identity. Arrange the daily content into a readable sequence: greeting, Today, festival, a compact Introduction entry when unfinished, Word Journey, Do You Know, Daily Shloka/Word and Daily Rashi. Keep utility entries compact. Move the Introduction entry lower when its existing completion state says it is finished.

Use existing completion state, not a guessed last-viewed index or a new conflicting progress store. Renaming/reordering the Home entry is in scope; redesigning its learning destination is not.

### Explained Today

Preserve the moon visualization, existing slate character and current tithi calculation. Add short, labelled explanations that a first-time visitor can understand:

- The tithi name plus its plain-language lunar-day explanation.
- Paksha plus the waxing/waning explanation.
- The current day's relevant details, with readable labels instead of unexplained Sanskrit terms alone.
- An explicit end time and next tithi, with a clear city/timezone context.
- A concise detail action using the existing calendar destination. Keep that destination unchanged unless a Home-only explanation can be added without affecting other consumers.

Use compact rows and hierarchy rather than a paragraph inside the card. Do not replace real values with preview samples. Preserve script/language preferences, loading, unavailable, retry and midnight/transition refresh states.

`mobile/src/kala/useToday.ts` and the local astronomy modules already compute this data. Reuse them. If location is inferred from timezone/defaults, show the assumption and a way to choose a location; do not imply the user supplied it.

### Home entry cleanup

- Remove the separate **Words / Vocab entry card** from Home only. Do not delete vocabulary routes, data or other entry points.
- Rename the Home **Discover** entry to **Introduction** and adjust its position by completion.
- Preserve Varnamala and Writing behaviour. A Home tile can adopt square corners without modifying its destination.
- A broken Home entry may be fixed at its own route binding. The earlier request to repair internal Introduction/Sandhi learning links is deferred if it requires touching Learn or Play.

## 5. Festival card and festival detail

### Home festival card

Replace the basic strip and visually disconnected text with one coherent feature: artwork, festival name, relevant day/deity, one useful sentence and the next relevant timing/action. Present supporting observances and upcoming festivals as aligned rows within a clear section. Preserve discoverability when several observances share a date.

Use `ParvaStrip` and the existing selection/date rules. Do not silently hide observances that lack rich editorial content; keep their existing date-information fallback.

### Festival detail hierarchy

1. Hero with relevant artwork, name, date, city/tradition and selected festival day.
2. A concise explanation of what today signifies and which deity is associated with it.
3. Muhurta/timing display with a restrained clock visualization and explicit textual times.
4. A simple practical overview, then expandable sections for the deeper material.
5. Mantra with whole-mantra meaning, available audio and a simple japa counter immediately beneath it.
6. Puja vidhi and samagri, with a simple low-budget option.
7. Vrat guidance, forms of observance and breaking-fast information where applicable.
8. Aarti, celebration guidance, tradition-specific do/avoid notes, origin and textual references.
9. Clear reminder and share actions.

Do not make the page a wall of expanded text. The essentials should be visible first; accordions or clear section navigation reveal supporting detail. Do not hide exact timing behind the animated dial.

Handle multi-day festivals explicitly. For Navratri day 3, the selected day, deity, artwork, mantra and guidance must correspond to Chandraghanta after editorial verification. Do not use a generic image as if it were the correct day's deity. Missing art must have an intentional, honest fallback.

### Existing implementation to extend

`mobile/src/screens/ParvaPage.tsx` already contains much of the festival structure, references, sharing and reminders. Inspect the live code before changing it. Some apparent gaps are content/asset/publishing issues rather than absent UI. Preserve valid existing date, regional and selected-day logic.

Relevant support lives in `mobile/src/parva/`, `backend/app/routers/parva.py`, `backend/app/services/parva_rules.py`, `parva_content.py`, `parva_catalog.py` and `backend/app/seeds/parva/`. Use the established import workflow. Check `specs/parva-art/README.md` before adding deity artwork. Preview `chandraghanta.png` is concept art, not automatically approved iconography.

### Timing and reminders

- Dates/windows must be specific to the chosen city, timezone, date/year and supported tradition. Show these inputs and the calculation/source context.
- Separate auspicious windows, observance dates and practical suggested schedules. Never label a convenient suggested hour as a computed muhurta.
- Show exact start/end labels, including next-day dates when a window crosses midnight. Unsupported or unavailable timings get an honest state, not invented defaults.
- Let users request reminders before relevant windows, including Raksha Bandhan and applicable parana windows. Offer a small, understandable offset choice.
- Ask notification permission only after the user enables a reminder. Handle denial, revocation, cancellation, timezone/location changes and expired windows.
- Reuse the existing local notification/tagging machinery. Inspect `mobile/src/parva/reminders.ts` and related navigation code; existing scheduling is not a complete arbitrary muhurta reminder system.
- Deduplicate scheduled notifications and cancel stale ones when settings change. A tap should open the correct festival/day. Do not promise exact delivery that the OS cannot guarantee.

### Japa and content

Provide count, increment, undo, reset and a simple target. Persist by the chosen mantra/session so leaving the page does not lose progress. Reset requires an intentional action; counts must not bleed into another mantra. Accessible labels should report progress; haptics are optional and follow preferences. No leaderboard or gamified pressure.

Mantras/aarti need verified text and named sources. Supply whole-text meaning, not word-by-word clutter. Distinguish shastric references, historical evidence, regional practice and contemporary suggestions. Do not claim that one regional practice is mandatory for everyone. Low-budget puja should be a respectful practical alternative with optional items clearly marked. Vrat content describes tradition without claiming fasting is universally suitable or giving medical promises.

## 6. Word Journey

Add a short subtitle explaining that the feature explores words derived from Sanskrit. Where a relationship is a cognate or uncertain connection, label it accurately rather than forcing it into that claim.

Move the language branches near the top: one Sanskrit root can connect to many languages. Show original script, readable transliteration where useful, language name and relationship. Let the user inspect intermediate routes and evidence below. Use the current content schema's multiple routes; do not model this as a single source-to-target pair.

Broaden the curated selection beyond Hindi and English to other Indian and international languages. Verify each relationship independently. For the user's ratri example, check Hindi/Urdu and any proposed Kannada/Tamil form against reliable dictionaries; similar spelling alone does not establish derivation. Clearly distinguish descent, borrowing through intermediate languages and shared ancestry.

Use `mobile/src/screens/WordJourney.tsx`, `mobile/src/words/WordCard.tsx`, `RouteLadder.tsx` and the existing word-origin service/seeds. The current screen already supports multiple routes but presents secondary languages too low.

Show only the **five most recent previous entries**, excluding today's/current entry and duplicates. This is a visible-history limit, not a database deletion requirement.

## 7. Do You Know and sharing

Replace random verse-plus-meaning content with a curated, surprising insight, a short meaningful explanation and inspectable evidence. A verse should appear only when it supports the actual claim. State the source, passage/edition where known and what the evidence does and does not establish.

Editorial requirements:

- Ancient prosody/combinatorics is a suitable direction, but distinguish Pingala's contribution from later authors and later formulations of number sequences.
- Do not present popular Hanuman Chalisa distance arithmetic as a verified ancient measurement of the Earth-Sun distance.
- Do not present approximate astronomical ratios involving 108 as exact constants or proof of a text's authorship/date.
- Do not publish an Einstein/Vedas quotation or attribution without a traceable reliable source.
- Replace unsupported examples with strong sourced material rather than dressing speculation as fact. Keep uncertainty visible when it is central to a claim.

Improve the Home fact card and its detail page using the same existing visual identity. Show only the five most recent previous entries in history, excluding the current item.

For facts and festivals, provide polished **4:5 post** and **9:16 story** export layouts, square corners, readable script rendering, safe margins and source attribution. Fact shares should include the core insight, relevant verse/excerpt when available, explanation and enough source information to verify it. Preview the actual export before sharing; paginate or shorten editorially rather than clipping long content. Respect source quotation/asset rights. Use the existing share path where practical, with proper cancellation/failure handling.

Relevant files: `mobile/src/screens/DoYouKnow.tsx`, `mobile/src/facts/FactCard.tsx`, existing facts API/content and festival share code.

## 8. Daily Shloka and Daily Word

### Daily Shloka

Improve the Home tile and Home-facing reading presentation with deep slate, cream text, a legible verse, one whole-verse meaning and source. No word-by-word explanation. Keep existing reliable audio if available. Do not modify Read's shared reader, recitation or learning flows to achieve this; use an isolated Home presentation where necessary.

### Daily Word

Show a medium-to-difficult Sanskrit word and its concise meaning. No puzzle controls, tries, letter grid or word-by-word breakdown in this Home feature. Use deep ink and cream text. Curate verified words rather than generating unreviewed Sanskrit from memory.

**Integration hazard:** `mobile/src/screens/DailyWord.tsx` and Home's current `api.dailyWord` consumer refer to the existing daily puzzle. Other game work also uses this contract. Preserve the puzzle route, API, rankings and hidden answer. Introduce a separately named Home vocabulary contract/presentation, such as `DailyVocabulary`, and point the Home card to it. Do not expose today's puzzle answer through the vocabulary feed.

## 9. Daily Rashi

Add a restrained Home card and Home-owned setup/detail view. Offer one-time, opt-in setup, with skip, later edit and removal. Let users provide a known rashi or choose a birth-details-based calculation using date, time and place. Unknown birth time must remain unknown; do not silently substitute a precise time.

Reuse applicable existing kundli calculation services after inspecting their contracts. State the basis of the displayed result, location/timezone and any relevant limitation. Do not conflate a known sign with a calculated birth chart. Separate calculation accuracy from traditional astrological interpretation; do not promise scientifically accurate personal predictions.

Store only needed inputs, explain their purpose briefly and respect existing account/privacy handling. Do not ask again on every Home visit. Do not alter Talk/Ask behaviour or reuse their interface as part of this work. Handle skipped setup, partial input, loading, unavailable service and removal cleanly.

## 10. Implementation discipline

Read applicable repository instructions and `mobile/AGENTS.md`. Before writing Expo code, consult the exact versioned documentation required there: https://docs.expo.dev/versions/v57.0.0/ .

The working tree contains concurrent work, including games and shared screens. Inspect current diffs before editing. Do not reset, overwrite, reformat or absorb unrelated changes. Route/API additions must preserve old consumers and tolerate absent new response fields or unavailable new endpoints. New backend work must support Home only and remain backward compatible.

Suggested sequence:

1. Identify Home ownership and shared consumers. Record the baseline of Learn, Talk, Play and Read before editing.
2. Apply Home-scoped square surfaces, existing fonts and the revised daily-card palette; build the Explained Today card and tidy Home ordering.
3. Extend festival content presentation, correct assets, japa, timing/reminders and sharing.
4. Improve Word Journey and Do You Know, source curation and the five-entry histories.
5. Add isolated Daily Vocabulary, Home daily-shloka presentation and opt-in Rashi.
6. Verify the complete Home flows and confirm unchanged excluded areas.

Do not commit, deploy the backend or run an EAS release build. The owner handles those actions. Do not bump release versions based on the old October overhaul handover. Do not use prototype sample data as a production fallback.

## 11. Acceptance and verification

### Scope and visual checks

- Home uses Explained Today option 2 and the current product fonts/palette.
- No Home-owned rounded cards, inputs, buttons, image masks, selectors or exported frames remain.
- Global theme defaults and Learn/Talk/Play/Read presentation and behaviour are unchanged. Shared component changes are opt-in, with existing defaults preserved.
- Varnamala's single-page layout, animation and microphone path are unchanged; Writing is unchanged.
- Daily cards no longer use the rejected pink/green pairing. Check normal text contrast at 4.5:1 and large text/UI indicators at applicable 3:1 thresholds.
- Small screens, large text, long translations, multiple scripts and safe areas work without clipped text or horizontal overflow. Screen-reader roles/labels and Reduce Motion paths remain usable.

### Functional checks

- Today refreshes across midnight/tithi transition and shows the correct location/timezone assumptions.
- Festival day/deity/art/mantra remain synchronized; missing art/content has a deliberate fallback. Existing regional/date logic remains correct.
- Timings handle cross-midnight windows, location changes and unavailable data. Reminder permission, deduplication, rescheduling, cancellation and notification deep links work on a real device.
- Japa survives navigation/relaunch as designed; undo/reset and switching mantras do not corrupt another count.
- Word Journey supports multiple languages with accurate relationship labels. Both histories show at most five previous unique items.
- Fact sources support their claims; unverified viral assertions are absent. Post/story exports preserve glyphs, margins, sources and square corners.
- Home vocabulary is separate from Play's puzzle and does not reveal its hidden answer. Read and its shared readers remain unchanged.
- Introduction's Home entry follows existing completion state. Removing the Home Words tile does not remove vocabulary functionality elsewhere.
- Rashi setup respects skip, persistence, edit/removal and unknown inputs. Error/offline/loading states remain understandable throughout Home.

Run repository-required checks appropriate to the final change, including mobile TypeScript and contrast checks and backend tests if backend changes are made. Current handover commands are `npx tsc --noEmit` and `node scripts/check-contrast.mjs` from `mobile`, and `./.venv/Scripts/python.exe -m pytest -q` from `backend`. Verify current instructions and dependencies before executing.

Add targeted tests for changed data/routing/reminder logic where they catch real regressions. Do not create tests that merely duplicate styling constants. Browser previews cannot validate native microphone, notifications or share behaviour. Report actual checks and any untested device cases honestly; do not claim a static prototype proves them.

At hand-back, provide changed files, Home screenshots, concise behavioural results, test outcomes and remaining content/device limitations. Explicitly confirm that Learn, Talk, Play, Read, Varnamala and Writing were left unchanged by this task.

## 12. Research references

These support design/content investigation, not blanket approval of any particular claim or copied text:

- Progressive disclosure: https://www.nngroup.com/articles/progressive-disclosure/
- Day-clock interaction inspiration: https://sundialapp.com/
- Motion/accessibility guidance: https://developer.apple.com/design/human-interface-guidelines/motion
- Prosody and combinatorics, Rachel Wells Hall: https://sanskrit.uohyd.ac.in/Algorithms_in_Ancient_India/Material/mathforpoets.pdf
- Location-sensitive Raksha Bandhan timing reference: https://www.drikpanchang.com/festivals/raksha-bandhan/raksha-bandhan-date-time.html
- Astronomical fact checking: https://science.nasa.gov/moon/facts/

Verify passage-level claims, calculation inputs and reuse rights before publishing content. A source link alone is not evidence that every sentence in a generated card is correct.
