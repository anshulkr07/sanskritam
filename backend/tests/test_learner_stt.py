"""Talk's speech-to-text: keep the learner's Sanskrit, keep their own language.

Every transcript below is verbatim from a live saaras:v4 probe on 2026-09-23
(Bulbul-voiced lines, DECISIONS.md). Nothing here reaches Sarvam: the choice
between the two passes is a pure function of their outputs, and the router is
driven through a stubbed client.
"""

from __future__ import annotations

import asyncio
import io
import struct
import wave
from unittest.mock import AsyncMock, patch

import httpx
import pytest

from app.services.audio_meta import audio_seconds, estimate_seconds
from app.services.learner_stt import pick_transcript, reads_as_sanskrit, transcribe_learner
from app.services.sarvam import SarvamError


def _auto(text: str, lang: str, p: float = 1.0) -> dict:
    return {"transcript": text, "language_code": lang, "language_probability": p}


def _sa(text: str) -> dict:
    return {"transcript": text, "language_code": "sa-IN", "language_probability": None}


# ─── pick_transcript: the measured cases ─────────────────────────────────


@pytest.mark.parametrize(
    "auto,sanskrit",
    [
        # v4 auto-detect translated these into English at probability ~1.0.
        (_auto("My name is Anshul. I read Sanskrit.", "en-IN"),
         _sa("मम नाम अंशुलः। अहं संस्कृतं पठामि।")),
        (_auto("I eat five fruits.", "en-IN", 0.99),
         _sa("अहं पञ्चफलानि खादामि।")),
        (_auto("Today I will go to the shop with my friend and buy fruits.", "en-IN", 0.991),
         _sa("अद्य अहं मित्रेण सह आपणं गच्छामि, तत्र फलानि क्रीणामि।")),
        # ...or romanized them.
        (_auto("Bhavan kutra vasati?", "en-IN", 0.978), _sa("भवान् कुत्र वसति?")),
        # Kannada- and Telugu-accented Sanskrit: still English on auto.
        (_auto("I am Vidyalayam Gachhami.", "en-IN", 0.997), _sa("अहं विद्यालयं गच्छामि।")),
        (_auto("My name is Anshul, I study Sanskrit.", "en-IN", 0.992),
         _sa("मम नाम अंशुलः। अहं संस्कृतं पठामि।")),
        # v4 sometimes does hear Sanskrit; either pass is then fine.
        (_auto("भवान् कुत्र वसति?", "sa-IN", 0.559), _sa("भवान् कुत्र वसति?")),
    ],
)
def test_spoken_sanskrit_is_kept_as_sanskrit(auto, sanskrit):
    chosen, source = pick_transcript(auto, sanskrit)
    assert source == "sanskrit"
    assert chosen["transcript"] == sanskrit["transcript"]
    assert chosen["language_code"] == "sa-IN"


def test_the_learners_mistake_survives_transcription():
    """Auto-detect turned "अहं गच्छसि" (I you-go) into "I am going." — a
    correct English sentence. The tutor exists to catch exactly this error."""
    chosen, source = pick_transcript(_auto("I am going.", "en-IN", 0.991), _sa("अहं गच्छसि।"))
    assert source == "sanskrit"
    assert "गच्छसि" in chosen["transcript"]


@pytest.mark.parametrize(
    "auto,sanskrit",
    [
        # The Sanskrit pass TRANSLATED these into Sanskrit — Vidyut would
        # happily call the Tamil line healthy (r=0.83, root found).
        (_auto("என் பெயர் அன்ஷுல். நான் சமஸ்கிருதம் கற்றுக்கொள்கிறேன்.", "ta-IN", 0.932),
         _sa("एन नाम अन्शुल्। अहं संस्कृतम् शिक्षे।")),
        (_auto("ಅಹಂ ವಿದ್ಯಾಲಯಂ ಗಚ್ಛಾಮಿ ಅಂತ ಹೇಳಿದರೆ ಸರಿನಾ?", "kn-IN"),
         _sa("अहं विद्यालयं गच्छामि इति यदि वदामि।")),
        (_auto("ನನ್ನ ಹೆಸರು ಅಂಶುಲ್. ನಾನು ಸಂಸ್ಕೃತ ಕಲಿಯುತ್ತಿದ್ದೇನೆ.", "kn-IN"),
         _sa("मेरा नाम अंशुल्, अहं संस्कृतं शिक्षमाणः।")),
        (_auto("আমার নাম অংশুল। আমি সংস্কৃত শিখছি।", "bn-IN"),
         _sa("आमार नाम अंशुल, आमि संस्कृत शिकछी।")),
        (_auto("నా పేరు అంషుల్. నేను సంస్కృతం నేర్చుకుంటున్నాను.", "te-IN"),
         _sa("ना पेरु अंशुल्। नेनु संस्कृतं नेर्दुक्कुंटुन्ननु।")),
        (_auto("എന്റെ പേര് അൻഷുൽ. ഞാൻ സംസ്കൃതം പഠിക്കുന്നു.", "ml-IN"),
         _sa("मेरे पेरे अन्शुल्। मैं संस्कृतेम पढ़िणु।")),
        (_auto("मेरा नाम अंशु है। मैं संस्कृत सीख रहा हूँ।", "hi-IN", 0.817),
         _sa("मेरा नाम अंशु है। मैं संस्कृत सीख रहा हूँ।")),
        (_auto("माझं नाव अंशुल आहे. मी संस्कृत शिकतो आहे.", "mr-IN"),
         _sa("माझं नाव अंशुल आहे. मी संस्कृत शिकतो आहे.")),
    ],
)
def test_the_learners_own_language_is_never_rewritten(auto, sanskrit):
    chosen, source = pick_transcript(auto, sanskrit)
    assert (source, chosen) == ("auto", auto)


