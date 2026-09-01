# Shabd — Backend Handover

**Audience:** an implementing coding agent (DeepSeek-V4-Flash / Hermes).
**Revised:** 2026-09-01 (night) — **P0–P5 complete, P6-0/P6-1 complete,
P6-2 complete, P6-3 complete, P7-2 running.**
**Companion doc:** [`UI_HANDOVER.md`](UI_HANDOVER.md) — client, motion, mascot.

---

## Status

| | |
|---|---|
| Backend tests | **308 passing** |
| Mobile typecheck | 0 errors |
| Alembic head | `a1b2c3d4e5f6` |
| Phases done | P0–P5, P6-0, P6-1, P6-2, P6-3 |
| **Content in the DB** | **37 challenges · 6 scenarios · 3 shlokas · 37 features** |
| Scenario review queue | 5 pending (`अभिवादनम्`·`परिवारः`·`भोजनम्`·`बाजारः`·`यात्रा`) |
| Sarvam grant spent to date | ~₹0.11 (authoring: 13 LLM calls) |

The authoring pipeline **now produces usable scenarios at volume.** The P6-3
gate fix (see below) took the controlled 5-brief run from **2/5 usable
scenarios to 5/5, gate pass rate 35/42 = 83.3%** — meeting its acceptance.
P7-2 resumes from here.

---

## Audit of 2026-09-01 (evening)

Five defects found by running the pipeline for the first time. **Four are
fixed; one is open as P6-3.** Every one of them was invisible to the test
suite, because each lived in a path the tests mock or a file the tests do not
use.

### Fixed — no API key ever reached any LLM

`app/evals/providers.py` resolved keys from `os.environ` only. Nothing exports
`.env` to the environment: pydantic-settings reads the file into the settings
object and stops there. So **every provider reported `configured=False`** —
authoring, `edge_router`, `explainer`, and the eval CLI alike.

The consequences were all silent, because each caller fails closed by design:

- `explainer` degraded to the authored gloss on every single request. The
  "explain" feature has never once run in this environment.
- `edge_router` fell through to the escape path every time.
- An authoring batch would report a 0% gate pass rate that actually meant
  "no key" — and you would have blamed the prompt.

Fixed with `_key_from_settings()` in `providers.py`, consulted after
`os.environ`. pydantic-settings runs `env_prefix=""`, so the lowercased env
var name *is* the settings field name and one helper covers every provider.
**Do not re-add per-caller key plumbing** — the fallback is the mechanism.

### Fixed — two databases, and the app was using the wrong one

`start_mob.ps1` launched uvicorn with `-WorkingDirectory $root` plus
`--app-dir backend`. `--app-dir` sets the *import* path, not the working
directory, so `db_path="app.db"` resolved against the repo root and created a
**second** database at `D:\Projects\Shabd\app.db`.

That DB then sat 7 migrations behind head, holding a file lock, with all the
real content in it — while `backend/app.db` was at head, empty, and missing
its `attempts` table. Every P3/P4/P5 feature (pronunciation attempts, daily
activity, usage events) pointed at a schema without their tables.

Fixed: uvicorn now runs with `-WorkingDirectory backend/`, `--app-dir` dropped
as redundant. Stale root DB and the two long-running servers holding it were
deleted. `backend/app.db` rebuilt from migrations + seeds. This is now
invariant §2.10.

### Fixed — the draft parser turned malformed responses into silence

`_extract_json_array` scanned for the first `[` and last `]`. When Sarvam
returned a single bare turn object instead of an array — measured at **3 of 5
briefs** — that scan found the *inner* `"features"` array, normalized zero
dicts out of its strings, and returned `[]`. No exception. Downstream that was
indistinguishable from "this brief produced nothing."

Fixed: parse the whole body first (`json_mode=True` guarantees valid JSON),
wrap a bare object in a list, and **raise when a non-empty parse yields zero
usable turns.** Generalised as invariant §2.11.

### Fixed — the cost estimator was wrong by ~20x

`scripts/author_batch.py` priced TTS at `₹0.0001/char`. Bulbul v3 bills
**₹30/10K chars = ₹0.003** (`architecture.md` §4.1) — 30x under. It also
counted 2 LLM calls per brief for "one draft pass, one gate pass", but
`gate_drafts` is pure Vidyut and costs nothing, so the true figure is 1.

