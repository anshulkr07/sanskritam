"""Verse vectors for Ask's book search.

Revision ID: b9c0d1e2f3a4
Revises: f8a9b0c1d2e3
Create Date: 2026-10-09

One row per verse: the verse's meaning as numbers (services/book_search.py),
written by scripts/build_verse_index.py. Plain bytes, so it works on SQLite
and PostgreSQL alike and needs no database extension; the search compares
them in memory.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b9c0d1e2f3a4"
down_revision: Union[str, Sequence[str], None] = "f8a9b0c1d2e3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "verse_vectors",
        sa.Column("shloka_id", sa.String(length=64), sa.ForeignKey("shlokas.id", ondelete="CASCADE"),
                  primary_key=True),
        sa.Column("model", sa.String(length=64), nullable=False),
        sa.Column("dims", sa.Integer(), nullable=False),
        sa.Column("text_hash", sa.String(length=64), nullable=False),
        sa.Column("vec", sa.LargeBinary(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("verse_vectors")
