# Shabd — Implementation Handover

**Audience:** an implementing coding agent (DeepSeek-V4-Flash / Hermes).
**Written:** 2026-09-01. **Repo state at writing:** backend 183/183 tests green.

---

## 0. How to use this document

Read sections 1–4 **completely** before writing any code. They are short and they
contain the traps.

Then work tasks **in order**, one at a time. Each task is sized for a single
focused session and has:

- **Why** — the reason it exists. If your change doesn't serve this, you drifted.
- **Blocked by** — do not start until these are done.
- **Touch** — the only files you should create or modify.
- **Contract** — exact signatures/schemas. Copy them; don't improvise names.
- **Steps** — the implementation order.
- **Acceptance** — a command and its expected output. The task is not done
  until this passes.
- **Do not** — the specific wrong turn an agent is likely to take here.

**After every task, without exception, run the full verification loop (§3).**
If the backend test count drops below the stated baseline, you broke something —
fix it before moving on. Do not disable, skip, or rewrite an existing test to
make it pass.

**One task per commit.** Commit message format: `feat(P0-2): enforce voice quotas`.

---

## 1. Repo map

```
D:\Projects\Shabd\
├── architecture.md          53KB — the design bible. §-numbers below refer to it.
├── DECISIONS.md             27KB — dated decision log. Append, never rewrite.
├── HANDOVER.md              this file
├── specs/                   5 feature specs (dialogue-graph, conversation-runtime,
│                            authoring-pipeline, speech-bench, varnamala)
├── backend/                 FastAPI + SQLAlchemy 2.0 + Alembic. 8,239 LOC.
│   ├── .venv/               the virtualenv. Use it (see §3).
│   ├── app/
│   │   ├── main.py          app factory, router registration, lifespan
│   │   ├── config.py        pydantic-settings. ALL new config goes here.
│   │   ├── db.py            engine, get_db, init_db, schema-drift guard
│   │   ├── models.py        SQLAlchemy models (10 tables)
│   │   ├── schemas.py       Pydantic request/response
│   │   ├── auth.py          token auth: require_learner, require_admin
│   │   ├── adaptive.py      SM-2 mastery + challenge selection  ⚠ FROZEN
│   │   ├── grading/
│   │   │   ├── analyzer.py  796 LOC. Vidyut morphology.          ⚠ FROZEN
│   │   │   └── engine.py    263 LOC. Variant grading.            ⚠ FROZEN
│   │   ├── routers/         12 routers, one per surface
│   │   ├── services/        sarvam, turn_loop, authoring, edge_router,
│   │   │                    explainer, meta_intent, session_store
│   │   ├── evals/           LLM eval harness (6 modules, 1,510 LOC)
│   │   └── seeds/           seed data: challenges(37), dialogue(1), shlokas(3),
│   │                        varnamala, features
│   ├── migrations/versions/ Alembic chain. Current head: 5f6a7b8c9d0e
│   ├── tests/               12 test modules, 3,113 LOC, 183 tests
│   └── scripts/             benches + diagnostics (not part of the app)
├── mobile/                  Expo + React Native + TypeScript. 3,824 LOC.
│   └── src/
│       ├── api/client.ts    typed client — mirrors backend/app/schemas.py
│       ├── config.ts        BASE_URL, dev constants
│       ├── theme.ts         design tokens. Light theme only.
│       ├── navigation/      MainTabs (5 tabs) + RootStack
│       ├── screens/         Home, Conversation, Shloka, Varnamala, Profile,
│       │                    Challenge, Login (Login NOT mounted — see P1-2)
│       ├── components/      TutorAvatar, TutorFull, VerdictSheet, WordBank, ui
│       └── services/        speech (TTS/STT), haptics, sfx
└── frontend/                legacy web test console. Do not extend. Ignore.
```

### Content inventory (the number that matters most)

| Table | Rows |
|---|---|
| `challenges` | 37 |
| `dialogue_scenarios` | **1** (30 nodes, 44 edges) |
| `shlokas` | 3 |

This is ~20 minutes of content. Phase P2 exists entirely to fix this.

---

## 2. Invariants — never violate these

These are not style preferences. Each one, if broken, silently destroys
something the project depends on.

### 2.1 Frozen modules

**Do not change the semantics of** `app/grading/analyzer.py`,
`app/grading/engine.py`, or `app/adaptive.py`. They encode validated
linguistic behaviour and are covered by most of the 183 tests. You may *call*
them from new code. You may not rewrite their logic, rename their public
functions, or "simplify" them. If a task seems to require changing them,
**stop and escalate** (§6).

### 2.2 The abstention principle

When the system is not confident, the verdict is `"unsure"` and **nothing bad
happens to the learner**: no mastery decay, no streak reset, no ratio decrease.
See `adaptive.py::update_mastery` (early-returns on `unsure`/`abstained`) and
`update_streak`.

Any new grading surface you build (P3 pronunciation especially) **must** carry
this same property. A noisy ASR result is not evidence the learner was wrong.
Never introduce a code path that penalizes on uncertainty.

### 2.3 The two-ratio ownership rule

- `Learner.sanskrit_ratio_setting` — **the user owns this.** Only `PATCH /me`
  writes it. It is a *ceiling*.
- `Learner.sanskrit_ratio` — **the system owns this.** Only `adaptive.py`
  writes it, and it may never exceed the ceiling.

One writer per value. Do not let any new endpoint write both.

### 2.4 SQLAlchemy 2.0 only

`Model.query` **does not exist** (that is the Flask-SQLAlchemy idiom and it
will raise `AttributeError` at runtime, not at import). Always:

```python
db.query(Challenge).filter(Challenge.register == register).all()
```

### 2.5 Migrations, never `create_all`

`db.py::init_db` runs Alembic to head and then runs a **schema drift check**
that compares model metadata against actual DB columns. If you add a model or
a column without a migration, **startup raises `RuntimeError`** and every test
fails. There is no way around this and you should not try to add one.

Current Alembic head: **`5f6a7b8c9d0e`**. Every new migration chains from the
then-current head. Create them with:

```bash
cd backend && ./.venv/Scripts/python.exe -m alembic revision -m "short_description"
```

Then hand-write `upgrade()`/`downgrade()`. Do **not** use `--autogenerate`
against a drifted DB; it will produce garbage.

### 2.6 Model routing

- Drafting / edge routing / explain: **`sarvam-105b-conversations`** only.
- **Never `sarvam-105b`** (the reasoning variant). It dead-ends on this
  workload — measured, logged in DECISIONS.md.