Corrected, and `CHARS_PER_TURN` is now **measured** (37, from the 30 speakable
nodes of the seeded scenario) rather than guessed. Both batch scripts also
force UTF-8 on stdout — a Windows cp1252 console cannot encode `₹` and the
estimate used to traceback halfway through printing.

**`--render` is a stub.** It renders nothing (`author_batch.py`, `_run_brief`).
Audio is a separate `scripts.render_sarvam` step. The estimate now says so.

### OPEN — the gate discards correct Sanskrit. This is P6-3.

See P6-3 below. This is the one that matters.

---

## 1. Repo map

```
D:\Projects\Shabd\
├── architecture.md          the design bible. §-numbers below refer to it.
├── DECISIONS.md             dated decision log. Append, never rewrite.
├── HANDOVER.md              this file — backend
├── UI_HANDOVER.md           client / motion / mascot
├── specs/                   5 feature specs
├── frontend/                static API test console (start_ui.ps1). Not dead.
├── backend/
│   ├── app/
│   │   ├── main.py          app factory, router registration, lifespan
│   │   ├── config.py        pydantic-settings. ALL new config goes here.
│   │   ├── db.py            engine, get_db, init_db, schema-drift guard
│   │   ├── models.py        SQLAlchemy models
│   │   ├── schemas.py       Pydantic request/response
│   │   ├── auth.py          require_learner, require_admin
│   │   ├── adaptive.py      SM-2 mastery + selection            [FROZEN]
│   │   ├── grading/
│   │   │   ├── analyzer.py  Vidyut morphology                   [FROZEN]
│   │   │   └── engine.py    variant grading                     [FROZEN]
│   │   ├── evals/providers.py  LLM transport + key resolution
│   │   ├── routers/         health auth me challenges attempts shlokas
│   │   │                    grammar admin pipeline speech conversation
│   │   │                    authoring progress pronunciation
│   │   ├── services/        sarvam turn_loop authoring edge_router
│   │   │                    explainer meta_intent session_store
│   │   │                    quota metrics pronunciation localtime storage
│   │   └── seeds/           challenges(37) dialogue(1) shlokas(3)
│   │                        varnamala features briefs(50)
│   ├── vidyut-data/         78 MB, gitignored, auto-downloaded.
│   │   └── prakriya/        219 KB — 5,152 sūtras. See P9. UNUSED TODAY.
│   ├── migrations/versions/ head: a1b2c3d4e5f6
│   ├── results/authoring/   per-brief authoring stats (P7)
│   ├── app/.authoring-cache/  draft cache keyed by brief hash
│   ├── tests/               22 modules, 300 tests
│   └── scripts/             author_batch, challenge_batch, render_sarvam, benches
└── mobile/                  Expo + React Native — see UI_HANDOVER.md
```

Note: `.gitignore` lists `backend/.authoring-cache/`, but `_CACHE_DIR` resolves
to `backend/app/.authoring-cache/`. The cache is **not actually ignored.** Fix
the pattern or move the directory.

---

## 2. Invariants — never violate these

### 2.1 Frozen modules

**Do not change the semantics of** `app/grading/analyzer.py`,
`app/grading/engine.py`, or `app/adaptive.py`. They encode validated
linguistic behaviour and are covered by most of the test suite. Call them from
new code; do not rewrite their logic, rename their public functions, or
"simplify" them. If a task seems to require it, **stop and escalate** (§6).

### 2.2 The abstention principle

When the system is not confident the verdict is `"unsure"` and **nothing bad
happens to the learner**: no mastery decay, no streak reset, no ratio
decrease, no XP penalty. See `adaptive.py::update_mastery` (early-returns on
`unsure`/`abstained`) and `update_streak`.

A noisy ASR result is not evidence the learner was wrong. **Never introduce a
code path that penalizes on uncertainty** — backend or UI.

### 2.3 The two-ratio ownership rule

- `Learner.sanskrit_ratio_setting` — **the user owns this.** Only `PATCH /me`
  writes it. It is a *ceiling*.
- `Learner.sanskrit_ratio` — **the system owns this.** Only `adaptive.py`
  writes it, and it may never exceed the ceiling.

One writer per value.

### 2.4 SQLAlchemy 2.0 only