@pytest.mark.parametrize(
    "auto,sanskrit",
    [
        # Real English: the Sanskrit pass spells it out in Devanagari.
        (_auto("My name is Anshul and I am learning Sanskrit.", "en-IN"),
         _sa("माय नेम इज़ अंशुल, एण्ड आय् एम् लर्निङ्ग् संस्कृत।")),
        (_auto("How do I say I am going to school in Sanskrit?", "en-IN"),
         _sa("हाउ डू आई से आय् एम् गोयिङ्ग् टु स्कूल् इन् संस्कृत।")),
        # English carrying Sanskrit words — a question ABOUT Sanskrit.
        (_auto("Is aham gachhami correct or should I say gachhashi?", "en-IN"),
         _sa("इज अहम गच्छामि करेक्ट और शुड आई से गच्छासि?")),
        # Romanized Hindi that auto-detect labelled English.
        (_auto("Mujhe aham gachhami ka matlab samjhao.", "en-IN", 0.703),
         _sa("मुझे अहम गच्छामि का मतलब समझाओ।")),
    ],
)
def test_english_stays_english(auto, sanskrit):
    chosen, source = pick_transcript(auto, sanskrit)
    assert (source, chosen) == ("auto", auto)


def test_no_sanskrit_pass_means_the_auto_pass():
    auto = _auto("My name is Anshul. I read Sanskrit.", "en-IN")
    assert pick_transcript(auto, None) == (auto, "auto")


def test_nothing_detected_still_lets_sanskrit_through():
    """Auto-detect may answer language_code null; the client maps it to ""."""
    chosen, source = pick_transcript(_auto("", "", None), _sa("अहं विद्यालयं गच्छामि।"))
    assert source == "sanskrit"


def test_reads_as_sanskrit_refuses_hindi_and_blanks():
    assert reads_as_sanskrit("अहं विद्यालयं गच्छामि।")
    assert not reads_as_sanskrit("मेरा नाम अंशु है। मैं संस्कृत सीख रहा हूँ।")
    assert not reads_as_sanskrit("")


# ─── transcribe_learner: both passes, concurrently ───────────────────────


class _FakeSarvam:
    """Answers per language_code; both calls must be in flight at once."""

    def __init__(self, answers: dict, fail: dict | None = None) -> None:
        self.answers = answers
        self.fail = fail or {}
        self.calls: list[dict] = []
        self._started = 0
        self._both = asyncio.Event()

    async def speech_to_text(self, **kwargs):
        self.calls.append(kwargs)
        self._started += 1
        if self._started == 2:
            self._both.set()
        # Sequential calls would never reach 2 while the first waits here.
        await asyncio.wait_for(self._both.wait(), timeout=2.0)
        code = kwargs["language_code"]
        if code in self.fail:
            raise self.fail[code]
        return dict(self.answers[code])


def test_both_passes_run_together_with_the_same_model():
    fake = _FakeSarvam({
        "unknown": _auto("My name is Anshul. I read Sanskrit.", "en-IN"),
        "sa-IN": _sa("मम नाम अंशुलः। अहं संस्कृतं पठामि।"),
    })
    out = asyncio.run(transcribe_learner(fake, b"audio", filename="r.m4a", model="saaras:v4"))
    assert out["transcript"] == "मम नाम अंशुलः। अहं संस्कृतं पठामि।"
    assert out["source"] == "sanskrit"
    assert sorted(c["language_code"] for c in fake.calls) == ["sa-IN", "unknown"]
    assert {c["model"] for c in fake.calls} == {"saaras:v4"}
    assert {c["filename"] for c in fake.calls} == {"r.m4a"}


