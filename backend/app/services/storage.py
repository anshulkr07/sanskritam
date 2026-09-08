"""Audio storage abstraction — makes the backend CDN-ready.

Architecture §14.2: pre-rendered audio is an owned asset, not a cache.
The local filesystem implementation is the default; swap the backend
class to point at S3/GCS/Cloudflare R2 for production.

Usage:
    from app.services.storage import get_storage
    storage = get_storage()
    url = storage.store(audio_bytes, "shard-a/node-123.wav")
"""

import hashlib
import os
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional


class StorageBackend(ABC):
    """Abstract storage backend for audio files."""

    @abstractmethod
    def store(self, data: bytes, path: str) -> str:
        """Store audio bytes and return the URL/path to access them."""
        ...

    @abstractmethod
    def exists(self, path: str) -> bool:
        """Check if a path exists in storage."""
        ...

    @abstractmethod
    def url(self, path: str) -> str:
        """Return the public URL for a stored path."""
        ...


class LocalStorage(StorageBackend):
    """Local filesystem storage — content-hashed filenames."""

    def __init__(self, base_dir: str = "storage/audio") -> None:
        self._base = Path(base_dir)
        self._base.mkdir(parents=True, exist_ok=True)

    def store(self, data: bytes, path: str) -> str:
        safe_path = path.replace("..", "").lstrip("/")
        full = self._base / safe_path
        full.parent.mkdir(parents=True, exist_ok=True)
        full.write_bytes(data)
        return str(full)

    def exists(self, path: str) -> bool:
        return (self._base / path).exists()

    def url(self, path: str) -> str:
        return f"/audio/{path}"


class GCSStorage(StorageBackend):
    """Google Cloud Storage backend (P8-5 — production on Cloud Run).

    Pre-rendered audio is an owned asset (§14.2): it must survive a Cloud Run
    revision, so local disk is not an option in production. Objects are
    written with ``CacheControl: public, max-age=31536000, immutable`` —
    filenames are content-hashed, so a URL is forever. The google-cloud
    package is imported LAZILY so dev/test installs without it keep working;
    misconfiguration raises loudly at selection time, never mid-request.
    """

    def __init__(self, bucket: str, cdn_base_url: str = "") -> None:
        if not bucket:
            raise ValueError("GCSStorage needs a bucket name (GCS_AUDIO_BUCKET)")
        try:
            from google.cloud import storage as gcs  # type: ignore
        except ImportError as e:
            raise RuntimeError(
                "google-cloud-storage is not installed; add it to "
                "requirements.txt (production image has it)"
            ) from e
        self._client = gcs.Client()
        self._bucket = self._client.bucket(bucket)
        self._cdn = (cdn_base_url or "").rstrip("/")

    def store(self, data: bytes, path: str) -> str:
        safe_path = path.replace("..", "").lstrip("/")
        blob = self._bucket.blob(f"audio/{safe_path}")
        blob.cache_control = "public, max-age=31536000, immutable"
        blob.upload_from_string(data, content_type="audio/wav")
        return self.url(safe_path)

    def exists(self, path: str) -> bool:
        safe_path = path.replace("..", "").lstrip("/")
        return self._bucket.blob(f"audio/{safe_path}").exists()

    def url(self, path: str) -> str:
        safe_path = path.replace("..", "").lstrip("/")
        if self._cdn:
            return f"{self._cdn}/audio/{safe_path}"
        return f"https://storage.googleapis.com/{self._bucket.name}/audio/{safe_path}"


def content_hash(data: bytes) -> str:
    """Return a content-hashed filename (immutable asset naming)."""
    return hashlib.sha256(data).hexdigest()[:32]


# Module-level singleton
_storage: Optional[StorageBackend] = None


def get_storage() -> StorageBackend:
    global _storage
    if _storage is None:
        # P8-5: production selects GCS by env; anything unconfigured (or an
        # unknown value) falls back to local rather than crashing the boot.
        try:
            from app.config import settings
            backend = (settings.audio_storage or "local").lower()
            bucket = (settings.gcs_audio_bucket or "").strip()
        except Exception:
            backend, bucket = "local", ""
        if backend == "gcs" and bucket:
            try:
                _storage = GCSStorage(bucket, getattr(settings, "cdn_base_url", ""))
            except Exception:
                _storage = LocalStorage()
        else:
            _storage = LocalStorage()
    return _storage


def set_storage(backend: StorageBackend) -> None:
    """Override the storage backend (for tests or production config)."""
    global _storage
    _storage = backend