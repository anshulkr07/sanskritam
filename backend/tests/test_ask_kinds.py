"""Ask answers sized to the question: kinds, FACTS against Drik Panchang, prompt.

Handover handover_ask_answers.md section 8. Zero network except Drik pages
read 2026-10-05 (comments say which page and the date read). All Drik times
are New Delhi, 12-hour as printed, converted here to 24-hour IST.
"""

from datetime import date, datetime
from zoneinfo import ZoneInfo

import pytest

from app.services import ask_facts, ask_live, kundli, panchang

DELHI = {"lat": 28.6139, "lon": 77.2090, "tz": "Asia/Kolkata", "label": "New Delhi"}
IST = ZoneInfo("Asia/Kolkata")


def _mins(hhmm: str) -> int:
    h, m = hhmm.split(":")
    return int(h) * 60 + int(m)


def _ist(dt):
    return dt.astimezone(IST)


# ── clip per kind ─────────────────────────────────────────────────────

def _big_text(n, w="word"):
    return " ".join(f"{w}{i}" for i in range(n))


def test_clip_fact_is_short_and_drops_everything_else():
    card = ask_live.clip({
        "kind": "fact", "title": _big_text(20), "summary": _big_text(100),
        "sections": [{"heading": "Extra", "style": "bullets", "items": ["x"] * 8}],
        "terms": [{"sa": "धर्मः", "meaning": "duty"}],
        "verses": [{"sa": "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन", "ref": "Bhagavad Gita 2.47",
                    "meaning": _big_text(100)}],
        "sources": [{"title": "x", "url": "https://example.edu/x"}],
        "follow_ups": ["a", "b", "c"],
    })
    assert card["kind"] == "fact"
    assert len(card["summary"].split()) <= 45
    assert card["sections"] == [] and card["terms"] == [] and card["verses"] == []
    assert card["sources"] == []
    assert len(card["follow_ups"]) <= 2
    assert len(card["title"].split()) <= 8


def test_clip_table_caps_and_drops_sections():
    card = ask_live.clip({
        "kind": "table", "summary": _big_text(100),
        "table": {"columns": ["a", "b", "c", "d", "e", "f"],
                  "rows": [[_big_text(20)] * 6] * 20},
        "sections": [{"heading": "x", "style": "bullets", "items": ["y"]}],
    })
    assert card["kind"] == "table"
    assert len(card["summary"].split()) <= 30
    assert len(card["table"]["columns"]) <= 5
    assert len(card["table"]["rows"]) <= 14
    assert all(len(" ".join(r).split()) <= 40 for r in card["table"]["rows"])
    assert all(len(c.split()) <= 8 for r in card["table"]["rows"] for c in r)
    # Old phone draws the compat section.
    assert card["sections"] and card["sections"][0]["style"] == "bullets"


def test_clip_reading_two_sections():
    card = ask_live.clip({
        "kind": "reading", "summary": _big_text(200),
        "sections": [
            {"heading": "Main points", "style": "bullets", "items": [_big_text(60)] * 8},
            {"heading": "Remedies", "style": "bullets", "items": [_big_text(60)] * 5},
            {"heading": "Third", "style": "bullets", "items": ["x"]},
        ],
    })
    assert card["kind"] == "reading"
    assert len(card["summary"].split()) <= 70
    assert len(card["sections"]) <= 2
    assert all(len(s["items"]) <= 5 for s in card["sections"])
    assert all(len(i.split()) <= 40 for s in card["sections"] for i in s["items"])


