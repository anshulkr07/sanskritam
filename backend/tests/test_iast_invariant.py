"""P7-13 — the IAST invariant: every stored IAST is what vidyut.lipi produces.

This is a content invariant with a free oracle: `services/iast.matches` calls
the same lipi routine the frozen analyzer uses, so a regression (someone
re-introducing model-authored or hand-typed transliterations) fails here
without any fixture data.

The assertions run inside the conftest-built test database (migrations +
seeds), i.e. exactly the content a fresh install would serve.
"""

import pytest

from app.models import Challenge, DailyWord, Shloka
from app.services.iast import matches


@pytest.fixture(scope="module")
def _db(client):
    from app.db import SessionLocal

    db = SessionLocal()
    yield db
    db.close()


def test_challenge_iast_is_lipi_derived(_db):
    rows = _db.query(Challenge).all()
    assert rows, "challenge table should be seeded"
    bad = [
        r.target_sanskrit
        for r in rows
        if not matches(r.target_sanskrit or "", r.target_iast or "")
    ]
    assert not bad, f"{len(bad)} challenge rows carry non-lipi IAST: {bad[:5]}"


def test_shloka_iast_is_lipi_derived(_db):
    rows = _db.query(Shloka).all()
    assert rows, "shloka table should be seeded"
    bad = [
        r.source_ref
        for r in rows
        if not matches(r.devanagari or "", r.iast or "")
    ]
    assert not bad, f"{len(bad)} shloka rows carry non-lipi IAST: {bad[:5]}"


def test_daily_word_iast_is_lipi_derived(_db):
    rows = _db.query(DailyWord).all()
    assert rows, "daily_words table should be seeded"
    bad = [
        r.answer
        for r in rows
        if not matches(r.answer or "", r.answer_iast or "")
    ]
    assert not bad, f"{len(bad)} daily-word rows carry non-lipi IAST: {bad[:5]}"


def test_insert_pass_derives_iast_even_from_stale_cached_draft(client, _db):
    """A draft that still carries a model-supplied target_iast (e.g. replayed
    from a P7-13-era cache) must not have it stored — lipi's reading wins."""
    from app.services.challenge_authoring import insert_pass

    stale = {
        "target_sanskrit": "बालकं पश्यामि।",
        "target_iast": "balakam pashyaami.",  # ITRANS-style, what the model used to emit
        "features": [],
        "accepted_parses": [],
        "register": "laukika",
    }
    cid, inserted = insert_pass(_db, stale)
    assert inserted
    row = _db.query(Challenge).filter(Challenge.id == cid).first()
    assert row is not None
    assert matches(row.target_sanskrit, row.target_iast), (
        f"stored IAST {row.target_iast!r} is not lipi's reading"
    )
    # cleanup — the test DB must not gain content rows
    _db.delete(row)
    _db.commit()
