"""Guru minutes from a plan month (Lite and Plus include minutes every month)."""
from alembic import op
import sqlalchemy as sa

revision = "20261106_plan_allowances"
down_revision = "20261104_hybrid_commerce"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("commerce_voice_calls", sa.Column("plan_ms", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("commerce_voice_calls", sa.Column("plan_period", sa.String(32), nullable=True))


def downgrade():
    op.drop_column("commerce_voice_calls", "plan_period")
    op.drop_column("commerce_voice_calls", "plan_ms")
