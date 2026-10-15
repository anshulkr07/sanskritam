"""Validate deployment DB credentials before uploading secrets. Never log URLs."""

import argparse
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


def fail(reason: str) -> int:
    print(f"Database preflight FAILED: {reason} No secrets uploaded.", file=sys.stderr)
    return 1


def connection_failure_reason(exc: Exception) -> str:
    # Inspect the error privately, but emit only fixed messages. psycopg can
    # include connection strings in its exception text.
    message = str(exc).lower()
    if getattr(exc, "sqlstate", None) == "28P01" or "password authentication failed" in message:
        return "Database rejected the selected credentials; check the secret or rotation input."
    if "tenant or user not found" in message:
        return "Pooler username or project reference is incorrect."
    if "timeout" in message or "timed out" in message:
        return "Connection timed out; check database availability and network access."
    if "resolve" in message or "name or service not known" in message:
        return "Database hostname could not be resolved."
    return "Database connection check failed; check connection settings and database availability."


def main(argv=()) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--stdin", action="store_true", help="Read URL from stdin for WSL/Windows interoperability.")
    args = parser.parse_args(argv)
    try:
        import psycopg
    except ImportError:
        return fail("Python dependency psycopg is missing; run through deploy.sh to install it.")
    try:
        value = sys.stdin.read() if args.stdin else os.environ.get("DATABASE_URL", "")
        normalized = normalize_url(value)
    except Exception:
        return fail("Selected DATABASE_URL is missing or malformed.")
    try:
        verify_connection(normalized, psycopg.connect)
    except Exception as exc:
        return fail(connection_failure_reason(exc))
    print("Database preflight passed.", file=sys.stderr)
    print(normalized)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
