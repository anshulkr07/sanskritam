import asyncio
import io
import wave
from unittest.mock import AsyncMock

import pytest

from app.config import settings
from app.services import scorer_client
from app.services.recite_scoring import aksharas, score_transcript
from app.services.sarvam import SarvamError


def wav(seconds=1):
    output = io.BytesIO()
    with wave.open(output, "wb") as stream:
        stream.setnchannels(1)
        stream.setsampwidth(2)
        stream.setframerate(16000)
        stream.writeframes(b"\0\0" * int(seconds * 16000))
    return output.getvalue()


def test_cluster_and_normalization():
    assert aksharas("धर्मम् ॥ १२") == aksharas("धर्मं")
    assert aksharas("क्षेत्र") == ["क्षे", "त्र"]
    assert aksharas("कर्म योग") == ["क", "र्म", "यो", "ग"]


def test_matches_omissions_substitutions_and_insertions():
    reference = ["क ख ग", "घ ङ च"]
    perfect = score_transcript(reference, "क ख ग घ ङ च")
    assert perfect["percent_strict"] == 1
    assert len(perfect["lines"]) == 2
    missing = score_transcript(reference, "क ख ग घ च")
    assert missing["n"] == {"green": 5, "red": 1, "amber": 0}
    wrong = score_transcript(reference, "क ख ग घ ङ छ")
    assert wrong["lines"][1][-1] == {"t": "च", "band": "red", "heard": "छ"}
    extra = score_transcript(reference, "क ख ग घ ङ च छ")
    assert extra["insertions"] == 1
    assert extra["percent_strict"] == pytest.approx(6 / 7)
    assert extra["n"]["red"] == 1
    assert extra["lines"][1][-1]["heard"] == "छ"
    assert score_transcript(reference, "")['status'] == "unclear"
    assert score_transcript(reference, "English translation")['status'] == "unclear"


def configure(monkeypatch, *, transcript="क ख ग घ ङ च"):
    monkeypatch.setattr(settings, "scorer_url", "sarvam")
    monkeypatch.setattr(settings, "sarvam_api_key", "test-key")
    client = AsyncMock()
    client.speech_to_text.return_value = {"transcript": transcript, "language_code": "sa-IN"}
    monkeypatch.setattr("app.services.sarvam.get_sarvam_client", lambda: client)
    return client


def test_sarvam_is_pinned_without_reference_hints(monkeypatch):
    client = configure(monkeypatch)
    result = asyncio.run(scorer_client.score(wav(), ["क ख ग", "घ ङ च"], True))
    args = client.speech_to_text.call_args.kwargs
    assert args["language_code"] == "sa-IN"
    assert args["mode"] == "transcribe"
    assert args["model"] == settings.sarvam_stt_model
    assert set(args) == {"audio_data", "language_code", "mode", "model", "filename"}
    assert result["percent_strict"] == 1
    assert result["duration_ms"] == 1000
    assert result["replay_similarity"] is None


def test_long_audio_is_chunked_and_transcripts_joined_in_order(monkeypatch):
    client = configure(monkeypatch)
    client.speech_to_text.side_effect = [{"transcript": "क ख ग"}, {"transcript": "घ ङ च"}]
    result = asyncio.run(scorer_client.score(wav(31), ["क ख ग", "घ ङ च"], True))
    assert result["heard"] == "क ख ग घ ङ च"
    assert result["percent_strict"] == 1
    assert result["duration_ms"] == 31000
    from app.services.audio_meta import audio_seconds
    calls = client.speech_to_text.call_args_list
    assert len(calls) == 2
    assert all(0 < audio_seconds(call.kwargs["audio_data"]) <= 28 for call in calls)
    assert sum(audio_seconds(call.kwargs["audio_data"]) for call in calls) == pytest.approx(31)
    assert all(call.kwargs["language_code"] == "sa-IN" for call in calls)


