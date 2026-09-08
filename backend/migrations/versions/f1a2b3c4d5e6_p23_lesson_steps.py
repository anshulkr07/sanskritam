"""P23: the lesson spine as data — units, lesson_steps, and a lesson that
can teach more than one feature.

Revision ID: f1a2b3c4d5e6
Revises: e2f3a4b5c6d7
Create Date: 2026-09-08

Three changes, one theme: a lesson stops being a page and becomes a
sequence.

``units`` makes CURRICULUM.md §6.2's eleven-unit spine data instead of
prose. It was only ever a bare ``lessons.unit_id`` string, so nothing could
enumerate the units, order them, or say which conceptual layer each sits in.
The eleven rows are inserted here rather than in the seed because
``lessons.unit_id`` gains a foreign key to them in the same migration — the
spine has to exist before anything can point at it.

``lesson_steps`` is the new unit of teaching AND of grading. ``kind``
selects the client renderer and the server grader; ``payload`` feeds the
renderer; ``grading`` is the contract an answer is checked against.

``lessons`` loses the UNIQUE on ``feature_id`` and gains ``features`` and
``attribution``. The unique constraint hard-capped the product at one lesson
per grammatical tag, which is why "sandhi is f(a,b)→c" could not be a lesson
— sandhi is four tags. ``attribution`` carries the credit line a licence
requires (CC BY 4.0 for learnsanskrit.org-derived prose); ``provenance``
already records the source and licence.

The lessons change is a batch recreate with an explicit ``copy_from`` that
omits the UNIQUE: rows are copied, nothing is dropped. §2.13's additive rule
holds — no row is deleted by this migration.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, Sequence[str], None] = "e2f3a4b5c6d7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# CURRICULUM.md §6.2, with §6.1's layer per unit. Structural, not content:
# the seed retunes titles and blurbs, but the eleven ids and their order are
# the spine every other content table hangs off.
UNITS = [
    ("u1",  1, 0, "Sounds",       "वर्णाः",        "The alphabet is a 5×5 grid, not a list."),
    ("u2",  2, 1, "First Words",  "प्रथमशब्दाः",   "One ending does the work English gives to word order."),
    ("u3",  3, 1, "More Cases",   "अन्यविभक्तयः",  "Six more endings, six more questions answered."),
    ("u4",  4, 1, "Numbers",      "वचनानि",        "Sanskrit counts one, two, many — not one and many."),
    ("u5",  5, 1, "Persons",      "पुरुषाः",       "Three persons × three numbers: a nine-cell grid."),
    ("u6",  6, 1, "Sandhi",       "सन्धिः",        "Where sounds meet, a function decides what happens."),
    ("u7",  7, 1, "Genders",      "लिङ्गानि",      "Stem type predicts the whole paradigm."),
    ("u8",  8, 1, "More Tenses",  "लकाराः",        "Ten lakāras; the first four carry most speech."),
    ("u9",  9, 1, "Voices",       "पदे",           "Who the action returns to decides the ending set."),
    ("u10", 10, 2, "Compounds",   "समासाः",        "Words compose: A+B, B-of-A, one-who-has-A-B."),
    ("u11", 11, 2, "Kāraka",      "कारकाणि",       "The six roles that explain why a vibhakti is there."),
]


def _lessons_before() -> sa.Table:
    """The ``lessons`` table as c9d0e1f2a3b4 created it, minus the UNIQUE on
    ``feature_id``. Batch mode builds the replacement from this, so omitting
    the constraint here is what drops it — on SQLite and Postgres alike."""
    meta = sa.MetaData()
    return sa.Table(
        "lessons",
        meta,
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("feature_id", sa.String(64), sa.ForeignKey("features.id"), nullable=False),
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
        sa.Index("ix_lessons_feature_id", "feature_id"),
        sa.Index("ix_lessons_unit_id", "unit_id"),
        sa.Index("ix_lessons_register", "register"),
    )


def upgrade() -> None:
    units = op.create_table(
        "units",
        sa.Column("id", sa.String(16), primary_key=True),
        sa.Column("rank", sa.Integer(), nullable=False),
        sa.Column("layer", sa.Integer(), nullable=False),
        sa.Column("title_en", sa.String(128), nullable=True),
        sa.Column("title_hi", sa.String(128), nullable=True),
        sa.Column("blurb", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    # The spine has to exist before lessons.unit_id can reference it.
    op.bulk_insert(units, [
        {"id": i, "rank": r, "layer": la, "title_en": en, "title_hi": hi, "blurb": b}
        for (i, r, la, en, hi, b) in UNITS
    ])

    op.create_table(
        "lesson_steps",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("lesson_id", sa.String(64), sa.ForeignKey("lessons.id"), nullable=False),
        sa.Column("rank", sa.Integer(), nullable=False),
        sa.Column("kind", sa.String(24), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=True),
        sa.Column("grading", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("lesson_id", "rank", name="uq_step_lesson_rank"),
    )
    op.create_index("ix_lesson_steps_lesson_id", "lesson_steps", ["lesson_id"])
    op.create_index("ix_lesson_steps_kind", "lesson_steps", ["kind"])

    with op.batch_alter_table(
        "lessons", copy_from=_lessons_before(), recreate="always"
    ) as batch_op:
        batch_op.add_column(sa.Column("features", sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column("attribution", sa.String(256), nullable=True))
        batch_op.create_foreign_key(
            "fk_lessons_unit_id", "units", ["unit_id"], ["id"]
        )


def downgrade() -> None:
    # Restores the UNIQUE by naming it in the target shape; the two added
    # columns and the FK go with the recreate.
    with op.batch_alter_table("lessons", recreate="always") as batch_op:
        batch_op.drop_constraint("fk_lessons_unit_id", type_="foreignkey")
        batch_op.drop_column("attribution")
        batch_op.drop_column("features")
        batch_op.create_unique_constraint("uq_lessons_feature_id", ["feature_id"])

    op.drop_index("ix_lesson_steps_kind", table_name="lesson_steps")
    op.drop_index("ix_lesson_steps_lesson_id", table_name="lesson_steps")
    op.drop_table("lesson_steps")
    op.drop_table("units")
