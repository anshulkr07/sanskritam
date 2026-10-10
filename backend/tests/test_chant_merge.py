"""chant_merge: the newest audio per verse, nothing stale carried over."""

import json

import pytest

from scripts import chant_merge


def _run(tmp_path, name, rows, decisions=None):
    d = tmp_path / name
    (d / "audio").mkdir(parents=True)
    for r in rows:
        (d / "audio" / r["file"]).write_bytes(r["file"].encode() * 10)
    (d / "manifest.jsonl").write_text("\n".join(json.dumps(r) for r in rows) + "\n", encoding="utf-8")
    dp = None
    if decisions is not None:
        dp = tmp_path / f"{name}_decisions.json"
        dp.write_text(json.dumps({"decisions": decisions}), encoding="utf-8")
    return (name, d, dp)


def _row(uid, f, status="needs_listen", **kw):
    r = {"verse_uid": uid, "source_ref": "Gita " + uid, "voice": "v1", "file": f, "duration_ms": 5000,
         "lines": [{"i": 0, "start_ms": 200, "end_ms": 4800}], "qc_status": status, "qc_reasons": ["unknown_meter"]}
    r.update(kw)
    return r


def test_the_newer_run_replaces_the_older_audio_and_its_decision(tmp_path):
    first = _run(tmp_path, "main", [_row("a", "a-1.m4a"), _row("b", "b-1.m4a", "auto_ok")], {"a": "approved"})
    fix = _run(tmp_path, "fix1", [_row("a", "a-2.m4a")], {})            # new audio for a; nobody has heard it
    out = tmp_path / "final"
    report = chant_merge.merge([first, fix], out)
    rows = {json.loads(l)["verse_uid"]: json.loads(l) for l in (out / "manifest.jsonl").read_text(encoding="utf-8").splitlines()}
    assert rows["a"]["file"] == "a-2.m4a" and rows["a"]["run"] == "fix1" and rows["b"]["run"] == "main"
    assert sorted(p.name for p in (out / "audio").iterdir()) == ["a-2.m4a", "b-1.m4a"]     # a-1 is left behind
    dec = json.loads((out / "decisions.json").read_text(encoding="utf-8"))["decisions"]
    assert "a" not in dec                                                 # the old approval does not carry over
    assert report["effective_status"] == {"needs_listen": 1, "auto_ok": 1}
    assert report["superseded"][0]["old_file"] == "a-1.m4a" and report["superseded"][0]["new_file"] == "a-2.m4a"


def test_a_decision_for_the_new_audio_is_kept(tmp_path):
    first = _run(tmp_path, "main", [_row("a", "a-1.m4a")], {})
    fix = _run(tmp_path, "fix1", [_row("a", "a-2.m4a")], {"a": "approved"})
    out = tmp_path / "final"
    report = chant_merge.merge([first, fix], out)
    assert report["effective_status"] == {"approved": 1}


def test_missing_audio_or_a_shared_file_is_refused(tmp_path):
    run = _run(tmp_path, "main", [_row("a", "a-1.m4a")])
    (tmp_path / "main" / "audio" / "a-1.m4a").unlink()
    with pytest.raises(SystemExit, match="missing or empty"):
        chant_merge.merge([run], tmp_path / "o1")
    shared = _run(tmp_path, "dup", [_row("a", "same.m4a"), _row("b", "same.m4a")])
    with pytest.raises(SystemExit, match="two verses"):
        chant_merge.merge([shared], tmp_path / "o2")


def test_main_writes_a_checked_mapping(tmp_path):
    first = _run(tmp_path, "main", [_row("a", "a-1.m4a")], {"a": "approved"})
    out = tmp_path / "final"
    spec = f"main={first[1]}|{first[2]}"
    assert chant_merge.main(["--out", str(out), spec]) == 0
    mapping = json.loads((out / "mapping.json").read_text(encoding="utf-8"))
    assert mapping["verses"]["a"]["key"] == "chant/v1/a-1.m4a"
