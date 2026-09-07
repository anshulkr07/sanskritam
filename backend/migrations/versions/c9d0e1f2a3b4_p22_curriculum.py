"""P22: curriculum tables — lessons, vocab_words, reader_passages.

Revision ID: c9d0e1f2a3b4
Revises: b7c8d9e0f1a2
Create Date: 2026-09-07

``lessons`` is the Lesson content type (P22-1): one row per feature, ordered
by rank within its unit, carrying Vidyut-verified examples and pre-computed
``visual_data`` the client renders without further derivation.
``vocab_words`` is the topic-grouped vocabulary curriculum (P22-5), unique
per (topic, devanagari) so the seed is idempotent at the schema level
(§2.14). ``reader_passages`` is the graded-reading material (P22-6), unique
per (tier, devanagari). All three are additive content tables — no data
migration, no DELETE (§2.13/§2.15 do not apply beyond the backup rule).
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c9d0e1f2a3b4"
down_revision: Union[str, Sequence[str], None] = "b7c8d9e0f1a2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "lessons",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("feature_id", sa.String(64), sa.ForeignKey("features.id"), nullable=False, unique=True),
        sa.Column("unit_id", sa.String(16), nullable=False),
        sa.Column("rank", sa.Integer(), nullable=True),
        sa.Column("title_en", sa.String(256), nullable=True),
        sa.Column("title_hi", sa.String(256), nullable=True),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("examples", sa.JSON(), nullable=True),
        sa.Column("visual_type", sa.String(16), nullable=True),
        sa.Column("visual_data", sa.JSON(), nullable=True),
        sa.Column("audio_url", sa.String(512), nullable=True),
        sa.Column("register", sa.String(16), nullable=True),
        sa.Column("provenance", sa.String(256), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_lessons_feature_id", "lessons", ["feature_id"])
    op.create_index("ix_lessons_unit_id", "lessons", ["unit_id"])
    op.create_index("ix_lessons_register", "lessons", ["register"])

    op.create_table(
        "vocab_words",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("topic", sa.String(32), nullable=False),
        sa.Column("rank", sa.Integer(), nullable=True),
        sa.Column("devanagari", sa.String(64), nullable=False),
        sa.Column("iast", sa.String(128), nullable=True),
        sa.Column("gloss", sa.String(256), nullable=True),
        sa.Column("gender", sa.String(16), nullable=True),
        sa.Column("stem", sa.String(64), nullable=True),
        sa.Column("examples", sa.JSON(), nullable=True),
        sa.Column("provenance", sa.String(256), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("topic", "devanagari", name="uq_vocab_topic_dev"),
    )
    op.create_index("ix_vocab_words_topic", "vocab_words", ["topic"])

    op.create_table(
        "reader_passages",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("tier", sa.Integer(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=True),
        sa.Column("devanagari", sa.Text(), nullable=False),
        sa.Column("iast", sa.Text(), nullable=True),
        sa.Column("word_breakdown", sa.JSON(), nullable=True),
        sa.Column("parse", sa.JSON(), nullable=True),
        sa.Column("features", sa.JSON(), nullable=True),
        sa.Column("register", sa.String(16), nullable=True),
        sa.Column("provenance", sa.String(256), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("tier", "devanagari", name="uq_reader_tier_dev"),
    )
    op.create_index("ix_reader_passages_tier", "reader_passages", ["tier"])


def downgrade() -> None:
    op.drop_index("ix_reader_passages_tier", table_name="reader_passages")
    op.drop_table("reader_passages")
    op.drop_index("ix_vocab_words_topic", table_name="vocab_words")
    op.drop_table("vocab_words")
    op.drop_index("ix_lessons_register", table_name="lessons")
    op.drop_index("ix_lessons_unit_id", table_name="lessons")
    op.drop_index("ix_lessons_feature_id", table_name="lessons")
    op.drop_table("lessons")
