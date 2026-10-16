"""Group API. All permissions use the existing authenticated learner session.

Database-backed invalidations keep websocket updates correct across workers.
Only enrolled profiles appear in the community learner directory.

The learner card (a community profile) is the way in: making one means
agreeing to the Saṅgha rules, and posting, joining, calling and friend
requests need one (428 without). Browsing does not. Moderation: anyone can
report a message, circle or learner (stored as content reports, surface
"group"); senders and circle admins can delete messages; admins can edit a
circle and remove a learner, who then cannot rejoin; a blocked learner's
messages are hidden from the learner who blocked them.
"""

from __future__ import annotations
import asyncio
import secrets
import uuid
from datetime import timedelta
from typing import Literal
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Form,
    WebSocket,
    WebSocketDisconnect,
    Query,
)
from pydantic import BaseModel, Field
from sqlalchemy import or_, func, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool
from app.auth import require_learner
from app.db import get_db, SessionLocal
from app.models import Learner, Friendship, Block, ContentReport
from app.community_models import (
    CommunityProfile as Profile,
    CommunityConversation as Conversation,
    CommunityMember as Member,
    CommunityMessage as Message,
    CommunityMedia as Media,
    CommunityRoom as Room,
    CommunityEvent as Event,
    CommunityTicket as Ticket,
    now,
)
from app.services.play.social import _are_friends, _blocked, friends_list, pair_key
from app.services import community_audio as audio
from app.config import settings
from app.services import profile_photos as photos

router = APIRouter(prefix="/community")
Level = Literal["beginner", "intermediate", "advanced", "acharya"]
GroupLevel = Literal["all", "beginner", "intermediate", "advanced", "acharya"]


def require_group_learner(u=Depends(require_learner)):
    if u.community_suspended:
        raise HTTPException(403, "Your community access is suspended. Contact support for a review.")
    return u


def iso(d):
    return d.isoformat() + "Z" if d else None


def notify(db, user_ids=None):
    for uid in set(user_ids or [None]):
        db.add(Event(user_id=uid))


# A learner removed from a circle keeps a member row with this role, so the
# removal sticks: they are not a member, and cannot rejoin until invited.
REMOVED = "removed"


def audience(db, cid):
    return [
        m.user_id
        for m in db.query(Member).filter(
            Member.conversation_id == cid, Member.role != REMOVED
        )
    ]


def member(db, cid, uid):
    c = db.get(Conversation, cid)
    m = db.get(Member, (cid, uid))
    if not c or not m:
        raise HTTPException(403, "Join this circle before opening its chat.")
    if m.role == REMOVED:
        raise HTTPException(403, "You were removed from this circle.")
    if c.kind == "direct":
        other = next((x for x in audience(db, cid) if x != uid), None)
        if not other or _blocked(db, uid, other) or not _are_friends(db, uid, other):
            raise HTTPException(403, "This chat requires an accepted friendship.")
    return c, m


def blocked_ids(db, uid):
    """Everyone this learner blocked or was blocked by."""
    return {r.blocked_id for r in db.query(Block).filter_by(learner_id=uid)} | {
        r.learner_id for r in db.query(Block).filter_by(blocked_id=uid)
    }


def require_card(db, uid):
    """Posting, joining, calling and friend requests need a learner card."""
    photos.require_community_identity(db.get(Learner, uid))
    if not db.get(Profile, uid):
        raise HTTPException(428, "Make your learner card first.")


def profile_view(db, uid):
    u, p = db.get(Learner, uid), db.get(Profile, uid)
    return {
        "id": uid,
        "avatar_url": photos.avatar_url(u),
        "verified": photos.verified(u) if u else False,
        "name": u.display_name if u else "Learner",
        "level": p.level if p else "beginner",
        "bio": p.bio if p else "",
        "online": bool(p and p.last_seen > now() - timedelta(seconds=90)),
    }


def own_view(db, uid):
    return {**profile_view(db, uid), "card": db.get(Profile, uid) is not None}


class ProfileBody(BaseModel):
    level: Level = "beginner"
    bio: str = Field(default="", max_length=280)
    # Agreeing to the Saṅgha rules. Needed to make a card, not to edit one.
    rules: bool = False


@router.put("/profile")
def set_profile(
    body: ProfileBody, u=Depends(require_group_learner), db: Session = Depends(get_db)
):
    photos.require_community_identity(u)
    p = db.get(Profile, u.id)
    if not p:
        if not body.rules:
            raise HTTPException(422, "Agree to the Saṅgha rules to make your card.")
        p = Profile(user_id=u.id)
        db.add(p)
    p.level, p.bio, p.last_seen = body.level, body.bio.strip(), now()
    notify(db)
    db.commit()
    return own_view(db, u.id)


@router.get("/profile")
def own_profile(u=Depends(require_group_learner), db: Session = Depends(get_db)):
    return own_view(db, u.id)


@router.post("/presence")
def presence(u=Depends(require_group_learner), db: Session = Depends(get_db)):
    p = db.get(Profile, u.id)
    if p:
        p.last_seen = now()
        db.commit()
    return {"ok": True}


