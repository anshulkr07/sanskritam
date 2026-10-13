"""Seed the Play game content (handover_games_daily_multiplayer §10).

Idempotent: content rows are keyed by (content_id, version); the seeder
inserts missing rows, and updates the body of draft/validated rows so content
fixes flow on boot. Rows already marked "reviewed" are never overwritten — a
reviewer's sign-off pins the item until it is explicitly retired or bumped.

Also seeds the cosmetic catalogue (earned-only metadata; no purchasable
points, no competitive advantages).
"""

from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from app.models import CosmeticItem, GameContent

logger = logging.getLogger("shabd.seed")

GAME_CONTENT_VERSION = 1


def seed_game_content(db: Session) -> None:
    from app.seeds.game_content_seed import (
        CONCEPTS, LETTERS, WORD_GROUPS_BOARDS, build_pada_path_prompts,
    )
    from app.seeds.game_image_map import CONCEPT_IMAGES
    from app.services.iast import to_iast

    rows: list[GameContent] = []

    def _iast(sa: str) -> str:
        try:
            return to_iast(sa)
        except Exception:
            return ""

    existing = {(r.content_id, r.version): r for r in
                db.query(GameContent).filter(GameContent.version == GAME_CONTENT_VERSION).all()}

    def upsert(content_id: str, game: str, kind: str, difficulty: str,
               topic: str, lang: str, body: dict, sources: list | None = None) -> None:
        key = (content_id, GAME_CONTENT_VERSION)
        row = existing.get(key)
        if row is not None:
            if row.status in ("draft", "validated"):
                row.body = body  # content fixes flow while unreviewed
            return
        db.add(GameContent(
            content_id=content_id, game=game, kind=kind,
            version=GAME_CONTENT_VERSION, status="validated",
            topic=topic, difficulty=difficulty, lang=lang,
            body=body, sources=sources or [],
        ))

    for c in CONCEPTS:
        body = {**c, "iast": c.get("iast") or _iast(c["sa"]),
                # Ultra-confident LearnV2 mappings (see
                # scripts/map_learnv2_images.py); unmapped concepts stay empty
                # and honest — the media gate keeps picture-ranked play off.
                "image": c.get("image") or CONCEPT_IMAGES.get(c["id"], "")}
        upsert(c["id"], "vocab", "concept", c["difficulty"], c["topic"], "sa", body)

    for l in LETTERS:
        upsert(l["id"], "vocab", "concept", "beginner", "letters", "sa", {**l})

    for b in WORD_GROUPS_BOARDS:
        upsert(b["id"], "word-groups", "board",
               b["difficulty"], ",".join(sorted(b.get("topic_labels", {}).keys())),
               "sa", b)

    for p in build_pada_path_prompts():
        if not p.get("meaning"):
            continue
        upsert(p["id"], "pada-path", "prompt", p.get("difficulty", "standard"),
               p.get("topic", "actions"), "sa", p)

    db.flush()
    logger.info("Game content seeded (vocab %d, boards %d, pada-path prompts)",
                len(CONCEPTS), len(WORD_GROUPS_BOARDS))


COSMETICS = [
    {"key": "badgefriendgoal", "kind": "badge", "title": "Friend Goal Badge",
     "sa": "मित्र-लक्ष्म", "description": "Earned by completing a weekly friend goal together.",
     "how_earned": "friend-goal-week"},
    {"key": "badgecompetition", "kind": "badge", "title": "Recitation Medal",
     "sa": "पाठ-पदकम्", "description": "Earned by finishing a recitation competition set.",
     "how_earned": "competition-complete"},
    {"key": "packnumerals", "kind": "pack", "title": "Number Builder Pack",
     "sa": "सङ्ख्या-सम्पदा", "description": "Extra Number Builder practice sets.",
     "how_earned": "ranked-milestone"},
    {"key": "themegolden", "kind": "theme", "title": "Golden Board",
     "sa": "स्वर्ण-फलकम्", "description": "A warm board theme for the game collection.",
     "how_earned": "streak-30"},
]


def seed_cosmetics(db: Session) -> None:
    for c in COSMETICS:
        row = db.query(CosmeticItem).filter(CosmeticItem.key == c["key"]).first()
        if row is None:
            db.add(CosmeticItem(**c))
        else:
            for k, v in c.items():
                setattr(row, k, v)
