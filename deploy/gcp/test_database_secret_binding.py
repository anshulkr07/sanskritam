import json
import unittest
from subprocess import CompletedProcess
from unittest.mock import Mock

from database_secret_binding import ready_database_binding


def config(version="51", secret="shabd-database-url"):
    return json.dumps({"spec": {"containers": [{"env": [{
        "name": "DATABASE_URL", "valueFrom": {"secretKeyRef": {
            "name": secret, "key": version,
        }},
    }]}]}})


class DatabaseSecretBindingTests(unittest.TestCase):
    def runner(self, *outputs):
        return Mock(side_effect=[CompletedProcess([], 0, stdout=value) for value in outputs])

    def test_uses_ready_revision_and_keeps_pinned_version(self):
        run = self.runner("service-ready\n", config())
        self.assertEqual(ready_database_binding("project", "region", "service", run),
                         "shabd-database-url:51")
        self.assertIn("--format=value(status.latestReadyRevisionName)", run.call_args_list[0].args[0])
        self.assertIn("service-ready", run.call_args_list[1].args[0])
        # No 'latest' lookup and no secret upload.
        self.assertEqual(run.call_count, 2)

    def test_legacy_latest_mount_is_resolved_to_numeric_version(self):
        run = self.runner("service-ready", config("latest"), "projects/p/secrets/s/versions/52")
        self.assertEqual(ready_database_binding("project", "region", "service", run),
                         "shabd-database-url:52")

    def test_no_ready_revision_fails_instead_of_reading_local_credentials(self):
        run = self.runner("")
        with self.assertRaises(RuntimeError):
            ready_database_binding("project", "region", "service", run)
        self.assertEqual(run.call_count, 1)

    def test_invalid_binding_fails_closed(self):
        for payload in (config("alias"), config(secret="wrong-secret"),
                        json.dumps({"spec": {"containers": [{"env": []}]}})):
            with self.subTest(payload=payload), self.assertRaises(RuntimeError):
                ready_database_binding("project", "region", "service",
                                       self.runner("service-ready", payload))

    def test_cloud_read_error_fails_closed(self):
        run = Mock(return_value=CompletedProcess([], 1, stdout=""))
        with self.assertRaises(RuntimeError):
            ready_database_binding("project", "region", "service", run)


if __name__ == "__main__":
    unittest.main()
