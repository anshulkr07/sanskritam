"""Alembic environment — wired to the app's own engine and metadata.

The SQLAlchemy URL is taken from app.config settings (same source the app
uses), and autogenerate compares against app.models.Base.metadata.
"""

from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

from app.config import settings
from app.db import Base
import app.models  # noqa: F401 — registers all models on Base.metadata

# Alembic Config object: access to values within the .ini file in use.
config = context.config

# Point Alembic at the app's real DB URL (overrides alembic.ini).
# Respect settings.database_url so the same migrations run against Postgres
# in production; fall back to the local SQLite file for dev.  (Previously
# this hardcoded sqlite:///{settings.db_path}, silently redirecting the
# runtime init_db() upgrade to SQLite even when DATABASE_URL was set.)
_db_url = settings.database_url or f"sqlite:///{settings.db_path}"
# Escape '%' -> '%%' so configparser (BasicInterpolation) doesn't reject a
# password containing '%' (e.g. percent-encoded). On get() interpolation turns
# %% back into %, so the engine still receives the real URL.
config.set_main_option("sqlalchemy.url", _db_url.replace("%", "%%"))

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Model metadata for 'autogenerate' support.
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    Configures the context with just a URL and not an Engine.
    Calls to context.execute() emit the given string to the script output.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=True,  # required for SQLite ALTERs
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode: use the app's own engine.

    Reusing app.db.engine guarantees Alembic runs against the identical
    driver/URL/connect-args the app uses (e.g. the postgresql:// →
    postgresql+psycopg:// rewrite in _norm_db_url, prepare_threshold=0 for
    poolers) — parsing the URL here independently would bypass that
    normalization and try to load psycopg2.
    """
    from app.db import engine

    with engine.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=True,  # required for SQLite ALTERs
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