- Dual-number (`DUAL`) content: Sarvam false-accuses ~50% of the time. Route
  dual-bearing content to Gemini, per `services/authoring.py` header.

### 2.7 No local models, ever

Architecture §1: API-only. **Never** `import torch`, `transformers`,
`sentencepiece`, or add them to `requirements.txt`. Never add a model download
step. Speech is Sarvam (Bulbul TTS / Saaras STT) over HTTP. If a task looks
like it needs a local model, it doesn't — escalate.

### 2.8 Light theme only

The product is a warm-paper light theme (`mobile/src/theme.ts`). Dark mode was
explicitly rejected. Do not add `useColorScheme`, dark tokens, or a theme
toggle. Use existing tokens from `theme.ts`; do not hardcode hex values in
screens.

### 2.9 Devanagari needs the script font

Nunito ships no Devanagari glyphs. Any `<Text>` that may contain Sanskrit or
Hindi **must** spread the `script()` helper:

```tsx
import { script } from "../theme";
<Text style={[styles.line, script("semibold")]}>{devanagari}</Text>
```

Forgetting this produces a silent OS-default-font fallback that looks broken.

### 2.10 Voice costs real money

Every TTS character and ASR second bills a **prepaid ₹25,000 grant**. There is
currently no limit anywhere (that is P0-2). Until P0-2 lands, do not write
loops that call `/speech/*`, and never commit a script that batch-renders audio
without a `--dry-run` default.

---

## 3. Environment and the verification loop

Windows. Shell is PowerShell, but a Bash tool is also available — commands
below are Bash-form.

### Backend

```bash
cd backend && ./.venv/Scripts/python.exe -m pytest -q
```

**Baseline: `183 passed`.** Five `UserWarning`s about a field named `register`
shadowing a BaseModel attribute are pre-existing and expected — ignore them.

Run the server:

```bash
cd backend && ./.venv/Scripts/python.exe -m uvicorn app.main:app --port 8001
```

Port 8001, not 8000 (a phantom socket on 8000 kept intercepting connections —
see `mobile/src/config.ts`).

### Mobile

```bash
cd mobile && npx tsc --noEmit
```

**Baseline: exactly 3 pre-existing errors** — two `SharedValue` in
`TutorAvatar.tsx`, one `NodeJS.Timeout` in `services/speech.ts`. These are
library typing gaps, not bugs. **Do not fix them** and do not count them as
regressions. Any *fourth* error is yours.

### The loop, after every task

1. `cd backend && ./.venv/Scripts/python.exe -m pytest -q` → ≥183 passed
2. `cd mobile && npx tsc --noEmit` → ≤3 errors, all pre-existing
3. Commit with the task ID in the message.

---

## 4. Phase overview

| Phase | Theme | Why now | Tasks |
|---|---|---|---|
| **P0** | Stop the bleeding | Live financial + data-loss risk | P0-1 … P0-4 |
| **P1** | Identity | Blocks any real user or store submission | P1-1 … P1-4 |
| **P2** | Content volume | The single biggest lever on product quality | P2-1 … P2-5 |
| **P3** | Pronunciation | The differentiator nobody else has | P3-1 … P3-4 |
| **P4** | Retention | What separates "works" from "world class" | P4-1 … P4-5 |
| **P5** | Platform | Blocks first real user | P5-1 … P5-4 |

P0 must be complete before anything else. P2 and P3 may proceed in parallel
with each other but both depend on P0. P4 depends on P1 (needs real accounts).
P5 requires human decisions — see §6.

---

# PHASE P0 — Stop the bleeding

## P0-1 · Commit the working tree and clean the repo

**Why:** 6,237 lines across 42 untracked files — the entire mobile app,
conversation runtime, authoring pipeline, and eval harness — exist only in the
working tree. All 8 commits are from one day. A single bad `git clean` erases
four days of work.

**Blocked by:** nothing. **Do this first.** **Effort:** S

**Touch:** `.gitignore`, plus `git rm` of debris.

**Steps**

1. Add to `.gitignore`:
   ```
   # local databases
   app.db
   backend/app.db
   *.db-journal

   # debug + scratch output
   backend/*.txt
   !backend/requirements*.txt
   backend/*.json
   !backend/requirements*.txt
   backend/fix.py
   backend/test_sarvam*.py
   backend/test_eval_sarvam.py
   backend/debug_empty.py
   backend/evals-out/
   backend/results/
   backend/.authoring-cache/
   backend/vidyut-data/

   # python
   __pycache__/
   *.pyc
   .pytest_cache/
   .venv/

   # node / expo
   node_modules/
   .expo/
   ```
2. Delete the debris files from the working tree: `body_debug.txt`,
   `debug_sarvam.json`, `dry_run.txt`, `empty.json`, `eval_out.txt`, `fix.py`,
   `raw_sarvam.json`, `result.json`, `result.txt`, `result2.json`,
   `test_sarvam.py`, `test_sarvam2.py`, `test_sarvam_raw.py`,
   `test_eval_sarvam.py`, `debug_empty.py` — all in `backend/`.
   ⚠ These are at `backend/` **root**. Do **not** touch `backend/tests/` —
   those are the real test suite.
3. Stage and commit everything remaining in logical commits:
   - `feat: conversation runtime (turn loop, edge router, session store)`
   - `feat: authoring pipeline (draft → Vidyut gate → Bulbul render)`
   - `feat: eval harness (generate/diagnose/translate tasks)`
   - `feat: mobile client (Expo RN, 6 screens, tab nav, tutor avatar)`
   - `docs: architecture §12–§15, specs, decisions`

**Acceptance**

```bash
git status --porcelain | grep -v "^??" | wc -l
```
Expected: `0`. And `git status --porcelain | grep "^??"` should list nothing
under `backend/app/`, `mobile/src/`, or `specs/`.

**Do not:** rewrite history, force-push, or `git clean -fdx` at any point.

---

## P0-2 · Enforce voice quotas

**Why:** `/speech/tts` and `/speech/stt` call a metered, prepaid API behind a
token that `POST /auth/dev-login` hands to anyone who asks for a display name.
`Learner.voice_minutes_used` exists as a column and **nothing reads or writes
it**. One leaked token or one runaway loop drains ₹25,000. Architecture §14.7.

**Blocked by:** P0-1. **Effort:** M

