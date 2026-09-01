"""conversation sessions table

Revision ID: 3c4d5e6f7a8b
Revises: 2a3b4c5d6e7f
Create Date: 2026-08-29 16:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "3c4d5e6f7a8b"
down_revision: Union[str, Sequence[str], None] = "2a3b4c5d6e7f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add conversation_sessions table."""
    op.create_table(
        "conversation_sessions",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("learner_id", sa.String(length=64), nullable=False),
        sa.Column("scenario_id", sa.String(length=64), nullable=False),
        sa.Column("current_node_id", sa.String(length=64), nullable=False),
        sa.Column("turn_count", sa.Integer(), nullable=True),
        sa.Column("ratio_hint", sa.Float(), nullable=True),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["learner_id"], ["learners.id"],),
        sa.ForeignKeyConstraint(["scenario_id"], ["dialogue_scenarios.id"],),
        sa.ForeignKeyConstraint(["current_node_id"], ["dialogue_nodes.id"],),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("conversation_sessions", schema=None) as batch_op:
        batch_op.create_index(
            batch_op.f("ix_conversation_sessions_learner_id"),
            ["learner_id"],
            unique=False,
        )


def downgrade() -> None:
    """Drop conversation_sessions table."""
    with op.batch_alter_table("conversation_sessions", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_conversation_sessions_learner_id"))
    op.drop_table("conversation_sessions")
