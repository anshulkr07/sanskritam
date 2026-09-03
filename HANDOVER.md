# Shabd — Backend Handover

**Audience:** an implementing coding agent (DeepSeek-V4-Flash / Hermes).
**Revised:** 2026-09-02 — **P0–P5 complete, P6-0/P6-1 complete,
P6-2 complete, P6-3 complete, P7-2 running. P11 added; P9/P10 amended.**
**Companion doc:** [`UI_HANDOVER.md`](UI_HANDOVER.md) — client, motion, mascot.
**Research doc:** [`shabd-expansion.html`](shabd-expansion.html) — the market
and product research P9/P10/P11 below are derived from. Read it once before
starting P11; it explains *why* these surfaces and not others. It does not
contain tasks — this file does.

---

## Status

| | |
|---|---|
| Backend tests | **310 collected** (was recorded as 308 / 300 in two places — both stale, corrected 2026-09-02) |
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
│   │   ├── prakriya/        219 KB — 5,152 sūtra entries. See P9. UNUSED.
│   │   ├── chandas/         meters.tsv — 145 vṛttas, 7 jātis. UNUSED. P11-1.
│   │   ├── sandhi/          rules.csv. UNUSED. P11-2.
│   │   ├── kosha/           used by analyzer.py
│   │   └── cheda/           UNUSED except scripts/diag_chedaka_seeds.py
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

# Backend — baseline 310 (measured 2026-09-02 via --collect-only)
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
| **P11** | **The other three idle engines** — chandas, sandhi, and the surfaces they unlock | P9-1 |
| **P8** | First real users | P7 |
| **P12** | The daily word service — the growth loop's backend | P11-4 |
| **P10** | Maths in Sanskrit | P7, P9, P11-1 |
| **P13** | The return loop — notifications. Nothing exists today. | P8 |
| **P14** | Entitlements and subscription — ⚠ owner-gated throughout | P8 + pricing decision |
| **P15** | Async social — the verse chain | P7, P13, P14 |
| **P16** | `अवधानम्` — the boss mode | P11, P15 |

### ⚠ Before any of this: the client cannot reach what it already has

Audited 2026-09-02. **653 lines of finished screens are unreachable** —
`Path.tsx` (339, the journey map, not even imported), `WordOrder.tsx` (161) and
`Paradigm.tsx` (153) — and the whole mobile app contains **one**
`navigate()` call. The owner has also decided the navigation shape: **six
bottom tabs plus a left drawer**, with Śloka and Varṇamālā demoted from tabs to
Home cards.

All of that is client work and lives in **`UI_HANDOVER.md` phase U8**
(U8-0 … U8-6). **U8-0 is one hour and roughly triples the reachable app; it
should be picked up before anything else in either document.** It is listed
here because a backend agent reading only this file would otherwise build P12
against a client that cannot show it.

### What changed on 2026-09-02, and why P11 exists

Two findings from `shabd-expansion.html`. Both are recorded here because they
change task priority, not because you need to act on the market analysis.

**1. The audit found three more idle engines, not one.** P9 was written as
though `vidyut.prakriya` were the only unused capability. It is not. Measured
on this machine 2026-09-02, `vidyut` 0.4.0 with all data present:

```
lipi      used (grading/analyzer.py)     prakriya  IDLE  5,152 entries / 5,056 unique codes
kosha     used (analyzer)                chandas   IDLE  145 vṛttas, 7 jātis
                                         sandhi    IDLE
                                         cheda     IDLE (one diagnostic script)
```

Everything in P11 is **switch-on work at ₹0 marginal cost** — local
computation, no vendor call, no quota. That is a different class of task from
P7 and should not compete with it for the content budget.

**2. "Verified, not generated" became a market position, and you can back it.**
Duolingo's AI-first turn drew a public quality backlash through 2025–26;
Airlearn leans heavily on generated assets too. Sanskrit is the one major
language where grammar is machine-checkable, and the P6-3 gate already
measures 83.3%. This is a **product** claim with an engineering consequence:
anywhere the app asserts a grammatical fact, it should be able to show the
derivation that proves it. See P9-3 and U7-1 — **and note that this does not
mean removing the LLM. It means giving the LLM a job it is good at.**

