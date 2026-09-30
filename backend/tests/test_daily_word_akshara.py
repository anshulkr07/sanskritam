"""The daily word played by tapping whole akṣaras (P12, akshara mode).

The original game counts Unicode code points, so पुस्तक is six tiles (प ु स ् त
क) and the learner has to type Devanagari. Akshara mode makes the akṣara the
unit: पुस्तक is three, offered from a bank to tap. These tests pin the
segmentation, the bank, the scoring, and that the original mode is unchanged for
the app already in testing.
"""

import pytest

from app.seeds.daily_words import _CURATED
from app.services import daily_word


def _login(client, name):
    r = client.post("/auth/dev-login", json={"display_name": name, "bridge_langs": ["en", "hi"]})
    assert r.status_code == 200
    return {"Authorization": f"Bearer {r.json()['token']}"}


def _todays_answer():
    """The answer for the newest learner's local day (test-only path)."""
    from app.db import SessionLocal
    from app.models import Learner

    db = SessionLocal()
    try:
        learner = db.query(Learner).order_by(Learner.created_at.desc()).first()
        day = daily_word._resolve_date(learner)
        return daily_word._select_word(db, day).answer
    finally:
        db.close()


SEGMENTS = {
    "पुस्तक": ["पु", "स्त", "क"],
    "संस्कृत": ["सं", "स्कृ", "त"],
    "चन्द्र": ["च", "न्द्र"],
    "विद्या": ["वि", "द्या"],
    "भ्राता": ["भ्रा", "ता"],
    "वृक्ष": ["वृ", "क्ष"],
    "अग्नि": ["अ", "ग्नि"],
    "पर्वत": ["प", "र्व", "त"],
    "कमल": ["क", "म", "ल"],
    "बालिका": ["बा", "लि", "का"],
}


# ─── Segmentation ─────────────────────────────────────────────────────────

@pytest.mark.parametrize("word, expected", list(SEGMENTS.items()))
def test_aksharas_split_the_way_the_word_is_written(word, expected):
    assert daily_word.aksharas(word) == expected


def test_every_curated_word_segments_and_joins_back():
    """The segmentation may never drop or invent a character, for any word the
    game can serve, and no tile is a lone vowel sign or virama."""
    for dev, *_ in _CURATED:
        parts = daily_word.aksharas(dev)
        assert "".join(parts) == dev, dev
        assert 1 <= len(parts) <= len(dev)
        for p in parts:
            assert p[0] not in "ािीुूृ्", (dev, p)


def test_aksharas_never_loses_text_it_cannot_parse():
    text = "ऽॐ१"  # avagraha, om, a digit: outside the pattern
    assert "".join(daily_word.aksharas(text)) == text
    assert daily_word.aksharas("") == []


# ─── The bank ─────────────────────────────────────────────────────────────

def test_bank_holds_every_letter_the_word_needs_and_is_sized():
    for dev, *_ in _CURATED:
        bank = daily_word.build_bank(dev, "2026-09-30")
        needed = daily_word.aksharas(dev)
        for ak in set(needed):
            assert bank.count(ak) >= needed.count(ak), (dev, ak, bank)
        assert daily_word.BANK_MIN <= len(bank) <= max(daily_word.BANK_MAX, len(needed)), (dev, bank)
        # the bank offers something wrong, or the game is a copy exercise
        assert len(bank) > len(needed), (dev, bank)


def test_bank_is_stable_for_a_day_and_differs_by_day():
    a = daily_word.build_bank("पुस्तक", "2026-09-30")
    b = daily_word.build_bank("पुस्तक", "2026-09-30")
    assert a == b
    orders = {tuple(daily_word.build_bank("पुस्तक", f"2026-10-{d:02d}")) for d in range(1, 10)}
    assert len(orders) > 1, "the order should not be the same every day"


def test_bank_distractors_are_near_misses():
    """कमल: at least one extra tile is a neighbour of क, म or ल, not random."""
    bank = daily_word.build_bank("कमल", "2026-09-30")
    extras = [t for t in bank if t not in ("क", "म", "ल")]
    assert extras
    assert any(daily_word._akshara_near(e, a) for e in extras for a in ("क", "म", "ल")), extras


# ─── Scoring ──────────────────────────────────────────────────────────────

def test_akshara_tiles_exact_present_near_absent():
    answer = ["क", "म", "ल"]
    tiles = daily_word._akshara_tiles(["ग", "ल", "ज"], answer)
    # ग: same place as क, voicing differs => near
    assert tiles[0] == {"character": "ग", "state": "near", "axis": "voicing"}
    # ल: in the word, at the wrong position => present
    assert tiles[1]["state"] == "present"
    # ज: nowhere near => absent
    assert tiles[2]["state"] == "absent"
    assert [t["state"] for t in daily_word._akshara_tiles(answer, answer)] == ["exact"] * 3


