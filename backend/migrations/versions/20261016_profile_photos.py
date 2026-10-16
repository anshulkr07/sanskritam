"""Shared profile photos and community suspension."""
from alembic import op
import sqlalchemy as sa

revision = "20261016_profile_photos"
down_revision = "20261015_learning_state"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("learners", sa.Column("avatar_key", sa.String(240), nullable=True))
    op.add_column("learners", sa.Column("avatar_updated_at", sa.DateTime(), nullable=True))
    op.add_column("learners", sa.Column("community_suspended", sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade():
    for field in ("community_suspended", "avatar_updated_at", "avatar_key"):
        op.drop_column("learners", field)