**Touch**
- create `backend/app/services/quota.py`
- create `backend/migrations/versions/6a7b8c9d0e1f_usage_events.py`
- create `backend/tests/test_quota.py`
- edit `backend/app/models.py` (add `UsageEvent`)
- edit `backend/app/config.py` (add quota settings)
- edit `backend/app/routers/speech.py` (wire the checks)

**Contract**

```python
# app/models.py — append
class UsageEvent(Base):
    """Append-only ledger of metered third-party usage, per learner."""
    __tablename__ = "usage_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    learner_id = Column(String(64), ForeignKey("learners.id"), nullable=False, index=True)
    kind = Column(String(16), nullable=False)   # "tts_chars" | "stt_seconds"
    amount = Column(Float, nullable=False)
    surface = Column(String(32), default="")    # "conversation" | "varnamala" | ...
    source = Column(String(16), default="live") # "live" | "prerendered"
    ts = Column(DateTime, default=_utcnow, index=True)
```

```python
# app/config.py — append to Settings
quota_enabled: bool = True
quota_tts_chars_per_day: int = 20_000     # ~₹20/day/learner at Bulbul rates
quota_stt_seconds_per_day: int = 900      # 15 minutes of speech
quota_window_hours: int = 24
```

```python
# app/services/quota.py
class QuotaExceeded(Exception):
    def __init__(self, kind: str, used: float, limit: float, retry_after_s: int) -> None: ...

def usage_since(db, learner_id: str, kind: str, hours: int) -> float:
    """Sum of `amount` for this learner+kind within the rolling window."""

def check_and_consume(
    db, learner, kind: str, amount: float, surface: str = ""
) -> None:
    """Raise QuotaExceeded if this request would cross the limit; otherwise
    record a UsageEvent and commit. No-op when settings.quota_enabled is False."""
```

**Steps**

1. Add the `UsageEvent` model.
2. Write the migration by hand, `down_revision = "5f6a7b8c9d0e"`. Include the
   index on `learner_id` and on `ts`.
3. Implement `quota.py`. The window is **rolling**, computed as
   `ts >= now - timedelta(hours=window)` — not a calendar day.
4. In `routers/speech.py`:
   - TTS: call `check_and_consume(db, learner, "tts_chars", len(req.text), surface)`
     **before** the Sarvam call.
   - STT: estimate seconds from the uploaded byte length
     (`len(audio_data) / (16000 * 2)` for 16-bit 16kHz mono; document the
     assumption in a comment) and consume **before** the call.
5. Map `QuotaExceeded` → **HTTP 429** with body
   `{"detail": "...", "kind": ..., "used": ..., "limit": ..., "retry_after_s": ...}`
   and a `Retry-After` header.
6. Add `surface: str = Form("")` to the STT endpoint and an optional `surface`
   field to `TTSRequest` so usage is attributable.
7. Mirror `Learner.voice_minutes_used` on each STT consume (keep the existing
   denormalized counter accurate — the Profile screen reads it).

**Tests to write** (`backend/tests/test_quota.py`, ≥7 cases)

- under limit → 200, one `UsageEvent` row written
- crossing limit → 429, **no** `UsageEvent` written, **no** Sarvam call made
  (assert with a monkeypatched client that records calls)
- events outside the window are excluded from the sum
- `quota_enabled = False` → no enforcement, no rows
- two learners have independent budgets
- 429 body carries `retry_after_s > 0`
- `voice_minutes_used` increments on STT

**Acceptance**

```bash
cd backend && ./.venv/Scripts/python.exe -m pytest -q
```
Expected: `190 passed` (183 + 7).

**Do not:** call Sarvam in the tests. Monkeypatch `get_sarvam_client`. Do not
enforce quota inside `services/sarvam.py` — that layer is a dumb transport and
must stay testable without a DB.

---

## P0-3 · Structured metrics: escape rate and live-vs-prerendered share

**Why:** Architecture §10 and §12 name exactly two numbers as the health of the
product — **escape rate** (how often a learner falls out of Sanskrit into the
bridge language) and **pre-rendered vs live character share** (whether the cost
model is drifting). Neither is collected anywhere. Escape rate *is* the
authoring backlog: it tells P2 what content to write next.

**Blocked by:** P0-2. **Effort:** M

**Touch**
- create `backend/app/services/metrics.py`
- create `backend/tests/test_metrics.py`
- edit `backend/app/services/turn_loop.py` (emit on escape — **emit only**)
- edit `backend/app/routers/speech.py` (emit tts source)
- edit `backend/app/routers/admin.py` (add `GET /admin/metrics`)

**Contract**

```python
# app/services/metrics.py
def emit(event: str, **fields) -> None:
    """Write one structured JSON line to the 'shabd.metrics' logger.
    Never raises — metrics must never break a request."""

def escape_rate(db, hours: int = 24) -> dict:
    """{'escapes': int, 'turns': int, 'rate': float} over the window."""

def tts_share(db, hours: int = 24) -> dict:
    """{'live_chars': int, 'prerendered_chars': int, 'live_share': float}."""

def top_escape_nodes(db, limit: int = 20) -> list[dict]:
    """Nodes ranked by escape count — this is the authoring priority queue."""
```

**Steps**

1. `emit()` writes `json.dumps({"event": ..., "ts": ..., **fields})` at INFO to
   a dedicated `shabd.metrics` logger. Wrap the whole body in try/except and
   swallow — a metrics failure must never 500 a turn.
2. In `turn_loop.py`, at the existing escape branch, call
   `emit("escape", scenario_id=..., node_id=..., learner_id=..., verdict=...)`.
   **Add the call only.** Do not restructure the turn loop.
3. Escape rate reads from the existing `escape_logs` table joined against
   `conversation_sessions.turn_count`; `EscapeLog` already records what you
   need. Do not add a new table.
4. `tts_share` reads `UsageEvent` rows from P0-2, splitting on the `source`
   column already added above.
5. `GET /admin/metrics?hours=24` behind `require_admin`, returning all three
   rollups.

**Tests** (≥5): emit never raises on bad input; escape rate maths on seeded
rows; window filtering; `top_escape_nodes` ordering; `/admin/metrics` 401s
without the admin header.

**Acceptance**

```bash
cd backend && ./.venv/Scripts/python.exe -m pytest -q
```
Expected: `195 passed`.

**Do not:** add a metrics SaaS dependency. JSON lines to the logger is the
whole design. Do not change `EscapeLog`'s shape.

---

## P0-4 · Disable dev-login outside development