**A third finding is recorded but is not a task.** CBSE made a third language
compulsory from Class 6 in 2026, and Sanskrit is the default option in most
English-medium schools, with textbooks not yet published. That creates a
school-exam segment whose single hardest object — śabdarūpa / dhāturūpa tables
— is exactly what `prakriya` generates deterministically (P11-5). **The policy
is in litigation; do not let it drive architecture.** Build P11-5 because P9
hands it to you anyway.

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
   ⚠ **`load_sutras()` returns 5,152 entries but only 5,056 unique codes**
   (measured 2026-09-02). A plain `{s.code: s.text for s in ...}` silently
   drops 96 of them and the loss is invisible — the lookup just returns the
   last writer's text. Build `dict[str, list[Sutra]]`, or assert the count and
   log the collisions. Do not discover this later from a wrong sūtra text in a
   learner-facing drawer.

   **Live API shapes, verified 2026-09-02** — the obvious guesses are wrong:
   - `Vyakarana().derive()` takes **one positional args object**, not keyword
     arguments: `derive(Pada.Tinanta(dhatu=..., prayoga=..., lakara=...,
     purusha=..., vacana=...))`. `derive(dhatu=..., lakara=...)` raises.
   - It returns a **list** of prakriyās; take `[0]` and handle the empty list.
   - Each step exposes `.code` and `.result` (a list of strings), not a
     single string.
   - Confirmed end-to-end: `भू` → `भवति`, **20 steps**, first step `1.3.1
     भूवादयो धातवः`, last `6.1.78 एचोऽयवायावः`. Pin exactly this in tests.
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
derivation is computable. Show it.

### ⚠ The LLM stays. This is an addition, not a replacement.

Owner instruction, 2026-09-02, and the most likely thing to get wrong here:
**do not delete, bypass, or deprecate `services/explainer.py`.** If any
research or summary you have been given says the derivation "replaces" the LLM
explanation, that phrasing is wrong and this paragraph overrides it.

The two answer different questions and the learner needs both:

| Question | Answered by | Why |
|---|---|---|
| *What form should this be, and why that ending?* | **`prakriya`** | Deterministic, offline, ₹0, checkable. Never guesses. |
| *What does this sentence mean? Why is this the natural thing to say? What is the nuance?* | **the LLM** (`explainer.py`) | Meaning, register and context are not derivable from grammar rules. `prakriya` has nothing to say about them. |

So the wrong-answer response carries **both fields**. Neither is optional, and
neither may be silently dropped when the other is unavailable:

- Derivation missing (underivable form) → still return the LLM gloss.
- LLM unavailable (no key, quota, timeout) → still return the derivation, and
  fall back to the authored gloss exactly as `explainer.py` already does.
- Both missing → the existing authored-gloss path. Unchanged.

What *does* change: the LLM is **no longer asked to adjudicate grammar.**
`DECISIONS.md` records it false-accusing on dual-bearing content roughly half
the time — that is the behaviour being retired, not the model. Move the
grammatical claim into the derivation and keep the model doing meaning, where
it is good and where nothing else can substitute for it.

§2.2 still binds: a derivation is an explanation, never an accusation, and it
must never appear on an `unsure` verdict. The same is true of the gloss.

**Tests:** both fields present on a case-mismatch verdict; derivation absent +
gloss present when the form is underivable; gloss absent + derivation present
when the provider is unconfigured; **neither present on `unsure`.**

## P9-4 · The sūtra path (content model)

**Blocked by:** P9-3, and an owner decision on scope. **Effort:** L

The Aṣṭādhyāyī as a second learning track alongside the conversation track.
**Escalate before building** — this is a curriculum design question, not an
engineering one. 5,152 sūtras is not a syllabus; the first 100 in teaching
order might be.

