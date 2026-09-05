"""Add google_sub column to learners for Google sign-in.

Revision ID: aabbccddeeff
Revises: f6a7b8c9d0eb
Create Date: 2026-09-05

Binds a Google account to a learner (``POST /auth/google``). ``google_sub`` is
the Google OAuth subject identifier — unique per Google account. One Google
account maps to one learner; anonymous/dev-login learners leave it NULL.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "aabbccddeeff"
down_revision: Union[str, Sequence[str], None] = "f6a7b8c9d0eb"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("learners", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("google_sub", sa.String(64), nullable=True)
        )
        batch_op.create_index("ix_learners_google_sub", ["google_sub"], unique=True)


def downgrade() -> None:
    with op.batch_alter_table("learners", schema=None) as batch_op:
        batch_op.drop_index("ix_learners_google_sub")
        batch_op.drop_column("google_sub")