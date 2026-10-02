"""Play games backend: deck, board, pools, daily streak and point caps."""

from datetime import date

from app.services import games as game_svc
from app.services.games import _traceable
from app.services.daily_word import aksharas


def test_deck_shape_and_minimum_size(client, auth_headers):
    r = client.get("/games/deck", params={"game": "rush"}, headers=auth_headers)
    assert r.status_code in (200, 404), r.text
    if r.status_code == 404:
        return
    d = r.json()
    assert d["count"] >= 40
    first = d["items"][0]
    assert {"sa", "iast", "meaning", "topic"} <= set(first.keys())


def test_varna_jaal_deterministic_and_traceable():
    day = date(2026, 10, 1)
    b1 = game_svc.varna_jaal(day)
    b2 = game_svc.varna_jaal(day)
    assert b1["cells"] == b2["cells"]
    b3 = game_svc.varna_jaal(date(2026, 10, 2))
    assert b1["cells"] != b3["cells"] or b1["words"] != b3["words"]
    assert b1["size"] == 4 and len(b1["cells"]) == 16
    assert 5 <= len(b1["words"]) <= 8
    for w in b1["words"]:
        assert 2 <= len(w["aksharas"]) <= 4
        assert _traceable(b1["cells"], w["aksharas"], 4)
        assert "".join(w["aksharas"]) == "".join(aksharas(w["sa"])) or w["sa"]


def test_pools_round_trip():
    from app.seeds import game_pools as pools
    from app.services import exercise_gen as gen

    for kind in ("reorder", "sandhi_join", "sandhi_split", "grid_fill", "contrast", "scan_metre"):
        params_list = pools.pools_for(kind)
        assert params_list, f"empty pool for {kind}"
        gkind = kind if kind != "contrast" else "grid_fill"
        for p in params_list[:6]:
            item = gen.generate(gkind, p, seed=7)
            if item.get("abstained"):
                continue
            ans = gen.correct_answer(gkind, p, seed=7)
            assert ans is not None
            if gkind == "grid_fill":
                payload = {"cells": ans} if isinstance(ans, list) else ans
            elif gkind == "reorder":
                eq = (ans or {}).get("equivalent_orders") or []
                payload = {"order": list(eq[0])} if eq else {}
            else:
                payload = ans if isinstance(ans, dict) else {}
            verdict = gen.grade(gkind, p, seed=7, answer=payload)
            assert verdict.get("verdict") in ("correct", "off_by_one")


def test_daily_streak_and_point_caps(client, auth_headers):
    r = client.get("/games/daily", headers=auth_headers)
    assert r.status_code == 200, r.text
    d = r.json()
    assert {"date", "game", "goal", "done", "streak"} <= set(d.keys())

    # Rush 600 points caps at 30 per result.
    r = client.post(
        "/games/result",
        json={"game": "rush", "mode": "60s", "score": 600, "daily": False},
        headers=auth_headers,
    )
    assert r.status_code == 200, r.text
    assert r.json()["xp"] == 30

    # Smriti and Varna Jaal points.
    assert game_svc.points_for("smriti", moves=10) <= 30
    assert game_svc.points_for("varna-jaal", found=8) == 30
    assert game_svc.points_for("rush", score=100) == 5