## P9-5 · Client surfaces → `UI_HANDOVER.md` U7

**U7 now exists and is written.** The derivation viewer, the *animated*
derivation (owner request, 2026-09-02), the sandhi collision, the scansion
strip and the sūtra path are specified there as U7-1 … U7-5, and are
DeepSeek's lane.

The seam is the `GET /grammar/derive` response shape from P9-2 — build the
client against that contract, not against `vidyut` directly. **The mobile app
must never import a Sanskrit library**; the backend derives, the client
renders.

Two consequences for *this* file, because they constrain the response shape:

1. **The animation needs the steps to be individually meaningful.** U7-1 plays
   the derivation one sūtra at a time, highlighting the segment that changed.
   So every step must carry `code`, `sutra_devanagari`, and `result` **as its
   own complete form** — not a diff, and not only the final output. The shape
   in P9-1 already does this; do not "optimise" it into a compressed diff.
2. **Send the step count in the envelope.** `{result, step_count, steps[]}`.
   The client shows *20 steps* in the header before the animation runs, and
   should not have to count an array to render a header.

---

# PHASE P10 — Maths in Sanskrit

**Blocked by:** P7, P9, and now **P11-1**. **Do not start before the first
course has content.**

Shipping a second course while the first has twenty minutes of material is how
you end up with two half-products. This phase is written down now so it is
ready, not so it is next.

## Why it fits

Līlāvatī (Bhāskara II, 1150 CE) and the Āryabhaṭīya are **public domain,
finite, and famous** — content acquisition rather than authoring, at ₹0
marginal cost. Sanskrit number words are nouns: they decline, so the existing
grading stack grades them with no new code.

### Amendment 2026-09-02 — lead with Piṅgala, not Bhāskara

