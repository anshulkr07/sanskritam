"""Recite attempts table.

Revision ID: e6f7a8b9c0d2
Revises: e6f7a8b9c0d1
Create Date: 2026-10-09
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "e6f7a8b9c0d2"
down_revision: Union[str, Sequence[str], None] = "e6f7a8b9c0d1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "recite_attempts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("learner_id", sa.String(length=64), nullable=False),
        sa.Column("verse_uid", sa.String(length=16), nullable=False),
        sa.Column("unit", sa.String(length=16), nullable=False, server_default="verse"),
        sa.Column("purpose", sa.String(length=16), nullable=False, server_default="practise"),
        sa.Column("mode", sa.String(length=8), nullable=False, server_default="strict"),
        sa.Column("status", sa.String(length=8), nullable=False, server_default="scored"),
        sa.Column("percent", sa.Float(), nullable=True),
        sa.Column("n_ok", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("n_fix", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("n_unclear", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("bands", sa.String(length=512), nullable=False, server_default=""),
        sa.Column("duration_ms", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("competition_id", sa.String(length=64), nullable=True),
        sa.Column("camera", sa.JSON(), nullable=True),
        sa.Column("counted", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("flags", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["learner_id"], ["learners.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_recite_attempts_learner", "recite_attempts", ["learner_id"])
    op.create_index("ix_recite_attempts_verse", "recite_attempts", ["verse_uid"])
    op.create_index("ix_recite_attempts_comp", "recite_attempts", ["competition_id"])
    op.create_index("ix_recite_attempts_created", "recite_attempts", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_recite_attempts_created", table_name="recite_attempts")
    op.drop_index("ix_recite_attempts_comp", table_name="recite_attempts")
    op.drop_index("ix_recite_attempts_verse", table_name="recite_attempts")
    op.drop_index("ix_recite_attempts_learner", table_name="recite_attempts")
    op.drop_table("recite_attempts")
