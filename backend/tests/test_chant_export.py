"""chant_export: what a later render run still needs (handover_recite 5.5)."""

import json
import sqlite3
import sys


def _db(path, rows):
    con = sqlite3.connect(str(path))
    con.execute("create table shlokas (id text, date text, source_ref text, devanagari text)")
    for i, (ref, dev) in enumerate(rows):
        con.execute("insert into shlokas values (?,?,?,?)", (str(i), f"2026-01-{i + 1:02d}", ref, dev))
    con.commit()
    con.close()


def _run(monkeypatch, db, out, *extra):
    from scripts import chant_export

    monkeypatch.setattr(chant_export, "_db_path", lambda: db)
    monkeypatch.setattr(sys, "argv", ["chant_export", "--out", str(out), *extra])
    chant_export.main()
    return [json.loads(l) for l in out.read_text(encoding="utf-8").splitlines() if l.strip()]


def test_exclude_jobs_leaves_out_verses_a_run_already_has(tmp_path, monkeypatch):
    rows = [("Bhagavad Gītā 1.1", "धर्मक्षेत्रे कुरुक्षेत्रे समवेता युयुत्सवः ।\nमामकाः पाण्डवाश्चैव किमकुर्वत सञ्जय ॥ १ ॥"),
            ("Mahābhārata 5.33.1", "राज्ञो धृतराष्ट्रो महीपतिः विदुरं द्रष्टुम् इच्छामि तम् इहानय माचिरम् ॥ १ ॥"),
            ("Yoga Sūtra 1.2", "योगश्चित्तवृत्तिनिरोधः ॥ १.२ ॥")]
    db = tmp_path / "t.db"
    _db(db, rows)
    everything = _run(monkeypatch, db, tmp_path / "all.jsonl")
    assert len(everything) == 3
    # A first run that had only the Gītā verse; the rest is what it has not seen.
    first = tmp_path / "first.jsonl"
    first.write_text(json.dumps(everything[0], ensure_ascii=False) + "\n", encoding="utf-8")
    rest = _run(monkeypatch, db, tmp_path / "rest.jsonl", "--exclude-jobs", str(first))
    assert [j["source_ref"] for j in rest] == ["Mahābhārata 5.33.1", "Yoga Sūtra 1.2"]
    # And it combines with --books.
    yoga = _run(monkeypatch, db, tmp_path / "yoga.jsonl", "--exclude-jobs", str(first), "--books", "Yoga Sūtra")
    assert [j["source_ref"] for j in yoga] == ["Yoga Sūtra 1.2"]
    # Two files, comma-separated.
    second = tmp_path / "second.jsonl"
    second.write_text(json.dumps(everything[1], ensure_ascii=False) + "\n", encoding="utf-8")
    last = _run(monkeypatch, db, tmp_path / "last.jsonl", "--exclude-jobs", f"{first},{second}")
    assert [j["source_ref"] for j in last] == ["Yoga Sūtra 1.2"]


def test_exclude_jobs_names_a_missing_file(tmp_path, monkeypatch):
    import pytest

    db = tmp_path / "t.db"
    _db(db, [("Yoga Sūtra 1.2", "योगश्चित्तवृत्तिनिरोधः ॥ १.२ ॥")])
    with pytest.raises(SystemExit, match="no such file"):
        _run(monkeypatch, db, tmp_path / "o.jsonl", "--exclude-jobs", str(tmp_path / "nope.jsonl"))
