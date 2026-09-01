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


def content_hash(data: bytes) -> str:
    """Return a content-hashed filename (immutable asset naming)."""
    return hashlib.sha256(data).hexdigest()[:32]


# Module-level singleton
_storage: Optional[StorageBackend] = None


def get_storage() -> StorageBackend:
    global _storage
    if _storage is None:
        _storage = LocalStorage()
    return _storage


def set_storage(backend: StorageBackend) -> None:
    """Override the storage backend (for tests or production config)."""
    global _storage
    _storage = backend