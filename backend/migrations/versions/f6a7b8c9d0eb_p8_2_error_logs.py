"""P8-2: error_logs table for crash reporting

Revision ID: f6a7b8c9d0eb
Revises: e5f6a7b8c9da
Create Date: 2026-09-06

A stranger hitting a 500 currently produces silence (P8-2): nothing today
reports an exception anywhere. This migration adds the server-side crash log —
stack traces and route names ONLY, never learner audio, transcripts or
Devanagari answers (P1-4 governs learner speech). Written by the exception
middleware in app/main.py, read by GET /admin/errors.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f6a7b8c9d0eb"
down_revision: Union[str, Sequence[str], None] = "e5f6a7b8c9da"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "error_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("ts", sa.DateTime(), nullable=True),
        sa.Column("route", sa.String(length=128), nullable=True),
        sa.Column("error_type", sa.String(length=128), nullable=True),
        sa.Column("detail", sa.String(length=256), nullable=True),
        sa.Column("traceback", sa.Text(), nullable=True),
        sa.Column("request_id", sa.String(length=32), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_error_logs_ts", "error_logs", ["ts"])


def downgrade() -> None:
    op.drop_index("ix_error_logs_ts", table_name="error_logs")
    op.drop_table("error_logs")
