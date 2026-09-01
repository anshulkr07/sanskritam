# Shabd — Backend Handover

**Audience:** an implementing coding agent (DeepSeek-V4-Flash / Hermes).
**Revised:** 2026-09-01 — **phases P0–P5 are complete.** This document now
carries the audit of that work and the phases that follow.
**Companion doc:** [`UI_HANDOVER.md`](UI_HANDOVER.md) — client, motion, mascot.

---

## Status

| | |
|---|---|
| Backend tests | **294 passing** |
| Mobile typecheck | **0 errors** |
| Alembic head | `a1b2c3d4e5f6` |
| Phases done | P0 (safety), P1 (identity), P2 (content tooling), P3 (pronunciation), P4 (retention), P5 (platform prep) |
| **Content in the DB** | **37 challenges · 1 scenario · 3 shlokas — unchanged** |

That last row is the whole point of P7. The authoring pipeline was built and
tested across P2 and has **never been run**; `backend/results/authoring/` does
not exist.

### Audit of P0–P5 (2026-09-01)

**Verified correct** — these were the things most likely to be got wrong:

- `DELETE /me` uses `sa.text()` (an earlier raw-string version would have
  raised `ArgumentError` on SQLAlchemy 2.0 the first time anyone deleted an
  account).
- **Pronunciation honours the abstention principle.** Silence → `unsure`,
  out-of-class mismatch → `unsure`, only a within-class mismatch →
  `incorrect`. This is the invariant that matters most (§2.2) and it held.
- 50 briefs, all 24 feature IDs valid against the real taxonomy, slugs unique.
- Quota was extended to pronunciation STT beyond what the spec asked for.

**Found and fixed** — see P6-0 below:

- 🔴 **The learner-local date bug.** `progress.py` computed the daily date in
  server UTC. Fixed 2026-09-01.

**Found and still open** — these are P6:

- 🟡 LLM calls are unmetered (P6-1).
- 🟡 ~1,240 lines of client work sit uncommitted (P6-2).

---

## 1. Repo map

```
D:\Projects\Shabd\
├── architecture.md          the design bible. §-numbers below refer to it.
├── DECISIONS.md             dated decision log. Append, never rewrite.
├── HANDOVER.md              this file — backend
├── UI_HANDOVER.md           client / motion / mascot
├── specs/                   5 feature specs
├── backend/
│   ├── app/
│   │   ├── main.py          app factory, router registration, lifespan
│   │   ├── config.py        pydantic-settings. ALL new config goes here.
│   │   ├── db.py            engine, get_db, init_db, schema-drift guard
│   │   ├── models.py        SQLAlchemy models
│   │   ├── schemas.py       Pydantic request/response
│   │   ├── auth.py          require_learner, require_admin
│   │   ├── adaptive.py      SM-2 mastery + selection            ⚠ FROZEN
│   │   ├── grading/
│   │   │   ├── analyzer.py  Vidyut morphology                   ⚠ FROZEN
│   │   │   └── engine.py    variant grading                     ⚠ FROZEN
│   │   ├── routers/         health auth me challenges attempts shlokas
│   │   │                    grammar admin pipeline speech conversation
│   │   │                    authoring progress pronunciation
│   │   ├── services/        sarvam turn_loop authoring edge_router
│   │   │                    explainer meta_intent session_store
│   │   │                    quota metrics pronunciation localtime
│   │   ├── evals/           LLM eval harness
│   │   └── seeds/           challenges(37) dialogue(1) shlokas(3)
│   │                        varnamala features briefs(50)
│   ├── migrations/versions/ head: a1b2c3d4e5f6
│   ├── tests/               22 modules, 294 tests
│   └── scripts/             author_batch, challenge_batch, benches
└── mobile/                  Expo + React Native — see UI_HANDOVER.md
```

---

## 2. Invariants — never violate these

Unchanged and still binding. Each one, if broken, silently destroys something
the project depends on.

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

Every grading surface carries this. A noisy ASR result is not evidence the
learner was wrong. **Never introduce a code path that penalizes on
uncertainty** — in the backend or in the UI.

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
- Dual-number content: Sarvam false-accuses ~50%. Route dual-bearing content
  to Gemini.

