# Spec C — Conversation runtime (build order step 5): turn loop, edge matching, repair moves, escape log

## Context

Sanskritam (D:\Projects\Shabd) backend. FastAPI + SQLAlchemy 2.0 + SQLite, Python 3.11, Windows/git-bash. Venv: `backend/.venv/Scripts/python`. Tests: `cd backend && .venv/Scripts/python -m pytest tests/ -q`.

Conversation = pre-rendered dialogue graph (architecture.md §12). **The live turn is ASR → grade → pick next → cached audio. No LLM in the request path.** Edge matching MUST reuse `backend/app/grading/engine.py::grade_attempt` unchanged — import it, never fork it. Free word order, ambiguity variants, and the abstention rule come for free from that function.

## Prereqs (built by another agent — code against these interfaces; if absent at runtime, SKIP the conversation tests with `pytest.skip` on import error, but write them)

- `app.models`: `DialogueScenario` (id, title, description, register, entry_node_id, min_ratio, max_ratio, est_minutes), `DialogueNode` (id, scenario_id, kind "tutor"|"repair", repair_type "ask_again"|"narrow"|"bridge"|None, lang "sa"|"hi"|"en", devanagari, iast, gloss, audio_url, ratio_band_min, ratio_band_max, sort), `DialogueEdge` (id, scenario_id, from_node_id, to_node_id nullable, lang "sa"|"bridge", expected_text, accepted_parses JSON list of {role: feature}, expected_phrases JSON list[str] for bridge edges, features JSON list[str], rank), `EscapeLog` (id, learner_id nullable, scenario_id, node_id, transcript, parsed_features, verdict, ts).
- `app.seeds.dialogue`: seeds one 30-node scenario "प्रथमं मेलनम्" via `run_seed()`.

Read those files first when they exist (check with a quick import or read) and reconcile — the interface above is the contract; if the actual differs slightly, adapt to the ACTUAL code you find and note it in your report.

## Build

### 1. Router — `backend/app/routers/conversation.py`

```
GET  /conversation/scenarios                     → [{id, title, description, register, est_minutes, node_count}]
POST /conversation/start                         → StartResponse
POST /conversation/turn                          → TurnResponse
GET  /conversation/escape-log?scenario_id=...    → admin-ish list (learner-scoped: own entries) with counts grouped by node_id
```

Auth: same `require_learner` dependency as other routers (see `app/auth.py`). Register with `app.include_router(conversation_router, tags=["Conversation"])` in `backend/app/main.py` (this file you ARE allowed to touch — one import + one include_router line, nothing else).

