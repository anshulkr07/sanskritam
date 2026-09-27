"""Talk multilingual: remember the learner's language per conversation.

Talk stopped being a Hindi/English toggle on 2026-09-22 and became any of
Sarvam's ten Indian languages, detected from what the learner actually says.
The detection is per-turn but the ANSWER is per-session: a learner does not
switch from Telugu to Tamil halfway, so a settled session outranks a
classifier guess on a short or ambiguous line. This column is that memory.

Nullable with no default: NULL means "not settled yet", which is a real and
different state from "English". Backfilling it to 'en' would tell the tutor
an English speaker was sitting there, which is exactly the bug this replaces.

Revision ID: a7b8c9d0e1f2
Revises: e3f4a5b6c7d8
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "a7b8c9d0e1f2"
down_revision = "e3f4a5b6c7d8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "conversation_sessions",
        sa.Column("native_lang", sa.String(8), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("conversation_sessions", "native_lang")