def test_clip_remedies_caps():
    card = ask_live.clip({
        "kind": "remedies", "summary": _big_text(100),
        "remedies": [{
            "name": _big_text(10), "type": "drink",
            "what": [_big_text(10)] * 8, "how": [_big_text(30)] * 6, "when": _big_text(30),
        }] * 8,
        "sections": [{"heading": "Avoid", "style": "bullets", "items": ["a", "b", "c", "d", "e"]}],
    })
    assert card["kind"] == "remedies"
    assert len(card["remedies"]) <= 5
    r = card["remedies"][0]
    assert len(r["name"].split()) <= 5 and len(r["what"]) <= 5 and len(r["how"]) <= 4
    assert all(len(w.split()) <= 5 for w in r["what"])
    assert all(len(h.split()) <= 18 for h in r["how"])
    assert len(r["when"].split()) <= 15
    assert len(card["sections"]) <= 6
    assert any(s["style"] == "steps" for s in card["sections"])
    # The Avoid section survives for both phones, capped to 4 items.
    avoid = next(s for s in card["sections"] if "avoid" in (s.get("heading") or "").casefold())
    assert len(avoid["items"]) <= 4


def test_clip_verses_meaning_apply_more():
    card = ask_live.clip({
        "kind": "verses", "summary": _big_text(200),
        "verses": [
            {"sa": "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन", "ref": "Bhagavad Gita 2.47",
             "meaning": _big_text(100), "apply": _big_text(60)},
        ] * 5,
        "more": {"label": "See more verses", "question": "Give more verses on sadness"},
        "sections": [{"heading": "x", "style": "bullets", "items": ["a", "b", "c", "d"]}],
    })
    assert card["kind"] == "verses"
    assert len(card["verses"]) <= 3
    assert len(card["verses"][0]["meaning"].split()) <= 45
    assert len(card["verses"][0]["apply"].split()) <= 22
    assert len(card["sections"]) <= 1 and len(card["sections"][0]["items"]) <= 3
    assert card["more"]["label"] and card["more"]["question"]


def test_clip_procedure_caps():
    card = ask_live.clip({
        "kind": "procedure", "summary": _big_text(200),
        "sections": [
            {"heading": "What you need", "style": "bullets", "items": [_big_text(20)] * 15},
            {"heading": "Steps", "style": "steps", "items": [_big_text(40)] * 15},
            {"heading": "Avoid", "style": "bullets", "items": ["a", "b", "c", "d"]},
            {"heading": "Extra", "style": "bullets", "items": ["x"] * 10},
            {"heading": "Fifth", "style": "bullets", "items": ["y"]},
        ],
        "verses": [{"sa": "ॐ नमः शिवाय", "ref": "Mantra", "meaning": "x"}] * 5,
    })
    assert card["kind"] == "procedure"
    assert len(card["sections"]) <= 4 and len(card["verses"]) <= 2
    need = next(s for s in card["sections"] if "need" in s["heading"].casefold())
    assert all(len(i.split()) <= 6 for i in need["items"])
    steps = next(s for s in card["sections"] if "step" in s["heading"].casefold())
    assert all(len(i.split()) <= 22 for i in steps["items"])


def test_clip_explain_caps():
    card = ask_live.clip({
        "kind": "explain", "summary": _big_text(200),
        "sections": [{"heading": f"s{i}", "style": "bullets", "items": [_big_text(60)] * 6} for i in range(6)],
        "verses": [{"sa": "ॐ नमः शिवाय", "ref": "Mantra", "meaning": "x"}] * 5,
        "terms": [{"sa": "धर्मः", "meaning": "duty"}] * 6,
    })
    assert card["kind"] == "explain"
    assert len(card["summary"].split()) <= 70
    assert len(card["sections"]) <= 4
    assert all(len(s["items"]) <= 4 for s in card["sections"])
    assert all(len(i.split()) <= 35 for s in card["sections"] for i in s["items"])
    assert len(card["verses"]) <= 2 and len(card["terms"]) <= 4


def test_unknown_kind_becomes_explain():
    assert ask_live.clip({"kind": "sutra", "summary": "x"})["kind"] == "explain"
    assert ask_live.clip({"summary": "x"})["kind"] == "explain"


def test_empty_table_or_remedies_falls_back_with_summary_kept():
    c1 = ask_live.clip({"kind": "table", "summary": "months kept", "table": {"columns": ["a", "b"], "rows": []}})
    assert c1["kind"] == "explain" and c1["summary"] == "months kept"
    c2 = ask_live.clip({"kind": "remedies", "summary": "cold kept", "remedies": []})
    assert c2["kind"] == "explain" and c2["summary"] == "cold kept"


