"""Shared CLI plumbing for the eval entry points.

Lifted out of `app/evals/__main__.py` when `app/evals/talk.py` needed the same
two things. Both are console concerns, not eval logic.
"""

from __future__ import annotations

import os
import sys

_KEYS = (
    "SARVAM_API_KEY", "GEMINI_API_KEY", "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY", "OPENROUTER_API_KEY", "HF_TOKEN",
)


def load_dotenv() -> None:
    """Populate os.environ from a .env, without adding a dependency.

    Checks `backend/.env` first and the REPO ROOT second. The root is not a
    fallback for tidiness — it is where this repo's .env actually lives, and
    checking only `backend/.env` meant every provider reported
    `configured=False` and the whole suite silently skipped.
    """
    here = os.path.dirname(os.path.abspath(__file__))       # backend/app/evals
    backend = os.path.dirname(os.path.dirname(here))        # backend
    repo_root = os.path.dirname(backend)

    for path in (os.path.join(backend, ".env"), os.path.join(repo_root, ".env")):
        if not os.path.isfile(path):
            continue
        with open(path, encoding="utf-8") as fh:
            for raw in fh:
                line = raw.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, value = line.partition("=")
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                # Never let a .env silently shadow a key exported for this run,
                # and never let backend/.env be overridden by the root one.
                if key and key not in os.environ:
                    os.environ[key] = value


def force_utf8_stdio() -> None:
    """Windows consoles default to cp1252, which cannot encode Devanagari or
    IAST diacritics — every report these tools print would die on a
    UnicodeEncodeError. errors="replace" keeps output flowing even on a
    terminal with no Indic font."""
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            try:
                stream.reconfigure(encoding="utf-8", errors="replace")
            except (OSError, ValueError):
                pass
