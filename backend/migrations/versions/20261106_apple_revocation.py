"""Sign in with Apple revocation on account deletion.

Revision ID: 20261106_apple_revocation
Revises: 20261106_plan_allowances
Create Date: 2026-11-06

``learners.apple_refresh_token`` stores the encrypted refresh token returned
by Apple's authorization-code exchange. ``provider_deletions.secret`` carries
that encrypted value until Apple confirms the revocation, so deleting the
learner row does not make a failed revocation unretryable.

No existing data is rewritten. Learners who signed in with Apple before this
change have no refresh token until their next sign-in, which is why account
deletion cannot revoke those older sessions.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20261106_apple_revocation"
down_revision: Union[str, Sequence[str], None] = "20261106_plan_allowances"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("learners", sa.Column("apple_refresh_token", sa.Text(), nullable=True))
    op.add_column(
        "provider_deletions",
        sa.Column("secret", sa.Text(), nullable=False, server_default=""),
    )


def downgrade() -> None:
    op.drop_column("provider_deletions", "secret")
    op.drop_column("learners", "apple_refresh_token")
