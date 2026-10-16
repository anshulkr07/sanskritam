"""Memberships, credit ledger, title rentals and monetization administration."""
from alembic import op
import sqlalchemy as sa
revision = '20261016_commerce'
down_revision = '20261016_canon_notes_text'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('commerce_payout_requests',
        sa.Column('id', sa.String(64), primary_key=True), sa.Column('learner_id', sa.String(64), nullable=False, index=True),
        sa.Column('state', sa.String(24), nullable=False), sa.Column('reward_ids', sa.JSON(), nullable=False),
        sa.Column('recipient_encrypted', sa.String(16000), nullable=False), sa.Column('fulfilment', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False))
    op.create_table('commerce_event_entries',
        sa.Column('id', sa.String(64), primary_key=True), sa.Column('event_id', sa.String(64), nullable=False, index=True),
        sa.Column('learner_id', sa.String(64), nullable=False, index=True), sa.Column('text', sa.String(12000), nullable=False),
        sa.Column('audio_key', sa.String(512)), sa.Column('score', sa.Integer()), sa.Column('state', sa.String(24), nullable=False),
        sa.Column('judging', sa.JSON(), nullable=False), sa.Column('created_at', sa.DateTime(), nullable=False))
    op.create_table('commerce_prize_cases',
        sa.Column('id', sa.String(64), primary_key=True), sa.Column('event_id', sa.String(64), nullable=False, index=True),
        sa.Column('learner_id', sa.String(64), nullable=False, index=True), sa.Column('month', sa.String(7), nullable=False),
        sa.Column('cost_inr_paise', sa.Integer(), nullable=False), sa.Column('sponsor_inr_paise', sa.Integer(), nullable=False),
        sa.Column('state', sa.String(24), nullable=False), sa.Column('details', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False))
    op.create_table('commerce_ad_grants',
        sa.Column('id', sa.String(length=64), primary_key=True, nullable=False),
        sa.Column('learner_id', sa.String(length=64), primary_key=False, nullable=False),
        sa.Column('title_id', sa.String(length=160), primary_key=False, nullable=False),
        sa.Column('kind', sa.String(length=24), primary_key=False, nullable=False),
        sa.Column('transaction_id', sa.String(length=240), primary_key=False, nullable=True),
        sa.Column('created_at', sa.DateTime(), primary_key=False, nullable=False),
        sa.Column('expires_at', sa.DateTime(), primary_key=False, nullable=False),
        sa.Column('target', sa.String(length=100), primary_key=False, nullable=False),
        sa.Column('used_units', sa.Integer(), primary_key=False, nullable=False),
        sa.UniqueConstraint('transaction_id', name=None),
    )
    op.create_index('ix_commerce_ad_grants_learner_id', 'commerce_ad_grants', ['learner_id'], unique=False)
    op.create_table('commerce_audit',
        sa.Column('id', sa.String(length=64), primary_key=True, nullable=False),
        sa.Column('actor', sa.String(length=80), primary_key=False, nullable=False),
        sa.Column('action', sa.String(length=64), primary_key=False, nullable=False),
        sa.Column('details', sa.JSON(), primary_key=False, nullable=False),
        sa.Column('created_at', sa.DateTime(), primary_key=False, nullable=False),
    )
    op.create_table('commerce_cooldowns',
        sa.Column('id', sa.String(length=64), primary_key=True, nullable=False),
        sa.Column('learner_id', sa.String(length=64), primary_key=False, nullable=False),
        sa.Column('unlock_id', sa.String(length=64), primary_key=False, nullable=False),
        sa.Column('until', sa.DateTime(), primary_key=False, nullable=False),
        sa.Column('skipped', sa.Boolean(), primary_key=False, nullable=False),
        sa.UniqueConstraint('unlock_id', name=None),
    )
    op.create_index('ix_commerce_cooldowns_learner_id', 'commerce_cooldowns', ['learner_id'], unique=False)
    op.create_table('commerce_events',
        sa.Column('id', sa.String(length=64), primary_key=True, nullable=False),
        sa.Column('organizer_id', sa.String(length=64), primary_key=False, nullable=False),
        sa.Column('state', sa.String(length=24), primary_key=False, nullable=False),
        sa.Column('hosting_purchase_id', sa.String(length=64), primary_key=False, nullable=True),
        sa.Column('details', sa.JSON(), primary_key=False, nullable=False),
        sa.Column('created_at', sa.DateTime(), primary_key=False, nullable=False),
        sa.UniqueConstraint('hosting_purchase_id', name=None),
    )
    op.create_index('ix_commerce_events_organizer_id', 'commerce_events', ['organizer_id'], unique=False)
    op.create_table('commerce_ledger',
        sa.Column('id', sa.String(length=64), primary_key=True, nullable=False),
        sa.Column('learner_id', sa.String(length=64), primary_key=False, nullable=False),
        sa.Column('key', sa.String(length=240), primary_key=False, nullable=False),
        sa.Column('amount', sa.Integer(), primary_key=False, nullable=False),
        sa.Column('kind', sa.String(length=40), primary_key=False, nullable=False),
        sa.Column('details', sa.JSON(), primary_key=False, nullable=False),
        sa.Column('created_at', sa.DateTime(), primary_key=False, nullable=False),
        sa.UniqueConstraint('key', name=None),
    )
    op.create_index('ix_commerce_ledger_learner_id', 'commerce_ledger', ['learner_id'], unique=False)
    op.create_table('commerce_memberships',
        sa.Column('id', sa.String(length=64), primary_key=True, nullable=False),
        sa.Column('learner_id', sa.String(length=64), primary_key=False, nullable=False),
        sa.Column('provider', sa.String(length=16), primary_key=False, nullable=False),
        sa.Column('original_id', sa.String(length=240), primary_key=False, nullable=False),
        sa.Column('tier', sa.String(length=16), primary_key=False, nullable=False),
        sa.Column('paid_until', sa.DateTime(), primary_key=False, nullable=False),
        sa.Column('state', sa.String(length=32), primary_key=False, nullable=False),
        sa.Column('updated_at', sa.DateTime(), primary_key=False, nullable=False),
        sa.UniqueConstraint('provider', 'original_id', name='uq_commerce_membership_origin'),
    )
    op.create_index('ix_commerce_memberships_learner_id', 'commerce_memberships', ['learner_id'], unique=False)
    op.create_table('commerce_profiles',
        sa.Column('learner_id', sa.String(length=64), primary_key=True, nullable=False),
        sa.Column('code', sa.String(length=24), primary_key=False, nullable=False),
        sa.Column('country', sa.String(length=2), primary_key=False, nullable=False),
        sa.Column('adult', sa.Boolean(), primary_key=False, nullable=False),
        sa.Column('ads_consent', sa.Boolean(), primary_key=False, nullable=False),
        sa.UniqueConstraint('code', name=None),
    )
    op.create_table('commerce_purchases',
        sa.Column('id', sa.String(length=64), primary_key=True, nullable=False),
        sa.Column('learner_id', sa.String(length=64), primary_key=False, nullable=False),
        sa.Column('provider', sa.String(length=16), primary_key=False, nullable=False),
        sa.Column('transaction_id', sa.String(length=240), primary_key=False, nullable=False),
        sa.Column('original_id', sa.String(length=240), primary_key=False, nullable=False),
        sa.Column('product_id', sa.String(length=160), primary_key=False, nullable=False),
        sa.Column('credits', sa.Integer(), primary_key=False, nullable=False),
        sa.Column('state', sa.String(length=32), primary_key=False, nullable=False),
        sa.Column('paid_at', sa.DateTime(), primary_key=False, nullable=False),
        sa.Column('currency', sa.String(length=3), primary_key=False, nullable=False),
        sa.Column('net_minor', sa.Integer(), primary_key=False, nullable=True),
        sa.Column('net_inr_paise', sa.Integer(), primary_key=False, nullable=True),
        sa.Column('evidence', sa.JSON(), primary_key=False, nullable=False),
        sa.UniqueConstraint('provider', 'transaction_id', name='uq_commerce_purchase_transaction'),
    )
    op.create_index('ix_commerce_purchases_learner_id', 'commerce_purchases', ['learner_id'], unique=False)
    op.create_table('commerce_referral_rewards',
        sa.Column('id', sa.String(length=64), primary_key=True, nullable=False),
        sa.Column('referrer_id', sa.String(length=64), primary_key=False, nullable=False),
        sa.Column('purchase_id', sa.String(length=64), primary_key=False, nullable=False),
        sa.Column('amount_minor', sa.Integer(), primary_key=False, nullable=False),
        sa.Column('inr_paise', sa.Integer(), primary_key=False, nullable=False),
        sa.Column('currency', sa.String(length=3), primary_key=False, nullable=False),
        sa.Column('available_at', sa.DateTime(), primary_key=False, nullable=False),
        sa.Column('state', sa.String(length=24), primary_key=False, nullable=False),
        sa.Column('fulfilment', sa.JSON(), primary_key=False, nullable=False),
        sa.UniqueConstraint('purchase_id', name=None),
    )
    op.create_index('ix_commerce_referral_rewards_referrer_id', 'commerce_referral_rewards', ['referrer_id'], unique=False)
    op.create_table('commerce_referrals',
        sa.Column('learner_id', sa.String(length=64), primary_key=True, nullable=False),
        sa.Column('referrer_id', sa.String(length=64), primary_key=False, nullable=False),
        sa.Column('created_at', sa.DateTime(), primary_key=False, nullable=False),
    )
    op.create_index('ix_commerce_referrals_referrer_id', 'commerce_referrals', ['referrer_id'], unique=False)
    op.create_table('commerce_reservations',
        sa.Column('id', sa.String(length=64), primary_key=True, nullable=False),
        sa.Column('learner_id', sa.String(length=64), primary_key=False, nullable=False),
        sa.Column('key', sa.String(length=240), primary_key=False, nullable=False),
        sa.Column('action', sa.String(length=48), primary_key=False, nullable=False),
        sa.Column('amount', sa.Integer(), primary_key=False, nullable=False),
        sa.Column('settled', sa.Integer(), primary_key=False, nullable=False),
        sa.Column('rate', sa.Integer(), primary_key=False, nullable=False),
        sa.Column('status', sa.String(length=16), primary_key=False, nullable=False),
        sa.Column('started', sa.Boolean(), primary_key=False, nullable=False),
        sa.Column('expires_at', sa.DateTime(), primary_key=False, nullable=False),
        sa.UniqueConstraint('key', name=None),
    )
    op.create_index('ix_commerce_reservations_learner_id', 'commerce_reservations', ['learner_id'], unique=False)
    op.create_table('commerce_settings',
        sa.Column('key', sa.String(length=100), primary_key=True, nullable=False),
        sa.Column('value', sa.JSON(), primary_key=False, nullable=False),
    )
    op.create_table('commerce_titles',
        sa.Column('id', sa.String(length=160), primary_key=True, nullable=False),
        sa.Column('slug', sa.String(length=100), primary_key=False, nullable=False),
        sa.Column('medium', sa.String(length=16), primary_key=False, nullable=False),
        sa.Column('name', sa.String(length=256), primary_key=False, nullable=False),
        sa.Column('credits', sa.Integer(), primary_key=False, nullable=False),
        sa.Column('published', sa.Boolean(), primary_key=False, nullable=False),
        sa.Column('metadata_json', sa.JSON(), primary_key=False, nullable=False),
    )
    op.create_index('ix_commerce_titles_slug', 'commerce_titles', ['slug'], unique=False)
    op.create_table('commerce_unlocks',
        sa.Column('id', sa.String(length=64), primary_key=True, nullable=False),
        sa.Column('learner_id', sa.String(length=64), primary_key=False, nullable=False),
        sa.Column('title_id', sa.String(length=160), primary_key=False, nullable=False),
        sa.Column('acquired_at', sa.DateTime(), primary_key=False, nullable=False),
        sa.Column('expires_at', sa.DateTime(), primary_key=False, nullable=False),
        sa.Column('surrendered_at', sa.DateTime(), primary_key=False, nullable=True),
        sa.Column('membership_extended', sa.Boolean(), primary_key=False, nullable=False),
    )
    op.create_index('ix_commerce_unlocks_title_id', 'commerce_unlocks', ['title_id'], unique=False)
    op.create_index('ix_commerce_unlocks_learner_id', 'commerce_unlocks', ['learner_id'], unique=False)
    op.create_table('commerce_wallets',
        sa.Column('learner_id', sa.String(length=64), primary_key=True, nullable=False),
        sa.Column('balance', sa.Integer(), primary_key=False, nullable=False),
        sa.Column('reserved', sa.Integer(), primary_key=False, nullable=False),
        sa.Column('voice_milliseconds', sa.Integer(), primary_key=False, nullable=False),
        sa.Column('version', sa.Integer(), primary_key=False, nullable=False),
    )

def downgrade():
    op.drop_table('commerce_prize_cases')
    op.drop_table('commerce_event_entries')
    op.drop_table('commerce_payout_requests')
    op.drop_table('commerce_wallets')
    op.drop_table('commerce_unlocks')
    op.drop_table('commerce_titles')
    op.drop_table('commerce_settings')
    op.drop_table('commerce_reservations')
    op.drop_table('commerce_referrals')
    op.drop_table('commerce_referral_rewards')
    op.drop_table('commerce_purchases')
    op.drop_table('commerce_profiles')
    op.drop_table('commerce_memberships')
    op.drop_table('commerce_ledger')
    op.drop_table('commerce_events')
    op.drop_table('commerce_cooldowns')
    op.drop_table('commerce_audit')
    op.drop_table('commerce_ad_grants')
