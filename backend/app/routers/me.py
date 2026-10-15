"""Learner profile endpoints: GET /me, PATCH /me, DELETE /me."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import require_learner
from app.db import get_db
from app.models import Learner
from app.schemas import MeResponse, UpdateMeRequest, LearnerProfile
from pydantic import BaseModel, Field
from fastapi import HTTPException
from app.services import learning_state

router = APIRouter()


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
    db.delete(learner)
    db.commit()

    return None
