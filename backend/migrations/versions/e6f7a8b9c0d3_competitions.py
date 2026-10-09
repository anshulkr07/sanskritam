"""Competitions, entries, public profiles, certificates, monthly winners.

Revision ID: e6f7a8b9c0d3
Revises: e6f7a8b9c0d2
Create Date: 2026-10-09
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "e6f7a8b9c0d3"
down_revision: Union[str, Sequence[str], None] = "e6f7a8b9c0d2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "competitions",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("slug", sa.String(length=64), nullable=False),
        sa.Column("kind", sa.String(length=16), nullable=False, server_default="weekend"),
        sa.Column("opens_at", sa.DateTime(), nullable=False),
        sa.Column("closes_at", sa.DateTime(), nullable=False),
        sa.Column("results_at", sa.DateTime(), nullable=False),
        sa.Column("pieces", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="scheduled"),
        sa.Column("rules_version", sa.String(length=32), nullable=False, server_default="2026-10-1"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("published_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug", name="uq_competitions_slug"),
    )
    op.create_index("ix_competitions_status", "competitions", ["status"])
    op.create_table(
        "competition_entries",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("competition_id", sa.String(length=64), nullable=False),
        sa.Column("learner_id", sa.String(length=64), nullable=False),
        sa.Column("public_name", sa.String(length=64), nullable=False, server_default=""),
        sa.Column("best_percent", sa.Float(), nullable=True),
        sa.Column("best_at", sa.DateTime(), nullable=True),
        sa.Column("best_attempt_id", sa.Integer(), nullable=True),
        sa.Column("attempts_counted", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("flags", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("flags_cleared", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("disqualified", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("dq_reason", sa.Text(), nullable=False, server_default=""),
        sa.Column("final_rank", sa.Integer(), nullable=True),
        sa.Column("audio_key", sa.String(length=512), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["competition_id"], ["competitions.id"]),
        sa.ForeignKeyConstraint(["learner_id"], ["learners.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("competition_id", "learner_id", name="uq_comp_entry"),
    )
    op.create_index("ix_comp_entries_comp", "competition_entries", ["competition_id"])
    op.create_index("ix_comp_entries_learner", "competition_entries", ["learner_id"])
    op.create_table(
        "learner_public",
        sa.Column("learner_id", sa.String(length=64), nullable=False),
        sa.Column("public_name", sa.String(length=64), nullable=False, server_default=""),
        sa.Column("age_confirmed_at", sa.DateTime(), nullable=True),
        sa.Column("rules_version", sa.String(length=32), nullable=False, server_default=""),
        sa.Column("rules_accepted_at", sa.DateTime(), nullable=True),
        sa.Column("recordings_consent_at", sa.DateTime(), nullable=True),
        sa.Column("banned", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["learner_id"], ["learners.id"]),
        sa.PrimaryKeyConstraint("learner_id"),
    )
    op.create_table(
        "certificates",
        sa.Column("code", sa.String(length=16), nullable=False),
        sa.Column("kind", sa.String(length=16), nullable=False, server_default="competition"),
        sa.Column("competition_id", sa.String(length=64), nullable=True),
        sa.Column("month", sa.String(length=8), nullable=True),
        sa.Column("learner_id", sa.String(length=64), nullable=False),
        sa.Column("rank", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("public_name", sa.String(length=64), nullable=False, server_default=""),
        sa.Column("piece_ref", sa.String(length=128), nullable=False, server_default=""),
        sa.Column("issued_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["learner_id"], ["learners.id"]),
        sa.PrimaryKeyConstraint("code"),
    )
    op.create_index("ix_certificates_learner", "certificates", ["learner_id"])
    op.create_index("ix_certificates_month", "certificates", ["month"])
    op.create_index("ix_certificates_comp", "certificates", ["competition_id"])
    op.create_table(
        "monthly_winners",
        sa.Column("month", sa.String(length=8), nullable=False),
        sa.Column("learner_id", sa.String(length=64), nullable=False),
        sa.Column("public_name", sa.String(length=64), nullable=False, server_default=""),
        sa.Column("wins", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("claim_code", sa.String(length=16), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["learner_id"], ["learners.id"]),
        sa.PrimaryKeyConstraint("month"),
    )


def downgrade() -> None:
    op.drop_table("monthly_winners")
    op.drop_index("ix_certificates_comp", table_name="certificates")
    op.drop_index("ix_certificates_month", table_name="certificates")
    op.drop_index("ix_certificates_learner", table_name="certificates")
    op.drop_table("certificates")
    op.drop_table("learner_public")
    op.drop_index("ix_comp_entries_learner", table_name="competition_entries")
    op.drop_index("ix_comp_entries_comp", table_name="competition_entries")
    op.drop_table("competition_entries")
    op.drop_index("ix_competitions_status", table_name="competitions")
    op.drop_table("competitions")
