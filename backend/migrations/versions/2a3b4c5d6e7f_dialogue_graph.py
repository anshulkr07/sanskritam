"""dialogue graph — scenarios, nodes, edges, escape logs

Revision ID: 2a3b4c5d6e7f
Revises: 1861932777ab
Create Date: 2026-08-29 15:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2a3b4c5d6e7f'
down_revision: Union[str, Sequence[str], None] = '1861932777ab'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add dialogue graph tables."""
    op.create_table('dialogue_scenarios',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('title', sa.String(length=256), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('register', sa.String(length=16), nullable=True),
        sa.Column('entry_node_id', sa.String(length=64), nullable=True),
        sa.Column('min_ratio', sa.Float(), nullable=True),
        sa.Column('max_ratio', sa.Float(), nullable=True),
        sa.Column('est_minutes', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('dialogue_scenarios', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_dialogue_scenarios_register'), ['register'], unique=False)

    op.create_table('dialogue_nodes',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('scenario_id', sa.String(length=64), nullable=False),
        sa.Column('kind', sa.String(length=16), nullable=False),
        sa.Column('repair_type', sa.String(length=16), nullable=True),
        sa.Column('lang', sa.String(length=8), nullable=False),
        sa.Column('devanagari', sa.Text(), nullable=False),
        sa.Column('iast', sa.Text(), nullable=True),
        sa.Column('gloss', sa.Text(), nullable=True),
        sa.Column('audio_url', sa.String(length=512), nullable=True),
        sa.Column('ratio_band_min', sa.Float(), nullable=True),
        sa.Column('ratio_band_max', sa.Float(), nullable=True),
        sa.Column('sort', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['scenario_id'], ['dialogue_scenarios.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('dialogue_nodes', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_dialogue_nodes_scenario_id'), ['scenario_id'], unique=False)

    op.create_table('dialogue_edges',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('scenario_id', sa.String(length=64), nullable=False),
        sa.Column('from_node_id', sa.String(length=64), nullable=False),
        sa.Column('to_node_id', sa.String(length=64), nullable=True),
        sa.Column('lang', sa.String(length=8), nullable=False),
        sa.Column('expected_text', sa.Text(), nullable=True),
        sa.Column('accepted_parses', sa.JSON(), nullable=True),
        sa.Column('expected_phrases', sa.JSON(), nullable=True),
        sa.Column('features', sa.JSON(), nullable=True),
        sa.Column('rank', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['scenario_id'], ['dialogue_scenarios.id'], ),
        sa.ForeignKeyConstraint(['from_node_id'], ['dialogue_nodes.id'], ),
        sa.ForeignKeyConstraint(['to_node_id'], ['dialogue_nodes.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('dialogue_edges', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_dialogue_edges_from_node_id'), ['from_node_id'], unique=False)

    op.create_table('escape_logs',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('learner_id', sa.String(length=64), nullable=True),
        sa.Column('scenario_id', sa.String(length=64), nullable=False),
        sa.Column('node_id', sa.String(length=64), nullable=False),
        sa.Column('transcript', sa.Text(), nullable=True),
        sa.Column('parsed_features', sa.JSON(), nullable=True),
        sa.Column('verdict', sa.String(length=16), nullable=False),
        sa.Column('ts', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['learner_id'], ['learners.id'], ),
        sa.ForeignKeyConstraint(['scenario_id'], ['dialogue_scenarios.id'], ),
        sa.ForeignKeyConstraint(['node_id'], ['dialogue_nodes.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('escape_logs', schema=None) as batch_op:
        batch_op.create_index(
            batch_op.f('ix_escape_logs_scenario_node'),
            ['scenario_id', 'node_id'],
            unique=False,
        )


def downgrade() -> None:
    """Drop all dialogue graph tables."""
    with op.batch_alter_table('escape_logs', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_escape_logs_scenario_node'))
    op.drop_table('escape_logs')
    with op.batch_alter_table('dialogue_edges', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_dialogue_edges_from_node_id'))
    op.drop_table('dialogue_edges')
    with op.batch_alter_table('dialogue_nodes', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_dialogue_nodes_scenario_id'))
    op.drop_table('dialogue_nodes')
    with op.batch_alter_table('dialogue_scenarios', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_dialogue_scenarios_register'))
    op.drop_table('dialogue_scenarios')