"""Add daily_activity table and learner XP/date columns

Revision ID: 0e1f2a3b4c5d
Revises: 9d0e1f2a3b4c
Create Date: 2026-09-01

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0e1f2a3b4c5d"
down_revision: Union[str, Sequence[str], None] = "9d0e1f2a3b4c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("learners", schema=None) as batch_op:
        batch_op.add_column(sa.Column("daily_goal_xp", sa.Integer(), server_default="50"))
        batch_op.add_column(sa.Column("last_active_date", sa.String(10), server_default=""))

    op.create_table(
        "daily_activity",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("learner_id", sa.String(64), sa.ForeignKey("learners.id"), nullable=False, index=True),
        sa.Column("date", sa.String(10), nullable=False, index=True),
        sa.Column("xp", sa.Integer(), server_default="0"),
        sa.Column("attempts", sa.Integer(), server_default="0"),
        sa.Column("conversation_turns", sa.Integer(), server_default="0"),
        sa.Column("pronunciation_attempts", sa.Integer(), server_default="0"),
        sa.Column("goal_met", sa.Boolean(), server_default="0"),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("daily_activity")
    with op.batch_alter_table("learners", schema=None) as batch_op:
        batch_op.drop_column("last_active_date")
        batch_op.drop_column("daily_goal_xp")