`Model.query` does not exist. Use `db.query(Model)`. Raw SQL strings must be
wrapped in `sa.text(...)` — a bare string raises `ArgumentError` at runtime,
not at import.

### 2.5 Migrations, never `create_all`

`init_db` runs Alembic to head then runs a **schema drift check**. Add a model
or column without a migration and **startup raises `RuntimeError`** and every
test fails. Chain from the current head (`a1b2c3d4e5f6`); hand-write
`upgrade()`/`downgrade()`.

### 2.6 Model routing

- Drafting / edge routing / explain: **`sarvam-105b-conversations`** only.
- **Never `sarvam-105b`** (the reasoning variant) — it dead-ends, measured.
- Dual-number content: Sarvam false-accuses ~50%. **Route dual-bearing content
  to Gemini**, reached via OpenRouter (`openrouter:google/gemini-2.5-flash`,
  owner decision 2026-09-01 — one key we already hold rather than a second
  vendor account). Pinned to 2.5-flash because that is the model the §4.3
  evals measured. OpenRouter also serves 3.x flash; upgrading is one line and
  **wants a re-run of the dual eval, not an assumption.**

### 2.7 No local models, ever

API-only. Never `import torch`/`transformers`/`sentencepiece`, never add a
model download step.

**Vidyut is not a model** — it is a rule-based Rust library shipping a data
file, already a dependency, and running it locally is correct and free. §2.7
constrains *inference*, not linguistics. P9 depends on this distinction.

### 2.8 Learner-local time, never server time

Any date a learner *experiences* — daily goal, activity row, streak boundary,
notification time — resolves in **their** timezone via
`app/services/localtime.py`. Never `datetime.now(timezone.utc).strftime(...)`
for a user-facing day. Use `localtime.learner_today(learner)`.

### 2.9 Voice and LLM calls cost real money

Every TTS character, ASR second, and LLM token bills a prepaid grant. Any new
third-party call goes through `quota.check_and_consume` **before** the network
request.

### 2.10 CWD is the schema — run from `backend/`

`settings.db_path` defaults to the relative `"app.db"`, and `.env` resolves
relative too. **Every backend command runs with `backend/` as the working
directory.** `--app-dir` is not a substitute: it sets the import path and
leaves CWD alone, which is exactly how a second, silently-diverging database
came to exist and take 7 migrations of drift with it.

If you add a launcher, script, CI step, or service definition, set the working
directory explicitly. Never pass `--app-dir` instead.

### 2.11 A silent empty result is a bug

Any parser, extractor, or adapter that turns a malformed upstream response
into an empty-but-successful value is broken, however tidy it looks. Empty and
malformed must be **distinguishable to the caller**, because they demand
different responses: one is data, the other is a retry or an alert.

`_extract_json_array` violated this and cost a batch run and an afternoon of
misattributed blame. When you cannot produce a usable result from a non-empty
input, **raise.**

---

## 3. Environment and the verification loop

Windows. PowerShell primary; a Bash tool is also available.

**PowerShell 5.1 has no `&&`.** `cd backend && pytest` is a parser error, not
a chaining idiom. Use two commands, or `;`.

**Set UTF-8 before any script that prints `₹` or Devanagari.** A cp1252
console raises `UnicodeEncodeError` mid-output. The batch scripts now
self-configure; ad-hoc scripts do not.

```powershell
cd backend
$env:PYTHONIOENCODING='utf-8'

# Backend — baseline 300
./.venv/Scripts/python.exe -m pytest -q

# Server. Note the working directory (§2.10) and port 8001, not 8000.
./.venv/Scripts/python.exe -m uvicorn app.main:app --port 8001

# Mobile — baseline 0 errors
cd ../mobile ; npx tsc --noEmit

# New migration (hand-write upgrade/downgrade)
./.venv/Scripts/python.exe -m alembic revision -m "description"
```

Five `UserWarning`s about a field named `register` are pre-existing; ignore.

**Run all three after every task.** If a count drops, you broke something.
Never disable, skip, or weaken an existing test to go green.

### The tests do not cover the money paths

300 passing told us nothing about four of the five defects above, because
`tests/conftest.py` builds a **fresh temp DB** and every provider is mocked.
The suite proves logic, not wiring. **When you touch a path that spends money
or talks to a vendor, verify it live once, cheaply, before trusting it.** One
smoke call costs a fraction of a paisa and would have caught all of this.

