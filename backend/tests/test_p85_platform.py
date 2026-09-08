"""P8-5 — durable audio backend selection + DB backup policy. No network."""

import io


def test_local_is_default_without_config(monkeypatch):
    import app.services.storage as st
    monkeypatch.setattr(st, "_storage", None)
    s = st.get_storage()
    assert isinstance(s, st.LocalStorage)
    assert s.url("x/y.wav") == "/audio/x/y.wav"


def test_unknown_backend_falls_back_to_local(monkeypatch):
    import app.services.storage as st
    from app.config import settings
    monkeypatch.setattr(settings, "audio_storage", "s3", raising=False)
    monkeypatch.setattr(st, "_storage", None)
    assert isinstance(st.get_storage(), st.LocalStorage)
    monkeypatch.setattr(settings, "audio_storage", "local", raising=False)


def test_gcs_selected_when_configured(monkeypatch):
    import app.services.storage as st
    from app.config import settings
    import sys
    import types

    fake_blob = types.SimpleNamespace(
        cache_control=None,
        upload_from_string=lambda *a, **k: None,
        exists=lambda: True,
    )
    fake_bucket = types.SimpleNamespace(
        name="bkt",
        blob=lambda name: fake_blob,
    )
    fake_client = types.SimpleNamespace(bucket=lambda name: fake_bucket)
    fake_mod = types.ModuleType("google.cloud.storage")
    fake_mod.Client = lambda: fake_client  # noqa: E731
    fake_cloud = types.ModuleType("google.cloud")
    fake_cloud.storage = fake_mod
    fake_google = types.ModuleType("google")
    fake_google.cloud = fake_cloud
    monkeypatch.setitem(sys.modules, "google", fake_google)
    monkeypatch.setitem(sys.modules, "google.cloud", fake_cloud)
    monkeypatch.setitem(sys.modules, "google.cloud.storage", fake_mod)

    monkeypatch.setattr(settings, "audio_storage", "gcs", raising=False)
    monkeypatch.setattr(settings, "gcs_audio_bucket", "bkt", raising=False)
    monkeypatch.setattr(settings, "cdn_base_url", "https://cdn.example", raising=False)
    monkeypatch.setattr(st, "_storage", None)
    s = st.get_storage()
    assert isinstance(s, st.GCSStorage)
    assert s.url("a/b.wav") == "https://cdn.example/audio/a/b.wav"
    # path traversal is neutralised on every backend
    assert ".." not in s.url("../evil.wav")
    monkeypatch.setattr(settings, "audio_storage", "local", raising=False)
    monkeypatch.setattr(settings, "gcs_audio_bucket", "", raising=False)
    monkeypatch.setattr(settings, "cdn_base_url", "", raising=False)
    monkeypatch.setattr(st, "_storage", None)


def test_gcs_without_bucket_falls_back(monkeypatch):
    import app.services.storage as st
    from app.config import settings
    monkeypatch.setattr(settings, "audio_storage", "gcs", raising=False)
    monkeypatch.setattr(settings, "gcs_audio_bucket", "", raising=False)
    monkeypatch.setattr(st, "_storage", None)
    assert isinstance(st.get_storage(), st.LocalStorage)
    monkeypatch.setattr(settings, "audio_storage", "local", raising=False)


def test_backup_sqlite_copies_and_prunes(tmp_path, monkeypatch):
    from scripts import backup_db
    from scripts.backup_db import backup_sqlite, _prune
    # Same-second runs share a stamp in production (fine); the test needs
    # distinct names to exercise the keep window.
    stamps = iter(["20260907-140301", "20260907-140302", "20260907-140303"])
    monkeypatch.setattr(backup_db, "_stamp", lambda: next(stamps))
    src = tmp_path / "app.db"
    src.write_bytes(b"x" * 100)
    out = tmp_path / "backups"
    r1 = backup_sqlite(str(src), out, keep=2)
    assert r1["backend"] == "sqlite" and r1["bytes"] == 100
    r2 = backup_sqlite(str(src), out, keep=2)
    assert r2["bytes"] == 100
    assert len(list(out.iterdir())) == 2
    # keep=1 prunes to the single newest
    deleted = _prune(out, keep=1)
    assert len(deleted) == 1 and len(list(out.iterdir())) == 1


def test_backup_missing_db_refuses(tmp_path):
    import pytest
    from scripts.backup_db import backup_sqlite
    with pytest.raises(SystemExit):
        backup_sqlite(str(tmp_path / "nope.db"), tmp_path / "b", keep=2)


def test_backup_postgres_without_pg_dump_refuses(monkeypatch, tmp_path):
    import pytest
    from scripts import backup_db
    monkeypatch.setattr(backup_db.shutil, "which", lambda *a, **k: None)
    with pytest.raises(SystemExit):
        backup_db.backup_postgres("postgresql://u:p@h/db", tmp_path, keep=2)


def test_deploy_script_provisions_audio_bucket():
    # P8-5: the deploy path must create the audio bucket + wire the env, or
    # production silently falls back to ephemeral local disk (§2.11 — a silent
    # empty result is a bug, one layer out).
    text = io.open("C:/Users/AnshulKumar/PycharmProjects/sanskrit/deploy/gcp/deploy.sh",
                   encoding="utf-8").read()
    assert "GCS_AUDIO_BUCKET" in text
    assert "AUDIO_STORAGE" in text
    assert "CDN_BASE_URL" in text
