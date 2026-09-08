"""P23-4a + P23-5: the licence registry, the review schedule, and a home
for handwriting progress.

Revision ID: c1d2e3f4a5b6
Revises: f1a2b3c4d5e6
Create Date: 2026-09-08

Three additive changes, no data migration, no DELETE (§2.13 / §2.15):

``content_sources`` (P23-4a) — the licence registry. One row per source we
take anything from. Content rows (Lesson.attribution, VocabWord.provenance,
ReaderPassage.provenance) hold a registry KEY; the registry owns the
wording. Seeded by ``seeds/licences.py`` at boot, not here — a migration is
a frozen snapshot and must never import application code (LESSON_OVERHAUL
P23-1's rule, applied again).

``review_items`` (P23-5) — learner x item x due_at x stability x difficulty
x lapses. An item is a step instance or a vocab word, not just a feature
tag. Unique (learner_id, item_key): the schedule write is an upsert.

``learners.writing_mastery`` (P23-5 live-bug fix) — handwriting progress
moves OUT of ``feature_mastery``. routers/writing.py wrote
{"attempts", "correct", "ef"} dicts under "write:<iast>" keys into a dict
whose every other value is a float; both adaptive.update_mastery and
grammar.get_path_spine read that dict with float(). Legacy "write:" keys
already in the wild are moved lazily by the writing router (it owns the
only writer), so this migration carries no UPDATE.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c1d2e3f4a5b6"
down_revision: Union[str, Sequence[str], None] = "f1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "content_sources",
        sa.Column("key", sa.String(64), primary_key=True),
        sa.Column("name", sa.String(256), nullable=True),
        sa.Column("url", sa.String(512), nullable=True),
        sa.Column("licence", sa.String(64), nullable=True),
        sa.Column("credit", sa.Text(), nullable=True),
        sa.Column("taken", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "review_items",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("learner_id", sa.String(64), sa.ForeignKey("learners.id"), nullable=False),
        sa.Column("item_key", sa.String(128), nullable=False),
        sa.Column("kind", sa.String(16), nullable=True),
        sa.Column("due_at", sa.DateTime(), nullable=False),
        sa.Column("stability", sa.Float(), nullable=True),
        sa.Column("difficulty", sa.Float(), nullable=True),
        sa.Column("lapses", sa.Integer(), nullable=True),
        sa.Column("last_verdict", sa.String(16), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("learner_id", "item_key", name="uq_review_learner_item"),
    )
    op.create_index("ix_review_items_learner_id", "review_items", ["learner_id"])
    op.create_index("ix_review_items_item_key", "review_items", ["item_key"])
    op.create_index("ix_review_items_due_at", "review_items", ["due_at"])

    # The writing-mastery move: a nullable JSON column, no backfill here.
    with op.batch_alter_table("learners", recreate="never") as batch_op:
        batch_op.add_column(sa.Column("writing_mastery", sa.JSON(), nullable=True))

    # Canon texts point at the registry too — one registry, not two.
    with op.batch_alter_table("canon_texts", recreate="never") as batch_op:
        batch_op.add_column(sa.Column("source_key", sa.String(64), nullable=True))
    op.create_index("ix_canon_texts_source_key", "canon_texts", ["source_key"])


def downgrade() -> None:
    op.drop_index("ix_canon_texts_source_key", table_name="canon_texts")
    with op.batch_alter_table("canon_texts", recreate="never") as batch_op:
        batch_op.drop_column("source_key")

    with op.batch_alter_table("learners", recreate="never") as batch_op:
        batch_op.drop_column("writing_mastery")

    op.drop_index("ix_review_items_due_at", table_name="review_items")
    op.drop_index("ix_review_items_item_key", table_name="review_items")
    op.drop_index("ix_review_items_learner_id", table_name="review_items")
    op.drop_table("review_items")
    op.drop_table("content_sources")
