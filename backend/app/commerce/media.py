"""Authenticated media proxy; preview bytes are clipped before delivery."""
import asyncio
import subprocess
import tempfile
from pathlib import Path
from urllib.parse import urlparse, unquote

import httpx
from fastapi import HTTPException
from fastapi.responses import Response

from app.config import settings
from app.models import Learner, Shloka, VerseAudio
from app.commerce import service as svc


async def serve_media(ticket, db, head=False):
    from app.commerce.router import decode
    from app.commerce.access import has_ad
    data = decode(ticket, "media")
    row = db.get(Shloka, data["row"])
    if not row or not db.get(Learner, data["sub"]):
        raise HTTPException(404, "Unknown media")
    if data.get("limit_ms") is None and data["title"] != "daily:audio" and not svc.title_access(db, data["sub"], data["title"]):
        raise HTTPException(403, "Audio access ended")
    if data["kind"] == "chant":
        audio = db.query(VerseAudio).filter_by(verse_uid=row.verse_uid, voice=settings.chant_voice).first()
        source = audio.url if audio else ""
    else:
        source = row.audio_url
    if not source:
        raise HTTPException(404, "No prepared audio")
    if source.startswith("/audio/"):
        root = Path("storage/audio").resolve()
        path = (root / unquote(source.removeprefix("/audio/"))).resolve()
        if root not in path.parents or not path.is_file():
            raise HTTPException(404, "Unknown audio")
        if path.stat().st_size > 100 * 1024 * 1024:
            raise HTTPException(413, "Audio exceeds delivery limit")
        content = await asyncio.to_thread(path.read_bytes)
    else:
        parsed = urlparse(source)
        if parsed.scheme != "https" or not parsed.hostname or parsed.hostname in {"localhost", "127.0.0.1", "169.254.169.254"}:
            raise HTTPException(422, "Unsupported audio origin")
        if parsed.hostname == "storage.googleapis.com":
            from google.cloud import storage
            bucket, _, name = parsed.path.lstrip("/").partition("/")
            def download():
                blob = storage.Client().bucket(bucket).blob(unquote(name))
                blob.reload()
                if blob.size > 100 * 1024 * 1024:
                    raise HTTPException(413, "Audio exceeds delivery limit")
                return blob.download_as_bytes()
            content = await asyncio.to_thread(download)
        else:
            # Origin allow-list is owner configured; no user-controlled proxy destinations.
            allowed = svc.setting(db, "media_origins", [])
            if parsed.hostname not in allowed:
                raise HTTPException(503, "Audio origin requires private delivery configuration")
            async with httpx.AsyncClient(timeout=30, follow_redirects=False) as client:
                async with client.stream("GET", source) as response:
                    if response.status_code != 200:
                        raise HTTPException(502, "Audio origin is unavailable")
                    chunks, size = [], 0
                    async for chunk in response.aiter_bytes():
                        size += len(chunk)
                        if size > 100 * 1024 * 1024:
                            raise HTTPException(413, "Audio exceeds delivery limit")
                        chunks.append(chunk)
                    content = b"".join(chunks)
    if len(content) > 100 * 1024 * 1024:
        raise HTTPException(413, "Audio exceeds delivery limit")
    if data.get("limit_ms") is not None:
        import shutil
        ffmpeg = shutil.which("ffmpeg")
        if not ffmpeg:
            raise HTTPException(503, "Audio preview encoder is not installed")
        def clip():
            with tempfile.TemporaryDirectory(prefix="sanskrit-preview-") as directory:
                source_path, target = Path(directory) / "source", Path(directory) / "preview.m4a"
                source_path.write_bytes(content)
                subprocess.run([ffmpeg, "-nostdin", "-v", "error", "-i", str(source_path), "-t", str(data["limit_ms"] / 1000),
                                "-vn", "-c:a", "aac", "-y", str(target)], check=True, timeout=60, capture_output=True)
                return target.read_bytes()
        content = await asyncio.to_thread(clip)
    headers = {"Cache-Control": "private, no-store", "Content-Length": str(len(content))}
    return Response(b"" if head else content, media_type="audio/mp4", headers=headers)
