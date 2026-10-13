"""Calibration capture endpoints (§8 tooling): prompts, labelled upload,
admin progress."""

from __future__ import annotations

WAV_BYTES = b"RIFF" + b"\x00" * 256  # shape matters not; storage is local


def _login(client, name: str) -> dict:
    r = client.post("/auth/dev-login", json={"display_name": name})
    return {"Authorization": f"Bearer {r.json()['token']}"}


def test_calibration_prompts_and_labels(client):
    r = client.get("/recite-calibration/prompts", headers=_login(client, "Cal A"))
    assert r.status_code == 200
    body = r.json()
    assert len(body["prompts"]) == 8
    assert all(p["text"] for p in body["prompts"])
    labels = {l["key"] for l in body["labels"]}
    assert {"clean", "slow", "pauses", "scrambled", "noisy"} <= labels
    assert body["target_count"] >= 60 and body["target_speakers"] >= 10


def test_calibration_upload_requires_consent_and_label(client):
    h = _login(client, "Cal B")
    # no consent → refused
    r = client.post("/recite-calibration",
                    files={"file": ("a.m4a", WAV_BYTES, "audio/mp4")},
                    data={"prompt_id": "cal-01", "label": "clean", "consent": "false"},
                    headers=h)
    assert r.status_code == 422
    # bad label → refused
    r = client.post("/recite-calibration",
                    files={"file": ("a.m4a", WAV_BYTES, "audio/mp4")},
                    data={"prompt_id": "cal-01", "label": "shouty", "consent": "true"},
                    headers=h)
    assert r.status_code == 422
    # unknown prompt → refused
    r = client.post("/recite-calibration",
                    files={"file": ("a.m4a", WAV_BYTES, "audio/mp4")},
                    data={"prompt_id": "cal-99", "label": "clean", "consent": "true"},
                    headers=h)
    assert r.status_code == 422
    # valid upload stores privately and counts
    r = client.post("/recite-calibration",
                    files={"file": ("a.m4a", WAV_BYTES, "audio/mp4")},
                    data={"prompt_id": "cal-01", "label": "clean", "speaker_alias": "spk-01",
                          "device": "test-dev", "consent": "true"},
                    headers=h)
    assert r.status_code == 200 and r.json()["stored"] is True


def test_calibration_progress_is_admin_only(client):
    h = _login(client, "Cal C")
    r = client.get("/recite-calibration", headers=h)
    assert r.status_code == 401
    r = client.get("/recite-calibration", headers={"X-Admin-Token": "test-admin"})
    assert r.status_code == 200
    body = r.json()
    assert body["total"] >= 1  # the upload from the previous test
    assert body["speakers"] >= 1
    assert "ready_to_freeze" in body
