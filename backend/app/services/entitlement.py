"""Entitlement plumbing (P14-1) + what is never gated (P14-2).

Owner-gated in every particular: prices, tiers, free limits, trial length and
store accounts are all owner decisions (§6). What is safe to specify — and
what this module implements — is the PLUMBING:

- One ``Entitlement`` per learner: tier, source, validity window.
- A single ``has_entitlement(learner, feature)`` seam every gated path calls.
  Routers never scatter tier checks.
- Fail closed on vendor errors, fail OPEN on our own outages: a
  store-verification timeout must not lock a paying learner out mid-session.

P14-2 (product invariant): no hearts, no energy, no meter that ever stops a
willing learner. The free tier must never make a motivated learner WAIT. Also
never gated: the daily word (the acquisition loop), and the abstention
behaviour (§2.2 is a safety rule, not a feature).

Until a store is wired (owner decision), every learner is effectively free and
everything currently free stays free: ``has_entitlement`` returns True for all
``ALWAYS_FREE`` features on every tier, and the only False answers are for
explicitly premium future surfaces (open conversation). That means adding this
module changes NO current behaviour — verified by tests.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import Entitlement, Learner

# Surfaces that are NEVER gated, on any tier (P14-2). Anything not in
# PREMIUM_FEATURES is free: the default is open, the gate list is explicit.
ALWAYS_FREE = frozenset({
    "challenge",      # the core loop — gating it breaks the product
    "attempt",        # grading — §2.2 is a safety rule, not a feature
    "daily_word",     # the acquisition loop — gating it breaks acquisition
    "shloka",         # daily verse
    "varnamala",      # entry surface, offline-capable
    "grammar",        # reference: derivation, scansion, sandhi, paradigm
    "pronunciation",  # entry-surface practice
    "writing",        # script on-ramp
    "reader",         # reference posture (U13-3: no verdict, no score)
    "conversation_graph",  # guided conversation — the free tier (§12)
    "explain",        # ask-anywhere help
    "lessons",        # curriculum lessons
    "vocab",          # vocabulary lists
})

# Explicitly premium future surfaces. Only these may ever answer False, and
# only for the free tier. Open conversation is the metered tier (§12).
PREMIUM_FEATURES = frozenset({
    "conversation_open",  # free-form talk with live synthesis — metered, premium
})

VALID_TIERS = frozenset({"free", "plus", "institutional"})
VALID_SOURCES = frozenset({"none", "store", "promo", "institution"})


def get_entitlement(db: Session, learner: Learner) -> Entitlement | None:
    """Read the learner's entitlement row. None = never provisioned = free."""
    try:
        return db.query(Entitlement).filter(Entitlement.learner_id == learner.id).first()
    except Exception:
        # Our own outage: fail OPEN (P14-1). A DB error here must not lock a
        # paying learner out mid-session — callers treat None as free anyway,
        # so swallow and let has_entitlement default open.
        return None


def _tier_of(ent: Entitlement | None) -> str:
    if ent is None:
        return "free"
    tier = (ent.tier or "free").lower()
    if tier not in VALID_TIERS:
        return "free"
    # Expired paid tier degrades to free rather than erroring mid-session.
    try:
        if tier != "free" and ent.valid_until is not None:
            until = ent.valid_until
            if until.tzinfo is None:
                until = until.replace(tzinfo=timezone.utc)
            if until < datetime.now(timezone.utc):
                return "free"
    except Exception:
        return "free"
    return tier


def has_entitlement(learner: Learner, feature: str, db: Session | None = None) -> bool:
    """THE seam (P14-1). Every gated path calls this; nothing else checks tiers.

    - ``feature`` in ALWAYS_FREE (or anything not premium): always True.
    - ``conversation_open``: True for plus/institutional with a live window,
      False for free. Vendor-verification errors fail CLOSED (False); our own
      outages (db=None/unreadable) fail OPEN for free surfaces and CLOSED for
      premium — a store timeout must not lock a payer out, and must not let a
      free rider in either. In practice: without a store wired, premium is
      free-tier False, everything else True.
    """
    feat = (feature or "").lower()
    if feat in ALWAYS_FREE or feat not in PREMIUM_FEATURES:
        return True
    if db is None:
        # Cannot verify: fail closed on the premium surface (do not grant what
        # was never paid for), open on everything else (handled above).
        return False
    try:
        ent = get_entitlement(db, learner)
    except Exception:
        return False  # vendor-shaped error: fail closed
    return _tier_of(ent) in ("plus", "institutional")


def provision(
    db: Session,
    learner: Learner,
    tier: str,
    source: str,
    valid_until=None,
) -> Entitlement:
    """Create or replace the learner's entitlement (server-side only).

    NEVER called from a client claim: the client asserts a receipt, the server
    verifies it — and verification vendors are owner-gated, so today the only
    legitimate callers are tests and admin tooling. Unknown tier/source values
    degrade to free/none rather than raising mid-request.
    """
    tier = (tier or "free").lower()
    source = (source or "none").lower()
    if tier not in VALID_TIERS:
        tier = "free"
    if source not in VALID_SOURCES:
        source = "none"
    ent = db.query(Entitlement).filter(Entitlement.learner_id == learner.id).first()
    if ent is None:
        ent = Entitlement(learner_id=learner.id)
        db.add(ent)
    ent.tier = tier
    ent.source = source
    ent.valid_until = valid_until
    db.commit()
    db.refresh(ent)
    return ent