# ── more ──────────────────────────────────────────────────────────────

def test_more_appends_surviving_refs():
    card = {"kind": "verses", "more": {"label": "See more verses", "question": "More verses on grief"},
            "verses": [{"ref": "Bhagavad Gita 2.14"}, {"ref": "Bhagavad Gita 2.47"}]}
    ask_live.finalize_more(card)
    assert card["more"]["question"].endswith("(not: Bhagavad Gita 2.14, Bhagavad Gita 2.47)")


def test_more_dropped_when_no_verse_survives():
    card = {"kind": "verses", "more": {"label": "See more verses", "question": "More"},
            "verses": []}
    ask_live.finalize_more(card)
    assert card["more"] is None


# ── streaming, store key ──────────────────────────────────────────────

def test_partial_carries_kind_table_remedies_not_verses_or_more():
    import json
    raw = {"kind": "table", "title": "Months", "summary": "Twelve months.",
           "table": {"columns": ["En", "Sa"], "rows": [["Chaitra", "चैत्र"]]},
           "verses": [{"sa": "ॐ", "ref": "x", "meaning": "y"}], "more": {"label": "l", "question": "q"}}
    card = ask_live.partial_card(json.dumps(raw))
    assert card is not None and card["kind"] == "table"
    assert card["table"]["rows"] and "verses" not in card and "more" not in card


def test_store_key_v2_and_tradition_with_months():
    assert ask_live.store_key("What is dharma?", "2026-10-05|28.6,77.2").startswith("v2|")
    assert ask_live.store_key("List months", "2026-10-05|28.6,77.2|deccan").endswith("|deccan")


# ── prompt contract ───────────────────────────────────────────────────

def test_prompt_names_kinds_and_template_fields():
    p = ask_live.SYSTEM_PROMPT
    for k in ("fact", "table", "reading", "remedies", "verses", "procedure", "explain"):
        assert f'"{k}"' in p
    assert "SHAPE HINT" in p and "hint" in p.casefold()
    assert '"kind"' in p and '"table"' in p and '"remedies"' in p and '"more"' in p
    assert '"apply"' in p
    assert "as long as the question needs and no longer" in p
    assert "what matters most" in p


def test_shape_hint():
    assert ask_live._shape_hint("What time is Brahma muhurta tomorrow?",
                                "- Brahma muhurta on x", "", "") == "fact"
    assert ask_live._shape_hint("List the months", "MONTHS (Vikram", "", "") == "table"
    assert ask_live._shape_hint("My job?", "", "CHART (calculated", "") == "reading"
    assert ask_live._shape_hint("What is dharma?", "", "", "") == ""


def test_kundli_line_gone():
    from app.services.kundli import chart as _chart
    from datetime import datetime, timezone
    born = datetime(1990, 6, 15, 5, 30, tzinfo=timezone.utc)
    c = _chart(datetime(1990, 6, 15, 11, 0, tzinfo=ZoneInfo("Asia/Kolkata")),
               28.6, 77.2, time_known=True)
    assert "Gun milan" not in kundli.facts_text(c)


# ── Drik Panchang: Brahma muhurta ─────────────────────────────────────
# Day pages for New Delhi, read 2026-10-05. Tolerance ±1 minute (handover 4.1).

BRAHMA = [
    # (civil date, Drik Brahma start, Drik Brahma end, Drik sunrise)
    (date(2026, 3, 21), "04:49", "05:37", "06:24"),  # day-panchang 21/03/2026
    (date(2026, 6, 21), "04:04", "04:44", "05:24"),  # day-panchang 21/06/2026
    (date(2026, 12, 21), "05:20", "06:15", "07:10"),  # day-panchang 21/12/2026
]


