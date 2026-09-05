"""P8-2 — crash reporting: exception middleware writes route + stack trace
(and never learner content); GET /admin/errors reads it back."""

from app.db import SessionLocal


def test_admin_errors_requires_admin(client):
    assert client.get("/admin/errors").status_code == 401


def test_unhandled_exception_is_logged_with_traceback(client):
    """A 500 anywhere leaves a row carrying route + traceback — the signal a
    silent 500 loses (P8-2). The TestClient re-raises, so drive the middleware
    by calling the logger directly the way the middleware does."""
    import asyncio

    from app.main import _log_exception
    from app.models import ErrorLog
    from starlette.requests import Request as StarletteRequest

    scope = {
        "type": "http",
        "method": "GET",
        "path": "/definitely/not/a/route",
        "headers": [],
        "query_string": b"",
    }

    async def receive():
        return {"type": "http.request", "body": b""}

    request = StarletteRequest(scope, receive)

    async def run():
        try:
            raise RuntimeError("boom-for-p8-2-test")
        except RuntimeError as e:
            await _log_exception(request, e)

    asyncio.get_event_loop_policy().new_event_loop().run_until_complete(run())

    db = SessionLocal()
    try:
        row = (
            db.query(ErrorLog)
            .filter(ErrorLog.error_type == "RuntimeError")
            .order_by(ErrorLog.id.desc())
            .first()
        )
        assert row is not None, "exception produced no error_logs row"
        assert "/definitely/not/a/route" in row.route
        assert "boom-for-p8-2-test" in row.detail
        assert "traceback" in (row.traceback or "").lower() or "Traceback" in (row.traceback or "")
    finally:
        db.close()


def test_error_log_carries_no_learner_content():
    """P1-4 guard: the ErrorLog model has NO column that could hold a
    transcript, an answer, or audio. If someone adds one, this fails before a
    learner's speech reaches a crash row."""
    from app.models import ErrorLog

    cols = {c.name for c in ErrorLog.__table__.columns}
    assert cols == {"id", "ts", "route", "error_type", "detail", "traceback", "request_id"}
    banned = {"body", "transcript", "answer", "audio", "prompt", "attempt", "text"}
    assert not (cols & banned), f"crash-log columns may not hold learner content: {cols & banned}"


def test_admin_errors_endpoint_returns_rows(client):
    import asyncio

    from app.main import _log_exception
    from starlette.requests import Request as StarletteRequest

    scope = {"type": "http", "method": "POST", "path": "/x", "headers": [], "query_string": b""}

    async def receive():
        return {"type": "http.request", "body": b""}

    request = StarletteRequest(scope, receive)
    asyncio.get_event_loop_policy().new_event_loop().run_until_complete(
        _log_exception(request, ValueError("endpoint-visibility-test"))
    )

    r = client.get("/admin/errors", headers={"X-Admin-Token": "test-admin"})
    assert r.status_code == 200
    d = r.json()
    assert d["count"] >= 1
    assert any("endpoint-visibility-test" in e["detail"] for e in d["errors"])
