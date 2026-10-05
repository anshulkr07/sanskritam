"""Place search for a place of birth or the learner's place: GeoNames cities5000.

Owner, 2026-10-06: Berlin, New York or a small town must be findable, searched
through the server rather than bundled in the app. The list is
seeds/places/cities5000.tsv.gz, built by scripts/build_places.py from
GeoNames (CC BY 4.0, credited in seeds/licences.py): every city above 5,000
people, about 70,000 places, each with its IANA time zone (so a birth time is
read on that place's clock for that date).

Loaded once, on the first search, into a prefix index; a search never touches
the database and nothing about it is stored or logged.
"""

from __future__ import annotations

import gzip
import os
import threading
import unicodedata
from typing import Optional

_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                     "seeds", "places", "cities5000.tsv.gz")

_lock = threading.Lock()
_places: Optional[list[tuple[str, str, str, float, float, str, int]]] = None
_index: dict[str, list[tuple[str, int, bool, bool]]] = {}


def fold(text: str) -> str:
    """Case and accents folded: "Bhiwāni" and "bhiwani" are one key."""
    t = unicodedata.normalize("NFKD", text or "")
    t = "".join(c for c in t if not unicodedata.combining(c) or "ऀ" <= c <= "ॿ")
    return " ".join(t.casefold().replace("-", " ").split())


def _load() -> None:
    global _places
    with _lock:
        if _places is not None:
            return
        places = []
        index: dict[str, list[tuple[str, int, bool, bool]]] = {}
        with gzip.open(_FILE, "rt", encoding="utf-8") as fh:
            for line in fh:
                f = line.rstrip("\n").split("\t")
                if len(f) < 8:
                    continue
                name, alts, region, country, lat, lon, tz, pop = f[:8]
                i = len(places)
                places.append((name, region, country, float(lat), float(lon), tz, int(pop or 0)))
                keys = [(fold(name), True)] + [(fold(a), False) for a in alts.split(",") if a]
                for key, is_name in keys:
                    words = key.split(" ")
                    for w_at, word in enumerate(words):
                        if len(word) >= 1:
                            # (whole key, place, is the main name, starts at the key's start)
                            index.setdefault(word[:2], []).append((key if w_at == 0 else " ".join(words[w_at:]), i, is_name, w_at == 0))
        _index.update(index)
        _places = places


def label(place: tuple) -> str:
    name, region, country = place[0], place[1], place[2]
    return ", ".join(p for p in (name, region if region and region != name else "", country) if p)


def search(query: str, limit: int = 10) -> list[dict]:
    """Places whose name (or another name) starts with the query, best first.

    Exact names first, then names that start with it, then a later word that
    starts with it ("york" finds New York); within each, bigger places first.
    """
    q = fold(query)
    if len(q) < 2:
        return []
    _load()
    assert _places is not None
    best: dict[int, tuple[int, int]] = {}
    for key, i, is_name, at_start in _index.get(q[:2], ()):
        if not key.startswith(q):
            continue
        exact = key == q
        # Tiers: the exact name; another name, exactly, of a big place
        # ("Kashi" is Varanasi); a name that starts with the query; another
        # name of a small place or one that starts with it. A later word
        # ("york" in New York) after all of those.
        if is_name:
            rank = 0 if exact else 2
        elif exact and _places[i][6] >= 100_000:
            rank = 1
        else:
            rank = 3
        rank += 0 if at_start else 4
        old = best.get(i)
        if old is None or rank < old[0]:
            best[i] = (rank, -_places[i][6])
    order = sorted(best, key=lambda i: best[i])[: max(1, min(limit, 25))]
    out = []
    for i in order:
        p = _places[i]
        out.append({"label": label(p), "name": p[0], "region": p[1], "country": p[2],
                    "lat": p[3], "lon": p[4], "tz": p[5]})
    return out
