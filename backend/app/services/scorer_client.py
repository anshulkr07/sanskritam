"""Recitation scoring via pinned Sanskrit Sarvam STT or a Su-srota service."""

from __future__ import annotations

import httpx
import asyncio

from app.config import settings


class ScorerError(RuntimeError):
    def __init__(self, message: str, billed_seconds: float = 0.0):
        super().__init__(message)
        self.billed_seconds = billed_seconds


class ScorerInputError(ScorerError):
    pass


def available() -> bool:
    url = (settings.scorer_url or "").strip()
    return bool(url and (url != "sarvam" or settings.sarvam_api_key))


def validate_audio(audio: bytes) -> None:
    if (settings.scorer_url or "").strip() != "sarvam":
        return
    from app.services.recite_audio import AudioInputError, validate
    try:
        validate(audio)
    except AudioInputError as exc:
        raise ScorerInputError(str(exc)) from exc


async def score_attempt(audio, reference_lines, strict, *, db, learner, surface,
                        ref_audio_url="") -> dict:
    """Shared route entry: validate, meter Sarvam spend, and refund failures."""
    from fastapi import HTTPException
    from app.services.audio_meta import estimate_seconds
    from app.services.quota import QuotaExceeded, check_and_consume, refund_quota

    if not available():
        raise HTTPException(status_code=503, detail="Scoring is not available yet")
    try:
        validate_audio(audio)
    except ScorerInputError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    metered = (settings.scorer_url or "").strip() == "sarvam"
    seconds = estimate_seconds(audio)
    prepared = None
    if metered:
        from app.services.recite_audio import AudioInputError, prepare
        try:
            prepared = await asyncio.to_thread(prepare, audio)
        except AudioInputError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        except RuntimeError as exc:
            raise HTTPException(status_code=503, detail="Audio processing is unavailable. Try again later.") from exc
        seconds = prepared.seconds
        try:
            check_and_consume(db, learner, "stt_seconds", seconds, surface=surface)
        except QuotaExceeded as exc:
            raise HTTPException(status_code=429, detail="Speech scoring allowance used up. Try again later.",
                                headers={"Retry-After": str(exc.retry_after_s)}) from exc
    try:
        return await score(audio, reference_lines, strict, ref_audio_url=ref_audio_url, prepared=prepared)
    except (ScorerError, httpx.HTTPError) as exc:
        if metered:
            # Completed chunks were billed even if a later chunk failed.
            unbilled = max(0.0, seconds - getattr(exc, "billed_seconds", 0.0))
            if unbilled:
                refund_quota(db, learner, "stt_seconds", unbilled, surface=surface)
        if isinstance(exc, ScorerInputError):
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        raise HTTPException(status_code=503, detail="Scoring is busy. Try again.") from exc


async def score(
    audio: bytes,
    reference_lines: list[str],
    strict: bool,
    ref_audio_url: str = "",
    *,
    prepared=None,
) -> dict:
    url = (settings.scorer_url or "").strip()
    if not url:
        raise ScorerError("no scorer")
    if url == "sarvam":
        from app.services.audio_meta import audio_seconds
        from app.services.recite_audio import AudioInputError, prepare
        from app.services.recite_scoring import score_transcript
        from app.services.sarvam import SarvamError, get_sarvam_client

        validate_audio(audio)
        completed = 0.0
        try:
            if prepared is None:
                prepared = await asyncio.to_thread(prepare, audio)
            client = get_sarvam_client()
            transcripts = []
            for chunk, filename in prepared.chunks:
                result = await client.speech_to_text(
                    audio_data=chunk, language_code="sa-IN", model=settings.sarvam_stt_model,
                    mode="transcribe", filename=filename,
                )
                completed += audio_seconds(chunk) or 0.0
                transcripts.append(result.get("transcript") or "")
        except AudioInputError as exc:
            raise ScorerInputError(str(exc)) from exc
        except SarvamError as exc:
            if exc.status_code in (400, 413, 422):
                raise ScorerInputError("Could not read the recording. Try recording again.", completed) from exc
            raise ScorerError("Sarvam transcription failed", completed) from exc
        except (RuntimeError, httpx.HTTPError, ValueError) as exc:
            raise ScorerError("Sarvam transcription unavailable", completed) from exc
        res = score_transcript(reference_lines, " ".join(t.strip() for t in transcripts if t.strip()))
        return {**res, "duration_ms": int(prepared.seconds * 1000),
                "replay_similarity": None, "model": settings.sarvam_stt_model}
    if url == "fake":
        if settings.is_production:
            raise ScorerError("fake scorer in production")
        # Canned: every aksara green except the third (red, heard ta).
        from app.services.chant_text import chant_lines  # noqa: F401
        # Caller passes reference lines already; count aksaras via scoring rule.
        # Approximate with characters to keep fake dependency-free.
        ref_text = "\n".join(reference_lines)
        import re as _re
        aks = [c for c in ref_text if "\u0900" <= c <= "\u097f" and c.strip()]
        # Use akshara split from chant_text syllable rule? Keep simple: one
        # band per Devanagari letter cluster is overkill for fake; tests only
        # need green/red/unclear shapes.
        if len(aks) < 3:
            return {"status": "unclear", "lines": [], "percent_strict": 0.0,
                    "percent_liberal": 0.0, "n": {"green": 0, "red": 0, "amber": 0},
                    "heard": "", "duration_ms": 1000, "replay_similarity": None,
                    "model": "fake"}
        bands = []
        for i, a in enumerate(aks):
            if i == 2:
                bands.append({"t": a, "band": "red", "heard": "त"})
            else:
                bands.append({"t": a, "band": "green", "heard": ""})
        g = len(aks) - 1
        return {"status": "scored", "lines": [bands],
                "percent_strict": g / len(aks), "percent_liberal": g / len(aks),
                "n": {"green": g, "red": 1, "amber": 0}, "heard": "fake",
                "duration_ms": 1000, "replay_similarity": None, "model": "fake"}
    try:
        async with httpx.AsyncClient(timeout=settings.scorer_timeout_s) as c:
            r = await c.post(
                url.rstrip("/") + "/score",
                files={"file": ("rec.m4a", audio, "audio/mp4")},
                data={"reference": "\n".join(reference_lines),
                      "mode": "strict" if strict else "liberal",
                      "ref_audio_url": ref_audio_url or ""},
                headers={"X-Scorer-Key": settings.scorer_key or ""},
            )
    except Exception as e:
        raise ScorerError(str(e)[:200]) from e
    if r.status_code != 200:
        raise ScorerError(f"scorer {r.status_code}")
    return r.json()
