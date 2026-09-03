"""daily word service (P12): daily_words + daily_word_plays

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-09-02

The varṇamālā guessing game (वर्ण-बन्धः) needs a curated word per learner-local
day and a per-learner play record so a solved day can refuse replay.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, Sequence[str], None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "daily_words",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("date", sa.String(length=10), nullable=False),
        sa.Column("answer", sa.String(length=32), nullable=False),
        sa.Column("answer_iast", sa.String(length=64), nullable=True),
        sa.Column("clue", sa.String(length=256), nullable=True),
        sa.Column("difficulty", sa.String(length=16), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("date", name="uq_daily_words_date"),
    )
    op.create_index("ix_daily_words_date", "daily_words", ["date"])

    op.create_table(
        "daily_word_plays",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("learner_id", sa.String(length=64), nullable=False),
        sa.Column("date", sa.String(length=10), nullable=False),
        sa.Column("guess_count", sa.Integer(), nullable=True),
        sa.Column("solved", sa.Boolean(), nullable=True),
        sa.Column("finished", sa.Boolean(), nullable=True),
        sa.Column("ts", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["learner_id"], ["learners.id"]),
        sa.UniqueConstraint("learner_id", "date", name="uq_daily_word_learner_date"),
    )
    op.create_index("ix_daily_word_plays_learner_id", "daily_word_plays", ["learner_id"])
    op.create_index("ix_daily_word_plays_date", "daily_word_plays", ["date"])


def downgrade() -> None:
    op.drop_index("ix_daily_word_plays_date", table_name="daily_word_plays")
    op.drop_index("ix_daily_word_plays_learner_id", table_name="daily_word_plays")
    op.drop_table("daily_word_plays")
    op.drop_index("ix_daily_words_date", table_name="daily_words")
    op.drop_table("daily_words")
