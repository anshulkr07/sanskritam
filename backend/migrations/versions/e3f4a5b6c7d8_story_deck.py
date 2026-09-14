"""Story deck — swipeable Sanskrit story (Discover Sanskrit).

Revision ID: e3f4a5b6c7d8
Revises: d2e3f4a5b6c7
Create Date: 2026-09-14

Two additive tables, no data migration, no DELETE (§2.13):

``story_chapters`` — the deck's section headers (s0..s6, ranked).
``story_cards`` — one swipeable card per row: title, short body, one
optional Sanskrit example, a dive-deeper route name, and an attribution
pointer into the ``content_sources`` registry (P23-4a: attribution is a
join, never free text).

Seeded by ``seeds/story_cards.py`` at boot, not here — a migration is a
frozen snapshot and must never import application code (P23-1's rule).
Reading cards writes nothing (no mastery, no review rows).
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e3f4a5b6c7d8"
down_revision: Union[str, Sequence[str], None] = "d2e3f4a5b6c7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "story_chapters",
        sa.Column("id", sa.String(16), primary_key=True),
        sa.Column("rank", sa.Integer(), nullable=False),
        sa.Column("title_en", sa.String(128), nullable=True),
        sa.Column("title_hi", sa.String(128), nullable=True),
        sa.Column("blurb", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_table(
        "story_cards",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("chapter_id", sa.String(16),
                  sa.ForeignKey("story_chapters.id"), nullable=False),
        sa.Column("rank", sa.Integer(), nullable=False),
        sa.Column("title_en", sa.String(256), nullable=True),
        sa.Column("title_hi", sa.String(256), nullable=True),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("example_dev", sa.Text(), nullable=True),
        sa.Column("example_iast", sa.Text(), nullable=True),
        sa.Column("example_gloss", sa.Text(), nullable=True),
        sa.Column("deep_link", sa.String(32), nullable=True),
        sa.Column("deep_link_label", sa.String(128), nullable=True),
        sa.Column("attribution", sa.String(64), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("chapter_id", "rank",
                            name="uq_story_chapter_rank"),
    )
    op.create_index("ix_story_cards_chapter_id", "story_cards",
                    ["chapter_id"])


def downgrade() -> None:
    op.drop_index("ix_story_cards_chapter_id", table_name="story_cards")
    op.drop_table("story_cards")
    op.drop_table("story_chapters")
