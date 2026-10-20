"""Calendar/detail pages share annual calculations without sharing mutable objects."""
from datetime import date
from app.services import parva_rules as rules


def test_year_cache_reuses_calculations_and_returns_independent_data(monkeypatch):
    calls = []
    def compute(year, place, tradition):
        calls.append((year, dict(place), tradition))
        return [rules.Occurrence(slug='ekadashi', variant='test', date=date(year, 1, 1), title='Original', times=[])]
    rules._cached_year_occurrences.cache_clear()
    monkeypatch.setattr(rules, '_compute_year_occurrences', compute)
    place = {'lat': 28.6, 'lon': 77.2, 'tz': 'Asia/Kolkata'}
    try:
        first = rules._year_occurrences(2026, place, 'north')
        first[0].title = 'Changed by caller'
        second = rules._year_occurrences(2026, place, 'north')
        assert len(calls) == 1
        assert second[0].title == 'Original'
        for year, where, trad in [(2027, place, 'north'), (2026, {**place, 'lat': 19.1}, 'north'), (2026, {**place, 'tz': 'UTC'}, 'north'), (2026, place, 'tamil')]:
            rules._year_occurrences(year, where, trad)
        assert len(calls) == 5
    finally:
        rules._cached_year_occurrences.cache_clear()


def test_concurrent_windows_compute_the_same_year_once(monkeypatch):
    from concurrent.futures import ThreadPoolExecutor
    from time import sleep
    calls = []
    def compute(year, place, tradition):
        calls.append(year)
        sleep(.03)
        return []
    rules._cached_year_occurrences.cache_clear()
    monkeypatch.setattr(rules, '_compute_year_occurrences', compute)
    try:
        with ThreadPoolExecutor(max_workers=8) as pool:
            list(pool.map(lambda _: rules._year_occurrences(2026, {'lat': 28.6, 'lon': 77.2, 'tz': 'Asia/Kolkata'}, 'north'), range(8)))
        assert calls == [2026]
        assert not rules._year_calls
    finally:
        rules._cached_year_occurrences.cache_clear()
