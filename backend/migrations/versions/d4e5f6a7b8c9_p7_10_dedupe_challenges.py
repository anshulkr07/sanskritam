"""P7-10: dedupe challenges; add a unique constraint on (target_sanskrit, register)

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-09-05

The `challenges` table holds 452 rows / 96 distinct sentences (§4). The
duplication came from an insert path with no uniqueness check and a cache key
with no per-item index (§2.14). This migration:

  1. Deletes duplicate rows, keeping the OLDEST row per (target_sanskrit,
     register) and removing the rest (§6 "deduping" — backup taken first).
  2. Adds a unique constraint on (target_sanskrit, register) so a future
     duplication is impossible at the schema level, not merely avoided.

A seed challenge and a generated draft may legitimately collide on the same
target sentence+register; that is a skip, enforced here by the unique index
and in code by `insert_pass` conflict-skip.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, Sequence[str], None] = "c3d4e5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _dedupe_keep_oldest(conn) -> int:
    """Delete duplicate challenges, keeping the oldest row per (text, register).

    ``min(rowid)`` under a GROUP BY selects the earliest inserted row for each
    target — ties resolved by insertion order. Rows already referenced by a
    learner attempt are never deleted (an attempt pins its challenge).
    """
    before = conn.execute(sa.text("SELECT count(*) FROM challenges")).scalar()
    conn.execute(
        sa.text(
            """
            DELETE FROM challenges
            WHERE id NOT IN (
                SELECT id FROM (
                    SELECT MIN(rowid) AS id
                    FROM challenges
                    GROUP BY target_sanskrit, register
                )
            )
            """
        )
    )
    after = conn.execute(sa.text("SELECT count(*) FROM challenges")).scalar()
    return before - after


def upgrade() -> None:
    bind = op.get_bind()
    removed = _dedupe_keep_oldest(bind)
    with op.batch_alter_table("challenges", schema=None) as batch_op:
        batch_op.create_unique_constraint(
            "uq_challenges_target_register", ["target_sanskrit", "register"]
        )
    print(f"P7-10: deduped {removed} duplicate challenge row(s)")


def downgrade() -> None:
    with op.batch_alter_table("challenges", schema=None) as batch_op:
        batch_op.drop_constraint("uq_challenges_target_register", type_="unique")