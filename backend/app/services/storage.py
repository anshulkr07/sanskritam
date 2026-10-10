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
    def store(self, data: bytes, path: str, content_type: str = "audio/wav") -> str:
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

    def store_private(self, data: bytes, path: str, content_type: str = "audio/mp4") -> str:
        """Store private bytes (competition recordings). Returns a key."""
        raise PrivateStorageOff("private storage not configured")

    def read_private(self, key: str) -> bytes:
        raise PrivateStorageOff("private storage not configured")

    def delete_private(self, key: str) -> None:
        raise PrivateStorageOff("private storage not configured")


class PrivateStorageOff(RuntimeError):
    """Private bucket not configured: caller keeps no audio (no_audio flag)."""


class LocalStorage(StorageBackend):
    """Local filesystem storage — content-hashed filenames."""

    def __init__(self, base_dir: str = "storage/audio") -> None:
        self._base = Path(base_dir)
        self._base.mkdir(parents=True, exist_ok=True)
        self._priv = Path("storage/private")
        # Private dir created lazily so tests without it still raise via mode.

    def store(self, data: bytes, path: str, content_type: str = "audio/wav") -> str:
        safe_path = path.replace("..", "").lstrip("/")
        full = self._base / safe_path
        full.parent.mkdir(parents=True, exist_ok=True)
        full.write_bytes(data)
        return str(full)

    def exists(self, path: str) -> bool:
        return (self._base / path).exists()

    def url(self, path: str) -> str:
        return f"/audio/{path}"

    def _priv_path(self, key: str) -> Path:
        safe = key.replace("..", "").lstrip("/")
        return self._priv / safe

    def store_private(self, data: bytes, path: str, content_type: str = "audio/mp4") -> str:
        from app.config import settings
        if (getattr(settings, "private_storage", "local") or "local").lower() == "off":
            raise PrivateStorageOff("private storage off")
        if (getattr(settings, "private_storage", "local") or "local").lower() not in ("local",):
            raise PrivateStorageOff("private storage not local")
        p = self._priv_path(path)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(data)
        return path.replace("..", "").lstrip("/")

    def read_private(self, key: str) -> bytes:
        return self._priv_path(key).read_bytes()

    def delete_private(self, key: str) -> None:
        try:
            self._priv_path(key).unlink(missing_ok=True)
        except TypeError:
            # Python < 3.8 compat: missing_ok unavailable.
            try:
                self._priv_path(key).unlink()
            except FileNotFoundError:
                pass


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

    def store(self, data: bytes, path: str, content_type: str = "audio/wav") -> str:
        safe_path = path.replace("..", "").lstrip("/")
        blob = self._bucket.blob(f"audio/{safe_path}")
        blob.cache_control = "public, max-age=31536000, immutable"
        blob.upload_from_string(data, content_type=content_type)
        return self.url(safe_path)

    def exists(self, path: str) -> bool:
        safe_path = path.replace("..", "").lstrip("/")
        return self._bucket.blob(f"audio/{safe_path}").exists()

    def url(self, path: str) -> str:
        safe_path = path.replace("..", "").lstrip("/")
        if self._cdn:
            return f"{self._cdn}/audio/{safe_path}"
        return f"https://storage.googleapis.com/{self._bucket.name}/audio/{safe_path}"

    def _private_bucket(self):
        from app.config import settings
        name = (getattr(settings, "gcs_private_bucket", "") or "").strip()
        if not name:
            raise PrivateStorageOff("no private bucket")
        return self._client.bucket(name)

    def store_private(self, data: bytes, path: str, content_type: str = "audio/mp4") -> str:
        safe_path = path.replace("..", "").lstrip("/")
        blob = self._private_bucket().blob(safe_path)
        blob.upload_from_string(data, content_type=content_type)
        return safe_path

    def read_private(self, key: str) -> bytes:
        return self._private_bucket().blob(key).download_as_bytes()

    def delete_private(self, key: str) -> None:
        self._private_bucket().blob(key).delete()


class R2Storage(StorageBackend):
    """Cloudflare R2 backend (2026-09-16) — S3-compatible, zero egress fees.

    Selected by ``audio_storage="r2"``. R2 never bills egress (unlike GCS),
    so audio serving is the bulletproof $0 path at any scale. Reads are served
    directly from the bucket's public/CDN base URL (r2_base_url); the account
    id + S3 keys are only needed for WRITES (store/exists). The boto3 client
    is imported lazily so dev/test installs without it keep working.
    """

    def __init__(self, account_id: str, access_key_id: str, secret_access_key: str,
                 bucket: str, base_url: str = "") -> None:
        if not (account_id and access_key_id and secret_access_key):
            raise ValueError("R2Storage needs account_id + keys (R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY)")
        if not bucket:
            raise ValueError("R2Storage needs a bucket name (R2_BUCKET)")
        self._endpoint = f"https://{account_id}.r2.cloudflarestorage.com"
        self._base = (base_url or "").rstrip("/")
        self._bucket = bucket
        try:
            import boto3  # type: ignore
        except ImportError as e:
            raise RuntimeError(
                "boto3 is not installed; add it to requirements.txt to use R2Storage"
            ) from e
        self._client = boto3.client(
            "s3",
            endpoint_url=self._endpoint,
            aws_access_key_id=access_key_id,
            aws_secret_access_key=secret_access_key,
            region_name="auto",
        )

    def store(self, data: bytes, path: str, content_type: str = "audio/wav") -> str:
        safe_path = path.replace("..", "").lstrip("/")
        self._client.put_object(
            Bucket=self._bucket,
            Key=f"audio/{safe_path}",
            Body=data,
            ContentType=content_type,
            CacheControl="public, max-age=31536000, immutable",
        )
        return self.url(safe_path)

    def exists(self, path: str) -> bool:
        safe_path = path.replace("..", "").lstrip("/")
        try:
            self._client.head_object(Bucket=self._bucket, Key=f"audio/{safe_path}")
            return True
        except Exception:
            return False

    def _private_bucket_name(self) -> str:
        from app.config import settings
        name = (getattr(settings, "r2_private_bucket", "") or "").strip()
        if not name:
            raise PrivateStorageOff("no private bucket")
        return name

    def store_private(self, data: bytes, path: str, content_type: str = "audio/mp4") -> str:
        safe_path = path.replace("..", "").lstrip("/")
        self._client.put_object(
            Bucket=self._private_bucket_name(),
            Key=safe_path,
            Body=data,
            ContentType=content_type,
        )
        return safe_path

    def read_private(self, key: str) -> bytes:
        r = self._client.get_object(Bucket=self._private_bucket_name(), Key=key)
        return r["Body"].read()

    def delete_private(self, key: str) -> None:
        self._client.delete_object(Bucket=self._private_bucket_name(), Key=key)

    def url(self, path: str) -> str:
        safe_path = path.replace("..", "").lstrip("/")
        if self._base:
            return f"{self._base}/audio/{safe_path}"
        # No CDN configured: fall back to the R2 public (dev) URL root.
        return f"https://pub.{self._bucket}.r2.dev/audio/{safe_path}"


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
        if backend == "r2":
            try:
                _storage = R2Storage(
                    account_id=getattr(settings, "r2_account_id", ""),
                    access_key_id=getattr(settings, "r2_access_key_id", ""),
                    secret_access_key=getattr(settings, "r2_secret_access_key", ""),
                    bucket=getattr(settings, "r2_bucket", "sanskritam"),
                    base_url=getattr(settings, "r2_base_url", ""),
                )
            except Exception:
                _storage = LocalStorage()
        elif backend == "gcs" and bucket:
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