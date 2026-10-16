"""Friends, blocks and the weekly cooperative friend goal (brief §6).

Friends: invite/accept/decline/remove with aliases, block/report, and
friend-only leaderboards (the boards service already scopes on accepted
edges). No contact-book access, no public free-text chat — communication is
preset reactions only.

Weekly friend goal: opt-in pair, 20 completed rounds together, at least five
by each player, at most five counted per person per day. Qualifying rounds
need a legitimately finished session, not an open/abandoned one. The reward
is a badge, never ranked points. A friend request is not consent to anything
promotional.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import Block, CosmeticGrant, FriendGoal, FriendGoalRound, Friendship, Learner
from app.services.play.catalog import GOAL_ROUNDS_PER_DAY

GOAL_ROUNDS_TOTAL = 20
GOAL_MIN_EACH = 5
GOAL_MAX_PER_PERSON_DAY = 5


class SocialError(Exception):
    def __init__(self, status: int, detail: str):
        self.status = status
        self.detail = detail
        super().__init__(detail)


def _now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def pair_key(a: str, b: str) -> str:
    return "|".join(sorted([a, b]))


def week_key(now: datetime | None = None) -> str:
    from app.services.play.boards import ist_now
    d = (now or ist_now()).date()
    iso = d.isocalendar()
    return f"{iso[0]}-W{iso[1]:02d}"


def _are_friends(db: Session, a: str, b: str) -> bool:
    edge = (db.query(Friendship)
            .filter(Friendship.learner_id == a, Friendship.friend_id == b,
                    Friendship.status == "accepted")
            .first())
    return edge is not None


def _blocked(db: Session, a: str, b: str) -> bool:
    return (db.query(Block)
            .filter(Block.learner_id == a, Block.blocked_id == b)
            .first() is not None) or \
           (db.query(Block)
            .filter(Block.learner_id == b, Block.blocked_id == a)
            .first() is not None)


def player_card(db: Session, learner: Learner, target_id: str) -> dict:
    """The small profile behind a leaderboard tap: name, picture and where
    the learner stands with them, so the action button knows what to offer."""
    target = db.query(Learner).filter(Learner.id == target_id).first()
    if target is None:
        raise SocialError(404, "Learner not found.")
    if target.id == learner.id:
        relationship = "self"
    elif _blocked(db, learner.id, target.id):
        relationship = "blocked"
    elif _are_friends(db, learner.id, target.id):
        relationship = "friends"
    else:
        forward = (db.query(Friendship)
                   .filter(Friendship.learner_id == learner.id,
                           Friendship.friend_id == target.id)
                   .first())
        reverse = (db.query(Friendship)
                   .filter(Friendship.learner_id == target.id,
                           Friendship.friend_id == learner.id)
                   .first())
        if forward is not None and forward.status == "pending":
            relationship = "outgoing"
        elif reverse is not None and reverse.status == "pending":
            relationship = "incoming"
        else:
            relationship = "none"
    from app.services.profile_photos import avatar_url
    return {
        "learner_id": target.id,
        "name": target.display_name or "Learner",
        "avatar_url": avatar_url(target),
        "relationship": relationship,
    }


def friends_list(db: Session, learner: Learner) -> dict:
    edges = (db.query(Friendship)
             .filter(Friendship.learner_id == learner.id,
                     Friendship.status == "accepted").all())
    # A pending request aimed AT this learner is a row where they are the
    # friend_id and someone else requested it.
    incoming = (db.query(Friendship)
                .filter(Friendship.friend_id == learner.id,
                        Friendship.status == "pending",
                        Friendship.requested_by != learner.id).all())
    names = {l.id: l.display_name for l in
             db.query(Learner).filter(Learner.id.in_(
                 [e.friend_id for e in edges] + [r.requested_by for r in incoming])).all()}
    return {
        "friends": [{"learner_id": e.friend_id,
                     "name": names.get(e.friend_id, "Learner"),
                     "alias": e.alias} for e in edges],
        "requests": [{"learner_id": r.requested_by,
                      "name": names.get(r.requested_by, "Learner")}
                     for r in incoming],
    }


def request_friend(db: Session, learner: Learner, target_id: str) -> dict:
    target = db.query(Learner).filter(Learner.id == target_id).first()
    if target is None or target.id == learner.id:
        raise SocialError(404, "Learner not found.")
    if _blocked(db, learner.id, target.id):
        raise SocialError(403, "Request not possible.")
    forward = (db.query(Friendship)
               .filter(Friendship.learner_id == learner.id, Friendship.friend_id == target.id)
               .first())
    reverse = (db.query(Friendship)
               .filter(Friendship.learner_id == target.id, Friendship.friend_id == learner.id)
               .first())
    if forward and forward.status == "accepted":
        return {"status": "accepted"}
    if reverse and reverse.status == "pending":
        # They asked first: accepting is idempotent for both edges.
        reverse.status = "accepted"
        reverse.responded_at = _now()
        if forward is None:
            forward = Friendship(learner_id=learner.id, friend_id=target.id,
                                 status="accepted", requested_by=target.id)
            db.add(forward)
        else:
            forward.status = "accepted"
            forward.responded_at = _now()
        db.commit()
        return {"status": "accepted"}
    if forward is None:
        forward = Friendship(learner_id=learner.id, friend_id=target.id,
                             status="pending", requested_by=learner.id)
        db.add(forward)
    else:
        forward.status = "pending"
        forward.requested_by = learner.id
    if reverse and reverse.status == "declined":
        db.delete(reverse)
    db.commit()
    return {"status": "pending"}


def respond_friend(db: Session, learner: Learner, requester_id: str, accept: bool) -> dict:
    # The pending row is the requester's outgoing edge: learner_id=requester,
    # friend_id=the responder.
    edge_in = (db.query(Friendship)
               .filter(Friendship.learner_id == requester_id,
                       Friendship.friend_id == learner.id,
                       Friendship.status == "pending")
               .first())
    if edge_in is None:
        raise SocialError(404, "No pending request.")
    if accept:
        edge_in.status = "accepted"
        edge_in.responded_at = _now()
        back = (db.query(Friendship)
                .filter(Friendship.learner_id == learner.id,
                        Friendship.friend_id == requester_id)
                .first())
        if back is None:
            db.add(Friendship(learner_id=learner.id, friend_id=requester_id,
                              status="accepted", requested_by=requester_id))
        else:
            back.status = "accepted"
            back.responded_at = _now()
    else:
        edge_in.status = "declined"
        edge_in.responded_at = _now()
    db.commit()
    return {"status": edge_in.status}


def remove_friend(db: Session, learner: Learner, other_id: str) -> dict:
    for a, b in ((learner.id, other_id), (other_id, learner.id)):
        edge = (db.query(Friendship)
                .filter(Friendship.learner_id == a, Friendship.friend_id == b)
                .first())
        if edge is not None:
            db.delete(edge)
    db.commit()
    return {"removed": True}


def block_learner(db: Session, learner: Learner, other_id: str, reason: str = "") -> dict:
    if other_id == learner.id:
        raise SocialError(422, "Cannot block yourself.")
    row = (db.query(Block)
           .filter(Block.learner_id == learner.id, Block.blocked_id == other_id)
           .first())
    if row is None:
        db.add(Block(learner_id=learner.id, blocked_id=other_id,
                     reason=(reason or "")[:256]))
    remove_friend(db, learner, other_id)
    return {"blocked": True}


def set_alias(db: Session, learner: Learner, other_id: str, alias: str) -> dict:
    edge = (db.query(Friendship)
            .filter(Friendship.learner_id == learner.id, Friendship.friend_id == other_id)
            .first())
    if edge is None:
        raise SocialError(404, "Not a friend.")
    edge.alias = (alias or "")[:32]
    db.commit()
    return {"alias": edge.alias}


# ── Weekly cooperative goal ──────────────────────────────────────────────────


def join_goal(db: Session, learner: Learner, partner_id: str) -> dict:
    if not _are_friends(db, learner.id, partner_id):
        raise SocialError(409, "You can only start a goal with an accepted friend.")
    week = week_key()
    pk = pair_key(learner.id, partner_id)
    goal = (db.query(FriendGoal)
            .filter(FriendGoal.week == week, FriendGoal.pair_key == pk)
            .first())
    if goal is None:
        a, b = sorted([learner.id, partner_id])
        goal = FriendGoal(week=week, pair_key=pk, learner_a=a, learner_b=b)
        db.add(goal)
        db.commit()
    return goal_view(db, learner)


def credit_round(db: Session, learner: Learner, session_ref: str, partner_id: str | None = None) -> dict:
    """Credit a finished round to every active goal the learner is part of
    this week (opt-in). Idempotent per (goal, session); daily cap 5 per
    person; each player needs at least five of the twenty."""
    week = week_key()
    goals = (db.query(FriendGoal)
             .filter(FriendGoal.week == week,
                     FriendGoal.status == "active")
             .filter((FriendGoal.learner_a == learner.id) | (FriendGoal.learner_b == learner.id))
             .all())
    credited = []
    from app.services.play.boards import ist_now
    today = ist_now().date().isoformat()
    for goal in goals:
        days = (db.query(FriendGoalRound)
                .filter(FriendGoalRound.goal_id == goal.id,
                        FriendGoalRound.learner_id == learner.id,
                        FriendGoalRound.day == today)
                .count())
        if days >= GOAL_MAX_PER_PERSON_DAY:
            continue
        dup = (db.query(FriendGoalRound)
               .filter(FriendGoalRound.goal_id == goal.id,
                       FriendGoalRound.session_ref == session_ref)
               .first())
        if dup is not None:
            continue
        db.add(FriendGoalRound(goal_id=goal.id, learner_id=learner.id,
                               day=today, session_ref=session_ref))
        if goal.learner_a == learner.id:
            goal.rounds_a += 1
            mine, theirs = goal.rounds_a, goal.rounds_b
        else:
            goal.rounds_b += 1
            mine, theirs = goal.rounds_b, goal.rounds_a
        total = goal.rounds_a + goal.rounds_b
        if total >= GOAL_ROUNDS_TOTAL and goal.rounds_a >= GOAL_MIN_EACH \
                and goal.rounds_b >= GOAL_MIN_EACH:
            goal.status = "completed"
            goal.completed_at = _now()
            grant = (db.query(CosmeticGrant)
                     .filter(CosmeticGrant.learner_id == goal.learner_a,
                             CosmeticGrant.item_key == goal.reward_key).first())
            if grant is None:
                db.add(CosmeticGrant(learner_id=goal.learner_a, item_key=goal.reward_key,
                                     source="friend-goal"))
            grant = (db.query(CosmeticGrant)
                     .filter(CosmeticGrant.learner_id == goal.learner_b,
                             CosmeticGrant.item_key == goal.reward_key).first())
            if grant is None:
                db.add(CosmeticGrant(learner_id=goal.learner_b, item_key=goal.reward_key,
                                     source="friend-goal"))
        credited.append({"goal_id": goal.id, "mine": mine,
                         "partner": theirs, "total": total})
    db.commit()
    return {"credited": credited}


def goal_view(db: Session, learner: Learner) -> dict | None:
    """This week's goal for the learner, or None before they opt in."""
    week = week_key()
    goal = (db.query(FriendGoal)
            .filter(FriendGoal.week == week)
            .filter((FriendGoal.learner_a == learner.id) | (FriendGoal.learner_b == learner.id))
            .first())
    if goal is None:
        return None
    names = {l.id: l.display_name for l in
             db.query(Learner).filter(Learner.id.in_([goal.learner_a, goal.learner_b])).all()}
    mine = goal.rounds_a if goal.learner_a == learner.id else goal.rounds_b
    theirs = goal.rounds_b if goal.learner_a == learner.id else goal.rounds_a
    partner_id = goal.learner_b if goal.learner_a == learner.id else goal.learner_a
    return {
        "week": week, "goal_id": goal.id,
        "partner": {"learner_id": partner_id, "name": names.get(partner_id, "Friend")},
        "mine": mine, "partner_rounds": theirs,
        "total": goal.rounds_a + goal.rounds_b,
        "target": GOAL_ROUNDS_TOTAL, "min_each": GOAL_MIN_EACH,
        "max_per_day": GOAL_MAX_PER_PERSON_DAY,
        "status": goal.status,
        "reward": {"key": goal.reward_key, "kind": "badge"},
    }
