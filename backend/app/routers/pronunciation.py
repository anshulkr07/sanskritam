"""Pronunciation endpoint: POST /pronunciation/attempt.

Records a learner's pronunciation attempt, scores it, and persists.
"""

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.auth import require_learner
from app.db import get_db
from app.models import Learner, PronunciationAttempt
from app.services.pronunciation import score_pronunciation
from app.services.quota import QuotaExceeded, check_and_consume, refund_quota
from app.services.sarvam import SarvamError, get_sarvam_client

logger = logging.getLogger("shabd.pronunciation")

router = APIRouter(prefix="/pronunciation")


@router.post("/attempt")
async def pronunciation_attempt(
    file: UploadFile = File(...),
    target: str = Form(...),
    target_iast: str = Form(""),
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """Record a pronunciation attempt on an akṣara.

    Steps:
    1. Consume STT quota (surface='varnamala')
    2. Transcribe via Saaras with language_code='sa-IN'
    3. Score via the pronunciation service
    4. Persist the attempt
    5. Discard audio bytes (privacy — P1-4)
    """
    # Read audio
    audio_data = await file.read()
    if not audio_data:
        raise HTTPException(status_code=400, detail="Empty audio file")

    # Estimate STT seconds for quota
    estimated_seconds = len(audio_data) / (16000 * 2)

    # Check quota first
    try:
        check_and_consume(db, learner, "stt_seconds", estimated_seconds, surface="varnamala")
    except QuotaExceeded as exc:
        raise HTTPException(
            status_code=429,
            detail={
                "detail": f"STT quota exceeded: {exc.used:.0f}/{exc.limit:.0f} seconds.",
                "kind": exc.kind,
                "used": exc.used,
                "limit": exc.limit,
                "retry_after_s": exc.retry_after_s,
            },
            headers={"Retry-After": str(exc.retry_after_s)},
        )

    # Transcribe
    try:
        client = get_sarvam_client()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    try:
        stt_result = await client.speech_to_text(
            audio_data=audio_data,
            language_code="sa-IN",
            mode="transcribe",
            filename=file.filename or "audio.wav",
        )
    except SarvamError as exc:
        logger.error("Sarvam STT failed: %s", exc)
        refund_quota(db, learner, "stt_seconds", estimated_seconds, surface="varnamala", reason="downstream_failure")
        raise HTTPException(status_code=502, detail=f"STT service error: {exc.detail}")

    transcript = stt_result.get("transcript", "")

    # Score
    scoring = score_pronunciation(target, transcript)

    # Persist
    attempt = PronunciationAttempt(
        learner_id=learner.id,
        target=target,
        target_iast=target_iast,
        transcript=transcript,
        verdict=scoring["verdict"],
        contrast=scoring.get("contrast", ""),
        confidence=scoring.get("confidence", 0.0),
        abstained=scoring.get("abstained", False),
    )
    db.add(attempt)
    db.flush()
    # Real practice for the goal bar + calendar (unsure earns nothing).
    from app.services.activity import PRONUNCIATION_XP, record_activity
    record_activity(
        db,
        learner,
        xp=0 if scoring.get("abstained") else PRONUNCIATION_XP.get(scoring["verdict"], 0),
        pronunciation_attempts=1,
    )
    db.commit()
    db.refresh(attempt)

    # unsure never changes streak
    streak_changed = scoring["verdict"] not in ("unsure",)

    return {
        "verdict": scoring["verdict"],
        "transcript": transcript,
        "contrast": scoring.get("contrast", ""),
        "confidence": scoring.get("confidence", 0.0),
        "abstained": scoring.get("abstained", False),
        "diagnosis": scoring.get("diagnosis", ""),
        "streak_changed": streak_changed,
    }