### 2.7 No local models, ever

API-only. Never `import torch`/`transformers`/`sentencepiece`, never add a
model download step. If a task looks like it needs a local model, it doesn't —
escalate.

### 2.8 Learner-local time, never server time

Any date a learner *experiences* — the daily goal, the activity row, the
streak boundary, a notification send time — is resolved in **their** timezone
via `app/services/localtime.py`. Never `datetime.now(timezone.utc).strftime(...)`
for a user-facing day. See P6-0 for why this is its own invariant.

### 2.9 Voice and LLM calls cost real money

Every TTS character, ASR second, and LLM token bills a prepaid grant. Any new
third-party call goes through `quota.check_and_consume` **before** the network
request. No exceptions, no "just this one endpoint".

---

## 3. Environment and the verification loop

Windows. PowerShell primary; a Bash tool is also available.

```bash
# Backend — baseline 294
cd backend && ./.venv/Scripts/python.exe -m pytest -q

# Server (port 8001, not 8000 — a phantom socket on 8000 intercepts)
cd backend && ./.venv/Scripts/python.exe -m uvicorn app.main:app --port 8001

# Mobile — baseline 0 errors
cd mobile && npx tsc --noEmit

# New migration (hand-write upgrade/downgrade)
cd backend && ./.venv/Scripts/python.exe -m alembic revision -m "description"
```

Five `UserWarning`s about a field named `register` are pre-existing; ignore.

**Run all three after every task.** If a count drops, you broke something —
fix it. Never disable, skip, or weaken an existing test to go green.

---

## 4. What comes next

| Phase | Theme | Gate |
|---|---|---|
| **P6** | Close the remaining gaps | none — do these first |
| **P7** | **Content at volume** — the biggest lever in the project | ⚠ owner approves spend |
| **P8** | First real users | P7 |

### Explicitly NOT next: RAG

Retrieval is the most technically appealing next step and close to the least
valuable right now. [`architecture.md`](architecture.md) §4.6 already calls it
"smaller than it looks," and §15 lists its quality as unmeasured.

RAG improves the *quality* of authored content and explanations. **You cannot
tune quality against 1 scenario of content and 0 users telling you what is
wrong.** It becomes the right investment somewhere around P7's output volume,
with real escape-rate data pointing at what retrieval should fix. Not before.
**Do not start RAG work without an explicit owner decision.**

---

# PHASE P6 — Close the remaining gaps

## P6-0 · Learner-local day boundary ✅ DONE 2026-09-01

**The bug:** `progress.py` computed the daily-activity date as
`datetime.now(timezone.utc).strftime("%Y-%m-%d")`, and `Learner` had no
timezone. In IST (UTC+5:30) that credits everything practised between 00:00
and 05:30 local to the **previous** day. A learner who studies Monday 23:00
and again Tuesday 01:00 gets both credited to Monday, Tuesday records nothing,
and the streak breaks after two consecutive days of real practice. Late-night
study is exactly when working adults and students use these apps.

**The fix, as shipped:**

- `app/services/localtime.py` — `resolve_tz`, `local_date`, `local_date_of`,
  `learner_today`. Resolution **never raises**: an unknown, empty, or
  malformed IANA key degrades to UTC, because a wrong-by-hours date is a much
  smaller failure than a 500 on the progress screen.
- `Learner.timezone` (IANA string, default `"UTC"`), migration
  `a1b2c3d4e5f6`. Existing rows default to UTC, so **no learner's streak
  shifts as a result of the migration.**
- Settable at `POST /auth/anonymous` and via `PATCH /me`; a returning device
  with a changed timezone updates the learner, so travel follows the device.
- **`tzdata` added to `requirements.txt`.** Windows ships no IANA database and
  `zoneinfo` raises `ZoneInfoNotFoundError` without it — verified on this
  machine. Minimal Linux containers frequently lack it too, so this would have
  failed in production as well as in dev.
- `tests/test_localtime.py` — 21 tests, including the exact Monday-evening /
  Tuesday-small-hours regression, a UTC+14 vs UTC−11 pair that can never share
  a date, and junk-timezone degradation.

