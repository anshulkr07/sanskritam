# Spec D — Authoring pipeline (build order step 3): Sarvam draft → Vidyut gate → human spot-check → render shard

## Context

Shabd (D:\Projects\Shabd) backend. FastAPI + SQLAlchemy 2.0 + SQLite, Python 3.11, Windows/git-bash. Venv: `backend/.venv/Scripts/python`. Tests: `cd backend && .venv/Scripts/python -m pytest tests/ -q`.

Architecture §12: "Authoring: Sarvam drafts → Vidyut gates → human spot-checks → Bulbul renders → CDN. The pipeline is the product; the first scenario is the proof." Model routing (§4.3): `sarvam-105b-conversations` for drafting (₹0.0055/sentence, 100% Vidyut gate), **Gemini for any dual-bearing content** (Sarvam false-accuses 50% of duals). Never `sarvam-105b` (reasoning variant) — dead ends.

Existing assets you MUST reuse (read them first):
- `backend/app/evals/providers.py` — has async provider adapters incl. Sarvam + Gemini, cached calls. Reuse or import its client code; extend, don't duplicate.
- `backend/app/grading/analyzer.py` — `analyze_sentence`, `feature_set_from_results`, `is_confident`, `feature_set_variants`.
- `backend/app/grading/engine.py` — `grade_attempt`.
- `backend/scripts/render_sarvam.py` + `backend/app/services/sarvam.py` — Bulbul `sa-IN` is the renderer (architecture.md §4.1). **No local renderer**: the former `ParlerRenderer` is deleted, API-only per §1.
- `backend/app/models.py` — DialogueScenario/Node/Edge land from another agent; if absent, code against the schema below and skip those tests.

## Build

### 1. Pipeline module — `backend/app/services/authoring.py`

```python
async def draft_turns(scenario_brief: dict, n_turns: int, with_dual: bool = False) -> list[dict]
```
- brief = {title, register, ratio_band, bridge_lang, topic, sample_features}. Uses the Sarvam conversations model via providers.py (model id "sarvam-105b-conversations"; read providers.py to see how models are addressed there and follow its convention).
- Prompt demands: JSON array of turns: {devanagari, iast, gloss_en, expected_learner_sanskrit, features[]}. For with_dual=True route to Gemini instead (env GEMINI_API_KEY via providers).
- `async def gate_drafts(drafts: list[dict]) -> list[dict]` — for each turn: analyze `expected_learner_sanskrit`; must be confident; build accepted_parses via feature_set_from_results; cross-check the draft's claimed features are a subset of derived values; mark {**draft, gate: "pass"|"fail", derived_parses, reason}.
- `async def run_authoring(brief, n_turns, with_dual=False, dry_run=False) -> dict` — orchestrates draft → gate → (dry_run stops here) → build DialogueScenario/Node/Edge rows (node per tutor turn + one ask_again repair per node wired in a chain, sa-edges from accepted_parses; entry = first node) → return {scenario_id, n_nodes, n_edges, n_gated, n_failed, failures[]}. Only gate-passed turns become nodes; failed ones go to failures[] with reasons.
- Deterministic + idempotent: re-running with the same brief replaces (delete + recreate) the scenario of that title ONLY when `replace=True` is passed; default refuses when title exists.
- Cache LLM drafts on disk (follow providers.py cache pattern if it has one; else `.authoring-cache/` keyed by brief hash).

### 2. Render pass — extend `backend/app/services/authoring.py`

```python
async def render_scenario(scenario_id: str, out_dir: str = "results/sarvam", shard_id: str | None = None) -> dict
```
- Collect every DialogueNode of the scenario with audio_url == "", map to render items {id: node_id, text: devanagari (or gloss for hi/en nodes), lang: node.lang mapped sa→"sa", hi→"hi", en→"en"}.
- Render via the Bulbul path. On success set node.audio_url to the file path (relative, CDN-swappable). On renderer unavailable (no API key / API error), return {status: "skipped", reason} — never raise.
- Report {status: "rendered"|"skipped", rendered: N, failed: [...], shard_manifest_path}.

### 3. Admin endpoints — `backend/app/routers/authoring.py` (new file)

Admin-guarded (reuse `require_admin` from app/auth.py, header X-Admin-Token):

```
POST /authoring/draft    {brief, n_turns, with_dual, dry_run}  → draft+gate report (NO DB writes)
POST /authoring/scenario {brief, n_turns, with_dual, replace}  → full run → creates scenario
POST /authoring/render   {scenario_id}                          → render pass report
GET  /authoring/scenarios                                        → list authored scenarios w/ node+edge counts
```

Register in main.py (import + include_router, tags=["Authoring"]).

### 4. Tests — `backend/tests/test_authoring.py`

- gate_drafts with a MOCKED provider (monkeypatch the draft function to return 3 canned drafts: one clean "अहं फलं खादामि", one with a made-up word, one dual-bearing when with_dual) → gate marks pass/fail correctly, derived_parses non-empty on pass.
- run_authoring dry_run=True writes nothing to DB (count scenarios before/after).
- run_authoring with mocked provider + replace=True creates nodes+edges; sa-edges' accepted_parses grade "correct" on their own expected text (reuse grade_attempt); repair chain exists (every tutor node has ≥1 outgoing edge).
- render_scenario: monkeypatch the Bulbul render call to write dummy files → audio_url set; monkeypatch it to raise → status "skipped", no exception.
- Endpoints: auth-guarded (401 without admin token); /authoring/scenarios returns authored scenario after mocked run.
- LLM calls in tests are ALWAYS mocked — no network in pytest. Add a `SHABD_AUTHORING_LIVE=1` env gate in the router/module for real runs (default off).

## Constraints

- No changes to grading/, adaptive.py, existing routers (main.py: add 2 lines).
- requirements.txt untouched. **No GPU or model dependencies** — API-only per architecture.md §1.
- providers.py may be EXTENDED (add a conversations-model helper if missing) but its existing function signatures must not break — evals depend on them.

## Output

Report: files created/modified, endpoint list, mocked-run proof (scenario_id, node/edge counts, gate pass/fail table), pytest result.
