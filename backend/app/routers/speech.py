"""Speech endpoints: POST /speech/tts, POST /speech/stt."""

import logging

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.auth import require_learner
from app.db import get_db
from app.models import Learner
from app.schemas import TTSRequest, TTSResponse, STTResponse
from app.services.sarvam import SarvamError, get_sarvam_client
from app.services.quota import QuotaExceeded, check_and_consume, refund_quota

logger = logging.getLogger("shabd.speech")

router = APIRouter(prefix="/speech")


@router.post("/tts", response_model=TTSResponse)
async def text_to_speech(
    req: TTSRequest,
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """Generate bridge-language audio from text via Sarvam Bulbul v3.

    Quota is checked and consumed BEFORE the Sarvam call.
    """
    # Check quota first — fail fast before any network call
    try:
        check_and_consume(db, learner, "tts_chars", len(req.text), surface=req.surface)
    except QuotaExceeded as exc:
        raise HTTPException(
            status_code=429,
            detail={
                "detail": f"TTS quota exceeded: {exc.used:.0f}/{exc.limit:.0f} chars used in rolling window. Retry after {exc.retry_after_s}s.",
                "kind": exc.kind,
                "used": exc.used,
                "limit": exc.limit,
                "retry_after_s": exc.retry_after_s,
            },
            headers={"Retry-After": str(exc.retry_after_s)},
        )

    try:
        client = get_sarvam_client()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    try:
        audio_b64 = await client.text_to_speech(
            text=req.text,
            language_code=req.language_code,
            speaker=req.speaker,
            pace=req.pace,
        )
    except SarvamError as exc:
        logger.error("Sarvam TTS failed: %s", exc)
        refund_quota(db, learner, "tts_chars", len(req.text), surface=req.surface, reason="downstream_failure")
        raise HTTPException(status_code=502, detail=f"TTS service error: {exc.detail}")

    return TTSResponse(audio_base64=audio_b64)


@router.post("/stt", response_model=STTResponse)
async def speech_to_text(
    file: UploadFile = File(...),
    language_code: str = Form("sa-IN"),
    mode: str = Form("transcribe"),
    surface: str = Form(""),
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """Transcribe learner audio to text via Sarvam Saaras v3.

    Quota is checked and consumed BEFORE the Sarvam call.
    STT seconds estimated from byte length assuming 16-bit 16kHz mono WAV
    (len(audio_data) / (16000 * 2)).

    Privacy: audio_data is read into memory and passed to Sarvam for STT, then
    discarded.  It is NEVER written to disk or stored in the DB.  The derived
    transcript and verdict are kept; the raw recording is not retained.
    See retain_raw_audio in config.py for the opt-in override (default: False).
    """
    audio_data = await file.read()
    if not audio_data:
        raise HTTPException(status_code=400, detail="Empty audio file")

    # Estimate STT seconds: 16-bit 16kHz mono = 2 bytes per sample * 16000 samples/sec
    # So duration_sec = total_bytes / (16000 * 2)
    estimated_seconds = len(audio_data) / (16000 * 2)

    # Check quota first — fail fast before any network call
    try:
        check_and_consume(db, learner, "stt_seconds", estimated_seconds, surface=surface)
    except QuotaExceeded as exc:
        raise HTTPException(
            status_code=429,
            detail={
                "detail": f"STT quota exceeded: {exc.used:.0f}/{exc.limit:.0f} seconds used in rolling window. Retry after {exc.retry_after_s}s.",
                "kind": exc.kind,
                "used": exc.used,
                "limit": exc.limit,
                "retry_after_s": exc.retry_after_s,
            },
            headers={"Retry-After": str(exc.retry_after_s)},
        )

    try:
        client = get_sarvam_client()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    try:
        result = await client.speech_to_text(
            audio_data=audio_data,
            language_code=language_code,
            mode=mode,
            filename=file.filename or "audio.wav",
        )
    except SarvamError as exc:
        logger.error("Sarvam STT failed: %s", exc)
        refund_quota(db, learner, "stt_seconds", estimated_seconds, surface=surface, reason="downstream_failure")
        raise HTTPException(status_code=502, detail=f"STT service error: {exc.detail}")

    return STTResponse(**result)