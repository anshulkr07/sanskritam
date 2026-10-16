"""Speech endpoints: POST /speech/tts, POST /speech/stt."""

import logging
from collections import OrderedDict

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.auth import require_learner
from app.config import settings
from app.db import get_db
from app.models import Learner
from app.schemas import TTSRequest, TTSResponse, STTResponse
from app.services.audio_meta import REST_MAX_SECONDS, audio_seconds, estimate_seconds
from app.services.lang_detect import is_sanskrit_code
from app.services.learner_stt import transcribe_learner
from app.services.sarvam import SarvamError, get_sarvam_client
from app.services.quota import QuotaExceeded, check_and_consume, refund_quota

logger = logging.getLogger("shabd.speech")

from app.commerce.metering import CommerceRoute
router = APIRouter(prefix="/speech", route_class=CommerceRoute)

# Recent TTS audio, newest last. Bulbul is billed per character and the app
# asks for the same text again and again: every learner who taps the verse of
# the day sends the same 150 characters, about 45 paise a time. Per instance
# and in memory, so a new revision starts empty.
_tts_cache: "OrderedDict[tuple[str, str, str, float], str]" = OrderedDict()
_tts_cache_bytes = 0
_tts_cache_stats = {"hits": 0, "misses": 0}


def _tts_cache_get(key: tuple[str, str, str, float]) -> str | None:
    if settings.tts_cache_max_bytes <= 0:
        return None
    audio = _tts_cache.get(key)
    if audio is None:
        _tts_cache_stats["misses"] += 1
        return None
    _tts_cache.move_to_end(key)
    _tts_cache_stats["hits"] += 1
    return audio


def _tts_cache_put(key: tuple[str, str, str, float], audio: str) -> None:
    global _tts_cache_bytes
    limit = settings.tts_cache_max_bytes
    # One clip may take at most a quarter of the room.
    if limit <= 0 or not audio or len(audio) > limit // 4:
        return
    old = _tts_cache.pop(key, None)
    if old is not None:
        _tts_cache_bytes -= len(old)
    _tts_cache[key] = audio
    _tts_cache_bytes += len(audio)
    while _tts_cache_bytes > limit and _tts_cache:
        _, dropped = _tts_cache.popitem(last=False)
        _tts_cache_bytes -= len(dropped)


def tts_cache_metrics() -> dict:
    """Hit rate and size of the TTS cache — surfaced via GET /admin/metrics."""
    total = _tts_cache_stats["hits"] + _tts_cache_stats["misses"]
    return {
        "tts_cache_hits": _tts_cache_stats["hits"],
        "tts_cache_misses": _tts_cache_stats["misses"],
        "tts_cache_hit_rate": round(_tts_cache_stats["hits"] / total, 4) if total else 0.0,
        "tts_cache_entries": len(_tts_cache),
        "tts_cache_bytes": _tts_cache_bytes,
    }


_TOO_LONG = (
    f"Recording is longer than {REST_MAX_SECONDS:.0f} seconds — "
    "speech recognition takes at most that much at a time."
)


@router.post("/tts", response_model=TTSResponse)
async def text_to_speech(
    req: TTSRequest,
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """Generate bridge-language audio from text via Sarvam Bulbul v3.

    Quota is checked and consumed BEFORE the Sarvam call. Audio this instance
    has already made for the same text, voice and pace is served from memory:
    no Sarvam call, so no quota and no spend.

    ``sa-IN`` is accepted and spoken with ``settings.tts_sanskrit_code`` —
    native Sanskrit beta on this account. The app says what the
    text IS; the server decides which voice reads it, so switching Sanskrit to
    its own voice is a config change rather than an app release.
    """
    language_code = req.language_code
    if is_sanskrit_code(language_code):
        language_code = settings.tts_sanskrit_code

    cache_key = (req.text, language_code, req.speaker, req.pace)
    cached = _tts_cache_get(cache_key)
    if cached is not None:
        return TTSResponse(audio_base64=cached)

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
            language_code=language_code,
            speaker=req.speaker,
            pace=req.pace,
        )
    except SarvamError as exc:
        logger.error("Sarvam TTS failed: %s", exc)
        refund_quota(db, learner, "tts_chars", len(req.text), surface=req.surface, reason="downstream_failure")
        raise HTTPException(status_code=502, detail=f"TTS service error: {exc.detail}")

    _tts_cache_put(cache_key, audio_b64)
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
    """Transcribe learner audio to text via Sarvam Saaras.

    ``language_code="unknown"`` asks for auto-detect, and gets it WITHOUT
    losing Sanskrit: saaras:v4 translates spoken Sanskrit into English on
    plain auto-detect, so this runs an auto pass, a Sanskrit pass and a
    codemix pass together — the faithful transcript plus a display string
    (`services/learner_stt.py`). Any other code is one pinned call, as before.

    Quota is checked and consumed BEFORE the Sarvam call, in seconds read
    from the recording's own header (WAV or M4A), else estimated as 16-bit
    16 kHz mono. The learner's allowance is charged once for the recording;
    the service budget is charged for every pass Saaras bills, which is three
    on auto-detect. Recordings past Saaras' 30-second REST ceiling are refused
    with 413 before any quota or vendor call.

    Privacy: audio_data is read into memory and passed to Sarvam for STT, then
    discarded.  It is NEVER written to disk or stored in the DB.  The derived
    transcript and verdict are kept; the raw recording is not retained.
    See retain_raw_audio in config.py for the opt-in override (default: False).
    """
    audio_data = await file.read()
    if not audio_data:
        raise HTTPException(status_code=400, detail="Empty audio file")

    measured = audio_seconds(audio_data)
    if measured is not None and measured > REST_MAX_SECONDS:
        raise HTTPException(status_code=413, detail=_TOO_LONG)
    estimated_seconds = estimate_seconds(audio_data)
    auto_detect = language_code in ("unknown", "") and mode == "transcribe"
    billed_seconds = estimated_seconds * (settings.stt_auto_detect_passes if auto_detect else 1)

    # Check quota first — fail fast before any network call
    try:
        check_and_consume(db, learner, "stt_seconds", estimated_seconds, surface=surface,
                          vendor_amount=billed_seconds)
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

    filename = file.filename or "audio.wav"
    try:
        if auto_detect:
            result = await transcribe_learner(client, audio_data, filename=filename)
        else:
            result = await client.speech_to_text(
                audio_data=audio_data,
                language_code=language_code,
                mode=mode,
                filename=filename,
            )
    except SarvamError as exc:
        logger.error("Sarvam STT failed: %s", exc)
        refund_quota(db, learner, "stt_seconds", estimated_seconds, surface=surface,
                     reason="downstream_failure", vendor_amount=billed_seconds)
        # A format this server cannot measure still reaches Saaras' limit.
        if exc.status_code == 400 and "maximum limit" in (exc.detail or ""):
            raise HTTPException(status_code=413, detail=_TOO_LONG)
        raise HTTPException(status_code=502, detail=f"STT service error: {exc.detail}")

    return STTResponse(
        transcript=result.get("transcript") or "",
        language_code=result.get("language_code") or "",
        language_probability=result.get("language_probability"),
        display=result.get("display") or "",
    )
