"""Shared eligibility for the opt-in mobile advertising surfaces."""
from app.config import settings
from app.commerce import service as svc, hybrid
from app.commerce.models import Profile


def eligibility(db, learner_id, title_id=""):
    profile = db.get(Profile, learner_id)
    member = svc.membership(db, learner_id)
    owned = bool(title_id and hybrid.enabled() and hybrid.owns(db, learner_id, title_id))
    allowed = bool(settings.commerce_ads_enabled and not member and not owned and
                   profile and profile.adult and profile.ads_consent)
    return {"allowed": allowed, "enabled": settings.commerce_ads_enabled,
            "adult": bool(profile and profile.adult), "opted_in": bool(profile and profile.ads_consent),
            "ad_free": bool(member or owned)}
