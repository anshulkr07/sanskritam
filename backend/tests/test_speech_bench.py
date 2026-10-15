"""Speech bench harness tests — specs/speech-bench.md §1/§4 (live parts).

Everything is mocked/offline: no Sarvam network calls.  Scripts under
``backend/scripts/`` are loaded via importlib (they are not a package and
must stay importable regardless of pytest's cwd).

The former Parler (§2) and Vāgdhenu (§3) sections were struck from the spec
2026-08-30 (Sanskritam is API-only — no local models) and their tests deleted
along with ``app/services/parler.py``, ``app/services/vagdhenu.py`` and
``scripts/render_parler.py``.
"""

from __future__ import annotations

import asyncio
import importlib.util
import io
import json
import pathlib
import struct
import sys
import wave

import pytest

_BACKEND = pathlib.Path(__file__).resolve().parents[1]


def _load_script(name: str, rel: str):
    """Import a standalone script module without a package __init__."""
    spec = importlib.util.spec_from_file_location(name, _BACKEND / rel)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    assert spec.loader is not None
    spec.loader.exec_module(mod)
    return mod


bench_asr = _load_script("bench_asr", "scripts/bench_asr.py")
render_sarvam = _load_script("render_sarvam", "scripts/render_sarvam.py")

from app.config import settings  # noqa: E402
from app.services.sarvam import SarvamClient  # noqa: E402 (import only — never modified)


# ── 2. bench_asr.py — mocked Saaras round trip, both verdict sides ───────────

@pytest.mark.parametrize(
    ("stub_sleep_ms", "expected_verdict"),
    [
        (10, "PASS"),   # p50 ≈ 10 ms → fits the 800 ms budget
        (900, "FAIL"),  # p50 ≈ 900 ms → exceeds the 800 ms budget
    ],
)
def test_bench_asr_verdict_both_sides(tmp_path, monkeypatch, capsys, stub_sleep_ms, expected_verdict):
    called_models: list = []

    async def fake_stt(self, audio_data, **kwargs):
        called_models.append(kwargs.get("model"))
        if stub_sleep_ms:
            await asyncio.sleep(stub_sleep_ms / 1000.0)
        return {"transcript": "रामः फलम् खादति।", "language_code": "sa-IN"}

    monkeypatch.setattr(SarvamClient, "speech_to_text", fake_stt)
    monkeypatch.setattr(settings, "sarvam_api_key", "test-key")

    out = tmp_path / "bench.json"
    rc = bench_asr.main(["--synthetic", "--n", "2", "--out", str(out)])

    assert rc == 0
    doc = json.loads(out.read_text(encoding="utf-8"))
    # JSON shape contract: stats + verdict keys must be present and numeric.
    stats = doc["stats"]
    assert "p50_ms" in stats and "p95_ms" in stats and "mean_ms" in stats
    assert isinstance(stats["p50_ms"], (int, float)) and isinstance(stats["p95_ms"], (int, float))
    assert doc["verdict"] == expected_verdict
    assert expected_verdict in doc["verdict_line"]
    assert "800" in doc["verdict_line"]
    assert doc["budget_ms"] == 800
    assert doc["n"] == 2
    assert doc["audio_source"] == "synthetic"
    # The label is the model actually called. It said "saaras:v3" while the
    # client's default had already moved to v4.
    assert doc["model"] == settings.sarvam_stt_model
    assert called_models == [settings.sarvam_stt_model] * 2
    assert len(doc["latencies_ms"]) == 2
    assert len(doc["transcript_lengths"]) == 2
    capsys.readouterr()


def test_bench_asr_requires_key(tmp_path, monkeypatch, capsys):
    monkeypatch.setattr(settings, "sarvam_api_key", "")
    rc = bench_asr.main(["--synthetic", "--n", "2", "--out", str(tmp_path / "x.json")])
    assert rc == 1
    assert "SARVAM_API_KEY not configured" in capsys.readouterr().err


def test_bench_asr_failure_path(tmp_path, monkeypatch, capsys):
    async def boom_stt(self, audio_data, **kwargs):
        from app.services.sarvam import SarvamError
        raise SarvamError(401, "bad key")

    monkeypatch.setattr(SarvamClient, "speech_to_text", boom_stt)
    monkeypatch.setattr(settings, "sarvam_api_key", "test-key")
    rc = bench_asr.main(["--synthetic", "--n", "2", "--out", str(tmp_path / "x.json")])
    assert rc == 1
    assert "ASR bench failed" in capsys.readouterr().err


def test_bench_asr_synthesize_wav_offline():
    """Synthetic WAV must be valid 16 kHz mono PCM — with or without numpy."""
    wav = bench_asr.synthesize_wav(seconds=0.1, sample_rate=16000)
    with wave.open(io.BytesIO(wav), "rb") as w:
        assert w.getnchannels() == 1
        assert w.getframerate() == 16000
        assert w.getsampwidth() == 2
        assert w.getnframes() > 0