@pytest.mark.parametrize("day,start,end,sunrise", BRAHMA)
def test_brahma_muhurta_matches_drik(day, start, end, sunrise):
    bm = panchang.brahma_muhurta(day, DELHI)
    assert bm is not None
    s, e, sr = (_ist(x).strftime("%H:%M") for x in bm)
    assert abs(_mins(s) - _mins(start)) <= 1, (day, s, start)
    assert abs(_mins(e) - _mins(end)) <= 1, (day, e, end)
    assert abs(_mins(sr) - _mins(sunrise)) <= 2, (day, sr, sunrise)


def test_brahma_facts_line_and_chip():
    facts, when_text, *_ = ask_facts.calendar_facts("What time is Brahma muhurta tomorrow?", "", DELHI)
    assert "Brahma muhurta on" in facts and "(sunrise" in facts
    assert when_text.startswith("Brahma muhurta,") and "Today," not in when_text


# ── Drik Panchang: Amavasya and Purnima ───────────────────────────────
# Year lists for New Delhi, read 2026-10-05:
# Amavasya 2026/2027: vrats/amavasyadates.html?year=2026 (and 2027, geoname-id 1261481).
# Purnima 2026/2027: vrats/purnimasidates.html?year=2026 (and 2027, geoname-id 1261481).
# Each entry is the month's named tithi (Darsha/Vrat duplicates share the
# same span and are listed once). Begin/end tolerance 5 minutes; the civil
# day (sunrise inside the tithi, else the date it begins) must match exactly.

AMAVASYA_2026 = [
    # (day, begins HH:MM + begins date, ends HH:MM + ends date)
    (date(2026, 1, 18), (date(2026, 1, 18), "00:03"), (date(2026, 1, 19), "01:21")),
    (date(2026, 2, 17), (date(2026, 2, 16), "17:34"), (date(2026, 2, 17), "17:30")),
    (date(2026, 3, 19), (date(2026, 3, 18), "08:25"), (date(2026, 3, 19), "06:52")),
    (date(2026, 4, 17), (date(2026, 4, 16), "20:11"), (date(2026, 4, 17), "17:21")),
    (date(2026, 5, 16), (date(2026, 5, 16), "05:11"), (date(2026, 5, 17), "01:30")),
    (date(2026, 6, 15), (date(2026, 6, 14), "12:19"), (date(2026, 6, 15), "08:23")),
    (date(2026, 7, 14), (date(2026, 7, 13), "18:49"), (date(2026, 7, 14), "15:12")),
    (date(2026, 8, 12), (date(2026, 8, 12), "01:52"), (date(2026, 8, 12), "23:06")),
    (date(2026, 9, 11), (date(2026, 9, 10), "10:33"), (date(2026, 9, 11), "08:56")),
    (date(2026, 10, 10), (date(2026, 10, 9), "21:35"), (date(2026, 10, 10), "21:19")),
    (date(2026, 11, 9), (date(2026, 11, 8), "11:27"), (date(2026, 11, 9), "12:31")),
    (date(2026, 12, 8), (date(2026, 12, 8), "04:12"), (date(2026, 12, 9), "06:21")),
]

AMAVASYA_2027 = [
    (date(2027, 1, 7), (date(2027, 1, 6), "23:13"), (date(2027, 1, 8), "01:53")),
    (date(2027, 2, 6), (date(2027, 2, 5), "19:05"), (date(2027, 2, 6), "21:25")),
    (date(2027, 3, 8), (date(2027, 3, 7), "13:46"), (date(2027, 3, 8), "14:58")),
    (date(2027, 4, 6), (date(2027, 4, 6), "05:40"), (date(2027, 4, 7), "05:20")),
    (date(2027, 5, 6), (date(2027, 5, 5), "18:16"), (date(2027, 5, 6), "16:27")),
    (date(2027, 6, 4), (date(2027, 6, 4), "04:05"), (date(2027, 6, 5), "01:09")),
    (date(2027, 7, 4), (date(2027, 7, 3), "12:05"), (date(2027, 7, 4), "08:31")),
    (date(2027, 8, 2), (date(2027, 8, 1), "19:19"), (date(2027, 8, 2), "15:34")),
    (date(2027, 8, 31), (date(2027, 8, 31), "02:40"), (date(2027, 8, 31), "23:10")),
    (date(2027, 9, 30), (date(2027, 9, 29), "10:54"), (date(2027, 9, 30), "08:05")),
    (date(2027, 10, 29), (date(2027, 10, 28), "20:47"), (date(2027, 10, 29), "19:05")),
    (date(2027, 11, 28), (date(2027, 11, 27), "09:07"), (date(2027, 11, 28), "08:53")),
    (date(2027, 12, 27), (date(2027, 12, 27), "00:22"), (date(2027, 12, 28), "01:41")),
]

