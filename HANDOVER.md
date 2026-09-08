# Sanskritam — Backend Handover

**Audience:** an implementing coding agent (DeepSeek-V4-Flash / Hermes).
**Revised:** 2026-09-08 (later). Completed phases (P6, P9, P11, P12, P7-5,
P7-7, P7-13, P19, P20-1/2/3, P21-1/2/3/4, P22-1/2/4/5/6, P13-1, P14-1/2
plumbing, P8-4, P8-5 and the 2026-09-01 defect audit) are removed from the
open list below; their record lives in `DECISIONS.md` and
in git history. What remains below is **open work only.**
**Companion doc:** [`UI_HANDOVER.md`](UI_HANDOVER.md) — client, motion, mascot.
The mascot rig (U1) is the owner's lane right now; do not pick it up.

A few tasks here need a client surface. Those are tagged **[client]** and give
the backend contract; visual detail stays in `UI_HANDOVER.md`.

**Landed 2026-09-05 (second pass):** P7-12 completed (coverage 24 → **33 of
37**), P8-2 (crash log + `GET /admin/errors`), P8-3 (Google sign-in), P8-0's
review tooling (band-sorted packet, near-duplicates clustered, bulk approve by
band). Suite 434 → **465**.

**Landed 2026-09-06:** **P21-1 + P21-2** — `GET /shlokas` (the reader corpus,
auth-bound, `word_breakdown` instrumented, tested) and the tap-a-word surface
that consumes P19's routing. Client half is `UI_HANDOVER.md` U13. Suite 465 →
**499**. See §4 and PHASE P21.

**Landed 2026-09-07:** **P7-5 + P7-7** (`GET /grammar/path` approved-content
spine with `has_lesson`, `GET /admin/content-wells` runway guard), **P21-3**
(`scripts/import_text.py`, Gītā 2.1–6, corpus 96 → 102, no UI work), **P22-1/3/4**
(`lessons` table + `GET /lessons/{feature_id}`, 10 Units 1–3 lessons, Path
`has_lesson`), **P22-2** (10 samāsa/kāraka taxonomy features, unclaimed by
design), **P22-5/6 minimal** (`vocab_words` 60 rows, `reader_passages` 3 tiers;
WordNet/DCS imports deferred on licence). Suite 499 → **521**. See
`DECISIONS.md` 2026-09-07.

**Landed 2026-09-08:** **P13-1** (push-token collection + daily-notify job +
copy rules), **P14-1/2 plumbing** (`Entitlement` + `has_entitlement` seam, no
behaviour change), **P8-4** (the 10-user question + day-2 retention in
`GET /admin/metrics`). Migration `d1e2f3a4b5c6` (applied). Suite 521 →
**543**. Client half: push seam (`services/push.ts`, no-ops until
expo-notifications is installed), U3-4 achievements, U5-1 announcements — see
`UI_HANDOVER.md`. Full record: `DECISIONS.md` 2026-09-08.

**Landed 2026-09-08 (later):** **P8-5** (Cloud Run kept per owner; GCS audio
backend + bucket provisioning in `deploy.sh`; `scripts/backup_db.py` policy;
Postgres via `DATABASE_URL`, driver present) and **P21-4** (canon catalogue:
12 texts ordered, depth-graded, all free; Īśopaniṣad 18/18 imported as the
Vedic slice; `GET /canon` + Reader text filter). Migration `e2f3a4b5c6d7`
(applied). Suite 543 → **557**. Full record: `DECISIONS.md` 2026-09-08
(later).

⚠ **And the app was dead.** `models.py` declared `learners.google_sub`, the
migration existed, and it had **never been applied** — every learner query
threw `no such column`. Login, Home and profile all 500ed while the suite
stayed green, because tests build a fresh database from migrations. Backed up
and upgraded 2026-09-05; **§3 now requires `alembic current == heads` as part
of the verification loop.** A green suite does not mean a working app.

**The bottleneck has not moved.** 5 scenarios and **231** challenges are
sitting in `pending` — more than a week ago, not fewer. Nothing downstream
moves until someone reviews them. That is **P8-0**, and it is an owner task.

**New this pass:** **P7-13** (49% of challenge IAST is wrong and `lipi` fixes
it for ₹0), and three new phases — **P19** ask-anywhere help, **P20** learning
to write the script, **P21** the readable canon. See §4.

---

## Status — measured 2026-09-08 (later), not estimated

| | |
|---|---|
| Backend tests | **557 pass** (1 env-gated `test_tts_502_refunds_quota` needs `SARVAM_API_KEY`; 556 green without it) |
| Mobile typecheck | **0 errors** |
| Alembic head | `e2f3a4b5c6d7` — **applied**; verify with `alembic current` |
| Engines live | all four — prakriya, chandas, sandhi, cheda (+ kosha, lipi) |
| Client | six tabs + drawer; pronunciation, progress, metrics, **reader**, **lessons/vocab** wired |
| Deploy | Cloud Run (`shabd-api`, asia-south1); the app points at it |

### Content in the DB

| | rows | approved & servable |
|---|---|---|
| Scenarios | 6 | **1** — 5 still `pending` since 2026-09-03 |
| Dialogue nodes | 100 | 30 |
| **Challenges** | **264, all distinct** | **33** — **231 `pending`** |
| Features in the pool | — | **33 of 37** (+10 samāsa/kāraka taxonomy-only, unclaimed by design) |
| Features a learner can reach | — | **24 of 37** — see below |
| Śloka | **120** (96 + Gītā 2.1–6 + Īśopaniṣad 18; registers classical + vedic) | the well refilled |
| Daily words | **30** | the well refilled |
| Lessons | **10** (Units 1–3, original prose, Vidyut-verified examples) | served at `GET /lessons/{feature_id}` |
| Vocab | **60** (10 topics; 7/60 with pool examples, rest `examples: []`) | `GET /vocab/{topic}` |
| Graded reading | **3 tiers** (from servable content; DCS import deferred) | `GET /reader/{tier}` |
| Pre-rendered audio | 29 nodes · 33 challenges | every approved row is rendered |
| **IAST correctness** | **0 mismatches** (P7-13 backfilled 130/264 + 9/96; invariant test guards) | **DONE 2026-09-06** |

⚠ **Coverage went 24 → 33 in the pool and 24 → 24 for learners.** Nine
features are exercised but have **zero approved rows** — `VOC.SG · GEN.PL ·
LOC.PL · PRES.2PL · IMP.2SG` and **all four sandhi types.** The sandhi
generator ran and every sentence it produced is invisible. That is not a
generation problem; it is P8-0.

---

## 1. Repo map

```
D:\Projects\Shabd\
├── architecture.md          the design bible. §-numbers below refer to it.
├── DECISIONS.md             dated decision log. Append, never rewrite.
├── HANDOVER.md              this file — backend
├── UI_HANDOVER.md           client / motion / mascot
├── rive_ui.md               mascot rig working notes (owner's lane)
├── specs/                   5 feature specs
├── frontend/                static API console (start_ui.ps1). Served by main.
├── deploy/gcp/deploy.sh     one-shot Cloud Run deploy, runs in Cloud Shell
├── Dockerfile               build context is the REPO ROOT, not backend/
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
│   │   │                    authoring progress pronunciation daily_word
│   │   ├── services/        sarvam turn_loop authoring edge_router explainer
│   │   │                    meta_intent session_store quota metrics
│   │   │                    pronunciation localtime storage tutor
│   │   │                    prakriya chandas sandhi word_order
│   │   │                    varna_distance daily_word
│   │   └── seeds/           challenges(37) dialogue(1) shlokas(96)
│   │                        varnamala features briefs(50) daily_words(30)
│   ├── vidyut-data/         78 MB, gitignored, auto-downloaded, all engines used
│   ├── migrations/versions/ head: e5f6a7b8c9da
│   ├── results/authoring/   per-brief authoring stats
│   ├── app/.authoring-cache/  draft cache keyed by brief hash
│   ├── tests/               35 modules, 434 tests
│   └── scripts/             author_batch challenge_batch render_sarvam
│                            build_render_items review_scenarios
│                            verify_live benches diags
└── mobile/                  Expo + React Native — see UI_HANDOVER.md
```

⚠ `.gitignore` lists `backend/.authoring-cache/`, but `_CACHE_DIR` resolves to
`backend/app/.authoring-cache/`. The cache is **not actually ignored.** Fix the
pattern or move the directory.

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
test fails. Chain from the current head (`e5f6a7b8c9da`); hand-write
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
  **Measured in production for the first time 2026-09-05** (P7-12, challenge
  generation): dual-bearing bands to **Gemini 100% (30/30)** vs **Sarvam 74%**.
  The rule was written from the §4.3 evals and had never once produced a
  challenge until that run. It is now load-bearing on real content — keep it.

### 2.7 No local models, ever

API-only. Never `import torch`/`transformers`/`sentencepiece`, never add a
model download step.

**Vidyut is not a model** — it is a rule-based Rust library shipping a data
file, already a dependency, and running it locally is correct and free. §2.7
constrains *inference*, not linguistics.

### 2.8 Learner-local time, never server time

Any date a learner *experiences* — daily goal, activity row, streak boundary,
notification time, daily word, daily śloka — resolves in **their** timezone via
`app/services/localtime.py`. Never `datetime.now(timezone.utc).strftime(...)`
for a user-facing day. Use `localtime.learner_today(learner)`.

`routers/shlokas.py` used to violate this with a bare `date.today()`; P7-6
fixed it 2026-09-03. `daily_word.py` and `shlokas.py` are now both correct
references — copy either.

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

When you cannot produce a usable result from a non-empty input, **raise.**

### 2.12 A daily feature that cannot run out — new, 2026-09-03

Anything the product calls "today's" must either hold enough content to keep
being daily, or **cycle deterministically** so every learner on a given date
sees the same thing. Falling back to "the newest row" is neither: it freezes
on one item, forever, with no error.

`daily_word._select_word` is the correct pattern; `shlokas.py` now follows it.

### 2.13 The database holds content you cannot regenerate — new, 2026-09-04

`backend/app.db` is not a scratch file. It holds **authored scenarios that
cost grant money to produce** and learner rows that cannot be recreated at
all. On 2026-09-03 it was rebuilt from seeds during routine seed work and five
authored scenarios, nine learners and 144 usage events were destroyed.

Before anything that recreates, deletes, migrates or re-seeds the database:

1. **Copy it first.** `app.db` → `app.db.bak-<date>`. It is 256 KB.
2. **Prefer a migration to a rebuild.** §2.5 exists so the schema can move
   without the data being thrown away. A drift error is a signal to write a
   migration, never a reason to delete the file.
