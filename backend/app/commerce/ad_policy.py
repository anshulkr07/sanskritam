"""Who sees ads: everyone on the free tier.

There is no age question and no opt-in: a reason to claim to be under 18 would
be a way to skip ads. Instead every request is the safe kind for any age
(non-personalized, G-rated; see mobile/src/services/ads.native.ts). Paying
members never see ads, and an owned edition has none. A text whose licence
forbids commercial use (commerce/licensing.py) has no ad pages or player ads.
"""
from app.config import settings
from app.commerce import hybrid, service as svc


def eligibility(db, learner_id, title_id=""):
    on = settings.commerce_ads_enabled
    # Memberships and purchases only exist once commerce is live; ads can run before it.
    member = svc.membership(db, learner_id) if on and settings.commerce_enabled else None
    owned = bool(on and title_id and hybrid.enabled() and hybrid.owns(db, learner_id, title_id))
    ad_free = bool(member or owned)
    from app.commerce.licensing import noncommercial
    licensed = not (on and title_id and noncommercial(db, title_id))
    return {"allowed": bool(on and not ad_free and licensed), "enabled": on, "ad_free": ad_free}
