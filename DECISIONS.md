# Sanskritam — Orchestrator Decisions

Log of decisions made during the build. The spec lives in architecture.md; this file records what the orchestrator and workers decided while implementing.

## 2026-08-29 — Backend v0.1

- **Stack**: Python 3.11 + FastAPI + SQLAlchemy 2.0 + SQLite (file: `backend/app.db`). Chosen for: zero-setup on Windows, server-side learner model per spec §8, fast iteration. Postgres migration is a config change later (SQLAlchemy keeps it portable).
- **No GPU, no compiled Sanskrit libs in v0.1.** Grading runs on a rule-based morphology analyzer module behind an `ANALYZER=rule|vidyut` config flag, so Vidyut (Rust) can drop in without touching the grading engine. See `research/tech-research.md` for the Vidyut integration path.
- **Grading is by morphological feature set, not string match** (spec §6.1): free word order accepted automatically. `off_by_one` verdicts name the exact feature that differs. Abstention on low-confidence parses (spec §6.3) — never mark incorrect when unsure.
- **Register (laukika/classical) is a routing key enforced in the data layer**, not by prompt (spec §5).
- **Adaptive engine**: per-feature mastery (0..1) with SM-2-inspired updates; challenge selection at the mastery edge (~0.5–0.7); last-N no-repeat; two independent dials `sanskrit_ratio` and `script_ratio` (spec §7).
- **API contract locked before build** so frontend (test console) and backend could be built in parallel by separate agents. Contract documented in `backend/README.md`.
- **Test console frontend**: static vanilla JS, light theme, no build step. It is a testing tool, not the product (product is Expo per spec §1).
- Workers used: 1 research (tech findings), 1 build (backend), 1 build (frontend). Test worker follows build completion; findings from research get integrated in iteration 2.

## 2026-09-01 — Raw audio retention

- **Raw audio is NOT retained.** Audio uploaded to `/speech/stt` is read into memory, passed to Sarvam Saaras for transcription, and discarded. It is never written to disk or stored in the DB. Only the derived transcript, verdict, and pronunciation metadata are persisted.
- Config option `retain_raw_audio: bool = False` declared in `config.py` for future opt-in.
- This satisfies GDPR Article 5(1)(c) (data minimisation) and DPDP 2023 §4(2) (purpose limitation) for the diaspora user base. A retained-audio feature, if ever built, must be opt-in with explicit consent and a retention schedule.

## 2026-08-29 — Model routing, measured

