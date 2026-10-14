"""P20 — writing practice endpoints.

``GET  /writing/items`` — the drill corpus (tier 1/2/3), IAST included
(P7-13-derived, so the reading crutch is correct for the learner who cannot
yet read Devanagari).

``POST /writing/attempt`` — record one handwriting attempt. P20-3 contract:
the body carries {item_id, recognised_text, confidence, source} — NEVER the
strokes and NEVER an image (§2.16). The verdict is three-valued
(correct|wrong|unsure); `unsure` provably cannot lower mastery or break a
streak, and this router enforces that by never calling the streak/mastery
path except on `correct`.

P20-4: the photo path (source='photo') biases hard toward `unsure` via the
configured thresholds; abstention rates are reported per source in
GET /admin/metrics.

``POST /writing/photo-check`` — a photographed letter or word, read on the
server by Sarvam Document Intelligence (2026-09-30). This is the ONE path where
an image leaves the phone, and only because the learner chose to check a photo:
it is held in memory, sent to Sarvam, and discarded; the attempt row keeps only
the recognised text. The image is the raw request body (``?item_id=`` in the
query), not multipart: Starlette spools multipart uploads over 1 MB to a temp
file on disk, and "the image never touches disk" is part of the privacy policy.
The app falls back to reading the photo on the device when this is unavailable.
"""

from __future__ import annotations

import logging
import unicodedata

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import require_learner
from app.config import settings
from app.db import get_db
from app.models import Learner, WritingAttempt, WritingItem
from app.services.quota import QuotaExceeded, check_and_consume, refund_quota
from app.services.sarvam import SarvamError, get_sarvam_client
from app.services.writing import grade_writing

logger = logging.getLogger("shabd.writing")

router = APIRouter(prefix="/writing")


class WritingAttemptRequest(BaseModel):
    item_id: str
    recognised_text: str = Field(default="", description="On-device ML Kit output — never the strokes, never the image")
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    source: str = Field(default="ink", description="'ink' | 'photo'")


class WritingAttemptResponse(BaseModel):
    verdict: str                 # correct | wrong | unsure
    abstained: bool
    item_id: str
    item_devanagari: str
    item_iast: str
    attempt_id: int | None = None


class WritingPhotoResponse(WritingAttemptResponse):
    recognised_text: str = ""    # what Sarvam read, shown to the learner ("We read: ...")


class WritingItemResponse(BaseModel):
    id: str
    tier: int
    sort_order: int
    devanagari: str
    iast: str
    gloss: str
    stroke_paths: list = []
    challenge_id: str | None = None


