"""P7-11: add a review gate to challenges

Revision ID: e5f6a7b8c9da
Revises: d4e5f6a7b8c9
Create Date: 2026-09-05

P7-4's brief said "same review gate" but `Challenge` had no `review_status`
and `/challenges/next` served ~415 LLM-generated sentences on the Vidyut gate
alone (§4). This migration:

  1. Adds `review_status` (pending|approved|rejected) + note + reviewed_at to
     `challenges`, defaulting pending, indexed.
  2. Grandfathers the hand-written SEED challenges to "approved" — they were
     authored by hand and already shipped. Everything generated starts pending.

Vocabulary matches `DialogueScenario` (`8c9d0e1f2a3b`). The selector filter is
enforced in `adaptive.py::select_next_challenge` so a pending challenge is
never served.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e5f6a7b8c9da"
down_revision: Union[str, Sequence[str], None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# The 33 distinct hand-authored seed targets (from app/seeds/challenges.py).
SEED_TARGETS = [
    "रामः फलम् खादति।",
    "बालः ग्रामम् गच्छति।",
    "सीता जलम् पिबति।",
    "अश्वः धावति।",
    "देवः नराय फलम् ददाति।",
    "नरौ पुस्तके पठतः।",
    "बालौ हसतः।",
    "अश्वौ धावतः।",
    "बालाः ग्रामम् गच्छन्ति।",
    "नराः ग्रामात् आगच्छन्ति।",
    "वने फलानि सन्ति।",
    "ग्रामम् गच्छामि।",
    "फलम् खादसि।",
    "ग्रामम् गच्छावः।",
    "ग्रामम् गच्छथः।",
    "नरः अश्वेन गच्छति।",
    "बालः पुस्तके लिखति।",
    "सीता अश्वम् पश्यति।",
    "कन्या जलम् पिबति।",
    "गङ्गा समुद्रम् गच्छति।",
    "बालस्य पुस्तकम् गेहे अस्ति।",
    "रामस्य भ्राता वनम् गच्छति।",
    "पिटके फलानि सन्ति।",
    "कन्ये अश्वौ पश्यतः।",
    "रामकृष्णौ वनम् गच्छतः।",
    "वयम् गेहम् गच्छामः।",
    "गुरुः शिष्यान् पाठयति।",
    "रामः सह लक्ष्मणेन वनम् गच्छति।",
    "समुद्रे मणिः अस्ति।",
    "सूर्यस्य प्रकाशः तमः नश्यति।",
    "बालः ग्रामे पुस्तकम् पठति।",
    "वयं धर्मं चरामः।",
    "रामः रावणम् नगरे पश्यति।",
]


def upgrade() -> None:
    with op.batch_alter_table("challenges", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("review_status", sa.String(16), server_default="pending", nullable=True)
        )
        batch_op.add_column(sa.Column("review_note", sa.Text(), server_default="", nullable=True))
        batch_op.add_column(sa.Column("reviewed_at", sa.DateTime(), nullable=True))
        batch_op.create_index("ix_challenges_review_status", ["review_status"])
    # Grandfather the hand-written seeds to approved (they already shipped).
    bind = op.get_bind()
    bind.execute(
        sa.text(
            "UPDATE challenges SET review_status='approved' "
            "WHERE target_sanskrit IN :seed_targets"
        ).bindparams(
            sa.bindparam("seed_targets", expanding=True)
        ).params(seed_targets=SEED_TARGETS)
    )


def downgrade() -> None:
    with op.batch_alter_table("challenges", schema=None) as batch_op:
        batch_op.drop_index("ix_challenges_review_status")
        batch_op.drop_column("reviewed_at")
        batch_op.drop_column("review_note")
        batch_op.drop_column("review_status")