Schemas in `backend/app/schemas.py` (append; don't reorder existing):

- `StartRequest {scenario_id: str | None = None}` — None → first scenario by created_at.
- `StartResponse {session_id, scenario: {id, title, description, est_minutes}, node: NodeOut, edges: [EdgeOut]}` where `NodeOut {id, kind, lang, devanagari, iast, gloss, audio_url, repair_type}` and `EdgeOut {id, lang, expected_text, features}` (accepted_parses deliberately NOT sent to client — server-side only).
- `TurnRequest {session_id, edge_id: str | None = None, transcript: str}` — transcript is the learner's Sanskrit/bridge utterance (text; audio→text via /speech/stt happens client-side before this call).
- `TurnResponse {verdict, diagnosis, matched: bool, node: NodeOut | None, edges: [EdgeOut], session_done: bool, escape: bool, ratio_hint: float}`.

### 2. Session state — `backend/app/services/session_store.py`

SQLite-backed, simple:

- `ConversationSession` model IN THIS FILE (SQLAlchemy Base from app.db): id (pk str), learner_id, scenario_id, current_node_id, turn_count (int), ratio_hint (float, init from learner.sanskrit_ratio), started_at, updated_at. Add `__tablename__ = "conversation_sessions"`.
- Because models live in `app.models` and migrations are Alembic-managed with a drift guard: EITHER put the model in `app/models.py` (preferred) and hand-write migration `<rev>_conversation_sessions.py` (down_revision = whatever head is AFTER spec A's agent lands — read `backend/migrations/versions/` at build time, pick the newest revision id as your down_revision; if you collide, use `alembic heads` logic: just chain yours onto the newest file's revision), OR — simpler and also acceptable — `Table(...)` defined in session_store.py and registered on the same Base BEFORE init_db runs. Model-in-models.py + migration is the preferred path.
- Functions: `create_session(db, learner, scenario) -> ConversationSession`, `get_session(db, session_id, learner_id) -> ConversationSession | None` (404/403 semantics handled in router), `advance(db, session, node_id, ratio_hint_delta=0.0)`.

### 3. Turn loop — `backend/app/services/turn_loop.py`

> **Implemented with deltas (audited 2026-09-08):** code is `async
> process_turn(...)`, schemas live in-router (not `schemas.py`), plus
> `edge_router` (LLM), `meta_intent`, and quota extensions not in this spec.
> Default turn is now LLM (`mode='llm'`, owner decision 2026-09-08) with the
> graph path as fallback — see `architecture.md` §12.

```python
async def process_turn(db, learner, session, transcript, edge_id=None) -> dict
```

Logic, in order:

1. Load current node. Gather outgoing edges. If `edge_id` provided, treat as client-pinned choice (test console convenience): validate it belongs to current node.
2. Find the matching edge: for each edge (ordered by rank):
   - `lang == "bridge"`: transcript lowercased contains any `expected_phrases` substring → match.
   - `lang == "sa"`: `grade_attempt(transcript, edge.accepted_parses, edge.features)` → verdict `"correct"` → match. Record its result for reuse.
   - An `off_by_one` sa-edge result is remembered as `near_edge` (best candidate) but does NOT match.
3. If matched:
   - Bridge edge: advance to edge.to_node_id. No grading side-effects. verdict "correct".
   - sa edge: apply adaptive update via the EXISTING adaptive module (`app/adaptive.py` — read it; reuse its mastery-update function the same way `routers/attempts.py` does for a correct verdict — mirror its call exactly, features = edge.features). Then advance.
4. If not matched:
   - Escape path per §12: log to EscapeLog (learner_id, scenario_id, node_id=current, transcript, parsed_features from best grade attempt or {}, verdict from best grade attempt or "no_match"), then pick repair: if `near_edge` exists (off_by_one) → repair node of type "narrow" wired from current node (seed guarantees one exists; fall back to any child repair node); else repair "ask_again" node. Advance to the repair node. escape=true, matched=false, verdict = the grade verdict (off_by_one → its diagnosis; unsure → "unsure" handling: diagnosis text explains grading abstained, never says wrong).
   - Repair nodes have their own outgoing edges (usually one bridge edge back into the flow or a retry edge to the same question's edges).
5. Terminal: node with no outgoing edges OR to_node_id null edge → session_done=true. Mark session done (set current_node_id to the terminal node id; turn_count += 1; keep row).
6. ratio_hint: +0.02 on every correct sa match, −0.05 on escape, no change on unsure/bridge. Clamp [0, 1]. Stored on session (NOT on learner.sanskrit_ratio — the conversation dial is per-session pressure, per §12 "code-switching is the pressure valve"; learner ratio untouched by conversation in v1).
7. Return dict matching TurnResponse (router wraps).

Grading rules (from §6.3, non-negotiable): verdict from grade_attempt is authoritative. Never transform "unsure" into "incorrect". Escape logging happens for ANY unmatched utterance including empty/whitespace transcript (verdict "empty").

### 4. Tests — `backend/tests/test_conversation.py`

Fixtures: reuse `client` + `auth_headers` from conftest.py. Seed data must exist (conftest runs run_seed()).

- start → node is the entry node, edges present, accepted_parses NOT in response.
- full happy path: iterate turns by posting expected_text for each sa edge from entry until session_done — count turns, assert ≤ 40 (graph must be completable), assert every intermediate response has matched=true for correct answers.
- free word order: at the first sa question, post the expected words in a different order where the grammar allows (e.g. if expected "अहं रामः अस्मि", also accept "रामः अहं अस्मि" — verify via grade_attempt offline in the test first, only assert API-level if offline grade says correct; otherwise skip that specific sub-assert).
- off_by_one at first sa question (post a one-feature-off answer, e.g. wrong case ending — find one that grades off_by_one offline first; e.g. "अहं रामम् अस्मि") → matched=false, escape=true, next node kind == "repair", EscapeLog row exists with verdict "off_by_one".
- unsure path: post gibberish Devanagari ("फ़लदफ़दफ़") → never verdict "incorrect"; escape logged.
- bridge fallback: from entry post "हाँ" → matched via bridge edge, no escape row, no mastery change.
- escape-log endpoint returns grouped counts.
- session ownership: learner B cannot post a turn to learner A's session (403 or 404, pick and document).

### Constraints

- No LLM calls anywhere in the turn path. No new requirements.txt entries.
- Reuse grade_attempt + adaptive as libraries. Do not modify grading/ or adaptive.py.
- main.py: exactly two lines changed (import + include).
- If models/migration from spec A aren't present when you run, your tests skip cleanly — but the router/service code must still be complete and import-safe.

## Output

Report: files created/modified (exact paths), endpoint list with schemas, test results (X passed / skipped), and any contract deviations from spec A's actual code.
