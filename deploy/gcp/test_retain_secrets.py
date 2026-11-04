"""Retention safety checks; no cloud calls or secret values."""
from datetime import datetime, timezone
import unittest
from retain_secrets import candidates

NOW = datetime(2026, 11, 4, tzinfo=timezone.utc)


def version(number, state="ENABLED", created="2026-10-01T00:00:00Z"):
    return {"name": f"projects/p/secrets/s/versions/{number}",
            "state": state, "createTime": created}


class RetentionTests(unittest.TestCase):
    def test_production_pin_survives_even_if_old(self):
        rows = [version(n) for n in range(1, 7)]
        self.assertEqual(candidates(rows, {"1"}, NOW), ["2", "3", "4"])

    def test_recent_and_two_latest_enabled_survive(self):
        rows = [version(1, created="2026-11-01T00:00:00Z"),
                version(2), version(3), version(4)]
        self.assertEqual(candidates(rows, set(), NOW), ["2"])

    def test_disabled_storage_is_pruned_but_destroyed_not_retried(self):
        rows = [version(1, "DISABLED"), version(2, "DESTROYED"),
                version(3), version(4)]
        self.assertEqual(candidates(rows, set(), NOW), ["1"])

    def test_alias_target_and_pinned_disabled_version_survive(self):
        rows = [version(1, "DISABLED"), version(2), version(3)]
        self.assertEqual(candidates(rows, {"1"}, NOW), [])

    def test_bad_timestamp_aborts_instead_of_selecting_for_deletion(self):
        rows = [version(1, created="not-a-date"), version(2), version(3)]
        with self.assertRaises(ValueError):
            candidates(rows, set(), NOW)