3. **A seed function must never delete rows it did not create.** Seeds are
   additive and idempotent. Authored content and seed content share tables.
4. If you rebuild anyway, **say so in the task report with what was lost.**
   The loss above was found two days later by counting rows, not from any
   log line.

Applies equally to the Cloud Run/Supabase database once P8 has real users, and
much less forgivingly.

### 2.14 A content run is judged by DISTINCT rows added — new, 2026-09-05

"Inserted 410 at 82% gate pass" is not a result. **452 rows and 96 distinct
sentences** is the result, and only the second number tells you whether the
learner's day got better.

Any generator that writes content rows must:

1. **Enforce uniqueness in the schema**, not in the caller. A unique
   constraint is the only thing that survives a re-run, a second script, and
   an agent who did not read this file.
2. **Report `N new distinct` separately from `N inserted`**, and say loudly
   when the distinct count is zero — that is the signal the source is
   exhausted or the cache is replaying, and it is invisible otherwise.
3. **Key any draft cache by the item's position in the run**, not only by the
   request shape. A cache keyed on `(band, register, n)` returns the same
   draft every time it is asked, which is correct for cost and catastrophic
   for variety.

A pipeline can be perfectly idempotent in spend and still inflate the table
4.7x. That is what happened to `challenges` (§4).

### 2.15 A destructive migration is tested against a copy first — new, 2026-09-05

The P7-10 dedupe migration compared `challenges.id` (a text UUID) against
`MIN(rowid)` (an integer) aliased as `id`. The comparison never matched, so
`DELETE ... WHERE id NOT IN (...)` deleted **every row in the table.** The pool
came back only because §2.13's backup existed.

SQLite will not warn you about this. A text-vs-integer comparison is not an
error, it is just always false, and a `DELETE` that removes everything looks
exactly like a `DELETE` that worked until you count the rows.

So, for any migration or script with a `DELETE`, `UPDATE` without a tight
`WHERE`, or a bulk rewrite:

1. **Back up first** (§2.13), and name the backup in the task report.
2. **Run it against the copy and diff the counts** before running it for real.
   `before`/`after` row counts are the acceptance criterion, not "it ran".
3. **`rowid` is not `id`.** SQLite's `rowid` is the integer insertion key;
   `id` in this schema is a text UUID. Never compare them, and never alias one
   to the other's name — that alias is what made the bug invisible.
4. **Pin rows a learner has touched.** An attempt references its challenge; a
   dedupe that deletes the row underneath a learner's history corrupts it. The
   fixed migration does this with `NOT EXISTS` — keep that shape.

### 2.16 Learner handwriting is learner content — new, 2026-09-05

P20 puts a drawing canvas and a camera in front of a learner, and both produce
something this project has never held: **an image of a person's handwriting.**
A child's exercise book has a name on the cover, a date, and usually the rest
of the page in frame.

Treat it exactly as P1-4 treats learner speech, and more strictly in one way:

1. **Recognition runs on the device.** ML Kit Digital Ink and ML Kit Text
   Recognition are on-device models — that is *why* they were chosen. Cloud
   Vision is better at handwriting and is disqualified by this rule, not
   competing with it.
2. **The image never reaches the server.** Not to grade it, not to log it, not
   to improve anything. What crosses the wire is a recognised string and a
   confidence — never the bitmap, never the raw stroke coordinates.
3. **Nothing is retained without an explicit opt-in**, under the same switch
   `retain_raw_audio` already governs. Default off.
4. **A crash report never carries one.** P8-2 already says this for audio,
   transcripts and Devanagari answers; an image is the same rule.

This is not only a privacy position. An on-device recogniser that abstains is
free; a cloud recogniser that is confident and wrong costs money **and**
violates §2.2.

---

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

# Backend — baseline 465 (measured 2026-09-05)
./.venv/Scripts/python.exe -m pytest -q

# The database is on the current schema. NOT optional — see below.
./.venv/Scripts/python.exe -m alembic current   # must equal:
./.venv/Scripts/python.exe -m alembic heads

# Server. Note the working directory (§2.10) and port 8001, not 8000.
./.venv/Scripts/python.exe -m uvicorn app.main:app --port 8001

# Mobile — baseline 0 errors
cd ../mobile ; npx tsc --noEmit

