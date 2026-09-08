"""Spec E: home for varnamala drill coverage.

Revision ID: a3f7c9e1b2d4
Revises: c1d2e3f4a5b6
Create Date: 2026-09-08

One additive change, no data migration, no DELETE (§2.13 / §2.15):

``learners.varna_progress`` — ``{varna_id: {reps, last_ts}}``. Coverage
only: ``POST /varnamala/practice`` records a rep and returns no verdict
(Spec E §5 — ship the drill, ship no scoring). Its own column, never
``feature_mastery`` (P23-5's homogeneous-dict rule, applied again).
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a3f7c9e1b2d4"
down_revision: Union[str, Sequence[str], None] = "c1d2e3f4a5b6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "learners",
        sa.Column("varna_progress", sa.JSON(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("learners", "varna_progress")
