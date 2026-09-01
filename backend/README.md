# Shabd Backend

Audio-first Sanskrit learning API. FastAPI + SQLAlchemy + SQLite. Runs on Windows/Python 3.11. **API-only — no local models, no GPU, no model weights** (architecture.md §1).

## Grading design (the core IP, in 5 lines)

1. Answers are graded by **morphological feature set** (NOM.SG, PRES.3SG...), never by string — so free word order works: `ग्रामं गच्छामि` == `गच्छामि ग्रामम्`.
2. Ambiguous forms (`au`, `e`, `oḥ`, neut NOM/ACC) produce **all valid readings**; the attempt is accepted if any reading matches.
3. **Abstention**: if a word can't be parsed confidently, the verdict is `unsure` with `abstained: true` — never "incorrect". `unsure` changes nothing: no streak reset, no mastery decay, no ratio drift (spec §6.3).
4. One-feature-off answers get `off_by_one` with a diagnosis **naming the exact feature in plain English** ("the word 'rāma' should be in the nominative (subject) singular (NOM.SG)") — that specificity is the product.
5. Morphology comes from the rule engine (curated tables) cross-checked per-word by **Vidyut/Chedaka** (real Pāṇinian parser, Apache-2.0 via vidyut-prakriya lineage).

## Setup

```bash
cd backend
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt   # Linux/Mac: .venv/bin/pip
# Vidyut linguistic data auto-downloads (~6MB) to backend/vidyut-data on first start.
.venv/Scripts/python -m uvicorn app.main:app --port 8000
```

- Interactive API docs: http://localhost:8000/docs
- Health: `curl http://localhost:8000/health`
- Config via env: `PORT`, `DB_PATH` (default `app.db`), `ADMIN_TOKEN` (default `dev-admin`), `ANALYZER=vidyut|rule`, `VIDYUT_DATA_DIR`, `CORS_ORIGINS`.

## Endpoint walkthrough (real curl)

```bash
# login
TOKEN=$(curl -s -X POST http://localhost:8000/auth/dev-login \
  -H "Content-Type: application/json" \
  -d '{"display_name":"dev","bridge_langs":["en","hi"]}' | python -c "import sys,json;print(json.load(sys.stdin)['token'])")

# next challenge (adaptive, register-isolated)
curl -s "http://localhost:8000/challenges/next?register=laukika&mode=text" -H "Authorization: Bearer $TOKEN"

# submit attempt (Devanagari or IAST; free word order accepted)
curl -s -X POST http://localhost:8000/attempts \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"challenge_id":"<id>","response_text":"खादति फलं रामः"}'

# learner model (ratios, mastery, streak)  |  daily shloka  |  varnamala grid
curl -s http://localhost:8000/me -H "Authorization: Bearer $TOKEN"
curl -s http://localhost:8000/shlokas/today
curl -s http://localhost:8000/grammar/varnamala

# content pipeline: re-derive + validate every challenge's accepted_parses
curl -s -X POST http://localhost:8000/pipeline/run -H "X-Admin-Token: dev-admin"

# conversation: scenarios → start → turn (escape on gibberish, repair node returned)
curl -s http://localhost:8000/conversation/scenarios -H "Authorization: Bearer ***"
curl -s -X POST http://localhost:8000/conversation/start -H "Authorization: Bearer ***" -H "Content-Type: application/json" -d '{}'
curl -s -X POST http://localhost:8000/conversation/turn -H "Authorization: Bearer ***" -H "Content-Type: application/json" \
  -d '{"session_id":"<id>","transcript":"अहं रामः अस्मि"}'

# authoring pipeline (admin; live LLM calls gated behind SHABD_AUTHORING_LIVE=1)
curl -s http://localhost:8000/authoring/scenarios -H "X-Admin-Token: dev-admin"
curl -s -X POST http://localhost:8000/authoring/draft -H "X-Admin-Token: dev-admin" -H "Content-Type: application/json" \
  -d '{"brief":{"title":"test","register":"laukika","bridge_lang":"hi","topic":"greetings"},"n_turns":3,"dry_run":true}'

# speech benches (offline tools, not request path)
.venv/Scripts/python scripts/bench_asr.py --synthetic --n 8     # Saaras p50/p95 vs 800ms budget
.venv/Scripts/python scripts/render_sarvam.py --dry-run          # Bulbul render plan
```

## Tests

```bash
.venv/Scripts/python -m pytest -q        # 166 tests — grading engine, API, content invariants, evals, dialogue graph, conversation runtime, authoring, speech benches
```

## LLM evals

Which LLM should author and grade Sanskrit is an open question — so it is measured,
not argued. The harness scores candidate models with the *same* Vidyut analyzer the
product grades learners with, so a result here predicts shipped behaviour.

```bash
.venv/Scripts/python -m app.evals --providers sarvam,gemini --tasks generate,diagnose
```

