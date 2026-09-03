"""conversation_turns + session mode; current_node_id nullable

The conversation runtime moves from edge-matching to a live Sarvam turn gated
by Vidyut, so a session no longer has a position in the dialogue graph (the
scenario stays: it supplies the situation and the target features). The graph
runtime remains for mode="graph" sessions.

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-09-02

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "conversation_turns",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("session_id", sa.String(length=64), nullable=False),
        sa.Column("idx", sa.Integer(), nullable=False),
        sa.Column("role", sa.String(length=16), nullable=False),
        sa.Column("devanagari", sa.Text(), nullable=True),
        sa.Column("iast", sa.Text(), nullable=True),
        sa.Column("gloss", sa.Text(), nullable=True),
        sa.Column("correction", sa.Text(), nullable=True),
        sa.Column("parsed_features", sa.JSON(), nullable=True),
        sa.Column("verdict", sa.String(length=24), nullable=True),
        sa.Column("ts", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["session_id"], ["conversation_sessions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_conversation_turns_session_id"),
        "conversation_turns",
        ["session_id"],
        unique=False,
    )

    with op.batch_alter_table("conversation_sessions", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "mode",
                sa.String(length=8),
                nullable=False,
                server_default="llm",
            )
        )
        # Free-form sessions have no node. batch_alter_table rebuilds the
        # table on SQLite, which is what lets the NOT NULL be dropped at all.
        batch_op.alter_column(
            "current_node_id",
            existing_type=sa.String(length=64),
            nullable=True,
        )


def downgrade() -> None:
    # Sessions with no node cannot exist under the restored NOT NULL.
    op.execute("DELETE FROM conversation_sessions WHERE current_node_id IS NULL")
    with op.batch_alter_table("conversation_sessions", schema=None) as batch_op:
        batch_op.alter_column(
            "current_node_id",
            existing_type=sa.String(length=64),
            nullable=False,
        )
        batch_op.drop_column("mode")

    op.drop_index(
        op.f("ix_conversation_turns_session_id"), table_name="conversation_turns"
    )
    op.drop_table("conversation_turns")