- **Built an eval harness** (`backend/app/evals`) rather than choosing a model from published benchmarks. It scores candidate models on our own 37 seed challenges using the same Vidyut analyzer that grades learners, so a model that fails here fails in production. Three tasks: `generate` (author Sanskrit from an English prompt), `diagnose` (catch a learner's error, with control cases that measure false accusation), `translate`. Responses are cached on disk so re-scoring costs nothing.
- **Reversed an earlier claim.** The spec said "Sarvam-105B does not support Sanskrit at all." Measured false: `sarvam-105b-conversations` clears the Vidyut gate on 100% of generated sentences at ₹0.0055 each, against Gemini's ₹0.0623 — **11× cheaper**. The ₹25K of Sarvam credits are worth roughly 400K sentences.
- **But Sarvam cannot handle the dual.** False-accusation rate splits 3% on non-dual cases (identical to Gemini) against **50% on dual**, with explanations arguing the dual should be plural. Almost certainly because its training concentrates on the 10 most-spoken Indian languages, none of which has a productive dual. So: **Sarvam authors offline content, Gemini handles dual-bearing content and live diagnosis.** Route by measurement, and re-run the evals whenever either vendor ships a model.
- **Never put the `sarvam-105b` reasoning variant in a request path.** 41% of its generate calls returned nothing (spent the whole token budget thinking) and p50 latency was 42.8 s. The `-conversations` variant fixed all of it.
- **Fixed visarga sandhi in the analyzer.** The eval surfaced it: correct Sanskrit applies sandhi across word boundaries (`bālo grāmaṃ`, not the textbook `bālaḥ grāmam`), and the analyzer marked every such answer `unsure` — 8 of 37 seeds. Sandhi readings are now resolved and only ever *added*, never allowed to override an attested reading, and only when they land on a known lemma. This also exposed a real bug in `feature_set_variants`: it dropped any alternative whose lemma differed from the primary, which is precisely what a resolved sandhi reading looks like.

## 2026-08-29 — Conversation ahead of the challenge loop

- **Conversation moves from build-order step 7 to the front**, ahead of the free habit loop. Deliberate re-prioritisation: conversation is the demo that proves the thesis. Cost: the loop that actually retains users now ships second, so keep the gap short.
- **No Sanskrit is synthesised in the request path.** Indic Parler-TTS is the best open Sanskrit voice and runs 10–15 s per sentence; Sarvam Bulbul is fast but still has no Sanskrit (re-checked Aug 2026). Conversation is therefore served from a **pre-rendered dialogue graph**, authored offline and rendered to audio before anyone hears it. This closes the §13 open question that was gating v1 vs v2.
- **The LLM is not in the turn loop at all.** Live path is ASR → Vidyut → adaptive selection → cached audio, ~600–900 ms. Everything except ASR already exists in the repo; edge matching reuses `grading/engine.py` unchanged, so free word order and the abstention rule come for free.
- **Off-script utterances degrade to a pre-rendered repair move and get logged.** The escape log is the authoring backlog, and escape rate is the health metric for the feature.
- **v1 pre-renders bridge-language turns too**, despite Bulbul being fast enough to serve them live. Two engines means two timbres for one persona and learners hear that as two people; pre-rendering makes voice consistency a casting decision instead of an engine constraint.
- **This inverts the unit economics.** §2 assumed conversation was the ₹2.5–18 expensive tier because TTS dominates variable cost. With TTS pre-rendered, only ASR remains: ~₹5 per 10-minute session, and existing credits cover ~830 hours. Conversation may not need to be a metered premium tier in v1 — re-run §2's numbers before pricing.

## 2026-08-29 — Conversation runtime, authoring pipeline, speech benches (build order steps 1–3 + 5)

- **Dialogue graph shipped with a hand-authored 30-node scenario** ("प्रथमं मेलनम्", laukika, ratio band 0.2–0.5): 44 edges, 13 sa-edges keyed by feature sets via `grading/engine.py::grade_attempt` unchanged (all 13 grade `correct` on their own expected text — enforced in tests), bridge edges match on lowercase substring phrases. Models: `DialogueScenario/Node/Edge/EscapeLog` + `ConversationSession`; migrations chain linearly `1861932777ab → 2a3b4c5d6e7f → 3c4d5e6f7a8b` and the startup drift guard passes.
- **Escape verdicts are not errors.** Integration testing caught a bug the builders' tests missed: gibberish at a bridge-only node (entry) returned `verdict=incorrect` because the escape path hardcoded it when no sa-edge had been graded. Per §12 the utterance must still be graded independently: unsure stays unsure; a valid-but-unexpected sentence logs `no_match`. Fixed in `turn_loop._handle_no_match`; regression test covers the bridge-only-node case (`test_escape_at_entry_node_never_incorrect`). A second layer surfaced during ad-hoc verification: even at nodes WITH sa-edges, a confidently-parsed utterance that matches no edge graded `incorrect` — in conversation an escape never accuses, so `_handle_no_match` downgrades `incorrect` → `no_match` (diagnosis text retained for the narrow-repair hint; `off_by_one` still names the near miss). Regression test: `test_valid_but_unexpected_at_sa_node_no_match`.
- **Turn loop carries no LLM.** Live path is ASR (client-side via /speech/stt) → grade_attempt → repair/advance → pre-rendered audio_url. Repair moves: off_by_one → `narrow` repair, else `ask_again`; ratio_hint drifts +0.02 per correct sa turn, −0.05 per escape, clamped [0,1], per-session only (learner.sanskrit_ratio untouched in v1).
- **ASR latency measured (step 2): Saaras v3 p50 = 306 ms, p95 = 609 ms (n=8, synthetic audio).** The §12 600–900 ms turn budget holds with only ASR live. Caveat: synthetic audio — re-run on real code-mixed recordings before locking; harness is `backend/scripts/bench_asr.py`, JSON in `backend/results/`.
- **Parler batch renderer landed (step 1 tooling):** `app/services/parler.py` (lazy torch import, per-item fault isolation, model `ai4bharat/indic-parler-tts`, Sanskrit voice "Aryan") + `scripts/render_parler.py` with a 200-item spike plan validated via `--dry-run`. GPU deps intentionally NOT added to requirements.txt — the spike runs on the GPU box later. Vāgdhenu wrapped via subprocess (`app/services/vagdhenu.py`, `VAGDHENU_HOME` env), awaiting the clone + Apache-2.0 attribution.
- **Authoring pipeline (step 3) is endpoint-complete behind `SHABD_AUTHORING_LIVE` (default off):** `/authoring/draft` (Sarvam `sarvam-105b-conversations` drafts, Gemini routed for dual-bearing content), `/authoring/scenario` (draft → Vidyut gate → node/edge build with replace semantics), `/authoring/render` (Parler shard → node.audio_url). Draft cache keyed by brief hash; gate marks failures with reasons instead of shipping them. First live Sarvam run is pending — mocked-provider tests (18) prove the mechanics; the measured model routing from the evals section is wired in as configured defaults.
- **Human-review round (post-agent review) — 5 findings, all addressed.** (1) Bridge matching was substring + first-rank-wins: "I am not ready" matched the ready edge, "I know" matched a "no" phrase — now word-boundary regex matching with longest-phrase-wins scoring across all candidate edges. (2) A struggling learner could ping-pong between repair nodes forever: added `consecutive_escapes` (migration `5f6a7b8c9d0e`) with an escalation ladder — escapes 1–2 repair, 3 prefers bridge-type repair, 4 terminates the session (no exits offered); a match resets the streak. (3) `render_scenario`'s `audio_url == ""` filter was NULL-blind for ORM-external inserts — now `or_(== "", is_(None))`. (4) Hoisted function-body `import uuid` in turn_loop/session_store; made `next_edges` binding unconditional. (5) Flaky `test_sets_audio_urls`: not reproduced in 13 consecutive runs (10 solo + 3 full-file) — flagged, not guessed at. Regression tests added for (1) and (2); suite at 168 passed, 1 skipped. Reviewer feedback loop, both reviewers rejected and all findings dispositioned: reviewer 1's 4 findings → 3 misreads with evidence (pre-existing uncommitted analyzer work from the model-routing session, orchestrator-authorized schema placement, spec-authorized seed substitutions) + 1 legitimate (`_pick_repair_node` stranded sessions on nodes without bridge fallbacks) fixed with a scenario-wide repair-node fallback; reviewer 2's 4 findings all legitimate and fixed — `render_scenario` now gates on `ParlerRenderer.available()` BEFORE any disk writes (the per-item except was swallowing ImportError, so missing-torch reported "rendered" with 0 items plus a junk manifest; verified against the REAL unmocked path in a torch-less venv), `backend/.authoring-cache/` gitignored, `bench_asr --synthetic` made a true default via `BooleanOptionalAction` (`--no-synthetic` opts out), and the graceful-skip test now exercises the real availability gate instead of monkeypatching `render_batch` (which had bypassed the bug). Reviewer-claims lesson: both reviewers' incidental claims needed re-verification — reviewer 2 said "torch installed" when the venv has no torch; the suite is the arbiter, not the reviewer's prose.

## 2026-08-29 — API-only voice: Bulbul renders the dialogue graph

- **Product constraint: no local models, ever.** The voice stack is API-only (user decision — the app ships to users who self-host nothing). The Parler local-render spike was abandoned mid-flight (torch cu124 + parler-tts library installed and working, then shelved; `scripts/render_parler.py` + `app/services/parler.py` kept as offline tooling for a future GPU box, not request-path).
- **Sanskrit TTS reality (probed live, Aug 2026):** Bulbul v3 has NO `sa-IN` outside a per-account beta ("Please request beta access to sa-IN by contacting our support team" — confirmed by direct API call). Devanagari Sanskrit text renders fine through `hi-IN` (same script; Hindi-flavored pronunciation). **Action for the Startup Program: request sa-IN beta access.** The renderer takes `--sa-language` (default `hi-IN`), so flipping to native sa-IN is a flag + re-render, zero code change.
- **The Sarvam client was double-broken against the live API and nobody noticed because all tests mocked above it.** (1) Bulbul v3 returns `{"audios": [b64]}` — the client read `audio`/`audio_base64`, so every 200 response raised "No audio in Sarvam TTS response". (2) Default speaker `meera` is not in bulbul:v3's current speaker list — every default call 400'd. Fixed in `sarvam.py` (`audios` list parsed, default `aditya`) + `schemas.py`; contract tests pin the real shapes via `httpx.MockTransport`. Lesson: contract tests must pin REAL response shapes, not the shape our client wishes existed.
- **All 29 speakable dialogue nodes pre-rendered via Bulbul (§12 step, API-based):** `scripts/render_sarvam.py` (per-item isolation, `--sa-language` flag, dry-run, graceful skip) + `scripts/build_render_items.py` (seed→item-file). Manifest: `results/sarvam/manifest.json`. Numbers: 29/29 ok, wall p50 1124 ms/call, mean 1327 ms, 96.2 s audio total, 38.6 s wall for the full graph. sa nodes rendered via hi-IN pending the sa-IN beta; re-render is one command.
- Bridge-edge matching completed its second half: ALL candidate bridge edges are scored (the earlier early-`break` defeated the longest-phrase rule it sat inside) and a NEGATIVE edge (expected_phrases in `NEGATION_WORDS`: no/not/never/नहीं/…) pre-empts an affirmative hit — "I am not ready" now routes to the repair node, "ready" still advances. A sa-edge `correct` still outranks any bridge hit. Regression: `test_negation_preempts_affirmative_on_dual_match`. Suite: 170 passed, 2 skipped.

## 2026-08-30 — Bulbul `sa-IN` granted; the "no live Sanskrit" rule relaxes

- **Sarvam granted `sa-IN` beta access on Bulbul v3 (ETA 2–3 days).** Requested via the Startup Program thread on 2026-08-29. This closes the open question that shaped §12 and drove a substantial architecture.md rewrite.
- **The API was never missing Sanskrit — it was gated per account.** Audited by probing our own key rather than reading the docs: `bulbul:v2` + `sa-IN` replies *"sa-IN is only supported by bulbul:v3"*, and the `/text-to-speech` validator accepts all 23 language codes. Docs list 11 because 11 are ungated by default; 12 (sa, kok, mai, sd, as, ur, ne, doi, brx, ks, mni, sat) return a beta-access error. Recorded as architecture.md §4.5 so nobody re-derives it.
- **The old rule was over-determined.** *"No Sanskrit is synthesised in the request path, ever"* rested on two independent arguments — Parler's 10–15 s latency, and TTS being 75–90% of variable cost. Bulbul removes the first. The second stands, so the rule relaxes rather than disappears: **pre-render everything that can be pre-rendered; synthesise live only what cannot.** What cannot: open conversation past the graph, anything containing the learner's own words, and arbitrary text the learner points at.
- **The real unlock is persona, not latency.** The previous design put Parler on the Sanskrit half of a code-switched turn and Bulbul on the bridge half — two timbres in one sentence, which §12 deferred rather than solved by pre-rendering both. One engine speaking both halves makes voice consistency a casting choice (one speaker id from 30+) instead of an engine constraint. For a product whose thesis *is* intra-turn code-switching, that matters more than the 300 ms.
- **Conversation splits into two products, not two quality tiers.** Guided (graph-backed, pre-rendered, ~600–900 ms, ~₹0, free) and Open (free-form, LLM + live Bulbul, ~2–4 s, ₹15–18/10 min, metered). Ship guided first: it is pedagogically correct for beginners and it is the one whose latency humans tolerate. **The Vidyut gate stays in the open turn loop** despite costing latency — a tutor speaking ungrammatical Sanskrit to a paying learner is worse than one that pauses; on gate failure, regenerate once then fall back to a bridge-language reply.
- **Two adjacent gaps found in the same audit, both of which change what we build.** (1) `/transliterate` has no Sanskrit and no beta path — `script_ratio` needs Devanagari↔IAST, so build it locally with Vidyut / `indic-transliteration`, which is better anyway since romanisation should not cost a round trip. (2) `/text-lid` returns `null` for Sanskrit while returning `hi-IN / Deva` for Hindi in the same script — so `sanskrit_ratio` cannot be measured with LID. Use **Vidyut parse coverage** instead: the fraction of tokens resolving as Sanskrit morphology, which is the signal we already grade on.
- **`saaras:v4` and `saaras:v4-multispk` are live and ungated on our key; we pin `saaras:v3`.** Signal worth confirming before switching: on 1 s of digital silence v3 returned `अस्तु अस्तु` and v4 returned empty. One sample, not a benchmark — but a hallucinated transcript in a grading loop is a false accusation against a learner who said nothing. Bench with `scripts/bench_asr.py`, then switch. Also live: `saaras:v3-realtime`. Also confirmed: Odia is `od-IN` (the website's `or-IN` is wrong), and `sarvam-translate:v1` handles sa/kok/mai/sd today while the default `mayura:v1` rejects all four.
- **Build order: the client moves to the front.** Live synthesis means a working app no longer *depends* on the authoring pipeline, so the pipeline drops from prerequisite to cost optimisation. New order: ASR bench → **`sa-IN` listening test** (hard gate) → RN/Expo client → varṇamālā → guided conversation → authoring pipeline at volume → challenges + śloka. The cost of this: every session runs live at ~₹20 rather than ~₹5 until the pipeline lands. Affordable for a 20–30 person beta on the ₹25K grant, unaffordable at scale. **The risk is not the money — it is that a working live path removes the pressure to build the pipeline.** Track pre-rendered vs live character share as a first-class metric.
- **Varṇamālā and pronunciation added as architecture.md §13** — the entry surface, previously missing entirely. Finite content (13 vowels, 33 consonants, 2 ayogavāha, plus conjuncts ≈ 60–120 assets), so it ships in the app bundle and works offline at zero marginal cost. The Sanskrit alphabet is already sorted by place of articulation (कण्ठ्य → तालव्य → मूर्धन्य → दन्त्य → ओष्ठ्य), so the teaching sequence needs no invention and every वर्ग is a controlled minimal-pair set. Synthesis is trivial here; **grading is the hard part** — त/ट, श/ष/स, aspiration and vowel quantity are exactly where ASR confidence is lowest. v1 ships the drill, reference audio, record-and-compare playback and coverage tracking, and holds automated per-contrast scoring until the aligner is measured on real learner audio.
- **No local models. Anywhere — tightened, not just restated.** The 2026-08-29 entry locked "API-only voice" but architecture.md still read as though self-hosted renderers were fine off the request path. They are not: the app ships to phones, phones cannot hold models, and we run no inference servers, no GPU build box, and no nightly local batch. §1 now says so, and every self-hosted component is struck from the spec. **The existing `app/services/parler.py`, `app/services/vagdhenu.py`, `scripts/render_parler.py` and their tests are dead code to be deleted** — not kept as standby.
- **This costs two real things, both recorded rather than wished away.**
  1. **Chant.** Sanskrit verse is chanted, with metre governing syllable length; the only metre-aware Sanskrit TTS in existence is self-hosted. **No hosted API chants.** Daily śloka therefore ships as *spoken recitation* — useful for words, sandhi and meaning, and not what a teacher sounds like. Ways out, in order of realism: licensed human recordings (the śloka set is small and fixed, so this is content acquisition rather than engineering), ask Sarvam for a chant voice, or ship prose reading and label it honestly. Largest open product question in the doc.
  2. **True forced alignment.** §6.2 assumed akṣara-level alignment against a known target. No hosted API returns phone-level alignments — Saaras returns a transcript. So the buildable version is **constrained comparison**: transcribe, compare akṣara-by-akṣara against the known target, treat divergence as a *candidate* error. It cannot separate "said it wrong" from "recogniser misheard", which makes abstention (§6.3) the design rather than a refinement. Where pedagogy allows, drill contrasts inside a word (`पटः`) rather than on a bare letter — the recogniser gets context and the contrast still gets tested.
- **Single-vendor risk is now the top risk in the document, and it has no cheap mitigation.** Voice, ASR and offline authoring all sit on Sarvam, `sa-IN` is a beta flag on our account rather than a contract, and there is no longer a local fallback to fall back to. Partial hedges: keep the renderer engine-agnostic behind one interface so a swap is config not rewrite; **own the audio** — every pre-rendered clip survives losing the API, which is one more argument for pre-rendering aggressively; keep the Sarvam relationship warm. Accept that a withdrawal degrades us to text-only, and know it in advance.

## 2026-09-07 — Curriculum data plan

- **The app has a world-class engine and zero lesson content.** Clicking a Path node goes straight to a challenge — there is no explanation of what a vibhakti IS, why sandhi happens, or how a verb is conjugated. The Vidyut engine can derive any form sūtra-by-sūtra; it cannot teach a learner what any of it means. The gap is pedagogical content, not computational — see [`CURRICULUM.md`](CURRICULUM.md).
- **Register coverage is weighted, not uniform.** All three registers (Vedic, classical, laukika) are grammatically covered by Pāṇini's system, but the pedagogy is: laukika deep (the core loop — conversation, challenges), classical medium (reading, śloka, grammar reference), Vedic thin (a sliver inside daily śloka). Sanskritam is a spoken-Sanskrit tutor, not a scripture library — this is a locked product scope decision (§1).
- **Two grammar domains are missing entirely from the feature taxonomy** — samāsa (compounds: 4 types) and kāraka (thematic relations: 6 roles). Both are blockers: samāsa for the Reader surface (classical texts are dense with compounds), kāraka for the "why was I wrong?" explanation system (can name the vibhakti, cannot explain the semantic role). New feature IDs and seed challenges needed for both.
- **Open-source data sources identified for curriculum extraction.** learnsanskrit.org (open source — lesson text, curriculum structure), Sanskrit WordNet / IIT Bombay (CC BY-SA 4.0 — 66,930 words, 46,440 synsets — vocabulary curriculum), DCS / Heidelberg (open access, on GitHub — 650K+ parsed lines — graded reading), GRETIL / Göttingen (open access — classical corpus for RAG). Every source needs licence verification before ingestion.
- **Storage architecture: four kinds of data, four homes.** (1) Engine fuel (~200MB) — server memory, loaded once. (2) Curriculum content (lessons, units, challenges, dialogue) — structured DB → API, because the curriculum changes constantly and server-side retuning must not need an app release. (3) Audio (GBs) — object storage + CDN, pre-rendered, content-hashed; the varṇamālā audio bank (~60–120 clips, a few MB) is the only audio that ships in the APK. (4) Corpus (for future RAG) — flat file of embeddings in RAM now, pgvector when the corpus outgrows RAM. Two indexes, never merged (classical + laukika).
- **11-unit curriculum spine designed.** Three conceptual layers: alphabet as a mathematical set (Unit 1), word formation as functions — sandhi = f(a,b)→c, declension as a tensor, conjugation as a state machine (Units 2–9), sentence construction as relations — samāsa, kāraka (Units 10–11). New Lesson content type spec: markdown body, Vidyut-verified examples, visual data (grid/tree/state_machine), pre-rendered audio.
- **The grounded-guru (RAG on epics) is deferred, not forgotten.** The curriculum (lessons, units, vocabulary, reading) is the prerequisite. The RAG path is already architecturally designed: verse-by-verse chunking via Vidyut, Gemini embeddings, two-index split. Two open items block it: Sanskrit embedding quality is unmeasured (§4.6 — does a classical query ever retrieve laukika?), and licence clearance on epic source texts.
- **What not to build:** no scripture library, no local models, no PDF-based content delivery, no curriculum in the APK (except varṇamālā audio), no vector database in v1.

## 2026-08-30 — Retrieval sized down; the platform layer written down for the first time

- **RAG is smaller than §4.4 implied, because the LLM left the hot path.** Retrieval serves only three callers — offline authoring, "why was I wrong?" explanations, and open (premium) conversation. None is the free product's turn loop (§12), the corpus is thousands of sentences rather than millions of documents, and it changes only when we author. **So there is no production vector database in v1**: a flat file of embeddings in memory answers all three in single-digit ms. pgvector when the corpus outgrows RAM, not before. Recorded as architecture.md §4.6.
- **Embeddings force a second vendor.** Probed: Sarvam has no embeddings endpoint (`/v1/embeddings`, `/embeddings`, and both rerank paths all 404). Gemini already supplies the tutor brain, so its embedding API keeps the vendor count at two. **Measure retrieval quality rather than assuming it** — §4.3 is the precedent, where published benchmarks and our own evals disagreed. The specific untested claim is that a classical query never retrieves laukika, which is the entire justification for the two-index split.
- **Chunk on Vidyut segmentation, not on characters.** Sandhi fuses word boundaries and compounds run long, so any token-window chunker cuts mid-compound and yields meaningless fragments. Vidyut is already in the repo for grading; reuse it as the chunker.
- **Wrote §14 Platform and operations — the document had been nearly silent on everything that is hard because this is an app rather than because it is Sanskrit.** Audit of the previous version: hosting 0 mentions, database 0, payments 0, privacy/DPDP 0, rate limiting 0, identity 1 (a word in an ASCII diagram), observability 1. Eight subsections now cover hosting, audio/CDN, identity, payments, client, privacy, abuse, observability — all marked **unresolved**, because they are.
- **Three of those change decisions already made, not just the todo list.**
  1. **Store commission is a line item nobody had costed.** Apple and Google take 15% under their small-business programmes, so $9.99 is ~₹750 net, not ₹880 — margin ~47% against ~₹400/month inference, and ~35% if the app ever crosses into the 30% tier. Combined with the §11 build order running live synthesis at ~4× the pre-rendered cost, this is a second independent reason the authoring pipeline is scheduled work rather than an optimisation.
  2. **`Attempt.raw_audio` is a compliance liability.** Voice recordings are personal data; DPDP 2023 covers Indian learners and GDPR covers the diaspora the whole thesis targets. Cheapest good answer: **do not keep raw audio** — grade it, keep the derived features and verdict (§7 already models those separately), discard the recording. Retain only on explicit opt-in.
  3. **Voice minutes are money and nothing rate-limits them.** `Learner.voice_minutes_used` exists and is enforced against nothing. A leaked token could burn the ₹25K grant in a day. Server-side per-learner quotas on ASR seconds and synthesised characters, before any public build.
- **iOS mute switch is the client trap worth knowing in advance.** iOS silences playback when the hardware switch is on unless the audio session category is set explicitly — invisible in the simulator, and it reads to the user as a broken app. For an audio-first product this is launch-blocker class. Recording formats also differ across platforms; pin one so Saaras receives the same bytes from both.


## 2026-08-30 — Meta moves, and Sarvam on the explain path

- **A question about the line is not a failed answer.** The runtime had no concept of one: "इसका मतलब क्या होता है?" fell through edge matching, escaped, and drew a *narrow* repair about noun case — an answer to a question nobody asked. `services/meta_intent.py` now classifies `explain` / `repeat` / `translate` from a phrase table over the three registers learners actually type (Devanagari, romanized Hinglish, English). The node is held, nothing is graded, nothing is logged to the escape backlog.
- **Detection runs BEFORE edge matching, with one guard.** The bridge phrase lists are loose enough to swallow a meta move — "समझ नहीं आया" contains नहीं and routed down the refusal edge. So meta wins by default, and an utterance that is *exactly* one of the node's expected replies wins it back. Anything looser than exact equality would re-import the substring collisions the bridge matcher already had to fix.
- **The explanation is a second HTTP call, deliberately.** Folding it into `/conversation/turn` would put a model in the guided turn path, which §12 forbids and which the numbers justify: a meta turn returns in ~20 ms, an LLM-routed one in ~3.5 s. The client gets `meta_intent` from the turn, renders, and *then* calls `/conversation/explain`.
- **Sarvam, not Gemini, on the explain path** — product instruction, overriding the §12 table row. Keeps the live path on one vendor. `sarvam-105b-conversations`, measured 1.3–3.0 s. **The accepted cost is the dual**: this is exactly the live-diagnosis role the 2026-08-29 evals gave Gemini because Sarvam argues the dual should be plural. Mitigated in the prompt (asks for meaning, forbids claims about grammatical number), not solved. Revisit if learners report wrong explanations on dual-bearing lines.
- **Sarvam ignores "answer in the learner's language" as a system-prompt rule.** Measured: an English question got a Hindi answer. The language is now resolved server-side from the learner's script (`reply_language()`) and passed as the last line of the user message. Latin script — romanized Hinglish included — gets English, on the reasoning that someone typing in Latin can read it.
- **Explainer fails closed to the authored gloss.** No key, timeout, or empty output degrades to the node's own gloss rather than an error. It also never grades: verdicts stay Vidyut's (§6.3), or the app would have a second, unauditable grader.

## 2026-09-01 (evening) — The pipeline runs for the first time, and four things were wired wrong

- **No API key had ever reached any LLM.** `app/evals/providers.py` resolved keys from `os.environ` alone, but pydantic-settings reads `.env` into the settings object and never exports it. Every provider reported `configured=False` — authoring, `edge_router`, `explainer`, the eval CLI. Because each caller fails closed by design, nothing errored: **`/conversation/explain` has been serving the authored gloss on every request since it shipped**, and the edge router has taken the escape path every time. Fixed once, at the source, with a `_key_from_settings()` fallback in `providers.py` (pydantic-settings runs `env_prefix=""`, so the lowercased env var name is the settings field name). **This also invalidates P6-1's premise** — learners could not have been draining the grant through a router that never reached Sarvam. The metering is still right; it was guarding a bricked-up door. That path is live now for the first time.
- **There were two databases and the app used the wrong one.** `start_mob.ps1` ran uvicorn with `-WorkingDirectory $root` plus `--app-dir backend`. `--app-dir` sets the import path and leaves CWD alone, so `db_path="app.db"` resolved against the repo root and created a second DB there. It drifted 7 migrations behind while holding a file lock, and it held all the real content — while `backend/app.db` sat at head, empty, missing its `attempts` table. Every P3/P4/P5 feature pointed at a schema without its tables. Root DB and the two stale servers deleted, `backend/app.db` rebuilt from migrations + seeds, launcher fixed. Recorded as invariant §2.10: **CWD is the schema.**
- **A malformed draft was indistinguishable from an empty one.** `_extract_json_array` scanned for the first `[` and last `]`; when Sarvam returned a single bare turn object instead of an array (3 of 5 briefs), that scan found the inner `"features"` array, normalised zero dicts out of its strings, and returned `[]` with no exception. Now parses the whole body first, wraps a bare object, and raises when a non-empty parse yields nothing usable. Generalised as invariant §2.11: **a silent empty result is a bug.**
- **The cost estimate was wrong by ~20x, in our favour.** TTS was priced at ₹0.0001/char against Bulbul's actual ₹30/10K = ₹0.003, and LLM calls were double-counted for a "gate pass" that is pure Vidyut and costs nothing. `CHARS_PER_TURN` is now measured (37, from the 30 speakable nodes of the seeded scenario) rather than assumed. Corrected total for all 50 scenarios plus ~500 challenges: **~₹47**, or 0.2% of the ₹25,000 grant. **Owner approved the spend.** The real gate on P7 was never money — it is gate pass rate.
- **Duals route to Gemini via OpenRouter** (`openrouter:google/gemini-2.5-flash`), owner decision: one key we already hold rather than a second vendor account. Pinned to 2.5-flash because that is the model the §4.3 evals measured; OpenRouter also serves 3.x flash, and upgrading wants a re-run of the dual eval rather than an assumption. Verified live — returned देवौ, the correct nominative dual.
- **First live authoring batch: 2 usable scenarios from 5 briefs, ~₹0.05.** The open failure is that **the gate discards grammatically correct Sanskrit.** `अहं गृहं गच्छामि।` was rejected for claiming `PRES.1SG.ACT` — an invented suffix. So were `ADJ.SG`, `COP.PRES.1SG`, `PERF.1SG`. Cause: `_DRAFT_SYSTEM_PROMPT` never passes the brief's `target_features`, so the model guesses at our feature vocabulary from two examples. Now HANDOVER P6-3, and it blocks P7. **Do not loosen the gate to fix this** — the gate is correct, the prompt is not.
- **Lesson, and it is the reason four of these survived to production:** 300 passing tests proved none of it. `conftest.py` builds a fresh temp DB and mocks every provider, so the suite tests logic and not wiring. Definition of done now requires **one live smoke call on any task that touches a vendor path.** A fraction of a paisa would have caught all four.

## 2026-09-01 (evening) — vidyut.prakriya: the Pāṇini engine we already had

- **`vidyut.prakriya` has been installed this whole time and nothing imports it.** It produces full Pāṇinian derivations: भू → भवति in 20 steps, deva+टा → देवेन in 10, each step labelled with its sūtra (3.1.68 कर्तरि शप्, 7.3.84 सार्वधातुकार्धधातुकयोः, 6.1.78 एचोऽयवायावः, 6.1.87 आद्गुणः). `Data.load_sutras()` returns **5,152 sūtras with text**, and the dataset is **219 KB** — small enough to ship in the app bundle. Verified live on this machine.
- **This is the answer to "why not just use Duolingo."** No competitor can tell a learner *why* भवति is भवति, and an LLM cannot do it without hallucinating. A derivation is a proof, not a generated explanation — offline, deterministic, ₹0. Written up as HANDOVER phase **P9**.
- **It does not violate the no-local-models rule.** Vidyut is a rule-based Rust library with a data file, already a dependency. §2.7 constrains *inference*, not linguistics — a distinction the invariant now states explicitly, because P9 depends on it.
- **It shrinks RAG further.** §4.6 already sized retrieval down; its single best use was grammatical explanation, which prakriya answers exactly. Retrieval's remaining scope is smaller than it was this morning.
- **`vidyut.chandas` and `vidyut.sandhi` are also unused** — they cover UI_HANDOVER's U4-4 (metre rhythm strip) and U4-5 (sandhi visualisation) respectively, both currently specced as hand-authored work.
- **Maths in Sanskrit is scheduled as P10, deliberately last.** Līlāvatī and the Āryabhaṭīya are public domain, finite and famous, so it is content acquisition rather than authoring. But a numeral coverage audit comes first, because the "numbers are just nouns, the grader handles them" assumption is **half wrong and was measured**: `द्वौ बालकौ गच्छतः` parses perfectly, `त्रीणि` fails confidence, and `पञ्च` mis-parses *confidently* as `pañci VOC.SG`. That last one is the dangerous mode — §2.2 only protects the learner when the analyzer knows it is unsure.

## 2026-09-01 (night) — P6-3: the gate stops discarding correct Sanskrit, measured

- **The root cause was exactly what HANDOVER said: the brief's `target_features` were never passed to the draft prompt.** The model guessed at the 37-feature vocabulary from two examples and invented labels (`PRES.1SG.ACT`, `ADJ.SG`, `COP.PRES.1SG`, `PERF.*`). The closed set is now injected into `_DRAFT_SYSTEM_PROMPT` as a hard constraint, with a fallback to the test brief's `sample_features` so unit tests stay self-contained.
- **Controlled before/after on the same 5 briefs (`greeting-a`…`travel-a`, `--replace`), same model, new prompt: 2/5 usable scenarios became 5/5; gate pass rate 35/42 = 83.3% (acceptance demanded ≥4 scenarios and ≥80% of drafted turns).** Before the fix the pass rate was effectively zero on 3 briefs and the 2 "passed" briefs each needed multiple retries to reach volume.
- **Two further live failures surfaced only when the money path actually ran (the §3 lesson again — the mocked suite never sees these):**
  1. The model wrapped the array as `{"turns":[...]}`. `_extract_json_array` treated any dict as a bare single turn and re-wrapped it, so a perfect 8-turn reply parsed to "1 item, none usable" and the whole batch failed. The extractor now unwraps a single list-valued wrapper key before falling back to the bare-single-turn path.
  2. The short-draft retry only fired on *short-but-usable* drafts; an unusable reply **raised** before the retry branch was reached, so the P6-3 "retry once" never ran on the failure mode it exists for. Drafting now makes **up to two attempts and keeps the fullest usable result**, surfacing an error only if both yield nothing.
- **The remaining 7 gate failures are now correctly classified as genuine grammar mismatches, not invented labels.** `सः जनः कः?` claims `PRES.3SG` with no verb; `अहम् विद्यालयं गच्छामि` is 1SG but claims `PRES.2SG`. Both features are inside the closed set, so the classifier labels them "not derivable" (the Sanskrit claim is wrong) rather than "outside the allowed set" (the model invented a label). The gate is doing its job.
- **The gate never rejects a *derived* feature for being off-band** — the closed set only classifies failures, it never creates them. If the sentence genuinely derives a feature outside the band, it still passes. This closes the one way the fix could have re-introduced the original bug.
- **The batch script's `--replace` flag was parsed but never forwarded** — `author_batch._run_brief` hardcoded `replace=False`, so the P6-3 re-run would have refused every brief. Wired through `_run_brief`/`_run_batch`→`run_authoring`.
- **`.authoring-cache/` gitignore pattern pointed at `backend/.authoring-cache/` but the cache lives at `backend/app/.authoring-cache/`** — the cache was never actually ignored. Fixed, and the stale cache cleared to force fresh drafts for the before/after comparison.

## 2026-09-02 — P11 opened; the derivation is an addition to the LLM, not a replacement

- **The audit that produced P9 was incomplete: three more vidyut engines are idle, not one.** Measured live against `backend/.venv` and `backend/vidyut-data/` (78 MB, vidyut 0.4.0): `lipi` and `kosha` are used by `grading/analyzer.py`; **`prakriya`, `chandas`, `sandhi` and `cheda` are all installed with data and imported nowhere.** The 2026-09-01 entry noted chandas and sandhi in passing as "also unused" but left them as hand-authored UI work in U4-4/U4-5. They are now **HANDOVER phase P11**, and U4-4/U4-5 are amended to consume them instead of hand-authoring.
- **P11 is a different class of work from P7 and does not compete with it.** Every task is local computation — no vendor call, no quota, ₹0 marginal cost. It can run alongside content authoring rather than after it.
- **Owner ruling: the LLM stays. The derivation is an addition.** P9-3 previously read "keep the LLM explanation for meaning; grammar comes from the derivation," which was correct but too easy to misread as a swap — and the accompanying research summary did phrase it as a replacement. P9-3 now states the division of labour as a contract with both fields required: **`prakriya` answers *why this form*, the LLM (`services/explainer.py`) answers *what it means and why you would say it*.** Neither may be dropped when the other is unavailable, and each degrades independently to the existing authored-gloss path. What is retired is not the model but one job it was bad at — adjudicating grammar, which `DECISIONS.md` 2026-09-01 records it false-accusing on ~50% of dual-bearing content. Added to §6 as an escalation trigger, because deleting the explainer is the most likely way to get this wrong.
- **Owner request: the derivation is animated.** Written up as **UI_HANDOVER phase U7** (U7-1 … U7-5), DeepSeek's lane, blocked on U0-2 and P9-2. U7-1 pins two things learned from the real output: a run of steps can leave the form **unchanged** (`1.3.2` and `1.3.3` both yield `भू लँट्`) and must not be given an invented visual change; and **Devanagari conjuncts cannot be path-tweened**, so the step transition is a diffed-span cross-fade, not a glyph morph. P9-5 gains two shape constraints so the animation is possible at all: every step carries its own complete `result`, and `step_count` ships in the envelope.
- **Metre naming is not a promise; scansion is.** `chandas.classify()` on Gītā 1.1 returns correct per-syllable weights (G G G G L G G G L L G G L G L G · …) but **`padya` is `None`** — anuṣṭubh is variable and absent from the 145-vṛtta table. The `Match` object exposes only `aksharas` and `padya`. P11-1 types the name optional and U7-3 renders the rhythm strip without it. Filling a null metre name with a guess is now an escalation trigger — it is precisely the failure P9 exists to end.
- **Three live API shapes are pinned in HANDOVER because the obvious guesses are wrong**, and each would have cost an implementing agent a debugging session: `Vyakarana.derive()` takes one `Pada.Tinanta`/`Pada.Subanta` args object and returns a **list**; `Chandas.from_text()` exists and `from_here()` does not; and **`load_sutras()` returns 5,152 entries but only 5,056 unique codes**, so `{s.code: s.text for s in ...}` silently drops 96 sūtras and returns the last writer's text — an invisible way to show a learner the wrong rule.
- **P10 now leads with Piṅgala rather than Bhāskara, and gates on P11-1.** The *Chandaḥśāstra*'s light/heavy enumeration is a binary encoding and its *mātrāmeru* is the Fibonacci sequence, so a learner who has used the scansion surface has already been manipulating binary strings. That costs one screen on top of P11-1, whereas Līlāvatī costs the numeral-coverage audit plus an authoring pass. Līlāvatī stays, second.
- **Recorded, not acted on: CBSE made a third language compulsory from Class 6 in 2026** and Sanskrit is the default option in most English-medium schools, with textbooks unpublished. The hardest object in that syllabus — śabdarūpa/dhāturūpa tables — is exactly what `prakriya` generates, so **P11-5 serves it without any content pipeline**. The policy is in litigation and must not drive architecture; P11-5 is justified by P9 alone.
- **Two stale numbers corrected.** Backend tests are **310 collected** (recorded as 308 in Status and 300 in §3/§7). The repo map's `vidyut-data/` entry listed only `prakriya/`; it now lists all five datasets with their usage state.

## 2026-09-02 — The conversation looped; the escape ladder now teaches instead of terminating

- **Owner report, reproduced exactly — first in tests, then against the running app: the conversation repeated two lines forever.** "साधु! भवान् कः?" → any wrong answer → "सही शब्द चुनें — क्या आपने 'रामः' कहा?" → back to the question, with no exit. **Four** defects stacked, each individually reasonable. The first is the one that ran in production; the other three were each sufficient to reproduce the loop on their own, and were found by fixing in order:
  0. **The LLM edge-router laundered every failed Sanskrit answer into a bridge match.** The seeded graph carries *fallback routing edges* — bridge edges with no `expected_phrases` and no `expected_text`, wired from a question to its repair purely so `_pick_repair_node` can find one. They are not utterances a learner can produce, but `process_turn` handed them to the router as candidate replies. At a question node whose only bridge edge is its fallback, the router had **exactly one candidate and picked it**, so a wrong answer came back `matched=True`, verdict **`correct`**, and walked to the repair node — no escape logged, no streak, ladder never consulted. The deterministic matcher had always ignored these (an empty phrase list cannot hit); only the router was fooled. This also broke the router's own stated contract — *"the router PICKS an edge; it does not grade"* — by producing a `correct` verdict for Sanskrit the grader had just rejected. Candidates are now filtered to edges that carry at least one expected phrase. **Caught only by driving the real app**: every test stubs the router, and the stub returns None for an empty phrase list, so the whole suite was blind to it.
  1. **`consecutive_escapes` was reset by the repair node's own acknowledgement.** `_handle_match` cleared the streak on *any* match, and a repair node's only exit is a bridge "हाँ" back to the question just missed. So the counter was zeroed on every other turn and the escalation ladder never reached 3. The 2026-08-29 human-review fix (finding 2) closed the repair→repair loop but not the question↔repair one — the counter existed and was defeated. Now the streak survives a repair node's acknowledgement (`current_node.kind != "repair"`); only real forward progress clears it.
  2. **Escape 4 ended the session.** With (1) fixed, the ladder's terminus traded the loop for a dead end: a learner who misses question 1 of 12 lost the whole scenario and met the same wall on every restart. **Escape 4 now reveals the authored answer and steps the graph forward** (`_reveal_and_advance`, verdict `revealed`). This overturns the recorded "4 terminates the session (no exits offered)" — the escape rows are still written, so the authoring backlog keeps its signal, but the runtime no longer punts a stuck learner to a restart that reproduces the same wall. Graceful termination remains the fallback when no forward sa-edge is in reach.
  3. **`_pick_repair_node`'s scenario-wide fallback rewound the learner to the beginning.** A node with no repair in reach fell back to the *first repair node by `sort`* — whose exits rejoin the graph wherever its author put them. For the seeded scenario that is `n00r`, which leads back to question 1, so escaping at a late node silently teleported the learner backwards; fixing (1) and (2) alone just exposed a 3-cycle (n02 → n00r → n01 → n02). The fallback now **holds the learner on the question**. This cannot strand a session any more — that was the fallback's original justification — because the ladder in (2) now provides the exit.
- **The graph accepts one authored sentence per question, and the client showed none of them.** `edges[].expected_text` has always been in the turn payload and nothing rendered it, so "भवान् कः?" was answerable only by guessing "aham rāmaḥ asmi" — a learner answering with their own name gets `unsure` and escapes, which is how the owner hit the loop on the very first Sanskrit question. Conversation now carries a collapsed **"Show me what to say"** hint: learner-initiated, costs no turn, never touches the graph. Shown on ask, not on arrival.
- **`revealed` is a verdict the client must not swallow.** Escape turns render fixed copy ("I didn't quite catch that — no penalty") *in place of* the server diagnosis, deliberately, so an escape never accuses. The reveal is an escape whose diagnosis *is* the answer, so it is exempted by verdict rather than by relaxing the rule. `TurnVerdict` in `api/client.ts` now names the conversation-only verdicts (`no_match`, `empty`, `meta`, `revealed`) that `Verdict` never had.
- **Lesson: the router stub hid the bug that mattered.** `_StubRouter` models meaning-matching over phrase lists, which is a faithful model of the router's *job* but not of its *failure mode* — an LLM handed one candidate picks it. Defect 0 was invisible to 311 passing tests and took ninety seconds of typing into the running app. Live verification is now the closing step for any conversation-runtime change, not an optional extra.
- **Regression tests replace the terminate assertion**: `test_router_never_offered_fallback_routing_edges` (a wrong answer must never grade `correct`), `test_repair_acknowledgement_does_not_reset_escape_streak` (the owner's exact loop) and `test_consecutive_escapes_escalate_and_reveal` (the ladder reveals and never parks the learner on an already-visited node). Suite: **312 passed**; end-to-end run against the live server confirms four escapes → reveal → question 2, and the happy path unaffected.

## 2026-09-02 (later) — The dialogue graph leaves the live turn path; Sarvam speaks, Vidyut decides

Owner ruling after the loop fix landed and the app *still* rejected a correct answer: **"Why scoring? Why expecting a particular option? Why nodes? Why can't we have an LLM with guardrails? I don't want to save on LLM cost."** All of it followed from one decision — §12's model-free turn — and the cost ceiling that justified it is gone (₹25k of Sarvam credit on hand).

- **The graph could only ever accept the one sentence its author enumerated.** `aham anshul asmi` — correct Sanskrit, correct answer to `भवान् कः?` — was rejected because the sole accepted parse was `{rāma: NOM.SG, √as: PRES.1SG}`. The escape copy ("no penalty") was an apology for that rigidity, not pedagogy. Fixing the loop stopped the spinning; it could not make a correct answer correct.
- **`services/tutor.py` replaces edge matching on the live path.** Division of labour, the same one `services/authoring.py` already uses offline, pointed at the runtime: **Vidyut decides grammar, Sarvam decides what to say.** The learner's line is analysed *before* the model sees it and handed over as fact; the model's Sanskrit is analysed *after* and never spoken if it fails — one retry at a simpler register, then the turn keeps its bridge half and drops the Sanskrit. The model never assigns a verdict.
- **The graph is now the curriculum, not the script.** `DialogueScenario` still supplies the situation, and `target_features()` collects the features its authored sa-edges exercise — the syllabus the conversation should create openings for. Graph mode survives intact behind `mode="graph"` and is the automatic fallback when the tutor is unconfigured; every existing graph test still runs against it.
- **`is_confident()` was the wrong gate and always had been.** It requires EVERY word to parse, so no sentence containing a name can pass it. `sanskrit_health()` asks the weaker, correct question — what share of the line read cleanly — because the analyzer cannot tell a name from gibberish anyway (both return `error="unrecognized"`). Measured: `aham anshul asmi` parses 67% with the frame intact; word salad parses 0%.
- **Three failures found only by driving the real app, each invisible to the suite:**
  1. **Vidyut force-declines Hindi and English.** `mujhe nahi pata` comes back as `mujha = LOC.SG, nah = LOC.SG, pat = VOC.SG`, 100% confident. Handing that to the model as fact invites it to correct a learner's Hindi as bad Sanskrit. A `looks_sanskrit` heuristic (a recognised verb root `√…` or a pronoun — present in every real attempt, absent from every bridge-language line measured) now decides whether the analysis is reported at all; when it is not, the prompt says so and says why.
  2. **The model answered entirely in Hindi in the `sanskrit` field**, sailed through the health check (Devanagari Hindi parses), and the app rendered the same sentence twice — once as each half of the turn. Caught on screen, not in tests. `_HINDI_MARKERS` (high-frequency forms that are never Sanskrit) plus an identical-halves check move such a line to the bridge where it belongs.
  3. **`looks_sanskrit` must NOT gate the tutor's outgoing Sanskrit.** Requiring a root broke `भवान् कः?` — Sanskrit elides the copula, and verbless nominal sentences are ordinary beginner material. `ok` (speakable) and `looks_sanskrit` (was this an attempt at Sanskrit) answer different questions and are kept apart.
- **Prompt requirements that only measurement produced**: without an explicit "every turn must contain Sanskrit", the model settled into near-pure Hindi — 3 of 4 turns carried none, in a Sanskrit app. And `correction` was being used to *confirm* correct answers ("mitram is accusative, which fits here"), so it is now restricted to errors only.
- **Cost and metering.** Starting a session is now itself a metered model call, so `/conversation/start` can return 429 — `test_quota.py` starts in graph mode for exactly this reason. `tutor_temperature` is non-zero on purpose: a tutor repeating itself verbatim is the failure this replaced.
- **Schema**: migration `b2c3d4e5f6a7` adds `conversation_turns` (the tutor's memory — the graph's history *was* the node pointer, a model needs telling) and `conversation_sessions.mode`, and makes `current_node_id` nullable because a free-form session has no position in a graph.
- Suite: **373 passed**, 33 of them new in `tests/test_tutor.py`. Verified live against real Sarvam: `aham anshul asmi` accepted, free-form answers nowhere in the graph accepted, a Hindi reply answered by *teaching* the Sanskrit for it (`न जानामि`), and a real Vidyut-grounded correction (`mitram` → `mitraḥ`, "it is the subject").

## 2026-09-02 (later) — six tabs, a drawer, and 653 lines of unreachable screens

- **The client cannot reach what it already has.** Audit: `screens/Path.tsx` (339 lines, U3-1, the journey map) is **not imported in `App.tsx`, not in `MainTabs`, and nothing navigates to it** — dead code. `WordOrder.tsx` (161) and `Paradigm.tsx` (153) are registered as root-stack routes but **nothing navigates to either.** The entire app contains **one** `navigation.navigate()` call: Home → Challenge. `Path.tsx`'s `onStartUnit` is a stub that closes the sheet and comments "navigation integration is later". Written up as **UI_HANDOVER U8-0**, and it is now the first task anyone should pick up in either document — roughly an hour for roughly triple the reachable app.
- **Owner decision: six bottom tabs — Home · Path · Talk · Play · Grammar · Progress — plus a left drawer behind a hamburger** for account and settings. `UI_HANDOVER` phase **U8**.
- **Śloka and Varṇamālā stop being tabs and become Home cards** (owner decision). A once-a-day ritual and an alphabet reference are not destinations; Home becomes the daily hub (continue · today's śloka · daily word · varṇamālā). **Both screen files survive unchanged and keep their routes** — this is a navigation change, not a deletion.
- **`Profile.tsx` turns out to contain no settings at all** — 303 lines of pure stats (streak, the two ratios, mastery rings). So the "move Profile to the drawer" decision splits: the screen becomes the **Progress** tab essentially unchanged, and the drawer's settings content (sound and haptics toggles, reduced-motion override, text size, account, sign out) is **new work that has never existed**. `services/sfx.ts` and `haptics.ts` have had no user-facing toggle this whole time, which U6-2 already required.
- **The Sanskrit ratio dial stays on Progress rather than moving to the drawer.** It is the product's most distinctive idea (U4-3); burying a differentiator in a settings list is how it stops being one. The two-writer rule (§2.3) is unchanged.
- **Six tabs is at the width limit and is specced with an explicit failure rule.** 60dp per tab on a 360dp screen, against a §9.6 requirement that 200% font work. U8-1 adopts: below 360dp **or** at font scale ≥ 1.5, render icons only with `accessibilityLabel` intact — **never** truncate a label to an ellipsis. A seventh tab is now an escalation trigger (§6).
- **`@react-navigation/drawer` is not installed**; `react-native-gesture-handler` (~2.32.0) and `react-native-reanimated` (4.5.1) already are, so the drawer costs one package. `expo-notifications` is also absent, which is why P13 exists.
- **Five phases added to close the roadmap to launch, all of which were simply missing.** **P12** the daily-word service (the growth loop's backend, gated on P11-4 — and if the phonetic scoring degrades to exact/present/absent it must not ship, because then it is only a worse Wordle in a language nobody plays it in); **P13** the return loop (a habit product with no notification path at all); **P14** entitlements and subscription (⚠ owner-gated in every particular — and P14-2 writes down the standing ruling that **no hearts, no energy, no meter may ever stop a willing learner**, plus that the daily word is never gated because gating the acquisition loop breaks acquisition); **P15** the verse chain (`श्लोक-अन्त्याक्षरी`, WhatsApp-shaped invites, family streak); **P16** `अवधानम्`, deliberately last.
- **P16 costs nothing today but constrains two things now:** `session_store` currently assumes one concurrent task, and the scansion and derivation services must stay stateless so several can run at once. Both are free if known now and rewrites if discovered later.

## 2026-09-04 — P7-8 restore + P7-6b corpus (grant spend ₹0)

- **P7-8 — five authored scenarios restored from the authoring cache, at ₹0.**
  Ran `author_batch --live --limit 5 --replace`; all five briefs hit the on-disk
  cache (`authoring cache hit` ×5), so no Sarvam grant was spent. DB now holds
  6 scenarios: the approved seed + five `pending` (अभिवादनम्/परिवारः/भोजनम्/बाजारः/यात्रा),
  totalling 70 nodes / 100 edges — exactly the authored content lost in the
  2026-09-03 rebuild. Review packet: `backend/review-p7-8.txt`. `app.db.bak-20260904`
  taken beforehand. The seven gate failures (market-a ×3, travel-a ×4) flag
  specific nodes for the human review gate; judgements stay with the owner.
- **P7-6b — śloka corpus expanded 6 → 96 verses** (Gītā, Hitopadeśa, subhāṣita,
  Nītiśataka, Pañcatantra), ordered by difficulty. Metre stays engine-derived
  (`services/chandas.py`), dates stay anchored off `SHLOKA_ANCHOR`; 96 distinct
  `day_offset` values. No network in tests.

## 2026-09-04 — P7-4 challenges at volume (live, 410 inserted)

Built and ran the live challenge pipeline (`scripts/challenge_batch.py` +
`app/services/challenge_authoring.py`). 500 drafted (one LLM call each, ~₹2.75),
**410 passed the Vidyut gate (82%)** and were inserted, 90 flagged to the
backlog. Register split 252 laukika / 200 classical across the five feature
bands; band 'e' (dual-bearing) scored the HIGHEST pass rate (100%/94%) —
confirming the §4.3 Gemini-over-OpenRouter routing for duals. Every stored
`accepted_parses` is derived from analyzing the target (never hand-written);
a validation mirror of POST /pipeline/run confirms **all 452 challenges**
(410 new + 42 prior) pass Vidyut re-derivation with zero anomalies.

Two pipeline fixes surfaced by live smoke-tests: (1) the drafting prompt was
telling the model to 'claim the whole band', so it over-claimed features (e.g.
NOM.SG on a subjectless sentence) and the gate rightly rejected them — the
prompt now demands HONEST feature-claiming (omit rather than invent); (2)
Sarvam's conversational model returns ~one object per call even asked for an
array, so drafting switched to one challenge per call (matches the ₹0.0055/call
cost model) with a bounded retry. Challenge cache key includes the prompt hash,
so a prompt change invalidates stale drafts — a replay of an identical brief
stays ₹0.

## 2026-09-05 — P7-12 dual pass rate measured live, per provider

Ran the focused challenge-band catalogue (`CHALLENGE_BANDS`, 20 bands × Sarvam
laukika/classical + dual-to-Gemini) at --per-group 6 (smoke, ~₹0.66). Result:

- **Dual→Gemini pass rate: 100% (30/30)**. The §2.6 dual-over-OpenRouter/Gemini
  path — which P7-4 §4.3 noted had NEVER produced a challenge — now produces and
  passes at 100%. The routing rule is confirmed in practice, not assumed.
- **Sarvam pass rate: 74% (67/90)** on the same gate. The rule holds: duals to
  Gemini, everything else to Sarvam.
- 56 NEW distinct challenges inserted; 41 duplicate-skips (idempotent by
  (target,register)); 23 to backlog.
- `cl-gen-pl` (classical GEN.PL) passed 0/6 — a Sarvam clause-generation miss,
  noted for a future band or provider routing.

Coal-mine conclusion: the case+tense+person features the analyzer derives
(GEN.PL, LOC.PL, PRES.2PL, IMP.2SG, INSTR/DAT/ABL.SG, the DU forms) are all
reachable. Gender (MASC/FEM/NEUT), voice, bare number, and the four sandhi tags
are NOT derivable by Vidyut (frozen, §2.1) — they stay out of the gate and are
a coverage ceiling, not a generation defect.

## 2026-09-06 — P8-0 agent half + P8-1 + P7-12 free half landed

- **P8-0 (agent half):** `review_scenarios.py --challenges --packet` now writes
  a BAND-SORTED packet (ABL.SG rows together, DAT.SG rows together, …) with
  sandhi-variant near-duplicates written ADJACENT under a ⚠ marker. Bulk
  approve by band (`--approve-band`) already existed; no auto-approval anywhere.
  216 pending challenges packeted to `challenge_packet_p8_0.txt` for the owner.
- **P8-1:** the app was booted once; `run_seed()` refilled both wells (96
  ślokas, 30 daily words — verified by row count). New guard test
  `test_seed_is_never_behind_the_database` fails NAMING any well whose DB
  count is below its seed count, so "the seed is ahead of the database" is a
  red test rather than something a human notices five days later.
- **P7-12 (free half):** 8 of the 13 never-exercised features turn out to be a
  *claiming* gap, not a generation gap: `feature_derivation.py` re-derives
  bare number (SG/PL/DU) and pada (PARASMAIPADA/ATMANEPADA via the
  1.3.12-in-log rule) from engine output and enriches existing challenges —
  260 rows gained 569 feature claims at ₹0, coverage 23 → 24 of 37. The 15
  new sandhi challenges are generated FROM `services/sandhi.py` + chedaka
  round-trip verification, never an LLM draft. Gender stays unclaimed: the
  kosha's surface liṅga data is not unanimous (kanyā → 3 liṅgas) and wrong on
  some words (mātṛ → napuṃsaka) — escalated as an analyzer gap, per §2.1.
- **DB backup:** `app.db.bak-20260906` taken before the enrich/sandhi writes
  (§2.13); challenge rows 249 → 264 (15 new distinct sandhi challenges).


## 2026-09-06 — P20-2 stroke-order data is authored from scratch

- **Provenance:** every stroke path in `backend/app/seeds/stroke_data.py` was
  authored for this project. No stroke-order chart was copied, traced, or
  scraped from any textbook, chart, or website — those are frequently
  copyrighted and the handover (P20-2) forbids it. The paths were written
  against the geometric structure of each akṣara in a 0–100 guide box
  (y-down, śirorekhā at y=10) and verified by rendering every letter
  (`backend/scripts/verify_strokes.py` → `results/stroke_sheets/strokes.png`)
  and comparing by eye against Nirmala-UI-rendered letterforms.
- **Licence:** original work, ships as part of Shabd, no external licence.
- **Coverage:** 49 akṣaras (14 vowels, 33 consonants incl. nasals, anusvara,
  visarga). Mātrā-modified forms are NOT separately authored — the canvas
  composes base + mātrā, and mātrā strokes are the small hooks shown in the
  base letter's later strokes. Missing letters return `None` and the
  demonstration degrades to the reference render without animation (absent is
  absent; never a guess).
- Each stroke carries `dir` (pen travel) so U12-1 animates the true direction
  and U12-3 can check order/direction, which ML Kit does not provide.


## 2026-09-05 — the conversation turn is measured before it is optimised

- **The complaint was "a bit slow"; the measurement was 4.0 s** from mic-stop
  to the reply appearing (read off a screen recording: recording 3.0→10.5 s,
  reply at 14.5 s). That number is the sum of four serial hops and says
  nothing about which one to attack, so `mobile/src/utils/perf.ts` now marks
  each — `stop → flush → stt → turn → speak(...)` — and logs one line per
  turn with the dominant stage named. Dev-only; a release build pays a
  `Date.now()` per mark and nothing else.
- **The 300 ms sleep after `recorder.stop()` is gone.** It was a number
  picked to be comfortably larger than the real encoder flush, which made it
  wrong twice: it spent 300 ms of every turn, and it would still have raced
  on a slow device. `utils/recording.ts` polls for the file to exist and stop
  growing instead — two 20 ms ticks in practice, and it actually answers the
  question being asked.
- **Live TTS never got the lip-sync fix.** `playTutorAudio` had two separate
  implementations and only the pre-rendered-url one grew the `onStart`
  listener, so on every line WITHOUT a static file — which in LLM mode is
  every line — the mouth still started at call time and ran ahead of the
  voice. Both paths now share one `playSource`.
- **LLM turns return their audio inline** (`NodeOut.audio_base64`), removing
  the client's separate /speech/tts call. This is a trade, not a free win:
  the voice arrives one round trip sooner, but the text bubble now waits for
  TTS where before it landed as soon as the model had written the line.
  Which reads as faster is a question about feel, so `settings.
  conversation_inline_audio` turns it off for an A/B against the `[perf]`
  lines rather than settling it by assertion.
- **Graph mode deliberately does NOT do this.** Synthesising an unrendered
  graph node on the turn path would put a vendor call on a path designed to
  stay off the network, and would re-synthesise the same authored line every
  time it is reached — an unrendered node is a gap in the pre-render
  pipeline, not something to paper over per-turn. The test suite caught this
  the honest way: 24 conversation tests started hitting Sarvam for real.
- **`_inline_tts` catches `Exception`, on purpose.** `SarvamError` covers
  only what the vendor client chooses to raise; a proxy/DNS/timeout error
  arrives untranslated from httpx, and letting one escape turned a missing
  voice clip into a failed turn. Silence is a bad outcome; losing the
  learner's sentence is a much worse one.
- **Still unmeasured:** how the 4.0 s actually splits. STT, the LLM and TTS
  are all plausible dominators and the next recording's `[perf]` line
  decides. Streaming the first sentence to TTS while the model is still
  generating is the obvious next lever, and is not worth building until the
  numbers say TTS is the problem.

## 2026-09-06 — P21-1 + P21-2, the canon reader (backend) + U13 (client)

- **Built a reader, not a shelf.** `GET /shlokas` returns the whole verse
  corpus (`shlokas`, 96 rows) in date order, auth-bound, with the
  already-populated `word_breakdown` on every row. The reader's
  instrumentation — word, meaning, features — was already in the schema and
  populated; the task was exposing it, not authoring it (P21-1).
- **The tap-a-word engine path reuses P19's routing table, not a second one**
  (P21-2, UI_HANDOVER U13-2): tapping a word opens U11's `AskSheet` with the
  word as `subject` (`surface:"shloka"`). The `parse`/`split`/`scansion`
  engine blocks and the model explanation are both one tap away, and the
  learner never types context. A ₹0 inline gloss card (word + meaning +
  feature chips from `word_breakdown`) answers the instant case before any
  model is involved.
- **Words are tokenised from `word_breakdown`, never split from the verse
  text.** Sandhi fuses boundaries, so the breakdown is the trustworthy
  tokeniser; splitting the string would fragment compound words.
- **The reader never grades and never reads aloud** (U13-3, P21): no verdict,
  no streak, no meter. No TTS in the list — audio goes only on what is
  actually studied, and a corpus of 10M chars is ₹30,000+ at Bulbul rates.
- **Siting:** the reader is a stack screen reached from a "Read" card on the
  Grammar tab — not a seventh tab (the six is a hard max). Reading is a
  reference posture, so it lives with the other reference surfaces.
- **No new dependency.** The verse list uses RN primitives + Reanimated
  (already installed); the reading page-turn is `components/PageFlip.tsx` — a
  perspective-based `rotateY` fold with the content swap driven from the UI
  thread via `runOnJS`. Nothing was added to package.json.
- **Reading is a page, the list is an index.** Tapping a card enters a
  full-page reading posture with a 3D page-turn to adjacent verses; the
  collapsed list stays a vertical scroll (not a horizontal pager, U13-1). The
  turn is skippable (§3.7) and swapped instantly under Reduce Motion (§3.4).
- **2026-09-15 — the book curls (owner's call).** The rigid `rotateY` flip
  (`PageFlip`, then `BookFlip`) is replaced by
  `components/book/PageCurlBook.tsx`: a true paper curl on iOS and Android,
  with no rigid fallback — "true paper curl only". Still no new dependency: it
  is the first runtime use of the already-installed Skia (`makeImageFromView`
  snapshots + an SkSL cylinder-curl shader in `book/curlMath.ts`). Snapshots
  are taken at rest, never on touch-down. Web gets a no-op `CurlLayer.tsx`
  (Skia cannot snapshot RN views there) and turns instantly, as Reduce Motion
  does. The contents list stays the landing page (also the owner's call), now
  under the book's cover with **Open book** / **Continue**; any verse row
  opens the book at that verse.
- Tests: `backend/tests/test_shloka_reader.py` (4) — auth-gated list,
  ascending-date order, word_breakdown instrumentation present, deterministic
  across calls. Suite 495 → 499.

## 2026-09-07 — P22 curriculum layer + P21-3 second text (implementation)

- **P22-1/3/4 shipped: the Lesson content type, Units 1–3, `has_lesson`.**
  `lessons` table (migration `c9d0e1f2a3b4`, applied) + `GET
  /lessons/{feature_id}` (honest 404, no quota — examples were verified at
  seed time). 10 lessons seeded (u1 Sounds → u3 all six remaining vibhaktis);
  bodies are ORIGINAL Sanskritam prose, so P22-3's learnsanskrit.org licence
  question never arises — if a future pass adapts external prose, the exact
  licence lands in the row's `provenance` first (§6). The Path spine exposes
  `has_lesson`; Path routes Learn → Practice → Challenge (U14-1/2/3:
  `Lesson.tsx` + `VisualGrid/Tree/StateMachine`, all presentational over
  pre-computed `visual_data` — the derivation engine is never called
  client-side).
- **Example verification is equality, not non-emptiness.** The seed stores an
  example only when `prakriya.derive` reproduces its surface form EXACTLY.
  Measured drops that justify the strictness: वद् → वन्दते, गम् →
  unresolvable, feminine ā-stems (कन्या/सीता → -ाः), and my own wrong enum
  name (`Pancami`, not `Pancami` — `_enum_member` silently falls back to
  Prathama, which the equality check caught). A confident-wrong derivation
  in a lesson is worse than no example; the check keeps all three out.
- **P22-2 shipped: 10 samāsa/kāraka features, taxonomy-only by design.**
  Ranks 81–84 / 91–96; no band references them (test asserts it) and
  `p712_feature_coverage.py --coverage` names them "unclaimed by design".
  The analyzer stays frozen (§2.1); challenge coverage is a later analyzer
  question, not an LLM prompt.
- **P22-5/6 shipped small and licence-clean.** `vocab_words` (60 rows, 10
  topics, original glosses, example sentences drawn from Vidyut-gated
  approved challenges — only 7/60 words have pool sentences yet, the rest
  ship `examples: []`) and `reader_passages` (3 tiers from already-servable
  content). WordNet cross-reference and the DCS import are deferred pending
  the §6 licence confirmations; each row's `provenance` says so. Client:
  `Vocab.tsx` from a Play card, graded tiers inside `Reader.tsx` (same
  tap-a-word page, no new screen, no verdict/score anywhere).
- **P21-3 shipped: the importer, plus Gītā 2.1–6 as the second text.**
  `scripts/import_text.py` (dry-run default, idempotent by `source_ref`,
  licence REQUIRED in the payload, no TTS — test asserts `audio_url ==
  ""`, engine floor of ≥2 confident breakdown words, dates continue past
  max). 6/6 verses passed with 0 skips; re-run adds 0; corpus 96 → 102 with
  zero UI work (same `GET /shlokas`). Backup `app.db.bak-20260907` (§2.13);
  licence + counts in `results/imports/gita-ch2-opening.src.json`.
- **Explicitly NOT built this pass (gated, per §6):** P13 (blocked by P8 —
  no users to notify), P14 (pricing), P15/P16 (gated), P10-2/3 (P10-1's stop
  condition holds — पञ्च still confident-misparses, so this is an analyzer
  question, not content), P8-0/4/5 (owner), U1 (owner's lane), U3-5 (ask
  first), U12-4 (needs the ML Kit dev build + on-device verification).
- Suite 499 → **521** (`test_p22_lessons` 8, `test_p22_vocab_reader` 10,
  `test_p21_import` 4); mobile `tsc` clean; `alembic current == heads` (`c9d0e1f2a3b4`). One pre-existing
  env-dependent failure noted: `test_tts_502_refunds_quota` needs
  `SARVAM_API_KEY` set (passes with a dummy key) — untouched area, not a
  regression.

## 2026-09-08 — P13 + P14 plumbing + P8-4 + U3-4/U5-1/U10-3 (all tracks)

- **P13-1 shipped (backend; expo package + scheduling stay behind P8).**
  `push_tokens` (unique per learner/device, 2-strike dead rule, re-register
  revives) + `notification_sends` (write-is-idempotency per
  learner/local-date/kind) + `services/notify.py` (learner-local dates via
  `localtime`, 1/day max across kinds, ignore-decay stops at 3 trailing
  unopened sends, transport injected so tests run with NO network) +
  `routers/notify.py` (register/replace, delete, admin run, ignored-streak
  inspect). Copy (`build_message`) carries content or a warm default and was
  asserted against a banned-word list (streak/gone/days/lost/shame/urgent/
  hurry/missed/lazy) — P13-2's no-guilt rule as a test, not a comment.
  Client seam: `api.registerPushToken/removePushToken` +
  `services/push.ts` (dynamic-require expo-notifications, no-ops without it —
  no package.json change) + fire-and-forget registration on session apply.
- **P14-1/2 shipped as plumbing ONLY (pricing/tiers/store stay owner-gated).**
  `entitlements` (one per learner) + `has_entitlement` as the ONLY reader:
  everything currently free answers True on every tier (12 ALWAYS_FREE
  surfaces + unknown-future defaults open), so behaviour is unchanged;
  `conversation_open` is the sole premium surface (free → False,
  live plus/institutional → True, expired → free, unknown tier → free).
  Vendor errors fail closed, own outages fail open. Two invariant tests carry
  P14-2: all 13 never-gated surfaces True on a paid tier, and a schema guard
  (`hearts`/`energy`/`lives` must never appear unnoticed) plus a
  no-client-provisioning route assertion.
- **P8-4 shipped: the question + thresholds BEFORE any invite.**
  `services/retention.py` records `P8_QUESTION` verbatim and tripwire
  thresholds (escape ≤0.35, live-share ≤0.50, day-2 ≥0.30, n=10 — lenient by
  design at n=10). `day2_return` excludes today-first learners from the
  denominator; `p8_report` bundles question/numbers/thresholds/checks and is
  surfaced in `GET /admin/metrics` as `retention` + `p8`.
- **U3-4 shipped (Lottie ART still owner-supplied).** `services/achievements`
  (5 milestones with Sanskrit motifs, AsyncStorage bookkeeping, idempotent
  grants) + `AchievementReveal` (skippable spring sheet, instant under Reduce
  Motion, badgeUnlock sfx + haptics) + Progress shelf (locked tiles dimmed
  with hints, sparsha 25-counter) + events in Conversation (complete),
  Challenge (dual correct), Shloka (studied), Varnamala (sparsha attempt),
  Progress (streak ≥7). No leaderboard — U3-5 stays ask-first.
- **U5-1/U5-4/U10-3 deltas (device TalkBack/VoiceOver pass still open).**
  `utils/announce.ts` + calls in VerdictSheet/Writing/Varnamala (unsure
  announces the system's failure, §3.3); 44pt floors on Settings sizer,
  Progress dial/repair, FetchError/AchievementReveal buttons (Home already
  had it); shared `FetchError` + retryable states where silent catches left
  permanent skeletons (Progress all-three-fail, Shloka fail-vs-empty split,
  Varnamala grid fail). U5-2 ramp + 18pt floor already existed
  (`useTypeScale`); U10-1 dev-gate + U6-2 sound family were already in code
  (docs were stale — synced).
- **Explicitly NOT built (gated, per §6):** P8-0 review itself, P8-5
  platform, P14 pricing/tiers/store, P21-4 canon contents, P15/P16, P10-2/3
  (P10-1 stop holds), RAG, NCERT copy, U1 (owner's lane), U3-5 (ask first),
  U6-1 device profiling, U6-3 submission, U12-4 (ML Kit dev build).
- Suite 521 → **543** (`test_p13_notify` 9, `test_p14_entitlement` 8,
  `test_p84_retention` 4); mobile `tsc` clean; `alembic current == heads`
  (`d1e2f3a4b5c6`). Same pre-existing env failure (`test_tts_502_refunds_quota`
  needs `SARVAM_API_KEY`) — untouched area, not a regression.

## 2026-09-08 (later) — blocked items, worked one by one

- **P10-1 resolved: P10-2/3 STOP.** Ran the audit live (no network, no spend):
  30 numerals → 20 ok · 2 unresolved (एकादश, त्रयोदश) · **8 confident
  misparses** (पञ्च, सप्त, अष्ट, नव, द्वादश, चतुर्दश, षोडश, नवदश — all
  confident VOC.SG, the dangerous mode §2.2 cannot catch); 12/12 Līlāvatī
  vocab ok. The phase's own stop condition tripped, so P10-2/3 become a
  frozen-analyzer escalation (§2.1 — do NOT fix the analyzer). The
  Piṅgala-first screen needs no numeral grading and is unaffected. Recorded in
  HANDOVER P10-1; `test_p10_numeral_audit` pins the stop condition.
- **U12-4 done in code; dev build to run.** `photoRecogniser.ts` (same
  dynamic-require + honest-unavailable shape as `inkRecogniser.ts`, several
  export shapes accepted, no cloud fallback) + `PhotoCapture.tsx`
  (single-letter framing guide, denied-state copy, uri never retained) +
  Writing ink/photo mode switch posting `source: "photo"` through the same
  attempt pipeline (server thresholds already biased, P20-4). `tsc` clean.
  What remains is hardware/build work an agent cannot do: install the Text
  Recognition module, config plugin, dev build, on-device verification.
- **Static a11y audit: 0 issues.** New `mobile/scripts/a11y-audit.js`
  (report-only: Pressable label+role, TextInput label, banned touchables —
  with a generics guard so `useRef<TextInput>` is not flagged). First run
  found 25 real gaps (SessionShell confirm buttons, ui Button/Chip
  primitives, VarnaGrid tile, Challenge/Conversation inputs, Grammar
  toggles/recents, Path backdrop, Progress dial, Settings link, Varnamala
  cells); all fixed, re-run is 0. The TalkBack/VoiceOver device pass still
  needs hardware (§U5-1) — the script is a flashlight, not a gate.
- **U6-3 prep done; submission owner-gated.** `app.json` splash `image` was
  unwired while `splash-icon.png` sat in assets — wired it; full set (icon,
  adaptive foreground/background/monochrome, favicon, splash) verified via
  `expo config`. `tsc` clean.
- **Left for owner/hardware (checklist, not code):** P8-0 review itself (5
  scenarios + 231 challenges — packets: `review_scenarios --packet`); U3-5
  leagues (product-identity call); RAG (explicit owner decision per §4); U1
  mascot (owner's lane); device passes (TalkBack/VoiceOver, U6-1 profiling,
  ML Kit dev-build verification). P8-5 and P21-4 are DONE (see below); P14
  pricing/tiers/store wiring is the remaining owner-gated platform item.

## 2026-09-08 (later still) — P8-5 (Cloud Run kept) + P21-4 (canon, most depth)

- **P8-5: Cloud Run stays (owner decision).** Object store: new GCSStorage (services/storage.py - immutable cache headers, traversal-safe, CDN URL when CDN_BASE_URL set) selected by AUDIO_STORAGE=gcs + bucket; anything unconfigured falls back to local, never crashes the boot.
  deploy.sh step 1c provisions the public-read bucket + SA objectAdmin idempotently and wires the env (dev stays local when the var is unset). DB: Postgres via DATABASE_URL was already the deploy path and psycopg was already a dependency - verified, nothing to change.
  Backup policy: scripts/backup_db.py (SQLite copy / pg_dump --custom from Cloud Shell, keep-30 with verify-then-prune, --upload to GCS_BACKUP_BUCKET); loud refusals instead of silent empties. google-cloud-storage added to requirements (lazy import; venv has 3.13.1).
  Fixed a CRLF regression the editor put into deploy.sh (bash -n clean) and a same-second stamp collision in the backup test (stubbed stamps).
- **P21-4 decided (owner delegated - most depth, reorder later):** 12 texts, Gita-full-spine first, Isa-whole next, epics/Ayurveda indexed; depth full/studied/index; ALL free (gating any reading is a pricing decision, section 6).
  canon_texts (migration e2f3a4b5c6d7) + seeds/canon.py (additive) + GET /canon (auth-bound, live imported counts by ref_prefixes, coverage) + Reader text-filter chips over the same flat flip list (Prev/Next stay contiguous; catalogue failure never blocks reading).
  First depth: Isa 18/18 - payload from sa.wikisource plain text, dry-run 18/18 over the floor, backup app.db.bak-20260908, live 18 added 0 skipped, licence (public-domain text + CC BY-SA transcription) recorded; corpus 102 -> 120, registers now classical + vedic (import_text honours a payload register off an allowlist).
  Caught and fixed a real footgun: the report path <stem>.json OVERWROTE the isha.payload.json input - reports are now <stem>.report.json with a same-file refusal (payload regenerated from DB rows, re-dry-run proves 18/18 dups).
- P14 pricing is the only remaining owner-gated platform item; P10 stays stopped (analyzer escalation); RAG still needs an explicit decision.
- Suite 543 -> 557 (test_p85_platform 8, test_p21_canon 6); mobile tsc clean; a11y audit 0; alembic current == heads (e2f3a4b5c6d7). Same pre-existing env failure - untouched, not a regression.

## 2026-09-08 — The lesson layer is rebuilt: a lesson becomes a sequence, and the engine becomes the author

Full spec: [`LESSON_OVERHAUL.md`](LESSON_OVERHAUL.md) (P23 backend, U15 client).

- **The audit finding.** `Lesson.tsx` is 207 lines that render prose, one static
  table, three example rows and a Practice button, and **every tappable thing on
  it opens the Ask sheet.** Ten lessons exist, covering Units 1–3 of eleven. The
  whole app has exactly two graded exercise types (`"wordbank" | "typed"`). The
  teaching layer was specified as a page and built as a page — faithfully. The
  spec was the problem, not the implementation.

- **Root cause, and why it was structural.** `Lesson.feature_id` was a UNIQUE FK
  to `features.id`: one lesson per grammatical tag, forever. There was no `units`
  table — CURRICULUM.md §6.2's eleven-unit spine lived in prose and nowhere else.
  So "sandhi is f(a,b)→c" **could not be a lesson**, because sandhi is four tags.
  The curriculum's atom was the engine's taxonomy, not a learner's progression.

- **DECIDED: a lesson is Units → Lessons → typed, gradable Steps.** Not an
  enrichment of the prose page. `feature_id` loses its UNIQUE and is joined by
  `features`; a new `lesson_steps` table carries `kind` + `payload` + `grading`.
  Landed as P23-1, migration `f1a2b3c4d5e6`, verified up→down→up.

- **DECIDED: the engine generates exercises, and that is how the content
  bottleneck breaks.** 231 of 264 challenges sit pending and *"the pipeline is
  two weeks ahead of the reviewer"* — nine features have rows and zero
  approvals, **all four sandhi types among them**. An engine-generated exercise
  needs no reviewer, because the engine that poses the question is the engine
  that marks it. `sandhi.split_candidates`, `prakriya.paradigm`,
  `prakriya.derive`, `chandas.scan` and `word_order.equivalent_orders` all
  already exist and are already tested. An exercise is `(kind, params, seed)`,
  regenerated on demand — **no exercise table, no stored answer.** P23 partly
  relieves P8-0 for drill content; authored prose still needs the queue.

- **DECIDED: adopt learnsanskrit.org under CC BY 4.0, with attribution.**
  CURRICULUM.md open question #1 is **answered**: the guide states *"This page
  is available under a CC BY 4.0 International license"*; the code is public
  domain; the source is SML under `content/`; ~100 pages covering Units 4–11
  plus samāsa and kāraka. This reverses the P22-3 workaround (ten original
  lessons written *"so no third-party licence applies"*) now that the licence is
  known rather than unknown.

- **DECIDED: attribution is a licence REGISTRY plus a RELEASE gate, not a task
  dependency.** The first draft of `LESSON_OVERHAUL.md` said the licences screen
  (U15-7) must ship before the importer (P23-4) ran, and marked U15-7 as
  blocking it. That is circular: the screen renders which sources, licences and
  credit lines we use, which is exactly what the importer writes. It was also a
  client task blocking a backend task, serialising the phase for nothing.
  Resolved by splitting three ways — **P23-4a** an authored `content_sources`
  registry + `GET /licences`, gated on nothing; **U15-7** the screen, gated on
  that endpoint; **P23-4** the import, gated on the registry because it must
  write a registry key, and not on the screen. **Importing is not publishing:**
  the obligation attaches when a learner sees the content, so the gate is a
  release gate — a test that every attribution key resolves in the registry,
  plus a checklist line that no build ships attributed content without the
  screen. Note the obligation is not new: we already ship MIT `vidyut-data` and
  a CC BY-SA 3.0 sa.wikisource transcription, and `CanonText.licence` holds
  twelve per-text strings that no screen renders. `Settings.tsx`'s row is
  `onPress={() => {}}` today — a licence you cannot display is a licence you
  have not honoured.

- **DECIDED: reverse the Play rule.** `Play.tsx` states *"Play is exploration,
  not assessment. Nothing launched from here writes mastery EXCEPT
  Challenges."* That rule excluded the paradigm tensor and word-order — the two
  best pattern surfaces in the product — from progress by design. Pattern work
  now counts; Play keeps the same components as an ungraded sandbox door.

- **DECIDED: learner is both, adult-first.** Calm and precise; playful but not
  cartoonish. Streaks, mastery crowns, timed pattern drills. No mascot-driven
  narrative — UI_HANDOVER §3's "the mascot is a teacher, not a pet" is unchanged.

- **DECIDED: `adaptive.py` is unfrozen and gets FSRS.** It is "SM-2-inspired" in
  name only — one 0..1 score per feature, fixed ±deltas, selection at 0.6, and
  **no due dates, no intervals, no time decay, no item-level memory**. A learner
  returning after a month sees the state they left.
  `research/tech-research.md:326-409` recommended FSRS months ago and it was
  never picked up. New `ReviewItem` table; an item is a step instance or a vocab
  word, not a feature tag.

- **Found, unfixed:** `backend/app.db` was **three migrations behind head with
  no `lessons` table at all** — the entire P22 curriculum had never been
  materialised locally, so the lesson screen would have 404'd on every feature.
  Fixed by running `alembic upgrade head` under P23-1. This is what HANDOVER's
  *"a green test suite does not mean a working app"* looks like in practice: the
  tests build their own DB with `create_all` and never touch alembic.

- **Found, unfixed:** `routers/writing.py:131` writes a dict
  (`{"attempts", "correct", "ef": 2.5}`) into `learner.feature_mastery` under a
  `write:<iast>` key, making that column a heterogeneous dict — floats for
  grammar features, dicts for writing. `adaptive.update_mastery` and
  `grammar.get_path_spine`'s `float(mastery_map.get(...))` would both mishandle
  it. The `ef` is written and never read. To be fixed as part of P23-5.

- **Reaffirmed, unchanged:** P10 numerals stay stopped (8 of 30 misparse
  confidently); no samāsa/kāraka exercises until the analyzer can derive
  them; no leaderboards without an owner decision; no hearts/energy/lives; no
  curriculum in the APK.

## 2026-09-08 (P23 + U15) — the lesson rebuild, implemented

- **P23-2 generator: no table, no stored answer, no review queue.** An
  exercise is `(kind, params, seed)` regenerated on demand;
  `random.Random(seed)` everywhere; the served payload carries options but a
  test asserts `"answer"` is absent from the JSON. 7 kinds, each behind an
  engine call that already existed. Phone constraint drove one design point:
  grid_fill blanks ship engine-drawn choice chips (no Devanagari keyboard,
  no typing), and sandhi_join ships true-join vs raw-concat vs reversed
  options — graded EXACT, because with options on the table "splits back to
  the pair" is too lenient a marker (free-text answers keep the lenient
  engine check).
- **FSRS contract without the `fsrs` package.** `services/review.py`
  implements the researched recommendation's contract (per-item
  stability/difficulty/lapses, due dates, recall grows the interval, lapse
  collapses to ~10 warm minutes) as local deterministic computation with no
  new dependency — keeps the bundle offline-friendly; callers would not
  change if the package were adopted later. `adaptive.py` untouched (FROZEN).
- **Writing progress moved to `learners.writing_mastery`** (migration
  `c1d2e3f4a5b6`, applied, up→down→up green). Legacy `write:` keys are moved
  lazily by the writing router (the only writer); the never-read `ef` field
  is dropped. P20 test updated to pin the FIXED contract (separation), not
  the buggy one.
- **Attribution is a registry key.** `content_sources` (5 rows) + backfill of
  every pre-registry free-text provenance to keys; `CanonText.source_key`
  joins the canon rather than starting a second registry. The test that
  replaces remembering: every distinct key in lessons/vocab/reader/canon
  resolves, or the suite is red.
- **Importer stages, owner adapts.** `scripts/import_learnsanskrit.py` writes
  rank-900 `[staged]` rows with the registry key from the first row —
  importing distributes nothing; the release gate (licences screen in the
  build) is where the obligation attaches. Not run against the real
  learnsanskrit.org checkout yet — that is owner curation with this tooling.
- **Client: step player, not a second verdict vocabulary.** Lesson.tsx reuses
  Challenge's loop (ProgressBar + n/N, VerdictSheet, haptics, announce).
  Path renders units with locked nodes DISABLED (were opacity-0.5 + still
  pressable). Play rule reversed (sandbox here, graded in lessons).
  `Challenge.tsx:123` rotation-index bug fixed (`completed % len`). The two
  dead Settings toggles now drive `services/prefs` (haptics gates the
  service; reduce-motion override ORs into `useReducedMotion`).
- **Measured:** backend 557 → **589** (33 P23 tests); `tsc` 0 errors; a11y
  audit 0 issues across 89 files; dev-DB smoke (units → steps → correct
  attempt → mastery 0.3→0.405, due +2.2d) green. One pre-existing failure
  unrelated to P23: `test_deploy_script_provisions_audio_bucket` hardcodes a
  `C:/Users/AnshulKumar/...` path from another machine.

## 2026-09-08 (docs audit) — docs brought back in line with code

- **Scope:** full drift fix (owner-approved). Read-only audit across
  `HANDOVER.md`, `UI_HANDOVER.md`, `LESSON_OVERHAUL.md`, `CURRICULUM.md`,
  `architecture.md`, `GURU_RIG_NOTES.md`, `specs/`, `research/tech-research.md`
  vs backend (migrations head `c1d2e3f4a5b6`, 51 test modules / 589
  collected, all P23 tables/routers/services/seeds present) and mobile
  (21 screens, `steps/` 7 renderers + switch, `GuruNative` shipping).
- **Counts fixed:** `HANDOVER.md` 36 → 51 test modules, "589 pass" →
  "589 collected (1 fail + 1 env-gated)", Definition of done 557 → 589
  (both handovers); `UI_HANDOVER.md` inventory → 21 screens / 27 Reanimated /
  100+ a11y props, LOC flagged pre-U15; `LESSON_OVERHAUL.md` P23-1 head
  `f1a2b3c4d5e6` → intermediate (head `c1d2e3f4a5b6`).
- **Descriptions fixed:** suite builds via `init_db()` (Alembic + drift check),
  not `create_all`; `CURRICULUM.md` §5.2 table names → `lessons`/`units`/
  `challenges`/`vocab_words`/`reader_passages`; U1-3/U1-4 marked superseded
  (evolved `GuruNative` contract in `GURU_RIG_NOTES.md`); canonical `.riv`
  path `mobile/assets/guru.riv` in all three docs.
- **Caveats recorded (code truth):** `build`/`articulate`/`read` step kinds
  fall back to `ExplainStep`; Pingala "try it" is static navigation;
  `Path.tsx` loading text is not `Skeleton`; Home/SessionComplete still
  `<TutorFull>`, `GuruScene` unplaced; Skia/Lottie/blur zero runtime imports;
  Spec E §2–4 unbuilt (`_PLACES` bug still in tree); conversation-runtime is
  async + in-router schemas.
- **Decisions recorded in `architecture.md`:** §14 plumbing landed (only Apple
  sign-in still a missing mechanism; host/bucket/prices remain owner
  decisions); §4.2 on v4; §12 default turn is LLM (`mode='llm'`, graph as
  fallback — owner decision); §13 Spec E status.
- **`review-queue.md` moved** to `results/review-queue-20260908.md`
  (owner-approved); `HANDOVER.md` §7 points at the generator. DB-row counts
  flagged "verify against live DB" — seeds prove shapes, not approvals.

## 2026-09-08 (Spec E backend) — varnamala drill data + endpoints

- **Rewrote `seeds/varnamala.py`** per `specs/varnamala.md` §1–2: 49 stable
  ids, example words + glosses, `CONTRAST_GROUPS` (5, hardest-first) with
  derived symmetric `minimal_pairs`, `mark` on `am`/`ah`; deleted the
  `_PLACES` bug (`ca` where `च` belongs). List structure and
  place/voicing/kind keys kept — `varna_distance` and `writing_items` compat.
- **49, not 48.** The spec's tables enumerate 49 rows (the traditional 48
  plus ḹ, tabled with an empty example). Fixed the two "48" counts in the
  spec rather than dropping a tabled row.
- **New `routers/varnamala.py`:** `GET /varnamala` (full grid + groups,
  serve-time `/audio/varnamala/{id}[_example].wav` URLs), `GET
  /varnamala/progress`, `POST /varnamala/practice` (reps only, NO verdict —
  §5). Coverage in its own `learners.varna_progress` column (migration
  `a3f7c9e1b2d4`, applied, down→up round-trip green; backup
  `app.db.bak-20260908-specE`). `GET /grammar/varnamala` untouched.
- **`scripts/build_varnamala_items.py`:** 95 render items (49 + 46; rii/li/lii
  aksara-only by design), dry-run green. Audio rendering itself is spend +
  listening QA (hardest-5-first rule) — owner, with `SARVAM_API_KEY`.
- **Tests:** `tests/test_varnamala.py` (11). Suite 589 → **600**
  (1 pre-existing unrelated fail unchanged). Client wiring to the new
  endpoints is Track C work.

## 2026-09-08 (Apple sign-in) — Guideline 4.8 unblocked

- **`POST /auth/apple`** mirroring `/auth/google`: ES256 identityToken
  verified against `appleid.apple.com/auth/keys` (`iss` pinned, `aud`
  against comma-separated `apple_client_id`), learner bound to `sub`
  (`learners.apple_sub`, unique/indexed, migration `b4c6d8e0f1a2`,
  applied). 501 when unconfigured, 401 on bad token or missing sub.
- **Apple only sends name/email on first authorization** — the client
  forwards `display_name` when it has one (`AppleAuthRequest.display_name`),
  else email-local-part, else a label. `cryptography` already present, so
  ES256 verifies live; `requirements.txt` comment updated (RS256 + ES256).
- **Tests:** `tests/test_apple_auth.py` (5, verifier monkeypatched — no
  network). Live JWKS verification still wants one smoke call with a real
  token per §5 rule 5 once the Apple Services ID exists (owner: key).

## 2026-09-08 (practice step kinds) — build/articulate/read stop degrading

- **The fallback was a lie.** `StepRenderer` rendered `build`/`articulate`/
  `read` as `ExplainStep` prose. The backend never emitted those kinds
  (`exercise_gen` has 7 builders; unknown kinds raise), and inventing
  graders for them would violate §2.2/§6.2 (no forced alignment, no
  comprehension grader; graded assembly already exists as `reorder`).
- **Practice, not assessment.** New `PRACTICE_KINDS =
  {explain, build, articulate, read}` in `services/lessons.py`: serve the
  payload as-is, attempt as no-op (correct, graded False, mastery/schedule
  untouched). `LessonStep` docstring's kind families updated (was "two",
  now authored/generated/practice).
- **Three client renderers** reusing sandbox components per the U15-2 table:
  `BuildStep` (WordBank), `ArticulateStep` (VocalTract via
  `articulationFor`, mic stays off, placeless sounds render char-only),
  `ReadStep` (passage card, `sized()` Sanskrit floor). All carry
  "not graded" copy, role+label, 44pt targets. `stepHint` covers all kinds.
- **Tests:** `tests/test_lesson_practice_kinds.py` (3 — no-op attempt incl.
  mastery-untouched, serve-as-is, registry pin). `tsc` 0, a11y 0 issues
  across 91 files.

## 2026-09-08 (Track C4) — first data layer + FlatList where volume lives

- **`services/apiCache.ts`** (60s in-memory GET cache + in-flight dedupe +
  `invalidateCache`) + **`hooks/useQuery.ts`** (`{data, loading, failed,
  retry}`, unmount-guarded, opt-in `refetchOnFocus` via `useFocusEffect`).
  No new dependencies. Honest scope: no request cancellation —
  `api/client.ts` takes no `AbortSignal`, so safety is "never setState
  after unmount", not an aborted fetch. Threading signals through is the
  follow-up.
- **Path / Vocab / Reader migrated.** Units, words and the verse index are
  `FlatList` (`ListHeaderComponent` keeps titles/chips/mode rows put);
  topics/canon stay best-effort cached. Same states (skeleton / retryable
  error / honest empty), same a11y labels, `sized()` on touched text with
  the Sanskrit 18pt floor on Devanagari. Reader's reading posture untouched.
- **`tsc` 0, a11y 0 issues across 93 files.** Remaining fan-out (Home/Lesson/
  Challenge fetch migration, `sized()` on ~16 screens) rides the U5 device
  pass per screen — the pattern is established.

## 2026-09-08 (build day) — three tracks in parallel, verified

- **Suite 590 → 610 collected (609 pass).** The one fail is the pre-existing
  `test_deploy_script_provisions_audio_bucket` hardcoded-path failure,
  unchanged since baseline. Head `b4c6d8e0f1a2`; `tsc` 0; a11y 0/93.
- **Track A:** fresh P8-0 packets (`results/review-queue-challenges-20260908.md`
  231 pending, `results/review-queue-scenarios-20260908.md` 5 pending — the
  review itself is owner work); Spec E backend (above); vocab seed refills
  `examples: []` from the approved pool on reseed (dev DB still 7/60 — the
  pool has no more sentences to draw from until P8-0 approves more).
- **Track B:** Apple sign-in (above). Live JWKS smoke + Services ID = owner.
- **Track C:** mascot swap (Home/SessionComplete → `GuruNative`,
  `TutorAvatar.tsx` deleted, `TutorFull` kept for brand) + S fixes (Path
  skeleton, Lesson feature span, SessionComplete static XP, Pingala live
  scan); practice renderers + `PRACTICE_KINDS` (above); data layer +
  FlatList (above).
- **Still owner-gated:** P8-0 review, learnsanskrit curation (Units 4–11
  still 0 lessons), WordNet/DCS licences, varnamala audio render + listen,
  Apple Services ID + live smoke, store/pricing, Postgres/GCS cutover, push
  transport keys, ML Kit dev build, `.riv` export, device passes, submission.

## 2026-09-08 (P8-0 cleared) — 0 pending anywhere + a midnight-boundary fix

- **Owner bulk-approved the whole queue**, including 6 rows flagged
  likely-wrong (57 नेत्रा नेत्रेण, 58 पुस्तकया, 61 बालं-as-girl, 80 NOM+1SG
  mismatch, 97 IAST mismatch, 98 छात्रम् typo) — recorded as approved with
  note `P8-0 owner bulk approve`, backup `app.db.bak-20260908-p80`. Rounds
  1–3 reviewed band-by-band first (72 rows); rounds 4–8 + 5 scenarios
  approved literally per explicit owner confirmation. Result: challenges
  33→**264** approved, scenarios 1→**6**, learner-reachable features
  24→**33 of 37** (only ATMANEPADA + MASC/FEM/NEUT still zero; INDECL
  cleared with 12, all four sandhi cleared).
- **Packet id typo found while approving:** `review-queue-challenges` printed
  `e0a49261440ab48b8` (17 chars) for DB id `e0a49261440b48b8` — approvals
  matched by guarded exactly-1-prefix lookup, so nothing wrong was
  approved; the generator's id rendering wants a look before the next
  packet.
- **Midnight-boundary flakes fixed (real §2.8 violation + 2 test-only).**
  Past midnight IST (= previous day UTC) two tests failed: `test_job_stops_
  after_ignored` and `test_first_session_today_excluded`. Cause: prod
  `day2_return()` drew its cohort boundary with server-local
  `date.today()` while activity dates are learner-local — now per-learner
  (`learner_today`, UTC cutoff for the window). Tests anchored on UTC /
  learner day instead of server date. Not a regression from any feature
  work — a clean tree fails the same way at that hour.
- **Next:** P17-2/17-4 re-render (spend pre-approved in the ~₹47 envelope;
  needs `SARVAM_API_KEY` + owner go). Suite 609 pass + 1 pre-existing fail.

## 2026-09-08 (learnsanskrit import) — 11 → 116 lessons

- **Fetched the real guide** (shallow sparse checkout of
  `sanskrit/learnsanskrit.org`, `content/` only — 192 files; SML lives
  under `.txt` with `{macro}` markup, not `.sml`). Fixed the stager to
  match reality: `.txt` scan, `{title}` macro titles, inline-macro unwrap
  for readable drafts, `vyakarana/` + `lists/` skipped (sūtra track is
  §6-gated; lists are not prose lessons), UNIT_MAP reordered so
  distinctive units (voices/genders/compounds/kāraka) win over generic
  `verb-1`/`present`/`dat` stubs.
- **Dry-run → 105 sections** (u1=22, u2=52, u3=1, u4=1, u5=4, u6=3, u8=13,
  u9=1, u10=6, u11=2; **u7=0 — the guide has no gender content**).
  `guide/verbs/atmanepada.txt` and the transliteration note are empty
  upstream (verified — genuinely 0 bytes, not a parse failure).
- **Owner approved `--live`: 105 `[staged]` lessons written** (rank 900,  `provenance=learnsanskrit:<section>`, registry key from row one, no TTS,
  idempotent). Lessons 11→116; every unit except U7 now has content.
  Staged rows carry `examples: []` — engine verification runs when the
  adaptation lands, not before. Suite green (609 + 1 pre-existing).
- **Remaining curation (owner):** adapt-don't-copy rewrite of staged prose,
  unit re-mapping (u2=52 is a bucket), U7 genders as original prose, then
  re-rank off 900. Staged JSON at `results/imports/learnsanskrit.stage.json`.

## 2026-09-08 (licence answers) — WordNet STOP, DCS GO

- **Q2 ANSWERED — WordNet is unusable without written permission.** Verified
  against the sources (not the doc's memory): the Sanskrit WordNet site
  states **GPL 3.0 + GFDL, research-purposes-only**, commercial use by
  written request; the IWN-En GitHub export (with Sanskrit synsets) is
  **CC BY-NC-SA 4.0**. The doc's "CC BY-SA 4.0" was wrong in the
  load-bearing direction (it omitted NonCommercial). Every variant is
  NC/research-only + copyleft — cannot ship in a commercial app as-is.
  Options for the owner: (a) write CFILT for commercial permission, or
  (b) drop WordNet and build vocab-500 from DCS frequency + approved pool.
  `CURRICULUM.md` Q2 corrected; P22-5 stays deferred regardless.
- **Q3 ANSWERED — the GitHub DCS export suffices.** `cltk/sanskrit_text_dcs`
  holds hundreds of verse-numbered texts; DCS is **CC BY 3.0 Unported**
  (attribution only — verified on the impressum page). Caveats: the export
  is IAST (convert via `lipi`, then Vidyut parses — both ₹0), and it is
  classical-register, so laukika graded reading still needs Bharati readers
  (per-item licence). No raw dump needed. `CURRICULUM.md` Q3 corrected.

## 2026-09-08 (varnamala audio) � hardest-5 rendered, sa-IN still gated

- **sa-IN beta has NOT landed on this key.** A 5-item probe with
  `--sa-language sa-IN` 400s ("request beta access"); same 5 render fine
  via hi-IN (aditya, ~0.5s/item, 26�34KB WAVs at
  `results/sarvam-varnamala/hardest5/`). Re-run with sa-IN when the flag
  lands � one flag, no code change. Spend was cent-fractions, inside the
  pre-approved P17 envelope.
- **Windows filename trap fixed.** Item ids were `varnamala:ri` and
  `render_sarvam.py` writes `{item_id}.wav` � the colon put bytes in an
  unreachable ADS behind a 0-byte `varnamala` file. Ids are now bare
  (`tta`, `tta_example`); serve URLs derive back as
  `/audio/varnamala/{id}.wav`. Full 95-item file regenerated at
  `results/imports/varnamala-items.json`.
- **Owner listening QA pending** on `ri/nga/nya/ssa/ah` (identical 0.597s
  durations deserve suspicion � confirm they are distinct sounds, not
  template hum). Full 90-clip batch waits on that verdict per the
  listen-first rule.

## 2026-09-08 (owner-gate sweep) � test green, Apple client, push/camera pkgs

- **Suite fully green: 610 passed, 0 failed.** Fixed the pre-existing
  `test_deploy_script_provisions_audio_bucket` failure (hardcoded
  `C:/Users/AnshulKumar/...` path from another machine ? repo-relative
  `Path(__file__).parents[2]/deploy/gcp/deploy.sh`). Strengthened, not
  weakened: it now also asserts `APPLE_CLIENT_ID` + `apple-client-id` in
  the deploy script, locking the secret wiring. Same-file change
  (deploy.sh) is covered, not coincidental.
- **Apple client wired end-to-end (code-complete, keys pending).**
  `expo-apple-authentication@57.0.1` installed + plugin in app.json
  (`expo config` resolves); `api.appleLogin()`, `store.appleLogin()`,
  iOS-only Login button (availability-checked, cancel-safe, name
  forwarded on first auth). Backend `/auth/apple` + deploy secret from
  earlier. Remaining: Apple Services ID/bundle (owner) + live token
  smoke + iOS device test. `tsc` 0, a11y 0/93.
- **Push + camera packages installed, no behavior change.**
  `expo-notifications@57.0.17` (push.ts already dynamic-requires it �
  token flow activates in dev builds; EAS projectId still owner-side) and
  `expo-camera@57.0.4` (PhotoCapture gates on `recogniser.ready` first,
  so installing changes nothing visible until ML Kit lands).
- **ML Kit: real package names found, deliberately NOT installed.**
  The adapters reference `@react-native-ml-kit/digital-ink` and
  `@react-native-mlkit/text-recognition` � both 404 on npm, i.e. the
  seam names are aspirational. Verified real: `react-native-digital-ink`
  1.1.2 (ink) and `@infinitered/react-native-mlkit-text-recognition`
  5.0.1 (OCR). Installing either now would flip `ready:true` with no
  native module linked (no prebuild yet) � a �2.11 silent degradation
  (every recognise() throws ? eternal `unsure`). So: install + rewire +
  prebuild + device proof happen as one later step with hardware, not
  as a package.json-only change today.
- **Still owner-gated:** Services ID + live Apple smoke, store/pricing,
  Postgres/GCS cutover values, push projectId + transport keys, ML Kit
  install+prebuild+device proof, `.riv` export, learnsanskrit curation,
  WordNet permission (or DCS-vocab path), full audio batches, device
  passes, submission.

## 2026-09-08 (mitra gloss induction) — 61/500 auto, rest candidates

- **Licence verified from the repo, and the doc was wrong.** CURRICULUM's
  "largely CC0" describes the Sanskrit SOURCES; the English translations
  live under `cc-by-sa/` (CC BY-SA) and `cc-by-nc-nd/` (NC+ND) trees, with
  per-text licences in `final_catalog.tsv`. Used: 47 files with catalogue
  licence exactly `cc0`, NC-ND tree excluded unconditionally (Agni-Purāṇa,
  Tantrāloka), `cc0?` Vrindavana excluded. CURRICULUM row corrected.
- **Rule: gloss induction only, never sentences.** ≤3-word English glosses
  (short phrases, not copyrightable subject matter); no translation
  sentence ever ships (that would be an SA adaptation). Victorian
  translators are a gloss signal, never an authority (§4.4 again).
- **New `scripts/mitra_gloss_stage.py`** (licence gate → single pass →
  staged JSON, no DB writes) + 13 tests. Method fixes from the probe run,
  which caught confident-wrong output the rule was designed to catch:
  diacritic folding (Brahmā→brahma, else 'brahm' wins), sub-3-letter +
  apostrophe drop (ch./v./K./o'er → 'k'/'r' garbage), plural merge with
  capped ratio, and a two-tier rule with background flags (df>8):
  auto-accept needs ≥5 pairs + ≥70% support (+≥90% for background
  tokens, keeping uvāca→said while rejecting kṛtaṃ→said); the rest ship
  as candidates with supports for human pick. `gloss` stays "" below bar.
- **Result: 61 auto-accepted, ~90% spot-checked correct** (rājā→king,
  jalaṃ→water, viṣaṃ→poison, śṛṇu→hear…), 439 with candidates/empty.
  Known-wrong auto-accepts that curation must fix: vijayāya→heard,
  gṛhītvā→kamsa, sūtaḥ→sauti (narrator-name dominance), lekhyaṃ→case,
  brūhi→please. Auto-accept ≠ approved — curation reviews all 500.
- Staged: `results/imports/dcs-vocab.glossed.json` (+ report). DCS stage
  file untouched (audit trail). Next: curation maps gloss→row, topic→row,
  gender/stem→row, then import.

## 2026-09-08 (U8 curation) — first unit curated, whole-batch approved

- **Packet first, DB second.** `results/u8-curation-packet.md` (4 taxonomy
  rows + 3 lessons + re-map + parked scope + 4 reviewer flags) approved
  whole-unit, then applied. Engine work preceded prose: measured 70
  (dhatu, lakara) derivations to find the honest root set.
- **Engine ground rules (derive_u8.txt).** SAFE: paṭh/bhū/pā/likh/khād/
  smṛ/pat/cal. DROP with reasons: gam/han/dṛś/sthā/nī/sev/labh (empty),
  vad (wrong root vandate), as (wrong pada), jñā (non-standard bhvādi
  output for a class-9 root), dhāv (ātmanepada-only output — reserved
  for U9), kṛ (gaṇa ambiguity). loṭ singulars derive -tāt, not classroom
  paṭha → lessons drill the 2nd plural (standard everywhere).
- **4 taxonomy features** (ranks 41–44: IMP.2PL/IMPF.3SG/FUT.1SG/FUT.3SG),
  graded by derive_next proofs only — no analyzer involvement, no
  frozen-analyzer conflict; no challenge bands reference them yet
  (later content task). `STEP_EXERCISED_FEATURES` in p712 keeps their
  0-challenge count from reading as a gap.
- **3 lessons graduated in place** (105→102 staged, 11→14 curated):
  imperative 2pl (paṭhata/likhata/calata), imperfect (apaṭhat/abhavat/
  apibat), future (paṭhiṣyati/bhaviṣyati/paṭhiṣyāmi) — 9/9 examples
  derive-exact, 6/6 steps round-trip correct, IAST lipi-derived.
  Re-map: overview row u8→u2. Blessing/conditional/potential/distant
  rows stay staged for future lakāra units (scope: first 4 lakāras).
- **Two live bugs fixed along the way** (both from the bigger post-P8-0
  pool, both with tests): graduate_u8 missing Lesson import (raised
  before commit — two-phase discipline held, nothing half-written);
  reader_passages._ensure double-insert on laukika+classical variants
  (flush per add, like _seed_challenges). P23 importer test cleanup
  scoped to its own provenances (§2.13 in test form — it was deleting
  seed rows other tests need).
- **Tests:** `tests/test_u8_graduation.py` (5) + reader flush test.
  Next graduations must delete/replace stale steps when reusing rows
  (rank collision skips new steps — U8 dodged it only because the seed
  ran after graduation).

## 2026-09-08 (U4 curation) — numbers without new taxonomy

- **Packet first again** (`results/u4-curation-packet.md`, approved
  whole-unit): dual / plural / plural-oblique, 3 lessons, zero taxonomy
  changes (DU/NOM.PL/GEN.PL et al all pre-existed — U4 is the first unit
  that needed nothing new).
- **Engine ground rules (derive_u4.txt).** All 8 dual/plural nominal
  forms derive-exact on a-stems; verbs agree on safe roots (paṭhataḥ/
  paṭhanti, bhavataḥ/bhavanti); grid_fill + contrast round-trip correct.
  One CUT: neuter dual — engine masculines it (phala→phalau for correct
  phale), same kosha unanimity gap as the U7-note; gajau fallback used.
  L3 grid (bālakasya/bālakayoḥ/bālakānām) verified before writing.
- **Shape decision worth recording:** U4 steps are grid_fill+contrast,
  not derive_next — the paradigm grid IS the number lesson, and blanks
  are deliberately untargeted (targeting needs generator changes;
  seed-fixed blanks round-trip regardless). U8's derive_next pattern
  does not generalize to nominals; each unit picks the kind that teaches.
- **Staged number-words row stays staged** (numeral vocab + P10
  quarantine — confident numeral misparses make it ungradable content).
- **Tests:** `tests/test_u4_lessons.py` (4, incl. grid-highlight pins).
  GENERATED closed-world pin extended with DU/NOM.PL/GEN.PL. Lessons 119
  (17 curated + 102 staged), steps 50. (The neuter-dual CUT pin from this
  entry was superseded same day: Napumsaka works — see next entry.)

## 2026-09-08 (complete-all: U5/U7/U9 + vocab import + QA forensics)

- **Napumsaka catch (the day's best find).** Vidyut liṅga codes are
  Pum/Stri/Napumsaka — "Neut" is NOT a member and `_enum_member` silently
  defaulted to Pum, masculining every "neuter" probe (phala→phalau). The
  U4 neuter-dual CUT was based on my own bad probe code; with the right
  code, neuter works fully (phalam/phale/phalāni, 24-cell paradigm).
  Fixed: U4-L1 gained phale + L3 fixed to Napumsaka (delete-reseed, §2.13
  backup), `_enum_member` now warns loudly on unknown codes + test pins
  it. Lesson: probe the interface contract (enum members), not just the
  outputs. Feminine ā-stems are TRULY broken (Stri resolves, output is
  masculine pattern) — no feminine surface forms anywhere, FEM is the
  last zero-coverage feature.
- **U7 genders (2 lessons, original prose):** NEUT (phala paradigm drills)
  + MASC (labels, agreement rule, a-stem review). Feminine concept folded
  into bodies; zero feminine forms shown (P22 precedent); test pins the
  absence and FEM-unclaimed.
- **U5 persons (2 lessons):** 18/18 9-cell exact on paṭh/bhū; 1st/2nd
  singular + dual persons (3rd persons already in U2/U4). Gaṇa rows stay
  staged (verb classes = future unit).
- **U9 voices (1 lesson):** dhāv ātmanepada + paṭh parasmaipada —
  ATMANEPADA's first coverage anywhere (P7-12's prescription: derive, do
  not prompt). Staged endings row stays staged.
- **Vocab import (27 rows, seeds are source of truth):** TOPIC_MAP (clean
  fits only — verbs/numerals/names/epithets/weak-fits stay staged with
  reasons) + GLOSS_FIXES (gods, unit-of-weight/hardware glosses) +
  registry keys dcs (CC BY 3.0) + mitrasamgraha (BY-SA gloss signal).
  Rank-after-curated, pool examples by the same gated rule, idempotent.
  Two flush bugs found (autoflush-off sessions: seed + script assigned
  duplicate ranks; _iast unbound when all curated rows exist) + tests.
  Vocab 60→87.
- **QA forensics:** 95 wavs, 95 distinct MD5s — template-hum ruled out at
  byte level; equal durations are just short clips. `results/varnamala-
  qa.md` carries the listening checklist (hardest-first, stop-on-FAIL).
- **Release checklist:** `results/release-checklist.md` — every remaining
  owner click with exact env/secret/command + verification.
- **Stale-test discipline:** 2 failures were outdated expectations
  invalidated by progress (PRES.1SG lesson exists now) — updated to
  PRES.2SG, not weakened. Suite 650 green, 60 files.

## 2026-09-09 — Video: embedded, never owned; and the first content class that can vanish

Full research: `CURRICULUM.md` §4.4 (sources), §5.5 (why it has no home),
§10 Q8 (the licence answer), `HANDOVER.md` §2.17 (the invariant).

- **The premise did not survive contact.** The ask was "find open-source
  Sanskrit videos that teach almost everything." Tested against YouTube's
  Creative Commons filter directly rather than inferred: `learn sanskrit`
  returns **3** results, `sanskrit grammar lesson` returns **2**. That is the
  whole CC BY corpus — scattered one-offs by unrelated creators, no course,
  no consistent notation. **There is no openly licensed Sanskrit video
  course.** Every systematic course that exists is standard-licence YouTube.

- **So video inverts the learnsanskrit.org model.** P23-4a's pattern is
  *adopt under a licence, adapt, own, ship offline*. Video cannot be adopted
  at all: III.E.1.a of YouTube's Developer Policies forbids us to *"download,
  import, backup, cache, or store copies of YouTube audiovisual content."*
  **DECIDED: embed by reference, store zero bytes.** `provider` +
  `provider_video_id`, nothing more.

- **DECIDED: the video section is free and carries no ads of ours.**
  III.F.3.a: *"API Clients must not charge users to watch content in an
  embedded YouTube player."* There is **no subscription exception and no
  approval process** — a paywalled video spine was simply not available. The
  login wall is fine (III.F.3.b exempts *"login or age verification"*).
  III.G.1.c separately bars ads *"placed on or within"* the content, so ads
  live on Home and elsewhere, never on a screen rendering the player. And
  YouTube's own ads are **not** blocked — creator ad revenue is the entire
  basis of the embed bargain, and blocking it is what would actually get API
  access terminated.

- **The second gate is Apple, and it is a reviewer risk, not a legal one.**
  Embedding needs no permission: YouTube's ToS grants the embed right, and
  under the server test (*Perfect 10 v. Amazon*, 9th Cir. 2007) an embedder
  makes no copy. But App Store 5.2.3 has rejected apps — including one using
  `react-native-youtube-iframe` — demanding *"documentary evidence… that you
  have all necessary rights."* Those were **catalogue** apps (one aggregated
  Disney/Pixar films; its whole value *was* others' content). Shabd is an
  owned lesson with one video at its head. **DECIDED: readiness, not a
  permission campaign** — keep a one-page evidence file, escalate only on an
  actual rejection, and keep video *inside* lessons so the app never reads as
  a discovery service (III.I also bars "mass aggregat[ing] embedded videos").

- **DECIDED: source by rights-holder, not by licence.** The useful question
  is not "is it CC?" but **"did this uploader make it?"** A standard-licence
  lecture on IIT Kharagpur's own channel is a stronger citation than a CC BY
  video on a channel that mislabelled footage it does not own — and research
  confirmed YouTube's CC filter *"sometimes renders incorrect results."*
  This extends §4.3's existing rule (*an uploader name is not a licence*)
  rather than replacing it.

- **NPTEL: embed yes, re-host no — and the common belief is wrong.** Its
  Terms of Use say *"All rights in the Site and its content, if not
  expressly granted, are reserved by NPTEL"*; SWAYAM's restrict materials to
  *"personal use… only"*; the footer says CC BY-NC-SA. The widely repeated
  "NPTEL is CC BY-SA" claim traces to a single **Creative Commons wiki page
  last edited 2019-12-20**, contradicted by all three live sources. Anything
  built on that claim would have been built on nothing.

- **Coverage is complete, which was not the first answer.** An earlier draft
  recorded Units 1 and 11 as having no video. That was wrong — it came from a
  summary listing the IIT Bombay course only as "Introduction (12 weeks)".
  The official syllabus (`109101189`) gives **Wk 10: kāraka, vibhakti,
  apādāna, sampradāna, adhikaraṇa, karaṇa, karma, kartā** — near-exact for
  Unit 11 — and **Wk 2: the technique of Pratyāhāra** for Unit 1. Note Wk 10
  does **not** answer §10 Q5, which is about whether the kosha tags kāraka
  roles for *grading*; that stays open.

- **Pratyāhāra is the Layer-0 framing, but not the Layer-0 lesson.** *"The
  alphabet as a mathematical set"* (§6.1) is precisely what a pratyāhāra is,
  so Wk 2 is an unusually exact conceptual fit. But that course states
  *"INTENDED AUDIENCE: Linguists, Indologists"* — a learner opening Unit 1
  needs to hear अ. **DECIDED: Samskrita Bharati Pravesha's varṇamāla for
  pronunciation, NPTEL Wk 2 later as the payoff.** Unit 1 takes two videos at
  different ranks, so the schema is a ranked join, not a column on `lessons`.

- **DECIDED: build the missing case with the happy case.** Embedded video is
  the first content class that can disappear without warning — a creator
  deletes it, or disables embedding while it stays public (IFrame errors
  101/150; research hit Error 153 loading an embed directly). Every lesson
  must render correctly with no video, and the link-out fallback
  (`expo-web-browser`, already a dependency and imported nowhere) ships with
  the player rather than after it.

- **Open, and only mattering if offline video is ever wanted:**
  Vidya-mitra / INFLIBNET is described by secondary sources as CC BY-SA but
  its host did not resolve. It is the sole remaining route to *ownable*
  Sanskrit video.

## 2026-09-15 — Grammar tab rebuilt: a bilingual guide the engine checks

The old Grammar tab was eight dense cards written for developers ("feature
SETS", `ACC.SG`, "f(a,b) → c"). A learner who knows no Sanskrit could not
follow it. It is now a guide: **18 chapters, 105 short topics (57 beginner,
38 intermediate, 10 advanced), 44 glossary terms**, from the sounds of the
script to Pāṇini's sūtras, plus a Word Lab.

- **DECIDED: English and Hindi, both authored, one toggle.** Every
  learner-facing string is a `{en, hi}` pair written natively in each language
  — Hindi uses school-grammar words (कारक, विभक्ति, लिंग) rather than
  translating the English. Sanskrit is language-neutral; its IAST always comes
  from lipi. `tests/test_guide_content.py` fails on a missing language, the
  wrong script, a feature code or developer jargon, unbalanced markup, prose
  over the word caps (60 / 80 / 100), or a quote without a source.

- **DECIDED: the engine is the author's editor.** Every Sanskrit claim in the
  guide carries a server-only check (subanta, tiṅanta, kṛdanta, taddhita,
  sandhi); **1,808 checks** run in tests, and the response keeps only
  `checked: true`. Content the engine cannot derive was cut, not written
  around. Gaps found while authoring (all left out of the guide): उद्+इ kta
  (उदिते → उदिन्दिते), इष् (resolves to gaṇa 4: इष्यति), शक् (शक्यति), लिख्+tumun
  (लेखितुम्), जागृ Lot (जागृत), भुज् san (बुभुक्षति), शी SAnac (शीकमानः), zyaY
  (सौभाग्यम्), विद्वस्+tal, सुमित्रा+iY, and the sandhi splits वागीशः, षडाननः,
  सङ्कल्पः, किञ्चित् and the ay/av joins (checked through word-building instead:
  नी + ल्युट् → नयनम् fires 6.1.78). Chandas scans weights correctly but names
  no anuṣṭubh, so the verse chapter teaches the śloka rule itself and never
  credits the engine with a metre name.

- **DECIDED: compounds are reference.** `prakriya` has no samāsa derivation.
  The Compounds chapter labels every analysis as reference; what is checked is
  the join, the declined compound and each word of the spelled-out analysis.

- **Engine changes** (`services/prakriya.py`): `derive()` takes `gana`,
  `aupadeshika`, `prayoga`, `sanadi`, `prefixes`, `krt`, `taddhita`,
  `stem_type` and `expect`; feminine -ā/-ī/-ū stems use nyāp (लता → लताः was
  wrong); roots resolve by surface form with a preferred-gaṇa table instead
  of a prefix match (वद् no longer finds वन्द्); ubhayapada roots cite
  parasmaipada first. `services/sandhi.py` gains `rule_splits` (the rule
  table's own answer, for checking compound joins) and `is_known_word`.

- **Word Lab lookup** (`GET /grammar/lookup`, `services/word_lookup.py`): the
  rule-based analyzer proposes readings, the engine re-derives each one, and
  only readings that reproduce the typed word survive; the kosha ranks real
  stems above invented ones that derive the same form (गुरवे → गुरु, not
  *गुरव). Local, no quota, like every /grammar route.

- **Fixed in passing:** `ask_engine._derive_word_form` mapped dative and
  genitive to `Chaturthi`/`Shashthi`, which are not vidyut names — those
  derivations silently fell back to the nominative. It now shares the
  lookup's case map. **Noticed, not fixed:** its verb branch is unreachable
  (a `PRES.3SG` feature hits the noun branch's `continue` first), and
  `lesson_service.list_lessons` does not filter `[staged]` rows.

- **Audio: pre-rendered, gated on the owner.** `scripts/render_guide_audio.py`
  collects every unique Sanskrit string (1,662 clips, 12,428 chars, **est
  ₹37.28** at ₹30/10K), re-runs all engine checks before any spend, stores
  clips through `services/storage`, and writes
  `grammar_guide/audio_manifest.json`. The builder attaches `audio_url` only
  for manifest entries, so no clip means no button. **Owner approved;
  rendered 2026-09-15: all 1,662 clips (~₹37, 81 MB WAV) into local
  `storage/audio/grammar/`, voice `aditya`, `hi-IN`.** Production serves audio
  from GCS, so these files still have to be copied to the bucket under
  `audio/grammar/` before the deployed app gets working buttons.

- **Production had no audio store at all — found while uploading.** The live
  Cloud Run service has no `AUDIO_STORAGE`/`GCS_AUDIO_BUCKET` (the last
  `deploy.sh` ran without `GCS_AUDIO_BUCKET`), and the Dockerfile copies
  `backend/app` but never `backend/storage/`, so every pre-rendered clip —
  including the 2026-09-08 challenge and dialogue audio — has been a 404 in
  production. **Owner approved, done 2026-09-15:** bucket
  `gs://sanskritam-audio` (asia-south1, Standard, uniform access, `allUsers`
  objectViewer, runtime SA objectAdmin — the deploy.sh setup) now holds all
  2,025 WAVs (264 challenge, 99 dialogue, 1,662 grammar; 119 MiB) with
  `audio/wav` and `public, max-age=31536000, immutable`. **Not done:** Cloud
  Run still points nowhere — add `GCS_AUDIO_BUCKET=sanskritam-audio` to
  `.env.deploy` before the next deploy. Challenge and dialogue rows store
  `/audio/...` URLs in the database, so they also need a URL rewrite (or an
  API redirect) before they play; the grammar guide builds its URLs from the
  storage backend and needs nothing more. The guide builder now attaches
  `audio_url` on local storage only when the WAV exists, so a deploy without
  the bucket shows no speaker buttons instead of 1,662 dead ones.
  Cost at Google's published rates: uploads ~₹0.86 once, storage ~₹0.24/month,
  serving ~₹0.55 per 1,000 plays.

- **Sarvam rate-limits bulk TTS.** The first live pass rendered 300 clips
  back to back, then every request got `429 rate_limit_exceeded` and the
  script logged 1,342 instant failures. The renderer now paces requests
  (1 s), retries 429/5xx with backoff (5 → 120 s), and stops the run on a
  limit that outlasts every retry instead of burning through the queue; the
  per-clip manifest made the rerun resume exactly where it stopped. At that
  pace the 1,342-clip rerun finished with no 429s. Any future bulk render
  (lessons, vocab) should use the same pattern.

## 2026-09-22 — Talk: multilingual, and a conversation rather than a translator

Owner report: *"Looks like its just translating what we are saying. No real
conversation is happening... the fonts they return are very bad... the
keyboard covers it."* All four complaints turned out to be separate defects
with separate causes. Every claim below was measured against live Sarvam
before any code was written; the probe scripts are the basis of
`tests/test_lang_detect.py` and the new half of `tests/test_tutor.py`.

- **It read as a translator because the schema WAS a translator.** The reply
  shape was `{"sanskrit": ..., "bridge": ...}` — described in the prompt as
  "two halves of ONE turn" — and at `tutor_max_tokens=180` a 105B model
  collapses that into a sentence and its translation every time. The prompt
  also said *"Ask ONE short question per turn"*, which is a quiz, not a
  conversation. **DECIDED: a turn is four distinct jobs** — read-back, fix
  (Devanagari + roman), a reply in Sanskrit *and* the learner's language, and
  an English explanation. Rendered as four distinct blocks, not one bubble.

- **`tutor_max_tokens` 180 → 3000, reversing the 2026-09-xx cut to 180.**
  That cut assumed the ceiling drives latency. Measured over ~60 live calls
  at a 3000 ceiling: the model emitted **172–297 tokens** and never
  approached it, p50 787 ms / p100 1123 ms — indistinguishable from the 180
  ceiling, because generation stops when the model is done. The ceiling is
  headroom; truncation costs the whole turn. Do not cut it back without
  re-measuring *emitted* tokens rather than the limit.

- **Sarvam collapses to Kannada unless the language is ordered in the USER
  message.** With the language rule in the system prompt, 2/7 languages came
  back correct: Telugu, Tamil, Malayalam, Bengali **and Hindi** all answered
  in Kannada. Resolving the language caller-side and naming it (with its
  native script) as a direct order in the user message: **9/9**.
  `services/explainer.py` recorded this identical finding for this identical
  model on 2026-08-30. **DECIDED: `_SYSTEM_PROMPT` must never name the reply
  language**; `tests/test_tutor.py` asserts the placement, not just the text,
  because moving it back is silent.

- **The Sanskrit field leaks the input script, 38% of the time.** On
  native-script input the model returns `reply_sa` part-Telugu or
  part-Kannada — one measured line was 26% Devanagari, the rest Telugu, with
  a `गच्छामि` embedded mid-sentence. The pre-existing `_is_bridge_language`
  guard is a Hindi **word list** and passes every one of these. **DECIDED: a
  script-purity gate (≥90% Devanagari) runs BEFORE the Hindi check and the
  Vidyut parse**, on `reply_sa` *and* `fix.devanagari`. Prompt hardening alone
  took `reply_sa` to 0/12 but left `fix.devanagari` leaking 2/12, so the
  prompt clause and the code gate are both required — neither is sufficient.

- **The model invents Sanskrit words and then explains them.** Asked about
  the owner's own line "Aham henge adini", it read "adini" as *today*,
  invented **आदिनि** as the Sanskrit for it, and explained the invented word
  confidently — while using the correct अद्य two clauses later. This is why
  the Vidyut gate now covers `fix.devanagari`: an invented correction is
  worse than no correction. Short heavily-code-mixed input is where this
  model is weakest, and gating hard so it abstains is the mitigation.

- **The language toggle was a provable no-op, and it is now fixed rather than
  removed** (owner's call). `explainer.reply_language()` ended in
  `"Hindi" if "hi" in langs and "en" not in langs else "English"`, while the
  client hardcoded `bridge_langs=["en","hi"]` at every login — so the
  condition could never fire and every learner got English forever, with
  reordering the list changing nothing. Worse, `_bridge_lang()` returned
  `"hi"` whenever Hindi was present, so that **English text was spoken by the
  Hindi voice**. `bridge_langs` is now only a turn-1 seed; the language is
  settled per turn from what the learner actually said.

- **Language detection is four layers, cheapest first, and the paid one is
  last for a measured reason.** Script scan (0 ms) → romanized marker table
  (0 ms) → Saaras' own `language_code` (free, already in the response, read by
  nothing) → an LLM classifier (~183 ms, ~15 tokens). The classifier alone
  scores 16/17 on romanized input; its single miss is "Aham henge adini",
  which it calls Telugu **at `confidence: 1.0`**. It is confidently wrong, so
  confidence is never thresholded anywhere in `lang_detect.py` — the marker
  table catches that line for free instead. Detection also sticks per session:
  nobody switches from Telugu to Tamil halfway.

- **STT was transliterating, not transcribing.** The client pinned
  `language_code="sa-IN"` on every recording. Round-tripped through Bulbul →
  Saaras, a Kannada line came back as `मेरा नाम अंशुल्, अहं संस्कृतं
  शिक्षमाणः।` and a Telugu one as `ना पेरु अंशुल्। नेनु संस्कृतं
  नेर्छुक्त्तुन्नु।` — a Kannada speaker's voice was silently rewritten into
  Devanagari before the tutor ever saw it. `"unknown"` (Saaras v4 auto-detect)
  returns the exact text **and** the correct `language_code`, which now feeds
  the detector.

- **Fonts: Baloo 2 is a display face and was being used for body Sanskrit.**
  Every Devanagari string in the app runs through `script()` → Baloo 2, set at
  16pt in a 24pt line box, so matras clip against the line above. **DECIDED:
  Tiro Devanagari Sanskrit** (drawn for Sanskrit conjuncts) at a 1.75× line
  box for the lines a learner is meant to *read*, scoped to Talk for now —
  `script()` has ~100 call sites and a global swap is its own change. The
  learner's own script gets a Noto face registered **on demand**
  (`services/scriptFonts.ts`); registering ten Indic faces at boot delays the
  splash for nine nobody will see. Honest limit: Metro bundles every `.ttf`
  regardless, so this defers *registration*, not download.

- **The keyboard covered the composer because nothing in this app ever
  handled the keyboard.** Zero `KeyboardAvoidingView` in the entire tree, and
  from Expo SDK 54 Android is edge-to-edge, where `softwareKeyboardLayoutMode`
  is ignored and the OS does not resize the window. Added
  `react-native-keyboard-controller`; the screen gives back
  `keyboardHeight − tabBarHeight` (the tab bar already sits above the bottom,
  so that much is free), and the 172dp avatar folds away on keyboard progress
  so typing does not happen in a letterbox.

- **Removed from Talk, deliberately:** the verdict flash (avatar lighting up
  green on a correct sentence — that is grading, not talking), the "Show me
  what to say" hint bar (it read `edges`, always empty in LLM mode, so it had
  never once appeared), and the escape/repair-ladder copy. Graph mode keeps
  all of it and remains the offline fallback.

- **Deferred at the owner's call:** the three-way Sanskrit/native/English
  ratio mirroring. `ratio_hint` and the Progress dial are untouched.

### Addendum — the Talk regression suite, and two thresholds it moved

`python -m app.evals.talk` (`--repeat N`, `--only kn,te`, `--kind native`) runs
15 real utterances across 10 languages through the **shipped pipeline** —
`lang_detect` → `tutor` (real prompt, real gates) → `iast` — and asserts the
invariants the gates exist to hold: language detected correctly, Sanskrit
fields ≥90% Devanagari, every Devanagari line carrying a roman line, no
`fix.needed` with an empty fix, `reply_native` in its own script. Non-zero exit
on any failure, so CI can gate on it.

Deliberately NOT a pytest: it costs real money and ~1 s/turn. The
deterministic half — detection ordering, gates against canned output — is in
`tests/test_lang_detect.py` and `tests/test_tutor.py` and runs free on every
commit. It is also deliberately not a `TASK_BUILDERS` task in the existing
suite: that scores raw model output on seed challenges, one provider call per
case, and routing Talk through it would bypass the gates, which are the thing
worth watching.

Current state: **45/45 over three passes**, free detection layers carrying
45/45 (zero paid classifier calls), p50 1034 ms / p100 1862 ms. `--repeat`
exists because the model is non-deterministic at `temperature=0.6` and a
single pass understates the script-leak rate.

Two thresholds moved because the suite surfaced them:

- **The unique-script floor dropped 0.30 → 0.15**, guarded by a new minimum of
  3 letters. None of Kannada/Telugu/Tamil/Malayalam/Bengali/Gujarati/Gurmukhi/
  Odia is used to write Sanskrit, so their presence identifies the speaker
  even when most of the line is not in them. The case that forced it:
  `aham vidyalayam gacchami ಅಂತ ಸರಿನಾ?` — romanized Sanskrit with a Kannada
  tag question — is 24% Kannada, fell through to the paid classifier, and the
  classifier correctly answered "this is Sanskrit", which is useless. The
  letter minimum is what keeps the low floor safe: a share alone would let one
  pasted glyph in a short line decide the turn. **Devanagari keeps the 0.30
  bar**, because it is shared with Sanskrit itself — a few Devanagari letters
  mean "quoting the language being studied", not "speaks Hindi".

- **`resolve_language` now reports `sticky(fallback)` rather than `default`**
  when the classifier abstains and the session language carries the turn. Not
  cosmetic: the classifier abstaining is frequently the *correct* answer (a
  line of romanized Sanskrit contains no bridge language at all), and a log
  reading `default` on a correct sticky hit is how you talk yourself into
  believing detection is broken when it is working exactly as designed.

Also fixed in passing: `app/evals/cli_env.py` now looks for `.env` in the
**repo root** as well as `backend/`. This repo's `.env` is at the root and
there is no `backend/.env`, so `python -m app.evals` had been finding no keys
at all and silently skipping every provider.

### Addendum — live multi-turn testing through the real endpoints

Everything above was measured single-turn or against the services directly.
Six rounds of real conversations through `/conversation/start` and `/turn`
against live Sarvam (Kannada, Telugu, Tamil, English, a voice round trip, all
twelve voices) found failures no single-turn test could. Each is now pinned by
a test in `tests/test_tutor.py`.

- **A regression of mine: every conversation opened in Hindi.** The first
  seeding rule took the first non-English entry of `bridge_langs`, and the
  client hardcodes `["en", "hi"]` at every login, so the answer was always
  "hi" — the exact thing the owner asked to be rid of. **DECIDED: a learner is
  greeted in the language they settled on in their previous conversation;
  someone new gets English, and English is NOT persisted as settled**, so their
  first line decides rather than a default they never chose.

- **A second regression of mine: the correction guard would have discarded
  real corrections.** It suppressed any fix when Vidyut read the line `ok` —
  but `ok` only means every word is a real form. `aham gacchasi` (I you-go),
  `tvam gacchami` and `aham gacchati` all parse 100%. These are the commonest
  beginner mistakes there are. **DECIDED: `agreement_errors` checks person and
  number between a first/second-person nominative pronoun and its verb, and
  `SanskritHealth.is_correct` (not `ok`) is what the guard, the verdict and
  the prompt use.** It abstains unless a sentence has exactly one such pronoun
  and exactly one finite verb: `aham gacchāmi, tvam?` is correct ellipsis and
  must never be accused. `bhavān` is excluded — it takes a third-person verb,
  and the analyser misparses it as `bhava ACC.PL`. The outgoing gate applies
  it too, so the tutor cannot say "अहं गच्छति" either. It also fixes a
  pre-existing bug: those lines used to score `verdict=correct` and full XP.

- **Sanskrit written in a native script was invisible to Vidyut.** Karnataka
  and Andhra schools teach Sanskrit in the regional script, so `ಅಹಂ ಗಚ್ಛಾಮಿ`
  is a realistic line — and it parsed 0%, after which the model "corrected"
  a correct `మమ నామ అన్షుల్`. `vidyut.lipi` round-trips Telugu, Kannada,
  Malayalam, Bengali, Gujarati, Gurmukhi and Odia losslessly; real native
  SENTENCES still read as not-Sanskrit after conversion (measured 0.00–0.33,
  no root, no pronoun). **Tamil is excluded from analysis**: its script has no
  voiced or aspirated stops, so `கச்சாமி` returns `कच्चामि`, not `गच्छामि`. It
  is included for DISPLAY, where vidyut.lipi's superscripts (`க³ச்சா²மி`) keep
  the information.

- **"What does that mean?" was broken in LLM mode — pre-existing.** The
  explain endpoint looked up a graph node, and LLM mode has none
  (`current_node_id` is NULL), so every request 404'd and the learner saw a
  generic apology. It now falls back to the last tutor turn's row.

- **Asking this model for grammatical labels gets wrong ones.** About 7 of 16
  WHY paragraphs mislabelled the tutor's OWN words — आगच्छति called first
  person, कुत्र and अद्य called locative, नामा called nominative.
  `explainer.py` already forbade grammatical claims from this model for the
  same reason, and my first prompt asked for them anyway. **DECIDED: label a
  form only when it appears in Vidyut's analysis of the learner's line.**
  Measured afterwards: 2 of 16. The model still labels its own words
  sometimes; the complete fix is labels derived from Vidyut, not the model.

- **Four quality failures are now caught deterministically and retried once,
  together:** the reply merely translating the learner's line back (the owner's
  first complaint, word for word); a question already asked (containment, not
  equality — `अद्य भवान् कुतः आगतः?` is the same question); another script's
  letters in the native line (one Sinhala letter turned up inside a Telugu
  word); and the native line being the Sanskrit in native letters instead of a
  translation. A system-prompt rule alone left "भवान् कुत्र वसति?" asked four
  times in one conversation; with the list handed over in the user message and
  the retry behind it, the last run asked 13 questions with no repeats. **The
  first reply is kept as a fallback** and replaced only by a retry that is not
  worse, so the retry can never cost the learner a complete turn.

- **Two thresholds were moved by false alarms, not by failures.** The
  "Sanskrit in native letters" check judged the whole line and flagged
  `ഇത് ലളിതമാണ്. ഗൃഹം ഗച്ഛാമി.` — correct Malayalam, then the example — because
  `ലളിതം` IS Sanskrit `lalita`; it now requires EVERY sentence to be Sanskrit.
  And a stray native letter in the Sanskrit line (`ಅहम्`) is repaired before
  the purity floor, for a slip of at most two letters — otherwise whether it
  survived depended on sentence length (1 in 9 letters fails a 90% floor,
  1 in 25 passes).

- **Measured ceiling, not fixed:** on short, heavily code-mixed lines the
  model sometimes misreads the learner's MEANING, and a fix card inherits it:
  `naanu` (Kannada "I") became Sanskrit `न` ("not") once and `ननु` once;
  `adini` became "today". Those fixes are valid Sanskrit with the wrong
  meaning, so no gate can catch them. A stronger model is the lever.

- **The local backend could not see its own key — fixed.** The Sarvam key
  lives only in the repo-root `.env`, while `start_mob.ps1` and
  `.claude/launch.json` run uvicorn from `backend/`, and `config.py` read
  `.env` relative to the working directory. Started that way the backend had
  no key and served `mode: graph` — the scripted dialogue — so a dev build
  showed none of the LLM tutor. **DECIDED: `config.py` anchors its `.env`
  paths to the source tree** (cwd `.env`, then repo root, then `backend/.env`,
  later winning), so the answer no longer depends on the launch directory.
  Verified by starting the backend exactly as the launch config does:
  `mode: llm`. The Docker image is unaffected — it copies no `.env`.

- **…which is why the test suite now reads no `.env` at all.** It never did
  (there is no `backend/.env`), and that has to stay true now the root file
  is visible: it holds live keys, and a `DATABASE_URL` there would point the
  suite at a real database. `conftest.py` sets `SHABD_IGNORE_DOTENV` and
  blanks every vendor key; `tests/test_config_env.py` asserts both. That test
  failed on its first full run and found a pre-existing leak:
  `test_author_batch.py` and `test_challenge_batch.py` assigned
  `os.environ["SARVAM_API_KEY"] = "mock-key"` and never restored it, so every
  later test had a "configured" key and any unmocked path called the real
  Sarvam API — suite runtime swung from ~50 s to over 10 minutes with the
  network. They use `monkeypatch` now. It also explained
  `test_tts_502_refunds_quota`, failing all session: it called
  `get_sarvam_client()`, which needs a configured key, so it only ever passed
  on a machine that had one configured. It builds its client from a dummy key
  now.

Current state: `python -m app.evals.talk --repeat 3` passes **66/66**, the
free detection layers carrying 63 of 66, p50 875 ms.


## 2026-09-23 — Saaras v4: what it changes for Talk, and what it broke

Sarvam shipped `saaras:v4` on 2026-08-18 (GA 2026-09-02): Global English on
top of Indian English, better language identification on noisy and
code-mixed audio, **keyterm prompting** (≤50 terms of ≤64 chars; REST, Batch
and both WebSockets) and a seat on the Realtime API. Same price as v3
(₹30/hour), same request and response shape, same 22 Indic languages.
`sa-IN` is in the STT list for v3 AND v4, so Sanskrit *recognition* is not
new; Sanskrit *synthesis* still is not available (below). This codebase had
already defaulted `speech_to_text` to v4 without a v3/v4 comparison, while
the ASR bench kept labelling its runs "saaras:v3". The model is now one
setting, `SARVAM_STT_MODEL`, and the bench records the model it actually
called.

Everything below was measured against live Sarvam on 2026-09-23, with
Bulbul-voiced lines (three voices for the Sanskrit), before any code changed.

- **v4 auto-detect translates spoken Sanskrit into English, 19 times in 20.**
  "मम नाम अंशुलः। अहं संस्कृतं पठामि।" came back as "My name is Anshul. I
  read Sanskrit." (en-IN, probability 1.0). "अहं गच्छसि।" came back as "I am
  going.", which erases the very mistake the tutor is there to catch. This was
  Talk's shipped configuration: the 2026-09-22 switch from `sa-IN` to
  `"unknown"` was measured on Kannada and Telugu speech only. v3 on
  auto-detect did it 2 times in 20.
- **Pinned to `sa-IN`, v4 is the most faithful Sanskrit transcriber
  measured** (20/20, agreement errors intact). Everything else it rewrites
  into Devanagari, and it TRANSLATES some of it: a Tamil sentence came back
  as "एन नाम अन्शुल्। अहं संस्कृतम् शिक्षे।", which Vidyut scores as healthy
  Sanskrit. The 2026-09-22 finding stands.
- **v4 auto-detect is excellent at everything that is not Sanskrit.** Every
  Kannada, Telugu, Tamil, Malayalam, Bengali, Hindi and Marathi line came
  back in its own script at probability 0.82–1.0 (v3: 0.75–0.9).
- **DECIDED: Talk runs both, concurrently, and a deterministic rule picks**
  (`services/learner_stt.py`). The auto pass is trusted whenever it names a
  bridge language other than English. Otherwise the Sanskrit pass wins only
  if Vidyut reads it as Sanskrit and the free detection layers find no
  Hindi, Marathi or other script in it. Real English fails that check: the
  Sanskrit pass spells it out in Devanagari ("माय नेम इज़ अंशुल"). A failed
  auto pass fails the turn, because the Sanskrit pass alone would turn Tamil
  into Sanskrit. Cost: 2× STT (about ₹0.04 extra per five-second line). STT
  p50 went from 387 ms to 441 ms (`bench_asr.py --language unknown`). Live
  through `/speech/stt` and `/conversation/turn`, "अहं विद्यालयं गच्छसि" now
  reaches the tutor intact and draws the गच्छामि fix instead of an English
  sentence. When the Sanskrit pass wins it reports `sa-IN`, and
  `lang_detect` treats that as "no bridge language": the session keeps its
  language and the paid classifier is not called.
- **Keyterms: deliberately NOT used.** Biasing towards Sanskrit vocabulary
  turned a learner's "अहं गच्छसि" into "अहं गच्छामि", correcting them before
  the tutor could. A Latin-script keyterm ("Anshul") flipped a Hindi line into
  an English translation. A Devanagari name keyterm fixed "अंशु" → "अंशुल"
  and harmed nothing measured. That is the only candidate, and it needs the
  learner's name in Devanagari, which the app does not have.
- **Varnamala regressed on v4, and the grader was the fragile part.** v4
  answers "त।" for a spoken त where v3 answered "त". The exact-match grader
  scored 5/30 correct on v4 against 18/30 on v3. **DECIDED:
  `score_pronunciation` strips edge punctuation (never the visarga).** On the
  same recordings v4 now scores 20/30 correct, with the same 4 "incorrect".
- **Bulbul still has no Sanskrit voice.** `sa-IN` answers 400 "Please request
  beta access to sa-IN by contacting our support team.", so the request made
  on 2026-08-29 has not landed on this account. **DECIDED: the app sends
  `sa-IN` for Sanskrit and the server maps it to `TTS_SANSKRIT_CODE`** (hi-IN
  today), in `/speech/tts` and in inline turn audio. Once support enables the
  beta, one env var moves every live Sanskrit line to the Sanskrit voice with
  no app release. The backend must deploy before the app, or Sanskrit TTS
  400s. The pre-render scripts keep their own `--sa-language` flag.
- **Bulbul never received our sample rate.** It reads `speech_sample_rate`,
  and this client sent `sample_rate`. That is why the 2026-08-29 probe found
  22050 Hz "regardless". With the right field, 16000 returns 16 kHz. The
  default stays 22050, exactly what learners have been hearing.
- **STT metering was 8× low on Talk.** Both upload routes assumed 16 kHz
  16-bit WAV (`bytes/32000`). Talk uploads 32 kbps AAC in an .m4a, so a
  20-second turn was metered as 2.5 s. `services/audio_meta.py` now reads the
  WAV header or the MP4 `mvhd` box, and falls back to the old guess for
  anything else (web's webm). The same number enforces Saaras' 30-second
  REST ceiling (probed: 400 "Audio duration exceeds the maximum limit of 30
  seconds"). Such a recording is refused with 413 before any quota or vendor
  call, and the app now says so instead of "the network failed". A 429 quota
  refusal also got its own copy.
- **Auto-detect can answer `language_code: null`**, which reached
  `STTResponse` (a required string) as None and would have 500'd the turn.
  It maps to "" now. `language_probability` is passed through as a
  diagnostic and thresholded nowhere, because Sanskrit came back en-IN at 1.0.
- **Found while testing: the tutor told learners they were right while
  correcting them.** 10 of 21 correction turns opened with सत्यम् or सम्यक्,
  shown as "Correct.", "Right." or "सही है।" beside the fix card. A
  system-prompt rule brought that to 5 of 18. A soft problem
  (`affirms_a_fixed_line`, opening word only, so praising the FIX still
  passes) plus the existing retry brought it to **0 of 24**, p50 865 ms.
  `python -m app.evals.talk --repeat 2`: 44/44.

Sarvam changes that need no code: `sarvam-30b` was retired 2026-08-18 (not
used here). `sarvam-105b` went from ₹4/₹16 to ₹29.28/₹73.2 per 1M tokens
in/out on 2026-08-05; the eval pricing table is updated, and cached input is
₹10.98. Workspace data-retention controls arrived 2026-09-15; they are an
owner setting, and worth setting to the minimum given P1-4. Not adopted yet:
the Realtime STT WebSocket (partial transcripts, VAD end-of-turn; v4 there
has the same Sanskrit problem, so it would need both passes), Bulbul
pronunciation dictionaries and `temperature`, which need listening rather
than a script, and compressed TTS output (`output_audio_codec=aac` was 44 KB
against 158 KB of WAV for the same line, but the app's players assume WAV).

## 2026-10-01 — Today's tithi on Home, worked out on the phone

How each line was checked is in brackets: *run*, *read* or *not verified*.

- **What.** A card in Home's Daily section shows today's date in the learner's calendar: the Moon as it looks now inside a ring of the month's thirty tithis, the Sanskrit date, a bar that fills as the tithi runs out, when the next begins, the weekday, the nakshatra and the year. Tapping it opens Kāla (next entry), where "Your calendar" lives: six traditions (North India; Maharashtra, Karnataka and the Telugu states; Gujarat; Tamil Nadu; Kerala; Bengal), the script (Devanagari, roman, or the region's own) and the place. Code: `mobile/src/kala/`. The owner approved a mock of the card first.
- **DECIDED: on the phone, with the server's own library.** `astronomy-engine` 2.1.19 (MIT, one pure-JavaScript package, no install scripts) is pinned in `mobile/package.json`, and `src/kala/engine.ts` is a port of `services/panchang.py`. The card therefore works offline and against either backend, sends nothing (the privacy text promises the place leaves the phone only with a question about dates), and cannot disagree with an Ask answer, because both sides run the same release. The library is loaded on the first reading, after Home's first frame.
- **The card says what is true now**, and when it changes, not the tithi at sunrise. Month and year turn at the new moon itself. The weekday is the Hindu day's: it turns at sunrise at the learner's place.
- **No location prompt.** The place is the one already stored by Settings or Ask, or else the tradition's city when the phone is in its time zone.
- **Sanskrit is generated, never typed.** `backend/scripts/gen_kala_names.py` lists stems in SLP1 and says beside each list where its stems were read; Vidyut writes them in Devanagari and IAST and derives the case forms into `sanskritNames.ts`. 216 of the 224 are in Vidyut's kosha [*run*]. The eight that are not are seven plain compounds of words that are (बुधवासर, गुरुवासर, द्वापरयुग, यमगण्ड, गुलिककाल, राहुकाल, श्वेतवाराहकल्प) and बालव, the second karana, which is a headword of the Vācaspatyam (Monier-Williams spells it vālava) [*read* at the University of Cologne's lexicon]. Where the engine could not inflect a stem the script does not guess: आयुष्मान् is taken only because the kosha knows it, वरीयान् is derived as उरु with the suffix ईयसुन्, and मासे is one of the two seventh-case forms the engine itself offers [*run*].
- **Regional names are the almanac's own.** Every Tamil, Malayalam, Bengali and Gujarati string in `regionalNames.ts` is as Drik Panchang prints it on its pages in that language [*read* 2026-10-02]. They were compared by a hash of their code points, taken in the page and in the app, so nothing was checked by eye or retyped: all twelve months and seven weekdays in each of the four scripts match exactly, and so do સુદ, વદ, અમાસ, અધિક and the fifteen Gujarati tithi names [*run*, kept in `check-kala.mjs`]. One difference is spelling only: the almanac prints Malayalam weekdays the older way (ഞായര്), the app with the chillu letters now standard (ഞായർ). The first build took these names from Wikipedia pages. That is withdrawn, and with it the Gujarati form it had suggested (ભાદરવા વદ ૫): the card now writes a Gujarati date as the almanac does, ભાદરવો, વદ પાંચમ, with ફાગણ, સુદ પૂનમ at full moon and જેઠ અધિક, સુદ પડવો in an added month. The roman month names are the spellings of the almanac's English pages. No native speaker has read any of it. Nakshatra and year names stay roman in "My script" until one has.
- **Checks.** `cd mobile && node scripts/check-kala.mjs`: 4,024 assertions [*run*, all pass]. Against the server engine through `scripts/kala-fixtures.json` (185 instants: longitudes within 5e-7 degrees, end times within 1 ms); against the Drik Panchang fixture of `tests/test_panchang.py`; and every reported boundary against itself. `npx tsc --noEmit`, `scripts/check-contrast.mjs` and `pytest` (1111 passed, 17 skipped) pass [*run*]. `npx expo export --platform android` builds the Hermes bundle with the calendar code inside it [*run*].
- **Three things the port does not copy from the server. All three are still in `panchang.py`.**
  1. `_next_crossing` falls back to a rough estimate when the longitude wraps past 360 degrees inside its two-day window. In the 185 sampled instants, 27 nakshatra ends and 18 yoga ends took that path and were up to 120 and 200 minutes off [*run*].
  2. `month_of` names the dark half of an added month after the next month: on 7 June 2026 it says "Adhika Ashadha" for what is still Adhika Jyeshtha [*run*].
  3. `samvat()` turns the year on a fixed 22 March, because it asks for Ugadi, which is not a shipped festival, and swallows the error [*run*].
  Ask's FACTS carry only the tithi and the purnimanta month [*read*], so only the second can reach a learner today, and not before the next added month (Adhika Chaitra, 15 March to 14 April 2029 [*run*]).
- **The licences row pointed at a dead link.** `github.com/don-cross/astronomy-engine` is a 404; the project is `github.com/cosinekitty/astronomy` [*run*]. Fixed in `seeds/licences.py`.
- **The three solar month rules were held against Drik Panchang.** Tamil Nadu (before sunset), Kerala (before three fifths of the daytime) and Bengal (the next day) were compared with Drik Panchang's regional pages at dates where the rules disagree: 14 January 2026 is 1 Thai in Chennai and still 30 Dhanu in Kochi; 15 April 2026 is 1 Boishakh in Kolkata; 18 October 2026 opens Aippasi, Thulam and Kartik [*read* on Drik Panchang 2026-10-01, kept and *run* in `check-kala.mjs`]. The comparison found a bug: a civil day carries one solar date, so the Sun is now looked up at the day's end (`solarDateOn`) and not at the moment of asking. Drik's sankranti moments run about ten minutes later than this engine's (its ayanamsa is 25 arcseconds larger), so a sankranti within ten minutes of a cutoff could still differ [*run*].
- **Not verified.** The year whose Chaitra is an added month (2029): here it turns at the first of the two Chaitras. Nothing has run on a phone, so Hermes speed, `Intl` time zones on Hermes (the code falls back to the phone's own zone) and the faces on Android are unchecked. The whole app's web build does not bundle, because `react-native-youtube-iframe` wants `react-native-web-webview`, so the card and the screens were exercised in a web build of those components alone [*run*].
- **All Devanagari on the card is 18 pt or more.** The first build followed the mock with 13 to 14 pt labels (today, the weekday, the next tithi). They are 18 pt now, as HANDOVER section 0 requires, and so are the Devanagari labels in the calendar sheet.
- **Built since.** The "learn more" screens are the next entry. A separate app for the detailed material comes after them, per the owner.

## 2026-10-01 — Kāla: the calendar explained, behind the Home card

How each line was checked is in brackets: *run*, *read* or *not verified*.

- **What.** Tapping the Home date card opens Kāla (`screens/Kala.tsx`): "You are here", the present moment named at ten scales from the kalpa down to the Moon's star, each in the seventh case, and six chapters (`screens/KalaChapter.tsx`, bodies in `kala/chapters/`). Today: the five limbs, a 24-hour wheel with the good and avoided stretches, the week, what is coming. The Moon: a month the learner turns by hand, the lengths of this month's thirty tithis, the 27 stars. The clock: a live dial of sixty ghatikas from the learner's own sunrise, a stopwatch in ghatika, pala and vipala with a breath ring, the ladder of units. The year: a wheel of this lunar year's months against the Sun's twelve signs, where the added month is the one no change of sign falls in. The yugas: the four ages as a 4:3:2:1 ring, and where the present stands, up to the kalpa. Six calendars: this moment dated six ways, and a table of the four choices that make the difference. The owner asked for these to be built directly, with no further mocks.
- **DECIDED: the basics here, the depth in a separate app later** (owner). `kala/chapters.ts` holds `DEEPER_APP`. The hub shows its "Go deeper" strip only once `url` is set, so nothing promises an app that has no store page.
- **DECIDED: charts, not paragraphs.** A chapter is a title, one Sanskrit term, one line, and charts with short labels (the copy rule). Every chart can be worked without dragging: buttons or an adjustable role step it. Every animation has a Reduce Motion path. A picked item changes shape as well as colour (a ring piece stands out, a bar wears a cap, a row is underlined), and good and avoided stretches are a solid and a broken line.
- **Same engine, still offline.** The screens use the card's own reading (`useToday` keeps the last snapshot between screens) and add pure models in `kala/learn.ts`. Nothing is sent anywhere.
- **Sanskrit.** Every Sanskrit string comes from `sanskritNames.ts`. Where two words are joined (आश्विनमासे, कृष्णपक्षे, रोहिणीनक्षत्रे, शुक्लपक्षः) the first is a stem and the second begins with a consonant, so no sandhi is written by hand. One idea was left out for want of a source: that a month is named after the star of its full moon. The engine does make चैत्रः from चित्रा, but by the general rule 4.1.92, which does not say why.
- **Where what is not astronomy was read** [*read* 2026-10-02, each at the source]. The Sūrya Siddhānta (GRETIL's e-text of the 1854 Bibliotheca Indica edition): six prāṇas to a vināḍī, sixty of those to a nāḍikā, sixty nāḍikās to a day (1.11-12); a cycle of 4,320,000 years whose tenth part, taken four, three, two and one times, makes the four ages (1.15-17); 71 cycles to a manvantara (1.18); fourteen Manus and fifteen junctions to a kalpa of a thousand cycles, a day of Brahmā (1.19-20); six Manus gone and 27 cycles of the seventh (1.22-23); a star as 800 minutes of arc, a tithi as 720, a yoga as the Sun and Moon added, a karana as half a tithi (2.64-69). The Bhāgavata Purāṇa (vedabase.io): the ages as 4,800, 3,600, 2,400 and 1,200 years of the gods (3.11.19); a thousand cycles to a day of Brahmā (3.11.22); 71 cycles to a Manu (3.11.24); this kalpa called Vārāha (3.11.37); the son of Vivasvat the seventh Manu, the present one (8.13.1). Monier-Williams and the Vācaspatyam (University of Cologne): the names of the yogas, karanas, signs, seasons and units and what each means, among them the breath as "the time requisite for the pronunciation of 10 long syllables", the muhūrta as the thirtieth part of a day, and the pañcāṅga as an almanac of five things. Drik Panchang: the day's auspicious and inauspicious stretches for all seven weekdays in New Delhi (1 to 7 October 2026) and at both solstices (1 January and 21 June 2027), and the karanas round the new moon of 10 October 2026. The count of years into the kalpa, 1,972,949,127, is addition from those verses, and agrees with the text's own total of 1,953,720,000 at the end of the first age (1.47) once the 17,064,000 years it sets aside for creation are taken off [*run*].
- **The first pass rested on two Wikipedia pages, and the owner does not accept those as evidence. Going to the sources changed five things.** (1) The kalpa is श्वेतवाराह, with a long ā (Monier-Williams); the page's roman spelling had hidden it. (2) The third fixed karana is चतुष्पद, with a short a, as the Sūrya Siddhānta has it, and each karana now takes the gender the Vācaspatyam or Monier-Williams gives it (तैतिलम्, गरम्, नागम्). (3) The rains are a plural in Sanskrit (वर्षाः, वर्षासु). (4) Seasons and signs are glossed as Monier-Williams glosses them (Rains, Winter, Cool season; Maiden, Balance). (5) The day's stretches carry the almanac's own words, auspicious and inauspicious. Two places where the sources disagree with each other are both settled for the almanac a learner will compare the app with: the Sūrya Siddhānta's verse, as Raṅganātha's commentary reads it, puts Nāga before Catuṣpada among the fixed karanas, where Drik Panchang and Monier-Williams have Catuṣpada first; and Monier-Williams gives the hour before dawn in fixed ghaṭikās, where the almanac divides the night itself (05:25 to 06:19 before a 07:14 sunrise on 1 January 2027) [*read*].
- **Still resting on the almanac alone.** The three inauspicious stretches are Drik Panchang's: which eighth of the daylight each takes on each weekday, and the names राहुकाल, यमगण्ड and गुलिककाल. None is in Monier-Williams and no text was opened for them. So are the Kali year (5127), the choice of Āśvina and Kārttika for autumn (Monier-Williams says the months of autumn differ by region), and the place of seven of the sixty year-names, which Monier-Williams does not number or numbers inconsistently.
- **Checks.** `node scripts/check-kala.mjs`: 4,024 assertions [*run*, all pass], now covering the hub's ladder, the five limbs, the week (Ashtami meets no sunrise in Delhi between 3 and 4 October), the tithi lengths, the units, the year wheel (thirteen months, one with no sankranti), the ages, the six dates, the charts' geometry, and the readings named above: the Sūrya Siddhānta's total, the almanac's stretches at both solstices, its karanas at the new moon, and the regional names by hash. `npx tsc --noEmit`, `scripts/check-contrast.mjs`, `scripts/a11y-audit.js` (0 issues) and `pytest` (1111 passed, 17 skipped) pass [*run*]. `npx expo export --platform android` builds the Hermes bundle with the screens inside it [*run*].
- **Seen working** in a web build of the three screens alone [*run*]: the card opening the hub; every chapter showing live values that match the engine; dragging the Moon, the year wheel and the star ring, with a touch off the ring left alone; sliding along the tithi bars; the stopwatch; picking a tradition from the chapter and from the sheet, with the card following; the largest text size with nothing running off the side; Reduce Motion.
- **Not verified.** Nothing has run on a phone. In particular: the ring gesture, which takes a touch only when it lands on the ring so the page still scrolls everywhere else (gesture-handler's manual activation; its Android source allows a forced activation from touch-down [*read*], but it has not been felt on a device); how long the first reading, the year and the thirty tithi lengths take on Hermes (3 to 7 ms each in Node [*run*]); the app's face in chart labels through react-native-svg; and the entrance of the hub's ten lines. No native speaker has read the regional strings.
- **The card changed with it.** Its tap opens Kāla instead of the calendar sheet, which now opens from the hub. A neuter name stands alone in roman as its stem ("Kaliyuga", not "Kaliyugam"). A Gujarati date is worded as the almanac words it (previous entry).

## 2026-10-02 — Book-cover house style switches from miniature to watercolour

- **DECIDED (owner): watercolour is now the house style.** Supersedes the 2026-10-01 Pahari-miniature decision recorded in `HANDOVER.md` §7.2 / Appendix C and `specs/covers/covers.json`.
- **Current state:** raw watercolour paintings exist as 18 files in `results/covers/paintings-watercolour/` (git-ignored, like all of `results/`). The files the app ships are still the miniature set: 18 files in `mobile/assets/covers/*.webp` (600x900, <150 KB) via `mobile/src/components/book/covers.ts`.
- **Implication:** switching the shipped set is a content rebuild, not a code change — compose `paintings-watercolour/` → masters → `export_covers.py` → `mobile/assets/covers/*.webp`. `CoverArt.tsx` / `covers.ts` / `useReaderBooks.ts` / `Reader.tsx` wiring is style-agnostic (keyed by catalogue slug). Do not edit `mobile/assets/covers/` by hand; regenerate via the `specs/covers/` pipeline.

## 2026-10-02 — Cover art tracked in git, still excluded from EAS builds

- **DECIDED (owner): `results/covers/` is tracked in git.** `.gitignore` now ignores `results/*` with `!results/covers/` exceptions; `.easignore` keeps `/results/` so the ~1 GB of 4K sources/masters never enters the EAS upload. Other `results/` output stays git-ignored.
- **Pipeline now reads `results/covers/paintings-watercolour/`** as the canonical source (`compose_covers.py`); `export_covers.py` docstring updated. Rebuilt all 18 `mobile/assets/covers/*.webp` (600x900, 86–126 KB, quality 88).
- **Note:** `results/covers/paintings/` and `results/covers/paintings-watercolour/` are currently byte-identical duplicates (~36 MB each) — deleting one copy saves that weight in git.

## 2026-10-02 — Cover webp at maximum quality

- **DECIDED (owner): maximum export quality.** `export_covers.py` now writes fixed quality 100 instead of stepping down from 88 to fit 150 KB. All 18 `mobile/assets/covers/*.webp` rebuilt: 216–283 KB each, 4.6 MB total (was ~2 MB). Measured on gita: q88 109 KB / q95 172 KB / q100 233 KB / lossless 623 KB — lossless rejected as 3× the weight for no visible gain at 600x900.

## 2026-10-02 — The verse of the day gets its meaning; Gemini gets its own ceiling

How each line was checked is in brackets: *run*, *read* or *not verified*.

- **DECIDED (owner): a verse shows its meaning in Hindi and English, and the Ask sheet answers questions about it.** Shown from the database when stored. When it is not, Gemini Flash writes it once as a card (meaning, the idea, key words), it is stored, and everyone after is served the stored row with no model call. The verse can be from any text. `services/verse_study.py`, table `ask_answers` (migration `d4e5f6a7b8ca`, after the daily-content one), `GET /shlokas/{id}/meaning`, and a verse path in `POST /explain`.
- **Where it is stored.** The plain meaning goes in `shlokas.translation_en` / `translation_hi`, only when empty: a translation that came with a sourced import is never overwritten [*run*, test]. The card goes in `ask_answers`, keyed by verse text, question and language; "what does this verse mean?" in any English or Hindi wording shares one row per language. One study call writes both languages.
- **Gemini is online through Vertex AI with the service account** (`services/vertex_live.py`, provider `vertex:gemini-3.8-flash`), not OpenRouter. `generateContent` answers 200 for the key in `vertex_credentials.json` [*run*]. Left alone the model reasons first (457 reasoning tokens for a 90-token answer, 5.8 s); with `thinkingBudget: 0` the same answer took 1.9 s with none, so that is what is sent [*run*]. In production it needs the key mounted as `VERTEX_CREDENTIALS_JSON`, which `deploy.sh` now does from the key file; until that deploy, verse questions fall back to the Sarvam explainer and the verse screen shows no meaning [*read*].
- **DECIDED (owner): Gemini is capped at ₹200 a day across everyone**, apart from Sarvam's ceiling (`gemini_daily_budget_inr`, kind `gemini_inr` in `services/quota.py`). The two do not share money [*run*, tests]. One learner may use ₹10 of it. Each call reserves its worst case before it is made and is settled to its billed tokens after. Prices: $0.75 / $3.75 per 1M tokens through 2026-12-31, then $1.50 / $7.50, read on Google's pricing page; the code switches on the date. ₹100 to the dollar, rounded up on purpose. The Sarvam ceiling is ₹300, not ₹900, and was left as it was.
- **Seen working against live Gemini on a throwaway database** [*run*]: a real verse got its meaning in 3.9 s the first time and 4 ms from the database after; the same study served the English and the Hindi card; a free question was answered once (2.9 s) and then from the database (6 ms); five model calls cost ₹0.61 on the ledger, about 12 paise a verse. `ते वर्धमानं।` came back "too short or unclear", nothing was stored as its meaning, and it was not sent twice.
- **Money that was leaking, closed.** (1) Auto-detect speech makes three Saaras calls per recording and the budget counted one; it now counts three, while the learner's allowance is still charged once. (2) `/speech/tts` synthesised the same text for every tap by every learner; it now keeps recent audio in memory (32 MB per instance) and a repeat costs nothing. (3) A refund wrote "downstream_failure" (18 characters) into a 16-character column, which PostgreSQL refuses, so on production a failed vendor call would have raised instead of refunding [*read*, not run on PostgreSQL]; refunds now store "refund". (4) Talk and Ask inputs have length ceilings. (5) `/admin/metrics` reports rupees spent against both ceilings and the audio cache's hit rate.
- **Not verified.** Nothing ran on a phone or in a browser: the verse screen's Meaning block and the new Ask rows are type-checked only. Nothing was run on PostgreSQL. The meanings are the model's and no person has read them against a published translation; the verse screen carries the report flag.
- **Open, the owner's.** 15 of the 51 seeded Gītā entries are wrong: ten real verses carry the wrong chapter and verse (the 2 October verse is labelled 12.4 and is 18.66) and five lines are not in the Gītā at all [*run* against GRETIL's e-text]. About two dozen of the other 45 are lines I do not recognise as real sayings [*not verified*, my reading]. The model declines the unreadable ones, but a grammatical invented line still gets a meaning. Batch jobs of the daily-content pipeline are not counted under the ₹200; that pipeline has its own ceiling.

## 2026-10-02 — Daily word and "Do you know": written by a model, checked against a page, stored, no approval step

How each line was checked is in brackets: *run*, *read* or *not verified*.

- **DECIDED (owner): both daily cards are automatic.** A model finds a new word and a new fact, they are checked, stored in the database (Supabase in production) and shown, one a day, with no approval step and no deploy in between. Words are for every language, not only English, German and Russian. This replaces the design in `handover_language.md` (batch files approved by the owner, English only), whose tables, loader, API and screen stay and are built on.
- **DECIDED (owner): Gemini Flash, only through Vertex AI batch jobs with the service account.** `services/vertex_batch.py`, model `gemini-3.8-flash`. No OpenRouter and no online call in this pipeline. Grounding with Google Search is not used and must not be added: Google's service terms allow its results to be shown only to the user who asked, forbid storing them, and name collecting links by automated means as a violation [*read* 2026-10-02, Service Specific Terms].
- **DECIDED (owner): no dictionary reader per language. A page on a trusted site must say it, and code opens the page.** `services/page_check.py`. Trusted means dictionaries of record, language academies, universities, scholarly publishers and libraries of Sanskrit texts; Wikipedia, Wiktionary, Wikisource, blogs, forums and question sites never count, and adding a host cannot un-block them. The list is my judgement, not a measurement; `CONTENT_EXTRA_TRUSTED_HOSTS` adds to it. A candidate with no confirming page gets no card, and the card links to the page.
- **How a run goes** (`services/daily_content.py`, moved one step at a time by `POST /admin/content/tick`): propose (one batch job: eight languages in turn out of 72, plus one request open to any other language; or three groups of texts out of thirteen) → cite (the model names up to three pages per candidate) → check (code opens them) → for words, judge (a third batch job: the model reads the passage the check found and says whether it gives the Sanskrit word as the source or only as a relative) → store with the next free day. A run starts when fewer than 60 future days of words or 30 of facts are filled.
- **What code checks, and what it does not.** A word: its Sanskrit stem is a stem the Vidyut kosha lists, and Devanagari and roman are lipi's, never the model's; the page prints the word, and prints the stem beside a word meaning "Sanskrit", not after "akin to", "cf." and the like; a route's stops are shown only if the page prints every one of them, otherwise the card says "Goes back to Sanskrit" and claims no route. A fact: at least nine tenths of the quoted verse stands on the page, read as Devanagari or as roman; the roman shown is lipi's; our wording may not repeat eight words in a row from the page. **Not checked by anything:** the meanings given for a word, and whether the fact, translation and explanation say what the verse says. They are the model's wording. DECIDED (owner, 2026-10-03): the screens carry no note saying so ("we dont need these nonsense disclaimers anywhere"); both keep the report flag (`/feedback/report` surfaces `fact` and `word`). `POST /admin/content/withdraw` takes a card down at once.
- **Facts are text facts only.** Every fact rests on a quoted verse. The recent-history ideas (Steve Jobs, Ramanujan, German universities) are not produced: code has no way to confirm a prose claim on a page.
- **Polite fetching.** The fetcher names itself (`SanskritamBot`, with the contact address), obeys robots.txt, asks one host at most once every 1.2 seconds, and stops after 75 seconds of a tick. A site that refuses it yields no card. Nothing a page says is stored, only its address, its site and the verdict; the passages sent to the judge are dropped when the run ends [*run*, test].
- **Money.** The pipeline has its own ceiling, ₹60 in any 24 hours by its own token counts at half the list price, and also stays under what is left of the ₹200 Gemini ceiling. A kind rests 6 hours after a run that made cards and 24 after one that made none. Estimate from the one Vertex run of 200 page requests (39,740 prompt, 35,087 reply, 241,433 reasoning tokens) at the prices in `config.py`: about ₹25 to ₹30 for a words run of a hundred candidates [*not verified*: no invoice seen, and the half price is Google's statement].
- **Tests** [*run*]: `tests/test_page_check.py` (26) and `tests/test_daily_content.py` (32), with a stand-in for Vertex and made-up pages; whole suite 1265 passed, 17 skipped. Migration `c3d4e5f6a7b9` up, down and up again on SQLite. `npx tsc --noEmit`, `check-words.mjs` (41), new `check-facts.mjs` (23) and `check-contrast.mjs` pass.
- **Not verified, and it matters.** The check has never met a live site. The propose and cite prompts ran once on Vertex on 2026-10-02 (168 words in 14 languages, 32 facts, 200 page requests answered; the model named no page for any of 12 Swahili words, for 8 of 12 Thai words, or for 3 of 8 science facts), but no named page was ever opened by this code, so the share of candidates that ends as a card is unknown; it could be small. The judge prompt has never been run. Nothing was run on PostgreSQL, on Cloud Run or on a phone; the two screens are type-checked only. `deploy.sh` (the key as secret `vertex-credentials`, a Cloud Scheduler job every 30 minutes) passes `bash -n` and nothing more. `GET /admin/content/status` shows, per site, how many pages confirmed, which is the first place to look after the first day.
- **Open, the owner's.** (1) `start_date` of batch 0 is still 2026-10-15, so no word card shows before then unless the pipeline fills the earlier days first; if you move it, do so before the first tick, because a file item that wants a day a pipeline word already holds is skipped. (2) Cloud Scheduler has to be enabled once in the project. (3) The admin token sits in the scheduler job as a header, readable by anyone who can view jobs in the project.

## 2026-10-02 — The daily verses checked at the texts; invented lines replaced

How each line was checked is in brackets: *run*, *read* or *not verified*.

- **DECIDED (owner): the invented lines are replaced with real verses from many texts, not only the Gītā**, from a list proposed first and approved as proposed. **Where a source and the popular wording differ, the app shows the source** (Manusmṛti 2.121 reads आयुर्धर्मो, Mahābhārata 12.316.6 reads विद्यासमं तपः, Rāmāyaṇa 5.10.10 has the critical text's second half).
- **What was wrong** [*run*, letters of every seed line matched against GRETIL e-texts: both Gītā files, the critical Mahābhārata and Rāmāyaṇa, Manu, Hitopadeśa, Pañcatantra, Bhartṛhari, Mokṣopāya, five Upaniṣads, three subhāṣita anthologies]: of 51 Gītā-labelled entries, ten real verses carried the wrong number and five lines are not in the Gītā (the list of 2 October stands). Of the 45 others, 23 lines are in none of the 39 texts, including every line labelled Nītiśataka, Pañcatantra or Rāmāyaṇa that was flagged, and day 98; four were garbled forms of real verses. Day 7 is not in the Hitopadeśa and day 47 is not in the critical Rāmāyaṇa.
- **What changed in `backend/app/seeds/shlokas.py`.** 32 lines replaced: 30 new verses (Upaniṣads 5, Manusmṛti 4, Hitopadeśa 5, Pañcatantra 5, Bhartṛhari 4, Rāmāyaṇa 3, Mahābhārata 4) plus the real verse behind two garbled lines (days 76, 95); each new text matches its e-text letter for letter [*run*]. Ten Gītā numbers corrected; day 82 now has the verse's nominative endings. Day 60 written as the text joins it (हविर्ब्रह्माग्नौ), day 73 split (विद्या ददाति). Eleven other references now name the place the line was found (Muṇḍaka 3.1.6, Manu 8.15 and 10.63, Mahābhārata 1.11.12 and 13.7.22, Hitopadeśa, Mokṣopāya 2.16.19, Nītiśataka 86); days 7 and 47 say only "Subhāṣita". Glosses fixed: भूत in days 17 and 32 (it is not in either verse; कौन्तेय and भारत are), ऐकान्तिकस्य for एकान्तिकस्य, two words split wrongly (days 17, 84), seven wrong glosses; tags renamed to the app's taxonomy (IMP.2SG for IMPER.2SG, IMPF for PRET).
- **Existing databases are repaired in place** (`seed.py::_correct_seed_rows`, every boot): keyed on date plus exact Devanagari, a row with the seed's text takes the seed's reference and glosses; a row with a text the day used to carry (each entry's `was`) takes the new verse, keeping id and date, and loses its stored meaning (both translation columns, the `ask_answers` rows keyed by the old text, the graded-reading passage copied from it) unless the old text was the same verse misspelt. A row holding any other text, as `import_text --fix-existing` leaves it, is not touched. **The seeder now recognises a seeded day by its date alone**, so a corrected reference no longer adds a second row. Tests `tests/test_seed_corrections.py` (10) [*run*]; whole suite 1275 passed, 17 skipped [*run*]. On a scratch copy of the local `app.db`: 120 rows before and after, none added, removed or moved, 55 references, 35 texts and 52 breakdowns updated, eight invented lines gone from graded tier 2 and three from tier 3, a second boot changes nothing, the real file's checksum unchanged [*run*].
- **`_normalise_ref`: a trailing single number is a verse number** ("Nītiśataka 13", "Īśopaniṣad 1"), so such rows are no longer prefixed "Sūkti:" [*run*, test].
- **Not verified.** Days 8, 69, 79, 89 and 99 keep "Subhāṣita Ratna Bhāṇḍāgāra" and days 7 and 47 "Subhāṣita": well-known sayings whose place in a text was not found; the anthology was not opened. Muṇḍaka 3.1.6 is not on GRETIL and was read in the sanskritdocuments.org e-text (TITUS did not answer). The word glosses of the 33 rewritten entries were written in that session and no second person has read them; the Vidyut analyser, reading each word alone, agreed with 237 of their tags, and the 115 it read otherwise were checked by eye and are its single-word ambiguities (neuter nominative read as accusative, verbs read as nouns). Nothing ran on PostgreSQL or on a phone. What production holds is not known: a day already rewritten by `prod_import.py --fix-existing` keeps the verse the import gave it.
- **A book lists each verse once** (2026-10-03, at the owner's word). A numbered reference held by several rows (a seeded half-verse and the imported whole verse, e.g. Gītā 18.66, 2.47, Muṇḍaka 3.1.6, Īśopaniṣad 1) shows once, the fullest text kept (`oneVersePerRef` in `mobile/src/utils/verses.ts`); a reference with no number is never merged. `/canon` counts verses by the same key (`routers/canon.py::verse_key`), so shelf counts and contents agree. The daily verse is unchanged: each row still has its day. On a scratch copy of the local database every one of the 12 canon books listed each verse once and matched its `/canon` count [*run*, `verses.ts` compiled and run under node].
- **The reading page now shows the book that was opened.** `mobile/src/screens/Book.tsx` paged through every verse in date order whatever the book (its own comment said the book list was not wired yet), so tapping a verse in a book's contents opened a different one. It now takes its pages from `bookVerses` / `tierVerses`, the same lists the contents page shows [*run*: `tsc --noEmit`; *not verified*: nothing ran on a phone or in a browser].
- **Imported rows prefixed by the old reference rule get their reference back.** `_normalise_ref` takes "Sūkti: " off a reference that carries a number, so `_correct_reader_rows` repairs rows such as the 18 imported Īśā verses renamed "Sūkti: Īśopaniṣad N", and re-importing the Īśā by reference matches them again [*run*: tests; on the scratch copy all 18 repaired, no row added or removed]. Whole suite 1277 passed, 17 skipped [*run*].
- **Open, the owner's.** If production holds the full Gītā, a dry run of the Gītā import (`prod_import.py`, needs `results/imports/gita.payload.json`, not on this machine) will now offer the numbers the mislabelled rows used to occupy (12.4, 12.7, 2.19, 6.29, 9.31, 2.17, 14.22, 2.12, 13.8, 5.24).
