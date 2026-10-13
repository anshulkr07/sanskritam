# Result: games daily multiplayer — implementation handover

**Date:** 13 October 2026, Asia/Kolkata
**Brief:** `handover_games_daily_multiplayer.md`
**Status of this document:** maps every requirement area to changed files and evidence, and separates **implemented**, **tested**, **externally blocked**, and **not verified**. Nothing here claims device verification that did not happen: the mobile app compiles and passes its static harnesses, but no Android/iOS device run occurred in this session (no device access — see §7).

---

## 1. Verification snapshot

| Check | Command (from repo root) | Result |
| --- | --- | --- |
| Full backend suite | `cd backend && python -m pytest tests -q` | **1901 passed, 16 skipped** |
| Numeral engine (new) | `python -m pytest tests/test_numerals.py -q` | 57 passed |
| Play sessions/allocations (new) | `python -m pytest tests/test_play_sessions.py -q` | 8 passed |
| Multiplayer rooms/queue (new) | `python -m pytest tests/test_play_matches.py -q` | 5 passed |
| Friends + weekly goal (new) | `python -m pytest tests/test_play_social.py -q` | 4 passed |
| Share links/attribution (new) | `python -m pytest tests/test_play_share.py -q` | 4 passed |
| Recitation rubric v2 (new) | `python -m pytest tests/test_recite_v2.py -q` | 8 passed |
| Multi-shloka sets (new) | `python -m pytest tests/test_competition_sets.py -q` | 4 passed |
| Admin content lifecycle (new) | `python -m pytest tests/test_play_admin.py -q` | 3 passed |
| Account deletion with new tables | `python -m pytest tests/test_account_deletion.py -q` | 2 passed |
| Legacy competitions/recite unchanged | `python -m pytest tests/test_competitions.py tests/test_recite.py -q` | 7 passed |
| Mobile TypeScript | `cd mobile && npx tsc --noEmit` | clean |
| Mobile harnesses | `node scripts/check-recite.mjs; node scripts/check-query.mjs; node scripts/check-contrast.mjs; node scripts/check-screen-layout.cjs` | all pass (recite: 83 assertions) |

---

## 2. Number Builder engine (brief §4.7) — **implemented + tested**

Files: `backend/app/services/numerals/` (`__init__.py`, `structure.py`, `lexicon.py`, `render.py`, `scoring.py`, `fixtures.py`), `backend/tests/test_numerals.py`.

- Numbers stored as decimal strings end to end; no float ever touches a canonical value. Range 0–999,999,999, ≤3 fractional digits, negatives for advanced casual packs, trailing zeros preserved (`10.00`, `100.340`).
- International **and** Indian display grouping. Owner's example verified exactly:
  - `104,847,322.34` / `10,48,47,322.34`
  - English international: "One hundred four million eight hundred forty-seven thousand three hundred twenty-two point three four"
  - English Indian: "Ten crore forty-eight lakh forty-seven thousand three hundred twenty-two point three four"
  - Sanskrit: `दश कोटिः अष्टाचत्वारिंशत् लक्षम् सप्तचत्वारिंशत् सहस्रम् त्रीणि शतम् द्वाविंशतिः दशमंशे त्रीणि चत्वारि` = the brief's decomposition `10×10⁷ + 48×10⁵ + 47×10³ + 3×10² + 22 + 3/10 + 4/100`.
- 54 round-trip fixtures (18 values × Sanskrit/English × groupings) compose→parse to the exact string, including `0, 1, 19, 20, 21, 48, 99, 100, 101, 1000, 100001, 10000000, 104847322.34, 999999999.999, -12.04, 0.04, 10.00, 100.340`.
- Scoring = `round_half_up(60·C + 25·S + 15·L)` with per-component renormalisation when a component has no assessed decisions; rubric examples reproduce (one-of-five wrong → 91 on the 7-decision owner prompt; half structure → **88** via 87.5 half-up; blank → 0; scale error lowers S with the coefficient still credited; criterion-level evidence returned; a wrong scale that still parses does **not** additionally zero L — the parse failure path groups it into one grammar criterion instead). Round score `10 × mean(5 prompts)` rounded once.
- Dropdown menus: 4–8 plausible same-shape options per slot, shuffled by seed, never marked; digit-reading mode rejects "point thirty-four"; two coefficients in a row are not a construction; duplicate-surface ambiguity cannot arise (validated at lexicon build).