PURNIMA_2026 = [
    (date(2026, 1, 3), (date(2026, 1, 2), "18:53"), (date(2026, 1, 3), "15:32")),
    (date(2026, 2, 1), (date(2026, 2, 1), "05:52"), (date(2026, 2, 2), "03:38")),
    (date(2026, 3, 3), (date(2026, 3, 2), "17:55"), (date(2026, 3, 3), "17:07")),
    (date(2026, 4, 2), (date(2026, 4, 1), "07:06"), (date(2026, 4, 2), "07:41")),
    (date(2026, 5, 1), (date(2026, 4, 30), "21:12"), (date(2026, 5, 1), "22:52")),
    (date(2026, 5, 31), (date(2026, 5, 30), "11:57"), (date(2026, 5, 31), "14:14")),
    (date(2026, 6, 29), (date(2026, 6, 29), "03:06"), (date(2026, 6, 30), "05:26")),
    (date(2026, 7, 29), (date(2026, 7, 28), "18:18"), (date(2026, 7, 29), "20:05")),
    (date(2026, 8, 28), (date(2026, 8, 27), "09:08"), (date(2026, 8, 28), "09:48")),
    (date(2026, 9, 26), (date(2026, 9, 25), "23:06"), (date(2026, 9, 26), "22:18")),
    (date(2026, 10, 26), (date(2026, 10, 25), "11:55"), (date(2026, 10, 26), "09:41")),
    (date(2026, 11, 24), (date(2026, 11, 23), "23:42"), (date(2026, 11, 24), "20:23")),
    (date(2026, 12, 23), (date(2026, 12, 23), "10:47"), (date(2026, 12, 24), "06:57")),
]

PURNIMA_2027 = [
    (date(2027, 1, 22), (date(2027, 1, 21), "21:29"), (date(2027, 1, 22), "17:46")),
    (date(2027, 2, 20), (date(2027, 2, 20), "07:59"), (date(2027, 2, 21), "04:52")),
    (date(2027, 3, 22), (date(2027, 3, 21), "18:21"), (date(2027, 3, 22), "16:13")),
    (date(2027, 4, 20), (date(2027, 4, 20), "04:51"), (date(2027, 4, 21), "03:56")),
    (date(2027, 5, 20), (date(2027, 5, 19), "16:02"), (date(2027, 5, 20), "16:28")),
    (date(2027, 6, 18), (date(2027, 6, 18), "04:34"), (date(2027, 6, 19), "06:13")),
    (date(2027, 7, 18), (date(2027, 7, 17), "18:48"), (date(2027, 7, 18), "21:14")),
    (date(2027, 8, 17), (date(2027, 8, 16), "10:28"), (date(2027, 8, 17), "12:58")),
    (date(2027, 9, 15), (date(2027, 9, 15), "02:48"), (date(2027, 9, 16), "04:32")),
    (date(2027, 10, 15), (date(2027, 10, 14), "18:49"), (date(2027, 10, 15), "19:16")),
    (date(2027, 11, 14), (date(2027, 11, 13), "09:55"), (date(2027, 11, 14), "08:55")),
    (date(2027, 12, 13), (date(2027, 12, 12), "23:54"), (date(2027, 12, 13), "21:38")),
]


