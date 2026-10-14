"""Account deletion for shared conversations, before deleting the learner FK."""

from sqlalchemy import or_
from app.community_models import (
    CommunityProfile as Profile,
    CommunityConversation as Conversation,
    CommunityMember as Member,
    CommunityMessage as Message,
    CommunityMedia as Media,
    CommunityRoom as Room,
    CommunityEvent as Event,
    CommunityTicket as Ticket,
)


def delete_account(db, uid):
    my_cids = [x.conversation_id for x in db.query(Member).filter_by(user_id=uid)]
    remove = []
    for c in (
        db.query(Conversation)
        .filter(or_(Conversation.id.in_(my_cids), Conversation.creator_id == uid))
        .all()
    ):
        remaining = (
            db.query(Member)
            .filter(Member.conversation_id == c.id, Member.user_id != uid)
            .all()
        )
        if c.kind == "direct" or not remaining:
            remove.append(c.id)
        elif c.creator_id == uid:
            remaining[0].role = "admin"
            c.creator_id = remaining[0].user_id
    db.flush()
    gone_ids = [
        m.id
        for m in db.query(Message).filter(
            or_(Message.sender_id == uid, Message.conversation_id.in_(remove))
        )
    ]
    db.query(Message).filter(Message.reply_to.in_(gone_ids)).update(
        {Message.reply_to: None}, synchronize_session=False
    )
    db.query(Message).filter(Message.id.in_(gone_ids)).delete(synchronize_session=False)
    media = (
        db.query(Media)
        .filter(or_(Media.user_id == uid, Media.conversation_id.in_(remove)))
        .all()
    )
    if media:
        try:
            from app.routers.community import object_store

            store, bucket = object_store()
            for row in media:
                store.delete_object(Bucket=bucket, Key=row.key)
        except Exception:
            # The private bucket lifecycle is a second, independent deletion path.
            import logging

            logging.getLogger(__name__).warning(
                "Community media deletion deferred to lifecycle"
            )
    db.query(Media).filter(
        or_(Media.user_id == uid, Media.conversation_id.in_(remove))
    ).delete(synchronize_session=False)
    db.query(Member).filter(
        or_(Member.user_id == uid, Member.conversation_id.in_(remove))
    ).delete(synchronize_session=False)
    db.query(Conversation).filter(Conversation.id.in_(remove)).delete(
        synchronize_session=False
    )
    for model, field in [
        (Room, Room.host_id),
        (Profile, Profile.user_id),
        (Ticket, Ticket.user_id),
        (Event, Event.user_id),
    ]:
        db.query(model).filter(field == uid).delete(synchronize_session=False)
