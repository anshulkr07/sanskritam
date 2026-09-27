"""Grammar guide audio renderer (2026-09-15): planning is pure, dry runs spend
nothing, and a rate limit is waited out — or stops the run — rather than
failing every remaining clip."""

import asyncio
import base64
import json

from app.services import grammar_guide as gg
from app.services.sarvam import SarvamError
from scripts import render_guide_audio as rga


class FakeClient:
    """Scripted TTS: an int raises SarvamError with that status, else succeeds."""

    def __init__(self, script):
        self.script = list(script)
        self.calls = 0

    async def text_to_speech(self, **_kw):
        self.calls += 1
        step = self.script.pop(0) if self.script else "ok"
        if isinstance(step, int):
            raise SarvamError(step, "scripted")
        return base64.b64encode(b"RIFF-fake-wav").decode()

    async def close(self):
        pass


class FakeStorage:
    def __init__(self):
        self.files = {}

    def store(self, data, path):
        self.files[path] = data
        return path


async def _no_sleep(_seconds):
    pass


def _render(words, client, tmp_path):
    manifest = {}
    storage = FakeStorage()
    summary = asyncio.run(rga._run(rga.plan(words, {}), manifest, "hi-IN", client=client,
                                   storage=storage, sleep=_no_sleep,
                                   manifest_path=tmp_path / "manifest.json"))
    return summary, manifest, storage


def test_a_rate_limit_is_retried_until_it_clears(tmp_path):
    client = FakeClient([429, 429, "ok"])
    summary, manifest, storage = _render(["राम"], client, tmp_path)
    assert summary == {"rendered": 1, "failures": [], "stopped": None}
    assert client.calls == 3 and len(manifest) == 1 and len(storage.files) == 1


def test_a_persistent_rate_limit_stops_the_run_and_keeps_finished_clips(tmp_path):
    client = FakeClient(["ok"] + [429] * 50)
    summary, manifest, _ = _render(["राम", "सीता", "गीता"], client, tmp_path)
    assert summary["rendered"] == 1 and summary["stopped"] and "2 clips left" in summary["stopped"]
    # the second clip used every retry; the third was never attempted
    assert client.calls == 1 + len(rga.RETRY_DELAYS) + 1
    saved = json.loads((tmp_path / "manifest.json").read_text(encoding="utf-8"))
    assert list(saved) == list(manifest) and len(saved) == 1


def test_a_non_retryable_error_fails_one_clip_and_the_run_continues(tmp_path):
    client = FakeClient([400, "ok"])
    summary, manifest, _ = _render(["राम", "सीता"], client, tmp_path)
    assert summary["rendered"] == 1 and len(summary["failures"]) == 1 and summary["stopped"] is None
    assert client.calls == 2 and len(manifest) == 1


def test_plan_skips_rendered_and_non_sanskrit_and_speaks_plus_as_a_pause():
    texts = ["राम", "हिम + आलयः", "8.4.2"]
    manifest = {gg.audio_key("राम"): {"text": "राम", "path": "grammar/x.wav"}}
    items = rga.plan(texts, manifest)
    assert [it["text"] for it in items] == ["हिम + आलयः"]
    assert items[0]["speak"] == "हिम, आलयः"
    assert items[0]["key"] == gg.audio_key("हिम + आलयः")


def test_plan_limit_and_estimate():
    items = rga.plan(["राम", "सीता", "गीता"], {}, limit=2)
    assert len(items) == 2
    est = rga.estimate(items)
    assert est["chars"] == len("राम") + len("सीता")
    assert est["est_cost_rs"] == round(est["chars"] * rga.COST_PER_CHAR, 2)


def test_dry_run_makes_no_network_calls(monkeypatch, capsys):
    import app.services.sarvam as sarvam

    def boom(*_a, **_k):
        raise AssertionError("dry run must not construct a TTS client")

    monkeypatch.setattr(sarvam, "SarvamClient", boom)
    assert rga.main([]) == 0
    out = capsys.readouterr().out
    assert "DRY-RUN" in out and "engine check failures:     0" in out


def test_every_guide_string_is_planned_once():
    texts = gg.iter_sanskrit()
    items = rga.plan(texts, {})
    keys = [it["key"] for it in items]
    assert len(keys) == len(set(keys))
    assert all(it["speak"] and "+" not in it["speak"] for it in items)
