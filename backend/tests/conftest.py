"""Shared pytest fixtures: isolated temp DB per session, TestClient."""

import os
import sys
import tempfile

import pytest

# Isolated DB BEFORE any app import
_TMPDIR = tempfile.mkdtemp(prefix="shabd-test-")
os.environ["DB_PATH"] = os.path.join(_TMPDIR, "test.db")
os.environ["ANALYZER"] = "vidyut"  # exercise the real analyzer in tests
os.environ["ADMIN_TOKEN"] = "test-admin"
# The service-wide spend budget sums usage rows from EVERY learner, and the
# whole suite shares one database — left on, one test's seeded usage would 429
# unrelated tests. test_daily_budget.py turns it on per test.
os.environ["QUOTA_DAILY_BUDGET_INR"] = "0"

# The suite never talks to a real vendor and never reads a developer's .env.
#
# app/config.py reads the repo-root .env so a locally started backend finds
# its Sarvam key. Tests must not follow it there: that .env holds live keys,
# and a DATABASE_URL in it would point the suite at a real database instead
# of the temp SQLite above. SHABD_IGNORE_DOTENV switches the .env files off
# entirely — the state tests always ran in, since there is no backend/.env.
#
# The keys are blanked as well, for the case .env cannot cover: a key
# exported in the developer's shell. An empty env var overrides pydantic-
# settings' default, so every provider reports `configured=False`. A test
# that needs a key sets one itself (`monkeypatch.setattr(settings, ...)`).
os.environ["SHABD_IGNORE_DOTENV"] = "1"
os.environ["DATABASE_URL"] = ""
for _vendor_key in ("SARVAM_API_KEY", "OPENROUTER_API_KEY", "GEMINI_API_KEY",
                    "OPENAI_API_KEY", "ANTHROPIC_API_KEY", "HF_TOKEN"):
    os.environ[_vendor_key] = ""

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient  # noqa: E402

from app.main import create_app  # noqa: E402
from app.db import init_db  # noqa: E402
from app.seeds.seed import run_seed  # noqa: E402
from app.db import SessionLocal  # noqa: E402


@pytest.fixture(scope="session")
def client():
    init_db()
    db = SessionLocal()
    try:
        run_seed()
    finally:
        db.close()
    app = create_app()
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def auth_headers(client):
    r = client.post("/auth/dev-login", json={"display_name": "tester", "bridge_langs": ["en", "hi"]})
    assert r.status_code == 200, r.text
    data = r.json()
    return {"Authorization": f"Bearer {data['token']}"}
