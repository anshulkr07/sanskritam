"""P21-4: the readable canon — which texts, in what order, at what depth.

Revision ID: e2f3a4b5c6d7
Revises: d1e2f3a4b5c6
Create Date: 2026-09-08

Additive catalogue table only — no data migration, no DELETE.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e2f3a4b5c6d7"
down_revision: Union[str, Sequence[str], None] = "d1e2f3a4b5c6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "canon_texts",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("slug", sa.String(64), nullable=False, unique=True),
        sa.Column("title_en", sa.String(256), nullable=True),
        sa.Column("title_sa", sa.String(256), nullable=True),
        sa.Column("source", sa.String(256), nullable=True),
        sa.Column("licence", sa.String(512), nullable=True),
        sa.Column("study_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("depth", sa.String(16), nullable=False, server_default="index"),
        sa.Column("tier", sa.String(16), nullable=False, server_default="free"),
        sa.Column("verses_planned", sa.Integer(), nullable=True),
        sa.Column("ref_prefixes", sa.JSON(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_canon_texts_slug", "canon_texts", ["slug"])


def downgrade() -> None:
    op.drop_index("ix_canon_texts_slug", table_name="canon_texts")
    op.drop_table("canon_texts")
