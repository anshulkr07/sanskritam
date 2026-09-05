"""P20: writing_items + writing_attempts — learning to write the script.

Revision ID: b7c8d9e0f1a2
Revises: aabbccddeeff
Create Date: 2026-09-06

``writing_items`` is the drill corpus (P20-1): tier 1 letters in articulation
order, tier 2 mātrā forms, tier 3 words that reference existing challenge rows
instead of duplicating them. ``writing_attempts`` records what the on-device
recogniser returned (P20-3) — a recognised string and a confidence, never the
strokes and never an image (§2.16). The unique ``(tier, devanagari)`` pair
makes the seed idempotent at the schema level (§2.14).
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b7c8d9e0f1a2"
down_revision: Union[str, Sequence[str], None] = "aabbccddeeff"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "writing_items",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("tier", sa.Integer(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("devanagari", sa.String(64), nullable=False),
        sa.Column("iast", sa.String(128), nullable=True),
        sa.Column("gloss", sa.String(256), nullable=True),
        sa.Column("stroke_paths", sa.JSON(), nullable=True),
        sa.Column(
            "challenge_id",
            sa.String(64),
            sa.ForeignKey("challenges.id"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("tier", "devanagari", name="uq_writing_item_tier_dev"),
    )
    op.create_index("ix_writing_items_tier", "writing_items", ["tier"])

    op.create_table(
        "writing_attempts",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "learner_id",
            sa.String(64),
            sa.ForeignKey("learners.id"),
            nullable=False,
        ),
        sa.Column(
            "item_id",
            sa.String(64),
            sa.ForeignKey("writing_items.id"),
            nullable=False,
        ),
        sa.Column("recognised_text", sa.String(128), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("source", sa.String(8), nullable=True),
        sa.Column("verdict", sa.String(16), nullable=False),
        sa.Column("abstained", sa.Boolean(), nullable=True),
        sa.Column("ts", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_writing_attempts_learner_id", "writing_attempts", ["learner_id"])
    op.create_index("ix_writing_attempts_item_id", "writing_attempts", ["item_id"])


def downgrade() -> None:
    op.drop_index("ix_writing_attempts_item_id", table_name="writing_attempts")
    op.drop_index("ix_writing_attempts_learner_id", table_name="writing_attempts")
    op.drop_table("writing_attempts")
    op.drop_index("ix_writing_items_tier", table_name="writing_items")
    op.drop_table("writing_items")
