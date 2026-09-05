# Spec A — Dialogue graph: data model + migration + 30-turn seed scenario

## Context

Sanskritam (D:\Projects\Shabd) is an audio-first Sanskrit learning backend. FastAPI + SQLAlchemy 2.0 + SQLite, Python 3.11, Windows/git-bash. Venv: `backend/.venv` (run as `backend/.venv/Scripts/python`). Alembic migrations in `backend/migrations/versions/` — current head is `1861932777ab`. On startup `app.db.init_db()` runs `alembic upgrade head` then a **schema drift guard** that fails startup if models and DB disagree — so your migration must exactly match your models.

Architecture (architecture.md §12): conversation is a **pre-rendered dialogue graph**. Node = one tutor turn (audio_url pre-rendered, Devanagari, IAST, gloss, lang, sanskrit_ratio band). Edge = an expected learner response keyed by **morphological feature set, not string**. Register is `laukika` for conversation. No Sanskrit is synthesised in the request path (not your concern here — audio_url may be empty until the render pass fills it).

## Build

### 1. Models — append to `backend/app/models.py`

Follow the existing style exactly (Column JSON defaults, `_uuid`, `_utcnow`, `to_dict` where useful):

- `DialogueScenario`: id, title, description, register (default "laukika", index), entry_node_id (String, nullable), min_ratio (Float, default 0.0), max_ratio (Float, default 1.0), est_minutes (Integer, default 5), created_at.
- `DialogueNode`: id, scenario_id (FK scenarios, index), kind ("tutor" | "repair"), repair_type (String, nullable: "ask_again" | "narrow" | "bridge"), lang ("sa" | "hi" | "en"), devanagari (Text), iast (Text, default ""), gloss (Text, default ""), audio_url (String 512, default ""), ratio_band_min (Float, default 0.0), ratio_band_max (Float, default 1.0), sort (Integer, default 0). Relationship to scenario.
- `DialogueEdge`: id, scenario_id (FK), from_node_id (FK nodes, index), to_node_id (FK nodes, nullable for terminal), lang ("sa" | "bridge"), expected_text (Text, default "" — sample answer, shown in test console), accepted_parses (JSON, list of {word_role: feature} dicts — SAME shape as Challenge.accepted_parses; empty for bridge edges), expected_phrases (JSON, list of str — lowercase substrings for bridge-edge matching; empty for sa edges), features (JSON, list of feature ids), rank (Integer, default 0).
- `EscapeLog`: id, learner_id (FK learners, nullable for anonymous tests), scenario_id, node_id, transcript (Text), parsed_features (JSON), verdict (String 16), ts. Indexed on (scenario_id, node_id).

### 2. Alembic migration

Hand-write `backend/migrations/versions/<rev>_dialogue_graph.py` (down_revision = current head). Include every column and the indexes. Verify on a scratch DB:

```bash
cd backend && DB_PATH=scratch_test.db .venv/Scripts/python -c "from app.db import init_db; init_db(); print('ok')" && rm scratch_test.db
```

The drift guard must pass with zero output errors.

### 3. Seed scenario — `backend/app/seeds/dialogue.py`

FIRST read `backend/app/seeds/challenges.py` and `backend/app/grading/analyzer.py` to learn the exact feature-token vocabulary (NOM.SG, ACC.SG, ABL.SG, LOC.SG, INSTR.PL, PRES.1SG, INDCL, √gam, √khād, √vas, √as, √paṭh, √āgam...) and how `accepted_parses` are written. Reuse those tokens verbatim.

Author ONE hand-written scenario, "प्रथमं मेलनम्" (First meeting): a beginner introductions conversation, register laukika, ratio band 0.2–0.5. Exactly **30 nodes** total (tutor turns + repair nodes + bridge fallback nodes). Every sa-edge's `accepted_parses` must be derivable by the analyzer — this is enforced: after writing the seed, run this validation loop and iterate until it is all green:

```python
# scratch validation (run from backend/ with venv python)
from app.grading.engine import grade_attempt
from app.seeds.dialogue import SCENARIO  # however you structure it
for edge in all_edges:
    if edge["lang"] == "sa":
        r = grade_attempt(edge["expected_text"], edge["accepted_parses"], edge["features"])
        assert r["verdict"] == "correct", (edge["expected_text"], r["verdict"], r["diagnosis"])
```

If the analyzer rejects a verb/root or stem class you used, swap that item for a covered one (a-stems, i-stem masc, present tense, the roots listed above) — do NOT weaken the validation.

