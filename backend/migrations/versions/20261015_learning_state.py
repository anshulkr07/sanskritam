"""Account-scoped learning bookmarks and daily goal preferences."""
from alembic import op
import sqlalchemy as sa

revision = "20261015_learning_state"
down_revision = "20261014_group"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("learners", sa.Column("learning_state", sa.JSON(), nullable=True))


def downgrade():
    op.drop_column("learners", "learning_state")