---

## 4. What comes next

| Phase | Theme | Gate |
|---|---|---|
| **P6-2, P6-3** | Commit the client work; fix the authoring prompt | none — do these first |
| **P7** | **Content at volume** — the biggest lever in the project | P6-3 |
| **P9** | **Pāṇini derivation** — the differentiator you already own | none, but do P7 first |
| **P8** | First real users | P7 |
| **P10** | Maths in Sanskrit | P7, P9 |

### Explicitly NOT next: RAG

Retrieval is the most technically appealing next step and close to the least
valuable right now. `architecture.md` §4.6 already calls it "smaller than it
looks," and §15 lists its quality as unmeasured. **You cannot tune quality
against 3 scenarios of content and 0 users telling you what is wrong.**

P9 sharpens this further: the single best use of retrieval was going to be
grammatical explanation, and `vidyut.prakriya` answers that **exactly,
offline, for free** — no embedding, no index, no hallucination. Retrieval's
remaining scope is smaller than it was this morning. **Do not start RAG work
without an explicit owner decision.**

---

# PHASE P6 — Close the remaining gaps

## P6-0 · Learner-local day boundary — DONE 2026-09-01

`app/services/localtime.py` + `Learner.timezone` + migration `a1b2c3d4e5f6` +
`tzdata` in requirements. 21 tests. Now invariant §2.8.

## P6-1 · Meter the LLM calls — DONE 2026-09-01

Suite reached the stated acceptance of 300.

**Its premise was wrong and the work should be re-read in that light.** The
task said learners could "drain the grant through the router" — but
`edge_router` had no API key and never reached Sarvam at all (see the audit).
The metering is still correct and still needed; it was guarding a door that
was already bricked shut. **Now that keys resolve, that path is live for the
first time** — so the quota it enforces is about to start mattering. Verify
the refund-on-502 path with a real failure injection before trusting it.

## P6-2 · Commit the client work — OPEN

**Why:** ~2,054 lines across 31 modified and 8 new files sit in the working
tree — `motion.ts`, `useReducedMotion`, `Skeleton`, `Confetti`, `SessionShell`,
`Path`, `SessionComplete`, `MouthDiagram`, plus the graphics stack in
`package.json`. This is the exact exposure P0-1 existed to remove.

**Blocked by:** nothing. **Effort:** S

Commit in logical units by UI task ID (`feat(U0-3): motion token system`) so
the client history stays readable against `UI_HANDOVER.md`. Confirm
`npx tsc --noEmit` is still 0 before each.

**Do not:** sweep the whole tree into one commit.

## P6-3 · The gate discards correct Sanskrit — OPEN, blocks P7

**Why:** the first live authoring run produced this:

| Brief | Turns drafted | Gate passed |
|---|---|---|
| greeting-a | 8 | 6 |
| market-a | 8 | 5 |
| family-a | 1 | 0 |
| food-a | 1 | 0 |
| travel-a | 1 | 0 |

Two independent failures.

**(a) The model returns 1 turn instead of 8, ~60% of the time.** The prompt
says "exactly {n} turn objects" and Sarvam intermittently ignores it. The
parser now recovers the single object instead of silently dropping it (§2.11),
so this is visible — but a 1-turn scenario is not a scenario.

**(b) The gate rejects grammatically correct Sanskrit over invented feature
labels.** This is the bigger one. Measured rejections:

```
अहं गृहं गच्छामि।        rejected: claimed features not derivable: ['PRES.1SG.ACT']
मम परिवारः लघुः अस्ति।   rejected: ['ADJ.SG', 'COP.PRES.1SG', 'PRES.1SG']
                         also seen: ['PERF.1SG'], ['PERF.3SG']
```

**`अहं गृहं गच्छामि।` is perfect Sanskrit.** गच्छामि *is* present first
singular. It was discarded because the model labelled it `PRES.1SG.ACT` — an
`.ACT` suffix that does not exist in the 37-feature taxonomy. `ADJ.SG`,
`COP.PRES.1SG`, `PERF.1SG` are all invented too.

**Root cause:** `_DRAFT_SYSTEM_PROMPT` is formatted with `register`, `topic`,
`ratio_min/max`, `bridge_lang`, `dual_rule` — and **never `target_features`**,
though every brief in `seeds/briefs.py` carries them. The model is guessing at
your feature vocabulary from two examples in the prompt text.

