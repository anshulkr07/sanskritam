"""Recite chant audio: shlokas.verse_uid + verse_audio.

Revision ID: e6f7a8b9c0d1
Revises: d4e5f6a7b8ca
Create Date: 2026-10-09
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "e6f7a8b9c0d1"
down_revision: Union[str, Sequence[str], None] = "d4e5f6a7b8ca"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("shlokas", sa.Column("verse_uid", sa.String(length=16), nullable=True))
    op.create_index("ix_shlokas_verse_uid", "shlokas", ["verse_uid"])
    op.create_table(
        "verse_audio",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("verse_uid", sa.String(length=16), nullable=False),
        sa.Column("voice", sa.String(length=48), nullable=False),
        sa.Column("url", sa.String(length=512), nullable=False),
        sa.Column("duration_ms", sa.Integer(), nullable=False),
        sa.Column("lines", sa.JSON(), nullable=False),
        sa.Column("meter", sa.String(length=32), nullable=False, server_default=""),
        sa.Column("qc_status", sa.String(length=16), nullable=False),
        sa.Column("qc_reasons", sa.JSON(), nullable=False),
        sa.Column("source_commit", sa.String(length=48), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("verse_uid", "voice", name="uq_verse_audio_uid_voice"),
    )
    op.create_index("ix_verse_audio_verse_uid", "verse_audio", ["verse_uid"])
    # Fill verse_uid for every existing row (4.1).
    conn = op.get_bind()
    try:
        from app.services.chant_text import verse_uid as _uid
        rows = conn.execute(sa.text("SELECT id, source_ref, devanagari FROM shlokas")).fetchall()
        for rid, ref, dev in rows:
            uid = _uid(ref or "", dev or "")
            conn.execute(
                sa.text("UPDATE shlokas SET verse_uid = :u WHERE id = :i"),
                {"u": uid, "i": rid},
            )
    except Exception:
        pass


def downgrade() -> None:
    op.drop_index("ix_verse_audio_verse_uid", table_name="verse_audio")
    op.drop_table("verse_audio")
    op.drop_index("ix_shlokas_verse_uid", table_name="shlokas")
    op.drop_column("shlokas", "verse_uid")
