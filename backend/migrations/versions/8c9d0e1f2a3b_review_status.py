"""Add review_status, review_note, reviewed_at to dialogue_scenarios

Revision ID: 8c9d0e1f2a3b
Revises: 7b8c9d0e1f2a
Create Date: 2026-09-01

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "8c9d0e1f2a3b"
down_revision: Union[str, Sequence[str], None] = "7b8c9d0e1f2a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("dialogue_scenarios", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("review_status", sa.String(16), server_default="approved", nullable=True)
        )
        batch_op.add_column(
            sa.Column("review_note", sa.Text(), server_default="", nullable=True)
        )
        batch_op.add_column(
            sa.Column("reviewed_at", sa.DateTime(), nullable=True)
        )
        batch_op.create_index("ix_dialogue_scenarios_review_status", ["review_status"])


def downgrade() -> None:
    with op.batch_alter_table("dialogue_scenarios", schema=None) as batch_op:
        batch_op.drop_index("ix_dialogue_scenarios_review_status")
        batch_op.drop_column("reviewed_at")
        batch_op.drop_column("review_note")
        batch_op.drop_column("review_status")