# New migration (hand-write upgrade/downgrade)
./.venv/Scripts/python.exe -m alembic revision -m "description"
```

Five `UserWarning`s about a field named `register` are pre-existing; ignore.

**Run all four after every task.** If a count drops, you broke something.
Never disable, skip, or weaken an existing test to go green.

### A green suite does not mean a working app

Measured 2026-09-05: `learners.google_sub` was declared in `models.py` and
created by a migration **that had never been run.** `tests/conftest.py` builds
its database by running migrations, so the tests saw a column the real database
did not have. **465 tests passed against an app where every learner query threw
`no such column` — login, Home and profile all 500.**

So: **whenever a task adds a model column, `alembic current` must equal
`alembic heads` before the task is done.** Writing the migration is not
running it, and only one of those two is visible to the suite.

### The tests do not cover the money paths


`tests/conftest.py` builds a **fresh temp DB** and every provider is mocked.
The suite proves logic, not wiring — 300 green tests once hid four defects, all
of them in paths the tests mock. **When you touch a path that spends money or
talks to a vendor, verify it live once, cheaply, before trusting it.** One
smoke call costs a fraction of a paisa.

`scripts/verify_live.py` exists for this.

---

## 4. What comes next, and why

### What landed 2026-09-05

- **P7-12 — done.** Coverage 24 → **33 of 37**. The investigation was the
  valuable part: number *was* a claiming gap (`SG`/`DU`/`PL` ride on every
  `NOM.SG`-style value and the bands simply never asked), and gender was
  **not**. `MASC`/`FEM`/`NEUT` are deliberately still unclaimed because the
  kosha's liṅga data is not unanimous — कन्या resolves to three liṅgas and
  मातृ comes back neuter. Declining to assert what the engine cannot support
  is §6 working, not a gap. `ATMANEPADA` is a content gap: no sentence in the
  pool uses an ātmanepada verb.
- **P8-2 — done.** Exception middleware, `error_logs`, `GET /admin/errors`.
  Route and stack trace only; the write is swallowed so it can never mask the
  original error.
- **P8-3 — done.** Google sign-in with JWKS verification against
  `accounts.google.com`, `google_sub` unique per learner.
- **P8-0 tooling — done.** The packet is band-sorted and clusters
  near-duplicates by a sandhi-insensitive key, so `बालकः चन्द्रं पश्यति।` and
  `बालकश्चन्द्रं पश्यति।` land adjacent. Bulk approve by band works. **The
  reviewing itself has not happened.**

### The two things measurement caught that the suite did not

**1. The app was broken and every test passed.** `learners.google_sub` was in
the model and in a migration that had never run. Tests build their database
from migrations, so they saw a column production did not have; every real
learner query threw `no such column`. **465 green tests, a dead app.** §3 now
carries `alembic current` as a required step. A migration that exists is not a
migration that ran.

**2. Half the IAST in the pool is wrong.** 130 of 264 rows disagree with
`vidyut.lipi` on the same Devanagari — dropped vowel length, transposed
letters, ITRANS output that is not IAST, and one row containing U+15BA
(Canadian Aboriginal Syllabics) where a `ś` belongs. The cause is that the
model was asked for a transliteration that `lipi` computes locally and
correctly for ₹0. → **P7-13**, and it lands before P20, whose entire audience
reads the IAST because it cannot yet read the Devanagari.

### The bottleneck is still the review queue

```
pending scenarios     5    (since 2026-09-03)
pending challenges  231    (was 216 — it grew)
```

Everything waits here: the Talk tab still has **one** dialogue, P17-2 can only
render 30 of 100 nodes, P7-5 has no approved spine, and P8 cannot start.

**And it is now costing coverage, not just volume.** Nine features have rows in
the pool and zero approved: `VOC.SG · GEN.PL · LOC.PL · PRES.2PL · IMP.2SG` and
all four sandhi types. P7-12 generated the sandhi challenges from
`services/sandhi.py` exactly as specified, for ₹0 — and no learner can reach a
single one of them. **The pipeline is now two weeks ahead of the reviewer.**

### The three new phases, and why they are ordered this way

Added 2026-09-05 on owner direction.

- **P19 — ask anywhere.** First because it is mostly built: `explainer.py`, the
  provider, the quota accounting and `reply_language()` all exist and are
  reachable from exactly one screen. The work is a session-free endpoint and
  **engine-first routing** — a help button on a grammar screen must ask
  `sandhi.py` and `prakriya.py` before it asks a model that false-accuses the
  dual 50% of the time at ₹0.0055 a call.
- **P20 — learning to write.** The largest new audience. The app assumes you
  can already read Devanagari, and for the CBSE cohort that assumption is the
  whole barrier. The owner has chosen ML Kit Digital Ink + on-device OCR, which
  **resolves the escalation that had `U4-2` blocked** — though not all of it;
  see P20-2.
- **P21 — the canon.** Last, and deliberately narrower than it was proposed.
  The catalogue is not the product and cannot be voiced at ₹30/10K; the
  mechanism is. Build the reader over the 96 verses already in hand.

### Order

| Phase | Theme | Gate |
|---|---|---|
| **P8-0** | Clear the review queue — ⚠ **owner** | none — **the blocker** |
| **P7-5** | Re-point the path at approved content — **DONE 2026-09-07** | — |
| **P7-7** | Content-well guard — **DONE 2026-09-07** | — |
| **P8-4** | The question 10 people answer — **DONE 2026-09-08** (`p8` in metrics) | — |
| **P8-5** | Platform — **DONE 2026-09-08** (Cloud Run kept; GCS audio; backup policy; Postgres path) | — |
| **P19** | Ask anywhere — engine first, model second — **DONE 2026-09-06** | — |
| **P13** | The return loop — notifications — **DONE 2026-09-08** (job + tokens; expo package + scheduling behind P8) | — |
| **P20** | Learning to write the script — P20-1/2/3 done; P20-4 server done, photo client pending | — |
| **P10** | Maths in Sanskrit | P7 |
| **P14** | Entitlements plumbing — **DONE 2026-09-08** (prices/tiers/store — ⚠ owner) | — |
| **P21** | The canon, made readable | P21-1/2/3 done 2026-09-07; P21-4 DONE 2026-09-08 (canon decided, Īśā imported, `GET /canon`) |
| **P22** | Curriculum — DONE minimal 2026-09-07 (P22-1/2/4/5/6); WordNet/DCS imports deferred on licence | — |
| **P15** | Async social — the verse chain | P13, P14 |
| **P16** | `अवधानम्` — the boss mode | P15 |

**P15 and P16 are deliberately still one page each.** They are gated on a
pricing decision and on there being a product to be social about, and detail
written now would be stale before it is read — P9 and P11 were obsolete within
a day of execution. What they carry instead is the constraint that is free to
honour now and a rewrite later: keep `session_store` able to hold more than one
concurrent task, and keep the scansion and derivation services stateless.

### Explicitly NOT next: RAG

`architecture.md` §4.6 calls it "smaller than it looks"; §15 lists its quality
as unmeasured. You have 249 challenges, 33 of them approved, and 0 users
telling you what is wrong. **Do not start RAG work without an explicit owner
decision.**

---

# PHASE P7 — Content at volume

> The biggest lever in the project, and it stalled after 6 of 50 briefs.
> P7-1 (cost dry-run), P7-2 (first authoring batches), P7-3 (the review tool)
> and P7-6's *mechanism* are **done**; the gate passes at 83.3%. What is left
> is restoring what the rebuild destroyed, then volume.

**Spend note:** the whole of P7 was owner-approved at ~₹47 against the ₹25,000
Sarvam grant on 2026-09-01. ~₹0.11 is spent. A new order of magnitude is a new
decision (§6).

## P7-10 · Dedupe the challenge pool — DONE 2026-09-05

Unique `(target_sanskrit, register)`, skip-on-conflict inserts, distinct-count
reporting. **452 → 111 rows, all distinct.**

⚠ **Read the near-miss in §2.15.** The first migration deleted all 452 rows;
`app.db.bak-20260905` is the only reason they came back. §2.13 paid for itself
within a day of being written.

## P7-11 · The challenge review gate — DONE 2026-09-05

`review_status` on `Challenge`, the selector serves approved only, the 37 seed
challenges grandfathered to `approved` by migration.

## P7-12 · Widen feature coverage — PARTLY DONE, 13 features left

**Done 2026-09-05:** `CHALLENGE_BANDS` — 20 narrow bands replacing the
cumulative scenario supersets that had let generation drift into
NOM/ACC/PRES.3SG. Coverage **20 → 24 of 37**. Pool 111 → 249, all distinct.

**And the §2.6 dual routing rule was finally measured** — see §2.6. It had
never once produced a challenge before this run.

**Done 2026-09-06 (the free half):** 8 of the 13 remaining features were a
*claiming* gap, not a generation gap. `app/services/feature_derivation.py`
re-derives bare number (`SG`/`PL`/`DU` — implied by every `NOM.SG`-style
value) and pada (`PARASMAIPADA`/`ATMANEPADA` — the 1.3.12-in-derivation-log
rule, measured 14/14 against the upadeśa backslash marker) from engine output
and enriches existing challenge rows: **260 rows gained 569 feature claims at
₹0.** The four sandhi features are generated FROM `services/sandhi.py` +
chedaka round-trip verification by `scripts/p712_feature_coverage.py --sandhi`
— **15 new distinct challenges, never an LLM draft** (pool 249 → 264).

**Still never exercised — 5 features:**

```
ATMANEPADA (derivable, but no atmane verb is claimable on pool sentences yet)
MASC · FEM · NEUT (kosha surface liṅga is not unanimous/wrong on some words — §2.1 escalation)
INDECL (claimed on 12 rows, but 0 approved yet)
```

**Blocked by:** P8-0 approval for the pending rows. **Effort:** remaining = owner review.

1. `SG`/`PL`/`DU` and `MASC`/`FEM`/`NEUT` are almost certainly *derivable* on
   sentences you already have — the analyzer returns them; the bands just do
   not ask. **Check whether these are a generation gap or a claiming gap
   before authoring anything.** If the analyzer already returns `MASC` on
   `बालकः`, this is a band definition, not an LLM call, and it costs ₹0.
2. **The four sandhi features are the interesting ones** and they are not an
   LLM job at all. `services/sandhi.py` is live, free, and deterministic —
   generate sandhi challenges *from* it rather than asking a model to invent
   them and hoping the gate agrees. A sandhi challenge that can show its own
   derivation is the product thesis on one card (U10-2).
3. Voice (`ATMANEPADA`/`PARASMAIPADA`) needs verbs of both pada classes;
   `prakriya` knows which is which. Same argument: derive, do not prompt.

**Acceptance:** every one of the 37 features has ≥5 approved distinct
challenges · sandhi challenges are generated from `services/sandhi.py`, not
drafted by an LLM · the report says which features moved.

**Do not** spend LLM budget on anything Vidyut can generate deterministically.
That is the whole P9/P11 lesson applied to content instead of explanation.

## P7-4 · Challenges at volume — PIPELINE DONE 2026-09-05

`services/challenge_authoring.py` + the live `challenge_batch.py` path exist
and work. `accepted_parses` is **derived** from `analyze_sentence` +
`feature_set_variants`, never hand-written — the invariant holds. The
2026-09-05 fix to honest feature-claiming (a model claiming NOM.SG on a
sentence with no nominative, gate correctly rejecting it) is the P6-3 lesson
applied correctly.

**What its first run produced was a different question** — 452 rows, 96
distinct sentences, 20 of 37 features and no review gate. P7-10 and P7-11
fixed the mechanism (uniqueness, idempotent inserts, a review gate); P7-12
narrowed the bands. **Judge any future run by distinct rows added (§2.14).**

## P7-5 · Re-point the path at real content — DONE 2026-09-07

`GET /grammar/path` (`routers/grammar.py`) returns the feature taxonomy in
teaching order with per-feature `approved_count` / `pending_count` / `mastery`
/ `has_lesson` (P22-4). `Path.tsx` consumes it. Tests:
`tests/test_path_spine.py`.

## P7-7 · A content well that cannot run out silently — DONE 2026-09-07

`services/content_well.py` + `GET /admin/content-wells` report per-well
`rows_total` / `rows_remaining` / `runway_days` plus approved/pending/rejected
scenario counts. `tests/test_content_well.py` fails naming the well when
runway < 14 days, approved scenarios < 1, or the seed is ahead of the DB
(P8-1 guard). No paging, no alerting dependency — a red test is the mechanism.

## P7-13 · IAST from `lipi`, not from the model — DONE 2026-09-06

**Done:** `services/iast.py` is the single seam (`to_iast`/`normalize`/
`matches`). `challenge_authoring.py` derives `target_iast` from lipi at
insert time and no longer asks the model for it (a stale cached draft's value
is discarded at extract); the seeds and `POST /admin/challenges` derive too.
`scripts/backfill_iast.py` rewrote the measured 130/264 challenge + 9/96
shloka rows (run against a copy first per §2.15; backup `app.db.bak-20260906`;
idempotent re-run touches 0). `daily_words` audited: 0 mismatches. The
table-wide invariant test (`tests/test_iast_invariant.py`) has a free oracle
and cannot regress. Suite 465 → **469**.

**Why:** measured 2026-09-05 — **130 of 264 challenge rows (49%) carry IAST
that does not match what `vidyut.lipi` produces from the same Devanagari.**
Not stylistic variation; wrong.

```
कन्ये अश्वौ पश्यतः।     stored: kyane aśvau paśyataḥ.      lipi: kanye aśvau paśyataḥ.
बालकं पश्यामि।          stored: balakam paᖺyāmi.           lipi: bālakaṃ paśyāmi.
बालकं शुना पश्यामि।     stored: balakam shunaa pashyaami.  lipi: bālakaṃ śunā paśyāmi.
बालकः बालकम् पश्यामि।   stored: bālakah bālakam paśyāmi.   lipi: bālakaḥ bālakam paśyāmi.
```

That `ᖺ` is U+15BA, Canadian Aboriginal Syllabics — a model artefact sitting in
a field a learner reads. Three failure modes in the sample: dropped vowel
length (`balakam`), transposition (`kyane`), and ITRANS-style output that is
not IAST at all (`shunaa pashyaami`).

**The cause is that the LLM was asked for the transliteration.** It is a
deterministic function of the Devanagari and `lipi` computes it locally, for
₹0, correctly — the same engine already used in `grading/analyzer.py`.

Only **1 of the 33 approved** rows is wrong, so the review gate is catching
this. That is the argument for fixing it, not against: the owner is currently
hand-correcting, one row at a time, what a library call gets right every time —
and P8-0 is about making review cheap.

**Do:**

1. Derive `target_iast` from `lipi` at insert time in
   `services/challenge_authoring.py`. Stop asking the model for it; drop it
   from the prompt so the tokens are not spent either.
2. Backfill the 130. It is an `UPDATE` on a content table — §2.13 and §2.15
   apply: back up, run against the copy, report `before`/`after`.
3. Do the same audit on `shlokas.iast` and on `daily_words`. The same
   pipeline authored them and nobody has checked.
4. A test that asserts, for every row in both tables, `iast ==
   lipi(devanagari)` after danda normalisation. This is a content invariant
   with a free oracle — it should never be able to regress.

**Do not** "fix" a mismatch by editing the Devanagari to match the IAST. The
Devanagari passed the Vidyut gate; the IAST did not pass anything.

⚠ **This lands before P20.** IAST is the reading crutch for exactly the learner
who cannot yet read Devanagari, which is P20's entire audience.

**Acceptance:** 0 mismatches in `challenges`, `shlokas`, `daily_words` ·
`target_iast` no longer model-authored · the invariant test exists · row
counts reported before and after.

---

---

# PHASE P17 — Pre-rendered audio

> New, 2026-09-03. **The single largest cost lever in the product.**
> Every tutor line is currently synthesised live, every time, for every
> learner. The batch that fixes it was priced at ~₹44 and never run.

**Blocked by:** P7-8 — rendering 30 nodes when 100 are about to exist wastes
the pass. P17-1 landed 2026-09-03 and already feeds the batch correctly.

## P17-2 · Render and store the graph — DONE 2026-09-05

`scripts/render_app_audio.py` renders approved scenarios via P17-1's builder,
stores each WAV through `services/storage.py`, writes the servable
`/audio/<path>` back to `DialogueNode.audio_url`; `main.py` mounts `/audio/`.
Dry-run default, idempotent, ~₹3.31 for the 30 approved seed nodes.

⚠ **29 of 100 nodes are rendered** — correct, because the five restored
scenarios are still `pending`. **This phase is not finished until the review
pass runs**, and then it is one more `--live` call.

## P17-3 · Serve it, and mark the source — DONE 2026-09-05

The client plays `node.audio_url` as a static file and only calls live Bulbul
for unrendered nodes; the backend records `source="prerendered"` on the
`UsageEvent` (accounting only, no quota). A test asserts the event, the
`tts_share` move, and **zero vendor calls** on a rendered node.

## P17-4 · Challenge audio — DONE 2026-09-05

`build_challenge_items()` pulls approved, unrendered challenges through the
P7-11 gate; `render_app_audio.py` takes a model so one script and one
skip-already-rendered discipline serves both pools. **All 33 approved
challenges are rendered.** The other 216 render themselves the moment P8-0
approves them.

---

# PHASE P18 — Connect what is already built — DONE 2026-09-04

P18-1 (pronunciation surface), P18-2 (progress endpoints — plus a new
`GET /progress/history` the calendar needed), P18-3 (deployed URL with a loud
failure on an unset release value) and P18-4 (the metrics tab in the static
console) all shipped. Client detail: `UI_HANDOVER.md` U9.

---

# PHASE P8 — First users

> **This is the next milestone, and it is no longer an engineering problem.**
> The pipeline builds content faster than anyone reviews it: **5 scenarios and
> 216 challenges are sitting in `pending`.** Ten strangers cannot be invited
> into a product whose Talk tab has one dialogue.

**Blocked by:** the review queue (P8-0), not by code.

## P8-0 · Clear the review queue — the actual blocker

**Why:** everything downstream of "is there enough to do" waits on this. It
gates the Talk tab's content, P17-2's remaining 71 nodes, P17-4's remaining 216
challenges, and P7-5's path. It has been outstanding since 2026-09-03.

**This is an owner task, not an agent task** — the standing rule stands: the
Vidyut gate checks grammar, a human checks whether the line is worth saying.

**What the agent can do to make it cheap:**

1. **Generate the packets** — `review_scenarios.py --packet` for the 5
   scenarios and the challenge equivalent for the 216. One file, readable
   offline, no server.
2. **Sort the challenge packet by band**, so a reviewer judges twenty
   `DAT.SG` sentences in one pass instead of context-switching per row.
   Reviewing 216 one at a time is how this stalls again.
3. **Surface near-duplicates inside the packet.** `बालकः चन्द्रं पश्यति।` and
   `बालकश्चन्द्रं पश्यति।` are one sentence sandhied and un-sandhied; a
   reviewer should see them adjacent and pick one, not meet them 40 rows apart.
4. **Bulk approve/reject by band**, so a good band is one command.

**Acceptance:** both packets exist · the challenge packet is band-sorted with
near-duplicates adjacent · a band can be approved in one command · **no
auto-approval anywhere in the tool.**

## P8-1 · Boot the app and verify the wells

**Why:** trivially small and currently untrue. The DB holds **6 śloka and 0
daily words** while the seeds hold **96 and 30** — P7-6b and P7-9 both landed
and the app has not been started since. A first user would meet a six-day
śloka cycle and a missing daily word.

**Effort:** S. Start the server, confirm 96 and 30, and add the check to
P7-7's runway report so "the seed is ahead of the database" is a red test
rather than something a human notices five days later.

## P8-2 · Crash and error reporting

**Effort:** M. Before strangers touch it. Client and server. **Nothing today
reports an exception anywhere** — a stranger hitting a 500 produces silence,
and with 10 users a silent failure is the whole signal lost.

Keep it API-only (§2.7) and **do not send learner audio, transcripts or
Devanagari answers to a third-party error service** — that is learner speech,
and P1-4's retention rule governs it. Stack traces and route names only.

## P8-3 · The way in for a stranger

**Effort:** M. `POST /auth/anonymous` exists and `Login.tsx` is written, but
`config.ts` still auto-logs-in as `DEFAULT_LEARNER_NAME = "Sisya"` via
dev-login. Confirm what a stranger actually hits, that account deletion
(P1-3) works from an anonymous identity, and that two devices do not collide
on one `install_id`.

**Acceptance:** a fresh install reaches a usable session with no typing · the
dev-login path is unreachable in a release build · deletion works and preserves
the escaped-log rows P1-3 requires.

## P8-4 · Decide what 10 people are being asked — DONE 2026-09-08

`services/retention.py`: the question (`P8_QUESTION`) + tripwire thresholds
(`P8_THRESHOLDS`: escape ≤0.35, live-share ≤0.50, day-2 ≥0.30, n=10) written
before anyone is invited, `day2_return` (today-first learners excluded from
the denominator), `p8_report` — all surfaced in `GET /admin/metrics` as
`retention` + `p8`. Tests: `tests/test_p84_retention.py` (4). Original spec
below for reference.

**Effort:** S — but do it before inviting anyone, not after.

Ten users is not a launch; it is an instrument, and an instrument needs a
question. `GET /admin/metrics` reports escape rate and TTS share, and P18-4
renders it. **Those two numbers plus "did they come back on day 2" are the
whole test.** Write down the question and the threshold **first**, so the
result is not decided after the fact.

⚠ **Do not invite anyone before the review queue is clear and the wells are
full.** A first impression is spent once.

## P8-5 · Platform — DONE 2026-09-08 (Cloud Run kept, owner decision)

Host: **Cloud Run stays** (`shabd-api`, asia-south1, `deploy/gcp/deploy.sh`).
Object store: **`GCSStorage`** (`services/storage.py`, selected by
`AUDIO_STORAGE=gcs` + `GCS_AUDIO_BUCKET`; CDN via `CDN_BASE_URL`, immutable
cache headers, path-traversal neutralised; unknown/unconfigured values fall
back to local rather than crashing the boot). `deploy.sh` §1c provisions the
public-read bucket + SA `objectAdmin` idempotently and wires the env (skipped
when the bucket var is unset — dev stays local). Database: **Postgres via
`DATABASE_URL`** (Supabase pooler string already in `deploy.sh`; `psycopg`
in requirements; SQLite remains the dev path). Backup policy:
**`scripts/backup_db.py`** — timestamped `backups/` copy (SQLite) or
`pg_dump --custom` (production, from Cloud Shell — never inside the container),
keep newest 30, verify-then-prune, optional `--upload` to `GCS_BACKUP_BUCKET`.
Schedule: daily Cloud Scheduler hit (documented, owner-click); the script
refuses loudly (missing DB, missing pg_dump, 0-byte copy) instead of writing
silence. Tests: `tests/test_p85_platform.py` (8) incl. a guard that the deploy
script provisions the bucket vars. Original spec below for reference.

---

# PHASE P13 — The return loop

> A habit product with **no way to ask anyone to come back.** Nothing in the
> repo sends a notification; `expo-notifications` is not in `package.json`.
> This is also what P15 is really blocked on — a turn-based game with no
> notifications is a dead game.

**Blocked by:** P8. Do not send notifications to a product with no users.

## P13-1 · Push tokens and delivery — DONE 2026-09-08

`push_tokens` + `notification_sends` tables (migration `d1e2f3a4b5c6`,
applied) + `services/notify.py` (collection-not-column, 2-strike dead rule,
learner-local dates, 1/day max, ignore-decay at 3, ledger-write idempotency,
transport-injected job) + `routers/notify.py` (`POST /me/push-tokens`,
`DELETE /me/push-tokens`, `POST /admin/notify/run`, `GET
/admin/notify/ignored/{learner_id}`). No push vendor is called: without a
transport the admin run is a dry-run ledger pass. expo-notifications install +
OS scheduling stay behind P8. Tests: `tests/test_p13_notify.py` (9). Original
spec below for reference.

**Effort:** M · **Touch:** `app/models.py`, migration, create
`app/services/notify.py`, `routers/me.py`, tests

1. **A token collection, not a column.** One learner has several devices; a
   `PushToken` row per (learner, device) with a `last_seen`. A token that
   fails delivery twice is dead — mark it, stop sending, do not delete it
   (the same device often comes back).
2. **Learner-local scheduling only** (§2.8). `localtime.learner_today` already
   owns this. A reminder at 3am uninstalls the app, and every learner in this
   product's target market is in a different timezone from the server.
3. **One reminder a day, maximum**, and **stop after a few ignored ones.** A
   product that keeps nagging a lapsed learner is training them to disable
   notifications for good — which costs you the channel permanently, for one
   marginal session.
4. **Send is a job, not a request path.** Nothing about delivery belongs in a
   route handler. It needs to survive a restart and never double-send after
   one: key each send by `(learner, local_date, kind)` and make the write the
   idempotency check.

**Tests:** token registration and replacement; scheduling across two
timezones on one UTC instant; the ignore-decay rule; the same job run twice
sends once; **no network** (mock the transport).

## P13-2 · What the notifications actually say

**Effort:** S · **Touch:** copy only

§7 of `UI_HANDOVER.md` governs the voice and already bans guilt. Applied here:
**no streak-loss shaming, no "you've been gone 12 days", no manufactured
urgency, no fake social pressure.** "It's good to see you" is the register.

⚠ **The one genuinely good notification this product can send that no
competitor can: today's śloka, or today's word.** A reminder that carries
content is a gift; a reminder that carries a guilt-trip is a tax. Prefer the
former always — and note this is only true now that P7-6b made the śloka well
96 verses deep. A daily notification pointing at a six-day cycle is worse than
none, which is exactly why P13 sits behind P7.

**The content is the payload, not the bait.** If the notification says the
verse and the learner reads it and does not open the app, **that worked.**
Do not measure this phase on open rate alone.

## P13-3 · Streak freeze, surfaced

**Effort:** S — mostly done client-side already.

U9-2 shipped the freeze rule stated before it fires. What remains is the
notification half: when a freeze is *spent*, say so warmly and without drama
("yesterday's freeze covered you"), and **never** send a message whose purpose
is to make the learner anxious about a streak. §2.2's spirit — the system does
not punish — extends to the things it says.

---

# PHASE P10 — Maths in Sanskrit

**Blocked by:** P7. Written down so it is ready, not so it is next — shipping
a second course while the first has twenty minutes of material is how you end
up with two half-products.

Līlāvatī (Bhāskara II, 1150 CE) and the Āryabhaṭīya are **public domain,
finite, and famous** — content acquisition rather than authoring, at ₹0
marginal cost. Sanskrit number words are nouns: they decline, so the existing
grading stack grades them with no new code.

**Lead with Piṅgala, not Bhāskara.** The *Chandaḥśāstra* (c. 3rd–2nd c. BCE)
describes prosody as an exhaustive enumeration of two states, light and heavy —
a binary encoding — and contains the *meru-prastāra* (the triangle later named
for Pascal). Its *mātrāmeru* sequence is the Fibonacci sequence. It rides on
the scansion surface that already exists: a learner who has played it has been
manipulating binary strings for a week without being told so. Revealing that
costs one screen and no new content pipeline. Līlāvatī costs a numeral audit
and an authoring pass — do it second.

### ⛔ Do not ship "Vedic Mathematics"

The sixteen-sūtra system is Bharati Krishna Tirtha's, **published in 1965**,
and its claimed Vedic provenance is not substantiated. The arithmetic tricks
are fine; the label is false. The whole thesis of this product is that Sanskritam
asserts only what it can prove, and the app now shows sūtra numbers to back its
grammatical claims. An unsupported provenance claim in the maths course
discredits the derivation drawer three screens away. **Reject the brief and
escalate (§6).**

## P10-1 · Numeral coverage audit — DONE (audit) 2026-09-08; P10-2/3 STOPPED

Ran `python -m scripts.p10_numeral_audit` (no network, no spend) 2026-09-08:
**30 numerals: 20 ok · 2 unresolved (एकादश, त्रयोदश) · 8 CONFIDENT MISPARSE**
(पञ्च, सप्त, अष्ट, नव, द्वादश, चतुर्दश, षोडश, नवदश — all confident `VOC.SG`
collisions, the dangerous mode §2.2 cannot catch); **12/12 Līlāvatī vocab ok**,
0 misparse. Per this phase's own stop condition, **P10-2/3 STOP here**: this is
a frozen-analyzer question (§2.1 escalation — the analyzer is FROZEN, do not
fix it yourself), not a content task. The Piṅgala-first sequencing (one screen
on P11-1) is unaffected — it needs no numeral grading. Tests:
`tests/test_p10_numeral_audit.py` (3) pin the stop condition (पञ्च must keep
flagging `misparse` while the analyzer stays frozen). Original spec below for
reference.

**Effort:** S

The "it just works" claim is **half true, and it was measured**:

```
द्वौ बालकौ गच्छतः     confident=True   dva NOM.DU · bālaka NOM.DU · √gam PRES.3DU   ok
त्रीणि फलानि सन्ति    confident=False  (त्रीणि unresolved)                          fail
पञ्च अश्वाः धावन्ति   confident=True   pañci VOC.SG  <- wrong parse                 fail
```

Declinable low numerals work. Higher numerals do not, and `पञ्च` **mis-parses
confidently** as a vocative — the dangerous failure mode, because §2.2 only
protects the learner when the analyzer *knows* it is unsure.

Audit 1–100 plus the common Līlāvatī vocabulary against `analyze_sentence`
before authoring a single problem. Report a coverage table. **If confident
mis-parses are common, this phase stops** and becomes an analyzer question —
a §2.1 escalation, not a fix you make.

## P10-2 · Numeral systems as content

**Blocked by:** P10-1. Kaṭapayādi and Bhūtasaṅkhyā — numbers encoded as words,
words as numbers. They fit the existing `Challenge` model unchanged.

## P10-3 · Līlāvatī problems

**Blocked by:** P10-2. Verse word-problems, each a `Challenge` whose target is
the Sanskrit answer. The verse is the prompt; the arithmetic is the exercise;
the grammar is graded by the stack you already have.

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

## P14-1 · The entitlement model — DONE plumbing 2026-09-08 (pricing ⚠ owner)

`entitlements` table (migration `d1e2f3a4b5c6`) + `services/entitlement.py`
(`has_entitlement` is the ONLY reader; free surfaces always True so NO current
behaviour changes; `conversation_open` premium-gated for free tier; vendor
errors fail closed, own outages fail open; expiry degrades to free). No router
accepts a tier from the client (test asserts it). Tests:
`tests/test_p14_entitlement.py` (8) incl. the P14-2 no-hearts/energy schema
guard. Original spec below for reference.

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

Standing owner ruling: **no hearts, no energy, no meter that stops a willing
learner.** Whatever the tier structure turns out to be, the free tier must
never make a motivated learner *wait*.

Also never gated: the daily word (it is the acquisition loop — gating it breaks
the thing that brings people in), and the abstention behaviour (§2.2 is a
safety rule, not a feature).

## P14-3 · Institutional licensing — escalate, do not build

Named so it is not forgotten: temple weekend schools and cultural associations
are the only route to the upside revenue band. A seat-based institutional tier
is a **different product** with rosters, teacher accounts and reporting. **Do
not start it as a variation on P14-1.**

---

# PHASE P15 — Async social: the chain

> `श्लोक-अन्त्याक्षरी` — antākṣarī with verses. The rules need no teaching:
> every Indian family already knows them. It is also the only multiplayer mode
> a grandparent in Pune and a grandchild in New Jersey will both open.

**Blocked by:** P7-6 (needs the verse corpus it builds), P13 (a turn-based game
with no notifications is a dead game), P14 (decide what is free first).

- **P15-1** — the chain model: a room, an ordered turn list, one verse per
  turn, validated to begin on the syllable the previous verse ended on. The
  validation is `kosha` + the open subhāṣita corpus; **not** an LLM call.
- **P15-2** — invite by link. **WhatsApp-shaped**: an image, one line, a URL.
  Not an email flow, not an in-app friend graph.
- **P15-3** — family streak: a shared streak that survives one member missing a
  day. The point is to make the grandparent's participation matter to the
  grandchild, not to punish either.

⚠ **A public invite link is a public surface** — P8-2 again. Escalate.

---

# PHASE P16 — `अवधानम्`

> The boss mode, and the thing that gets written about. **Last on purpose.**

**Blocked by:** P15. Do not start before there is a product to be a boss mode
of.

The real art form, made playable: hold a line of verse, count the bell, restore
a scrambled stanza, and ignore the heckler — the traditional
*apraṣṭuta-prasaṅgī*, whose actual historical job is to break the performer's
concentration. Score is how many streams the learner held. You are not
inventing a leaderboard: **aṣṭāvadhānī** (eight streams) and **śatāvadhānī** (a
hundred) are contested titles that living performers hold.

**What to do about it now: nothing, except not precluding it.** Keep session
state able to hold more than one concurrent task (`session_store` assumes one),
and keep the scansion and derivation services stateless so four can run at
once. Both are free if you know now; both are rewrites if you find out later.

---

# PHASE P19 — Ask anywhere

> A learner stuck on the Sandhi screen has nowhere to ask. The explainer that
> would answer them **already exists, is configured, is quota-accounted, and is
> reachable from exactly one screen.**

**Blocked by:** nothing. This is the cheapest of the three new phases, because
most of it is written.

### What already exists — read this before scoping anything

| Piece | Where | State |
|---|---|---|
| The explainer | `services/explainer.py` | live |
| The endpoint | `POST /conversation/explain` | live, session-bound |
| Provider + limits | `settings.explain_*` | configured |
| Quota accounting | `check_and_consume(..., surface="explain")` | live |
| Answer language | `reply_language()` | live |

`reply_language()` exists because **Sarvam ignores "answer in the learner's
language" as a system-prompt rule** — measured: an English question came back
in Hindi. The language is resolved server-side from the learner's script and
appended as the last line of the user message. Any new caller must go through
it; do not re-solve this in a prompt.

What does **not** exist is a way to call the explainer that is not a
conversation. It resolves its subject from a session's current node and
returns `404 Nothing to explain on this session` otherwise.

## P19-1 · A session-free explain endpoint — DONE 2026-09-06

`POST /explain` (`routers/explain.py`) taking `{surface, subject, question}`,
no session. Every guarantee kept: `reply_language()` resolved server-side, the
quota check with refund on failure, `sarvam-105b-conversations` only, and the
contract that it explains already-authored text and never invents Sanskrit.

## P19-2 · Ask the engines before asking the model — DONE 2026-09-06

`services/ask_engine.py` routes by what the subject IS: a joined form goes to
`services/sandhi.py` (kosha-ranked splits), a word form to `prakriya.derive`
with sūtra-numbered steps (liṅga probed across all three — the kosha's is not
unanimous — and the derivation matching the surface wins), a verse to
`services/chandas.py` (metre name absent stays absent), a sentence to a
word-by-word parse. All local, ₹0, never metered. The LLM path remains for
meaning questions — an addition, not a replacement — and `routed_to` in the
response metadata makes the split measurable.

## P19-3 · Make it survivable at 400 calls a day — DONE 2026-09-06

Answers cache by `(surface, subject, normalised question)` (in-process, LRU
512) — a repeated identical question costs one call. Quota exhaustion
degrades to the subject + its IAST with an honest note, never a blank (§2.11).
Cache-hit rate and the routing split surface in `GET /admin/metrics` under
`explain`. Client half: U11 shipped (AskProvider + AskSheet).

**Acceptance met:** answers without a session · a sandhi question on the
Grammar screen costs ₹0 and names a sūtra · the LLM is reached only on
open-ended questions · quota exhaustion degrades honestly. Tests:
`tests/test_p19_explain.py` (10). Suite 469 → **479**.

**Effort:** M

`POST /explain` taking `{surface, subject, question}` — the screen the learner
is on, the thing on it (a sandhi pair, a paradigm cell, a verse line, a
challenge id), and what they typed. No session required.

Keep every existing guarantee: `reply_language()`, the quota check, the
`sarvam-105b-conversations` provider, and the **contract that it explains
already-authored text and never invents Sanskrit** (§12 ships no ungated
Sanskrit, and there is no Vidyut gate on this path).

⚠ **Model note.** Use `sarvam-105b-conversations`. The `sarvam-105b`
*reasoning* variant is banned from request paths (DECISIONS.md, 2026-08-29):
41% of its generate calls returned nothing at all — spent the whole token
budget thinking — and p50 latency was 42.8 s. It is already the configured
default; do not override it per-surface.

**Acceptance:** answers without a session · refuses to emit Sanskrit not
present in the subject · quota-metered · language resolved server-side, not in
the prompt.

## P19-2 · Ask the engines before asking the model

**Effort:** M. **This is the task that makes the feature good rather than
generic, and it is where the money is.**

A floating help button on a *grammar* screen walks straight into the one thing
Sarvam measurably fails: it argues the dual should be plural, false-accusing
**~50% of dual-bearing lines against Gemini's 3%** (§2.6, and confirmed on real
content 2026-09-05 — Gemini 100%, Sarvam 74%). Asking a model to explain
morphology is asking it for the answer it is worst at, at ₹0.0055 a call,
when four local engines answer the same question deterministically for ₹0.

So route by what is being asked, engine first:

| The learner is looking at | Answer from | Not |
|---|---|---|
| a sandhi join | `services/sandhi.py` — the rule and the sūtra | the LLM |
| a verb or noun form | `services/prakriya.py` — the derivation, 5,056 sūtras indexed | the LLM |
| a verse's rhythm | `services/chandas.py` — the G/L scansion | the LLM |
| a word in a sentence | `cheda` + `kosha` — segmentation and gloss | the LLM |
| "why does this matter", "say it another way" | the explainer | — |

The engines are local computation: no vendor call, no quota, no latency budget
(§2.7, §2.9). **Never meter a grammar route.**

⚠ Two standing rules apply and neither is negotiable. The derivation is an
**addition** to the LLM path, not a replacement (§6) — derivation answers
grammar, the model answers meaning; a task that appears to require deleting the
LLM path has been misread. And **absent is absent**: `chandas` returns `None`
for anuṣṭubh's metre name, so show the scansion and say nothing about the name.

**Acceptance:** a sandhi question on the Sandhi screen costs ₹0 and names a
sūtra · the LLM is reached only on open-ended questions · a route that fell
through to the model says so in its response metadata, so the split is
measurable rather than assumed.

## P19-3 · Make it survivable at 400 calls a day

**Effort:** S

`quota_llm_calls_per_day` is 400 and shared with the tutor, the edge router and
explain. An always-present button changes the call volume by an order of
magnitude, and P19-2 is most of the defence — every engine-answered question
costs nothing.

For the remainder: cache by `(surface, subject, normalised question)`, since
twenty learners stuck on `बालकः + चन्द्रम्` ask the same thing. Degrade to the
engine answer when the quota is spent, and **never to a blank** (§2.11 — a
silent empty result is a bug). Surface the cache-hit rate in
`GET /admin/metrics`.

**Acceptance:** repeated identical questions cost one call · quota exhaustion
degrades to the engine answer with an honest note, never to silence.

---

# PHASE P20 — Learning to write the script

> The app assumes you can already read Devanagari. `script_ratio` models a
> learner's *exposure* to the script; **nothing in the product teaches the
> letters.** For a Class 6 student meeting Sanskrit because CBSE made it the
> default third language, that is the first screen, and it does not exist.

**Owner decision, 2026-09-05:** recognition is **Google ML Kit Digital Ink**
for the in-app canvas and **ML Kit Text Recognition v2** for photographed
handwriting. Both on-device. This resolves the escalation that had `U4-2`
blocked since 2026-09-01 ("stroke-order data does not exist in the backend") —
see P20-2 for the half of it that ML Kit does *not* answer.

**Client half:** `UI_HANDOVER.md` **U12**. This phase is the content, the
contract and the grading.

### What ML Kit does and does not give you — scope this honestly

ML Kit Digital Ink recognises **what was written** from stroke data. It does
**not** tell you whether the strokes were made in the correct order or
direction. Those are different claims and only the first comes free.

That matters because stroke order is the thing worth teaching — it is what
makes handwriting legible and fast, and it is what a teacher corrects. So:

- *"Is this the letter आ?"* → ML Kit, on-device, free.
- *"Did you write आ the way आ is written?"* → needs reference stroke data,
  which is P20-2 and is authored, not downloaded.

Do not let the second quietly become the first. A drill that says "correct"
to a letter drawn in four backwards strokes is teaching a habit that has to be
untaught later.

## P20-1 · The syllabary and word corpus — DONE 2026-09-06

`writing_items` + `writing_attempts` tables (migration `b7c8d9e0f1a2`,
applied — `alembic current == heads`). Seeded additively (§2.13) by
`seeds/writing_items.py`: tier 1 = the varṇamālā in articulation order
(reusing `seeds/varnamala.py`, never re-typed), tier 2 = mātrā forms on the
carrier consonant क, tier 3 = whole words drawn from APPROVED challenge rows
(`challenge_id` link, no duplication; curated fallback while the pool is
thin). IAST is lipi-derived at seed time (P7-13). Unique `(tier, devanagari)`
makes the seed idempotent at the schema level (§2.14). Endpoints:
`GET /writing/items`, `POST /writing/attempt`. Tests: `tests/test_p20_writing.py`.

## P20-2 · Stroke-order reference data — DONE 2026-09-06

49 akṣaras authored from scratch in `seeds/stroke_data.py` (14 vowels, 33
consonants incl. nasals, anusvara, visarga) — ordered stroke paths with
pen-travel direction, in a 0–100 guide box with the śirorekhā at y=10.
Provenance and licence recorded in `DECISIONS.md` 2026-09-06: original work,
nothing copied from any chart. Verified by rendering every letter
(`scripts/verify_strokes.py` → `results/stroke_sheets/strokes.png`) and
comparing by eye against rendered letterforms. The seed attaches paths to
`writing_items` rows idempotently; letters without authored paths return None
and the client degrades to the reference render — absent is absent.

## P20-3 · The grading contract — DONE 2026-09-06

`services/writing.py`: three-valued verdict. correct = confident recognition
of the target; unsure = everything else, and the router reaches the
mastery/streak path ONLY from the correct branch — an `unsure` provably
cannot lower mastery or break a streak (test asserts it against the DB).
Thresholds live in config (`writing_*_confidence`), not literals. The request
schema has NO field for strokes or an image (§2.16) — extra fields are
dropped by pydantic and the test proves they never reach the DB. Client half:
U12 shipped (StrokePathPlayer, WritingCanvas, inkRecogniser seam — on-device
ML Kit only, cloud recognition deliberately absent).

## P20-4 · Reading handwriting from paper — backend ready, photo client pending

Per-source abstention rate is reported in `GET /admin/metrics` under
`writing` (P20-4's "a number the owner can see"), and the photo path's
thresholds bias hard toward `unsure` (`writing_photo_*` config — a higher
correct floor and a lower wrong ceiling; tested). The server side of the
contract is complete: `source: "photo"` posts exactly like ink. What remains
is the camera flow itself (U12-4's viewfinder), which needs the ML Kit Text
Recognition dev build first.

**Effort:** M

What gets drilled, in what order. Three tiers:

1. **The varṇamālā** — the 13 vowels and 33 consonants already modelled in
   `U4-1`'s `phonetics.ts` and the `features` table. Articulation order, which
   is the order the tradition teaches and the order the mouth learns:
   कण्ठ्य → तालव्य → मूर्धन्य → दन्त्य → ओष्ठ्य.
2. **Mātrā forms** — the vowel signs on a consonant (क का कि की कु कू). This is
   where beginners actually fail, and it is the step most apps skip.
3. **Whole words.**

⚠ **On the worked example in the brief (`Kite` → `पतंग`):** पतंग is Hindi. In
Sanskrit **पतङ्ग** means a bird, a moth, or the sun — not a paper kite. Using
Hindi vocabulary to teach the script is a legitimate choice, but it makes this
a Hindi-literacy module inside a Sanskrit app, and it spends the drill on words
the learner will never meet again here.

**Draw tier 3 from the challenge pool instead.** बालकः · गृहम् · पुस्तकम् ·
चन्द्रः are already authored, already gated by Vidyut, already glossed, and
already carry pre-rendered audio (P17-4). The script drill then primes the
vocabulary the learner meets in a challenge the same week, at zero content
cost. If the owner still wants a Hindi on-ramp, that is a separate, labelled
tier — not a silent mix.

**Depends on P7-13.** Every one of these surfaces shows IAST beneath the
Devanagari, and 49% of it is currently wrong.

**Acceptance:** a `writing_items` table with tier, order, the target
Devanagari, its `lipi`-derived IAST and a gloss · seeded, not LLM-authored ·
tier 3 references existing challenge rows rather than duplicating them.

## P20-2 · Stroke-order reference data — the part ML Kit will not give you

**Effort:** M. **This is the residue of `U4-2`'s escalation.**

48 letters plus the mātrā forms, each as an ordered list of SVG paths, one per
stroke, in the order a teacher writes them. It is bounded, hand-authorable, and
verifiable by eye — which is exactly why it was worth escalating rather than
guessing, and why it is tractable now that someone has decided to do it.

It powers two things the recogniser cannot: the **animated demonstration**
(U12-1) and **per-stroke feedback** on order and direction.

⚠ **Provenance.** Stroke-order charts are frequently copyrighted. Author these
against a freely-licensed source or from scratch, and record the source in
`DECISIONS.md`. Do not scrape a textbook. See §6.

**Acceptance:** every varṇamālā letter has ordered stroke paths · each renders
and animates correctly at 18pt and at 200% scale (`UI_HANDOVER` §3, U5-2) · the
source is named and its licence recorded.

## P20-3 · The grading contract — and the abstention rule that governs it

**Effort:** M

A writing attempt posts `{item_id, recognised_text, confidence, source}` where
`source` is `ink` or `photo`. **Never the strokes, never the image** (§2.16).

The verdict is three-valued, and this is not a style preference — §2.2 is an
invariant and this is the surface most likely to break it:

- **correct** — the recogniser returned the target with high confidence.
- **unsure** — anything else. Show the reference letter, offer the animation,
  invite another try. **It never counts as wrong, never breaks a streak, never
  moves mastery down.**
- **wrong** — reserved for a *confident* recognition of a *different* letter.
  This should be rare and it should be tuned to stay rare.

A first attempt at an unfamiliar script is the single worst place in this
product to be confidently wrong at someone. When the recogniser and the learner
disagree, **the recogniser is the one that abstains.**

Writing feeds mastery the way pronunciation does — an `unsure` contributes
nothing rather than a penalty. Follow `pronunciation_attempts` for the shape;
do not invent a second pattern.

**Acceptance:** an `unsure` verdict provably cannot lower mastery or break a
streak (a test asserts it) · no image or stroke array is accepted by any
endpoint · thresholds live in config, not in a literal.

## P20-4 · Reading handwriting from paper — ⚠ privacy-gated

**Effort:** M

Owner decision: **included.** The concern was raised and reaffirmed, and it is
recorded here rather than re-argued — handwritten Devanagari OCR from a phone
photo is materially less reliable than stroke recognition, especially for a
beginner's letterforms, and ML Kit Text Recognition v2 is built for printed
text. **Design for that instead of hoping against it:**

1. **Bias the thresholds hard toward `unsure`.** On the photo path, a
   disagreement is a failure to read, not a failure to write.
2. **Never a bare rejection.** An unreadable photo shows the reference letter
   beside the crop and asks the learner to judge — which is what a teacher
   does with a bad photocopy, and it costs nothing.
3. **The image is processed on-device and discarded** (§2.16). It does not
   reach the server, the logs, or a crash report.
4. **Report the abstention rate** in `GET /admin/metrics`, split by `source`.
   If the photo path abstains on most attempts it is not helping, and that
   should be a number the owner can see, not a suspicion.

**Acceptance:** the photo path cannot produce `wrong` below a configured
confidence floor · no image leaves the device · abstention rate is reported per
source · the flow works with no network at all.

---

# PHASE P21 — The canon, made readable — P21-1 + P21-2 DONE 2026-09-06

> Upaniṣads, Purāṇas, the Mahābhārata, the Āyurvedic saṃhitās. **The catalogue
> is not the product** — archive.org has had these texts for twenty years. What
> nothing else has is *tap any word and four engines answer*.

**Blocked by:** P8 (there is no point instrumenting a library nobody has opened
yet) and P7-13 (the reader is mostly IAST for its first audience).

### Three constraints to settle before scoping — all three are hard

**1. NCERT/CBSE textbooks are copyright.** They cannot be shipped, extracted,
or paraphrased chapter-by-chapter. Align to the *syllabus* — the śabdarūpa and
dhāturūpa tables, the prescribed verses, the exam question shapes — all of
which are facts and generated content, not the book. **The textbooks come off
the list.** See §6; this is a legal line, not a preference.

**2. You cannot voice these.** The Mahābhārata is ~10M characters. At Bulbul's
₹30/10K that is **₹30,000+ for one text**, against a ₹25,000 grant of which
~₹0.11 is spent. Audio goes only on what is actually studied — the śloka of the
day, an approved passage — never on a corpus import. An import script that
calls TTS is a §6 escalation.

**3. The sources that are actually free** are GRETIL and the DCS (~4.8M
manually tagged words, sandhi-split, morphologically analysed). Both are
machine-readable and openly licensed. Record the per-text licence at import; it
varies by item, and "it was on the internet" is not a licence.

## P21-1 · One text, fully instrumented — not a shelf — DONE 2026-09-06

`GET /shlokas` (`routers/shlokas.py`) returns the whole corpus in date order,
auth-bound, with the already-populated `word_breakdown` on every row — word,
meaning and features per word. That is the reader's instrumentation. Tested in
`tests/test_shloka_reader.py` (auth, date-order determinism, breakdown present).
Client surface is `UI_HANDOVER.md` U13 (`mobile/src/screens/Reader.tsx`;
the reading page-turn is `mobile/src/components/PageFlip.tsx`).

Prove the surface against a corpus you own **before** importing anything. It is
proven now; a second text is an import script, not a feature — and if it is not
good, twelve texts will not fix it.

## P21-2 · Tap a word, the engines answer — DONE 2026-09-06

The reader taps a word and opens U11's `AskSheet` with the word as subject
(`surface:"shloka"`). The engine path (`parse`/`split`/`scansion`) runs P19-2's
single routing table — built once in P19, consumed here exactly as written. A
tap also shows the inline gloss + feature chips straight from `word_breakdown`
(₹0, instant). Nothing synthesised on this surface; all local engines before
any model.

⚠ `chandas` scansion is reliable; **metre naming is not.** It returns `None`
for anuṣṭubh, which is variable and absent from the 145-vṛtta table. Show the
G/L pattern; never fill the name with a guess or an LLM call (§6).

## P21-3 · Import a second text — DONE 2026-09-07

`scripts/import_text.py` (dry-run default, idempotent by `source_ref`,
licence REQUIRED, no TTS — test asserts `audio_url == ""`, engine floor ≥2
confident breakdown words, dates continue past max). First import: Gītā 2.1–6,
6/6 verses, 0 skips, corpus 96 → 102 with zero UI work (same `GET /shlokas`).
Backup `app.db.bak-20260907`. Tests: `tests/test_p21_import.py` (4).

## P21-4 · Everything about the shelf — DONE 2026-09-08 (decided: most depth, all free)

Editorial position (owner delegated): **Gītā full spine (700) → Hitopadeśa →
Nītiśataka → Īśā whole → Kaṭha → Rāmāyaṇa → Mahābhārata (indexed) →
Pañcatantra → Subhāṣita → Muṇḍaka → Āyurveda (indexed) → Siṃhāsana** — 12
texts in `canon_texts` (migration `e2f3a4b5c6d7`, `seeds/canon.py`, additive).
Depth: `full` = every verse instrumented, `studied` = curated passages,
`index` = catalogue only (epics/Āyurveda wait for curated selections; NEVER
bulk-import — ~10M chars is ₹30,000+ of TTS and §6 forbids TTS on import).
**All reading FREE** — the reader is reference/acquisition; gating any of it
is a pricing decision (§6), not a default. First depth delivered: **Īśopaniṣad
18/18** (Vedic register slice; wikisource CC BY-SA transcription recorded;
backup `app.db.bak-20260908`; corpus 102 → 120). `GET /canon` serves order +
live imported counts + coverage; Reader shows a text filter over the same
flat flip list. Tests: `tests/test_p21_canon.py` (6). Original spec below for
reference.

---

# PHASE P22 — Curriculum — DONE minimal 2026-09-07 (WordNet/DCS imports deferred on licence)

> The engine derives every form, sūtra-by-sūtra, for ₹0. The Path now offers
> Lesson → Practice → Challenge via `has_lesson`. Full strategy:
> [`CURRICULUM.md`](CURRICULUM.md).
>
> What shipped: P22-1/3/4 (`lessons` table, migration `c9d0e1f2a3b4`,
> `GET /lessons/{feature_id}` honest 404, 10 Units 1–3 lessons in original
> prose with equality-checked Vidyut examples), P22-2 (10 samāsa/kāraka
> taxonomy features, unclaimed by design, no band references them), P22-5/6
> minimal (`vocab_words` 60 rows original glosses, `reader_passages` 3 tiers
> from servable content). WordNet cross-reference and the DCS import are
> deferred pending the §6 licence confirmations. The UI half is
> `UI_HANDOVER.md` U14 (U14-1/2/3 + minimal U14-4/5 shipped).

**What exists already (read before scoping):** the derivation player
(`prakriya.derive` with sūtra-numbered steps), the paradigm grids
(`prakriya.paradigm`), the sandhi visual (`services/sandhi.py`), and the
`AskProvider`/`AskSheet` ask-anywhere path (P19/U11). The feature taxonomy is
`app/seeds/features.py` (~40 features). A Lesson is the *missing* content type
that sits in front of all of it.

## P22-1 · The Lesson content type — DONE 2026-09-07

`app/models.py` `Lesson` + migration `c9d0e1f2a3b4` + `services/lessons.py` +
`routers/lessons.py` + `seeds/lessons.py` + `tests/test_p22_lessons.py` (8).
Example verification is equality (seed stores an example only when
`prakriya.derive` reproduces its surface form EXACTLY). See the phase header
for the rest.

## P22-2 · Samāsa and kāraka features — DONE 2026-09-07 (taxonomy-only by design)

10 features (samāsa ranks 81–84, kāraka 91–96). No band references them (test
asserts it); `p712_feature_coverage.py --coverage` names them "unclaimed by
design". Challenge coverage is a later analyzer question (§2.1, do not fix the
analyzer yourself). Original spec below for reference.

Two grammar domains are absent from the taxonomy entirely, and both are
blockers (see `CURRICULUM.md` §3.2):

- **Samāsa** — the 4 compound types (`dvandva`, `tatpuruṣa`, `bahuvrīhi`,
  `avyayībhāva`). Blocks the Reader surface: classical text is dense with
  compounds.
- **Kāraka** — the 6 thematic relations (`kartṛ`, `karma`, `karaṇa`,
  `sampradāna`, `apādāna`, `adhikaraṇa`). Blocks the "why was I wrong?"
  explanation: the engine can name the vibhakti but not the semantic role.

Add feature IDs to the seed, ranked after the existing sandhi block (samāsa
~rank 80, kāraka ~rank 90). **Do not force these into challenge bands yet** —
the Vidyut analyzer cannot derive samāsa/kāraka (the frozen-analyzer coverage
gap noted in `briefs.py`), so a band would generate nothing approvable. These
are *taxonomy* features first; challenge coverage is a later analyzer question
(§2.1 escalation, do not fix the analyzer yourself).

**Acceptance:** new feature IDs seed cleanly · `p712_feature_coverage.py`
reports them as *unclaimed by design* (not as a generation gap) · no band in
`briefs.py` references them.

## P22-3 · Lesson text for Units 1–3 — DONE 2026-09-07 (original prose, licence-clean)

10 lessons shipped; bodies are ORIGINAL Sanskritam prose so the
learnsanskrit.org licence question never arises. If a future pass adapts
external prose, the exact licence lands in the row's `provenance` first (§6).
Original spec below for reference.

**⚠ Licence first (§6).** The lesson text is adapted from learnsanskrit.org
(open source). Confirm the exact licence on the source *before* copying any
prose; paraphrase where the licence requires it, attribute where it demands
it. Do not paste text verbatim on the assumption that "it's a free website".

Author 200–500-word lessons for the first three units of the
`CURRICULUM.md` §6.2 spine — Sounds (the 5×5 varṇa grid), First Words
(NOM.SG/ACC.SG/PRES.3SG — "what is a case? what is a verb?"), More Cases (the
remaining vibhaktis). Each lesson: the explanation, 2–3 Vidyut-verified
examples, and the `visual_type` the client renders (grid for declension, grid
for the varṇa matrix, `none` for the prose intro).

This is content acquisition, not engineering — the slow part is writing
correct, non-hallucinated Sanskrit that the engine confirms. Quality bar: a
pandit reading a lesson must find zero errors. Escalate any form you cannot
prove rather than shipping it.

**Acceptance:** Units 1–3 lessons present and `examples[*]` all Vidyut-verified ·
lessons read correctly in the Grammar tab · provenance recorded per lesson
(which source, which licence).

## P22-4 · Path → Lesson → Challenge — DONE 2026-09-07

Path node response exposes `has_lesson` (`routers/grammar.py`,
`services/lessons.py::lesson_feature_ids`); `Path.tsx` routes Learn →
Practice → Challenge. No change to the grading/adaptive path. Original spec
below for reference.

The Path node currently launches a Challenge directly (`mobile/src/screens/
Path.tsx` `onStartUnit`). Re-point the spine so a node offers **Lesson first,
then Challenge** — the flow is `Lesson → Practice → Challenge`. Backend side is
a contract change: the path node response already carries `approved_count`;
add `has_lesson` so the client can route. Do not change the grading path.

**Acceptance:** path node response exposes `has_lesson` · a node with a lesson
routes to it before the challenge · no change to the grading/adaptive path.

## P22-5 · Vocabulary curriculum — DONE minimal 2026-09-07 (WordNet deferred on licence)

`vocab_words` 60 rows / 10 topics, original glosses, examples drawn from
Vidyut-gated approved challenges (only 7/60 have pool sentences yet, rest
`examples: []`). `GET /vocab/{topic}` frequency-ordered. WordNet
cross-reference deferred pending the §6 licence confirmation; each row's
`provenance` says so. Tests: `tests/test_p22_vocab_reader.py` (10). Original
spec below for reference.

**⚠ Licence.** Sanskrit WordNet (IIT Bombay) is CC BY-SA 4.0. Confirm the
licence on the exported data before ingesting; record it in the seed.

Cross-reference WordNet lemmas (66,930 words, 46,440 synsets) against DCS
frequency to produce the top ~500 words, grouped by the 10 topic slugs already
in `app/seeds/briefs.py` (`SITUATIONS`). Each entry: Devanagari, IAST, gloss,
gender, stem, 2–3 example sentences. Ship the vocabulary as additive seed rows,
not a live external call — this is static content (§2.7 does not apply, but
no network in the seed either).

**Acceptance:** `GET /vocab/{topic}` returns frequency-ordered word lists ·
every word carries gender + stem + examples · seeded idempotently · licence
recorded.

## P22-6 · Graded reading — DONE minimal 2026-09-07 (DCS import deferred on licence)

`reader_passages` 3 tiers from already-servable content (`GET /reader/{tier}`).
The DCS extraction (50/50/50) is deferred pending licence + analyzer coverage
for compounds. Tests: `tests/test_p22_vocab_reader.py` (10). Original spec
below for reference.

Extract simple sentences from the DCS corpus (650K+ parsed lines, openly
licensed — record the licence) graded by sentence length, features present, and
compound presence. Three tiers: 50 simple (Units 2–3) → 50 with sandhi (Unit 6)
→ 50 with compounds (Unit 10). Each sentence carries Devanagari, IAST,
word-by-word breakdown, and the Vidyut parse. This is the Reader's graded
material, distinct from P21's śloka corpus.

**Acceptance:** `GET /reader/{tier}` returns graded sentences · every sentence
parses through the engine · licence recorded per source · additive seed.

---

---

## 5. Definition of done

1. The task's stated **Acceptance** passes.
2. `./.venv/Scripts/python.exe -m pytest -q` (from `backend/`) at or above
   **557**.
3. `cd mobile ; npx tsc --noEmit` → **0 errors**.
3b. **`alembic current` equals `alembic heads`.** A written migration is not
   a run migration, and the suite cannot tell the difference (§3).
4. New behaviour has tests. New tests do not hit the network.
5. **If the task touches a vendor path, one live smoke call proves it** — the
   suite mocks every provider and will not catch a wiring break (§3).
6. No file outside the task's **Touch** list modified.
7. Committed with the task ID in the message (`feat(P17-1): ...`).
8. A changed product rule gets a dated entry in `DECISIONS.md`.

---

## 6. When to stop and escalate

- **Any spend of the Sarvam grant beyond an approved batch.** P7's ~₹47
  envelope covers authoring and the P17 render pass. A re-render of already
  rendered audio, or a new order of magnitude, is a new decision. **An
  authoring replay that misses the cache is a spend** — stop and report it
  (P7-8), do not push through.
- **Deleting content rows in bulk** — deduping, pruning, re-seeding. Back the
  database up first (§2.13) and report the row count before and after.
- **Rebuilding, deleting or re-creating `backend/app.db`** (§2.13). It holds
  authored content that cost money and learner rows that cannot be recreated.
  Back it up, write a migration, and if you rebuild anyway say what was lost.
- **Any task that seems to require editing** `analyzer.py`, `engine.py`, or
  `adaptive.py` semantics (§2.1). P10-1 may surface one of these.
- **RAG or retrieval work** — see §4.
- **The sūtra curriculum** (the Aṣṭādhyāyī as a second learning track) — a
  pedagogy decision, not an engineering one. 5,152 sūtras is not a syllabus;
  the first 100 in teaching order might be.
- **A public derivation viewer, a server-rendered share card, or a public
  invite link** — each is a public deployment and therefore a platform choice
  (P8-2).
- **Platform choices** — hosting, object storage, payments, privacy.
- **Anything in P14** — prices, tiers, free limits, trial length, store
  accounts. The plumbing is specifiable; the business model is not yours.
- **P14-3, institutional licensing** — a different product, not a tier variant.
- **Adding hearts, energy, lives or any meter that stops a willing learner**
  (P14-2). Standing owner ruling; there is no version of this to negotiate.
- **A seventh bottom tab** (`UI_HANDOVER.md` U8-1). Six is the decided maximum
  and already at the width limit.
- **The mascot rig** (`UI_HANDOVER.md` U1, `rive_ui.md`) — the owner is
  working in it directly. Do not edit the Rive file or U1.
- **Store submission and Apple/Google sign-in.**
- **Anything that would make an `unsure` verdict penalize a learner** (§2.2).
- **A test you cannot make pass without weakening it.** Report it instead.
- **Loosening the Vidyut gate to raise a pass rate.**
- **Removing, bypassing or deprecating the LLM explainer** to "replace it"
  with derivations. The owner has ruled: the derivation is an *addition*.
  Derivation answers grammar; the LLM answers meaning. If a task appears to
  require deleting the LLM path, you have misread the task — stop.
- **Any content claiming provenance the project cannot support** — "Vedic
  Mathematics" as ancient (P10), Sanskrit as the world's oldest language, or
  the "NASA declared Sanskrit best for computers" claim, a documented
  misreading of Briggs (1985). The app shows sūtra numbers as proof;
  unprovable claims elsewhere discredit that. Reject the brief.
- **Showing a metre name the engine did not return.** Absent is absent; do not
  fill it with a guess or an LLM call.
- **Shipping, extracting or paraphrasing an NCERT/CBSE textbook** (P21). They
  are copyright. The syllabus is a fact and the tables are generated; the book
  is not yours. Align to the first, never reproduce the second.
- **Importing any corpus without recording its per-text licence** (P21).
  GRETIL and the DCS are open; "it was on the internet" is not a licence.
- **Any TTS call in a corpus import path** (P21). The Mahābhārata is ~10M
  characters — ₹30,000+ at Bulbul rates, against a ₹25,000 grant. Audio goes
  on what is studied, never on an import.
- **Sending a learner's handwriting image or raw strokes anywhere** (§2.16).
  On-device recognition is the reason ML Kit was chosen over Cloud Vision;
  routing around it for accuracy reverses an owner decision.
- **Letting a recogniser return `wrong` where it should return `unsure`**
  (§2.2, P20-3). A first attempt at an unfamiliar script is the worst place in
  this product to be confidently wrong at someone.
- **Copying stroke-order charts from a textbook** (P20-2). Frequently
  copyrighted. Author them or use a freely-licensed source, and record which.
- **Pasting lesson or vocabulary text from a website without confirming its
  licence** (P22-3, P22-5). learnsanskrit.org and Sanskrit WordNet are
  open-source; neither is a free pass. Confirm the exact licence, record it
  in the seed, and paraphrase where the licence requires it. "It was on a
  free website" is not a licence — same rule as corpus import (P21).

---

## 7. Quick reference

```
All backend commands run from backend/ (§2.10), with UTF-8 (§3).
PowerShell 5.1 has no &&.

