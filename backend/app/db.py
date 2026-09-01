"""SQLAlchemy 2.0 engine + session for SQLite."""

from pathlib import Path

import alembic.command as alembic_command
import alembic.config as alembic_config
import sqlalchemy
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings

_MIGRATIONS_DIR = Path(__file__).resolve().parent.parent / "migrations"

engine = create_engine(
    settings.database_url if settings.database_url else f"sqlite:///{settings.db_path}",
    connect_args={"check_same_thread": False} if not settings.database_url else {},
    echo=False,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Session:
    """FastAPI dependency yielding a DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _schema_drift() -> list[str]:
    """Compare DB columns against model metadata; return drift descriptions.

    Catches the failure mode where Base.metadata.create_all / Alembic was
    skipped or a migration was forgotten: missing tables and missing columns
    on existing tables.  Returns an empty list when the DB matches the models.
    """
    import sqlite3

    from app import models  # noqa: F401 — registers all models on Base

    drift: list[str] = []
    with engine.connect() as conn:
        db_tables = {
            row[0]
            for row in conn.execute(sqlalchemy.text(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ))
        }
    for table_name, table in Base.metadata.tables.items():
        if table_name not in db_tables:
            drift.append(f"missing table: {table_name}")
            continue
        conn = sqlite3.connect(settings.db_path)
        try:
            db_cols = {row[1] for row in conn.execute(f"PRAGMA table_info({table_name})")}
        finally:
            conn.close()
        model_cols = set(table.columns.keys())
        for col in sorted(model_cols - db_cols):
            drift.append(f"missing column: {table_name}.{col}")
    return drift


def init_db() -> None:
    """Bring the DB schema up to date via Alembic, then verify no drift.

    - Migrations run through Alembic (baseline + revisions); create_all is
      NOT used, since it never alters existing tables.
    - The drift check is a safety net: if models and DB still disagree
      (forgotten migration, hand-edited schema), fail loudly at startup
      naming the drift, instead of a confusing 500 on the first request.
    """
    import app.models  # noqa: F401 — ensures models are registered

    # A pre-Alembic DB (app tables present, no alembic_version) can't be
    # upgraded — the baseline would fail with "table already exists".  Fail
    # loudly with the actionable fix instead of a raw Alembic error.
    with engine.connect() as conn:
        tables = {
            row[0] for row in conn.execute(sqlalchemy.text(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ))
        }
    if tables and "alembic_version" not in tables:
        raise RuntimeError(
            f"Database at '{settings.db_path}' predates Alembic migrations "
            "(app tables exist but no alembic_version). It cannot be "
            "auto-migrated. Delete it to reseed from scratch, or stamp it "
            "manually: alembic stamp head"
        )

    cfg = alembic_config.Config()
    cfg.set_main_option("script_location", str(_MIGRATIONS_DIR))
    cfg.set_main_option("sqlalchemy.url", settings.database_url if settings.database_url else f"sqlite:///{settings.db_path}")
    alembic_command.upgrade(cfg, "head")

    drift = _schema_drift()
    if drift:
        raise RuntimeError(
            "Database schema drift detected — models do not match the DB. "
            "Generate a migration (alembic revision --autogenerate -m '...') "
            "and re-run. Drift: " + "; ".join(drift)
        )