def test_a_failed_auto_pass_fails_the_turn():
    """The Sanskrit pass alone is never trusted: it turns Tamil into Sanskrit."""
    fake = _FakeSarvam(
        {"sa-IN": _sa("एन नाम अन्शुल्। अहं संस्कृतम् शिक्षे।")},
        fail={"unknown": SarvamError(503, "overloaded")},
    )
    with pytest.raises(SarvamError):
        asyncio.run(transcribe_learner(fake, b"audio"))


def test_a_failed_sanskrit_pass_falls_back_to_auto():
    auto = _auto("ನನ್ನ ಹೆಸರು ಅಂಶುಲ್.", "kn-IN")
    fake = _FakeSarvam({"unknown": auto}, fail={"sa-IN": SarvamError(500, "boom")})
    out = asyncio.run(transcribe_learner(fake, b"audio"))
    assert out["transcript"] == auto["transcript"]
    assert out["source"] == "auto"


# ─── /speech/stt ─────────────────────────────────────────────────────────


def _login(client, name):
    r = client.post("/auth/dev-login", json={"display_name": name, "bridge_langs": ["en"]})
    assert r.status_code == 200
    return {"Authorization": f"Bearer {r.json()['token']}"}


def _stub(answers: dict, fail: dict | None = None) -> AsyncMock:
    mock = AsyncMock()

    async def stt(**kwargs):
        code = kwargs["language_code"]
        if fail and code in fail:
            raise fail[code]
        return dict(answers[code])

    mock.speech_to_text.side_effect = stt
    return mock


def _wav(seconds: float, rate: int = 16000) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(b"\x00\x00" * int(rate * seconds))
    return buf.getvalue()


def test_talk_stt_keeps_sanskrit_and_reports_it(client):
    h = _login(client, "stt_talk_sa")
    mock = _stub({
        "unknown": _auto("I am going.", "en-IN", 0.991),
        "sa-IN": _sa("अहं गच्छसि।"),
    })
    with patch("app.routers.speech.get_sarvam_client", return_value=mock):
        r = client.post(
            "/speech/stt",
            files={"file": ("recording.m4a", _wav(1.0), "audio/m4a")},
            data={"language_code": "unknown", "mode": "transcribe"},
            headers=h,
        )
    assert r.status_code == 200, r.text
    assert r.json() == {"transcript": "अहं गच्छसि।", "language_code": "sa-IN",
                        "language_probability": None}
    assert mock.speech_to_text.await_count == 2


def test_talk_stt_keeps_the_learners_language(client):
    h = _login(client, "stt_talk_kn")
    mock = _stub({
        "unknown": _auto("ನನ್ನ ಹೆಸರು ಅಂಶುಲ್.", "kn-IN", 0.999),
        "sa-IN": _sa("मेरा नाम अंशुल्।"),
    })
    with patch("app.routers.speech.get_sarvam_client", return_value=mock):
        r = client.post(
            "/speech/stt",
            files={"file": ("recording.m4a", _wav(1.0), "audio/m4a")},
            data={"language_code": "unknown"},
            headers=h,
        )
    assert r.status_code == 200, r.text
    assert r.json() == {"transcript": "ನನ್ನ ಹೆಸರು ಅಂಶುಲ್.", "language_code": "kn-IN",
                        "language_probability": 0.999}


def test_a_pinned_language_is_still_one_call(client):
    h = _login(client, "stt_pinned")
    mock = _stub({"sa-IN": _sa("क")})
    with patch("app.routers.speech.get_sarvam_client", return_value=mock):
        r = client.post(
            "/speech/stt",
            files={"file": ("a.wav", _wav(1.0), "audio/wav")},
            data={"language_code": "sa-IN"},
            headers=h,
        )
    assert r.status_code == 200, r.text
    assert mock.speech_to_text.await_count == 1


def test_over_thirty_seconds_is_refused_before_quota_or_vendor(client):
    """Saaras REST answers 400 past 30 s; the app showed it as a network
    failure. A measurable recording is refused here, for free."""
    h = _login(client, "stt_long")
    mock = _stub({})
    with patch("app.routers.speech.get_sarvam_client", return_value=mock), \
            patch("app.routers.speech.check_and_consume") as consume:
        r = client.post(
            "/speech/stt",
            files={"file": ("long.wav", _wav(31.0), "audio/wav")},
            data={"language_code": "unknown"},
            headers=h,
        )
    assert r.status_code == 413
    assert "30 seconds" in r.json()["detail"]
    consume.assert_not_called()
    mock.speech_to_text.assert_not_called()


