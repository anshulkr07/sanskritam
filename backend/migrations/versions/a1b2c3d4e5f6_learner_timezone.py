"""learner timezone for local day boundary

Revision ID: a1b2c3d4e5f6
Revises: 1f2a3b4c5d6e
Create Date: 2026-09-01

The daily-activity date and the streak boundary must be computed in the
learner's own timezone (services/localtime.py). Existing rows default to UTC,
which reproduces the previous behaviour exactly — no learner's streak shifts
as a result of this migration.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "1f2a3b4c5d6e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "learners",
        sa.Column("timezone", sa.String(length=64), nullable=True, server_default="UTC"),
    )
    op.execute("UPDATE learners SET timezone = 'UTC' WHERE timezone IS NULL")


def downgrade() -> None:
    op.drop_column("learners", "timezone")