def _check_tithi(number: int, day, b_date, b_hhmm, e_date, e_hhmm):
    from datetime import timedelta
    probe = datetime(b_date.year, b_date.month, b_date.day, 0, 0, tzinfo=IST).astimezone(
        __import__("datetime").timezone.utc) - timedelta(days=2)
    b, e, got_day = panchang.next_tithi_occurrence(number, probe, DELHI)
    bl, el = _ist(b), _ist(e)
    assert abs(_mins(bl.strftime("%H:%M")) - _mins(b_hhmm)) <= 5, (day, bl, b_hhmm)
    assert abs(_mins(el.strftime("%H:%M")) - _mins(e_hhmm)) <= 5, (day, el, e_hhmm)
    assert bl.date() == b_date and el.date() == e_date
    assert got_day == day, (got_day, day)


@pytest.mark.parametrize("day,b,e", AMAVASYA_2026 + AMAVASYA_2027)
def test_next_amavasya_matches_drik(day, b, e):
    _check_tithi(30, day, b[0], b[1], e[0], e[1])


@pytest.mark.parametrize("day,b,e", PURNIMA_2026 + PURNIMA_2027)
def test_next_purnima_matches_drik(day, b, e):
    _check_tithi(15, day, b[0], b[1], e[0], e[1])


def test_next_amavasya_facts_line_and_chip():
    facts, when_text, *_ = ask_facts.calendar_facts("When is the next amavasya?", "", DELHI)
    assert "Next Amavasya: begins" in facts and "the day is" in facts
    assert when_text and "Today," not in when_text


# ── Drik Panchang: months of 2026 ───────────────────────────────────────
# Daily pages for New Delhi, read 2026-10-05. Each boundary is checked as the
# last day of one month and the first day of the next.

MONTH_SPOTS = [
    # (civil date, amanta, purnimanta)
    (date(2026, 3, 21), "Chaitra", "Chaitra"),  # day-panchang 21/03/2026
    (date(2026, 6, 1), "Adhika Jyeshtha", "Adhika Jyeshtha"),  # day-panchang 01/06/2026
    (date(2026, 6, 21), "Jyeshtha", "Jyeshtha"),  # day-panchang 21/06/2026
    (date(2026, 10, 1), "Bhadrapada", "Ashwina"),  # test_panchang fixture
    (date(2026, 12, 21), "Margashirsha", "Margashirsha"),  # day-panchang 21/12/2026
]


@pytest.mark.parametrize("day,amanta,purnimanta", MONTH_SPOTS)
def test_month_names_match_drik(day, amanta, purnimanta):
    am, pu, _ad = panchang.month_of(day, DELHI)
    assert am.replace("Adhika ", "") == amanta.replace("Adhika ", "") or am == amanta, (day, am)
    assert pu.replace("Adhika ", "") == purnimanta.replace("Adhika ", "") or pu == purnimanta, (day, pu)


def test_months_table_structure():
    for conv in ("amanta", "purnimanta"):
        vs, used, rows = panchang.months_of_year(date(2026, 10, 5), DELHI, conv)
        assert vs == 2083 and used == conv
        # Purnimanta shows nija Jyeshtha on both sides of the adhika month.
        assert len(rows) == (13 if conv == "amanta" else 14)
        assert rows[0]["roman"].replace("Adhika ", "") == "Chaitra"
        assert any("Adhika" in r["roman"] for r in rows)
        for i in range(len(rows) - 1):
            assert rows[i]["end"] + __import__("datetime").timedelta(days=1) == rows[i + 1]["start"]
            assert rows[i]["dev"] and rows[i]["start"] <= rows[i]["end"]
        # Devanagari comes from vidyut, never typed: spot-check Chaitra.
        assert rows[0]["dev"] == "चैत्र"


def test_months_facts_block_and_chip():
    facts, when_text, *_ = ask_facts.calendar_facts(
        "List the 12 months in English and Sanskrit with their dates", "", DELHI, "north")
    # Today's year, whatever today is (the test must not expire with VS 2083).
    import re as _re
    assert _re.search(r"MONTHS \(Vikram Samvat \d{4} Chaitradi, purnimanta", facts)
    assert "Chaitra |" in facts and _re.fullmatch(r"Vikram Samvat \d{4}", when_text)