Providers are `name` or `name:model` — `sarvam` (default `sarvam-105b`), `gemini`,
`openai`, `anthropic`. Keys come from the environment or `backend/.env`:
`SARVAM_API_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`.
Unconfigured providers are skipped, not failed.

Three tasks, all built from the 37 seed challenges so ground truth is never invented:

| task | asks | headline metric |
|---|---|---|
| `generate` | English + required features -> Sanskrit | `gate` — Vidyut parses it confidently |
| `diagnose` | is this learner attempt wrong, and how? | `diag` — right word *and* right fix |
| `translate` | Sanskrit -> English | `tr-f1` — content-word overlap |

`diagnose` cases come in pairs: a corrupted sentence, and the untouched correct one
as a control. The control measures `falseacc` — how often a model calls a correct
answer wrong. For a tutor that is the worst failure mode, and the reason the grading
engine abstains rather than guess; a model that fails it cannot be trusted to grade
regardless of its other scores.

Corruptions are derived, not hand-written: a gold stem is re-inflected through the
analyzer's own paradigm tables, then re-analyzed, and kept only if it parses back to
the wrong feature intended. Each is wrong in exactly one known way. Endings that
would trigger ṇatva (`rāma` + `ena` -> `rāmeṇa`) are skipped so a corruption never
carries a second, unintended error.

**Read every quality column against `yield`** — the share of calls that returned a
usable reply at all. Quality metrics average only over completed replies, so a model
whose calls truncate is scored on the ones it managed to finish; without `yield` next
to it, `gate 100%` can mean "perfect" or "perfect on the 59% that came back". Reasoning
models hit this hard: they can burn the whole `--max-tokens` budget thinking and return
empty. Truncated calls are still charged, since the tokens were generated.

**`INR/ok` is the column that decides deployment.** A weak model behind the Vidyut
gate does not ship wrong Sanskrit — it gets rejected and regenerated. So accuracy
shows up as cost and latency, not as errors reaching learners: real spend scales
with `1/gate`, not with the sticker token price.

Useful flags: `--limit N` (first N challenges — cheap smoke run), `--dry-run` (build
cases, no API calls), `--show-failures N` (raw output of failing cases),
`--out results.jsonl`, `--markdown board.md`, `--pricing pricing.json`.

Responses are cached on disk by (provider, model, case, prompt), so re-running after
a scorer change costs nothing. Failed calls are never cached. `--no-cache` forces
live calls.

Pricing in `providers.py` is approximate and hand-maintained — treat `INR` columns as
order-of-magnitude, and refresh from vendor pricing pages before quoting a number.

## Layout

```
app/
  main.py            app factory, CORS, timing middleware
  config.py          pydantic-settings (env)
  db.py              SQLAlchemy engine/session
  models.py          Learner, Challenge, Feature, Shloka, Attempt, Token, Dialogue*, EscapeLog, ConversationSession
  schemas.py         pydantic v2 request/response
  auth.py            token auth + admin guard
  adaptive.py        mastery updates (SM-2-inspired), edge-of-mastery selection, no-repeat window, user-owned sanskrit_ratio ceiling
  grading/
    analyzer.py      rule engine + Vidyut cross-check + transliteration
    engine.py        feature-set comparison, variants, abstention, diagnosis
  routers/           health, auth, me, challenges, attempts, shlokas, grammar, admin, pipeline, speech,
                     conversation (dialogue-graph turns), authoring (admin pipeline)
  services/          sarvam (Bulbul TTS + Saaras STT),
                     session_store (conversation sessions), turn_loop (no-LLM turn engine), authoring (draft→gate→render)
  evals/             LLM benchmark: provider adapters, tasks, Vidyut-backed scorers, CLI
  seeds/             37 challenges (32 laukika + 5 classical), 50-feature taxonomy, 3 ślokas, varnamala, 30-node dialogue scenario
scripts/             diagnostic harnesses (seed coverage, negative cases, live verify, bench_asr, render_sarvam)
tests/               pytest suite (isolated temp DB)
```

## Known limitations (v0.2 — conversation milestone)

- Rule analyzer covers a-stem (masc/neut/fem), i-stem masc, present-tense verbs, common indeclinables. Vidyut fills gaps per-word; broader stem classes (consonant stems, ātmanepada) land with the Vidyut-primary path.
- Chedaka is used per-word only — sentence-context Chedaka over-segments (verified empirically), so it contributes alternatives, never primary parses.
- Dialogue graph audio: rendered via Bulbul (`scripts/render_sarvam.py`). Sanskrit nodes currently render through `hi-IN`; re-run with `--sa-language sa-IN` once the Sarvam beta flag lands.
- ASR bench numbers are on synthetic audio; re-run on real code-mixed recordings before locking the §12 budget.
- Authoring LLM calls are mocked in tests and gated behind `SHABD_AUTHORING_LIVE=1` for real runs; first live Sarvam authoring pass pending.
- SQLite single-file DB; Postgres migration is a config change when needed.
