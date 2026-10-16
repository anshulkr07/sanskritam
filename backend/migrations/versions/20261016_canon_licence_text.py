"""Widen canon_texts.licence to Text.

The per-text licence is the verbatim record (see CanonText), and the Kaṭha
(625 chars) and Muṇḍaka (846 chars) strings in seeds/canon.py are longer than
the String(512) the column was created with.  SQLite does not enforce the
length, so tests passed; on Postgres the startup seed's UPDATE failed with
``StringDataRightTruncation`` and revision shabd-api-00083-7pz never listened
on its port.  Follows 20261016_canon_notes_text, which fixed the same drift
for ``notes``.  Metadata-only ``ALTER COLUMN ... TYPE TEXT`` on Postgres; a
no-op table recreate on SQLite.
"""
from alembic import op
import sqlalchemy as sa

revision = "20261016_canon_licence_text"
down_revision = "20261016_commerce"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("canon_texts") as batch_op:
        batch_op.alter_column(
            "licence",
            existing_type=sa.String(512),
            type_=sa.Text(),
            existing_nullable=True,
        )


def downgrade():
    with op.batch_alter_table("canon_texts") as batch_op:
        batch_op.alter_column(
            "licence",
            existing_type=sa.Text(),
            type_=sa.String(512),
            existing_nullable=True,
        )
