"""Where configuration comes from — for the server, and for the test suite.

Found 2026-09-22: the repo keeps its .env at the repo root, while
start_mob.ps1 and .claude/launch.json run uvicorn from backend/. Settings read
".env" relative to the working directory, so the locally started backend had
no Sarvam key and served `mode: graph` — none of the LLM tutor was reachable
from a dev build. app/config.py now anchors its .env paths to the source tree.

The other half of that change is a promise about THIS suite: it reads no .env
file at all, so a developer's live keys or DATABASE_URL can never reach it.
"""

from __future__ import annotations

import os
from pathlib import Path

from app import config
from app.config import settings

BACKEND = Path(__file__).resolve().parent.parent
REPO_ROOT = BACKEND.parent


def test_the_repo_root_env_is_read_wherever_the_server_starts(monkeypatch):
    """Anchored to the source tree, so `cd backend && uvicorn ...` finds it."""
    monkeypatch.delenv("SHABD_IGNORE_DOTENV", raising=False)
    files = config.env_files()
    assert files is not None
    assert str(REPO_ROOT / ".env") in files, "the repo-root .env is not read"
    assert all(Path(f).is_absolute() for f in files if f != ".env"), (
        "an anchored path is relative, so the answer depends on the cwd again"
    )


def test_backend_env_overrides_the_root_one(monkeypatch):
    """pydantic-settings gives a LATER file priority. A backend-only override
    must beat the shared root file, and the old cwd-relative ".env" is kept
    only as the lowest-priority fallback."""
    monkeypatch.delenv("SHABD_IGNORE_DOTENV", raising=False)
    files = list(config.env_files())
    assert files[0] == ".env"
    assert files.index(str(REPO_ROOT / ".env")) < files.index(str(BACKEND / ".env"))


def test_the_escape_hatch_turns_every_file_off(monkeypatch):
    monkeypatch.setenv("SHABD_IGNORE_DOTENV", "1")
    assert config.env_files() is None


def test_this_suite_reads_no_env_file():
    """conftest sets the escape hatch before the app is imported."""
    assert os.environ.get("SHABD_IGNORE_DOTENV") == "1"
    assert config._ENV_FILES is None


def test_this_suite_has_no_vendor_keys_and_no_real_database():
    """Whatever is in the developer's .env or exported in their shell.

    If this fails, some test is one missing mock away from spending real money
    on Sarvam — or writing to a real database.
    """
    for field in ("sarvam_api_key", "openrouter_api_key"):
        assert not getattr(settings, field), f"settings.{field} is set in the test suite"
    # The LLM providers read os.environ FIRST and settings second
    # (evals/providers.py), so both places have to be empty.
    for var in ("SARVAM_API_KEY", "OPENROUTER_API_KEY", "GEMINI_API_KEY",
                "OPENAI_API_KEY", "ANTHROPIC_API_KEY"):
        assert not os.environ.get(var), f"{var} is exported into the test suite"
    assert not settings.database_url, "the suite would talk to a real database"