**Blocked by:** nothing. **Effort:** S

**Touch:** `app/services/authoring.py`, `tests/test_authoring.py`

**Steps**

1. Pass the brief's `target_features` into the prompt as a **closed set**:
   "Use ONLY these feature ids: [...]. Never invent one. Only list a feature
   that is morphologically present in `expected_learner_sanskrit`."
2. Consider validating claimed features against the closed set **before** the
   Vidyut gate, so a label error is reported as a label error rather than as a
   grammar failure. The current message ("claimed features not derivable")
   reads as though the Sanskrit is wrong. It usually is not.
3. Retry once when a draft returns fewer turns than requested — cheap
   (₹0.0055) against the cost of a wasted brief.
4. Re-run **the same 5 briefs** with `--replace` and compare pass rates. This
   is a controlled before/after; do not change briefs and prompt at once.

**Acceptance:** the same 5 briefs, ≥4 producing scenarios, ≥80% of drafted
turns passing the gate. Suite ≥300.

**Do not:** loosen the Vidyut gate to raise the pass rate. The gate is correct
and it is the only thing standing between learners and ungrammatical Sanskrit.
The prompt is what is wrong.

---

# PHASE P7 — Content at volume

> **Still the single biggest lever available to the project.** The machine now
> demonstrably works; it produced 2 usable scenarios on its first run.

## P7-1 · Dry-run and report the cost — DONE 2026-09-01

Measured, with the estimator corrected:

```
author_batch    50 briefs · 400 turns · 50 LLM calls   → ₹0.27
                ~14,800 TTS chars (downstream render)  → ~₹44
challenge_batch ~500 challenges                        → ~₹2.50
                                              TOTAL    → ~₹47
```

**Owner approved the spend, 2026-09-01**, against the ₹25,000 Sarvam grant —
0.2% of it. The gate on P7 was never really about money; it is about **gate
pass rate**, which is what P6-3 exists to fix.

## P7-2 · Author the scenarios — STARTED, PAUSED

**Blocked by:** P6-3.

First batch of 5 run live 2026-09-01: 2 scenarios created (22 nodes, 31 edges),
both `review_status="pending"`. 8 LLM calls, ~₹0.05.

Continue in `--limit 5` batches, checking gate pass rate between them. A
collapsing pass rate means the briefs or the prompt are wrong, and finding
that out after 5 briefs costs a tenth of finding it out after 50. **That is
not hypothetical any more — it is what happened.** Per-brief stats land in
`backend/results/authoring/`.

Re-authoring an existing title needs `replace=True`; without it the run
refuses the brief. That refusal is correct — do not remove it.

## P7-3 · Review pass

**Blocked by:** P7-2. Two scenarios are already waiting.

Authored scenarios land `review_status="pending"` and are invisible to
learners until approved. Work `GET /authoring/review` and approve or reject.
**Do not auto-approve on a high gate score:** the Vidyut gate checks grammar, a
human checks whether the line is worth saying.

## P7-4 · Challenges at volume

**Blocked by:** P7-3. Target ~500 challenges, same review gate.
`accepted_parses` must be generated by analyzing the target with
`analyze_sentence` + `feature_set_variants` — never hand-written, or free word
order silently breaks.

## P7-5 · Re-point the path at real content

**Blocked by:** P7-4. `UI_HANDOVER.md` U3-1 builds the journey map against the
feature bands in `seeds/briefs.py`. Once real scenarios exist, path nodes
should reflect what is actually authored and approved.

---

# PHASE P8 — First users

**Blocked by:** P7. Roughly 10 people.

- **P8-1** — a place to *look at* the two metrics. `GET /admin/metrics`
  returns escape rate and live-vs-prerendered share and nothing renders them.
- **P8-2** — seed `source="prerendered"` on `UsageEvent` once P7 renders
  audio. Nothing writes that value today, so `tts_share` reports 100% live
  forever and silently tells you nothing.
- **P8-3** — crash and error reporting before strangers touch it.
- **P8-4** — the platform decisions left open in P5: host, object store,
  backup policy. All owner calls (§6).

---

# PHASE P9 — The Pāṇini derivation engine

