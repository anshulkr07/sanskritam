"""Permanent editions and independently purchased Guru minutes."""
from alembic import op
import sqlalchemy as sa

revision = "20261104_hybrid_commerce"
down_revision = "20261017_launch_safety"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("commerce_owned_editions", sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("learner_id", sa.String(64), nullable=False), sa.Column("title_id", sa.String(160), nullable=False),
        sa.Column("purchase_id", sa.String(64), nullable=False), sa.Column("revoked", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.UniqueConstraint("purchase_id", "title_id", name="uq_owned_purchase_title"))
    op.create_index("ix_commerce_owned_editions_learner_id", "commerce_owned_editions", ["learner_id"])
    op.create_table("commerce_voice_balances", sa.Column("learner_id", sa.String(64), primary_key=True),
        sa.Column("paid_ms", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("trial_used_ms", sa.Integer(), nullable=False, server_default="0"))
    op.create_table("commerce_voice_calls", sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("learner_id", sa.String(64), nullable=False), sa.Column("trial_ms", sa.Integer(), nullable=False),
        sa.Column("paid_ms", sa.Integer(), nullable=False), sa.Column("billed_ms", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("state", sa.String(16), nullable=False, server_default="reserved"),
        sa.Column("expires_at", sa.DateTime(), nullable=False), sa.Column("delivered_at", sa.DateTime(), nullable=True))
    op.create_index("ix_commerce_voice_calls_learner_id", "commerce_voice_calls", ["learner_id"])


def downgrade():
    op.drop_index("ix_commerce_voice_calls_learner_id", table_name="commerce_voice_calls")
    op.drop_table("commerce_voice_calls")
    op.drop_table("commerce_voice_balances")
    op.drop_index("ix_commerce_owned_editions_learner_id", table_name="commerce_owned_editions")
    op.drop_table("commerce_owned_editions")