**Anything that computes a user-facing day from now on uses
`localtime.learner_today(learner)`.** That is now invariant §2.8.

---

## P6-1 · Meter the LLM calls

**Why:** `check_and_consume` appears only in `routers/speech.py` and
`routers/pronunciation.py`. Two paths still bill Sarvam with no quota at all:

- **`services/edge_router.py`**, called from `turn_loop.py` whenever
  deterministic phrase matching fails. Read the comment there: real replies
  ("Haa", "Ji", "nahi") *always* slip past the matcher, so this is the common
  path in conversation, not an edge case.
- **`POST /conversation/explain`**, one LLM call per request, unbounded.

TTS and STT are capped; a learner in a conversation loop can still drain the
grant through the router without touching a metered endpoint. **The money hole
is currently half closed.**

This gap is the spec's fault, not the implementer's — P0-2 scoped quota to the
speech endpoints only.

**Blocked by:** nothing. **Effort:** M

**Touch:** `app/services/quota.py`, `app/config.py`,
`app/services/turn_loop.py`, `app/routers/conversation.py`,
`tests/test_quota.py`

**Steps**

1. Add `quota_llm_calls_per_day: int = 400` and a `"llm_calls"` kind. Count
   calls, not tokens — Sarvam's response does not reliably return usage, and a
   call cap is enforceable without it.
2. **Fix the unknown-kind fallthrough while you are here.** `check_and_consume`
   currently sets `limit = 0` for an unrecognised kind, so it always raises
   `QuotaExceeded` with a confusing `0/0` message. Raise a distinct
   `ValueError` naming the kind instead — otherwise adding `"llm_calls"` and
   forgetting its limit 429s every conversation turn with no clue why.
3. Meter `edge_router.route()` at its call site in `turn_loop.py`, with
   `surface="conversation"`. **A quota refusal here must not 500 the turn** —
   catch it, skip the LLM, and fall through to the existing escape path. A
   learner over quota gets a slightly worse conversation, not a broken one.
   This is different from `/speech/*`, where 429 is the right answer.
4. Meter `/conversation/explain` with `surface="explain"`; 429 is fine there,
   the learner asked for an extra.
5. **Refund on downstream failure.** Quota is consumed before the call and is
   never returned if Sarvam 502s, so an outage silently eats learner quota.
   Write a compensating negative `UsageEvent` in the error path — for the
   speech endpoints too.

**Tests** (≥6, monkeypatched, zero network): router call consumes quota;
over-quota skips the LLM without raising; explain returns 429 over quota;
unknown kind raises `ValueError` not `QuotaExceeded`; a 502 refunds; refund
nets to zero.

**Acceptance:** `300 passed` (294 + 6).

**Do not:** enforce quota inside `services/sarvam.py` — that layer is a dumb
transport and must stay testable without a DB.

---

## P6-2 · Commit the client work

**Why:** ~1,240 lines across 21 modified and 8 new files sit in the working
tree — `motion.ts`, `useReducedMotion`, `Skeleton`, `Confetti`,
`SessionShell`, `Path`, `SessionComplete`, `MouthDiagram`, plus the graphics
stack in `package.json`. This is the exact exposure P0-1 existed to remove.

**Blocked by:** nothing. **Effort:** S

Commit in logical units by UI task ID (`feat(U0-3): motion token system`, etc.)
so the client history stays readable against `UI_HANDOVER.md`. Confirm
`npx tsc --noEmit` is still 0 before each.

**Do not:** sweep the whole tree into one commit.

---

# PHASE P7 — Content at volume

> **This is the single biggest lever available to the project.** The machine is
> built, tested, and has never been switched on. Going from 1 scenario to 50 is
> execution, not invention.

## P7-1 · Dry-run and report the cost

**Blocked by:** P6-1 (do not author at volume with an unmetered LLM path).
**Effort:** S

```bash
cd backend && ./.venv/Scripts/python.exe -m scripts.author_batch --dry-run
cd backend && ./.venv/Scripts/python.exe -m scripts.challenge_batch --dry-run
```

Report brief count, estimated LLM calls, estimated TTS characters, and
estimated ₹ — **then stop.**

