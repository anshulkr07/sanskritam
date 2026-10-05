"""GET /places/search (services/places.py): any city, from GeoNames cities5000."""

import pytest

from app.services import places


@pytest.mark.parametrize("q,first", [
    ("Berlin", "Berlin, State of Berlin, Germany"),
    ("new york", "New York City, New York, United States"),
    ("york", "York, England, United Kingdom"),
    ("Banaras", "Varanasi, Uttar Pradesh, India"),   # another name
    ("Kashi", "Varanasi, Uttar Pradesh, India"),     # another name of a big place, exactly
    ("वाराणसी", "Varanasi, Uttar Pradesh, India"),     # Devanagari
    ("bhiwani", "Bhiwāni, Haryana, India"),          # accents folded, a town of 200,000
    ("Bombay", "Mumbai, Maharashtra, India"),
])
def test_search_finds_the_place_first(q, first):
    assert places.search(q, 5)[0]["label"] == first


def test_each_place_carries_its_time_zone_and_coordinates():
    berlin = places.search("Berlin", 1)[0]
    assert berlin["tz"] == "Europe/Berlin"
    assert abs(berlin["lat"] - 52.52) < 0.01 and abs(berlin["lon"] - 13.41) < 0.01


def test_short_or_empty_queries_return_nothing():
    assert places.search("") == [] and places.search("b") == []


def test_the_endpoint_needs_a_learner_and_answers(client, auth_headers):
    assert client.get("/places/search", params={"q": "Berlin"}).status_code in (401, 403)
    r = client.get("/places/search", params={"q": "Berlin", "limit": 3}, headers=auth_headers)
    assert r.status_code == 200 and len(r.json()) == 3
    assert r.json()[0]["country"] == "Germany"


def test_geonames_is_credited(client, auth_headers):
    rows = {r["key"]: r for r in client.get("/licences", headers=auth_headers).json()}
    assert rows["geonames"]["licence"] == "CC BY 4.0"
