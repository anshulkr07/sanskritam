"""Sign in with Apple: home for the learner's Apple identity.

Revision ID: b4c6d8e0f1a2
Revises: a3f7c9e1b2d4
Create Date: 2026-09-08

One additive change, no data migration, no DELETE (§2.13 / §2.15):

``learners.apple_sub`` — unique, nullable, indexed. App Store Guideline 4.8
requires Apple sign-in wherever Google sign-in is offered; one Apple account
maps to one learner, mirroring ``google_sub``.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b4c6d8e0f1a2"
down_revision: Union[str, Sequence[str], None] = "a3f7c9e1b2d4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "learners",
        sa.Column("apple_sub", sa.String(64), nullable=True),
    )
    op.create_index("ix_learners_apple_sub", "learners", ["apple_sub"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_learners_apple_sub", table_name="learners")
    op.drop_column("learners", "apple_sub")