@router.get("/learners")
def learners(
    q: str = "",
    level: str = "all",
    limit: int = Query(100, ge=1, le=100),
    u=Depends(require_group_learner),
    db: Session = Depends(get_db),
):
    query = (
        db.query(Profile, Learner)
        .join(Learner, Profile.user_id == Learner.id)
        .filter(Learner.id != u.id)
    )
    query = query.filter(Learner.community_suspended.is_(False), or_(Learner.google_sub.isnot(None), Learner.apple_sub.isnot(None)))
    if q.strip():
        query = query.filter(Learner.display_name.ilike("%" + q.strip()[:80] + "%"))
    if level != "all":
        query = query.filter(Profile.level == level)
    blocked = blocked_ids(db, u.id)
    if blocked:
        query = query.filter(Learner.id.notin_(blocked))
    result = []
    for p, other in query.order_by(Profile.last_seen.desc()).limit(limit):
        edge = (
            db.query(Friendship).filter_by(learner_id=u.id, friend_id=other.id).first()
        )
        reverse = (
            db.query(Friendship)
            .filter_by(learner_id=other.id, friend_id=u.id, status="pending")
            .first()
        )
        result.append(
            {
                **profile_view(db, other.id),
                "friendship": (
                    edge.status if edge else ("incoming" if reverse else None)
                ),
            }
        )
    return result


@router.get("/friends")
def friends(u=Depends(require_group_learner), db: Session = Depends(get_db)):
    data = friends_list(db, u)
    outgoing = (
        db.query(Friendship)
        .filter_by(learner_id=u.id, requested_by=u.id, status="pending")
        .all()
    )
    return {
        "friends": [
            profile_view(db, x["learner_id"])
            for x in data["friends"]
            if not _blocked(db, u.id, x["learner_id"])
        ],
        "incoming": [profile_view(db, x["learner_id"]) for x in data["requests"]],
        "outgoing": [profile_view(db, x.friend_id) for x in outgoing],
    }


class FriendBody(BaseModel):
    user_id: str
    action: Literal["request", "accept", "decline", "cancel", "block", "remove"]


@router.post("/friends")
def friend_action(
    body: FriendBody, u=Depends(require_group_learner), db: Session = Depends(get_db)
):
    from app.services.play import social

    if body.action in ("request", "accept"):
        require_card(db, u.id)
    if body.action == "remove":
        social.remove_friend(db, u, body.user_id)
    elif body.action == "cancel":
        edge = (
            db.query(Friendship)
            .filter_by(
                learner_id=u.id,
                friend_id=body.user_id,
                status="pending",
                requested_by=u.id,
            )
            .first()
        )
        if edge:
            db.delete(edge)
        db.commit()
    else:
        try:
            if body.action == "request":
                social.request_friend(db, u, body.user_id)
            elif body.action == "block":
                social.block_learner(db, u, body.user_id)
            else:
                social.respond_friend(db, u, body.user_id, body.action == "accept")
        except social.SocialError as e:
            raise HTTPException(e.status, e.detail)
    notify(db, [u.id, body.user_id])
    db.commit()
    if body.action == "accept":
        return direct(DirectBody(user_id=body.user_id), u, db)
    return {"ok": True}


class DirectBody(BaseModel):
    user_id: str


@router.post("/direct")
def direct(body: DirectBody, u=Depends(require_group_learner), db: Session = Depends(get_db)):
    if not _are_friends(db, u.id, body.user_id) or _blocked(db, u.id, body.user_id):
        raise HTTPException(403, "Accept a friend request before chatting.")
    key = pair_key(u.id, body.user_id)
    c = db.query(Conversation).filter_by(pair_key=key).first()
    if not c:
        c = Conversation(kind="direct", pair_key=key, creator_id=u.id)
        db.add(c)
        try:
            db.flush()
            db.add_all(
                [
                    Member(conversation_id=c.id, user_id=uid)
                    for uid in (u.id, body.user_id)
                ]
            )
            notify(db, [u.id, body.user_id])
            db.commit()
        except IntegrityError:
            db.rollback()
            c = db.query(Conversation).filter_by(pair_key=key).one()
    return conversation_view(db, c, u.id)