@router.get("/items", response_model=list[WritingItemResponse])
def list_writing_items(
    tier: int | None = None,
    _learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """The writing drill corpus, ordered tier then teaching order."""
    from app.seeds.writing_paths import writing_paths
    q = db.query(WritingItem)
    if tier is not None:
        q = q.filter(WritingItem.tier == tier)
    rows = q.order_by(WritingItem.tier, WritingItem.sort_order).all()
    return [
        WritingItemResponse(
            id=r.id,
            tier=r.tier,
            sort_order=r.sort_order,
            devanagari=r.devanagari,
            iast=r.iast or "",
            gloss=r.gloss or "",
            stroke_paths=writing_paths(r.devanagari),
            challenge_id=r.challenge_id,
        )
        for r in rows
    ]


def _record_attempt(
    db: Session,
    learner: Learner,
    item: WritingItem,
    recognised_text: str,
    confidence: float,
    source: str,
) -> tuple[dict, WritingAttempt]:
    """Grade and persist one writing attempt (P20-3), for every source.

    §2.2 enforcement, structurally: the streak/mastery path is reachable ONLY
    from the `correct` branch — there is no code path by which `unsure` can
    penalise, because none exists.
    """
    scoring = grade_writing(item.devanagari, recognised_text, confidence, source)

    attempt = WritingAttempt(
        learner_id=learner.id,
        item_id=item.id,
        recognised_text=(recognised_text or "")[:128],
        confidence=confidence,
        source=source,
        verdict=scoring["verdict"],
        abstained=scoring["abstained"],
    )
    db.add(attempt)
    db.flush()
    # Real practice for the goal bar + calendar.
    from app.services.activity import WRITING_XP, record_activity
    record_activity(
        db,
        learner,
        xp=0 if scoring["abstained"] else WRITING_XP.get(scoring["verdict"], 0),
        attempts=1,
    )
    db.commit()
    db.refresh(attempt)

    # Correct attempts feed handwriting progress — which lives in its OWN
    # column (P23-5). feature_mastery maps feature_id -> float; writing
    # progress maps item-iast -> {attempts, correct}. Mixing them made
    # feature_mastery heterogeneous and broke every float() reader.
    if scoring["verdict"] == "correct":
        writing = dict(learner.writing_mastery or {})
        # Lazy migration: rows written before P23-5 carry "write:" dicts in
        # feature_mastery. Move them once, here — this router owns the only
        # writer, so one move point covers every learner.
        mastery = dict(learner.feature_mastery or {})
        legacy = {k: v for k, v in mastery.items()
                  if isinstance(k, str) and k.startswith("write:") and isinstance(v, dict)}
        for k, v in legacy.items():
            short = k[len("write:"):]
            cell = dict(writing.get(short) or {"attempts": 0, "correct": 0})
            cell["attempts"] = int(cell.get("attempts", 0)) + int(v.get("attempts", 0))
            cell["correct"] = int(cell.get("correct", 0)) + int(v.get("correct", 0))
            writing[short] = cell
            del mastery[k]
        if legacy:
            learner.feature_mastery = mastery
        key = item.iast or item.devanagari
        cell = dict(writing.get(key) or {"attempts": 0, "correct": 0})
        cell["attempts"] = int(cell.get("attempts", 0)) + 1
        cell["correct"] = int(cell.get("correct", 0)) + 1
        writing[key] = cell
        learner.writing_mastery = writing
        db.commit()

    return scoring, attempt


@router.post("/attempt", response_model=WritingAttemptResponse)
async def writing_attempt(
    req: WritingAttemptRequest,
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """Grade and persist one writing attempt whose text was read on the device."""
    item = db.get(WritingItem, req.item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Unknown writing item")

    source = req.source if req.source in ("ink", "photo") else "ink"
    scoring, attempt = _record_attempt(db, learner, item, req.recognised_text, req.confidence, source)

    return WritingAttemptResponse(
        verdict=scoring["verdict"],
        abstained=scoring["abstained"],
        item_id=item.id,
        item_devanagari=item.devanagari,
        item_iast=item.iast or "",
        attempt_id=attempt.id,
    )


# ── photo check ──────────────────────────────────────────────────────────────

def normalise_ocr(text: str) -> str:
    """Reduce OCR output to comparable Devanagari letters.

    Sarvam returns Markdown for the page. Keep only Devanagari letters and
    signs (NFC), and drop everything else: spaces, dandas, digits, Markdown and
    HTML, Latin. A photographed word compares as one run of letters.
    """
    text = unicodedata.normalize("NFC", text or "")
    return "".join(
        ch for ch in text
        if "\u0900" <= ch <= "\u097F"
        and ch not in "\u0964\u0965"
        and not ("\u0966" <= ch <= "\u096F")
    )


def image_mime(data: bytes) -> str | None:
    """JPEG or PNG by magic bytes. The header a client sends is not trusted."""
    if data[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    return None


async def _read_capped(request: Request, limit: int) -> bytes:
    """The request body, refusing to buffer more than `limit` bytes."""
    too_big = HTTPException(status_code=413, detail="That photo is too large. Try again with less in frame.")
    declared = request.headers.get("content-length")
    if declared and declared.isdigit() and int(declared) > limit:
        raise too_big
    chunks: list[bytes] = []
    size = 0
    async for chunk in request.stream():
        size += len(chunk)
        if size > limit:
            raise too_big
        chunks.append(chunk)
    return b"".join(chunks)


@router.post("/photo-check", response_model=WritingPhotoResponse)
async def writing_photo_check(
    request: Request,
    item_id: str,
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """Read a photographed letter or word and grade it against the item.

    The body is the image (JPEG or PNG). Sarvam returns text and no confidence,
    so an exact match with the target is reported at
    ``writing_photo_match_confidence`` (above the photo correct floor) and
    anything else at ``writing_photo_miss_confidence`` (below the photo wrong
    floor): a mismatch is `unsure`, never `wrong`.
    """
    item = db.get(WritingItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Unknown writing item")

    data = await _read_capped(request, settings.writing_photo_max_bytes)
    if not data:
        raise HTTPException(status_code=400, detail="Empty photo")
    mime = image_mime(data)
    if mime is None:
        raise HTTPException(status_code=415, detail="Send a JPEG or PNG photo")

    # Ask for the client BEFORE spending quota: no key configured is a 503, not
    # a charge.
    try:
        client = get_sarvam_client()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    try:
        check_and_consume(db, learner, "doc_pages", 1, surface="writing_photo")
    except QuotaExceeded as exc:
        raise HTTPException(
            status_code=429,
            detail="Too many photo checks today. Draw it instead, or try tomorrow.",
            headers={"Retry-After": str(exc.retry_after_s)},
        )

    try:
        text = await client.digitise_image(
            data,
            filename="writing.jpg" if mime == "image/jpeg" else "writing.png",
            mime=mime,
            language_code=settings.sarvam_doc_language,
        )
    except Exception as exc:  # SarvamError, network, a bad zip: all the same to the learner
        # Only the type is logged: never the image, never the text.
        logger.warning("photo-check failed for learner %s: %s", learner.id, type(exc).__name__)
        refund_quota(db, learner, "doc_pages", 1, surface="writing_photo", reason="downstream_failure")
        raise HTTPException(status_code=503, detail="Couldn't read the photo. Try again.")

    recognised = normalise_ocr(text)
    target = normalise_ocr(item.devanagari)
    exact = bool(recognised) and recognised == target
    confidence = settings.writing_photo_match_confidence if exact else settings.writing_photo_miss_confidence

    scoring, attempt = _record_attempt(db, learner, item, recognised, confidence, "photo")
    logger.info(
        "photo-check learner=%s item=%s bytes=%d verdict=%s",
        learner.id, item.id, len(data), scoring["verdict"],
    )
    return WritingPhotoResponse(
        verdict=scoring["verdict"],
        abstained=scoring["abstained"],
        item_id=item.id,
        item_devanagari=item.devanagari,
        item_iast=item.iast or "",
        attempt_id=attempt.id,
        recognised_text=recognised,
    )
