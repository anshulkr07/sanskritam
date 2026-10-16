"""Simple token-based authentication (server-stored tokens, no JWTs)."""

import uuid
from typing import Optional

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Learner, Token


def create_token(learner_id: str, db: Session) -> Token:
    """Create a new auth token for a learner."""
    token = Token(learner_id=learner_id, id=uuid.uuid4().hex[:32])
    db.add(token)
    db.commit()
    return token


def get_learner_from_token(token_value: str, db: Session) -> Optional[Learner]:
    """Resolve a token string to a Learner or None.

    One joined query, not token-then-learner: this runs on every authenticated
    request, and against Postgres each statement is a network round trip."""
    return (
        db.query(Learner)
        .join(Token, Token.learner_id == Learner.id)
        .filter(Token.id == token_value)
        .first()
    )


def require_learner(
    authorization: str = Header(""),
    db: Session = Depends(get_db),
) -> Learner:
    """FastAPI dependency: require a valid Bearer token, return Learner.

    Plain ``def`` on purpose: the token lookup is a blocking DB call, so it
    must run in FastAPI's threadpool. As ``async def`` it ran on the event
    loop and stalled every other in-flight request while the query ran."""
    scheme = "Bearer "
    if not authorization.startswith(scheme):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing or invalid auth header")
    token_val = authorization[len(scheme):].strip()
    if not token_val:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Empty token")
    learner = get_learner_from_token(token_val, db)
    if learner is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return learner


def require_admin(
    x_admin_token: str = Header(""),
    db: Session = Depends(get_db),
) -> bool:
    """FastAPI dependency: require admin token from env."""
    from app.config import settings
    import secrets
    if not settings.admin_token or not secrets.compare_digest(x_admin_token, settings.admin_token):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin token")
    return True