**Linguistic status (honest):** the Sanskrit lexicon (0–99 with sandhi, एकोन- x9 primaries, unit-first variants), scales (कोटिः/लक्षम्/सहस्रम्/शतम्), decimal marker `दशमंशे`, and negative marker `ऋणम्` are **draft-pending-linguistic-review** (`numerals.REVIEW_STATUS`, version `nb-1`, convention recorded in `CONVENTION_NOTE`). Sources consulted: Whitney ch. VI, learnsanskrit.org number-words/big-numbers (background for cardinals/scales, **not** a certified modern decimal convention — that review is the owner's outstanding step, listed in §7). The golden owner fixture exists and is a release requirement met at the code level; publishing the Sanskrit reading as "reviewed" requires that sign-off. IAST comes exclusively from vidyut lipi via `app/services/iast.py`.

## 3. Server-validated scoring, sessions, allocations (§5) — **implemented + tested**

Files: `backend/app/services/play/{catalog,rubrics,packs,sessions,boards,social,matches}.py`, `backend/app/routers/play.py`, migration `backend/migrations/versions/d5e6f7a8b9c0_play_games_v2.py`.

- **Game score ≠ ranked points ≠ learning XP ≠ goal ≠ wins** — separate tables (`game_sessions`, `game_day_scores`, `daily_game_points`); XP still flows only through the existing `daily_activity` ledger in tiny amounts (2 XP per finished round), never through ranked totals.
- **Rubric v1** (`play/rubrics.py`, frozen string `v1`) implements the brief's table exactly: Smriti `600·(K/P)+400·(K/P)·min(1,K/M)` (fewer attempts never scores worse at equal completion — monotonicity asserted); Rush mean of `900·correct+100·correct·speedFactor` from **server** timing windows; Varna Jaal `900·found/required` + 100 speed only when all found; Daily Word 1000…500/0 with completed-participation; Word Groups `250·solved − 25·wrong` clamped (group-count scaled); Pada Path/Number mean×10, no speed bonus.
- **Allocations:** ranked start reserves one of 3/day per game (Daily Word 1 via its own bridge); hints convert the round to practice and the allocation stays consumed (no answer-peek retry); abandon before deadline doesn't score; verified server failure releases the allocation (void); finish beyond deadline+120 s grace voids rather than fabricates. Double finishes return the stored result (idempotent; `UniqueConstraint` on idempotency keys).
- **Daily aggregate:** best of **three distinct games**, ≤3000, recomputed transactionally in the same commit as the score write; rounds_done counts valid finished rounds in any mode for the personal goal (3/day); streak preserves yesterday before today is due. **All shared boundaries are Asia/Kolkata** (`sessions.ist_day`, `boards.ist_today`); IST explanation ships in the summary payload.
- **Ties share competition rank (1,2,2,4)**; stable id only fixes display order; participation counts distinct ranked days; weekly = sum of daily totals in the ISO week (Mon–Sun IST), monthly = sum of days in the calendar month (never a sum of weeks).
- **Old endpoints cannot bypass validation:** legacy `/games/result` is untouched and only awards legacy XP — it writes none of the ranked tables. Old `game_results` history is retained unranked; nothing was backfilled.

## 4. The seven games' server side (§4) — **implemented + tested**

`play/packs.py` builds per-round packs with **server-held keys**; client views strip answers (asserted by tests: no `cards`, no `correct_value`, no `canonical` in payloads).

- **Smriti:** server-authorised reveals with a hard flip limit (two open cards; 429 beyond), attempts counted server-side, decks word-meaning / letters / **picture-word** (images) / sound-picture (audio refs); ranked = 8 pairs fixed spec; per-pair-count personal bests come from `game_day_scores` (6-pair rounds never compare with 10-pair).
- **Shabda Rush:** 10-question balanced mix incl. picture-word and audio-word tasks; reviewed distinct distractors; correctness-dominant scoring; pass-and-play deals equivalent unseen packs (per-player `match_id`-independent packs in local play).
- **Varna Jaal:** fresh words chosen **before** placement, every required word validated traceable on the final board (retries with rotation); 3×3 casual / 4×4 ranked; server checks every path; repeat finds return `already` with no award (no points spam).
- **Word Groups:** 120 validated boards (30 beginner 3×3, 90 standard 4×4) from 12 distinct-topic groups; validator rejects duplicate identities, duplicate meanings, and cross-group secondary-tag overlaps (plausible alternate groupings); four wrong submissions end a standard round; solved groups lock and reveal explanations; Roman/bridge-gloss toggles are casual-only flags.
- **Pada Path:** 150 validated prompts (100 sentences with **reviewed alternative orders** — SOV and OSV — and 50 attested quotations: Gītā, Upaniṣads, subhāṣitāni with sources); partial credit from required relations (arguments-before-verb) for sentences and prescribed sequence for quotations — never a naive index comparison; explanation + audio text shown after submission.
- **Daily Word:** existing akshara puzzle untouched; the new `POST /play/daily-word/finish` records its ranked contribution **once, server-side** (idempotent on learner+date); duel editions never call it (clearly labelled casual in the UI copy).
- **Number Builder:** prompts carry the large number in both groupings, slot skeleton with semantic labels, per-slot option sheets; submit-once locking; component breakdown + assembled reading + reviewed reading + accepted alternative returned after lock; "Hear the number" uses the existing TTS surface.

## 5. Multiplayer (§6) — **implemented (server + client) + tested at service level**

Files: `play/matches.py`, `routers/matches.py` (REST + `WS /ws/matches/{ticket}`), models `live_matches / match_participants / match_events / match_queue / match_tickets`, mobile `src/games/v2/{client,useMatchSocket}.ts`, `src/screens/RoomLobby.tsx`.

- State machine `lobby → countdown → active → resolving → results → (rematch) closed` with host transfer, host-leave rehosting, mid-play leave = forfeit, deadline resolution (`tick` job + lazy advance on socket reads).
- **Shared authoritative state in the database** — works across workers on transactional Postgres (and SQLite locally); append-only `match_events` with per-match sequence; clients reconcile gaps via `{"type":"sync","since":N}`; reconnect issues a fresh short-lived ticket (120 s TTL, single use) and rebuilds from snapshot. **No Redis dependency added**; the DB-backed store is the deployment configuration (documented choice, §7).
- **Hidden information never leaves the server:** opponents receive progress counters only (`_public_progress`), never card identities, answers, or number selections (same-board deals use one seed so layouts are equal; each client renders its own copy).
- Quick match: filters game+ruleset+answer language; band widening after 15 s; the UI offers wait/invite/solo after 30 s; **no bots**; queue entries cancel cleanly; incompatible languages never pair (tested).
- Private rooms 2–8, quick match 2–4, ready gates, code join (6-char, unambiguous alphabet), rematch vote → fresh match with the same seats.
- Mobile socket client reconnects with fresh tickets up to 5 attempts, syncs missed sequences, and surfaces a live/conn-status chip.

**Not verified:** real two-device play over the network, duplicate/out-of-order frame injection under load, and worker-restart mid-match were exercised only through service-level tests and the WebSocket handler's structure, not on physical devices or a multi-worker production topology. The brief's load-test target (100 concurrent rooms) was **not run** — no staging environment in this session (§7).

## 6. Recitation v2 + multi-shloka events (§7–§9) — **implemented + tested where evidence exists**

Files: `services/recite_scoring_v2.py`, `services/recite_stream.py`, `services/competition_sets.py`, patches to `routers/recite.py` / `routers/competitions.py` / `services/competitions.py`, models (ReciteAttempt.components, CompetitionEntry.division/piece_results/rules_version), mobile `RecitationResult` component bars, `Recite.tsx` countdown/preflight, `Contest.tsx` per-piece progress.

- **Rubric v2 (`recite-v2-1`)**: content 60 (occurrence-aware multiset — a repeated word cannot cover different words), sequence 20 (monotonic alignment; duplicates stay distinct), continuity 15 (timestamped pauses; ≤0.8 s phrase breathing free; linear penalty to 2.5 s; leading/trailing silence ignored), rhythm 5 (pacing vs a ~3 aksharas/s profile with a gentle taper — no melody/accent/speed grading). **Coverage caps the total.** Tests assert the mandatory counterexample (clean ordered "Ram aa gaye gheh"-style Hindi phrase outranks its scrambled, fragmented, long-paused twin — and the same for three Sanskrit fixtures, the ≥90 % calibration-ordering target in fixture form), slow-but-continuous ≤6 points below fast, one-line-of-two coverage < 75 %, and unclear-not-zero on insufficient evidence.
- **Missing evidence stays missing:** without provider timestamps the timing components return `n/a` and the total is explicitly partial — never renormalised to a fake full score. Components persist per attempt (`recite_attempts.components`) with the rubric version; old attempts keep their old meaning.
- **Streaming STT:** `WS /ws/recite/{ticket}` proxies Sarvam's realtime endpoint server-side (key stays server-side; short-lived tickets; PCM chunk forwarding; interim captions marked provisional; explicit `unavailable → record-and-upload` fallback when the upstream is down or unconfigured). **Not verified against the live Sarvam endpoint** — the realtime contract is isolated in `_upstream_url/_upstream_headers` for a one-file re-check against current docs at deploy time (§7).
- **Multi-shloka sets:** weekly 3-piece events (short/medium/longer) scheduled 8 weeks out with **preflight** (text + meaning + served audio + duration per piece — no event is advertised with missing media; the scheduler refuses rather than degrades), no piece repeated within 4 weeks while supply allows; per-piece bests in `piece_results`; **event total = mean over ALL pieces** (incomplete = provisional "2 of 3"); divisions (beginner/standard) freeze at entry; ties share rank; incomplete entries sit outside the final ranked table; legacy single-piece events keep rules version `2026-10-1` and their original interpretation — nothing old was silently re-averaged. Certificates for the top three per division via the existing certificate system; monthly recitation standings average completed weekly events closing in the month (tested).
- **Mobile recite:** microphone permission checked **before** a visible 3-2-1 countdown (haptic ticks); stop remains manual; v2 component bars render with explicit `n/a` states; Contest shows the set with per-piece checkmarks and enters to the first unsubmitted piece.

**Externally blocked / not verified:** the calibration set (≥60 consented recordings, 10+ speakers, human labels) does **not** exist yet — the fixtures assert ordering behaviour, not the human-study thresholds; the brief's full-rhythm-release gate (no free 5/5) is honoured by returning `n/a` rather than invented values. No on-device eyes-closed run happened (§7).

## 7. Sharing, invites, installation, attribution (§11) — **implemented; device verification pending**

Files: `routers/share.py`, `frontend/landing.html`, mobile `src/games/v2/{share.ts,ShareCard.tsx,linkNav.ts}`, `/share/.well-known/assetlinks.json` + `/apple-app-site-association` routes, share-link payloads whitelisted to `title/subtitle/game/score/rank/period/date/verse/percent/streak/opponent_alias` (no ids, no tokens — asserted by test).

- Opaque revocable codes; invites 12 h, achievements 28 days; open-count cap; `/l/{code}` serves the public landing (invite card + code + store buttons + **unranked browser sample**: a 3-pair client-side Smriti that leaks nothing and reports `sample_started/completed`); attribution events `opened / link_opened / sample_started / sample_completed / store_click / install / redeemed / first_game` — store-click is never treated as an install.
- Mobile: square 1080×1080 and story 1080×1920 cards (view-shot, QR to the share link, brand, name-visibility flag), native share sheet with graceful text fallback, `sanskritam://` + HTTPS link handling via `LinkNav` (resolve → route: invites → RoomLobby, others → Play). **No Firebase Dynamic Links.**
- App-links statement files assert **nothing** until the owner sets real values — `android_cert_fingerprints` / `apple_app_ids` default empty by design (no fake verification).

**Not verified on device:** WhatsApp/Instagram/Facebook share-sheet runs, installed/uninstalled link flows, cold/warm app links, and deferred-install state (which the brief agrees is not claimable cross-platform without a tested mechanism — we implement open-link-again + short code as the fallback).

## 8. Content supply and quality (§10) — **implemented at "validated" tier; human review outstanding**

- **300 reviewed-tier vocabulary concepts** across 12 everyday topics (25 each: animals, food, nature, family, body, home, colors+gems, actions, clothing, birds, places, qualities) with stable ids, meanings, and secondary tags — `seeds/game_content_seed.py`; IAST computed via vidyut at seed time.
- **120 Word Groups boards** (30+90) — generator + validator as in §4; **150 Pada Path prompts** (100 sentences + 50 sourced quotations); **46 letters** for the letter deck; cosmetics catalogue (earned-only badges/packs/themes).
- Seeder `seeds/game_content.py` is idempotent, keyed `(content_id, version)`; draft/validated rows refresh on boot; **reviewed rows are pinned** (a reviewer's sign-off can't be overwritten); wired into `run_seed`.
- Statuses `draft → validated → reviewed → retired` with admin endpoints `POST /play/admin/content` and `GET /play/admin/content/inventory` (counts + depletion alerts vs the brief's minimums) — tested.
- **Illustrations: 8 ultra-confident mappings wired from the reviewed LearnV2 teaching images** (elephant, donkey, mother, boy, girl, fruit, sun, river — each verified against the asset's reviewed `labels.sa` + alt text; `scripts/map_learnv2_images.py`, report at `results/game_image_map_report.md`). The app resolves `learnv2:<id>` references to the bundled assets offline (`games/v2/gameImages.ts`). The remaining 292 concepts are listed in the report with reasons and stay unmapped for the owner's image pass — no guesses shipped. Catalog `media_ready` stays false until ≥24 illustrated concepts exist; audio refs remain empty pending the TTS render pass. These are the media-inventory gates the brief requires — honest, visible, and gating ranked availability rather than faking it.
- The old "spa.w / ela.w" unknown labels were **not** located; no claim of a cause. The new screens render script/labels only through theme helpers (`script()`, `sanskritText()`), and numeral surfaces carry explicit dev+roman pairs; a repo-wide learner-facing-label audit beyond the games was out of scope for this pass and remains open (§7).

## 9. Play hub and screens (§3) — **implemented**

- `Play.tsx` rewritten: **Your rank today** (rank, ranked points, change-since-visit via `visit_total`, period end, IST note, "Play a ranked round to get your rank" before any play — never a fabricated position), separate personal-goal card (labelled distinct from points), Play-with-friends + Quick match, competition card, friend-goal card **only after opt-in**, seven-game collection with per-game art tints, and a "More practice" pointer that keeps grammar drills in Learn/Practice (nothing duplicated or deleted).
- `SetupSheet`: one consistent setup (mode → difficulty → single Play button), remembered casual settings per game on-device, ranked rules shown before a ranked round.
- `ResultSheetV2`: ranked vs practice badge, eligibility reason, today's total/best/attempts-left, breakdown rows.
- `Leaderboards`: period/board/scope filters, restrained top-3 podium, legible rows, avatars, pinned "You" row, tap-for-score-explanation, empty/error/offline states, IST note.
- Touch targets ≥44–48, safe-area padding, `accessibilityRole/Label/State` throughout, reduced-motion respected (shake skipped), non-colour status glyphs (Varna Jaal clue ticks, checkmark states). **Screenshots at 360/390 px, large text and tablet width were not produced in this session** — the brief asks for rendered-screen evidence, and without a device/emulator run none is claimed (§7).

## 10. Backend/data contracts, ops (§12–§13) — **implemented (foundations)**

- Models as named in the brief: `GameContent`, `GameSession`, `GameDayScore`, `DailyGamePoints`, `LeaderboardSnapshot`, `LiveMatch`/`MatchParticipant`/`MatchEvent`/`MatchQueueEntry`/`MatchTicket`, `Friendship`/`Block`/`FriendGoal`/`FriendGoalRound`, `ShareLink`/`LinkEvent`, `CosmeticItem`/`CosmeticGrant`; additive `competition_entries.{division,piece_results,rules_version}` and `recite_attempts.components`. Migration `d5e6f7a8b9c0` chained on head `c4d5e6f7a8b9`; additive only; old rows keep their meaning.
- **Account deletion covers every new table** — `learner_owned_models()` extended; paired-row (`FriendGoal`) and host-side (`LiveMatch` lobby) edges deleted explicitly; the deletion guard test was updated to the new contract and passes.
- Idempotency: session starts (unique keys), finishes (stored-result replays), goal credits (`uq_friend_goal_round`), daily-word bridge (unique learner+date). Ranked answers never ship in public payloads (tested).
- Metrics to instrument (join failures, validation failures, ASR uncertainty, latency) are **not yet wired to a dashboard** — the endpoints exist; a metrics pass is open (§7). Monetisation foundations: cosmetic catalogue + grants + optional `entitlement_feature` hook; **no purchase buttons** anywhere; core play is fully free.

## 11. How to run

```bash
# backend (Windows, the env used here)
cd backend
python -m alembic upgrade head        # applies d5e6f7a8b9c0 (single head)
python -m uvicorn app.main:app --port 8001   # init_db upgrades + seeds game content idempotently
python -m pytest tests -q             # full suite

# mobile
cd mobile
npx tsc --noEmit                      # types
node scripts/check-recite.mjs         # recite harness (83 assertions)

# new config variables (no secrets)
#   public_base_url          first-party HTTPS origin hosting /l/<code> and the landing
#   android_cert_fingerprints comma-separated SHA-256 fingerprints for App Links
#   apple_app_ids            comma-separated team bundle ids for Universal Links
#   sarvam_realtime_url      realtime STT websocket endpoint (re-verify at deploy)
```

## 12. Score / rubric versions shipped

- Games rubric `v1` (§3 table) — frozen for the first ranked period.
- Number Builder engine `nb-1` with draft-review lexicon.
- Recitation rubric `recite-v2-1` (60/20/15/5, coverage-capped).
- Competition sets rules `2026-10-13-sets`; legacy recitation stays `2026-10-1`.

## 13. Owner-only steps remaining (externally blocked here)

1. **Linguistic review + sign-off** — the review packet is generated and ready: `results/numeral_lexicon_review.md` (full 0–99 table with IAST and variants, the convention choices to confirm, the owner's worked example, and a sign-off block; regenerate with `python -m scripts.render_numeral_review` after any lexicon edit). A reviewer signs it or edits `lexicon.py` directly (data, not code). The same review covers Pada Path alternatives/quotations. Until then ranked Number Builder/Pada Path serve draft-tier content exactly as labelled.
2. **Illustrations/photos (≥100 concepts) and their audio** — required for picture Smriti/Rush ranked; `media_ready` gates keep those honest meanwhile.
3. **Recitation calibration study** — the collection and analysis tooling is built: the dev-only **Calibration** screen (Settings → Calibration on dev builds; 8 fixed prompts, label guide, consent gate, speaker/device tags), `POST/GET /recite-calibration` endpoints with private audio storage (local fallback when cloud storage is unconfigured), and `python -m scripts.calibrate_recite` which scores every take through the production path and reports the §8 ordering target (≥90% clean-over-disrupted, by speaker/device) with a freeze verdict. Collect 60+ takes from 10+ speakers, run the script, adjust `recite_scoring_v2` thresholds if it fails, then freeze `recite-v2-1`.
4. **Device matrix run** (Android + iOS, two real devices): all seven games solo/local/live, Varna Jaal bottom-row/diagonal/cancel gestures, Number Builder on a small phone, eyes-closed recite flow, share targets (WhatsApp/Instagram/Facebook), installed/uninstalled links, TalkBack/VoiceOver/large-text/reduced-motion passes, and the rendered screenshots (360/390/tablet) this document deliberately does not claim.
5. **Multi-worker + load verification**: deploy with `DATABASE_URL` (transactional Postgres) and run the 100-room load test with duplicate events and a worker restart; performance targets (p95 <500 ms ack, <2 s captions, <10 s final score) are implemented-for but **unmeasured**.
6. **Store/keys**: Android fingerprint + Apple app ids for verified links; Sarvam realtime contract re-check; store product setup only if/when the owner activates monetisation (cosmetics are complete without it).
7. **Learner-facing label audit** beyond the games (the unlocated "spa.w / ela.w" strings) — still open, no cause claimed.

## 14. Files changed (summary)

**Backend (new):** `app/services/numerals/*` (6 files), `app/routers/recite_calibration.py`, `scripts/{map_learnv2_images,render_numeral_review,calibrate_recite}.py`, `app/seeds/game_image_map.py`, `app/services/play/*` (7 files), `app/services/recite_scoring_v2.py`, `app/services/recite_stream.py`, `app/services/competition_sets.py`, `app/seeds/game_content_seed.py`, `app/seeds/game_content.py`, `app/routers/{play,social,matches,share}.py`, `migrations/versions/d5e6f7a8b9c0_play_games_v2.py`, tests `test_numerals.py`, `test_play_{sessions,matches,social,share,admin}.py`, `test_recite_v2.py`, `test_competition_sets.py`.
**Backend (modified):** `app/models.py` (19 new tables incl. recite_calibrations + 5 additive columns), `app/main.py` (4 routers + 2 WS endpoints), `app/config.py` (4 settings), `app/seeds/seed.py` (content + cosmetics), `app/routers/me.py` (deletion coverage), `app/routers/recite.py` (v2 components), `app/routers/competitions.py` (sets/divisions/piece results), `app/services/competitions.py` (set scheduling/publish), `requirements.txt` (websockets), `frontend/landing.html` (new).
**Mobile (new):** `src/games/v2/{client.ts,parts.tsx,useSession.ts,useCatalog.ts,useMatchSocket.ts,share.ts,ShareCard.tsx,linkNav.ts,gameImages.ts}`, `src/screens/Calibration.tsx`, `src/api/uploadCalibration.ts`, `src/screens/{WordGroups,PadaPath,NumberBuilder,Leaderboards,Friends,RoomLobby,playPreviewParts,playTheme}.tsx`.
**Mobile (rewritten):** `src/screens/{Play,Smriti,ShabdaRush,VarnaJaal}.tsx`.
**Mobile (patched):** `App.tsx` (6 screens + LinkNav), `src/navigation/types.ts` (6 routes), `src/api/client.ts` (exported `request`, competition `me.piece_results`), `src/screens/DailyWord.tsx` (ranked bridge), `src/screens/Recite.tsx` (preflight + countdown), `src/screens/Contest.tsx` (set pieces), `src/components/recite/RecitationResult.tsx` (component bars), `scripts/hub-art-preview.tsx` (points at extracted preview parts).
**Preserved untouched:** the pre-existing working-tree changes to `Book.tsx`, `GrammarChapter.tsx`, `Listen.tsx`, `ParvaPage.tsx`, `PracticeRound.tsx`, `Progress.tsx`, `Reader.tsx`, `Shloka.tsx`, `GameShell.tsx`, `MainTabs.tsx` — the old `/games/*` API and all legacy game behaviour remain available for current store builds.
