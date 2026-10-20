"""Offline bookmark reconciliation, independent of mastery and XP."""
from __future__ import annotations
import json
import time

PREFIXES = ("shabd.learnv2.", "shabd.trail.", "shabd.read.", "shabd.story.")
EXACT_KEYS = {"shabd.grammar.read", "shabd.grammar.last", "shabd.learning.goal"}


def allowed(key: str) -> bool:
    return key in EXACT_KEYS or key.startswith(PREFIXES)


def merge(current: dict | None, incoming: dict) -> dict:
    merged = dict(current or {})
    now = int(time.time() * 1000)
    for key, entry in incoming.items():
        if not allowed(key) or len(key) > 180:
            raise ValueError("Unsupported learning state key")
        value, stamp = entry["value"], entry["updated_ms"]
        if not isinstance(value, str) or len(value) > 32000 or stamp < 0 or stamp > now + 300000:
            raise ValueError("Invalid learning state value or time")
        previous = merged.get(key)
        read_set = key.startswith("shabd.read.pages.v1.")
        if read_set and previous:
            try:
                old_record, new_record = json.loads(previous["value"]), json.loads(value)
                if old_record["book"] == new_record["book"] and old_record["chapter"] == new_record["chapter"]:
                    pages = {row[0]: row[1] for row in old_record["pages"] + new_record["pages"]
                             if isinstance(row, list) and len(row) == 2 and isinstance(row[0], str)
                             and isinstance(row[1], int) and row[1] >= 0}
                    value = json.dumps({"book": new_record["book"], "chapter": new_record["chapter"], "pages": sorted(pages.items())})
                    stamp = max(stamp, previous["updated_ms"])
            except (ValueError, TypeError, KeyError):
                pass
        if key == "shabd.trail.v1.visited" and previous:
            try:
                old_ids, new_ids = json.loads(previous["value"]), json.loads(value)
                if isinstance(old_ids, list) and isinstance(new_ids, list):
                    value = json.dumps(sorted(set(str(i) for i in old_ids + new_ids)))
                    stamp = max(stamp, previous["updated_ms"])
            except (ValueError, TypeError):
                pass
        if not previous or stamp > previous["updated_ms"] or ((key == "shabd.trail.v1.visited" or read_set) and stamp == previous["updated_ms"]):
            merged[key] = {"value": value, "updated_ms": stamp}
    if len(merged) > 2500 or len(json.dumps(merged).encode()) > 256000:
        raise ValueError("Learning state is too large")
    return merged