def test_saaras_length_refusal_is_a_413_not_a_502(client):
    """For a format this server cannot measure, Saaras is the one to say so."""
    h = _login(client, "stt_long_unmeasured")
    too_long = SarvamError(400, '{"error":{"message":"Audio duration exceeds the maximum '
                                'limit of 30 seconds. Please use the batch API for longer '
                                'audio files.","code":"invalid_request_error"}}')
    mock = _stub({}, fail={"sa-IN": too_long})
    with patch("app.routers.speech.get_sarvam_client", return_value=mock):
        r = client.post(
            "/speech/stt",
            files={"file": ("x.webm", b"\x1a\x45\xdf\xa3" + b"\x00" * 64, "audio/webm")},
            data={"language_code": "sa-IN"},
            headers=h,
        )
    assert r.status_code == 413


# ─── The Sarvam client ───────────────────────────────────────────────────


def _client(handler):
    from app.services.sarvam import SarvamClient

    c = SarvamClient(api_key="test-key")
    c._http = httpx.AsyncClient(base_url="https://api.sarvam.ai", transport=httpx.MockTransport(handler))
    return c


def _form_fields(request: httpx.Request) -> dict:
    body = request.content.decode("utf-8", "replace")
    fields = {}
    for part in body.split("Content-Disposition: form-data; ")[1:]:
        head, _, rest = part.partition("\r\n\r\n")
        if 'name="' in head and "filename=" not in head:
            fields[head.split('name="')[1].split('"')[0]] = rest.split("\r\n")[0]
    return fields


def test_stt_client_sends_the_configured_model_and_reads_v4_fields():
    from app.config import settings

    seen = {}

    async def run():
        def handler(request):
            seen.update(_form_fields(request))
            return httpx.Response(200, request=request, json={
                "request_id": "r", "transcript": "नमस्ते", "language_code": "hi-IN",
                "language_probability": 0.95})
        c = _client(handler)
        try:
            return await c.speech_to_text(audio_data=b"x", language_code="unknown")
        finally:
            await c.close()

    out = asyncio.run(run())
    assert seen["model"] == settings.sarvam_stt_model
    assert out == {"transcript": "नमस्ते", "language_code": "hi-IN", "language_probability": 0.95}


def test_stt_client_survives_a_null_language():
    """Auto-detect may answer language_code null; STTResponse needs a str."""
    async def run():
        def handler(request):
            return httpx.Response(200, request=request, json={
                "transcript": "", "language_code": None, "language_probability": None})
        c = _client(handler)
        try:
            return await c.speech_to_text(audio_data=b"x", language_code="unknown")
        finally:
            await c.close()

    assert asyncio.run(run())["language_code"] == ""


# ─── audio_meta ──────────────────────────────────────────────────────────


def _mp4(timescale: int, duration: int, version: int = 0, moov_last: bool = True) -> bytes:
    def box(kind: bytes, payload: bytes) -> bytes:
        return struct.pack(">I", 8 + len(payload)) + kind + payload

    if version == 1:
        mvhd = bytes([1, 0, 0, 0]) + struct.pack(">QQIQ", 0, 0, timescale, duration)
    else:
        mvhd = bytes([0, 0, 0, 0]) + struct.pack(">IIII", 0, 0, timescale, duration)
    mvhd += b"\x00" * 80            # rate, volume, matrix... — not read
    ftyp = box(b"ftyp", b"M4A \x00\x00\x00\x00isomM4A ")
    moov = box(b"moov", box(b"mvhd", mvhd))
    mdat = box(b"mdat", b"\x00" * 256)
    return ftyp + (mdat + moov if moov_last else moov + mdat)


def test_wav_duration_is_read_from_the_header():
    assert audio_seconds(_wav(2.5)) == pytest.approx(2.5)
    assert audio_seconds(_wav(1.0, rate=22050)) == pytest.approx(1.0)


def test_a_streaming_wav_header_uses_the_bytes_that_arrived():
    data = bytearray(_wav(2.0))
    pos = data.index(b"data")
    data[pos + 4:pos + 8] = struct.pack("<I", 0xFFFFFFFF)
    assert audio_seconds(bytes(data)) == pytest.approx(2.0)


def test_m4a_duration_is_read_from_mvhd():
    """Talk records AAC in .m4a: 20 s at 32 kbps is ~80 KB, which the old
    bytes/32000 guess metered as 2.5 s."""
    assert audio_seconds(_mp4(44100, 44100 * 20)) == pytest.approx(20.0)
    assert audio_seconds(_mp4(1000, 12_345, moov_last=False)) == pytest.approx(12.345)
    assert audio_seconds(_mp4(16000, 16000 * 3, version=1)) == pytest.approx(3.0)


def test_unknown_duration_and_other_formats_fall_back():
    assert audio_seconds(_mp4(44100, 0xFFFFFFFF)) is None
    assert audio_seconds(b"\x00\x00" * 8000) is None
    assert audio_seconds(b"\x1a\x45\xdf\xa3" + b"\x00" * 64) is None     # webm
    assert estimate_seconds(b"\x00\x00" * 8000) == pytest.approx(0.5)     # old guess
