"""Add streak_freezes to learners

Revision ID: 1f2a3b4c5d6e
Revises: 0e1f2a3b4c5d
Create Date: 2026-09-01

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "1f2a3b4c5d6e"
down_revision: Union[str, Sequence[str], None] = "0e1f2a3b4c5d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("learners", schema=None) as batch_op:
        batch_op.add_column(sa.Column("streak_freezes", sa.Integer(), server_default="2"))


def downgrade() -> None:
    with op.batch_alter_table("learners", schema=None) as batch_op:
        batch_op.drop_column("streak_freezes")