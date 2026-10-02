"""Word journey tables.

Revision ID: b2c3d4e5f6a8
Revises: a1b2c3d4e5f7
Create Date: 2026-10-02

Two new tables, nothing existing changes, no data, no app imports.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b2c3d4e5f6a8"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "word_origins",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("batch", sa.String(length=8), nullable=True),
        sa.Column("rank", sa.Integer(), nullable=True),
        sa.Column("scheduled_date", sa.String(length=10), nullable=True),
        sa.Column("mw_key", sa.String(length=64), nullable=True),
        sa.Column("sanskrit_dev", sa.String(length=64), nullable=True),
        sa.Column("sanskrit_iast", sa.String(length=64), nullable=True),
        sa.Column("display_dev", sa.String(length=64), nullable=True),
        sa.Column("display_iast", sa.String(length=64), nullable=True),
        sa.Column("gloss", sa.String(length=200), nullable=True),
        sa.Column("attested", sa.String(length=200), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=12), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_word_origins_scheduled_date", "word_origins", ["scheduled_date"], unique=True)
    op.create_index("ix_word_origins_status", "word_origins", ["status"])
    op.create_table(
        "word_routes",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("origin_id", sa.String(length=32), nullable=False),
        sa.Column("rank", sa.Integer(), nullable=True),
        sa.Column("lang", sa.String(length=8), nullable=True),
        sa.Column("lang_name", sa.String(length=32), nullable=True),
        sa.Column("word", sa.String(length=64), nullable=True),
        sa.Column("script", sa.String(length=16), nullable=True),
        sa.Column("roman", sa.String(length=64), nullable=True),
        sa.Column("gloss", sa.String(length=160), nullable=True),
        sa.Column("kind", sa.String(length=8), nullable=True),
        sa.Column("confidence", sa.String(length=12), nullable=True),
        sa.Column("hops", sa.JSON(), nullable=True),
        sa.Column("source_keys", sa.JSON(), nullable=True),
        sa.Column("lookup", sa.String(length=120), nullable=True),
        sa.Column("checked_on", sa.String(length=10), nullable=True),
        sa.Column("status", sa.String(length=12), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["origin_id"], ["word_origins.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("origin_id", "lang", "word", name="uq_word_route_origin_lang_word"),
    )
    op.create_index("ix_word_routes_origin_id", "word_routes", ["origin_id"])


def downgrade() -> None:
    op.drop_index("ix_word_routes_origin_id", table_name="word_routes")
    op.drop_table("word_routes")
    op.drop_index("ix_word_origins_status", table_name="word_origins")
    op.drop_index("ix_word_origins_scheduled_date", table_name="word_origins")
    op.drop_table("word_origins")