# ── Drik Panchang: Navratri ─────────────────────────────────────────────
# Navratri pages for New Delhi, read 2026-10-05.

NAVRATRI = [
    # (name, year, start, end)
    ("Chaitra Navratri", 2026, date(2026, 3, 19), date(2026, 3, 27)),  # chaitra-vasant-navratri 2026
    ("Chaitra Navratri", 2027, date(2027, 4, 7), date(2027, 4, 15)),  # chaitra-vasant-navratri 2027
    ("Sharad Navratri", 2026, date(2026, 10, 11), date(2026, 10, 20)),  # ashwin-shardiya 2026
    ("Sharad Navratri", 2027, date(2027, 9, 30), date(2027, 10, 9)),  # ashwin-shardiya 2027 Delhi
]


@pytest.mark.parametrize("name,year,start,end", NAVRATRI)
def test_navratri_matches_drik(name, year, start, end):
    assert panchang.festival(name, year, DELHI) == (start, end)


def test_navratri_aliases_and_no_durga_puja_alias():
    assert panchang.find_festival("navratri")["name"] == "Sharad Navratri"
    # Ghatasthapana opens both Navratris; Ask picks the nearer one (ask_facts).
    assert panchang.find_festival("ghatasthapana")["name"] == "Sharad Navratri"
    assert panchang.find_festival("Durga Puja") is None or \
        panchang.find_festival("Durga Puja")["name"] != "Sharad Navratri"


# ── daily horoscope lines ───────────────────────────────────────────────

def test_daily_lines_use_chart_moon_and_tara():
    from datetime import timezone
    born = datetime(1990, 6, 15, 11, 0, tzinfo=IST)
    c = kundli.chart(born, 28.6, 77.2, time_known=True)
    text = kundli.daily_text(c)
    assert "Today's Moon is in" in text and "house" in text and "from the natal Moon" in text
    assert "Today's nakshatra is" in text and "tara" in text
    assert ask_facts.is_daily_question("How is my horoscope today?")


# ── fixes after Claude's review, 2026-10-06 ────────────────────────────────
# Day pages and year lists for New Delhi, read 2026-10-06.

# (civil date, amanta, purnimanta): new-moon days the noon rule got wrong, and
# the adhika Jyeshtha of 2026 in the purnimanta table.
MONTH_EDGES = [
    (date(2026, 3, 19), "Phalguna", "Chaitra"),            # day-panchang 19/03/2026
    (date(2026, 5, 10), "Vaishakha", "Jyeshtha"),           # day-panchang 10/05/2026
    (date(2026, 6, 1), "Adhika Jyeshtha", "Adhika Jyeshtha"),  # day-panchang 01/06/2026
    (date(2026, 6, 15), "Adhika Jyeshtha", "Adhika Jyeshtha"),  # day-panchang 15/06/2026
    (date(2026, 6, 20), "Jyeshtha", "Jyeshtha"),            # day-panchang 20/06/2026
    (date(2026, 9, 11), "Shravana", "Bhadrapada"),          # day-panchang 11/09/2026
    (date(2026, 9, 21), "Bhadrapada", "Bhadrapada"),        # day-panchang 21/09/2026
    (date(2026, 10, 6), "Bhadrapada", "Ashwina"),           # day-panchang 06/10/2026
]


@pytest.mark.parametrize("day,amanta,purnimanta", MONTH_EDGES)
def test_month_of_and_both_tables_match_drik_on_edges(day, amanta, purnimanta):
    am, pu, _ad = panchang.month_of(day, DELHI)
    assert (am, pu) == (amanta, purnimanta), day
    for conv, want in (("amanta", amanta), ("purnimanta", purnimanta)):
        _vs, _c, rows = panchang.months_of_year(date(2026, 10, 6), DELHI, conv)
        hit = [r["roman"] for r in rows if r["start"] <= day <= r["end"]]
        if day >= rows[0]["start"]:
            assert hit == [want], (conv, day, hit)


