"""Daily content: fact cards, pipeline runs, rejections, route source pages.

Revision ID: c3d4e5f6a7b9
Revises: b2c3d4e5f6a8
Create Date: 2026-10-02

Three new tables and three new nullable columns on word_routes. No data
changes, no app imports.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c3d4e5f6a7b9"
down_revision: Union[str, Sequence[str], None] = "b2c3d4e5f6a8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("word_routes", sa.Column("source_url", sa.String(length=500), nullable=True))
    op.add_column("word_routes", sa.Column("source_site", sa.String(length=120), nullable=True))
    op.add_column("word_routes", sa.Column("checked_by", sa.String(length=12), nullable=True))

    op.create_table(
        "fact_cards",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("scheduled_date", sa.String(length=10), nullable=True),
        sa.Column("fact", sa.Text(), nullable=True),
        sa.Column("claim_kind", sa.String(length=12), nullable=True),
        sa.Column("text_name", sa.String(length=120), nullable=True),
        sa.Column("ref", sa.String(length=64), nullable=True),
        sa.Column("ref_key", sa.String(length=160), nullable=True),
        sa.Column("devanagari", sa.Text(), nullable=True),
        sa.Column("iast", sa.Text(), nullable=True),
        sa.Column("translation", sa.Text(), nullable=True),
        sa.Column("explanation", sa.Text(), nullable=True),
        sa.Column("source_url", sa.String(length=500), nullable=True),
        sa.Column("source_site", sa.String(length=120), nullable=True),
        sa.Column("verse_match", sa.Float(), nullable=True),
        sa.Column("checked_on", sa.String(length=10), nullable=True),
        sa.Column("made_by", sa.String(length=12), nullable=True),
        sa.Column("status", sa.String(length=12), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_fact_cards_scheduled_date", "fact_cards", ["scheduled_date"], unique=True)
    op.create_index("ix_fact_cards_ref_key", "fact_cards", ["ref_key"])
    op.create_index("ix_fact_cards_status", "fact_cards", ["status"])

    op.create_table(
        "content_jobs",
        sa.Column("id", sa.String(length=40), nullable=False),
        sa.Column("kind", sa.String(length=8), nullable=False),
        sa.Column("active_key", sa.String(length=8), nullable=True),
        sa.Column("stage", sa.String(length=12), nullable=True),
        sa.Column("job_name", sa.String(length=255), nullable=True),
        sa.Column("payload", sa.JSON(), nullable=True),
        sa.Column("stats", sa.JSON(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("locked_until", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("active_key", name="uq_content_job_active_key"),
    )
    op.create_index("ix_content_jobs_kind", "content_jobs", ["kind"])

    op.create_table(
        "content_rejections",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("kind", sa.String(length=8), nullable=False),
        sa.Column("lang", sa.String(length=8), nullable=False, server_default=""),
        sa.Column("key", sa.String(length=160), nullable=False, server_default=""),
        sa.Column("reason", sa.String(length=64), nullable=True),
        sa.Column("detail", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("kind", "lang", "key", name="uq_content_rejection"),
    )


def downgrade() -> None:
    op.drop_table("content_rejections")
    op.drop_index("ix_content_jobs_kind", table_name="content_jobs")
    op.drop_table("content_jobs")
    op.drop_index("ix_fact_cards_status", table_name="fact_cards")
    op.drop_index("ix_fact_cards_ref_key", table_name="fact_cards")
    op.drop_index("ix_fact_cards_scheduled_date", table_name="fact_cards")
    op.drop_table("fact_cards")
    with op.batch_alter_table("word_routes") as batch:
        batch.drop_column("checked_by")
        batch.drop_column("source_site")
        batch.drop_column("source_url")
