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


def test_only_flags_leaves_out_what_a_new_seed_cannot_change(tmp_path):
    # A new seed changes what is said (cer, repeats), not the length or a pause.
    qc = tmp_path / "qc.jsonl"
    rows = [
        {"verse_uid": "u1", "line_i": 0, "part_j": 0, "seed": 60, "flags": ["cer"]},
        {"verse_uid": "u1", "line_i": 1, "part_j": 0, "seed": 60, "flags": ["pause"]},
        {"verse_uid": "u1", "line_i": 2, "part_j": 0, "seed": 60, "flags": ["short", "pause"]},
        {"verse_uid": "u1", "line_i": 3, "part_j": 0, "seed": 60, "flags": ["repeats"]},
        {"verse_uid": "u1", "line_i": 4, "part_j": 0, "seed": 60, "flags": []},
        # pause on the first take, cer on a reseed: now there is something a seed can mend
        {"verse_uid": "u2", "line_i": 0, "part_j": 0, "seed": 60, "flags": ["pause"]},
        {"verse_uid": "u2", "line_i": 0, "part_j": 0, "seed": 61, "flags": ["cer"]},
    ]
    qc.write_text(chr(10).join(json.dumps(r) for r in rows), encoding="utf-8")
    everything = plan_reseeds(str(qc), [61, 63, 64])
    assert set(everything) == {("u1", 0, 0), ("u1", 1, 0), ("u1", 2, 0), ("u1", 3, 0), ("u2", 0, 0)}
    only = plan_reseeds(str(qc), [61, 63, 64], {"cer", "repeats"})
    assert set(only) == {("u1", 0, 0), ("u1", 3, 0), ("u2", 0, 0)}
    assert only[("u1", 0, 0)] == [61, 63, 64] and only[("u2", 0, 0)] == [63, 64]


def test_fresh_seeds_are_planned_once_the_usual_ones_are_used_up(tmp_path):
    qc = tmp_path / "qc.jsonl"
    rows = [{"verse_uid": "u1", "line_i": 0, "part_j": 0, "seed": s, "flags": ["cer"]} for s in (60, 61, 63, 64)]
    qc.write_text(chr(10).join(json.dumps(r) for r in rows), encoding="utf-8")
    assert plan_reseeds(str(qc), [61, 63, 64], {"cer"}) == {}                    # nothing left to try
    assert plan_reseeds(str(qc), [65, 66, 67, 68], {"cer"}) == {("u1", 0, 0): [65, 66, 67, 68]}
