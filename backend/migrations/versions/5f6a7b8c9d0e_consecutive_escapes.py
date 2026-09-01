"""conversation_sessions.consecutive_escapes

Revision ID: 5f6a7b8c9d0e
Revises: 3c4d5e6f7a8b
Create Date: 2026-08-29

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "5f6a7b8c9d0e"
down_revision: Union[str, Sequence[str], None] = "3c4d5e6f7a8b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("conversation_sessions", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("consecutive_escapes", sa.Integer(), nullable=True)
        )


def downgrade() -> None:
    with op.batch_alter_table("conversation_sessions", schema=None) as batch_op:
        batch_op.drop_column("consecutive_escapes")