def test_akshara_near_names_the_axis():
    n = daily_word._akshara_near
    assert n("ख", "क") == "aspiration"
    assert n("ग", "क") == "voicing"
    assert n("की", "कि") == "length"
    assert n("का", "क") == "length"
    assert n("आ", "अ") == "length"
    # the rest of the akṣara must match: कि is not near गु
    assert n("कि", "गु") is None
    # a far letter is not near, and a letter is not near itself
    assert n("प", "क") is None
    assert n("क", "क") is None


def test_repeated_letters_are_not_over_credited():
    # Answer क ता; guess ता ता: the first ता is misplaced but there is only one
    # ता (and त is three places from क, so it is not near either).
    tiles = daily_word._akshara_tiles(["ता", "ता"], ["क", "ता"])
    assert [t["state"] for t in tiles] == ["absent", "exact"]
    # Answer ता ता; guess ता का: the first is exact, the second absent (क is far from त).
    tiles = daily_word._akshara_tiles(["ता", "का"], ["ता", "ता"])
    assert [t["state"] for t in tiles] == ["exact", "absent"]


# ─── The endpoints ────────────────────────────────────────────────────────

def test_puzzle_reports_letters_and_bank_but_not_the_answer(client):
    headers = _login(client, "dwa-bank")
    body = client.get("/daily-word", headers=headers).json()
    assert body["letters"] >= 1
    assert daily_word.BANK_MIN <= len(body["bank"])
    assert body["revealed"] is None
    # word_length still counts code points: the app already in testing needs it
    assert body["word_length"] >= body["letters"]


def test_akshara_guess_solves_with_letters(client):
    headers = _login(client, "dwa-solve")
    answer = _todays_answer()
    letters = daily_word.aksharas(answer)
    r = client.post(
        "/daily-word/guess",
        json={"guess": "".join(letters), "mode": "akshara", "letters": letters},
        headers=headers,
    )
    body = r.json()
    assert body["solved"] is True, body
    assert [t["character"] for t in body["tiles"]] == letters
    assert all(t["state"] == "exact" for t in body["tiles"])
    assert body["revealed"]["answer"] == answer


def test_akshara_guess_uses_the_letters_not_a_resegmentation(client):
    """Two tiles that would merge into one conjunct when joined stay two tiles."""
    headers = _login(client, "dwa-merge")
    n = len(daily_word.aksharas(_todays_answer()))
    letters = ["क्"] + ["म"] * (n - 1)  # क् followed by म would join to क्म
    r = client.post(
        "/daily-word/guess",
        json={"guess": "".join(letters), "mode": "akshara", "letters": letters},
        headers=headers,
    )
    body = r.json()
    assert body["status"] != "refused", body
    assert len(body["tiles"]) == n


def test_akshara_guess_wrong_length_is_refused(client):
    headers = _login(client, "dwa-len")
    n = len(daily_word.aksharas(_todays_answer()))
    letters = ["क"] * (n + 1)
    r = client.post(
        "/daily-word/guess",
        json={"guess": "".join(letters), "mode": "akshara", "letters": letters},
        headers=headers,
    )
    body = r.json()
    assert body["status"] == "refused"
    assert body["reason"] == "length_mismatch"


def test_legacy_code_point_mode_is_unchanged(client):
    """No `mode`: the request the app already in testing sends behaves as before."""
    headers = _login(client, "dwa-legacy")
    answer = _todays_answer()
    r = client.post("/daily-word/guess", json={"guess": answer}, headers=headers)
    body = r.json()
    assert body["solved"] is True
    # code-point tiles: one per Unicode code point, exactly as before
    assert len(body["tiles"]) == len(answer)


def test_legacy_wrong_length_is_still_refused_in_code_points(client):
    headers = _login(client, "dwa-legacy-len")
    r = client.post("/daily-word/guess", json={"guess": "क"}, headers=headers)
    body = r.json()
    assert body["status"] == "refused"
    assert body["reason"] == "length_mismatch"


def test_finished_day_returns_the_answer_on_get(client):
    headers = _login(client, "dwa-revealed")
    answer = _todays_answer()
    assert client.get("/daily-word", headers=headers).json()["revealed"] is None
    client.post("/daily-word/guess", json={"guess": answer}, headers=headers)
    body = client.get("/daily-word", headers=headers).json()
    assert body["finished"] is True
    assert body["revealed"]["answer"] == answer
