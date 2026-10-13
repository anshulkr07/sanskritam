"""Friends and cooperative-goal API (brief §6)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import require_learner
from app.db import get_db
from app.models import Learner
from app.services.play import social
from app.services.play.social import SocialError

router = APIRouter(prefix="/social")


def _http(e: SocialError) -> HTTPException:
    return HTTPException(status_code=e.status, detail=e.detail)


@router.get("/friends")
def get_friends(learner: Learner = Depends(require_learner), db: Session = Depends(get_db)):
    return social.friends_list(db, learner)


class RequestBody(BaseModel):
    learner_id: str


@router.post("/friends/request")
def post_request(body: RequestBody, learner: Learner = Depends(require_learner),
                 db: Session = Depends(get_db)):
    try:
        return social.request_friend(db, learner, body.learner_id)
    except SocialError as e:
        raise _http(e)


class RespondBody(BaseModel):
    learner_id: str
    accept: bool


@router.post("/friends/respond")
def post_respond(body: RespondBody, learner: Learner = Depends(require_learner),
                 db: Session = Depends(get_db)):
    try:
        return social.respond_friend(db, learner, body.learner_id, body.accept)
    except SocialError as e:
        raise _http(e)


@router.post("/friends/{learner_id}/remove")
def post_remove(learner_id: str, learner: Learner = Depends(require_learner),
                db: Session = Depends(get_db)):
    return social.remove_friend(db, learner, learner_id)


class BlockBody(BaseModel):
    reason: str = ""


@router.post("/friends/{learner_id}/block")
def post_block(learner_id: str, body: BlockBody,
               learner: Learner = Depends(require_learner),
               db: Session = Depends(get_db)):
    try:
        return social.block_learner(db, learner, learner_id, body.reason)
    except SocialError as e:
        raise _http(e)


class AliasBody(BaseModel):
    alias: str


@router.post("/friends/{learner_id}/alias")
def post_alias(learner_id: str, body: AliasBody,
               learner: Learner = Depends(require_learner),
               db: Session = Depends(get_db)):
    try:
        return social.set_alias(db, learner, learner_id, body.alias)
    except SocialError as e:
        raise _http(e)


class JoinGoalBody(BaseModel):
    partner_id: str


@router.post("/friend-goal/join")
def post_join_goal(body: JoinGoalBody, learner: Learner = Depends(require_learner),
                   db: Session = Depends(get_db)):
    try:
        return social.join_goal(db, learner, body.partner_id)
    except SocialError as e:
        raise _http(e)


@router.get("/friend-goal")
def get_goal(learner: Learner = Depends(require_learner), db: Session = Depends(get_db)):
    return {"goal": social.goal_view(db, learner)}


class CreditBody(BaseModel):
    session_ref: str


@router.post("/friend-goal/credit")
def post_credit(body: CreditBody, learner: Learner = Depends(require_learner),
                db: Session = Depends(get_db)):
    """Called by the results flow after a legitimate finished round when the
    learner has opted into a weekly goal."""
    return social.credit_round(db, learner, body.session_ref[:64])
