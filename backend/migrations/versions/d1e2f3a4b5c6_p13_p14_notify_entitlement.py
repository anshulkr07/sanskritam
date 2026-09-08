"""P13+P14: push_tokens, notification_sends, entitlements.

Revision ID: d1e2f3a4b5c6
Revises: c9d0e1f2a3b4
Create Date: 2026-09-08

All three are additive ledger tables — no data migration, no DELETE (§2.13 /
§2.15 do not apply beyond the backup rule). ``push_tokens`` is unique per
(learner, device); ``notification_sends`` per (learner, local_date, kind) so
the write is the idempotency check; ``entitlements`` one row per learner.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d1e2f3a4b5c6"
down_revision: Union[str, Sequence[str], None] = "c9d0e1f2a3b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "push_tokens",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("learner_id", sa.String(64), sa.ForeignKey("learners.id"), nullable=False),
        sa.Column("device_id", sa.String(128), nullable=False, server_default=""),
        sa.Column("token", sa.String(512), nullable=False),
        sa.Column("platform", sa.String(16), nullable=True),
        sa.Column("last_seen", sa.DateTime(), nullable=True),
        sa.Column("fail_count", sa.Integer(), nullable=True),
        sa.Column("dead", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("learner_id", "device_id", name="uq_push_learner_device"),
    )
    op.create_index("ix_push_tokens_learner_id", "push_tokens", ["learner_id"])

    op.create_table(
        "notification_sends",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("learner_id", sa.String(64), sa.ForeignKey("learners.id"), nullable=False),
        sa.Column("local_date", sa.String(10), nullable=False),
        sa.Column("kind", sa.String(32), nullable=False, server_default="reminder"),
        sa.Column("ignored_streak", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("learner_id", "local_date", "kind", name="uq_notify_learner_date_kind"),
    )
    op.create_index("ix_notification_sends_learner_id", "notification_sends", ["learner_id"])
    op.create_index("ix_notification_sends_local_date", "notification_sends", ["local_date"])

    op.create_table(
        "entitlements",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("learner_id", sa.String(64), sa.ForeignKey("learners.id"), nullable=False, unique=True),
        sa.Column("tier", sa.String(32), nullable=False, server_default="free"),
        sa.Column("source", sa.String(32), nullable=False, server_default="none"),
        sa.Column("valid_from", sa.DateTime(), nullable=True),
        sa.Column("valid_until", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_entitlements_learner_id", "entitlements", ["learner_id"])


def downgrade() -> None:
    op.drop_index("ix_entitlements_learner_id", table_name="entitlements")
    op.drop_table("entitlements")
    op.drop_index("ix_notification_sends_local_date", table_name="notification_sends")
    op.drop_index("ix_notification_sends_learner_id", table_name="notification_sends")
    op.drop_table("notification_sends")
    op.drop_index("ix_push_tokens_learner_id", table_name="push_tokens")
    op.drop_table("push_tokens")
