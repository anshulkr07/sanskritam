"""Add Hindi and English reader translations.

Revision ID: e4f5a6b7c8d9
Revises: a7b8c9d0e1f2
Create Date: 2026-09-17

Existing verses retain empty translations until a sourced import supplies them.
The constant default is supported by both SQLite and PostgreSQL.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "e4f5a6b7c8d9"
down_revision: Union[str, Sequence[str], None] = "a7b8c9d0e1f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("shlokas", sa.Column("translation_hi", sa.Text(),
                                     nullable=False, server_default=""))
    op.add_column("shlokas", sa.Column("translation_en", sa.Text(),
                                     nullable=False, server_default=""))


def downgrade() -> None:
    op.drop_column("shlokas", "translation_en")
    op.drop_column("shlokas", "translation_hi")
