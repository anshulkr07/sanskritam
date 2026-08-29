"""Speech endpoints: POST /speech/tts, POST /speech/stt."""

import logging

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.auth import require_learner
from app.db import get_db
from app.models import Learner
from app.schemas import TTSRequest, TTSResponse, STTResponse
from app.services.sarvam import SarvamError, get_sarvam_client

logger = logging.getLogger("shabd.speech")

router = APIRouter(prefix="/speech")


@router.post("/tts", response_model=TTSResponse)
async def text_to_speech(
    req: TTSRequest,
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """Generate bridge-language audio from text via Sarvam Bulbul v3."""
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
        raise HTTPException(status_code=502, detail=f"TTS service error: {exc.detail}")

    return TTSResponse(audio_base64=audio_b64)


@router.post("/stt", response_model=STTResponse)
async def speech_to_text(
    file: UploadFile = File(...),
    language_code: str = Form("sa-IN"),
    mode: str = Form("transcribe"),
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """Transcribe learner audio to text via Sarvam Saaras v3."""
    try:
        client = get_sarvam_client()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    audio_data = await file.read()
    if not audio_data:
        raise HTTPException(status_code=400, detail="Empty audio file")

    try:
        result = await client.speech_to_text(
            audio_data=audio_data,
            language_code=language_code,
            mode=mode,
            filename=file.filename or "audio.wav",
        )
    except SarvamError as exc:
        logger.error("Sarvam STT failed: %s", exc)
        raise HTTPException(status_code=502, detail=f"STT service error: {exc.detail}")

    return STTResponse(**result)
