"""make_mapping: the run is checked whole and every verse is mapped to its key."""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import make_mapping as M  # noqa: E402


def _run(tmp_path, rows, files):
    (tmp_path / "audio").mkdir()
    for name, data in files.items():
        (tmp_path / "audio" / name).write_bytes(data)
    (tmp_path / "manifest.jsonl").write_text("\n".join(json.dumps(r) for r in rows) + "\n", encoding="utf-8")
    return M.build(tmp_path)


def _row(uid, f, **kw):
    r = {"verse_uid": uid, "source_ref": "Gita " + uid, "voice": "v1", "file": f, "duration_ms": 5000,
         "lines": [{"i": 0, "start_ms": 200, "end_ms": 4800}], "qc_status": "auto_ok", "qc_reasons": []}
    r.update(kw)
    return r


def test_a_whole_run_is_mapped(tmp_path):
    mapping, problems = _run(tmp_path, [_row("a", "a-1.m4a"), _row("b", "b-2.m4a", qc_status="needs_listen", qc_reasons=["pause"])],
                             {"a-1.m4a": b"x" * 10, "b-2.m4a": b"y" * 20})
    assert problems == []
    assert mapping["storage_prefix"] == "chant/v1/"
    assert mapping["counts"] == {"verses": 2, "auto_ok": 1, "needs_listen": 1}
    assert mapping["verses"]["b"]["key"] == "chant/v1/b-2.m4a" and mapping["verses"]["b"]["bytes"] == 20


def test_a_broken_run_is_refused(tmp_path):
    rows = [_row("a", "a-1.m4a"),
            _row("b", "missing.m4a"),                                   # no such audio
            _row("c", "a-1.m4a"),                                       # one file on two verses
            _row("a", "z.m4a"),                                         # a verse twice
            _row("d", "d.m4a", lines=[{"i": 0, "start_ms": 200, "end_ms": 9000}])]  # outside its audio
    _, problems = _run(tmp_path, rows, {"a-1.m4a": b"x", "d.m4a": b"d", "stray.m4a": b"s"})
    text = "\n".join(problems)
    for needle in ("missing.m4a", "two verses", "twice", "outside", "stray.m4a"):
        assert needle in text, (needle, text)