> **You already own this and it is not switched on.** `vidyut.prakriya` is
> installed, its data is on disk, and nothing in the codebase imports it.

## Why this is the differentiator

Duolingo cannot tell a learner *why* भवति is भवति. Neither can Airlearn, and
neither can an LLM without hallucinating. **A Pāṇinian derivation is not a
generated explanation — it is a proof**, and you can produce one for tens of
thousands of forms, offline, deterministically, at ₹0.

Verified live on this machine, 2026-09-01:

```
भू → भवति (20 steps)              deva + टा → देवेन (10 steps)
  3.1.68  कर्तरि शप्                  7.1.12  टाङसिङसामिनात्स्याः
  7.3.84  सार्वधातुकार्धधातुकयोः       6.1.87  आद्गुणः
  6.1.78  एचोऽयवायावः                8.4.68  अ अ
```

`Data.load_sutras()` returns **5,152 sūtras with their text**. The prakriya
dataset is **219 KB** — small enough to ship in the app bundle. `vidyut.lipi`
(already used in `analyzer.py`) converts the SLP1 to Devanagari.

**This is not a violation of §2.7.** Vidyut is a rule-based library with a data
file, already a dependency. §2.7 bans *inference*, not linguistics.

## What it also unlocks, already on the roadmap

- **`UI_HANDOVER.md` U4-5 (sandhi visualisation)** — name the actual rule
  (`6.1.87 आद्गुणः`) instead of hand-authoring explanations.
- **U4-4 (śloka metre)** — `vidyut.chandas` exposes `Akshara`, `Vrtta`,
  `Match`. The syllable-weight rhythm strip is free.
- **"Why was I wrong?"** — today an LLM call that `DECISIONS.md` records as
  false-accusing on dual-bearing content ~50% of the time. A derivation is not
  a guess. Cheaper *and* correct.

## P9-1 · The derivation service

**Blocked by:** nothing. **Effort:** M

**Touch:** create `app/services/prakriya.py`, `tests/test_prakriya.py`

1. Wrap `Vyakarana().derive()` for both `Pada.Tinanta` (verbs) and
   `Pada.Subanta` (nouns). Return `{result, steps: [{code, sutra_text,
   sutra_devanagari, result}]}`.
2. Load the sūtra corpus once at module level via `Data(...).load_sutras()`
   and index by code. 5,152 entries is nothing; do not query it per step.
3. Transliterate SLP1 → Devanagari with `analyzer.py`'s existing helpers.
   **Do not add a second transliteration path.**
4. Degrade like `localtime` does: an underivable form returns an empty step
   list, never raises. A grammar sidebar must not 500 a lesson.

**Tests:** भवति and देवेन step counts and sūtra codes pinned; an unknown dhātu
returns empty rather than raising; sūtra text resolves to Devanagari; **no
network.**

## P9-2 · `GET /grammar/derive`

**Blocked by:** P9-1. **Effort:** S

Add to the existing `routers/grammar.py`. Query by dhātu + lakāra + puruṣa +
vacana, or by prātipadika + liṅga + vibhakti + vacana. **No quota needed** —
this is local computation, not a vendor call. Say so in a comment so nobody
"fixes" it later by adding metering.

## P9-3 · Wire it into the wrong-answer moment

**Blocked by:** P9-2. **Effort:** M

When `grade_attempt` returns a case/number/person mismatch, the correct form's
derivation is computable. Show it. Keep the LLM explanation for *meaning*;
grammar comes from the derivation.

§2.2 still binds: a derivation is an explanation, never an accusation, and it
must never appear on an `unsure` verdict.

## P9-4 · The sūtra path (content model)

**Blocked by:** P9-3, and an owner decision on scope. **Effort:** L

The Aṣṭādhyāyī as a second learning track alongside the conversation track.
**Escalate before building** — this is a curriculum design question, not an
engineering one. 5,152 sūtras is not a syllabus; the first 100 in teaching
order might be.

## P9-5 · Client surfaces → `UI_HANDOVER.md` U7

The derivation viewer and sūtra path belong in the UI doc as **phase U7**, and
are DeepSeek's lane. The seam is the `GET /grammar/derive` response shape from
P9-2 — build the client against that contract, not against `vidyut` directly.
**The mobile app must never import a Sanskrit library**; the backend derives,
the client renders.