def test_route_records_score_and_refunds_failed_call(client, monkeypatch):
    from app.db import SessionLocal
    from app.models import Shloka, UsageEvent
    stt = configure(monkeypatch)
    login = client.post("/auth/dev-login", json={"display_name": "sarvam-reciter", "bridge_langs": ["en"]})
    headers = {"Authorization": "Bearer " + login.json()["token"]}
    with SessionLocal() as db:
        verse = db.query(Shloka).first()
        uid = verse.verse_uid
        from app.services.chant_text import chant_lines
        stt.speech_to_text.return_value = {"transcript": " ".join(
            line["tts"] for line in chant_lines(verse.devanagari) if line["kind"] != "speaker")}
    request = dict(headers=headers, files={"file": ("r.wav", wav(), "audio/wav")}, data={"verse_uid": uid})
    result = client.post("/recite/score", **request)
    assert result.status_code == 200, result.text
    assert result.json()["percent"] == 100
    assert result.json()["perfect"] is True
    with SessionLocal() as db:
        spent_before = sum(row.amount for row in db.query(UsageEvent).filter(
            UsageEvent.surface == "recite", UsageEvent.kind == "stt_seconds").all())
    stt.speech_to_text.side_effect = SarvamError(503, "vendor unavailable")
    failed = client.post("/recite/score", **request)
    assert failed.status_code == 503
    with SessionLocal() as db:
        spent_after = sum(row.amount for row in db.query(UsageEvent).filter(
            UsageEvent.surface == "recite", UsageEvent.kind == "stt_seconds").all())
    assert spent_after == spent_before
    words = stt.speech_to_text.return_value["transcript"].split()
    middle = len(words) // 2
    stt.speech_to_text.side_effect = [{"transcript": " ".join(words[:middle])},
                                    {"transcript": " ".join(words[middle:])}]
    long = client.post("/recite/score", headers=headers,
                       files={"file": ("r.wav", wav(31), "audio/wav")}, data={"verse_uid": uid})
    assert long.status_code == 200, long.text
    assert long.json()["percent"] == 100
    too_long = client.post("/recite/score", headers=headers,
                           files={"file": ("r.wav", wav(601), "audio/wav")}, data={"verse_uid": uid})
    assert too_long.status_code == 422
    assert "10 minutes" in too_long.json()["detail"]


def test_chunk_failure_keeps_completed_usage_and_saves_no_partial_score(client, monkeypatch):
    from app.db import SessionLocal
    from app.models import Shloka, UsageEvent, ReciteAttempt
    from app.services.recite_audio import prepare
    from app.services.audio_meta import audio_seconds
    stt = configure(monkeypatch)
    stt.speech_to_text.side_effect = [{"transcript": "क ख ग"}, SarvamError(503, "unavailable")]
    login = client.post("/auth/dev-login", json={"display_name": "chunk-failure", "bridge_langs": ["en"]}).json()
    headers = {"Authorization": "Bearer " + login["token"]}
    learner_id = login["learner"]["id"]
    with SessionLocal() as db:
        uid = db.query(Shloka).first().verse_uid
    audio = wav(31)
    failed = client.post("/recite/score", headers=headers,
                         files={"file": ("long.wav", audio, "audio/wav")}, data={"verse_uid": uid})
    assert failed.status_code == 503
    with SessionLocal() as db:
        amount = sum(row.amount for row in db.query(UsageEvent).filter(
            UsageEvent.learner_id == learner_id, UsageEvent.kind == "stt_seconds").all())
        assert amount == pytest.approx(audio_seconds(prepare(audio).chunks[0][0]))
        assert db.query(ReciteAttempt).filter(ReciteAttempt.learner_id == learner_id).count() == 0


def test_missing_key_is_unavailable(monkeypatch):
    monkeypatch.setattr(settings, "scorer_url", "sarvam")
    monkeypatch.setattr(settings, "sarvam_api_key", "")
    assert not scorer_client.available()
