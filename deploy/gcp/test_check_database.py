"""Deployment preflight checks; no production credentials or network access."""

import contextlib
import io
import unittest
from unittest.mock import MagicMock, patch

from check_database import main, normalize_url, verify_connection


class DatabasePreflightTests(unittest.TestCase):
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


if __name__ == "__main__":
    unittest.main()
