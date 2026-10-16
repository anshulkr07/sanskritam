"""Commerce records. Currency amounts are integer minor units; credits are integers."""
import uuid
from datetime import datetime

from sqlalchemy import Column, String, Integer, DateTime, JSON, Boolean, UniqueConstraint
from app.db import Base


def uid():
    return uuid.uuid4().hex


class Wallet(Base):
    __tablename__ = "commerce_wallets"
    learner_id = Column(String(64), primary_key=True)
    balance = Column(Integer, nullable=False, default=0)
    reserved = Column(Integer, nullable=False, default=0)
    voice_milliseconds = Column(Integer, nullable=False, default=0)
    version = Column(Integer, nullable=False, default=0)


class Ledger(Base):
    __tablename__ = "commerce_ledger"
    id = Column(String(64), primary_key=True, default=uid)
    learner_id = Column(String(64), nullable=False, index=True)
    key = Column(String(240), nullable=False, unique=True)
    amount = Column(Integer, nullable=False)
    kind = Column(String(40), nullable=False)
    details = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class Membership(Base):
    __tablename__ = "commerce_memberships"
    id = Column(String(64), primary_key=True, default=uid)
    learner_id = Column(String(64), nullable=False, index=True)
    provider = Column(String(16), nullable=False)
    original_id = Column(String(240), nullable=False)
    tier = Column(String(16), nullable=False)
    paid_until = Column(DateTime, nullable=False)
    state = Column(String(32), nullable=False, default="active")
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    __table_args__ = (UniqueConstraint("provider", "original_id", name="uq_commerce_membership_origin"),)


class Purchase(Base):
    __tablename__ = "commerce_purchases"
    id = Column(String(64), primary_key=True, default=uid)
    learner_id = Column(String(64), nullable=False, index=True)
    provider = Column(String(16), nullable=False)
    transaction_id = Column(String(240), nullable=False)
    original_id = Column(String(240), nullable=False)
    product_id = Column(String(160), nullable=False)
    credits = Column(Integer, nullable=False, default=0)
    state = Column(String(32), nullable=False, default="paid")
    paid_at = Column(DateTime, nullable=False)
    currency = Column(String(3), nullable=False, default="INR")
    net_minor = Column(Integer, nullable=True)
    net_inr_paise = Column(Integer, nullable=True)
    evidence = Column(JSON, nullable=False, default=dict)
    __table_args__ = (UniqueConstraint("provider", "transaction_id", name="uq_commerce_purchase_transaction"),)


class Title(Base):
    __tablename__ = "commerce_titles"
    id = Column(String(160), primary_key=True)
    slug = Column(String(100), nullable=False, index=True)
    medium = Column(String(16), nullable=False)
    name = Column(String(256), nullable=False)
    credits = Column(Integer, nullable=False)
    published = Column(Boolean, nullable=False, default=False)
    metadata_json = Column(JSON, nullable=False, default=dict)


