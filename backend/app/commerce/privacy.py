"""Remove personal commerce data, preserving pseudonymous financial audit records."""
from app.commerce.models import (Profile, PayoutRequest, EventEntry, HostedEvent, Unlock, Cooldown,
    AdGrant, Reservation, Wallet, Referral, Membership, PrizeCase, ReferralReward)


def delete_personal_data(db, learner_id):
    from app.services.storage import get_storage
    entries = db.query(EventEntry).filter_by(learner_id=learner_id).all()
    for entry in entries:
        if entry.audio_key:
            try:
                get_storage().delete_private(entry.audio_key)
            except Exception:
                # Keep only a private deletion key, not a user profile or recording URL.
                from app.commerce.models import Setting
                db.merge(Setting(key="private_cleanup:" + entry.id, value={"key": entry.audio_key}))
    db.query(EventEntry).filter_by(learner_id=learner_id).delete()
    for model in (Profile, PayoutRequest, Unlock, Cooldown, AdGrant, Reservation, Wallet):
        db.query(model).filter_by(learner_id=learner_id).delete()
    db.query(Referral).filter((Referral.learner_id == learner_id) | (Referral.referrer_id == learner_id)).delete(synchronize_session=False)
    for member in db.query(Membership).filter_by(learner_id=learner_id):
        member.state = "deleted"
    for event in db.query(HostedEvent).filter_by(organizer_id=learner_id):
        event.state = "cancelled"
        event.details = {"title": "Deleted organizer", "entry_fee": 0}
    for prize in db.query(PrizeCase).filter_by(learner_id=learner_id):
        prize.details = {"recipient_deleted": True}
    for reward in db.query(ReferralReward).filter_by(referrer_id=learner_id):
        reward.fulfilment = {"recipient_deleted": True}
