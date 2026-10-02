"""Statement budgets for what the app loads on open (Home, Path, Learn).

Against Postgres every SQL statement is a network round trip — about 140 ms
from Cloud Run to the current database — so one COUNT per lesson turned
/units into a 20-second request. These budgets fail when a per-row query
creeps back in. They are ceilings: fewer statements is always fine.
"""

import ast
from contextlib import contextmanager
from pathlib import Path

from sqlalchemy import event

from app.db import engine

ROUTERS = Path(__file__).resolve().parent.parent / "app" / "routers"


@contextmanager
def _statements():
    seen: list[str] = []

    def _record(conn, cursor, statement, parameters, context, executemany):
        seen.append(statement)

    event.listen(engine, "before_cursor_execute", _record)
    try:
        yield seen
    finally:
        event.remove(engine, "before_cursor_execute", _record)


def _assert_budget(client, headers, path, budget):
    client.get(path, headers=headers)  # warm: lazy imports, engine init
    with _statements() as seen:
        r = client.get(path, headers=headers)
    assert r.status_code == 200, r.text
    assert len(seen) <= budget, (
        f"{path} issued {len(seen)} statements (budget {budget}):\n" + "\n".join(seen)
    )


def test_auth_resolves_the_learner_in_one_statement(client, auth_headers):
    _assert_budget(client, auth_headers, "/me", 1)


def test_units_does_not_query_per_unit_or_lesson(client, auth_headers):
    _assert_budget(client, auth_headers, "/units", 4)


def test_lessons_does_not_count_steps_per_lesson(client, auth_headers):
    _assert_budget(client, auth_headers, "/lessons", 3)


def test_lesson_steps_are_not_reloaded_one_by_one(client, auth_headers):
    lessons = client.get("/lessons", headers=auth_headers).json()
    lesson = max(lessons, key=lambda l: l["step_count"])
    _assert_budget(client, auth_headers, f"/lessons/{lesson['id']}/steps", 3)


def test_story_chapters_does_not_query_per_chapter(client, auth_headers):
    _assert_budget(client, auth_headers, "/story/chapters", 3)


def test_word_today_stays_within_budget(client, auth_headers):
    _assert_budget(client, auth_headers, "/word-origins/today", 5)


def test_db_bound_read_handlers_stay_off_the_event_loop():
    """uvicorn runs one worker, so an ``async def`` handler that makes
    synchronous DB calls stalls every other request until it returns. Read
    handlers that take a DB session must be plain ``def`` — FastAPI runs those
    in its threadpool — unless they genuinely await something."""
    offenders = []
    for path in sorted(ROUTERS.glob("*.py")):
        for node in ast.parse(path.read_text(encoding="utf-8")).body:
            if not isinstance(node, ast.AsyncFunctionDef):
                continue
            if not any(ast.unparse(d).startswith("router.get") for d in node.decorator_list):
                continue
            takes_db = any(a.arg == "db" for a in node.args.args + node.args.kwonlyargs)
            awaits = any(isinstance(n, (ast.Await, ast.AsyncFor, ast.AsyncWith)) for n in ast.walk(node))
            if takes_db and not awaits:
                offenders.append(f"{path.name}:{node.lineno} {node.name}")
    assert offenders == []
