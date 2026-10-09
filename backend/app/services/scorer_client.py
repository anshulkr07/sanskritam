"""Client for the Su-srota scorer service (gpu/asr/server.py)."""

from __future__ import annotations

import httpx

from app.config import settings


class ScorerError(RuntimeError):
    pass


async def score(
    audio: bytes,
    reference_lines: list[str],
    strict: bool,
    ref_audio_url: str = "",
) -> dict:
    url = (settings.scorer_url or "").strip()
    if not url:
        raise ScorerError("no scorer")
    if url == "fake":
        if getattr(settings, "env", "dev") == "production":
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
