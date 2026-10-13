"""Play games v2: sessions, scores, matches, friends, sharing, cosmetics.

Revision ID: d5e6f7a8b9c0
Revises: c4d5e6f7a8b9
Create Date: 2026-10-13

Additive migration for handover_games_daily_multiplayer: reviewed game
content, server-validated game sessions and per-day scores, the combined
daily aggregate, frozen leaderboard snapshots, live matches (rooms, events,
queue, tickets), friends/blocks/weekly cooperative goals, share links and
attribution events, cosmetic metadata. Also adds the multi-shloka columns to
competition_entries (division, piece_results, rules_version) and the rubric-v2
component column to recite_attempts. Historical rows keep their meaning: old
competition entries read as standard division; old recite attempts have NULL
components and are scored exactly as before.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d5e6f7a8b9c0"
down_revision: Union[str, Sequence[str], None] = "c4d5e6f7a8b9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "game_content",
        sa.Column("id", sa.String(length=32), primary_key=True),
        sa.Column("content_id", sa.String(length=64), nullable=False, index=True),
        sa.Column("game", sa.String(length=32), nullable=False, index=True),
        sa.Column("kind", sa.String(length=16), nullable=False, server_default="board"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("status", sa.String(length=12), nullable=False, server_default="draft", index=True),
        sa.Column("topic", sa.String(length=64), nullable=False, server_default="", index=True),
        sa.Column("difficulty", sa.String(length=16), nullable=False, server_default="standard"),
        sa.Column("lang", sa.String(length=8), nullable=False, server_default="sa"),
        sa.Column("body", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("sources", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("reviewer", sa.String(length=64), nullable=False, server_default=""),
        sa.Column("review_notes", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("content_id", "version", name="uq_game_content_id_version"),
    )
    op.create_table(
        "game_sessions",
        sa.Column("id", sa.String(length=32), primary_key=True),
        sa.Column("learner_id", sa.String(length=64), sa.ForeignKey("learners.id"), nullable=False, index=True),
        sa.Column("game", sa.String(length=32), nullable=False, index=True),
        sa.Column("mode", sa.String(length=16), nullable=False, server_default="practice"),
        sa.Column("ruleset", sa.String(length=32), nullable=False, server_default="v1"),
        sa.Column("answer_lang", sa.String(length=8), nullable=False, server_default="sa"),
        sa.Column("allocation_day", sa.String(length=10), nullable=False, server_default="", index=True),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="active", index=True),
        sa.Column("pack", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("pack_ref", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("seed", sa.String(length=32), nullable=False, server_default=""),
        sa.Column("deadline", sa.DateTime(), nullable=True),
        sa.Column("hints_used", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("score", sa.Integer(), nullable=True),
        sa.Column("result", sa.JSON(), nullable=True),
        sa.Column("idempotency_key", sa.String(length=64), nullable=True, index=True),
        sa.Column("match_id", sa.String(length=32), nullable=True, index=True),
        sa.Column("created_at", sa.DateTime(), nullable=True, index=True),
        sa.Column("finished_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("idempotency_key", name="uq_game_session_idempotency"),
    )
    op.create_table(
        "game_day_scores",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("learner_id", sa.String(length=64), sa.ForeignKey("learners.id"), nullable=False, index=True),
        sa.Column("day", sa.String(length=10), nullable=False, index=True),
        sa.Column("game", sa.String(length=32), nullable=False, index=True),
        sa.Column("best_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("attempts_used", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("ruleset", sa.String(length=32), nullable=False, server_default="v1"),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("learner_id", "day", "game", name="uq_game_day_cell"),
    )
    op.create_table(
        "daily_game_points",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("learner_id", sa.String(length=64), sa.ForeignKey("learners.id"), nullable=False, index=True),
        sa.Column("day", sa.String(length=10), nullable=False, index=True),
        sa.Column("total", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("games", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("rounds_done", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("visit_total", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("visit_at", sa.DateTime(), nullable=True),
        sa.Column("computed_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("learner_id", "day", name="uq_daily_game_points"),
    )
    op.create_table(
        "leaderboard_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("period", sa.String(length=10), nullable=False, index=True),
        sa.Column("period_key", sa.String(length=16), nullable=False, index=True),
        sa.Column("board", sa.String(length=32), nullable=False, index=True),
        sa.Column("learner_id", sa.String(length=64), sa.ForeignKey("learners.id"), nullable=False, index=True),
        sa.Column("rank", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("participation", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("computed_at", sa.DateTime(), nullable=True),
    )
    op.create_table(
        "live_matches",
        sa.Column("id", sa.String(length=32), primary_key=True),
        sa.Column("code", sa.String(length=12), nullable=False, server_default="", index=True),
        sa.Column("game", sa.String(length=32), nullable=False),
        sa.Column("kind", sa.String(length=12), nullable=False, server_default="private"),
        sa.Column("ruleset", sa.String(length=32), nullable=False, server_default="casual"),
        sa.Column("answer_lang", sa.String(length=8), nullable=False, server_default="sa"),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="lobby", index=True),
        sa.Column("host_id", sa.String(length=64), nullable=False, server_default=""),
        sa.Column("config", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("state", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("seq", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("round_deadline", sa.DateTime(), nullable=True),
        sa.Column("result", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )
    op.create_table(
        "match_participants",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("match_id", sa.String(length=32), sa.ForeignKey("live_matches.id"), nullable=False, index=True),
        sa.Column("learner_id", sa.String(length=64), sa.ForeignKey("learners.id"), nullable=False, index=True),
        sa.Column("alias", sa.String(length=32), nullable=False, server_default=""),
        sa.Column("is_host", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("ready", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("connected", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("progress", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("state", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("forfeited", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("joined_at", sa.DateTime(), nullable=True),
        sa.Column("last_seen", sa.DateTime(), nullable=True),
        sa.Column("left_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("match_id", "learner_id", name="uq_match_participant"),
    )
    op.create_table(
        "match_events",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("match_id", sa.String(length=32), sa.ForeignKey("live_matches.id"), nullable=False, index=True),
        sa.Column("seq", sa.Integer(), nullable=False),
        sa.Column("type", sa.String(length=24), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("actor", sa.String(length=64), nullable=False, server_default="system"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("match_id", "seq", name="uq_match_event_seq"),
    )
    op.create_table(
        "match_queue",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("learner_id", sa.String(length=64), sa.ForeignKey("learners.id"), nullable=False, index=True),
        sa.Column("game", sa.String(length=32), nullable=False),
        sa.Column("ruleset", sa.String(length=32), nullable=False, server_default="casual"),
        sa.Column("answer_lang", sa.String(length=8), nullable=False, server_default="sa"),
        sa.Column("band", sa.String(length=16), nullable=False, server_default="open"),
        sa.Column("status", sa.String(length=12), nullable=False, server_default="waiting", index=True),
        sa.Column("match_id", sa.String(length=32), nullable=True),
        sa.Column("enqueued_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_match_queue_waiting", "match_queue", ["game", "status"])
    op.create_table(
        "match_tickets",
        sa.Column("id", sa.String(length=48), primary_key=True),
        sa.Column("learner_id", sa.String(length=64), sa.ForeignKey("learners.id"), nullable=False, index=True),
        sa.Column("match_id", sa.String(length=32), nullable=True, index=True),
        sa.Column("scope", sa.String(length=24), nullable=False, server_default="match"),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("used_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_table(
        "friendships",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("learner_id", sa.String(length=64), sa.ForeignKey("learners.id"), nullable=False, index=True),
        sa.Column("friend_id", sa.String(length=64), sa.ForeignKey("learners.id"), nullable=False, index=True),
        sa.Column("status", sa.String(length=12), nullable=False, server_default="pending"),
        sa.Column("requested_by", sa.String(length=64), nullable=False, server_default=""),
        sa.Column("alias", sa.String(length=32), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("responded_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("learner_id", "friend_id", name="uq_friendship_edge"),
    )
    op.create_table(
        "blocks",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("learner_id", sa.String(length=64), sa.ForeignKey("learners.id"), nullable=False, index=True),
        sa.Column("blocked_id", sa.String(length=64), sa.ForeignKey("learners.id"), nullable=False, index=True),
        sa.Column("reason", sa.String(length=256), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("learner_id", "blocked_id", name="uq_block_edge"),
    )
    op.create_table(
        "friend_goals",
        sa.Column("id", sa.String(length=32), primary_key=True),
        sa.Column("week", sa.String(length=12), nullable=False, index=True),
        sa.Column("pair_key", sa.String(length=132), nullable=False, index=True),
        sa.Column("learner_a", sa.String(length=64), sa.ForeignKey("learners.id"), nullable=False),
        sa.Column("learner_b", sa.String(length=64), sa.ForeignKey("learners.id"), nullable=False),
        sa.Column("rounds_a", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("rounds_b", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(length=12), nullable=False, server_default="active"),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("reward_key", sa.String(length=64), nullable=False, server_default="badgefriendgoal"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("week", "pair_key", name="uq_friend_goal_week_pair"),
    )
    op.create_table(
        "friend_goal_rounds",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("goal_id", sa.String(length=32), sa.ForeignKey("friend_goals.id"), nullable=False, index=True),
        sa.Column("learner_id", sa.String(length=64), sa.ForeignKey("learners.id"), nullable=False, index=True),
        sa.Column("day", sa.String(length=10), nullable=False),
        sa.Column("session_ref", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("goal_id", "session_ref", name="uq_friend_goal_round"),
    )
    op.create_table(
        "share_links",
        sa.Column("code", sa.String(length=24), primary_key=True),
        sa.Column("learner_id", sa.String(length=64), sa.ForeignKey("learners.id"), nullable=False, index=True),
        sa.Column("kind", sa.String(length=24), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
        sa.Column("revoked", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("opens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("max_opens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_table(
        "link_events",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("code", sa.String(length=24), nullable=False, server_default="", index=True),
        sa.Column("event", sa.String(length=24), nullable=False),
        sa.Column("learner_id", sa.String(length=64), nullable=True, index=True),
        sa.Column("meta", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(), nullable=True, index=True),
    )
    op.create_table(
        "cosmetic_items",
        sa.Column("key", sa.String(length=64), primary_key=True),
        sa.Column("kind", sa.String(length=16), nullable=False, server_default="badge"),
        sa.Column("title", sa.String(length=64), nullable=False, server_default=""),
        sa.Column("sa", sa.String(length=64), nullable=False, server_default=""),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("how_earned", sa.String(length=128), nullable=False, server_default=""),
        sa.Column("entitlement_feature", sa.String(length=32), nullable=False, server_default=""),
        sa.Column("active", sa.Boolean(), nullable=False, server_default="1"),
    )
    op.create_table(
        "cosmetic_grants",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("learner_id", sa.String(length=64), sa.ForeignKey("learners.id"), nullable=False, index=True),
        sa.Column("item_key", sa.String(length=64), sa.ForeignKey("cosmetic_items.key"), nullable=False),
        sa.Column("source", sa.String(length=32), nullable=False, server_default="goal"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("learner_id", "item_key", name="uq_cosmetic_grant"),
    )
    # Additive columns on existing tables.
    op.add_column("competition_entries", sa.Column("division", sa.String(length=16), nullable=False, server_default="standard"))
    op.add_column("competition_entries", sa.Column("piece_results", sa.JSON(), nullable=False, server_default="{}"))
    op.add_column("competition_entries", sa.Column("rules_version", sa.String(length=32), nullable=False, server_default=""))
    op.add_column("recite_attempts", sa.Column("components", sa.JSON(), nullable=True))
    # Recitation calibration study (§8): consented labelled recordings.
    op.create_table(
        "recite_calibrations",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("learner_id", sa.String(length=64), sa.ForeignKey("learners.id"), nullable=False, index=True),
        sa.Column("speaker_alias", sa.String(length=32), nullable=False, server_default=""),
        sa.Column("device", sa.String(length=32), nullable=False, server_default=""),
        sa.Column("prompt_id", sa.String(length=32), nullable=False),
        sa.Column("label", sa.String(length=16), nullable=False, server_default="clean"),
        sa.Column("consent", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("audio_key", sa.String(length=512), nullable=False, server_default=""),
        sa.Column("duration_ms", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("note", sa.String(length=256), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("recite_calibrations")
    op.drop_column("recite_attempts", "components")
    op.drop_column("competition_entries", "rules_version")
    op.drop_column("competition_entries", "piece_results")
    op.drop_column("competition_entries", "division")
    op.drop_table("cosmetic_grants")
    op.drop_table("cosmetic_items")
    op.drop_table("link_events")
    op.drop_table("share_links")
    op.drop_table("friend_goal_rounds")
    op.drop_table("friend_goals")
    op.drop_table("blocks")
    op.drop_table("friendships")
    op.drop_table("match_tickets")
    op.drop_index("ix_match_queue_waiting", table_name="match_queue")
    op.drop_table("match_queue")
    op.drop_table("match_events")
    op.drop_table("match_participants")
    op.drop_table("live_matches")
    op.drop_table("leaderboard_snapshots")
    op.drop_table("daily_game_points")
    op.drop_table("game_day_scores")
    op.drop_table("game_sessions")
    op.drop_table("game_content")
