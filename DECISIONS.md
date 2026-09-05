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
- **"Vedic Mathematics" is not shippable as ancient.** The sixteen-sūtra system is Bharati Krishna Tirtha's, published 1965, with unsubstantiated Vedic provenance. Generalised in §6 to any unprovable provenance claim — including "world's oldest language" and the "NASA declared Sanskrit best for computers" line, a documented misreading of Briggs (1985). The app is about to start showing sūtra numbers as proof; an unprovable claim elsewhere discredits the drawer three screens away.
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