Backend tests (baseline 557):
  cd backend
  ./.venv/Scripts/python.exe -m pytest -q

The DB is on the current schema — NOT optional (§3). A green suite hid a
dead app once already:
  ./.venv/Scripts/python.exe -m alembic current   # must equal `alembic heads`

Mobile typecheck (baseline 0 errors):
  cd mobile ; npx tsc --noEmit

Review the queue — offline, spends nothing, THE BLOCKER:
  ./.venv/Scripts/python.exe -m scripts.review_scenarios --challenges --packet q.md
  ./.venv/Scripts/python.exe -m scripts.review_scenarios --challenges --approve-band DAT.SG
  ./.venv/Scripts/python.exe -m scripts.review_scenarios --packet scenarios.md
  The challenge packet is band-sorted with near-duplicates adjacent.
  Approve by band; 231 rows one at a time is how this stalls again.

Content cost estimate (SAFE — spends nothing):
  ./.venv/Scripts/python.exe -m scripts.author_batch --dry-run

Author a batch (SPENDS — inside the approved ~₹47 envelope):
  ./.venv/Scripts/python.exe -m scripts.author_batch --live --limit 5
  A replay of an already-authored brief is a CACHE HIT and costs ₹0.
  Watch for "authoring cache hit" in the log — a miss means STOP.

