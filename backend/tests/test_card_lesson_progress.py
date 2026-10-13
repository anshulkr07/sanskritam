"""POST /progress/card-lesson: Learn card lessons count toward XP and the streak."""


def test_first_finish_earns_xp_and_repeat_only_marks_the_day(client, auth_headers):
    first = client.post("/progress/card-lesson", json={"lesson_id": "verbs-number", "checks_right": 2, "checks_total": 2}, headers=auth_headers)
    assert first.status_code == 200, first.text
    body = first.json()
    assert body["xp"] == 10 and body["first_time"] is True

    again = client.post("/progress/card-lesson", json={"lesson_id": "verbs-number"}, headers=auth_headers)
    assert again.status_code == 200, again.text
    assert again.json()["xp"] == 0 and again.json()["first_time"] is False

    daily = client.get("/progress/daily", headers=auth_headers).json()
    assert daily["xp"] >= 10
    assert daily["attempts"] >= 2

    history = client.get("/progress/history", headers=auth_headers).json()
    assert history and history[-1]["date"] == daily["date"]


def test_card_lesson_rows_do_not_count_as_game_points(client, auth_headers):
    client.post("/progress/card-lesson", json={"lesson_id": "sandhi-boundary"}, headers=auth_headers)
    r = client.post("/games/result", json={"game": "rush", "mode": "words", "score": 400}, headers=auth_headers)
    assert r.status_code == 200, r.text
    # A rush score of 400 is worth 20 points; card-lesson rows must not eat into the games' 60/day cap.
    assert r.json()["xp"] == 20


def test_lesson_id_is_required(client, auth_headers):
    r = client.post("/progress/card-lesson", json={"lesson_id": "  "}, headers=auth_headers)
    assert r.status_code == 422
