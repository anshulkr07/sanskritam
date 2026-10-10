"""Paged reading shelf: one-chapter-at-a-time books + Plus preview lock.

Revision ID: f8a9b0c1d2e3
Revises: e6f7a8b9c0d3
Create Date: 2026-10-09

A paged book's rows carry book = its slug, chapter = the chapter of its ref
(section 4 of handover_reading_shelf.md), seq = 1-based position in the
payload, and in_daily = False, so the daily verse, GET /shlokas and every
classic consumer keep reading exactly what they read today. canon_texts.paged
marks the catalogue rows served by chapter (section 6.6), never by /shlokas.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "f8a9b0c1d2e3"
down_revision: Union[str, Sequence[str], None] = "e6f7a8b9c0d3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("shlokas", sa.Column("book", sa.String(length=64), nullable=True))
    op.add_column("shlokas", sa.Column("chapter", sa.String(length=64), nullable=False, server_default=""))
    op.add_column("shlokas", sa.Column("seq", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("shlokas", sa.Column("in_daily", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.create_index("ix_shlokas_book_chapter_seq", "shlokas", ["book", "chapter", "seq"])
    op.add_column("canon_texts", sa.Column("paged", sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    op.drop_column("canon_texts", "paged")
    op.drop_index("ix_shlokas_book_chapter_seq", table_name="shlokas")
    op.drop_column("shlokas", "in_daily")
    op.drop_column("shlokas", "seq")
    op.drop_column("shlokas", "chapter")
    op.drop_column("shlokas", "book")
