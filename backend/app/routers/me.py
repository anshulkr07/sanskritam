"""Learner profile endpoints: GET /me, PATCH /me, DELETE /me."""

from fastapi import APIRouter, Depends, UploadFile, File, Response
from starlette.concurrency import run_in_threadpool
from datetime import datetime, timedelta
import uuid
from sqlalchemy.orm import Session

from app.auth import require_learner
from app.db import get_db
from app.models import Learner
from app.schemas import MeResponse, UpdateMeRequest, LearnerProfile
from pydantic import BaseModel, Field
from fastapi import HTTPException
from app.services import learning_state
from app.services import profile_photos as photos
from app.services.storage import get_storage, PrivateStorageOff

router = APIRouter()


class LinkIdentityBody(BaseModel):
    id_token: str = Field(min_length=20, max_length=16000)


@router.post("/me/link/{provider}", response_model=MeResponse)
async def link_identity(provider: str, body: LinkIdentityBody,
                        learner=Depends(require_learner), db: Session = Depends(get_db)):
    from app.config import settings
    from app.routers.auth_router import _verify_google_id_token, _verify_apple_id_token
    from sqlalchemy.exc import IntegrityError
    if provider not in ("google", "apple"):
        raise HTTPException(404, "Sign-in provider not found.")
    if learner.community_suspended:
        raise HTTPException(403, "Community access is suspended. Contact support for a review.")
    audience = settings.google_client_id if provider == "google" else settings.apple_client_id
    if not audience:
        raise HTTPException(503, "Account sign-in is unavailable. Try later.")
    verify = _verify_google_id_token if provider == "google" else _verify_apple_id_token
    claims = await run_in_threadpool(verify, body.id_token, audience)
    if not claims or not claims.get("sub"):
        raise HTTPException(401, "Could not verify the sign-in token.")
    field = f"{provider}_sub"
    learner = db.query(Learner).filter_by(id=learner.id).with_for_update().populate_existing().one()
    if learner.community_suspended:
        raise HTTPException(403, "Community access is suspended. Contact support for a review.")
    old_sub = getattr(learner, field)
    if old_sub and old_sub != claims["sub"]:
        raise HTTPException(409, "This learner is already linked to another account.")
    existing = db.query(Learner).filter(getattr(Learner, field) == claims["sub"]).first()
    if existing and existing.id != learner.id:
        raise HTTPException(409, "This account already has a Sanskritam profile. Sign out in Settings and sign in to that account. These profiles cannot be merged automatically.")
    setattr(learner, field, claims["sub"])
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "This sign-in account is already linked to a learner.")
    return MeResponse(learner=_profile(learner), model=_model(learner))


class StateEntry(BaseModel):
    value: str = Field(max_length=32000)
    updated_ms: int = Field(ge=0)


class LearningStateRequest(BaseModel):
    entries: dict[str, StateEntry] = Field(default_factory=dict, max_length=2500)


@router.get("/me/learning-state")
def get_learning_state(learner: Learner = Depends(require_learner)):
    return {"entries": learner.learning_state or {}}


@router.put("/me/learning-state")
def save_learning_state(req: LearningStateRequest,
                        learner: Learner = Depends(require_learner),
                        db: Session = Depends(get_db)):
    # Serialize updates to the same learner across devices on PostgreSQL.
    current = db.query(Learner).filter(Learner.id == learner.id).with_for_update().populate_existing().one()
    try:
        current.learning_state = learning_state.merge(current.learning_state,
            {key: value.model_dump() for key, value in req.entries.items()})
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    db.commit()
    return {"entries": current.learning_state}


def _profile(learner: Learner) -> LearnerProfile:
    effective = learner.sanskrit_ratio if learner.sanskrit_ratio is not None else 0.3
    setting = learner.sanskrit_ratio_setting
    if setting is None:
        # Legacy rows predate the ceiling column: the effective value IS the ceiling.
        setting = effective
    return LearnerProfile(
        id=learner.id,
        avatar_url=photos.avatar_url(learner),
        community_verified=photos.verified(learner),
        community_suspended=bool(learner.community_suspended),
        display_name=learner.display_name,
        bridge_langs=learner.bridge_langs or [],
        sanskrit_ratio=effective,
        sanskrit_ratio_setting=setting,
        script_ratio=learner.script_ratio if learner.script_ratio is not None else 0.3,
        feature_mastery=learner.feature_mastery or {},
        streak=learner.streak or 0,
        voice_minutes_used=learner.voice_minutes_used or 0.0,
        timezone=learner.timezone or "UTC",
    )


def _model(learner: Learner) -> dict:
    effective = learner.sanskrit_ratio if learner.sanskrit_ratio is not None else 0.3
    setting = learner.sanskrit_ratio_setting
    if setting is None:
        setting = effective
    return {
        "sanskrit_ratio": effective,
        "sanskrit_ratio_setting": setting,
        "script_ratio": learner.script_ratio if learner.script_ratio is not None else 0.3,
        "feature_mastery": learner.feature_mastery or {},
        "streak": learner.streak or 0,
        "bridge_langs": learner.bridge_langs or [],
    }


