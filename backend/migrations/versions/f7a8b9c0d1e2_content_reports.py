"""Content reports for flagged AI replies.

Revision ID: f7a8b9c0d1e2
Revises: e4f5a6b7c8d9
Create Date: 2026-10-01

New table only; nothing existing changes.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "f7a8b9c0d1e2"
down_revision: Union[str, Sequence[str], None] = "e4f5a6b7c8d9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "content_reports",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("learner_id", sa.String(length=64), nullable=False),
        sa.Column("surface", sa.String(length=16), nullable=False, server_default=""),
        sa.Column("question", sa.Text(), nullable=False, server_default=""),
        sa.Column("answer", sa.Text(), nullable=False, server_default=""),
        sa.Column("reason", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["learner_id"], ["learners.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_content_reports_learner_id", "content_reports", ["learner_id"])
    op.create_index("ix_content_reports_created_at", "content_reports", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_content_reports_created_at", table_name="content_reports")
    op.drop_index("ix_content_reports_learner_id", table_name="content_reports")
    op.drop_table("content_reports")
