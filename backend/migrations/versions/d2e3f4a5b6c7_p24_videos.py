"""P24: lesson videos — metadata catalogue, bytes stay on YouTube.

Revision ID: d2e3f4a5b6c7
Revises: b4c6d8e0f1a2
Create Date: 2026-09-09

One additive table, no data migration, no DELETE (§2.13):

``video_items`` — one row per lesson video. Title, channel, YouTube id (or a
plain URL for link-out rows: course pages, playlists, NC-licensed material),
teaching-medium lang, playback mode (embed | link), and a ``source_key``
pointer into the ``content_sources`` registry (P23-4a: attribution is a join,
never free text). Keyed to ``units`` — unit ids are stable (``u1``..``u11``)
while lesson ids are seed-generated uuids, so lesson→videos resolves through
the lesson's unit at serve time.

Seeded by ``seeds/video_items.py`` at boot, not here — a migration is a
frozen snapshot and must never import application code (P23-1's rule).
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d2e3f4a5b6c7"
down_revision: Union[str, Sequence[str], None] = "b4c6d8e0f1a2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "video_items",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("unit_id", sa.String(16), sa.ForeignKey("units.id"), nullable=False),
        sa.Column("rank", sa.Integer(), nullable=False, default=0),
        sa.Column("title", sa.String(256), nullable=True),
        sa.Column("channel", sa.String(128), nullable=True),
        sa.Column("youtube_id", sa.String(32), nullable=True),
        sa.Column("url", sa.String(512), nullable=True),
        sa.Column("lang", sa.String(8), nullable=True),
        sa.Column("duration_s", sa.Integer(), nullable=True),
        sa.Column("playback", sa.String(8), nullable=True),
        sa.Column("source_key", sa.String(64), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("unit_id", "youtube_id", name="uq_video_unit_youtube"),
    )
    op.create_index("ix_video_items_unit_id", "video_items", ["unit_id"])
    op.create_index("ix_video_items_source_key", "video_items", ["source_key"])


def downgrade() -> None:
    op.drop_index("ix_video_items_source_key", table_name="video_items")
    op.drop_index("ix_video_items_unit_id", table_name="video_items")
    op.drop_table("video_items")
