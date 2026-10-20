"""Deployment preflight checks; no production credentials or network access."""

import contextlib
import io
from pathlib import Path
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from check_database import MigrationMismatch, connection_failure_reason, main, normalize_url, verify_connection


class DatabasePreflightTests(unittest.TestCase):
    def test_stdin_url_works_without_environment_forwarding(self):
        stdout = io.StringIO()
        with patch("sys.stdin", io.StringIO("postgresql://u:p@db/app")), \
                patch("check_database.verify_connection") as verify, \
                contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(io.StringIO()):
            self.assertEqual(main(["--stdin"]), 0)
        self.assertEqual(stdout.getvalue().strip(), "postgresql://u:p@db/app")
        self.assertEqual(verify.call_args.args[0], "postgresql://u:p@db/app")

    def test_failure_categories_are_specific_and_redacted(self):
        for message, expected in [
            ("password authentication failed URL=privatepassword", "rejected the selected credentials"),
            ("tenant or user not found URL=privatepassword", "project reference"),
            ("connection timeout URL=privatepassword", "timed out"),
            ("could not resolve URL=privatepassword", "hostname"),
        ]:
            reason = connection_failure_reason(RuntimeError(message))
            self.assertIn(expected, reason)
            self.assertNotIn("privatepassword", reason)

    def test_raw_at_in_password_is_encoded_and_idempotent(self):
        raw = "postgresql://postgres.example:a@b:c@pooler.example:5432/postgres"
        expected = "postgresql://postgres.example:a%40b%3Ac@pooler.example:5432/postgres"
        self.assertEqual(normalize_url(raw), expected)
        self.assertEqual(normalize_url(expected), expected)

    def test_driver_scheme_and_query_are_preserved(self):
        self.assertEqual(
            normalize_url("postgresql+psycopg://u:p@db:5432/app?sslmode=require"),
            "postgresql://u:p@db:5432/app?sslmode=require",
        )

    def test_incomplete_or_invalid_url_is_rejected(self):
        for value in ("", "sqlite:///app.db", "postgresql://u@db/app",
                      "postgresql://u:p@db", "postgresql://u:p@db:invalid/app",
                      "postgresql://u:p@db/app#fragment"):
            with self.subTest(value=value), self.assertRaises(ValueError):
                normalize_url(value)

    def test_connection_uses_same_url_with_timeout_and_read_only_query(self):
        connect = MagicMock()
        cursor = connect.return_value.__enter__.return_value.cursor.return_value.__enter__.return_value
        cursor.fetchone.return_value = (1,)
        url = "postgresql://u:p@db/app"
        verify_connection(url, connect)
        connect.assert_called_once_with(url, connect_timeout=10)
        cursor.execute.assert_called_once_with("SELECT 1")

    def test_auth_failure_never_prints_driver_exception_or_url(self):
        stdout, stderr = io.StringIO(), io.StringIO()
        with patch.dict("os.environ", {"DATABASE_URL": "postgresql://u:secret@db/app"}), \
                patch("psycopg.connect", side_effect=RuntimeError("URL contains secret")), \
                contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
            self.assertEqual(main(), 1)
        self.assertEqual(stdout.getvalue(), "")
        self.assertNotIn("secret@", stderr.getvalue())
        self.assertNotIn("URL contains secret", stderr.getvalue())
        self.assertIn("No secrets uploaded", stderr.getvalue())

    def test_stale_checkout_rejects_database_revision_before_deploy(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "versions").mkdir()
            (root / "versions/old.py").write_text("revision = 'old'\ndown_revision = None\n")
            connect = MagicMock()
            cursor = connect.return_value.__enter__.return_value.cursor.return_value.__enter__.return_value
            cursor.fetchone.side_effect = [(1,), ("alembic_version",)]
            cursor.fetchall.return_value = [("20261017_launch_safety",)]
            with self.assertRaisesRegex(MigrationMismatch, "missing from this checkout"):
                verify_connection("postgresql://u:p@db/app", connect, root)

    def test_current_checkout_accepts_migrated_database_without_writes(self):
        connect = MagicMock()
        cursor = connect.return_value.__enter__.return_value.cursor.return_value.__enter__.return_value
        cursor.fetchone.side_effect = [(1,), ("alembic_version",)]
        cursor.fetchall.return_value = [("20261017_launch_safety",)]
        verify_connection("postgresql://u:p@db/app", connect, Path(__file__).resolve().parents[2] / "backend/migrations")
        self.assertTrue(all(call.args[0].startswith("SELECT ") for call in cursor.execute.call_args_list))

    def test_migration_failure_is_actionable_and_redacted(self):
        stdout, stderr = io.StringIO(), io.StringIO()
        with patch.dict("os.environ", {"DATABASE_URL": "postgresql://u:secret@db/app"}), \
                patch("check_database.verify_connection", side_effect=MigrationMismatch("Database migration is missing from this checkout.")), \
                contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
            self.assertEqual(main(), 1)
        self.assertEqual(stdout.getvalue(), "")
        self.assertIn("migration is missing", stderr.getvalue())
        self.assertIn("No secrets uploaded", stderr.getvalue())
        self.assertNotIn("secret@", stderr.getvalue())


if __name__ == "__main__":
    unittest.main()