@router.get("/me", response_model=MeResponse)
def get_me(learner: Learner = Depends(require_learner), db: Session = Depends(get_db)):
    """Get current learner profile + adaptive model state."""
    return MeResponse(learner=_profile(learner), model=_model(learner))


@router.post("/me/photo", response_model=MeResponse)
async def upload_profile_photo(file: UploadFile = File(...),
                               learner=Depends(require_learner), db: Session = Depends(get_db)):
    photos.require_community_identity(learner)
    if learner.avatar_updated_at and learner.avatar_updated_at > datetime.utcnow() - timedelta(minutes=1):
        raise HTTPException(429, "Wait a minute before changing your picture again.")
    data = await file.read(512 * 1024 + 1)
    if not data or len(data) > 512 * 1024:
        raise HTTPException(413, "Choose a profile picture under 512 KB.")
    data = await run_in_threadpool(photos.normalize_image, data, (file.content_type or "").split(";")[0])
    await photos.screen_image(db, learner, data)
    # Re-check under a row lock after the remote moderation call: concurrent
    # uploads must not overwrite each other or bypass a moderator suspension.
    learner = db.query(Learner).filter_by(id=learner.id).with_for_update().populate_existing().one()
    photos.require_community_identity(learner)
    if learner.avatar_updated_at and learner.avatar_updated_at > datetime.utcnow() - timedelta(minutes=1):
        raise HTTPException(429, "Wait a minute before changing your picture again.")
    store = get_storage()
    key = f"profile-photos/{learner.id}/{uuid.uuid4().hex}.jpg"
    try:
        await run_in_threadpool(store.store_private, data, key, "image/jpeg")
    except PrivateStorageOff:
        raise HTTPException(503, "Photo storage is unavailable. Try again later.")
    old_key = learner.avatar_key
    learner.avatar_key, learner.avatar_updated_at = key, datetime.utcnow()
    from app.routers.community import notify
    notify(db)
    try:
        db.commit()
    except Exception:
        db.rollback()
        await run_in_threadpool(store.delete_private, key)
        raise
    if old_key:
        try:
            await run_in_threadpool(store.delete_private, old_key)
        except Exception:
            pass  # It is no longer reachable through the authenticated endpoint.
    return MeResponse(learner=_profile(learner), model=_model(learner))


@router.delete("/me/photo", response_model=MeResponse)
def remove_profile_photo(learner=Depends(require_learner), db: Session = Depends(get_db)):
    learner = db.query(Learner).filter_by(id=learner.id).with_for_update().populate_existing().one()
    key, learner.avatar_key = learner.avatar_key, None
    from app.routers.community import notify
    notify(db)
    db.commit()
    if key:
        try:
            get_storage().delete_private(key)
        except Exception:
            pass
    return MeResponse(learner=_profile(learner), model=_model(learner))


@router.get("/people/{uid}/photo/{version}")
@router.get("/people/{uid}/photo")
def profile_photo(uid: str, version: str | None = None, learner=Depends(require_learner), db: Session = Depends(get_db)):
    from app.services.play.social import _blocked
    person = db.get(Learner, uid)
    if not person or not photos.avatar_url(person) or (version and person.avatar_key.rsplit("/", 1)[-1] != version) or _blocked(db, learner.id, uid):
        raise HTTPException(404, "Profile picture not found.")
    try:
        data = get_storage().read_private(person.avatar_key)
    except Exception:
        raise HTTPException(404, "Profile picture not found.")
    return Response(data, media_type="image/jpeg", headers={"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"})


