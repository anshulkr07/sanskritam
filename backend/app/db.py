"""SQLAlchemy 2.0 engine + session for SQLite."""

from pathlib import Path

import alembic.command as alembic_command
import alembic.config as alembic_config
import sqlalchemy
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings

_MIGRATIONS_DIR = Path(__file__).resolve().parent.parent / "migrations"

def _norm_db_url(url: str) -> str:
    """Normalize a database URL for SQLAlchemy.

    Accepts plain postgresql:// (as Supabase hands out) and rewrites it to
    the psycopg3 driver form; SQLite URLs pass through unchanged.
    """
    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url[len("postgresql://"):]
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url[len("postgres://"):]
    return url


_is_sqlite = not settings.database_url

engine = create_engine(
    _norm_db_url(settings.database_url) if settings.database_url else f"sqlite:///{settings.db_path}",
    connect_args={"check_same_thread": False} if _is_sqlite else {},
    # pool_pre_ping: Supabase/poolers drop idle connections; the ping
    # transparently reconnects instead of raising on the first request.
    pool_pre_ping=not _is_sqlite,
    echo=False,
)

if not _is_sqlite:
    from sqlalchemy import event

    @event.listens_for(engine, "connect")
    def _disable_client_prepare(dbapi_connection, connection_record):
        """psycopg3 only: disable client-side prepared statements.

        Required against transaction-mode poolers (PgBouncer), which don't
        support named prepared statements.  Set post-connect as a writable
        attribute — not via connect_args, which psycopg rejects.
        """
        if hasattr(dbapi_connection, "prepare_threshold"):
            dbapi_connection.prepare_threshold = None

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

    Catches the failure mode where the Alembic upgrade was skipped or a
    migration was forgotten: missing tables and missing columns on existing
    tables.  Returns an empty list when the DB matches the models.

    Dialect-neutral (sqlalchemy.inspect) so the same guard works on SQLite
    in dev and Postgres in production.
    """
    import app.models  # noqa: F401 — registers all models on Base

    drift: list[str] = []
    inspector = sqlalchemy.inspect(engine)
    db_tables = set(inspector.get_table_names())
    for table_name, table in Base.metadata.tables.items():
        if table_name not in db_tables:
            drift.append(f"missing table: {table_name}")
            continue
        db_cols = {col["name"] for col in inspector.get_columns(table_name)}
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
    tables = set(sqlalchemy.inspect(engine).get_table_names())
    if tables and "alembic_version" not in tables:
        raise RuntimeError(
            f"Database at '{settings.db_path}' predates Alembic migrations "
            "(app tables exist but no alembic_version). It cannot be "
            "auto-migrated. Delete it to reseed from scratch, or stamp it "
            "manually: alembic stamp head"
        )

    cfg = alembic_config.Config()
    cfg.set_main_option("script_location", str(_MIGRATIONS_DIR))
    # Alembic's Config wraps configparser (BasicInterpolation), so a literal '%'
    # in the URL (e.g. a percent-encoded password) triggers "invalid interpolation
    # syntax".  Escape '%' -> '%%' for the alembic option only; the engine created
    # in db.py keeps the raw URL, so this doubler must not touch that.
    _alembic_url = (settings.database_url if settings.database_url else f"sqlite:///{settings.db_path}").replace("%", "%%")
    cfg.set_main_option("sqlalchemy.url", _alembic_url)
    alembic_command.upgrade(cfg, "head")

    drift = _schema_drift()
    if drift:
        raise RuntimeError(
            "Database schema drift detected — models do not match the DB. "
            "Generate a migration (alembic revision --autogenerate -m '...') "
            "and re-run. Drift: " + "; ".join(drift)
        )