class Unlock(Base):
    __tablename__ = "commerce_unlocks"
    id = Column(String(64), primary_key=True, default=uid)
    learner_id = Column(String(64), nullable=False, index=True)
    title_id = Column(String(160), nullable=False, index=True)
    acquired_at = Column(DateTime, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    surrendered_at = Column(DateTime, nullable=True)
    membership_extended = Column(Boolean, nullable=False, default=False)


class Cooldown(Base):
    __tablename__ = "commerce_cooldowns"
    id = Column(String(64), primary_key=True, default=uid)
    learner_id = Column(String(64), nullable=False, index=True)
    unlock_id = Column(String(64), nullable=False, unique=True)
    until = Column(DateTime, nullable=False)
    skipped = Column(Boolean, nullable=False, default=False)


class Reservation(Base):
    __tablename__ = "commerce_reservations"
    id = Column(String(64), primary_key=True, default=uid)
    learner_id = Column(String(64), nullable=False, index=True)
    key = Column(String(240), nullable=False, unique=True)
    action = Column(String(48), nullable=False)
    amount = Column(Integer, nullable=False)
    settled = Column(Integer, nullable=False, default=0)
    rate = Column(Integer, nullable=False)
    status = Column(String(16), nullable=False, default="open")
    started = Column(Boolean, nullable=False, default=False)
    expires_at = Column(DateTime, nullable=False)


class Profile(Base):
    __tablename__ = "commerce_profiles"
    learner_id = Column(String(64), primary_key=True)
    code = Column(String(24), nullable=False, unique=True, default=lambda: uid()[:12])
    country = Column(String(2), nullable=False, default="")
    adult = Column(Boolean, nullable=False, default=False)
    ads_consent = Column(Boolean, nullable=False, default=False)


class Referral(Base):
    __tablename__ = "commerce_referrals"
    learner_id = Column(String(64), primary_key=True)
    referrer_id = Column(String(64), nullable=False, index=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class ReferralReward(Base):
    __tablename__ = "commerce_referral_rewards"
    id = Column(String(64), primary_key=True, default=uid)
    referrer_id = Column(String(64), nullable=False, index=True)
    purchase_id = Column(String(64), nullable=False, unique=True)
    amount_minor = Column(Integer, nullable=False)
    inr_paise = Column(Integer, nullable=False)
    currency = Column(String(3), nullable=False)
    available_at = Column(DateTime, nullable=False)
    state = Column(String(24), nullable=False, default="pending")
    fulfilment = Column(JSON, nullable=False, default=dict)


class AdGrant(Base):
    __tablename__ = "commerce_ad_grants"
    id = Column(String(64), primary_key=True, default=uid)
    learner_id = Column(String(64), nullable=False, index=True)
    title_id = Column(String(160), nullable=False)
    kind = Column(String(24), nullable=False)
    transaction_id = Column(String(240), nullable=True, unique=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    target = Column(String(100), nullable=False, default="")
    used_units = Column(Integer, nullable=False, default=0)


class HostedEvent(Base):
    __tablename__ = "commerce_events"
    id = Column(String(64), primary_key=True, default=uid)
    organizer_id = Column(String(64), nullable=False, index=True)
    state = Column(String(24), nullable=False, default="draft")
    hosting_purchase_id = Column(String(64), nullable=True, unique=True)
    details = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class Setting(Base):
    __tablename__ = "commerce_settings"
    key = Column(String(100), primary_key=True)
    value = Column(JSON, nullable=False)


class Audit(Base):
    __tablename__ = "commerce_audit"
    id = Column(String(64), primary_key=True, default=uid)
    actor = Column(String(80), nullable=False)
    action = Column(String(64), nullable=False)
    details = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class PayoutRequest(Base):
    __tablename__ = "commerce_payout_requests"
    id = Column(String(64), primary_key=True, default=uid)
    learner_id = Column(String(64), nullable=False, index=True)
    state = Column(String(24), nullable=False, default="requested")
    reward_ids = Column(JSON, nullable=False, default=list)
    recipient_encrypted = Column(String(16000), nullable=False)
    fulfilment = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class EventEntry(Base):
    __tablename__ = "commerce_event_entries"
    id = Column(String(64), primary_key=True, default=uid)
    event_id = Column(String(64), nullable=False, index=True)
    learner_id = Column(String(64), nullable=False, index=True)
    text = Column(String(12000), nullable=False, default="")
    audio_key = Column(String(512), nullable=True)
    score = Column(Integer, nullable=True)
    state = Column(String(24), nullable=False, default="submitted")
    judging = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class PrizeCase(Base):
    __tablename__ = "commerce_prize_cases"
    id = Column(String(64), primary_key=True, default=uid)
    event_id = Column(String(64), nullable=False, index=True)
    learner_id = Column(String(64), nullable=False, index=True)
    month = Column(String(7), nullable=False)
    cost_inr_paise = Column(Integer, nullable=False)
    sponsor_inr_paise = Column(Integer, nullable=False, default=0)
    state = Column(String(24), nullable=False, default="review")
    details = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