Generate challenges (SPENDS; dry-run is the default):
  ./.venv/Scripts/python.exe -m scripts.challenge_batch --dry-run
  Inserts are idempotent since P7-10 — a re-run of an exhausted band adds
  0 and says so. Judge a run by DISTINCT rows added, never by "inserted".
  Dual-bearing bands route to Gemini (§2.6): 100% vs Sarvam's 74%.

Feature coverage (SAFE):
  ./.venv/Scripts/python.exe scripts/p712_feature_coverage.py --enrich

Pre-render audio (SPENDS; idempotent, skips rendered rows):
  ./.venv/Scripts/python.exe -m scripts.render_app_audio --dry-run

BACK UP THE DB BEFORE ANY SEED/MIGRATE/REBUILD/DEDUPE WORK (§2.13):
  copy backend/app.db backend/app.db.bak-YYYYMMDD
  Then run a destructive migration against the COPY and diff the row
  counts before running it for real (§2.15). rowid is NOT id.

Alembic head:  e2f3a4b5c6d7   (applied 2026-09-08)

Order:  P8-0  review the queue — 5 scenarios + 231 challenges  ⚠ OWNER
        then  P10 (stopped: analyzer escalation) → P15 → P16
        DONE: P7-5, P7-7, P7-13, P8-4, P8-5, P13-1, P14 plumbing, P19, P20-1/2/3, P21-1/2/3/4, P22 minimal

