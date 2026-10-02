"""Play game results.

Revision ID: a1b2c3d4e5f7
Revises: f7a8b9c0d1e2
Create Date: 2026-10-01

New table only; nothing existing changes.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a1b2c3d4e5f7"
down_revision: Union[str, Sequence[str], None] = "f7a8b9c0d1e2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "game_results",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("learner_id", sa.String(length=64), nullable=False),
        sa.Column("date", sa.String(length=10), nullable=False),
        sa.Column("game", sa.String(length=32), nullable=False, server_default=""),
        sa.Column("mode", sa.String(length=32), nullable=False, server_default=""),
        sa.Column("score", sa.Integer(), nullable=True),
        sa.Column("moves", sa.Integer(), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("daily", sa.Boolean(), nullable=True),
        sa.Column("goal_met", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["learner_id"], ["learners.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_game_results_learner_id", "game_results", ["learner_id"])
    op.create_index("ix_game_results_date", "game_results", ["date"])
    op.create_index("ix_game_results_learner_date", "game_results", ["learner_id", "date"])


def downgrade() -> None:
    op.drop_index("ix_game_results_learner_date", table_name="game_results")
    op.drop_index("ix_game_results_date", table_name="game_results")
    op.drop_index("ix_game_results_learner_id", table_name="game_results")
    op.drop_table("game_results")