# ── 6. render_sarvam.py — API-based batch renderer (mocked client) ───────────


def test_render_sarvam_dry_run_valid_plan(tmp_path, capsys):
    plan = [
        {"id": "n00", "text": "नमस्ते! तैयार हैं?", "lang": "hi"},
        {"id": "n01", "text": "साधु! भवान् कः?", "lang": "sa"},
    ]
    plan_file = tmp_path / "plan.json"
    plan_file.write_text(json.dumps(plan, ensure_ascii=False), encoding="utf-8")

    rc = render_sarvam.main(["--dry-run", "--item-file", str(plan_file)])
    assert rc == 0
    assert "PLAN OK" in capsys.readouterr().out


def test_render_sarvam_dry_run_duplicate_ids_fail(tmp_path, capsys):
    plan = [
        {"id": "dup", "text": "रामः", "lang": "sa"},
        {"id": "dup", "text": "रामः", "lang": "sa"},
    ]
    plan_file = tmp_path / "plan.json"
    plan_file.write_text(json.dumps(plan, ensure_ascii=False), encoding="utf-8")

    rc = render_sarvam.main(["--dry-run", "--item-file", str(plan_file)])
    assert rc == 2
    assert "duplicate id" in capsys.readouterr().out


def test_render_sarvam_render_requires_items(tmp_path, capsys):
    """Render mode with no item-file → exit 2 (refuse, don't render nothing)."""
    rc = render_sarvam.main(["--out", str(tmp_path / "p")])
    assert rc == 2
    assert "nothing to render" in capsys.readouterr().err


def test_render_sarvam_render_item_writes_wav_and_records_error(tmp_path, capsys):
    """render_items with a fake client: WAV written, error isolated, lang routed."""
    import base64

    class FakeClient:
        def __init__(self):
            self.calls: list[dict] = []

        async def text_to_speech(self, text, language_code, speaker, model, sample_rate):
            self.calls.append({"text": text, "language_code": language_code,
                               "speaker": speaker, "model": model})
            if "boom" in text:
                raise RuntimeError("boom")
            return base64.b64encode(_wav_bytes(sample_rate=24000, frames=4800)).decode()

    fake = FakeClient()
    items = [
        {"id": "n00", "text": "नमस्ते! तैयार हैं?", "lang": "hi"},
        {"id": "n01", "text": "भवान् कः?", "lang": "sa"},
        {"id": "boom", "text": "boom item", "lang": "sa"},
    ]
    results = asyncio.run(render_sarvam.render_items(fake, items, tmp_path / "out", "shard1"))

    assert len(results) == 3
    ok1, ok2, bad = results
    assert ok1["ok"] is True and ok1["path"].endswith("n00.wav")
    assert pathlib.Path(ok1["path"]).exists()
    with wave.open(ok1["path"], "rb") as w:
        assert w.getframerate() == 24000 and w.getnchannels() == 1
    # Native Sanskrit is now the default for Sanskrit content.
    assert fake.calls[1]["language_code"] == "sa-IN"
    # the failing item is isolated, not fatal
    assert results[2]["ok"] is False and "boom" in results[2]["error"]
    # every successful call carried the persona speaker + bulbul:v3
    assert all(c["speaker"] == "aditya" and c["model"] == "bulbul:v3" for c in fake.calls)


def test_render_sarvam_sa_language_flag(tmp_path, capsys):
    """--sa-language sa-IN routes sa items to sa-IN (post-beta path)."""
    import base64

    class FakeClient:
        def __init__(self):
            self.calls: list[dict] = []

        async def text_to_speech(self, text, language_code, speaker, model, sample_rate):
            self.calls.append({"text": text, "language_code": language_code})
            return base64.b64encode(_wav_bytes(sample_rate=24000, frames=2400)).decode()

    fake = FakeClient()
    items = [{"id": "n01", "text": "भवान् कः?", "lang": "sa"}]
    asyncio.run(render_sarvam.render_items(fake, items, tmp_path / "out", "s", sa_language="sa-IN"))
    assert fake.calls[0]["language_code"] == "sa-IN"


def test_render_sarvam_skip_without_key(tmp_path, capsys, monkeypatch):
    """No API key → SKIP line + exit 0 (graceful skip)."""
    from app.config import settings

    monkeypatch.setattr(settings, "sarvam_api_key", "")
    plan_file = tmp_path / "plan.json"
    plan_file.write_text(json.dumps([{"id": "t1", "text": "नमस्ते", "lang": "hi"}]), encoding="utf-8")
    rc = render_sarvam.main(["--item-file", str(plan_file), "--out", str(tmp_path / "p")])
    assert rc == 0
    assert "SKIP: SARVAM_API_KEY not configured" in capsys.readouterr().out


def _wav_bytes(sample_rate: int = 24000, frames: int = 2000) -> bytes:
    """Synthetic mono PCM WAV bytes for fake-client round trips."""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sample_rate)
        w.writeframes(struct.pack(f"<{frames}h", *([0] * frames)))
    return buf.getvalue()