@router.patch("/me", response_model=MeResponse)
async def update_me(
    req: UpdateMeRequest,
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """Update learner profile fields.

    sanskrit_ratio is the USER's setting: it becomes the ceiling the adaptive
    system's drift cannot exceed. The effective ratio is clamped to it
    immediately (drift may lower it below the ceiling; a user raise takes
    effect at once, a user lower clamps the effective value down).
    """
    if req.script_ratio is not None:
        learner.script_ratio = max(0.0, min(1.0, req.script_ratio))
    if req.sanskrit_ratio is not None:
        setting = max(0.0, min(1.0, req.sanskrit_ratio))
        learner.sanskrit_ratio_setting = setting
        if (learner.sanskrit_ratio or 0.0) > setting:
            learner.sanskrit_ratio = setting
    if req.bridge_langs is not None:
        learner.bridge_langs = req.bridge_langs
    if req.display_name is not None:
        learner.display_name = req.display_name
    if req.timezone is not None:
        # Store whatever the client sends; localtime.resolve_tz degrades an
        # unknown key to UTC at read time rather than rejecting it here, so a
        # device with an exotic tz database can still sync its profile.
        learner.timezone = req.timezone.strip() or "UTC"
    db.commit()
    db.refresh(learner)

    return MeResponse(learner=_profile(learner), model=_model(learner))


def learner_owned_models() -> tuple:
    """Every model whose rows belong to one learner and go with the account.

    tests/test_account_deletion.py fails when a model gains a ``learners.id``
    foreign key without being listed here. Postgres enforces those keys, so a
    missed table does not quietly leave rows behind — it turns account
    deletion into a 500, and Google Play requires deletion to work in-app.
    """
    from app.models import (
        Attempt, Block, Certificate, CompetitionEntry, ContentReport, ConversationSession,
        DailyActivity, DailyGamePoints, DailyWordPlay, Entitlement, FriendGoal, FriendGoalRound,
        GameDayScore, GameResult, GameSession, LearnerPublic, LeaderboardSnapshot, LiveMatch,
        MatchParticipant, MatchQueueEntry, MatchTicket, MonthlyWinner, NotificationSend,
        PronunciationAttempt, PushToken, ReciteAttempt, ReviewItem, ShareLink, Token,
        UsageEvent, WritingAttempt, CosmeticGrant, Friendship, ReciteCalibration,
    )

    from app.community_models import CommunityProfile, CommunityConversation, CommunityMember, CommunityMessage, CommunityMedia, CommunityRoom, CommunityEvent, CommunityTicket

    return (
        CommunityProfile, CommunityConversation, CommunityMember, CommunityMessage, CommunityMedia, CommunityRoom, CommunityEvent, CommunityTicket,
        UsageEvent, Token, Attempt, PronunciationAttempt, WritingAttempt,
        ConversationSession, DailyActivity, DailyWordPlay, PushToken,
        NotificationSend, Entitlement, ReviewItem, ContentReport, GameResult,
        ReciteAttempt, CompetitionEntry, LearnerPublic, Certificate, MonthlyWinner,
        # Play v2 (handover_games_daily_multiplayer): games, matches, social,
        # sharing and cosmetics all go with the account. FriendGoal has no
        # learner_id column (learner_a/learner_b pair) — delete_me removes it
        # explicitly after the rounds are gone.
        GameSession, GameDayScore, DailyGamePoints, LeaderboardSnapshot,
        MatchTicket, MatchParticipant, MatchQueueEntry, FriendGoalRound,
        CosmeticGrant, ShareLink, Friendship, Block, FriendGoal, ReciteCalibration,
    )


@router.delete("/me", status_code=204)
def delete_me(
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """Hard-delete the current learner and everything they own.

    - Conversation turns go first: they reference sessions, not the learner.
    - Every model in ``learner_owned_models()`` is deleted.
    - EscapeLog.learner_id is set to NULL (aggregate metrics survive).
    - The learner row itself is hard-deleted.

    Plain ``def``, not ``async``: ~15 statements at ~140 ms each in production
    would otherwise block the single event loop for every other learner.
    """
    import sqlalchemy as sa
    from app.models import ConversationSession, ConversationTurn
    from app.services.quota import retain_deleted_spend
    retain_deleted_spend(db, learner.id)

    # Nullify escape log references first (aggregate metrics are about content)
    db.execute(
        sa.text("UPDATE escape_logs SET learner_id = NULL WHERE learner_id = :lid"),
        {"lid": learner.id},
    )

    session_ids = sa.select(ConversationSession.id).where(ConversationSession.learner_id == learner.id)
    db.query(ConversationTurn).filter(ConversationTurn.session_id.in_(session_ids)).delete()
    # Delete private competition audio before rows go away.
    try:
        from app.models import CompetitionEntry
        from app.services.storage import get_storage
        _store = get_storage()
        if learner.avatar_key:
            try:
                _store.delete_private(learner.avatar_key)
            except Exception:
                pass
        from app.services.competition_sets import entry_audio_keys
        for entry in db.query(CompetitionEntry).filter(
                CompetitionEntry.learner_id == learner.id).all():
            for k in entry_audio_keys(entry):
                try:
                    _store.delete_private(k)
                except Exception:
                    pass
    except Exception:
        pass
    for model in learner_owned_models():
        if not hasattr(model, "learner_id"):
            continue  # paired-row tables (FriendGoal) handled below
        db.query(model).filter(model.learner_id == learner.id).delete()

    # Play v2 edges where the learner is not the row owner: friendships and
    # blocks pointed at them, and cooperative goals they are a pair of
    # (rounds were already deleted above, so the goals can go).
    from app.models import Block, FriendGoal, Friendship, LiveMatch
    db.query(Friendship).filter(Friendship.friend_id == learner.id).delete()
    db.query(Block).filter(Block.blocked_id == learner.id).delete()
    db.query(FriendGoal).filter(
        (FriendGoal.learner_a == learner.id) | (FriendGoal.learner_b == learner.id)
    ).delete(synchronize_session=False)
    # Empty quick-match rooms they hosted, and seats in live matches.
    db.query(LiveMatch).filter(LiveMatch.host_id == learner.id,
                               LiveMatch.status == "lobby").delete(synchronize_session=False)

    from app.services.community_lifecycle import delete_account
    delete_account(db, learner.id)

    # Finally delete the learner itself
    from app.commerce.privacy import delete_personal_data
    delete_personal_data(db, learner.id)
    db.delete(learner)
    db.commit()

    # Local deletion is durable even while a provider is unavailable. The
    # minimal outbox is retried by the scheduled administrator endpoint.
    from app.services.provider_deletion import process
    process(db)

    return None