Content outline (expand to exactly 30 nodes with additional repair/narrow/bridge variants as listed):

- n01 (hi, tutor): "नमस्ते! आइए, हम संस्कृत में बात करेंगे। तैयार हैं?" — bridge edges: ["हाँ","yes","तैयार","जी","haan","ready"] → n02; ["नहीं","no","not"] → repair n01r.
- n01r (hi, repair ask_again): "कोई बात नहीं। जब तैयार हों तो 'हाँ' कहें।" → bridge edge back to n02.
- 12 Sanskrit QA nodes, tutor reacts + asks next in the same node (sa, tutor). Questions in this order, each with 1–2 sa-edges (expected_text + accepted_parses + features), second parse where a natural shorter answer exists (e.g. with/without अस्मि):
  1. "साधु! भवान् कः?" — learner: "अहं रामः अस्मि।" {aham:INDCL, rāma:NOM.SG, √as:PRES.1SG} (alt: without verb)
  2. "भवान् कुतः आगच्छति?" — "अहं ग्रामात् आगच्छामि।" {grāma:ABL.SG, √āgam:PRES.1SG}
  3. "भवान् किं खादति?" — "अहं फलं खादामि।" {phala:ACC.SG, √khād:PRES.1SG}
  4. "भवान् कुत्र वसति?" — "अहं गृहे वसामि।" {gṛha:LOC.SG, √vas:PRES.1SG}
  5. "भवान् किं पठति?" — "अहं पुस्तकं पठामि।" {pustaka:ACC.SG, √paṭh:PRES.1SG}
  6. "भवान् कुत्र गच्छति?" — "अहं विद्यालयं गच्छामि।" {vidyālaya:ACC.SG, √gam:PRES.1SG}
  7. "भवान् कैः सह गच्छति?" — "अहं मित्रैः सह गच्छामि।" {mitra:INSTR.PL, √gam:PRES.1SG}
  8. "भवान् गृहे किं करोति?" — "अहं पठामि।" {√paṭh:PRES.1SG}
  9. "भवान् कदा विद्यालयं गच्छति?" — "अहं प्रातः गच्छामि।" {prātar:INDCL, √gam:PRES.1SG}
  10. "भवान् अद्य कुत्र तिष्ठति?" — "अहं गृहे तिष्ठामि।" {√sthā:PRES.1SG}
  11. "भवान् किं करोति?" — "अहं कार्यं करोमि।" {kārya:ACC.SG, √kṛ:PRES.1SG} (validate; swap if analyzer disagrees)
  12. "भवान् संस्कृतं वदति वा?" — "आम्, अहं संस्कृतं वदामि।" {saṃskṛta:ACC.SG, √vad:PRES.1SG}
  Give every QA node correct sandhi in tutor text (e.g. "अहं रामः अस्मि" — sandhi inside learner answers is the analyzer's job, tutor text just needs to be valid Sanskrit). Fill unused slots (to reach 30 nodes) with: 2 bridge drop nodes (hi: "चलिए इसे हिंदी में कहें: आप कहाँ रहते हैं?" with bridge edges back into the graph), 3 narrow repairs (sa: "सही शब्द चुनें — क्या आपने 'गृहे' कहा?" style prompts pointing at the expected feature), 2 more ask_again repairs, 1 praise bridge node (hi "बहुत बढ़िया!"), 1 closing sa node: "धन्यवाद! भवान् शोभनं संस्कृतं वदति। पुनर्मिलामः।" with a bridge edge ["पुनर्मिलामः","bye","धन्यवाद","alvida","अलविदा"] to a terminal node (to_node_id NULL on that final edge, or a node with no outgoing edges — pick one convention and document it in the module docstring).
- Wire `dialogue.py` into `backend/app/seeds/seed.py` so `run_seed()` populates it (idempotent: skip if scenario title already exists).

### 4. Tests — `backend/tests/test_dialogue_content.py`

- Scenario loads, has exactly 30 nodes, all nodes reachable from entry via edges.
- Every sa-edge grades `correct` on its own expected_text (the validation above, as a test).
- No sa-edge grades `unsure` on its expected_text.
- Repairs have repair_type set; tutor nodes have audio_url default "".

### Environment notes

- Test command: `cd backend && .venv/Scripts/python -m pytest tests/test_dialogue_content.py -q` (full suite later: `pytest -q`).
- Do NOT touch: main.py, other routers, seeds other than adding yours, grading/*, requirements.txt.
- Windows: use git-bash compatible commands.

## Output

Report: files created/modified, migration revision id, the validation loop result (N edges correct), and pytest result.
