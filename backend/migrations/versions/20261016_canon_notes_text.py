"""Widen canon_texts.notes to Text.

Production's canon_texts predates Alembic (created via create_all from an
early model where ``notes`` was String(512)) and was stamped at head, so the
P21-4 migration's ``sa.Text()`` never reached it.  The 2026-10-16 Kaṭha
completion note (599 chars) then failed the startup seed with
``StringDataRightTruncation`` and took the whole revision down.  This realigns
the drifted column with the model (``Column(Text)``) and the original
migration.  On SQLite the batch op recreates the table (no-op change); on
Postgres it is a metadata-only ``ALTER COLUMN ... TYPE TEXT``.
"""
from alembic import op
import sqlalchemy as sa

revision = "20261016_canon_notes_text"
down_revision = "20261016_profile_photos"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("canon_texts") as batch_op:
        batch_op.alter_column(
            "notes",
            existing_type=sa.String(512),
            type_=sa.Text(),
            existing_nullable=True,
        )


def downgrade():
    with op.batch_alter_table("canon_texts") as batch_op:
        batch_op.alter_column(
            "notes",
            existing_type=sa.Text(),
            type_=sa.String(512),
            existing_nullable=True,
        )
