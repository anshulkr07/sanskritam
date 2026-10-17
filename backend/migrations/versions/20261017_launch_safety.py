"""Report handling and content withdrawals for the free production launch."""
from alembic import op
import sqlalchemy as sa

revision = "20261017_launch_safety"
down_revision = "20261016_canon_licence_text"
branch_labels = None
depends_on = None

def upgrade():
    op.add_column("content_reports", sa.Column("status", sa.String(16), nullable=False, server_default="open"))
    op.add_column("content_reports", sa.Column("review_notes", sa.Text(), server_default=""))
    op.add_column("content_reports", sa.Column("reviewed_by", sa.String(120), server_default=""))
    op.add_column("content_reports", sa.Column("reviewed_at", sa.DateTime(), nullable=True))
    op.create_index("ix_content_reports_status", "content_reports", ["status"])
    op.create_table("safety_blocks", sa.Column("digest", sa.String(64), primary_key=True), sa.Column("reason", sa.Text()), sa.Column("created_at", sa.DateTime()))
    op.create_table("provider_deletions", sa.Column("provider", sa.String(32), primary_key=True), sa.Column("subject", sa.String(64), primary_key=True), sa.Column("task_id", sa.String(128), server_default=""), sa.Column("created_at", sa.DateTime()))
    op.create_table("budget_carry", sa.Column("day", sa.String(40), primary_key=True), sa.Column("pool", sa.String(16), primary_key=True), sa.Column("amount", sa.Float(), nullable=False, server_default="0"))

def downgrade():
    op.drop_table("budget_carry")
    op.drop_table("provider_deletions")
    op.drop_table("safety_blocks")
    op.drop_index("ix_content_reports_status", table_name="content_reports")
    for name in ("reviewed_at", "reviewed_by", "review_notes", "status"):
        op.drop_column("content_reports", name)