Owner-gated:  the review queue (P8-0) · RAG · the sūtra curriculum · any
              public surface · all of P14 · institutional licensing · P8-5
              platform choices · the mascot rig · the canon's contents
              (P21-4) · NCERT/CBSE text reuse — see §6

State of play right now (§4):
  1. 5 scenarios + 231 challenges PENDING — the only real blocker, and it
     GREW this week
  2. Talk still has ONE dialogue until those 5 are approved
  3. coverage is 33 of 37 in the pool but 24 of 37 for learners — nine
     features have rows and zero approvals, all four sandhi among them
  4. IAST: 0 mismatches (P7-13 DONE 2026-09-06; invariant test guards)
  5. the śloka and daily-word wells refilled: 120 and 30; lessons 10, vocab 60,
     graded reading 3 tiers, canon 12 texts (Īśā 18/18, Gītā spine planned full)
  6. every APPROVED row already has pre-rendered audio; the rest follow
     automatically once approved

A green test suite does not mean a working app. `alembic current` (§3).

Client navigation is UI_HANDOVER U8 and it is DONE: six tabs
  Home · Path · Talk · Play · Grammar · Progress
  + left drawer for settings and account.
  Śloka and Varṇamālā are Home cards, not tabs.

All four vidyut engines are live and are LOCAL computation — no vendor call,
no quota, ₹0. Never add metering to a grammar route. P19-2 is built on
exactly this: ask the engines before you ask the model.
```
