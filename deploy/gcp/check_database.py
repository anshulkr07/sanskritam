"""Validate deployment DB credentials before uploading secrets. Never log URLs."""

import os
import sys
from urllib.parse import quote, unquote, urlsplit


def normalize_url(value: str) -> str:
    scheme, separator, rest = value.partition("://")
    if not separator:
        scheme, rest = "postgresql", value
    if scheme not in {"postgresql", "postgres", "postgresql+psycopg"}:
        raise ValueError("Production DATABASE_URL must use PostgreSQL.")
    userinfo, separator, hostport = rest.rpartition("@")
    user, colon, password = userinfo.partition(":")
    if not separator or not user or not colon or not password:
        raise ValueError("DATABASE_URL needs a username, password and host.")
    # Match the existing deploy encoding, including raw '@' in passwords.
    normalized = (
        "postgresql://" + quote(unquote(user), safe="") + ":"
        + quote(unquote(password), safe="") + "@" + hostport
    )
    parsed = urlsplit(normalized)
    if not parsed.hostname or not parsed.path.strip("/") or parsed.fragment:
        raise ValueError("DATABASE_URL needs a host and database, with no fragment.")
    if parsed.port is not None and not 1 <= parsed.port <= 65535:
        raise ValueError("Invalid database port.")
    return normalized


def verify_connection(url: str, connect) -> None:
    # psycopg accepts PostgreSQL URLs directly; the same URL is uploaded.
    with connect(url, connect_timeout=10) as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            if cursor.fetchone() != (1,):
                raise RuntimeError("Unexpected database response.")


def main() -> int:
    try:
        import psycopg

        normalized = normalize_url(os.environ.get("DATABASE_URL", ""))
        verify_connection(normalized, psycopg.connect)
    except Exception:
        # Driver/parser exceptions can include credentials. Do not print them.
        print(
            "Database preflight FAILED. No secrets uploaded. Check DATABASE_URL "
            "in this machine's .env.deploy against Supabase's connection settings.",
            file=sys.stderr,
        )
        return 1
    print("Database preflight passed.", file=sys.stderr)
    print(normalized)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
