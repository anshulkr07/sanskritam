"""Create pronunciation_attempts table

Revision ID: 9d0e1f2a3b4c
Revises: 8c9d0e1f2a3b
Create Date: 2026-09-01

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "9d0e1f2a3b4c"
down_revision: Union[str, Sequence[str], None] = "8c9d0e1f2a3b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "pronunciation_attempts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("learner_id", sa.String(64), sa.ForeignKey("learners.id"), nullable=False, index=True),
        sa.Column("target", sa.String(32), nullable=False),
        sa.Column("target_iast", sa.String(32), server_default=""),
        sa.Column("transcript", sa.Text(), server_default=""),
        sa.Column("verdict", sa.String(16), nullable=False),
        sa.Column("contrast", sa.String(32), server_default=""),
        sa.Column("confidence", sa.Float(), server_default="0.0"),
        sa.Column("abstained", sa.Boolean(), server_default="0"),
        sa.Column("ts", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("pronunciation_attempts")