# Shabd Backend

Audio-first Sanskrit learning API. FastAPI + SQLAlchemy + SQLite. Runs on Windows/Python 3.11 with no GPU.

## Grading design (the core IP, in 5 lines)

1. Answers are graded by **morphological feature set** (NOM.SG, PRES.3SG...), never by string — so free word order works: `ग्रामं गच्छामि` == `गच्छामि ग्रामम्`.
2. Ambiguous forms (`au`, `e`, `oḥ`, neut NOM/ACC) produce **all valid readings**; the attempt is accepted if any reading matches.
3. **Abstention**: if a word can't be parsed confidently, the attempt is marked `abstained` and never "incorrect" — a false accusation destroys trust (spec §6.3).
4. One-feature-off answers get `off_by_one` with a diagnosis **naming the exact feature** ("the object takes the accusative") — that specificity is the product.
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
```

## Tests

```bash
.venv/Scripts/python -m pytest -q        # 32 tests — grading engine, API, content invariants
```

## Layout

```
app/
  main.py            app factory, CORS, timing middleware
  config.py          pydantic-settings (env)
  db.py              SQLAlchemy engine/session
  models.py          Learner, Challenge, AcceptedParse, Feature, Shloka, Attempt, Token, Session
  schemas.py         pydantic v2 request/response
  auth.py            token auth + admin guard
  adaptive.py        mastery updates (SM-2-inspired), edge-of-mastery selection, no-repeat window
  grading/
    analyzer.py      rule engine + Vidyut cross-check + transliteration
    engine.py        feature-set comparison, variants, abstention, diagnosis
  routers/           health, auth, me, challenges, attempts, shlokas, grammar, admin, pipeline
  seeds/             37 challenges (32 laukika + 5 classical), 50-feature taxonomy, 3 ślokas, varnamala
scripts/             diagnostic harnesses (seed coverage, negative cases, live verify)
tests/               pytest suite (isolated temp DB)
```

## Known limitations (v0.1)

- Rule analyzer covers a-stem (masc/neut/fem), i-stem masc, present-tense verbs, common indeclinables. Vidyut fills gaps per-word; broader stem classes (consonant stems, ātmanepada) land with the Vidyut-primary path.
- Chedaka is used per-word only — sentence-context Chedaka over-segments (verified empirically), so it contributes alternatives, never primary parses.
- No audio yet (audio_url null). TTS/ASR per architecture.md §4 lands in a later milestone.
- SQLite single-file DB; Postgres migration is a config change when needed.