@pytest.mark.parametrize("q", [
    "What did Brahmagupta contribute to mathematics?",
    "What is the Brahmanda in the Puranas?",
    "What is brahmacharya?",
    "Tell me the story of Vikramaditya and Betaal",
    "Which mantra should I chant all month in Kartik?",
    "What is a holistic routine for each month?",
])
def test_ordinary_questions_get_no_calendar_shape(q):
    facts, when_text, *_ = ask_facts.calendar_facts(q, "", DELHI, "north")
    assert "Brahma muhurta" not in facts and "MONTHS" not in facts and "Holi" not in facts
    assert ask_live._shape_hint(q, facts, "", "") == ""


def test_brahma_muhurta_in_hindi_is_still_found():
    assert ask_facts.is_brahma_question("कल ब्रह्म मुहूर्त कब है?")
    assert ask_facts.is_brahma_question("brahma muhurat kab hai")


def test_a_named_purnima_keeps_its_own_date_in_the_chip():
    for q, name in (("When is Guru Purnima?", "Guru Purnima"), ("When is Kartik Purnima?", "Kartik Purnima")):
        facts, when_text, *_ = ask_facts.calendar_facts(q, "", DELHI, "north")
        assert f"- {name}:" in facts and "Next Purnima" not in facts
        assert when_text in facts


def test_ghatasthapana_and_navratri_give_the_nearer_navratri():
    facts, when_text, *_ = ask_facts.calendar_facts("When is Ghatasthapana?", "", DELHI, "north")
    first = [line for line in facts.splitlines() if "Navratri:" in line]
    assert len(first) == 1
    today = datetime.now(IST).date()
    # Both Navratris' next dates; the line must name the earlier one.
    nxt = []
    for name in ("Chaitra Navratri", "Sharad Navratri"):
        for yr in (today.year, today.year + 1):
            s, e = panchang.festival(name, yr, DELHI)
            if e >= today:
                nxt.append((s, name))
                break
    assert min(nxt)[1] in first[0]


def test_next_amavasya_asked_during_one_reports_it():
    # Ashwina Amavasya 2026: 9 Oct 21:36 to 10 Oct 21:20 (year list 2026).
    for asked in (datetime(2026, 10, 9, 22, 30, tzinfo=IST), datetime(2026, 10, 10, 12, 0, tzinfo=IST)):
        b, e, day = panchang.next_amavasya(asked.astimezone(ZoneInfo("UTC")), DELHI)
        assert day == date(2026, 10, 10)
        assert abs(_mins(_ist(b).strftime("%H:%M")) - _mins("21:36")) <= 5


# Drik's 2028 Amavasya list (amavasyadates.html?year=2028), a year the rule
# was not fitted to: the named Amavasya day and its begin time.
AMAVASYA_2028 = [
    (date(2028, 1, 26), "2028-01-25 18:16"), (date(2028, 2, 25), "2028-02-24 13:26"),
    (date(2028, 3, 26), "2028-03-25 07:56"), (date(2028, 4, 24), "2028-04-24 00:20"),
    (date(2028, 5, 24), "2028-05-23 14:09"), (date(2028, 6, 22), "2028-06-22 01:37"),
    (date(2028, 7, 22), "2028-07-21 11:17"), (date(2028, 8, 20), "2028-08-19 19:46"),
    (date(2028, 9, 18), "2028-09-18 03:46"), (date(2028, 10, 18), "2028-10-17 12:04"),
    (date(2028, 11, 16), "2028-11-15 21:34"), (date(2028, 12, 16), "2028-12-15 09:00"),
]


@pytest.mark.parametrize("day,begins", AMAVASYA_2028)
def test_amavasya_2028_matches_drik(day, begins):
    from datetime import timedelta
    b_drik = datetime.strptime(begins, "%Y-%m-%d %H:%M").replace(tzinfo=IST)
    b, _e, got = panchang.next_amavasya((b_drik - timedelta(days=1)).astimezone(ZoneInfo("UTC")), DELHI)
    assert got == day
    assert abs((b - b_drik).total_seconds()) <= 5 * 60
