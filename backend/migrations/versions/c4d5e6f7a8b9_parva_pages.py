"""Parva festival pages and art.

Revision ID: c4d5e6f7a8b9
Revises: b9c0d1e2f3a4
Create Date: 2026-10-10

parva_pages holds one row per (slug, variant, lang, version); withdrawn rows
are kept. parva_art holds one row per painting key with its iconography
checklist.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c4d5e6f7a8b9"
down_revision: Union[str, Sequence[str], None] = "b9c0d1e2f3a4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "parva_pages",
        sa.Column("id", sa.String(length=32), primary_key=True),
        sa.Column("slug", sa.String(length=64), nullable=False, index=True),
        sa.Column("variant", sa.String(length=64), nullable=False, server_default=""),
        sa.Column("lang", sa.String(length=5), nullable=False, server_default="en"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("body", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("sources", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("status", sa.String(length=12), nullable=False, server_default="draft", index=True),
        sa.Column("checked_on", sa.String(length=10), nullable=False, server_default=""),
        sa.Column("approved_on", sa.String(length=10), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("slug", "variant", "lang", "version", name="uq_parva_page_slug_variant_lang_version"),
    )
    op.create_table(
        "parva_art",
        sa.Column("key", sa.String(length=64), primary_key=True),
        sa.Column("url", sa.String(length=512), nullable=False, server_default=""),
        sa.Column("width", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("height", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("prompt", sa.Text(), nullable=False, server_default=""),
        sa.Column("checklist", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("status", sa.String(length=12), nullable=False, server_default="draft"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("parva_art")
    op.drop_table("parva_pages")