---

# PHASE P10 — Maths in Sanskrit

**Blocked by:** P7 and P9. **Do not start before the first course has content.**

Shipping a second course while the first has twenty minutes of material is how
you end up with two half-products. This phase is written down now so it is
ready, not so it is next.

## Why it fits

Līlāvatī (Bhāskara II, 1150 CE) and the Āryabhaṭīya are **public domain,
finite, and famous** — content acquisition rather than authoring, at ₹0
marginal cost. Sanskrit number words are nouns: they decline, so the existing
grading stack grades them with no new code.

## P10-1 · Numeral coverage audit — do this first

**Effort:** S

The "it just works" claim is **half true, and it was measured**:

```
द्वौ बालकौ गच्छतः     confident=True   dva NOM.DU · bālaka NOM.DU · √gam PRES.3DU   ok
त्रीणि फलानि सन्ति    confident=False  (त्रीणि unresolved)                          fail
पञ्च अश्वाः धावन्ति   confident=True   pañci VOC.SG  <- wrong parse                 fail
```

Declinable low numerals work. Higher numerals do not, and `पञ्च` mis-parses
confidently as a vocative — **the dangerous failure mode**, because §2.2 only
protects the learner when the analyzer *knows* it is unsure.

Audit 1–100 plus the common Līlāvatī vocabulary against `analyze_sentence`
before authoring a single problem. Report a coverage table. **If confident
mis-parses are common, this phase stops** and becomes an analyzer question —
which is a §2.1 escalation, not a fix you make.

## P10-2 · Numeral systems as content

**Blocked by:** P10-1.

Kaṭapayādi and Bhūtasaṅkhyā are genuinely delightful and genuinely Sanskrit:
numbers encoded as words, and words as numbers. They fit the existing
`Challenge` model unchanged.

## P10-3 · Līlāvatī problems

**Blocked by:** P10-2. Verse word-problems, each a `Challenge` whose target is
the Sanskrit answer. The verse is the prompt; the arithmetic is the exercise;
the grammar is graded by the stack you already have.

---

## 5. Definition of done

1. The task's stated **Acceptance** passes.
2. `./.venv/Scripts/python.exe -m pytest -q` (from `backend/`) at or above the
   stated count.
3. `cd mobile ; npx tsc --noEmit` → **0 errors**.
4. New behaviour has tests. New tests do not hit the network.
5. **If the task touches a vendor path, one live smoke call proves it** — the
   suite mocks every provider and will not catch a wiring break (§3).
6. No file outside the task's **Touch** list modified.
7. Committed with the task ID in the message.
8. A changed product rule gets a dated entry in `DECISIONS.md`.

---

## 6. When to stop and escalate

- **Any spend of the Sarvam grant beyond an approved batch.** P7's ~₹47 is
  approved; a new order of magnitude is a new decision.
- **Any task that seems to require editing** `analyzer.py`, `engine.py`, or
  `adaptive.py` semantics (§2.1). P10-1 may surface one of these.
- **RAG or retrieval work** — see §4. Smaller than it was; still not yours.
- **P9-4, the sūtra curriculum** — a pedagogy decision, not an engineering one.
- **Platform choices** — hosting, object storage, payments, privacy.
- **Store submission and Apple/Google sign-in.**
- **Anything that would make an `unsure` verdict penalize a learner** (§2.2).
- **A test you cannot make pass without weakening it.** Report it instead.
- **Loosening the Vidyut gate to raise a pass rate** (P6-3).

---

## 7. Quick reference

```
All backend commands run from backend/ (§2.10), with UTF-8 (§3).
PowerShell 5.1 has no &&.

Backend tests (baseline 300):
  cd backend
  ./.venv/Scripts/python.exe -m pytest -q

Mobile typecheck (baseline 0 errors):
  cd mobile ; npx tsc --noEmit

Content cost estimate (SAFE — spends nothing):
  ./.venv/Scripts/python.exe -m scripts.author_batch --dry-run

Author a batch (SPENDS — owner-approved to ~₹47 total):
  ./.venv/Scripts/python.exe -m scripts.author_batch --live --limit 5

Alembic head:  a1b2c3d4e5f6
Order:         P6-2, P6-3 → P7 → P9 → P8 → P10
Not yet:       RAG
```
