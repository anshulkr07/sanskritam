"""Exercise the frozen migration independently of runtime model creation."""
import importlib
import io

from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import create_engine, inspect


def test_commerce_migration_roundtrip_sqlite(tmp_path, monkeypatch):
    migration = importlib.import_module("migrations.versions.20261016_commerce")
    engine = create_engine("sqlite:///" + str(tmp_path / "migration.db"))
    with engine.begin() as connection:
        monkeypatch.setattr(migration, "op", Operations(MigrationContext.configure(connection)))
        migration.upgrade()
        inspector = inspect(connection)
        assert len(inspector.get_table_names()) == 18
        assert {"voice_milliseconds", "reserved"} <= {c["name"] for c in inspector.get_columns("commerce_wallets")}
        assert "started" in {c["name"] for c in inspector.get_columns("commerce_reservations")}
        migration.downgrade()
        assert inspect(connection).get_table_names() == []
    engine.dispose()


def test_commerce_migration_compiles_for_postgresql(monkeypatch):
    # DDL compilation is useful locally, but is not a live PostgreSQL migration.
    migration = importlib.import_module("migrations.versions.20261016_commerce")
    output = io.StringIO()
    context = MigrationContext.configure(dialect_name="postgresql", opts={"as_sql": True, "output_buffer": output})
    monkeypatch.setattr(migration, "op", Operations(context))
    migration.upgrade(); migration.downgrade()
    sql = output.getvalue()
    assert sql.count("CREATE TABLE commerce_") == 18
    assert sql.count("DROP TABLE commerce_") == 18
    assert "uq_commerce_purchase_transaction" in sql and "voice_milliseconds INTEGER" in sql