⚠ **Spending the Sarvam grant is the owner's decision, every time.** Do not
run `--live`. Do not run `--render`. This is not negotiable and it is not a
judgement call the agent gets to make.

## P7-2 · Author the scenarios ⚠ OWNER-GATED

**Blocked by:** explicit owner approval of the P7-1 estimate.

Run in batches (`--limit 5`) rather than all 50 at once, checking gate pass
rate between batches. A collapsing pass rate means the briefs or the prompt are
wrong, and finding that out after 5 briefs costs a tenth of finding it out
after 50. Record per-brief stats to `backend/results/authoring/`.

## P7-3 · Review pass

**Blocked by:** P7-2.

Authored scenarios land `review_status="pending"` and are invisible to
learners until approved — that gate already exists and is tested. Work
`GET /authoring/review` and approve or reject. **Do not auto-approve on a high
gate score:** the Vidyut gate checks grammar, a human checks whether the line
is worth saying.

## P7-4 · Challenges at volume

**Blocked by:** P7-3. Same shape, target ~500 challenges, same review gate.
`accepted_parses` must be generated by analyzing the target with
`analyze_sentence` + `feature_set_variants` — never hand-written, or free word
order silently breaks.

## P7-5 · Re-point the path at real content

**Blocked by:** P7-4. `UI_HANDOVER.md` U3-1 builds the journey map against the
feature bands in `seeds/briefs.py`. Once real scenarios exist, the path nodes
should reflect what is actually authored and approved, not the brief list.

---

# PHASE P8 — First users

**Blocked by:** P7. Roughly 10 people, then the questions currently
unanswerable become cheap to answer.

- **P8-1** — a place to *look at* the two metrics. `GET /admin/metrics`
  returns escape rate and live-vs-prerendered share and nothing renders them.
  A single admin page is enough; do not buy an analytics vendor.
- **P8-2** — seed `source="prerendered"` on `UsageEvent` once P7 renders
  audio. Nothing writes that value today, so `tts_share` will report 100% live
  forever and silently tell you nothing. See `UI_HANDOVER.md` for the same
  note.
- **P8-3** — crash and error reporting before strangers touch it.
- **P8-4** — the platform decisions in P5 that were deliberately left open:
  which host, which object store, backup policy for owned audio. All owner
  calls (§6).

---

## 5. Definition of done

1. The task's stated **Acceptance** passes.
2. `cd backend && ./.venv/Scripts/python.exe -m pytest -q` at or above the
   stated count.
3. `cd mobile && npx tsc --noEmit` → **0 errors**.
4. New behaviour has tests. New tests do not hit the network.
5. No file outside the task's **Touch** list modified.
6. Committed with the task ID in the message.
7. A changed product rule gets a dated entry in `DECISIONS.md`.

---

## 6. When to stop and escalate

- **Any spend of the Sarvam grant.** P7-1 stops at the estimate. Running
  `--live` is the owner's call, every time.
- **Any task that seems to require editing** `analyzer.py`, `engine.py`, or
  `adaptive.py` semantics (§2.1).
- **RAG or retrieval work** — see §4. Owner decision, not yet.
- **Platform choices** — hosting, object storage, payments, privacy. Business
  decisions with cost and legal consequences.
- **Store submission and Apple/Google sign-in** — needs developer-account
  setup only the owner can do, and Sign in with Apple becomes mandatory the
  moment any third-party sign-in is offered.
- **Anything that would make an `unsure` verdict penalize a learner** (§2.2).
  If a task appears to require it, the task is wrong.
- **A test you cannot make pass without weakening it.** Report it instead.

---

## 7. Quick reference

```
Backend tests (baseline 294):
  cd backend && ./.venv/Scripts/python.exe -m pytest -q

Mobile typecheck (baseline 0 errors):
  cd mobile && npx tsc --noEmit

Content cost estimate (SAFE — spends nothing):
  cd backend && ./.venv/Scripts/python.exe -m scripts.author_batch --dry-run

Alembic head:  a1b2c3d4e5f6
Order:         P6 → P7 (owner-gated) → P8
Not yet:       RAG
```
