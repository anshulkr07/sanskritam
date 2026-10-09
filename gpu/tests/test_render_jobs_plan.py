"""Reseed planning reads qc.jsonl and plans only flagged parts with untried seeds."""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from tts.plan import plan_reseeds  # noqa: E402


def test_plan_only_flagged_untried(tmp_path):
    qc = tmp_path / "qc.jsonl"
    rows = [
        {"verse_uid": "u1", "line_i": 0, "part_j": 0, "seed": 60, "flags": [], "cer": 0.02},
        {"verse_uid": "u1", "line_i": 0, "part_j": 1, "seed": 60, "flags": ["cer"], "cer": 0.3},
        {"verse_uid": "u1", "line_i": 0, "part_j": 1, "seed": 61, "flags": ["cer"], "cer": 0.2},
    ]
    qc.write_text("\n".join(json.dumps(r) for r in rows), encoding="utf-8")
    plan = plan_reseeds(str(qc), [61, 63, 64])
    assert ("u1", 0, 1) in plan
    assert plan[("u1", 0, 1)] == [63, 64]
    assert ("u1", 0, 0) not in plan
