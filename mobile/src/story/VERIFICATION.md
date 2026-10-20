# The Burnt Book — app verification

Completed A1–A12 for the existing prologue and Vowels reference content. The preview defaults off. The shared lesson player is extended and reused by legacy lessons, story lessons and review. No backend source was changed by this work. No commit, push, backend deployment, OTA publication or EAS build was performed.

| Work | Evidence |
| --- | --- |
| A1: persisted preview flag, live Settings switch and Learn entry | **Run:** browser toggle and persistence. **Read:** MainTabs wiring. **Not verified:** physical-device tab transition. |
| A2: ETag/hash cache, local finishes, ordered outbox, backoff/expiry, next-three lesson/art prefetch | **Run:** offline reload opens Home, Map and vowels.short; ETag, stale hash cleanup, retries, expiry, concurrent writes. **Read:** existing device artwork-cache integration. **Not verified:** native offline image eviction. |
| A3: state derivation | **Run:** backend parity cases, prologue/check/revision rules, freeing, leaves and coming-soon boundary. |
| A4–A5: exact theme tokens, language/markup and Sanskrit-first display | **Run:** both themes, persistence, all fixture text parsed/rendered without literal braces; Hindi at enlarged text size. **Read:** theme/text consumers. |
| A6: story/teach/table/summary/reading/revision/video renderers in shared player | **Run:** TypeScript and all 65 cards in seven real fixture lessons in light/dark at 360px. **Read:** reading and video wiring, optional clip bounds. **Not verified:** YouTube playback or reading content absent from this pack. |
| A7: choice/type/order/match/engine practice, first verdicts, retry gates, ordered finish posts | **Run:** 25 reference practices; all seven real backend engine fixtures; NFC; abstention; tile/keyboard input; failure/retry/success and scroll gate regression; complete vowels.short. |
| A8: mouth_map, mark_words, rhythm_tapper, letter_builder | **Run:** real cards in both themes at 360px, two-way highlights, found/missed/wrong, tap and actual pointer hold, all join targets. **Not verified:** physical-device gestures or screen readers. |
| A9: illustrated Home, road, next scene, tiles and being-written state | **Run:** new/mid/done fixture screenshots in both themes; responsive 320/430px phones, 768px tablet and landscape with no horizontal page overflow. **Read:** local canvas designs. |
| A10: virtualized five-act map, 44 units, interleaved part leaves, UnitSheet | **Run:** every unit button exists (43 planned), ready scene navigation, UnitSheet in both themes and offline map navigation. **Read:** act overview, planned units and leaf navigation. |
| A11: UnitEnd, Leaves, Ghosts, Cast and leaf page | **Run:** Dhūmaka freed, collection fixtures and UnitEnd in both themes; real backend completion and earned XP receipt. **Read:** newly recovered leaf routing. **Not verified:** future leaf recovery on a ready later unit (those units are planned). |
| A12: review and test-out | **Run:** real FastAPI TestClient/isolated SQLite; offline three-write test-out replay frees Dhūmaka and returns XP; nine due reviews replay offline and become zero due. Browser review uses shared player and sends attempts only, with original card IDs. |
| Artwork: 23 canonical paintings plus five map backdrops | **Run:** built-in image generation, blind Gemini OCR with exact NFC text comparison, 56 WebPs derived without upscaling, both public variants checked for bytes/hash/dimensions/MIME/immutable/CDN HIT; originals and rejected drafts deleted after delivery. **Read:** all paintings in the contact sheet, source briefs and character/place canon. |
| Native export inventories | **Run:** local Expo Android and iOS exports; no story painting WebPs in either static asset inventory. **Not verified:** APK/IPA installation or actual native device rendering. |

## Evidence and reproduction

From mobile/:

- node node_modules/typescript/bin/tsc --noEmit
- node scripts/check-story.mjs
- node scripts/check-story.mjs --visual
- node scripts/check-story.mjs --backend

From the repo root:

- backend/.venv/Scripts/python.exe -X utf8 mobile/src/story/artwork/deliver.py --verify
- backend/.venv/Scripts/python.exe -X utf8 -m pytest backend/tests/test_curriculum.py -q (run from backend with tests/test_curriculum.py in this session: 19 passed)

Screenshots and browser evidence: __fixtures__/screenshots/. Backend evidence: __fixtures__/backend-verification.json. Native asset evidence: __fixtures__/export-verification.json. The browser harness bundles production TSX with native-service adapters, uses the real fixture pack and fonts, and deletes its temporary entry/bundle. It is not a native device test. The backend bridge uses the real FastAPI app and an isolated temporary database; no production accounts or data are used.

Artwork prompt/history records: artwork/jobs.json. OCR: artwork/ocr/. Verified app URL overlay: artwork/manifest.json. Deliveries, provenance and local phone/tablet WebPs: artwork/deliveries.json and artwork/delivery/. Full sheet: artwork/contact-sheet.jpg. Original paths in provenance are historical; no generation PNG is retained.

## Remaining boundaries

The 43 planned units and eight later widgets remain future content work under A13/Track B, as specified. Scholar review and optional video playback are not verified. The backend image registry is unchanged to honor the no-backend-edit instruction: artwork/backend-deliveries.json contains import-ready records, while the app resolves the verified canonical IDs through its local URL overlay. Therefore backend check --release is not claimed complete.

