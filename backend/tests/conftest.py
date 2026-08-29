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