**Why:** `POST /auth/dev-login` takes a display name and returns a valid token
for it. There is no password. Anyone can become any learner. This is fine on
localhost and catastrophic anywhere else.

**Blocked by:** P0-2. **Effort:** S

**Touch:** `backend/app/config.py`, `backend/app/routers/auth_router.py`,
`backend/tests/test_auth.py`

**Steps**

1. Add `dev_login_enabled: bool = True` to `Settings`.
2. In `dev_login`, return **HTTP 404** (not 403 — do not advertise the
   endpoint's existence) when `settings.dev_login_enabled` is False.
3. Add a startup warning in `main.py`'s lifespan: if `dev_login_enabled` is
   True, log at WARNING that an unauthenticated login path is open.
4. Test both branches.

**Acceptance:** `197 passed`, and with `DEV_LOGIN_ENABLED=false` the endpoint
returns 404.

**Do not:** remove the endpoint. The test suite and `start_mob.ps1` both depend
on it in dev.

---

# PHASE P1 — Identity

## P1-1 · Anonymous device identity

**Why:** Architecture §14.3. The app needs a real account before a real user.
Anonymous-first is the right default here: varṇamālā is genuinely useful before
login, and a signup wall on a free surface costs installs. This replaces
name-based dev-login with something nobody else can claim.

**Blocked by:** P0-4. **Effort:** M

**Touch**
- edit `backend/app/models.py` (`Learner.install_id`, `Learner.deleted_at`)
- new migration chained from the P0 head
- edit `backend/app/routers/auth_router.py` (add `POST /auth/anonymous`)
- edit `backend/app/schemas.py`
- edit `mobile/src/store/auth.tsx`, `mobile/src/api/client.ts`
- create `backend/tests/test_identity.py`

**Contract**

```python
# schemas.py
class AnonLoginRequest(BaseModel):
    install_id: str = Field(..., min_length=16, max_length=64)
    bridge_langs: list[str] = Field(default=["en", "hi"])
    display_name: Optional[str] = None
```

`POST /auth/anonymous` — idempotent. Same `install_id` returns the same
learner with a fresh token. Different `install_id` always creates a new
learner. `install_id` is unique-indexed.

Client: generate a UUIDv4 once, store under `shabd.installId` in AsyncStorage,
reuse forever. Replace the `login(DEFAULT_LEARNER_NAME)` silent call in
`auth.tsx` with `anonymousLogin(installId)`.

**Acceptance:** `202 passed`; two different install ids produce two learner
ids; the same install id twice produces one.

**Do not:** delete `dev-login`. Do not put `install_id` in a URL or query
string — it is an identifier, POST body only.

---

## P1-2 · Mount onboarding

**Why:** `mobile/src/screens/Login.tsx` (204 LOC) is written and deliberately
not mounted — see the comment at `mobile/App.tsx:17`. Users currently land as a
hardcoded learner named "Sisya" with no name, no bridge-language choice, and no
starting ratio.

**Blocked by:** P1-1. **Effort:** M

**Touch:** `mobile/App.tsx`, `mobile/src/screens/Login.tsx`,
`mobile/src/store/auth.tsx`, `mobile/src/navigation/types.ts`

**Steps**

1. Add `onboarded: boolean` to the auth store, persisted at
   `shabd.onboarded` in AsyncStorage.
2. In `RootNavigator`, when `!onboarded`, render an `Onboarding` stack screen
   instead of `MainTabs`.
3. Onboarding collects, in three light steps: display name → bridge languages
   (en / hi / both) → starting `sanskrit_ratio` (a slider, default 0.3, framed
   as "how much Sanskrit do you want to hear?"). It calls
   `POST /auth/anonymous` then `PATCH /me`.
4. **Skippable.** A "Skip for now" control creates the anonymous learner with
   defaults and lands on Home. Do not gate varṇamālā behind onboarding.
5. Remove `DEFAULT_LEARNER_NAME` usage from `auth.tsx`. Leave the constant in
   `config.ts` for tests.

**Acceptance:** `npx tsc --noEmit` → still exactly 3 pre-existing errors. Fresh
install shows onboarding; relaunch goes straight to Home.

**Do not:** make onboarding mandatory. Do not add a password field — there is
no password in this system.

---

## P1-3 · In-app account deletion

**Why:** App Store Guideline 5.1.1(v): any app with account creation **must**
offer account deletion *inside the app*. An email link fails review. Also the
DPDP/GDPR erasure path (§14.6).

**Blocked by:** P1-1. **Effort:** M

**Touch:** `backend/app/routers/me.py`, `backend/app/models.py`,
`mobile/src/screens/Profile.tsx`, `backend/tests/test_identity.py`

**Contract**

```
DELETE /me      → 204. Hard-deletes the learner and every dependent row.
```

**Steps**

1. Cascade-delete: `tokens`, `attempts`, `usage_events`,
   `conversation_sessions`, `escape_logs` for that learner. `Learner.tokens`
   and `Learner.attempts` already declare `cascade="all, delete-orphan"`;
   `EscapeLog.learner_id` is **nullable** — null it rather than deleting, so
   aggregate escape-rate history survives an account deletion. That is
   deliberate: the metric is about content, not about the person.
2. Client: Profile → "Delete account", a confirm dialog naming what is lost,
   then `DELETE /me`, clear AsyncStorage, return to onboarding.
3. Test: deletion removes the learner and all owned rows; escape logs survive
   with `learner_id IS NULL`; the token 401s afterward.

**Acceptance:** `206 passed`.

**Do not:** soft-delete. The user asked to be erased.

---

## P1-4 · Privacy: do not retain raw audio

**Why:** §14.6. Voice recordings are personal data under DPDP 2023 and GDPR,
and the diaspora thesis guarantees EU users. The cheapest correct answer, and
the one architecture.md recommends: **grade the audio, keep the derived
features and the verdict, discard the recording.**

**Blocked by:** P1-3. **Effort:** S

**Touch:** `backend/app/routers/speech.py`, `backend/app/services/quota.py`,
`docs`

**Steps**

1. Audit every path that touches uploaded audio bytes. Confirm nothing writes
   them to disk or to a DB column. Currently `speech.py` reads into memory and
   passes to Sarvam — keep it that way and add an explicit comment saying why.
2. Add `retain_raw_audio: bool = False` to `Settings`, unused-but-declared, so
   the future opt-in has a home.
3. Write the retention decision into `DECISIONS.md` as a dated entry.

**Acceptance:** `grep -rn "audio_data" backend/app/` shows no write to disk or
DB. Tests still green.

**Do not:** add an audio-storage column "for later".

---

# PHASE P2 — Content volume

> **This phase is the single biggest lever on product quality.** The pipeline
> already exists in `app/services/authoring.py` (780 LOC, 448 LOC of tests) and
> has produced exactly **one** scenario. The work is turning the crank, not
> inventing the machine.

## P2-1 · Scenario brief catalogue

**Why:** `run_authoring()` takes a *brief*. There is one. To get 50 scenarios
you need 50 briefs, and they must be **systematic**, not freely invented, or
feature coverage will be lopsided and the adaptive engine will have nothing to
select against.

**Blocked by:** P0-3 (you want escape metrics running before authoring at
volume). **Effort:** L

**Touch:** create `backend/app/seeds/briefs.py`, create
`backend/tests/test_briefs.py`

**Contract**

```python
# app/seeds/briefs.py
SCENARIO_BRIEFS: list[dict] = [
    {
        "slug": "greeting-first-meeting",
        "title": "प्रथमं मेलनम्",
        "description": "Meeting someone for the first time.",
        "register": "laukika",          # laukika | classical
        "situation": "Two people meet and exchange names and greetings.",
        "target_features": ["NOM.SG", "PRES.1SG", "PRES.2SG"],
        "min_ratio": 0.2,
        "max_ratio": 0.5,
        "est_minutes": 4,
        "n_turns": 8,
    },
    ...
]
```

**Steps**

1. Build the catalogue as a **cross product**, not a brainstorm:
   - **Situations (10):** greeting · family · food/eating · marketplace ·
     travel/directions · daily routine · weather/seasons · school/learning ·
     health · festivals.
   - **Feature bands (5), ordered by the `rank` already in the `features`
     table. ⚠ Use the exact seeded IDs — they are compound
     (`NOM.SG`, not `NOM`). Run
     `SELECT id, kind, rank FROM features ORDER BY rank` and use only what is
     there:**
     (a) `NOM.SG` `ACC.SG` `PRES.1SG` `PRES.2SG` `PRES.3SG` ·
     (b) + `INSTR.SG` `DAT.SG` `VOC.SG` ·
     (c) + `NOM.PL` `ACC.PL` `PRES.1PL` `PRES.2PL` `PRES.3PL` ·
     (d) + `ABL.SG` `GEN.SG` `GEN.PL` `LOC.SG` `LOC.PL` `IMP.2SG` ·
     (e) + `NOM.DU` `ACC.DU` `PRES.1DU` `PRES.2DU` `PRES.3DU`.
   - 10 × 5 = **50 briefs.**

   ⚠ **The seeded taxonomy has no past or future tense** — only `PRES.*` and
   `IMP.2SG`. Do not invent `PAST.3SG` or similar; the drift check won't catch
   it but `test_briefs.py` will, and content referencing a nonexistent feature
   is invisible to the adaptive engine. Extending the tense taxonomy is a
   separate task with its own analyzer work — escalate rather than improvise.
2. `slug` is unique and stable — the batch runner keys idempotency on it.
3. Ratio bands rise with the feature band: band (a) → 0.2–0.4, band (e) →
   0.5–0.8.
4. **Dual (band e) briefs must set `"prefer_provider": "gemini"`** — Sarvam
   false-accuses ~50% of duals (§2.6).
5. Write titles in Devanagari with an English `description`.

**Tests** (`test_briefs.py`, ≥6): 50 briefs; slugs unique; every
`target_features` entry exists in the seeded `features` table; ratio bands
valid and `min <= max`; every band-(e) brief prefers Gemini; every situation
appears exactly 5 times.

**Acceptance:** `212 passed`.

**Do not:** call any LLM in this task. This is a static data file. Do not
invent feature IDs — read them from `app/seeds/features.py`.

---

## P2-2 · Batch authoring runner

**Why:** Running 50 briefs by hand through `POST /authoring/scenario` is not a
process. This is the thing that converts money into content, so it must be
resumable, idempotent, and above all **safe by default** (§2.10).

**Blocked by:** P2-1. **Effort:** L

**Touch:** create `backend/scripts/author_batch.py`, create
`backend/tests/test_author_batch.py`

**Contract**

```bash
python -m scripts.author_batch --dry-run                  # DEFAULT. Costs nothing.
python -m scripts.author_batch --live --limit 5           # author 5 briefs
python -m scripts.author_batch --live --slug greeting-first-meeting
python -m scripts.author_batch --live --render --limit 5  # also pre-render audio
python -m scripts.author_batch --report                   # gate stats, no calls
```

**Steps**

1. **`--dry-run` is the default.** Without `--live` the script prints what it
   *would* do — brief count, estimated LLM calls, estimated TTS characters,
   estimated ₹ — and exits 0 without a single network call. Refuse to run
   `--live` if `SARVAM_API_KEY` is unset.
2. Idempotency: skip any brief whose `slug` already has a scenario, unless
   `--replace`. Reuse `run_authoring(..., replace=...)`; the disk cache in
   `.authoring-cache/` already makes re-drafting free.
3. Per brief, record: drafts produced, drafts passing the Vidyut gate, gate
   pass rate, failure reasons. Append one JSON line per brief to
   `backend/results/authoring/<slug>.json`.
4. `--render` is a **separate flag** from `--live`. Drafting is cheap; TTS is
   not. Never render implicitly.
5. Print a summary table at the end: total scenarios, total nodes/edges,
   mean gate pass rate, briefs that failed and why.
6. Resumable: `Ctrl-C` mid-run loses at most the in-flight brief.

**Tests** (≥8, all with monkeypatched providers — **zero network**):
dry-run makes no calls; `--live` without a key exits non-zero; existing slug is
skipped; `--replace` re-authors; gate stats maths; `--limit` respected;
`--render` off by default; results file written.

**Acceptance:** `220 passed`, and:

```bash
cd backend && ./.venv/Scripts/python.exe -m scripts.author_batch --dry-run
```
prints an estimate and exits 0 with no network activity.

**Do not:** run `--live` yourself. Report the dry-run estimate and **stop** —
spending the grant is the owner's decision, not yours (§6).

---

## P2-3 · Human review queue

**Why:** The pipeline is `draft → Vidyut gate → human spot-check → render`. The
gate is automated; the spot-check has no interface, so it isn't happening.
Shipping ungated Sanskrit at learners is how the product loses trust
permanently.

**Blocked by:** P2-2. **Effort:** M

**Touch:** `backend/app/models.py` (add `review_status` to `DialogueScenario`),
new migration, `backend/app/routers/authoring.py`, `backend/tests/test_authoring.py`

**Contract**

```python
# DialogueScenario — new columns
review_status = Column(String(16), default="pending", index=True)  # pending|approved|rejected
review_note   = Column(Text, default="")
reviewed_at   = Column(DateTime, nullable=True)
```

```
GET  /authoring/review?status=pending   → scenarios + their nodes/edges, oldest first
POST /authoring/review/{scenario_id}    → {"status": "approved"|"rejected", "note": str}
```

Both behind `require_admin`.

**Steps**

1. Add columns + migration. Default existing rows to `"approved"` (the one
   hand-built seed scenario is trusted).
2. **`GET /conversation/scenarios` must filter to `review_status == "approved"`.**
   This is the whole point of the task — unreviewed content must be unreachable
   by learners.
3. Batch-authored scenarios land as `pending`.

**Tests** (≥5): pending scenario is invisible to `/conversation/scenarios`;
approving reveals it; rejecting keeps it hidden; the review list is ordered;
non-admin gets 401.

**Acceptance:** `225 passed`.

**Do not:** auto-approve on a high gate score. The gate checks grammar; a human
checks whether it's worth saying.

---

## P2-4 · Challenge generation at volume

**Why:** 37 challenges is a few sessions of practice before repetition sets in.
`adaptive.py::select_next_challenge` has a no-repeat window of 5 and a
fallback for "window exhaustion" — that fallback exists because the library is
too small. Fix the library, not the fallback.

**Blocked by:** P2-3. **Effort:** L

**Touch:** create `backend/scripts/challenge_batch.py`, create
`backend/tests/test_challenge_batch.py`

**Steps**

1. Same shape as P2-2: `--dry-run` default, `--live` gated on the API key,
   idempotent, resumable, results written to `backend/results/challenges/`.
2. Generate against the same feature bands as P2-1 so the two libraries stay
   coverage-aligned.
3. **Every generated challenge is validated before it is persisted.** Note
   `POST /pipeline/run` validates challenges *already in the DB* — it is a
   post-hoc audit, not a pre-insert gate, so you cannot call it here. Instead
   use the exact three functions it uses, imported the same way:

   ```python
   from app.grading.analyzer import (
       analyze_sentence, feature_set_from_results, is_confident,
   )
   ```

   A generated challenge is kept only if `is_confident(results)` is True and
   the derived feature set matches what the brief claimed. Otherwise discard
   it — do not repair it. After the batch, run `POST /pipeline/run` as an
   independent audit and record the pass rate.
4. Target: **500 challenges**, ≥20 per feature band per register.
5. Same review gate as P2-3: new challenges land `pending`;
   `GET /challenges/next` serves only approved.

**Acceptance:** `233 passed`; dry-run prints a cost estimate and exits 0.

**Do not:** hand-write `accepted_parses`. Generate them by analyzing the target
sentence with `analyze_sentence` and taking `feature_set_variants` — that is
what makes free word order work, and hand-written parses will silently break it.

---

## P2-5 · Wire escape rate into the authoring queue

**Why:** This closes the loop. `top_escape_nodes` from P0-3 tells you exactly
where learners fall out of Sanskrit — those nodes need repair turns or easier
alternatives. Without this, authoring is guesswork.

**Blocked by:** P2-4. **Effort:** M

**Touch:** `backend/app/routers/authoring.py`, `backend/app/services/metrics.py`

**Steps**

1. `GET /authoring/priorities` (admin) — joins `top_escape_nodes` to their
   scenario and node text, returning a ranked worklist: node text, escape
   count, escape rate, current outgoing edge count.
2. A node with a high escape rate and few outgoing edges needs more accepted
   answers; one with many edges needs an easier `repair` node. Return a
   `suggested_action` field with exactly those two values plus `"ok"`.

**Acceptance:** `237 passed`.

---

# PHASE P3 — Pronunciation

> Architecture §13 calls varṇamālā "the first real surface" — smallest content
> set, fully pre-renderable, and it exercises **record → align → grade →
> feedback**, which every other surface reuses. Right now
> `mobile/src/screens/Varnamala.tsx` only plays TTS on tap. This is the
> differentiator and it does not exist yet.

## P3-1 · Pronunciation attempt model

**Blocked by:** P0-3. **Effort:** M

**Touch:** `backend/app/models.py`, new migration, `backend/app/schemas.py`

**Contract**

```python
class PronunciationAttempt(Base):
    __tablename__ = "pronunciation_attempts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    learner_id = Column(String(64), ForeignKey("learners.id"), nullable=False, index=True)
    target = Column(String(32), nullable=False)       # the akṣara, Devanagari
    target_iast = Column(String(32), default="")
    transcript = Column(Text, default="")             # what Saaras heard
    verdict = Column(String(16), nullable=False)      # correct|near|incorrect|unsure
    contrast = Column(String(32), default="")         # e.g. "retroflex_vs_dental"
    confidence = Column(Float, default=0.0)
    abstained = Column(Boolean, default=False)
    ts = Column(DateTime, default=_utcnow)
```

⚠ **No audio column.** P1-4. Grade it, keep the derived result, discard the
recording.

**Acceptance:** `239 passed` (model + migration + drift check passes).

---

## P3-2 · Pronunciation scoring service

**Why:** §13 says "grading is the hard part, not synthesis." Hosted ASR was not
trained to hear a learner's retroflex/dental confusion; it was trained to
produce plausible text. **It will often normalize the error away.** So the
honest design is: score only the contrasts ASR can actually resolve, and
abstain everywhere else.

**Blocked by:** P3-1. **Effort:** L

**Touch:** create `backend/app/services/pronunciation.py`, create
`backend/tests/test_pronunciation.py`

**Contract**

```python
# Contrast pairs the grader is allowed to have an opinion about.
SCORABLE_CONTRASTS: dict[str, tuple[str, ...]] = {
    "retroflex_vs_dental": ("ट", "त", "ठ", "थ", "ड", "द", "ढ", "ध", "ण", "न"),
    "aspirated_vs_plain":  ("क", "ख", "ग", "घ", "च", "छ", "ज", "झ", ...),
    "sibilants":           ("श", "ष", "स"),
    "vowel_length":        ("अ", "आ", "इ", "ई", "उ", "ऊ"),
}

def score_pronunciation(target: str, transcript: str) -> dict:
    """Return {verdict, contrast, confidence, abstained, diagnosis}.

    verdict ∈ correct | near | incorrect | unsure.
    MUST return 'unsure' with abstained=True when:
      - transcript is empty or whitespace
      - transcript length differs wildly from target (ASR hallucination)
      - the target's contrast class is not in SCORABLE_CONTRASTS
      - the confusion observed is not one this ASR can reliably resolve
    """
```

**Steps**

1. Normalize both sides through the existing
   `analyzer.iast_to_devanagari` / lipi helpers. **Reuse; do not write a new
   transliterator.**
2. Exact match → `correct`, high confidence.
3. Mismatch **within** a scorable contrast class → `incorrect`, with a
   diagnosis naming the contrast in plain language ("that was the dental *ta*;
   the target is the retroflex *ṭa* — tongue further back").
4. Mismatch **outside** any scorable class → **`unsure`, `abstained=True`**.
   This will be common. That is correct behaviour, not a gap to close.
5. Silence / empty transcript → `unsure`. **Never `incorrect`.** Saaras is
   known to hallucinate on silence (see `specs/speech-bench.md`) — an empty or
   nonsense transcript is evidence about the ASR, not about the learner.

**Tests** (≥12, pure functions, no network): exact match; each contrast class;
silence → unsure; hallucinated long transcript → unsure; out-of-class
substitution → unsure; **an assertion that no input path can return
`incorrect` while `abstained=True`**; vowel length; sibilants.

**Acceptance:** `251 passed`.

**Do not:** invent a phoneme aligner. Do not add a local ASR model (§2.7). Do
not let low confidence become `incorrect` — that violates §2.2 and it is the
single most damaging bug you could ship here.

---

## P3-3 · Pronunciation endpoint

**Blocked by:** P3-2. **Effort:** M

**Touch:** `backend/app/routers/grammar.py` (or a new
`routers/pronunciation.py`), `backend/app/main.py`

**Contract**

```
POST /pronunciation/attempt   (multipart)
  file: UploadFile
  target: str = Form(...)
  → {verdict, transcript, contrast, confidence, abstained, diagnosis, streak_changed: bool}
```

**Steps**

1. Consume STT quota first (P0-2, `surface="varnamala"`).
2. Transcribe via Saaras with `language_code="sa-IN"`.
3. Score via P3-2, persist a `PronunciationAttempt`, discard the bytes.
4. `unsure` **must not** change streak or mastery (§2.2) — set
   `streak_changed: false` and assert it in a test.

**Acceptance:** `256 passed`.

---

## P3-4 · Varṇamālā record-and-grade UI

**Blocked by:** P3-3. **Effort:** L

**Touch:** `mobile/src/screens/Varnamala.tsx`,
`mobile/src/services/speech.ts`, `mobile/src/api/client.ts`,
`mobile/src/components/VerdictSheet.tsx`

**Steps**

1. Tapping an akṣara opens a practice sheet: large glyph, IAST, place of
   articulation, a **Listen** button (existing `speak()`), and a **hold to
   record** button.
2. Record with `expo-audio`. **Pin the format explicitly** — iOS and Android
   default to different container/codec combinations and Saaras must receive
   the same thing from both (§14.5). Target 16kHz mono WAV.
3. **iOS audio session.** Playback is already handled —
   `services/speech.ts::setPlaybackMode()` sets `playsInSilentMode: true`, so
   the hardware mute switch no longer silences the tutor. **Recording needs its
   own mode** (`allowsRecording: true`), and you must switch back to playback
   mode afterwards or subsequent playback goes silent on iOS. Add
   `setRecordingMode()` alongside the existing helper — do not modify
   `setPlaybackMode()`. This is invisible in the simulator; verify on a device.
4. Add a microphone permission purpose string to `app.json` for both platforms.
   The copy is user-visible — write it deliberately.
5. Render the verdict via the existing `VerdictSheet` pattern and the existing
   semantic colours in `theme.ts`:
   - `correct` → `color.ok` / `okBg`
   - `near` → `color.warn` / `warnBg`
   - `incorrect` → `color.bad` / `badBg`
   - `unsure` → `color.unsure` / `unsureBg`, copy framed as **"I couldn't hear
     that clearly — try again?"**, never as a mistake. Those violet tokens
     exist for exactly this and are currently unused.
6. Haptics via the existing `services/haptics.ts`.

**Acceptance:** `npx tsc --noEmit` → still exactly 3 pre-existing errors.
Record → verdict works end to end against a locally running backend.

**Do not:** show a red/wrong state for `unsure`. Do not add a new colour token.

---

# PHASE P4 — Retention

> Duolingo's moat is not content quality — it is the streak. The app currently
> has `Learner.streak` as an integer and nothing else: no daily goal, no XP, no
> notifications, no freeze, no repair. This phase is what separates "works" from
> "world class."

## P4-1 · Daily goal and XP

**Blocked by:** P1-2. **Effort:** L

**Touch:** `models.py` (`DailyActivity`, `Learner.daily_goal_xp`,
`Learner.last_active_date`), migration, new `routers/progress.py`,
`mobile/src/screens/Home.tsx`

**Contract**

```python
class DailyActivity(Base):
    __tablename__ = "daily_activity"
    id = Column(Integer, primary_key=True, autoincrement=True)
    learner_id = Column(String(64), ForeignKey("learners.id"), nullable=False, index=True)
    date = Column(String(10), nullable=False, index=True)   # "2026-09-01", learner-local
    xp = Column(Integer, default=0)
    attempts = Column(Integer, default=0)
    conversation_turns = Column(Integer, default=0)
    pronunciation_attempts = Column(Integer, default=0)
    goal_met = Column(Boolean, default=False)
```

**XP rules** (keep them boring and legible):
`correct` = 10 · `off_by_one` = 5 · `unsure` = **5** (never zero — abstention is
not the learner's fault, §2.2) · conversation turn = 3 · pronunciation
`correct` = 8.

Goal presets: casual 30 / regular 50 / serious 100 / intense 200 XP per day.

**⚠ Timezone:** `date` is the **learner's local date**, not UTC. Send an IANA
timezone from the client at login, store it on `Learner`, and compute the day
boundary against it. A streak that breaks at 5:30am local because the server
is on UTC is the single most common and most enraging bug in this category.

**Acceptance:** `264 passed`, including an explicit timezone-boundary test.

---

## P4-2 · Streak, freeze, and repair

**Blocked by:** P4-1. **Effort:** M

**Steps**

1. Move streak computation off "last verdict" (current `update_streak`) onto
   `DailyActivity`: the streak is consecutive days with `goal_met`.
   ⚠ `adaptive.py::update_streak` is frozen (§2.1) — **leave it in place**, add
   the day-based calculation in the new progress service and have the frozen
   function keep serving the in-session counter.
2. `Learner.streak_freezes` (default 2, max 2). A missed day consumes a freeze
   instead of resetting.
3. `POST /progress/repair` — one grace repair within 48h of a break.
4. Client: flame on Home reflects the day streak; a "streak saved" moment when
   a freeze is consumed. Use `color.gold`.

**Acceptance:** `271 passed`, covering: consecutive days; a gap consuming a
freeze; a gap with no freezes resetting; repair inside and outside the window.

---

## P4-3 · Push notifications

**Blocked by:** P4-2. **Effort:** L

**Steps**

1. `expo-notifications`; store the push token on `Learner`.
2. Backend scheduled job with **at most two** sends per learner per day:
   a practice reminder at the learner's usual local practice hour, and a
   streak-at-risk warning ~3h before local midnight when the goal is unmet.
3. **Hard cap it and make it fully disableable in Profile.** Notification spam
   is the fastest way to lose the exact users this product needs.
4. Copy in the tutor's voice, Devanagari + gloss.

**Acceptance:** tokens register; the job selects the right learners; opt-out is
respected. **Do not** send real notifications from a test.

---

## P4-4 · Progress screen

**Blocked by:** P4-2. **Effort:** M

Feature mastery heat map (`Learner.feature_mastery` is already populated and
nothing displays it), 30-day activity calendar, XP history, per-contrast
pronunciation accuracy from P3-1. Read-only; reuse `theme.ts` tokens.

---

## P4-5 · Session-complete moment

**Blocked by:** P4-1. **Effort:** M

The end-of-session summary: XP earned, goal ring, streak, one line of
encouragement from the tutor, "one more?" CTA. This is the highest-leverage
15 minutes of UI in the whole app — it is where the next session gets sold.
Use `TutorFull` and the existing sfx/haptics services.

---

# PHASE P5 — Platform

> **⚠ Every task in P5 requires a human decision first (§6).** Do not pick a
> hosting provider, a payment processor, or a storage vendor on your own.
> Prepare the code so the decision is a config change, and stop.

## P5-1 · Postgres readiness

SQLite on a local file is right for building and wrong for production — most
managed hosts give you an ephemeral disk, so the DB disappears on every deploy
(§14.1). SQLAlchemy makes this mostly a config change, which is why it was
chosen.

**Do now:** replace the hardcoded `sqlite:///` in `db.py` with a
`database_url` setting defaulting to the current SQLite path; audit migrations
for SQLite-only DDL; audit for SQLite-specific `PRAGMA` use (`_schema_drift`
uses `PRAGMA table_info` — make it dialect-aware); add `psycopg[binary]` to
requirements. **Do not** provision anything.

## P5-2 · Audio storage and CDN

"Serve from CDN" appears throughout architecture.md and has never been
specified, yet it carries the entire cost model (§14.2). Prepare: content-hashed
immutable filenames, an `audio_url` that is already a column on the right
models, a storage abstraction with a local-filesystem implementation behind it.

**Pre-rendered audio is an owned asset, not a cache** — §10 names single-vendor
dependency as the top risk, and every rendered clip is a clip that survives
losing the API. Whatever is built must be backed up, never treated as
regenerable-on-demand.

## P5-3 · CI

There is no `.github/workflows`. Add one: install, run pytest, run `tsc
--noEmit`, assert the test count has not regressed. No deploy step yet.

## P5-4 · Deploy config

Blocked on P5-1's decision. Single stateless FastAPI process, no GPU, no queue,
no local model — nothing here justifies Kubernetes. Pick something boring.

---

## 5. Definition of done

A task is done when **all** of these hold:

1. Its stated **Acceptance** command produces the stated output.
2. `cd backend && ./.venv/Scripts/python.exe -m pytest -q` → at or above the
   task's stated count.
3. `cd mobile && npx tsc --noEmit` → exactly 3 pre-existing errors, no more.
4. No file outside the task's **Touch** list was modified.
5. New behaviour has tests. New tests do not hit the network.
6. Committed with the task ID in the message.
7. If the task changed a product rule, `DECISIONS.md` has a new dated entry.

---

## 6. When to stop and escalate

Stop and ask the owner. Do not improvise:

- **Any task that seems to require editing** `analyzer.py`, `engine.py`, or
  `adaptive.py` semantics (§2.1).
- **Any spend of the Sarvam grant.** P2-2 and P2-4 stop at `--dry-run` and
  report the estimate. Running `--live` is the owner's call, every time.
- **All of P5** — hosting, storage, payments, and privacy are business
  decisions with cost and legal consequences.
- **Anything touching payments or store submission.** Apple/Google sign-in
  needs developer-account setup that only the owner can do, and Sign in with
  Apple becomes *mandatory* the moment any third-party sign-in is offered.
- **Any change that would make an `unsure` verdict penalize a learner.** This
  is the product's core stance. If a task appears to require it, the task is
  wrong.
- **A test you cannot make pass without weakening it.** Never delete, skip, or
  loosen an existing assertion to go green. Report it instead.

---

## 7. Quick reference

```bash
# Backend tests (baseline 183)
cd backend && ./.venv/Scripts/python.exe -m pytest -q

# Backend server (port 8001, not 8000)
cd backend && ./.venv/Scripts/python.exe -m uvicorn app.main:app --port 8001

# Mobile typecheck (baseline: 3 pre-existing errors)
cd mobile && npx tsc --noEmit

# New migration (hand-write upgrade/downgrade; chain from current head)
cd backend && ./.venv/Scripts/python.exe -m alembic revision -m "description"

# Current Alembic head at handover: 5f6a7b8c9d0e
```

**Cumulative test-count targets**

| After | Count |
|---|---|
| baseline | 183 |
| P0 | 197 |
| P1 | 206 |
| P2 | 237 |
| P3 | 256 |
| P4 | ~271 |

If your count is lower than the phase target, tests are missing. If the suite
is *red*, stop and fix before continuing — never carry a broken suite forward.