Inputs read: HANDOVER, requested IMPLEMENTATION sections, story/types.ts, mobile/AGENTS.md, local canvas boards, prologue/Vowels sources, backend state/API/tests, artwork policy, imagegen skill and Expo SDK 57 documentation.

## Explore widgets form_explorer, role_arrows, word_shuffle (2026-10-20)

| Work | Evidence |
| --- | --- |
| Three widgets replace "coming soon" on six Act II cards (you.grid, nf1.deva, num.verbs, calling.eight, object.what, who.order) | **Run:** `npx tsc --noEmit` clean; `node scripts/check-story.mjs` passes with new logic cases (ending split, role scoring, orders); the same logic over the six real built cards (every noun form splits at its stem, every pick scores correct, 18 of 24 orders natural for who.order); a Playwright/Edge harness at 360px in light and dark clicked a noun form, named five roles (5/5, then 4/5 after a wrong pick) and moved च to the front (flagged not natural), with no page errors and no "coming soon". **Read:** the harness is a scratch copy of `visualChecks`, run against the full 234-lesson pack; screenshots were looked at, not saved in the repo. **Not verified:** a physical phone, screen readers, Hindi layout, enlarged text size, and the fixture `pack.json`, which still holds only the prologue and Vowels. |
| Backend: `word_shuffle` takes an optional authored `not_first` list | **Run:** `check --engine` 0 errors; `tests/test_curriculum.py` 19 passed (see the run below). |

## The other five widgets, and lessons that use them (2026-10-20)

| Work | Evidence |
| --- | --- |
| time_slider, word_factory, sandhi_mixer, compound_unpacker, derivation_stepper built; 26 explore cards added to written lessons: time_slider in past.augment and future.sya; word_factory in part.ktva, part.tumun, part.kta, part.shatr, part.krtya; sandhi_mixer in the eleven vowel, visarga and consonant sandhi lessons; compound_unpacker in c1.dvandva, c1.tatpurusha, c1.karmadharaya, c1.nan, c2.bahuvrihi, c2.avyayi; derivation_stepper in pg.it (रामः) and pg.prakriya (भवति) | **Run:** `npx tsc --noEmit` clean; `node scripts/check-story.mjs` passes with the new logic cases; `check --engine` 0 errors (every sandhi pair, time form, factory word and derivation target is made or checked by the engine); `tests/test_curriculum.py` 19 passed; the logic over every new card in the full pack (every root×suffix has a word, every step has its sūtra and IAST); a Playwright/Edge harness at 360px, light and dark, clicked each widget on a real lesson card (future.sya to "tomorrow", dṛś + tumun = द्रष्टुम्, हिम + आलयः joined with 6.1.101, the wrong then right kind on रामलक्ष्मणौ, all 20 steps of भवति) with no page errors. **Read:** screenshots were looked at, not saved in the repo. **Not verified:** a physical phone, screen readers, Hindi layout, enlarged text; the compound parts and kinds (scholar); the fixture `pack.json`, which still holds only the prologue and Vowels. |
| Backend: `word_factory` takes an optional `linga` (the participle lesson shows neuter forms) | **Run:** `check --engine` and the 19 tests above. |

## Swipe-only player, instructions, match board, daily hint, audio window (2026-10-20)

| Work | Evidence |
| --- | --- |
| Story lessons and reviews are swipe-only (no Back/Continue bar; Finish on the last card; "Answer this to go on" note; compact one-line header with 36-pt chips) | **Run:** `npx tsc --noEmit` clean; `node scripts/check-story.mjs --visual` passes at 360 px: the walk of `vowels.short` pages with the arrow keys, asserts no "Continue"/"Previous card" buttons exist, and that an unanswered gate cannot be passed. **Not run:** a real phone swipe (Android fling and the gate behaviour were not tried). |
| Every exercise says how to answer; match board redesigned; 195 match prompts reworded | **Run:** `check-story.mjs` logic cases for `tapPair`, `matchStatus`, `howTo`; browser walk pairs all four vowels and checks them; `python -m app.curriculum check --engine` 0 errors, 0 warnings; all 195 match cards read "Match each…" and none still says "जोड़िए" in its Hindi. English and Hindi screenshots of all twelve widgets were read by eye. |
| Daily hint (one per learner per day, shows the answer, scored "unsure") in story practice and the old Learn deck checks | **Run:** `hintDay`/`hintAvailable`/`parseHintRecord` cases; the browser walk spends the hint on a choice card (green outline, "Answer shown", swipe allowed) and the next practice card shows the used state. `check-card-lessons`, `check-learnv2`, `check-trail`, `check-lesson-art` pass. **Not run:** another day (rollover) on a device; the Play games do not use the hint. |
| Audio window: card on screen plus three ahead and three behind | **Run:** `audioWindow`/`windowClips` cases (edges, clamping, duplicates). **Not run:** any clip (none rendered); `holdClips` against real expo-audio on a phone. |
| Real backend | **Run:** `check-story.mjs --backend` (real FastAPI): passes. Backend tests `test_book_search`, `test_daily_content`, `test_gemini_pool`, `test_verse_study`, `test_curriculum`: 154 passed (the four earlier failures no longer fail). |