def conversation_view(db, c, uid, blocked=None):
    if blocked is None:
        blocked = blocked_ids(db, uid)
    rows = (
        db.query(Member)
        .filter(Member.conversation_id == c.id, Member.role != REMOVED)
        .all()
    )
    mine = next((m for m in rows if m.user_id == uid), None)
    users = [m.user_id for m in rows]
    peer = next((x for x in users if x != uid), uid)
    unread = 0
    last = None
    if mine:
        unseen = db.query(Message).filter(
            Message.conversation_id == c.id,
            Message.id > mine.last_read_id,
            Message.sender_id != uid,
        )
        if blocked:
            unseen = unseen.filter(Message.sender_id.notin_(blocked))
        unread = unseen.count()
        # The preview is the latest message still there (refresh_last_text
        # keeps last_text in step when one is deleted).
        last = (
            db.query(Message)
            .filter(Message.conversation_id == c.id, Message.kind != "deleted")
            .order_by(Message.id.desc())
            .first()
        )
    # Public circles show who is in them; private ones only to members.
    show_members = bool(mine) or (c.kind == "group" and c.public)
    last_sender = ""
    last_text = c.last_text if mine else ""
    if last:
        if last.sender_id in blocked:
            last_text = "Message from a blocked learner"
        last_sender = (
            "You" if last.sender_id == uid else profile_view(db, last.sender_id)["name"]
        )
    return {
        "id": c.id,
        "kind": c.kind,
        "name": c.name if c.kind == "group" else profile_view(db, peer)["name"],
        "description": c.description,
        "topic": c.topic,
        "level": c.level,
        "public": c.public,
        "joined": bool(mine),
        "role": mine.role if mine else None,
        "members": (
            [{**profile_view(db, m.user_id), "role": m.role} for m in rows]
            if show_members
            else []
        ),
        "member_count": len(users),
        "last_text": last_text,
        "last_sender": last_sender,
        "updated_at": iso(c.updated_at),
        "unread": unread,
        "call_id": (
            c.call_id
            if mine
            and c.call_started_at
            and c.call_started_at > now() - timedelta(hours=2)
            else None
        ),
        "call_caller_id": c.call_caller_id if mine else None,
        "call_started_at": iso(c.call_started_at) if mine else None,
    }


@router.get("/conversations")
def conversations(
    discover: bool = False,
    q: str = "",
    limit: int = Query(100, ge=1, le=100),
    u=Depends(require_group_learner),
    db: Session = Depends(get_db),
):
    blocked = blocked_ids(db, u.id)
    query = db.query(Conversation)
    if discover:
        query = query.filter_by(kind="group", public=True)
        # Circles you cannot join stay out of the list: their creator and you
        # have blocked each other, or the admin removed you.
        if blocked:
            query = query.filter(Conversation.creator_id.notin_(blocked))
        removed = db.query(Member.conversation_id).filter(
            Member.user_id == u.id, Member.role == REMOVED
        )
        query = query.filter(Conversation.id.notin_(removed))
    else:
        query = query.join(Member, Member.conversation_id == Conversation.id).filter(
            Member.user_id == u.id, Member.role != REMOVED
        )
    if q.strip():
        query = query.filter(Conversation.name.ilike("%" + q.strip()[:80] + "%"))
    rows = []
    for c in query.order_by(Conversation.updated_at.desc()).limit(limit):
        if c.kind == "direct":
            try:
                member(db, c.id, u.id)
            except HTTPException:
                continue
        rows.append(conversation_view(db, c, u.id, blocked))
    return rows


@router.get("/conversations/{cid}")
def one_conversation(
    cid: str, u=Depends(require_group_learner), db: Session = Depends(get_db)
):
    c = db.get(Conversation, cid)
    mine = db.get(Member, (cid, u.id)) if c else None
    if c and mine and mine.role != REMOVED:
        member(db, cid, u.id)
        return conversation_view(db, c, u.id)
    # A public circle can be looked at before joining.
    if (
        c
        and c.kind == "group"
        and c.public
        and not mine
        and not _blocked(db, u.id, c.creator_id)
    ):
        return conversation_view(db, c, u.id)
    raise HTTPException(404, "This circle is private or no longer exists.")


