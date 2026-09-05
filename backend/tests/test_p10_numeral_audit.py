# ─── P10-1: numeral coverage audit (scripts/p10_numeral_audit.py) ───────────


def _audit_rows():
    from scripts.p10_numeral_audit import NUMERALS, _classify
    return [_classify(d, i, v) for (d, i, v) in NUMERALS]


def test_numeral_audit_runs_without_network():
    """The audit classifies every numeral without any vendor call."""
    rows = _audit_rows()
    assert len(rows) == len(
        __import__("scripts.p10_numeral_audit", fromlist=["NUMERALS"]).NUMERALS
    )
    assert all(r["status"] in ("ok", "unresolved", "misparse") for r in rows)


def test_numeral_audit_flags_confident_misparses():
    """पञ्च is the documented dangerous failure: a CONFIDENT vocative reading.
    The audit must keep flagging it while the analyzer stays frozen (§2.1) —
    if this test ever passes with 'ok', the analyzer changed under us."""
    rows = {r["word"]: r for r in _audit_rows()}
    assert rows["पञ्च"]["status"] == "misparse"
    assert rows["पञ्च"]["confident"] is True


def test_lilavati_vocab_parses_cleanly():
    """The 12 common Līlāvatī words all parse confident — no misparse."""
    from scripts.p10_numeral_audit import LILAVATI_VOCAB, _classify
    rows = [_classify(d, i, 0) for (d, i) in LILAVATI_VOCAB]
    assert all(r["status"] == "ok" for r in rows), [r for r in rows if r["status"] != "ok"]
