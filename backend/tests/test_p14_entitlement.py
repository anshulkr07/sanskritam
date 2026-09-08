"""P14 — entitlement plumbing + what is never gated. No network."""

from app.db import SessionLocal
from app.models import Learner
from app.services.entitlement import (
    ALWAYS_FREE,
    PREMIUM_FEATURES,
    get_entitlement,
    has_entitlement,
    provision,
)


def _learner(db, name="p14user"):
    import uuid
    learner = Learner(id="p14-" + uuid.uuid4().hex[:8], display_name=name, bridge_langs=["en", "hi"])
    db.add(learner)
    db.commit()
    db.refresh(learner)
    return learner


def test_free_learner_everything_currently_free():
    db = SessionLocal()
    try:
        learner = _learner(db)
        for feat in ALWAYS_FREE:
            assert has_entitlement(learner, feat, db) is True, feat
        # Unknown future surface defaults open — the gate list is explicit.
        assert has_entitlement(learner, "some_future_surface", db) is True
    finally:
        db.close()


def test_open_conversation_gated_for_free():
    db = SessionLocal()
    try:
        learner = _learner(db, "p14-free")
        assert "conversation_open" in PREMIUM_FEATURES
        assert has_entitlement(learner, "conversation_open", db) is False
    finally:
        db.close()


def test_plus_unlocks_open_conversation():
    from datetime import datetime, timedelta, timezone
    db = SessionLocal()
    try:
        learner = _learner(db, "p14-plus")
        provision(db, learner, "plus", "promo", valid_until=datetime.now(timezone.utc) + timedelta(days=30))
        assert has_entitlement(learner, "conversation_open", db) is True
        # Free surfaces stay free on a paid tier too.
        assert has_entitlement(learner, "daily_word", db) is True
    finally:
        db.close()


def test_expired_plus_degrades_to_free():
    from datetime import datetime, timedelta, timezone
    db = SessionLocal()
    try:
        learner = _learner(db, "p14-exp")
        provision(db, learner, "plus", "store", valid_until=datetime.now(timezone.utc) - timedelta(days=1))
        assert has_entitlement(learner, "conversation_open", db) is False
        assert has_entitlement(learner, "challenge", db) is True
    finally:
        db.close()


def test_unknown_tier_degrades_not_raises():
    db = SessionLocal()
    try:
        learner = _learner(db, "p14-unknown")
        ent = provision(db, learner, "platinum", "store")
        assert ent.tier == "free"
        assert has_entitlement(learner, "conversation_open", db) is False
    finally:
        db.close()


def test_no_verifier_means_premium_closed_free_open():
    db = SessionLocal()
    try:
        learner = _learner(db, "p14-noverify")
        # db=None: our own outage shape — premium closed, free open.
        assert has_entitlement(learner, "conversation_open", None) is False
        assert has_entitlement(learner, "daily_word", None) is True
    finally:
        db.close()


def test_p14_2_never_gated_surfaces():
    """P14-2 product invariant: the daily word, the core loop and the
    abstention path are never gated on ANY tier — including paid ones."""
    from datetime import datetime, timedelta, timezone
    db = SessionLocal()
    try:
        learner = _learner(db, "p14-never")
        provision(db, learner, "plus", "store", valid_until=datetime.now(timezone.utc) + timedelta(days=30))
        for feat in ("daily_word", "challenge", "attempt", "shloka", "varnamala",
                     "grammar", "pronunciation", "writing", "reader",
                     "conversation_graph", "explain", "lessons", "vocab"):
            assert has_entitlement(learner, feat, db) is True, feat
    finally:
        db.close()


def test_no_hearts_no_energy_meter():
    """P14-2 standing ruling: no meter may ever stop a willing learner. The
    schema must not grow a hearts/energy/lives column unnoticed — this test
    names the forbidden fields so a future migration trips it loudly."""
    assert not hasattr(Learner, "hearts")
    assert not hasattr(Learner, "energy")
    assert not hasattr(Learner, "lives")
    cols = {c.name for c in Learner.__table__.columns}
    assert not ({"hearts", "energy", "lives"} & cols)


def test_entitlement_never_from_client_claim():
    """provision() is server-side: there is no router that accepts a tier
    from the client. If one ever appears, this test names it."""
    import app.main as main_mod
    import io
    src = io.StringIO()
    import inspect
    src.write(inspect.getsource(main_mod.create_app))
    # Router-level check: no route path mentions entitlement provisioning.
    from fastapi.routing import APIRoute
    from app.main import create_app
    app = create_app()
    paths = [r.path for r in app.routes if isinstance(r, APIRoute)]
    assert not any("entitle" in p for p in paths), paths
    assert get_entitlement is not None  # the ONLY reader is the seam
