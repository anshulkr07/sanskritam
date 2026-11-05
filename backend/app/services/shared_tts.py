"""Reusable public verse audio. Never publish arbitrary learner input."""
import asyncio
import base64
import hashlib
import json
import logging

from sqlalchemy import or_

from app.config import settings
from app.models import Shloka
from app.schemas import TTSResponse
from app.services.storage import get_storage

logger = logging.getLogger("shabd.shared_tts")


def asset_path(db, req, language):
    if (settings.tts_cache_max_bytes <= 0 or settings.audio_storage != "r2"
            or not settings.r2_base_url):
        return None
    # surface is supplied by the client and cannot authorize public storage.
    # Match server-held public content exactly; never names, chats or recordings.
    public = db.query(Shloka.id).filter(or_(
        Shloka.devanagari == req.text, Shloka.translation_en == req.text,
        Shloka.translation_hi == req.text,
    )).first()
    if public is None:
        return None
    identity = ["bulbul:v3", 22050, "wav", req.text, language, req.speaker, req.pace]
    digest = hashlib.sha256(json.dumps(identity, ensure_ascii=False).encode()).hexdigest()
    return f"tts/v1/{digest}.wav"


async def load(path, prefer_url):
    if not path:
        return None
    try:
        storage = get_storage()
        if not storage.url(path).startswith(settings.r2_base_url.rstrip("/") + "/"):
            return None
        if not await asyncio.to_thread(storage.exists, path):
            return None
        if prefer_url:
            return TTSResponse(audio_url=storage.url(path))
        data = await asyncio.to_thread(storage.read, path)
        return TTSResponse(audio_base64=base64.b64encode(data).decode("ascii"))
    except Exception:
        logger.warning("Shared audio lookup unavailable; using normal speech delivery")
        return None


async def publish(path, audio, prefer_url):
    if path:
        try:
            storage = get_storage()
            if not storage.url(path).startswith(settings.r2_base_url.rstrip("/") + "/"):
                return TTSResponse(audio_base64=audio)
            data = base64.b64decode(audio, validate=True)
            await asyncio.to_thread(storage.store, data, path, "audio/wav")
            if prefer_url:
                return TTSResponse(audio_url=storage.url(path))
        except Exception:
            logger.warning("Shared audio storage unavailable; returning inline audio")
    return TTSResponse(audio_base64=audio)