Piṅgala's *Chandaḥśāstra* (c. 3rd–2nd c. BCE) describes prosody as an
exhaustive enumeration of two states, light and heavy — a binary encoding —
and contains the *meru-prastāra* (the triangle later named for Pascal, made
explicit in Halāyudha's 10th-century commentary). Its *mātrāmeru* sequence is
the Fibonacci sequence.

**Why this reorders the phase:** it rides on P11-1, which you will already
have built. A learner who has played the scansion surface has been
manipulating binary strings for a week without being told so. Revealing that
costs one screen and no new content pipeline, whereas Līlāvatī costs a
numeral-coverage audit and an authoring pass. Piṅgala first, Līlāvatī second.

This is why P10 now lists **P11-1** as a gate.

### ⛔ Do not ship "Vedic Mathematics"

The sixteen-sūtra system is Bharati Krishna Tirtha's, **published in 1965**,
and its claimed Vedic provenance is not substantiated. The arithmetic tricks
are fine; the label is false.

This is not a style note. The entire P9/P11 thesis is that Shabd asserts only
what it can prove, and the app is about to start showing sūtra numbers to back
its grammatical claims. Shipping an unsupported provenance claim in the maths
course discredits the derivation drawer three screens away. **If a content
brief or seed asks for "Vedic maths", reject it and escalate (§6).**

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

# PHASE P11 — The other three idle engines

> Added 2026-09-02. P9 treats `vidyut.prakriya` as *the* unused capability.
> The audit found **three more**: `chandas`, `sandhi`, and `cheda`. All have
> their data on disk in `backend/vidyut-data/` already.

**Blocked by:** P9-1 for the tasks that need derivations; P11-1 and P11-2 are
blocked by nothing.

**Every task in this phase is local computation.** No vendor call, no network,
no quota, **₹0 marginal cost.** That is the whole reason this phase can run
alongside P7 instead of competing with it for the Sarvam grant.

Follow P9-2's precedent: put a comment in each router saying *no quota by
design*, so nobody "fixes" it later by adding metering.

## P11-0 · Pin the engines with a test

**Blocked by:** nothing. **Effort:** S

**Touch:** create `tests/test_vidyut_engines.py`

One test that imports `prakriya`, `chandas`, `sandhi`, `kosha`, `lipi` and
asserts each loads its data. It exists so that a vidyut upgrade or a missing
`vidyut-data/` fails loudly here instead of silently degrading four features.

⚠ `vidyut-data/` is gitignored and auto-downloaded. **Skip, do not fail**, when
the directory is absent (`pytest.mark.skipif`) — a fresh clone must still go
green. No network.

**Tests:** the five imports; `Data('vidyut-data/prakriya').load_sutras()`
returns 5,152 entries with 5,056 unique codes; `chandas` loads 145 vṛttas and
7 jātis. Pin these numbers — a change in them changes the product.

## P11-1 · The scansion service

**Blocked by:** nothing. **Effort:** M

**Touch:** create `app/services/chandas.py`, `tests/test_chandas.py`; add to
`routers/grammar.py`

Every verse in Sanskrit is a rhythm the engine derives from the text alone.
This is the note chart for U7-3 and for the śloka surface, and it makes P10's
Piṅgala amendment nearly free.

1. `Chandas.from_text(open('vidyut-data/chandas/meters.tsv').read())` —
   ⚠ **not `Chandas.from_here()`**, which does not exist on 0.4.0. Load once
   at module level, like the sūtra corpus.
2. Input is Devanagari; transliterate to SLP1 with `analyzer.py`'s helpers
   before calling `classify()`. **Do not add a second transliteration path**
   (§P9-1.3).
3. `classify()` returns a `Match` exposing **`aksharas` and `padya` only** —
   no `.name`, no `.vrtta`, no `.padas`. `aksharas` is a list of lines, each a
   list of `Akshara(text, weight)` with `weight` in `{'G','L'}`.
4. Return `{lines: [[{syllable_devanagari, weight}]], metre: str | None}`.
   Transliterate each `akshara.text` back to Devanagari — the client renders,
   it does not convert.
5. Degrade like P9-1.4: unscannable input returns empty lines, never raises.

⚠ **`padya` is often `None` and that is not a bug.** Verified 2026-09-02: Gītā
1.1 scans correctly into 16 + 16 syllables but returns **no metre name**,
because anuṣṭubh is variable and is not a fixed entry in the 145-vṛtta table.

**So: scansion is a promise, metre naming is not.** Type the field optional,
and tell U7-3 to render the rhythm strip with no name rather than hiding the
strip when the name is missing. Never show a guessed metre name — that is
exactly the failure mode P9 exists to end.

**Tests:** Gītā 1.1 pins the 32 weights and `metre is None`; a known fixed
vṛtta pins its name; empty and non-Devanagari input return empty, not raise;
**no network.**

## P11-2 · The sandhi service

**Blocked by:** nothing (splitting). **Effort:** M

**Touch:** create `app/services/sandhi.py`, `tests/test_sandhi.py`; add to
`routers/grammar.py`

1. `Splitter.from_csv('vidyut-data/sandhi/rules.csv')`, loaded once at module
   level. `split_at(text, index)` returns `Split(first, second, is_valid)`.
2. Expose split candidates for a joined form, filtered to `is_valid`, ranked
   by whether both halves resolve in `kosha`. **`is_valid` is a phonetic
   check, not a lexical one** — it will happily return real-sounding
   non-words, so the kosha filter is what makes the output usable.
3. For the *join* direction and the rule name (`6.1.87 आद्गुणः`), use
   `prakriya`, not this module. That is why U4-5's rule-naming is listed under
   P9's unlocks and not here.
4. Degrade: no valid split returns an empty list.

**Tests:** a known junction splits correctly and the correct split ranks
first; a form with no valid split returns `[]`; **no network.**

## P11-3 · The word-order endpoint

**Blocked by:** P9-1. **Effort:** M

**Touch:** create `app/services/word_order.py`, `tests/test_word_order.py`;
add to `routers/grammar.py`

The surface behind U7-4. Free word order is the most distinctive fact about
Sanskrit and the app currently never demonstrates it.

1. Given a graded-correct sentence, return its words plus **the set of
   permutations that remain grammatically equivalent**, and for each word the
   ending that carries its role.
2. Equivalence is decided by `analyze_sentence` + `feature_set_variants` —
   the same path P7-4 uses for `accepted_parses`. **Do not hand-write
   permutation rules and do not modify `analyzer.py`** (§2.1).
3. Also return, per word, one *wrong* ending and what it would change the
   sentence to mean. That is the half of the interaction that teaches.

⚠ Do not enumerate all `n!` orders for long sentences. Cap the sentence length
you accept, and say so in the response rather than truncating silently (§2.11).

**Tests:** a 3-word sentence returns its equivalent orders and no
non-equivalent one; a wrong ending is rejected by the same call; the length
cap returns an explicit refusal, not `[]`.

## P11-4 · Phonetic distance on the varṇamālā grid

**Blocked by:** nothing. **Effort:** M

**Touch:** create `app/services/varna_distance.py`, tests; add to
`routers/grammar.py`

The 5×5 sparśa matrix is a map of the mouth, and the backend already returns
`place` on every character (see `UI_HANDOVER.md` U4-1). That makes "nearly
right" definable: क → ग is one step (same place, different voicing), क → प is
far.

Return a distance and the axis that differs (`place` | `voicing` |
`aspiration` | `nasality`). This is what lets a guessing game score a near-miss
honestly instead of showing a binary right/wrong, and it is reusable by the
pronunciation feedback path.

**Do not invent articulation data.** Use the `place` values the API already
returns (U4-1's "Do not" applies here too).

**Tests:** the four axes each pin an example pair; identical characters are
distance 0; a character outside the sparśa grid returns a defined result
rather than raising.

## P11-5 · Śabdarūpa and dhāturūpa tables

**Blocked by:** P9-2. **Effort:** M

**Touch:** `app/services/prakriya.py`, `routers/grammar.py`, tests

A full paradigm is a loop over P9-2's single-form derivation: 24 cells for a
noun (8 vibhakti × 3 vacana), the lakāra grid for a verb. Each cell carries its
own derivation, so the "why is it this?" answer is already attached.

1. `GET /grammar/paradigm` by prātipadika + liṅga, or dhātu + lakāra.
2. **Cache per paradigm.** 24 derivations per request is wasteful and the
   result never changes; an in-process dict keyed by the query is enough.
   Still ₹0, but do not make the phone wait on it.
3. A cell that fails to derive returns `null` and the rest of the table still
   renders. **Never fail a whole table on one cell** (§P9-1.4).

This is the surface that serves the school-exam segment noted in §4. It needs
no new content pipeline — the engine generates it.

**Tests:** a known noun's 24 cells pin exactly; a known verb's lakāra pins;
one deliberately underivable input yields `null` in that cell and a complete
table around it.

## P11-6 · The public derivation viewer — ⚠ OWNER-GATED

**Blocked by:** P9-2. **Effort:** M

A public, no-account web page that derives any Sanskrit word and shows the
sūtras. `shabd-expansion.html` argues it is the cheapest acquisition surface
available, and it runs at ₹0 because the computation is local.

**Escalate before building** (§6). It is a *public deployment* — hosting,
domain, abuse limits and privacy are all owner calls left open in P8-4, and
shipping a public endpoint ahead of those decisions creates an unowned
service. Build P9-2 and P11-5 first; those make this a rendering job later.

---

# PHASE P12 — The daily word service

> The backend behind `UI_HANDOVER.md` **U8-4**. One puzzle a day, shareable,
> no account required to play. `shabd-expansion.html` argues this is the
> cheapest organic acquisition surface the project has.

**Blocked by:** P11-4 (phonetic distance). **Gate for:** U8-4.

## Why it is not "just Wordle"

Scoring runs on the **varṇamālā grid**, not on letter identity: क against ग is
one step (same place, different voicing), क against प is far. That is what
P11-4 computes. A Latin-alphabet Wordle cannot do this because Latin letter
order is arbitrary; Sanskrit's is a map of the mouth. **The phonetic scoring is
the product.** If it degrades to exact/present/absent, do not ship it — you
have built a worse Wordle in a language nobody plays it in.

## P12-1 · The puzzle model and daily selection

**Effort:** M · **Touch:** `app/models.py`, a new migration, create
`app/services/daily_word.py`, tests

1. A `DailyWord` row: the answer, its date, and its difficulty band. Curate
   from `kosha`; do not generate at request time.
2. **Selection is deterministic per learner-local day.** §2.8 binds — the
   learner's day boundary, never the server's. A learner in Auckland and one
   in Toronto get the same *puzzle number*, not the same wall-clock rollover.
   `services/localtime.py` already owns this logic; use it, do not re-derive.
3. Answers must be **words a learner could plausibly know** at their band. A
   puzzle nobody solves is churn, not challenge.
4. Migration hand-written, `upgrade`/`downgrade` both (§2.5). Never
   `create_all`.

**Tests:** two timezones on the same UTC instant resolve to the correct local
puzzle; the same learner asking twice in one local day gets the same word;
**no network.**

## P12-2 · Guess scoring

**Effort:** M · **Touch:** `app/services/daily_word.py`,
`routers/` (new or existing), tests

1. Score each position against the answer with P11-4, returning the state
   **and the axis that differs** — the client needs the axis to render four
   distinguishable states (U8-4.1).
2. Cap guesses. A solved day stays solved; **do not allow replay** — the share
   card's credibility depends on it.
3. **Never return the answer before the game ends.** Trivial to get wrong: a
   scoring response that includes the target for convenience makes the puzzle
   solvable from the network tab in one request.

**Tests:** each of the four states pins an example; the answer never appears
in an unsolved response; a replay attempt is refused, not silently re-scored.

## P12-3 · The share card

**Effort:** M · **Escalate first (§6) if this renders server-side.**

The share object is an **image**, not a grid of emoji squares — emoji cannot
carry the phonetic distinction that makes this puzzle different, so the
default Wordle share destroys the one thing worth sharing.

Rendering it on the client (U8-4.4) needs no backend and no hosting decision.
**Prefer that.** A server-rendered card is an image endpoint, which is a public
surface and therefore a P8-4 platform question — same gate as P11-6.

---

# PHASE P13 — The return loop

> A habit product with **no way to ask anyone to come back.** Nothing in the
> repo sends a notification; `expo-notifications` is not installed.

**Blocked by:** P8 (do not send notifications to a product with no users).

## P13-1 · Push tokens and delivery

**Effort:** M · **Touch:** `app/models.py`, migration, create
`app/services/notify.py`, `routers/me.py`, tests

1. Store a push token per device per learner. A learner has several devices;
   model it as a collection, not a column on `Learner`.
2. **Learner-local scheduling only** (§2.8). A reminder that arrives at 3am
   uninstalls the app.
3. Send at most one reminder a day, and **stop sending after a few ignored
   ones.** A product that keeps nagging a lapsed learner is training them to
   turn notifications off for good.

**Tests:** token registration and replacement; local-time scheduling across
two timezones; the ignore-decay rule; **no network** (mock the transport).

## P13-2 · What the notifications actually say

**Effort:** S · **Touch:** copy only

§7 of `UI_HANDOVER.md` governs the voice, and it already bans guilt. Applied
here that means: **no streak-loss shaming, no "you've been gone 12 days", no
manufactured urgency.** "It's good to see you" is the register.

⚠ The one genuinely good notification this product can send that competitors
cannot: **today's śloka, or today's word.** A reminder that carries content is
a gift; a reminder that carries a guilt-trip is a tax. Prefer the former
always.

## P13-3 · Streak freeze, surfaced

**Effort:** S

`DailyActivity` exists and `SessionComplete` already accepts a `freezeUsed`
flag, but nothing explains the mechanic to the learner. Make the rule visible
before it is needed, not after it fires.

---

# PHASE P14 — Entitlements and subscription

> ⚠ **Owner-gated in every particular.** Prices, tiers, free limits, trial
> length and store accounts are all owner decisions (§6). **Escalate before
> writing any of them into code.** What follows is the plumbing that is safe
> to specify, not the business model.

**Blocked by:** P8, and an explicit owner decision on pricing.

`sanskrit-market.html` sets the frame: ~₹46 of lifetime revenue per download
makes paid acquisition arithmetically fatal, and roughly 30% of subscribers
(the diaspora band) generate about 48% of revenue. That is a *pricing* input,
not an engineering one.

## P14-1 · The entitlement model

**Effort:** M · **Touch:** `app/models.py`, migration, create
`app/services/entitlement.py`, `auth.py`, tests

1. One `Entitlement` per learner: tier, source (store / promo / institution),
   validity window. **Never derive entitlement from a client claim** — the
   client asserts a receipt, the server verifies it.
2. A single `has_entitlement(learner, feature)` seam that every gated path
   calls. Do not scatter tier checks through routers; that is how a paywall
   ends up with holes.
3. **Fail closed on vendor errors, but fail *open* on your own outages.** A
   store-verification timeout must not lock a paying learner out mid-session.

## P14-2 · What is never gated

**Effort:** S — but this is a product invariant, so write it down and test it.

Standing owner ruling, restated from `DECISIONS.md` and `UI_HANDOVER.md`:
**no hearts, no energy, no meter that stops a willing learner.** Duolingo is
losing goodwill over exactly this. Whatever the tier structure turns out to
be, the free tier must never make a motivated learner *wait*.

Also never gated: the daily word (it is the acquisition loop — gating it
breaks the thing that brings people in), and the abstention behaviour (§2.2 is
a safety rule, not a feature).

## P14-3 · Institutional licensing — escalate, do not build

Named here so it is not forgotten: `sanskrit-market.html` identifies temple
weekend schools and cultural associations as the only route to the upside
revenue band, and the school segment in §4 is the domestic version of it. A
seat-based institutional tier is a **different product** with rosters, teacher
accounts and reporting. **Do not start it as a variation on P14-1.**

---

# PHASE P15 — Async social: the chain

> `श्लोक-अन्त्याक्षरी` — antākṣarī with verses. The rules need no teaching:
> every Indian family already knows them. It is also the only multiplayer mode
> a grandparent in Pune and a grandchild in New Jersey will both open.

**Blocked by:** P7 (needs a verse corpus), P13 (a turn-based game with no
notifications is a dead game), P14 (decide what is free first).

- **P15-1** — the chain model: a room, an ordered turn list, one verse per
  turn, validated to begin on the syllable the previous verse ended on. The
  validation is `kosha` + the open subhāṣita corpus; it is not an LLM call.
- **P15-2** — invite by link. **WhatsApp-shaped** (§`shabd-expansion.html`):
  an image, one line, a URL. Not an email flow, not an in-app friend graph.
- **P15-3** — family streak: a shared streak that survives one member missing
  a day. The point is to make the grandparent's participation matter to the
  grandchild, not to punish either.

⚠ **A public invite link is a public surface** — P8-4 again. Escalate.

---

# PHASE P16 — `अवधानम्`

> The boss mode, and the thing that gets written about. **Last on purpose.**

**Blocked by:** P11, P15. **Do not start before there is a product to be a
boss mode of.**

The real art form, made playable: hold a line of verse, count the bell, restore
a scrambled stanza, and ignore the heckler — the traditional
*apraṣṭuta-prasaṅgī*, whose actual historical job is to break the performer's
concentration. Score is how many streams the learner held.

You are not inventing a leaderboard: **aṣṭāvadhānī** (eight streams) and
**śatāvadhānī** (a hundred) are contested titles that living performers hold.

**What to do about it now: nothing, except not precluding it.** Specifically,
keep session state able to hold more than one concurrent task (`session_store`
assumes one), and keep the scansion and derivation services stateless so four
of them can run at once. Both are free if you know now; both are rewrites if
you find out later.

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
- **P11-6, the public derivation viewer** — a public deployment, and therefore
  a platform choice (P8-4). Same for **P12-3** if the share card renders
  server-side, and **P15-2**'s public invite link.
- **Anything in P14** — prices, tiers, free limits, trial length, store
  accounts. The plumbing is specifiable; the business model is not yours.
- **P14-3, institutional licensing** — a different product (rosters, teacher
  accounts, reporting), not a tier variant.
- **Adding a hearts, energy, lives or any meter that stops a willing
  learner** (P14-2). Standing owner ruling; there is no version of this to
  negotiate.
- **A seventh bottom tab** (`UI_HANDOVER.md` U8-1). Six is the decided
  maximum and it is already at the width limit.
- **Store submission and Apple/Google sign-in.**
- **Anything that would make an `unsure` verdict penalize a learner** (§2.2).
- **A test you cannot make pass without weakening it.** Report it instead.
- **Loosening the Vidyut gate to raise a pass rate** (P6-3).
- **Removing, bypassing or deprecating the LLM explainer** to "replace it"
  with derivations (P9-3). The owner has ruled on this; the derivation is an
  addition. If a task appears to require deleting the LLM path, you have
  misread the task — stop.
- **Any content claiming provenance the project cannot support** — "Vedic
  Mathematics" as ancient (P10), Sanskrit as the world's oldest language, or
  the "NASA declared Sanskrit best for computers" claim, which is a documented
  misreading of Briggs (1985). The app is about to start showing sūtra numbers
  as proof; unprovable claims elsewhere discredit that. Reject the brief.
- **Showing a metre name the engine did not return** (P11-1). Absent is
  absent; do not fill it with a guess or an LLM call.

---

## 7. Quick reference

```
All backend commands run from backend/ (§2.10), with UTF-8 (§3).
PowerShell 5.1 has no &&.

Backend tests (baseline 310):
  cd backend
  ./.venv/Scripts/python.exe -m pytest -q

Mobile typecheck (baseline 0 errors):
  cd mobile ; npx tsc --noEmit

Content cost estimate (SAFE — spends nothing):
  ./.venv/Scripts/python.exe -m scripts.author_batch --dry-run

Author a batch (SPENDS — owner-approved to ~₹47 total):
  ./.venv/Scripts/python.exe -m scripts.author_batch --live --limit 5

Alembic head:  a1b2c3d4e5f6
Order:         UI_HANDOVER U8-0 (1 hr, do it first — 653 dead LOC)
               → P6-2, P6-3 → P7 → P9 → P11 → P8 → P12 → P10
               → P13 → P14 → P15 → P16
Not yet:       RAG · P9-4 · P11-6 · P12-3 server-side · P14 (all) · P15-2
               — every one of these is owner-gated, see §6

Client navigation is UI_HANDOVER U8: six tabs
  Home · Path · Talk · Play · Grammar · Progress
  + left drawer (hamburger) for settings and account.
  Śloka and Varṇamālā are Home cards now, not tabs. Both screens survive.
  @react-navigation/drawer is NOT installed; its peers already are.

P9 and P11 are LOCAL computation — no vendor call, no quota, ₹0.
They may run alongside P7; they do not compete for the grant.

Pinned engine facts (measured 2026-09-02, vidyut 0.4.0):
  load_sutras()  5,152 entries / 5,056 unique codes  <- index carefully
  chandas        145 vṛttas, 7 jātis; Chandas.from_text(), NOT from_here()
  derive()       takes ONE Pada.Tinanta/Subanta args object, returns a LIST
  भू → भवति      20 steps, 1.3.1 first, 6.1.78 last
  Match          exposes .aksharas and .padya only; .padya is often None

The LLM stays (P9-3). Derivation answers grammar; the LLM answers meaning.
```