class GroupBody(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    description: str = Field(default="", max_length=500)
    topic: str = Field(default="", max_length=80)
    level: GroupLevel = "all"
    public: bool = True


def group_fields(body: GroupBody):
    name = body.name.strip()
    if not name:
        raise HTTPException(422, "Give the circle a name.")
    return {
        "name": name,
        "description": body.description.strip(),
        "topic": body.topic.strip(),
        "level": body.level,
        "public": body.public,
    }


@router.post("/groups")
def group(body: GroupBody, u=Depends(require_group_learner), db: Session = Depends(get_db)):
    fields = group_fields(body)
    require_card(db, u.id)
    c = Conversation(kind="group", creator_id=u.id, **fields)
    db.add(c)
    db.flush()
    db.add(Member(conversation_id=c.id, user_id=u.id, role="admin"))
    # Everyone's Discover list changes for an open circle; only yours otherwise.
    notify(db, None if c.public else [u.id])
    db.commit()
    return conversation_view(db, c, u.id)


@router.put("/groups/{cid}")
def edit_group(
    cid: str, body: GroupBody, u=Depends(require_group_learner), db: Session = Depends(get_db)
):
    c, m = member(db, cid, u.id)
    if c.kind != "group" or m.role != "admin":
        raise HTTPException(403, "Only the circle admin can edit it.")
    fields = group_fields(body)
    was_public = c.public
    for key, value in fields.items():
        setattr(c, key, value)
    notify(db, None if (was_public or c.public) else audience(db, cid))
    db.commit()
    return conversation_view(db, c, u.id)


@router.post("/groups/{cid}/join")
def join_group(cid: str, u=Depends(require_group_learner), db: Session = Depends(get_db)):
    c = db.get(Conversation, cid)
    if not c or c.kind != "group" or not c.public:
        raise HTTPException(403, "This circle is invite only.")
    if _blocked(db, u.id, c.creator_id):
        raise HTTPException(403, "You cannot join this circle.")
    existing = db.get(Member, (cid, u.id))
    if existing and existing.role == REMOVED:
        raise HTTPException(403, "The circle admin removed you from this circle.")
    require_card(db, u.id)
    if not existing:
        db.add(Member(conversation_id=cid, user_id=u.id))
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
    notify(db, audience(db, cid) + [u.id])
    db.commit()
    return conversation_view(db, c, u.id)


class InviteBody(BaseModel):
    user_id: str


@router.post("/groups/{cid}/invite")
def invite(
    cid: str,
    body: InviteBody,
    u=Depends(require_group_learner),
    db: Session = Depends(get_db),
):
    c, m = member(db, cid, u.id)
    if c.kind != "group" or m.role != "admin":
        raise HTTPException(403, "Only the circle admin can invite friends.")
    require_card(db, u.id)
    if not _are_friends(db, u.id, body.user_id) or _blocked(db, u.id, body.user_id):
        raise HTTPException(403, "Invite an accepted friend.")
    existing = db.get(Member, (cid, body.user_id))
    if not existing:
        db.add(Member(conversation_id=cid, user_id=body.user_id))
    elif existing.role == REMOVED:
        # The admin's invitation lifts an earlier removal.
        existing.role = "member"
    notify(db, audience(db, cid) + [body.user_id])
    db.commit()
    return {"ok": True}


@router.post("/groups/{cid}/remove")
def remove_member(
    cid: str,
    body: InviteBody,
    u=Depends(require_group_learner),
    db: Session = Depends(get_db),
):
    c, m = member(db, cid, u.id)
    if c.kind != "group" or m.role != "admin":
        raise HTTPException(403, "Only the circle admin can remove learners.")
    if body.user_id == u.id:
        raise HTTPException(422, "Use Leave circle to leave your own circle.")
    target = db.get(Member, (cid, body.user_id))
    if not target or target.role == REMOVED:
        raise HTTPException(404, "That learner is not in this circle.")
    notify(db, audience(db, cid))
    target.role = REMOVED
    db.commit()
    return {"ok": True}


@router.post("/groups/{cid}/leave")
def leave_group(cid: str, u=Depends(require_group_learner), db: Session = Depends(get_db)):
    c, m = member(db, cid, u.id)
    if c.kind != "group":
        raise HTTPException(422, "This is a direct chat.")
    if m.role == "admin":
        replacement = (
            db.query(Member)
            .filter(
                Member.conversation_id == cid,
                Member.user_id != u.id,
                Member.role != REMOVED,
            )
            .first()
        )
        if replacement:
            replacement.role = "admin"
            c.creator_id = replacement.user_id
        else:
            c.public = False
    notify(db, audience(db, cid))
    db.delete(m)
    db.commit()
    return {"ok": True}


class MessageBody(BaseModel):
    client_id: str = Field(min_length=8, max_length=64)
    content: str = Field(default="", max_length=4000)
    media_id: str | None = None
    reply_to: int | None = None


@router.post("/conversations/{cid}/messages")
def send(
    cid: str,
    body: MessageBody,
    u=Depends(require_group_learner),
    db: Session = Depends(get_db),
):
    c, m = member(db, cid, u.id)
    require_card(db, u.id)
    existing = (
        db.query(Message).filter_by(sender_id=u.id, client_id=body.client_id).first()
    )
    if existing:
        if existing.conversation_id != cid:
            raise HTTPException(409, "Message retry belongs to another chat.")
        return message_view(db, existing)
    if not body.content.strip() and not body.media_id:
        raise HTTPException(422, "Write a message or attach media.")
    if body.reply_to:
        quoted = db.get(Message, body.reply_to)
        if not quoted or quoted.conversation_id != cid:
            raise HTTPException(422, "Reply must be from this chat.")
    recent = (
        db.query(Message)
        .filter(
            Message.sender_id == u.id, Message.created_at > now() - timedelta(minutes=1)
        )
        .count()
    )
    if recent >= 30:
        raise HTTPException(429, "Take a moment before sending more messages.")
    media = db.get(Media, body.media_id) if body.media_id else None
    if body.media_id and (
        not media
        or media.user_id != u.id
        or media.conversation_id != cid
        or media.expires_at <= now()
    ):
        raise HTTPException(422, "Upload a new attachment for this conversation.")
    kind = (
        ("image" if media.mime.startswith("image/") else "audio") if media else "text"
    )
    msg = Message(
        conversation_id=cid,
        sender_id=u.id,
        client_id=body.client_id,
        content=body.content.strip(),
        media_id=body.media_id,
        reply_to=body.reply_to,
        kind=kind,
    )
    db.add(msg)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        previous = (
            db.query(Message)
            .filter_by(sender_id=u.id, client_id=body.client_id, conversation_id=cid)
            .first()
        )
        if previous:
            return message_view(db, previous)
        raise HTTPException(
            409, "Message could not be saved. Retry with a new message ID."
        )
    c.last_text = (
        ("Photo" if kind == "image" else "Voice note") if media else msg.content[:160]
    )
    c.updated_at = now()
    m.last_read_id = msg.id
    notify(db, audience(db, cid))
    db.commit()
    return message_view(db, msg)


def message_view(db, msg, blocked=frozenset()):
    # A blocked learner's message keeps its place but none of its content.
    hidden = msg.sender_id in blocked
    media = db.get(Media, msg.media_id) if msg.media_id and not hidden else None
    reply = db.get(Message, msg.reply_to) if msg.reply_to and not hidden else None
    quote = ""
    if reply:
        quote = (
            "Message from a blocked learner"
            if reply.sender_id in blocked
            else (
                "Message deleted"
                if reply.kind == "deleted"
                else reply.content[:160]
                or ("Photo" if reply.kind == "image" else "Voice note")
            )
        )
    return {
        "id": msg.id,
        "sender": profile_view(db, msg.sender_id),
        "kind": msg.kind,
        "content": "" if hidden else msg.content,
        "hidden": hidden,
        "created_at": iso(msg.created_at),
        "media_id": media.id if media else None,
        "expires_at": iso(media.expires_at) if media else None,
        "duration": media.duration if media else 0,
        "client_id": msg.client_id,
        "reply": (
            {
                "id": reply.id,
                "name": profile_view(db, reply.sender_id)["name"],
                "content": quote,
            }
            if reply
            else None
        ),
    }


@router.get("/conversations/{cid}/messages")
def messages(
    cid: str,
    before: int | None = None,
    u=Depends(require_group_learner),
    db: Session = Depends(get_db),
):
    member(db, cid, u.id)
    query = db.query(Message).filter_by(conversation_id=cid)
    if before:
        query = query.filter(Message.id < before)
    rows = query.order_by(Message.id.desc()).limit(50).all()
    blocked = blocked_ids(db, u.id)
    return [message_view(db, x, blocked) for x in reversed(rows)]


def refresh_last_text(db, c):
    last = (
        db.query(Message)
        .filter(Message.conversation_id == c.id, Message.kind != "deleted")
        .order_by(Message.id.desc())
        .first()
    )
    c.last_text = (
        ""
        if not last
        else (
            last.content[:160]
            if last.kind == "text"
            else ("Photo" if last.kind == "image" else "Voice note")
        )
    )


@router.post("/conversations/{cid}/messages/{mid}/delete")
def delete_message(
    cid: str, mid: int, u=Depends(require_group_learner), db: Session = Depends(get_db)
):
    c, m = member(db, cid, u.id)
    msg = db.get(Message, mid)
    if not msg or msg.conversation_id != cid:
        raise HTTPException(404, "Message not found.")
    if msg.sender_id != u.id and not (c.kind == "group" and m.role == "admin"):
        raise HTTPException(
            403, "Only the sender or the circle admin can delete this message."
        )
    if msg.kind != "deleted":
        media = db.get(Media, msg.media_id) if msg.media_id else None
        msg.kind, msg.content, msg.media_id = "deleted", "", None
        db.flush()
        if media:
            key = media.key
            db.delete(media)
            try:
                store, bucket = object_store()
                store.delete_object(Bucket=bucket, Key=key)
            except Exception:
                # The bucket's two-day lifecycle rule removes it anyway.
                pass
        refresh_last_text(db, c)
        notify(db, audience(db, cid))
        db.commit()
    return message_view(db, msg)


class ReportBody(BaseModel):
    kind: Literal["message", "circle", "learner"]
    id: str = Field(min_length=1, max_length=64)
    reason: str = Field(default="", max_length=500)


@router.post("/report", status_code=204)
def report(body: ReportBody, u=Depends(require_group_learner), db: Session = Depends(get_db)):
    """Flag a message, circle or learner for review. The server copies what
    is reported, so a moderator sees it even if it is deleted later."""
    from app.routers.feedback import REPORTS_PER_DAY, MAX_FIELD

    day_start = now().replace(hour=0, minute=0, second=0, microsecond=0)
    today = (
        db.query(func.count(ContentReport.id))
        .filter(ContentReport.learner_id == u.id, ContentReport.created_at >= day_start)
        .scalar()
        or 0
    )
    if today >= REPORTS_PER_DAY:
        raise HTTPException(429, "Report limit reached. Try again tomorrow.")
    if body.kind == "message":
        msg = db.get(Message, int(body.id)) if body.id.isdigit() else None
        if not msg:
            raise HTTPException(404, "Message not found.")
        member(db, msg.conversation_id, u.id)
        subject = (
            f"group message {msg.id} in {msg.conversation_id} by {msg.sender_id}"
            + (f" (media {msg.media_id})" if msg.media_id else "")
        )
        content = msg.content or f"[{msg.kind}]"
    elif body.kind == "circle":
        c = db.get(Conversation, body.id)
        mine = db.get(Member, (body.id, u.id)) if c else None
        if not c or c.kind != "group" or not (c.public or mine):
            raise HTTPException(404, "Circle not found.")
        subject = f"group circle {c.id} by {c.creator_id}"
        content = "\n".join(x for x in (c.name, c.topic, c.description) if x)
    else:
        other = db.get(Learner, body.id)
        if not other or other.id == u.id:
            raise HTTPException(404, "Learner not found.")
        p = db.get(Profile, other.id)
        subject = f"group learner {other.id}"
        content = "\n".join(x for x in (other.display_name, p.bio if p else "", photos.avatar_url(other)) if x)
    db.add(
        ContentReport(
            learner_id=u.id,
            surface="group",
            question=subject[:MAX_FIELD],
            answer=content[:MAX_FIELD],
            reason=body.reason.strip()[:MAX_FIELD],
        )
    )
    db.commit()
    return None


class ReadBody(BaseModel):
    message_id: int = Field(ge=0)


@router.post("/conversations/{cid}/read")
def read(
    cid: str, body: ReadBody, u=Depends(require_group_learner), db: Session = Depends(get_db)
):
    c, m = member(db, cid, u.id)
    maximum = (
        db.query(func.max(Message.id)).filter_by(conversation_id=cid).scalar() or 0
    )
    m.last_read_id = max(m.last_read_id, min(body.message_id, maximum))
    db.commit()
    return {"ok": True}


# Upload through the authenticated server: exact byte/MIME validation, private bucket,
# no writable presigned URL that can be reused after validation.
def object_store():
    from app.services.storage import get_storage, R2Storage

    store = get_storage()
    if not isinstance(store, R2Storage) or not settings.r2_private_bucket:
        raise HTTPException(503, "Shared media needs the private R2 bucket configured.")
    return store._client, settings.r2_private_bucket


@router.post("/conversations/{cid}/media")
async def upload(
    cid: str,
    file: UploadFile = File(...),
    duration: int = Form(0),
    u=Depends(require_group_learner),
    db: Session = Depends(get_db),
):
    member(db, cid, u.id)
    require_card(db, u.id)
    uploads = (
        db.query(Media).filter(Media.user_id == u.id, Media.expires_at > now()).count()
    )
    if uploads >= 100:
        raise HTTPException(
            429, "Attachment limit reached. Try again after older media expires."
        )
    mime = (file.content_type or "").split(";")[0]
    caps = {
        "image/webp": 153600,
        "image/jpeg": 153600,
        "audio/mp4": 491520,
        "audio/m4a": 491520,
        "audio/webm": 491520,
    }
    if mime not in caps:
        raise HTTPException(422, "Use a compressed photo or a voice note.")
    data = await file.read(caps[mime] + 1)
    if not data or len(data) > caps[mime]:
        raise HTTPException(413, "Photo limit is 150 KB; voice note limit is 480 KB.")
    if mime.startswith("audio/") and not 1 <= duration <= 120:
        raise HTTPException(422, "Voice notes must be 1–120 seconds.")
    valid = (
        (data[:4] == b"RIFF" and data[8:12] == b"WEBP")
        if mime == "image/webp"
        else (
            data[:3] == b"\xff\xd8\xff"
            if mime == "image/jpeg"
            else (
                data[:4] == b"\x1aE\xdf\xa3"
                if mime == "audio/webm"
                else data[4:8] == b"ftyp"
            )
        )
    )
    if not valid:
        raise HTTPException(422, "The file does not match its media type.")
    if mime.startswith("image/"):
        data = await run_in_threadpool(lambda: photos.normalize_image(data, mime, avatar=False))
        await photos.screen_image(db, u, data)
        mime = "image/jpeg"
    ext = {
        "image/webp": "webp",
        "image/jpeg": "jpg",
        "audio/mp4": "m4a",
        "audio/m4a": "m4a",
        "audio/webm": "webm",
    }[mime]
    key = f"ephemeral-chat/{now():%Y-%m-%d}/{uuid.uuid4().hex}.{ext}"
    store, bucket = object_store()
    await run_in_threadpool(
        store.put_object,
        Bucket=bucket,
        Key=key,
        Body=data,
        ContentType=mime,
        CacheControl="private, max-age=300",
    )
    row = Media(
        conversation_id=cid,
        user_id=u.id,
        key=key,
        mime=mime,
        size=len(data),
        duration=duration,
        expires_at=now() + timedelta(hours=48),
    )
    db.add(row)
    db.commit()
    return {"id": row.id, "expires_at": iso(row.expires_at)}


@router.get("/media/{mid}")
def media_url(mid: str, u=Depends(require_group_learner), db: Session = Depends(get_db)):
    row = db.get(Media, mid)
    if not row:
        raise HTTPException(404, "Media not found.")
    member(db, row.conversation_id, u.id)
    if row.expires_at <= now():
        raise HTTPException(410, "Media expired after 48 hours.")
    store, bucket = object_store()
    seconds = max(1, min(300, int((row.expires_at - now()).total_seconds())))
    url = store.generate_presigned_url(
        "get_object", Params={"Bucket": bucket, "Key": row.key}, ExpiresIn=seconds
    )
    return {"url": url, "expires_at": iso(row.expires_at)}


class RoomBody(BaseModel):
    title: str = Field(min_length=1, max_length=80)
    topic: str = Field(default="", max_length=160)
    level: GroupLevel = "all"


@router.get("/rooms")
def rooms(u=Depends(require_group_learner), db: Session = Depends(get_db)):
    rows = (
        db.query(Room)
        .filter(Room.status == "live", Room.heartbeat > now() - timedelta(minutes=2))
        .order_by(Room.created_at.desc())
        .limit(100)
    )
    rows = list(rows)
    occupancy = audio.occupancy([r.id for r in rows])
    return [
        {
            "id": r.id,
            "title": r.title,
            "topic": r.topic,
            "level": r.level,
            "host": profile_view(db, r.host_id),
            **occupancy.get(r.id, {}),
        }
        for r in rows
        if not _blocked(db, u.id, r.host_id)
    ]


@router.post("/rooms")
def create_room(
    body: RoomBody, u=Depends(require_group_learner), db: Session = Depends(get_db)
):
    if not body.title.strip():
        raise HTTPException(422, "Give the room a title.")
    require_card(db, u.id)
    r = Room(
        id=uuid.uuid4().hex,
        title=body.title.strip(),
        topic=body.topic.strip(),
        level=body.level,
        host_id=u.id,
    )
    audio.create("audio_room", r.id, u, [u], r.title)
    db.add(r)
    notify(db)
    db.commit()
    return {
        "id": r.id,
        "title": r.title,
        "topic": r.topic,
        "level": r.level,
        "host": profile_view(db, u.id),
    }


@router.post("/rooms/{rid}/heartbeat")
def heartbeat(rid: str, u=Depends(require_group_learner), db: Session = Depends(get_db)):
    r = db.get(Room, rid)
    if not r or r.host_id != u.id or r.status != "live":
        raise HTTPException(403, "Only the host can keep this room live.")
    r.heartbeat = now()
    db.commit()
    return {"ok": True}


class PermissionBody(BaseModel):
    user_id: str
    allow: bool


@router.post("/rooms/{rid}/permission")
def permission(
    rid: str,
    body: PermissionBody,
    u=Depends(require_group_learner),
    db: Session = Depends(get_db),
):
    r = db.get(Room, rid)
    if (
        not r
        or r.status != "live"
        or (r.host_id != u.id and not (body.user_id == u.id and not body.allow))
    ):
        raise HTTPException(403, "Only the host can allow a microphone.")
    if body.user_id == r.host_id:
        raise HTTPException(422, "The host cannot step down.")
    audio.permission(rid, body.user_id, body.allow)
    return {"ok": True}


@router.post("/rooms/{rid}/end")
def end_room(rid: str, u=Depends(require_group_learner), db: Session = Depends(get_db)):
    r = db.get(Room, rid)
    if not r or r.host_id != u.id:
        raise HTTPException(403, "Only the host can end the room.")
    audio.end("audio_room", rid)
    r.status = "ended"
    notify(db)
    db.commit()
    return {"ok": True}


@router.post("/conversations/{cid}/call")
def start_call(cid: str, u=Depends(require_group_learner), db: Session = Depends(get_db)):
    c, m = member(db, cid, u.id)
    require_card(db, u.id)
    # Serialize call creation with a row lock on Postgres.
    c = db.query(Conversation).filter_by(id=cid).with_for_update().one()
    if (
        c.call_id
        and c.call_started_at
        and c.call_started_at > now() - timedelta(hours=2)
    ):
        return {
            "id": c.call_id,
            "title": conversation_view(db, c, u.id)["name"],
            "kind": "default",
            "conversation_id": cid,
        }
    call_id = uuid.uuid4().hex
    people = db.query(Learner).filter(Learner.id.in_(audience(db, cid))).all()
    audio.create("default", call_id, u, people, c.name or "Sanskrit conversation")
    c.call_id = call_id
    c.call_caller_id = u.id
    c.call_started_at = now()
    notify(db, audience(db, cid))
    db.commit()
    return {
        "initiated": True,
        "id": call_id,
        "title": conversation_view(db, c, u.id)["name"],
        "kind": "default",
        "conversation_id": cid,
    }


class DeclineBody(BaseModel):
    id: str


@router.post("/conversations/{cid}/call/decline")
def decline_call(
    cid: str,
    body: DeclineBody,
    u=Depends(require_group_learner),
    db: Session = Depends(get_db),
):
    c, m = member(db, cid, u.id)
    if c.kind == "direct" and c.call_id == body.id:
        audio.end("default", c.call_id)
        c.call_id = None
        c.call_started_at = None
        notify(db, audience(db, cid))
        db.commit()
    return {"ok": True}


@router.post("/conversations/{cid}/call/end")
def end_call(cid: str, u=Depends(require_group_learner), db: Session = Depends(get_db)):
    c, m = member(db, cid, u.id)
    if c.call_id:
        audio.end("default", c.call_id)
    c.call_id = None
    c.call_started_at = None
    notify(db, audience(db, cid))
    db.commit()
    return {"ok": True}


class TokenBody(BaseModel):
    kind: Literal["audio_room", "default"]
    id: str
    conversation_id: str | None = None


@router.post("/stream-token")
def stream_token(
    body: TokenBody, u=Depends(require_group_learner), db: Session = Depends(get_db)
):
    if body.kind == "audio_room":
        r = db.get(Room, body.id)
        if (
            not r
            or r.status != "live"
            or r.heartbeat < now() - timedelta(minutes=2)
            or _blocked(db, u.id, r.host_id)
        ):
            raise HTTPException(404, "This room has ended.")
        # Anyone in a room can raise a hand and speak. Answering a friend's
        # call needs no card; a card is needed to place one.
        require_card(db, u.id)
    else:
        c, m = member(db, body.conversation_id, u.id)
        if c.call_id != body.id:
            raise HTTPException(403, "Call is not active in this chat.")
    audio.users([u])
    return audio.token(u.id, body.kind, body.id)


@router.get("/status")
def status(u=Depends(require_group_learner), db: Session = Depends(get_db)):
    blocked = blocked_ids(db, u.id)
    accepted = {
        r.friend_id
        for r in db.query(Friendship).filter_by(learner_id=u.id, status="accepted")
    }
    memberships = (
        db.query(Member, Conversation)
        .join(Conversation, Member.conversation_id == Conversation.id)
        .filter(Member.user_id == u.id, Member.role != REMOVED)
        .all()
    )
    valid = []
    incoming = []
    member_ids = {}
    for row in db.query(Member).filter(
        Member.conversation_id.in_([c.id for _, c in memberships]),
        Member.role != REMOVED,
    ):
        member_ids.setdefault(row.conversation_id, set()).add(row.user_id)
    for m, c in memberships:
        if c.kind == "direct":
            peers = member_ids.get(c.id, set()) - {u.id}
            if not peers or peers & blocked or not peers <= accepted:
                continue
        valid.append(c.id)
        if (
            c.kind == "direct"
            and c.call_id
            and c.call_caller_id != u.id
            and c.call_started_at
            and c.call_started_at > now() - timedelta(seconds=45)
        ):
            peer = next(iter(peers))
            incoming.append(
                {
                    "id": c.call_id,
                    "conversation_id": c.id,
                    "kind": "default",
                    "title": profile_view(db, peer)["name"],
                    "expires_at": iso(c.call_started_at + timedelta(seconds=45)),
                }
            )
    unseen = (
        db.query(func.count(Message.id))
        .join(Member, Member.conversation_id == Message.conversation_id)
        .filter(
            Member.user_id == u.id,
            Message.conversation_id.in_(valid),
            Message.id > Member.last_read_id,
            Message.sender_id != u.id,
        )
    )
    if blocked:
        unseen = unseen.filter(Message.sender_id.notin_(blocked))
    unread = unseen.scalar() or 0
    live = (
        db.query(Room)
        .filter(
            Room.status == "live",
            Room.heartbeat > now() - timedelta(minutes=2),
            ~Room.host_id.in_(blocked),
        )
        .count()
    )
    requests = db.query(Friendship).filter(
        Friendship.friend_id == u.id,
        Friendship.status == "pending",
        Friendship.requested_by != u.id,
    )
    if blocked:
        requests = requests.filter(Friendship.learner_id.notin_(blocked))
    return {
        "unread": unread,
        "live": live,
        "requests": requests.count(),
        "card": db.get(Profile, u.id) is not None,
        "incoming": incoming,
        "audio_enabled": audio.enabled(),
    }


@router.post("/realtime-ticket")
def ticket(u=Depends(require_group_learner), db: Session = Depends(get_db)):
    # Tickets are single-use, 30 seconds, separate from long-lived auth tokens.
    row = Ticket(
        id=secrets.token_urlsafe(32),
        user_id=u.id,
        expires_at=now() + timedelta(seconds=30),
    )
    db.add(row)
    db.commit()
    return {"ticket": row.id}


@router.websocket("/realtime")
async def realtime(ws: WebSocket):
    await ws.accept()
    uid = None
    try:
        secret = await asyncio.wait_for(ws.receive_text(), 10)

        def redeem():
            with SessionLocal() as db:
                t = db.get(Ticket, secret)
                if not t or t.expires_at < now():
                    return None
                uid = t.user_id
                result = db.execute(
                    update(Ticket)
                    .where(Ticket.id == secret, Ticket.expires_at > now())
                    .values(expires_at=now() - timedelta(seconds=1))
                )
                db.commit()
                return uid if result.rowcount else None

        uid = await run_in_threadpool(redeem)
        if not uid:
            await ws.close(4401)
            return
        cursor = -1
        while True:

            def version():
                with SessionLocal() as db:
                    learner = db.get(Learner, uid)
                    if not learner or learner.community_suspended:
                        return None
                    return (
                        db.query(func.max(Event.id))
                        .filter(or_(Event.user_id == uid, Event.user_id.is_(None)))
                        .scalar()
                        or 0
                    )

            latest = await run_in_threadpool(version)
            if latest is None:
                await ws.close(4401)
                return
            if latest != cursor:
                cursor = latest
                await ws.send_json({"type": "refresh", "version": cursor})
            else:
                await ws.send_json({"type": "heartbeat"})
            await asyncio.sleep(2)
    except (WebSocketDisconnect, asyncio.TimeoutError, RuntimeError):
        return
