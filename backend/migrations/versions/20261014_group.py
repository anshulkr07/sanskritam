"""Community tables. Frozen schema, SQLite and PostgreSQL."""

from alembic import op

revision = "20261014_group"
down_revision = "d5e6f7a8b9c0"
branch_labels = None
depends_on = None
from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Text,
    Integer,
    Boolean,
    DateTime,
    ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase
import uuid


class Base(DeclarativeBase):
    pass


def _uuid():
    return uuid.uuid4().hex[:16]


from sqlalchemy import Table

Table("learners", Base.metadata, Column("id", String(64), primary_key=True))


def now():
    return datetime.utcnow()


class CommunityProfile(Base):
    __tablename__ = "community_profiles"
    user_id = Column(
        String(64), ForeignKey("learners.id", ondelete="CASCADE"), primary_key=True
    )
    level = Column(String(16), nullable=False, default="beginner")
    bio = Column(String(280), nullable=False, default="")
    last_seen = Column(DateTime, default=now, nullable=False)


class CommunityConversation(Base):
    __tablename__ = "community_conversations"
    id = Column(String(32), primary_key=True, default=_uuid)
    kind = Column(String(8), nullable=False)
    pair_key = Column(String(140), unique=True, nullable=True)
    name = Column(String(80), nullable=False, default="")
    description = Column(String(500), nullable=False, default="")
    topic = Column(String(80), nullable=False, default="")
    level = Column(String(16), nullable=False, default="all")
    public = Column(Boolean, nullable=False, default=False)
    creator_id = Column(String(64), ForeignKey("learners.id"), nullable=False)
    call_id = Column(String(64), nullable=True)
    call_caller_id = Column(String(64), nullable=True)
    call_started_at = Column(DateTime, nullable=True)
    last_text = Column(String(160), nullable=False, default="")
    updated_at = Column(DateTime, nullable=False, default=now, index=True)


class CommunityMember(Base):
    __tablename__ = "community_members"
    conversation_id = Column(
        String(32),
        ForeignKey("community_conversations.id", ondelete="CASCADE"),
        primary_key=True,
    )
    user_id = Column(
        String(64), ForeignKey("learners.id", ondelete="CASCADE"), primary_key=True
    )
    role = Column(String(12), nullable=False, default="member")
    last_read_id = Column(Integer, nullable=False, default=0)


class CommunityMessage(Base):
    __tablename__ = "community_messages"
    id = Column(Integer, primary_key=True, autoincrement=True)
    conversation_id = Column(
        String(32),
        ForeignKey("community_conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sender_id = Column(String(64), ForeignKey("learners.id"), nullable=False)
    client_id = Column(String(64), nullable=False)
    kind = Column(String(8), nullable=False, default="text")
    content = Column(Text, nullable=False, default="")
    media_id = Column(String(32), ForeignKey("community_media.id"), nullable=True)
    reply_to = Column(Integer, ForeignKey("community_messages.id"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=now)
    __table_args__ = (
        UniqueConstraint("sender_id", "client_id", name="uq_community_message_retry"),
    )


class CommunityMedia(Base):
    __tablename__ = "community_media"
    id = Column(String(32), primary_key=True, default=_uuid)
    conversation_id = Column(
        String(32),
        ForeignKey("community_conversations.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id = Column(String(64), ForeignKey("learners.id"), nullable=False)
    key = Column(String(240), nullable=False, unique=True)
    mime = Column(String(48), nullable=False)
    size = Column(Integer, nullable=False)
    duration = Column(Integer, nullable=False, default=0)
    expires_at = Column(DateTime, nullable=False)


class CommunityRoom(Base):
    __tablename__ = "community_rooms"
    id = Column(String(32), primary_key=True, default=_uuid)
    title = Column(String(80), nullable=False)
    topic = Column(String(160), nullable=False, default="")
    level = Column(String(16), nullable=False, default="all")
    host_id = Column(String(64), ForeignKey("learners.id"), nullable=False)
    status = Column(String(12), nullable=False, default="live")
    heartbeat = Column(DateTime, nullable=False, default=now)
    created_at = Column(DateTime, nullable=False, default=now)


class CommunityEvent(Base):
    """Durable invalidations: websocket delivery works across API workers."""

    __tablename__ = "community_events"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        String(64),
        ForeignKey("learners.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    created_at = Column(DateTime, nullable=False, default=now)


class CommunityTicket(Base):
    __tablename__ = "community_tickets"
    id = Column(String(64), primary_key=True)
    user_id = Column(
        String(64), ForeignKey("learners.id", ondelete="CASCADE"), nullable=False
    )
    expires_at = Column(DateTime, nullable=False)


def upgrade():
    bind = op.get_bind()
    for table in Base.metadata.sorted_tables:
        if table.name != "learners":
            table.create(bind)
            if bind.dialect.name == "postgresql":
                from sqlalchemy import text

                bind.execute(
                    text(f'ALTER TABLE "{table.name}" ENABLE ROW LEVEL SECURITY')
                )
                for role in ("anon", "authenticated"):
                    if bind.execute(
                        text("SELECT 1 FROM pg_roles WHERE rolname=:role"),
                        {"role": role},
                    ).scalar():
                        bind.execute(
                            text(f'REVOKE ALL ON TABLE "{table.name}" FROM "{role}"')
                        )


def downgrade():
    bind = op.get_bind()
    for table in reversed(Base.metadata.sorted_tables):
        if table.name != "learners":
            table.drop(bind)
