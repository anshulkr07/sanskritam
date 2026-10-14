"""Offline protocol, cancellation and phonetics tests. No provider requests."""
import asyncio
import base64
import json
import io
import wave

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.voice_lab.config import LabConfig
from app.voice_lab.providers import SpeechOutput, live_config
from app.voice_lab.sanskrit_phonetics import SanskritPhoneticRouter as Router, take_clauses
from app.voice_lab.session import VoicePipelineSession
import app.voice_lab.router as routes


@pytest.mark.parametrize("field,value", [("pipeline", 5), ("pitch", 13), ("pace", 0.1), ("thinking_budget", 5000), ("language", "en-IN")])
def test_bad_settings(field, value):
    with pytest.raises(ValidationError):
        LabConfig.model_validate({field: value})


def test_phonetics_handles_matras_and_keeps_virama():
    assert Router.transform("हरिः गुरुः रामः।", "mr-IN") == "हरिहि गुरुहु रामह."
    assert Router.transform("राम वाक् शक्ति", "hi-IN", False) == "रामअ वाक् शक्ति"
    assert Router.transform("रामः", "mr-IN", False) == "रामः"
    assert Router.transform("राम", "te-IN", False) == "రామ"
    assert Router.transform("राम", "kn-IN", False) == "ರಾಮ"


def test_clause_boundaries_and_unfinished_word():
    clauses, pending = take_clauses("नमस्ते। कथम् असि")
    assert clauses == ["नमस्ते।"] and pending.strip() == "कथम् असि"
    clauses, pending = take_clauses("एक द्वि त्रि चतुर् पञ्च षट् सप्त")
    assert len(clauses) == 1 and pending == "सप्त"
    assert take_clauses(pending, final=True) == (["सप्त"], "")


def test_gemini_model_specific_thinking():
    from google.genai.types import LiveConnectConfig
    for model in ("gemini-3.8-live", "gemini-3.1-flash-live-preview", "gemini-2.5-flash-native-audio-preview-12-2025"):
        LiveConnectConfig(**live_config(LabConfig(live_model=model, web_search=True)))
    assert "thinking_config" not in live_config(LabConfig(live_model="gemini-3.8-live"))
    assert live_config(LabConfig(live_model="gemini-3.1-flash-live-preview", thinking_budget=512))["thinking_config"] == {"thinking_level": "high"}
    assert live_config(LabConfig(live_model="gemini-2.5-flash-native-audio-preview-12-2025", thinking_budget=512))["thinking_config"] == {"thinking_budget": 512}


class FakeSession:
    instances = []

    def __init__(self, config, send, meter):
        self.config, self.send = config, send
        self.closed = False
        self.__class__.instances.append(self)

    async def start(self):
        pass

    async def close(self):
        self.closed = True

    async def audio(self, pcm):
        await self.send({"type": "audio_received", "size": len(pcm)})

    async def update(self, config):
        self.config = config

    async def interrupt(self):
        await self.send({"type": "interrupted"})

    async def playback(self, busy):
        self.playback_busy = busy

    async def barge_in(self):
        await self.interrupt()
        await self.send({"type": "barge_in_ready"})

    async def text(self, text):
        await self.send({"type": "transcript", "role": "assistant", "text": "नमस्ते।", "final": False})


@pytest.fixture
def lab_client(monkeypatch):
    FakeSession.instances = []
    monkeypatch.setattr(routes, "authenticate", lambda ticket: "learner" if ticket == "valid" else (_ for _ in ()).throw(ValueError()))
    monkeypatch.setattr(routes, "consume", lambda *args: None)
    monkeypatch.setattr(routes, "STRATEGIES", {i: FakeSession for i in range(1, 5)})
    app = FastAPI()
    app.include_router(routes.router)
    with TestClient(app) as client:
        yield client


def test_socket_audio_config_text_and_switch(lab_client):
    with lab_client.websocket_connect("/ws/voice-lab") as ws:
        ws.send_json({"ticket": "valid"})
        assert ws.receive_json()["type"] == "ready"
        ws.send_bytes(b"\0\0" * 160)
        assert ws.receive_json() == {"type": "audio_received", "size": 320}
        ws.send_json({"type": "config", "config": {"pace": 1.2}})
        assert ws.receive_json()["config"]["pace"] == 1.2
        ws.send_json({"type": "config", "config": {"pace": 20}})
        assert ws.receive_json()["type"] == "error"
        assert FakeSession.instances[-1].config.pace == 1.2
        ws.send_json({"type": "config", "config": {"pipeline": 3, "speaker": "Puck"}})
        assert ws.receive_json()["type"] == "interrupted"
        assert ws.receive_json()["config"]["pipeline"] == 3
        assert FakeSession.instances[0].closed
        ws.send_json({"type": "text", "text": "नमस्ते"})
        assert ws.receive_json()["role"] == "user"
        assert ws.receive_json()["role"] == "assistant"
        ws.send_json({"type": "stop"})
    assert all(s.closed for s in FakeSession.instances)


def test_unauthenticated_socket_never_starts_provider(lab_client):
    from starlette.websockets import WebSocketDisconnect
    with lab_client.websocket_connect("/ws/voice-lab") as ws:
        ws.send_json({"ticket": "invalid"})
        with pytest.raises(WebSocketDisconnect) as caught:
            ws.receive_json()
        assert caught.value.code == 4401
    assert not FakeSession.instances


def test_malformed_messages_and_frames_are_recoverable(lab_client):
    with lab_client.websocket_connect("/ws/voice-lab") as ws:
        ws.send_json({"ticket": "valid"}); ws.receive_json()
        for text in ("bad-json", "null", "[]", '{"type":"config","config":42}'):
            ws.send_text(text)
            assert ws.receive_json()["type"] == "error"
        ws.send_bytes(b"x")
        assert ws.receive_json()["type"] == "error"
        ws.send_json({"type": "stop"})


def test_playback_feedback_is_negotiated_and_validated(lab_client):
    with lab_client.websocket_connect("/ws/voice-lab") as ws:
        ws.send_json({"ticket": "valid", "capabilities": {"playback_feedback": True}})
        assert ws.receive_json()["capabilities"]["playback_feedback"] is True
        ws.send_json({"type": "playback", "busy": True})
        ws.send_json({"type": "text", "text": "नमस्ते।"})
        ws.receive_json(); ws.receive_json()
        assert FakeSession.instances[-1].playback_busy is True
        ws.send_json({"type": "playback", "busy": "false"})
        assert ws.receive_json()["type"] == "error"
        ws.send_json({"type": "playback", "busy": False})
        ws.send_json({"type": "text", "text": "नमस्ते।"})
        ws.receive_json(); ws.receive_json()
        assert FakeSession.instances[-1].playback_busy is False
        ws.send_json({"type": "stop"})


def test_delayed_stt_cannot_interrupt_playback_after_generation_finishes():
    async def run():
        messages, turns = [], []
        async def send(message): messages.append(message)
        async def meter(*args): pass
        session = VoicePipelineSession(LabConfig(), send, meter)
        session.playback_feedback = True
        session.turn = asyncio.create_task(asyncio.sleep(0))
        await session.turn
        await session.send({"type": "audio", "codec": "pcm", "data": "AAA="})
        async def text(value): turns.append(value)
        session.text = text
        class Input:
            def __aiter__(self):
                async def messages():
                    yield json.dumps({"type": "events", "data": {"signal_type": "START_SPEECH"}})
                    yield json.dumps({"type": "data", "data": {"request_id": "stale", "transcript": "late input"}})
                    await session.playback(False)
                    yield json.dumps({"type": "data", "data": {"request_id": "new", "transcript": "new input"}})
                return messages()
        session.upstream = Input()
        await session.listen()
        assert turns == ["new input"]
        assert not any(message["type"] == "interrupted" for message in messages)
    asyncio.run(run())


def test_eight_word_sentence_synthesizes_every_clause_and_tail():
    async def run():
        messages, spoken = [], []
        sentence = "अद्य अहं मित्रैः सह ग्रामस्य सुन्दरं उद्यानं पश्यामि।"
        async def send(message): messages.append(message)
        async def meter(*args): pass
        class Fixed(VoicePipelineSession):
            async def tokens(self, config):
                for word in sentence.split():
                    yield word + " "
        class Output:
            async def speak(self, text, config, send):
                spoken.append(text)
                await send({"type": "audio", "codec": "pcm", "data": "AAA="})
            async def close(self): pass
        session = Fixed(LabConfig(), send, meter); session.tts = Output()
        await session.respond("test")
        assert " ".join(spoken).split() == sentence.split()
        assert len(" ".join(spoken).split()) == 8
        assert messages[-1]["type"] == "turn_complete"
        assert sum(message["type"] == "audio" for message in messages) == 2
    asyncio.run(run())


def test_barge_in_negotiation_and_acknowledgement(lab_client):
    with lab_client.websocket_connect("/ws/voice-lab") as ws:
        ws.send_json({"ticket": "valid", "capabilities": {"barge_in": True}})
        assert ws.receive_json()["capabilities"]["barge_in"] is True
        ws.send_json({"type": "barge_in"})
        assert ws.receive_json()["type"] == "interrupted"
        assert ws.receive_json()["type"] == "barge_in_ready"
        ws.send_bytes(b"\0\0" * 160)
        assert ws.receive_json()["type"] == "audio_received"
        ws.send_json({"type": "stop"})


def test_live_manual_activity_preserves_prefix_and_interrupts_without_prompt():
    from app.voice_lab.session import GeminiNativeSession
    from google.genai.types import LiveConnectConfig
    async def run():
        frames, messages = [], []
        async def send(message): messages.append(message)
        async def meter(*args): pass
        class Input:
            async def send_realtime_input(self, **kwargs): frames.append(kwargs)
        session = GeminiNativeSession(LabConfig(pipeline=3, speaker="Puck"), send, meter)
        session.barge_enabled = True; session.audio_started = False; session.input_prefix = bytearray(); session.upstream = Input()
        await session.audio(b"\0\0" * 1600)
        assert not frames, "Silence must not start or interrupt a Live activity"
        await session.audio(b"\xff\x0f" * 1600)
        assert "activity_start" in frames[0]
        assert frames[1]["audio"].data == b"\0\0" * 1600 + b"\xff\x0f" * 1600
        await session.end_audio()
        assert "activity_end" in frames[-1]
        await session.barge_in()
        assert "activity_start" in frames[-1]
        assert messages[-1]["type"] == "barge_in_ready"
        config = live_config(session.config, manual_input=True)
        LiveConnectConfig(**config)
        assert config["realtime_input_config"]["automatic_activity_detection"]["disabled"] is True
    asyncio.run(run())


def test_interruption_cancels_synthesis_and_closes_provider():
    async def run():
        sent, cancelled = [], asyncio.Event()
        async def send(msg): sent.append(msg)
        async def meter(*args): pass
        class Output:
            async def close(self): cancelled.set()
        session = VoicePipelineSession(LabConfig(), send, meter)
        session.tts = Output()
        session.turn = asyncio.create_task(asyncio.sleep(30))
        task = session.turn
        await session.interrupt()
        assert task.cancelled() and cancelled.is_set()
        assert sent == [{"type": "interrupted"}]
    asyncio.run(run())


def test_sarvam_tts_protocol_and_completion(monkeypatch):
    async def run():
        messages, sent = [], []
        class Socket:
            async def send(self, raw): messages.append(json.loads(raw))
            async def recv(self):
                if not sent:
                    return json.dumps({"type": "audio", "data": {"audio": base64.b64encode(wav_bytes(b"\x01\x00" * 160)).decode()}})
                return json.dumps({"type": "event", "data": {"event_type": "final"}})
            async def close(self): pass
        async def connect(url):
            assert "send_completion_event=true" in url
            return Socket()
        async def send(msg): sent.append(msg)
        monkeypatch.setattr("app.voice_lab.providers.connect_ws", connect)
        output = SpeechOutput()
        await output.speak("राम।", LabConfig(), send)
        assert [m["type"] for m in messages] == ["config", "text", "flush"]
        assert messages[0]["data"]["output_audio_codec"] == "wav"
        assert messages[1]["data"]["text"] == "రామ."
        assert sent[0]["codec"] == "pcm"
        assert base64.b64decode(sent[0]["data"]) == b"\x01\x00" * 160
        await output.close()
    asyncio.run(run())


def wav_bytes(pcm):
    result = io.BytesIO()
    with wave.open(result, "wb") as wav:
        wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(24000)
        wav.writeframes(pcm)
    return result.getvalue()


def test_sarvam_fragmented_wav_header_and_odd_audio_packets():
    from app.voice_lab.wav_stream import WavStream
    pcm = b"\x01\x00\x02\x00" * 100
    raw = bytearray(wav_bytes(pcm))
    raw[4:8] = b"\xff" * 4; raw[40:44] = b"\xff" * 4
    stream = WavStream()
    pieces = [bytes(raw[:17]), bytes(raw[17:44]), bytes(raw[44:101]), bytes(raw[101:])]
    output = [stream.feed(piece) for piece in pieces]
    assert output[:2] == [b"", b""], "Do not try to play the WAV header"
    assert b"".join(output) == pcm
    assert all(len(piece) % 2 == 0 for piece in output)
    assert stream.sample_rate == 24000
    stream.finish()


def test_wav_empty_or_incomplete_is_explicit():
    from app.voice_lab.wav_stream import WavStream
    for raw in (b"", wav_bytes(b""), wav_bytes(b"\x01\x00")[:-1]):
        stream = WavStream(); stream.feed(raw)
        with pytest.raises(RuntimeError, match="incomplete or empty"):
            stream.finish()


def test_wav_socket_format_persists_across_clauses_and_accepts_new_headers():
    from app.voice_lab.wav_stream import WavStream
    stream = WavStream()
    first, second = b"\x01\x00" * 20, b"\x02\x00" * 30
    stream.begin_turn(); assert stream.feed(wav_bytes(first)) == first; stream.finish()
    stream.begin_turn(); assert stream.feed(second) == second; stream.finish()
    stream.begin_turn(); assert stream.feed(wav_bytes(first)) == first; stream.finish()


def test_stt_audio_flush_and_repeated_request_deduplication():
    async def run():
        frames, turns, sent = [], [], []
        class Input:
            async def send(self, frame): frames.append(json.loads(frame))
            def __aiter__(self):
                async def messages():
                    for _ in range(2):
                        yield json.dumps({"type": "data", "data": {"request_id": "same", "transcript": "नमस्ते।"}})
                return messages()
        async def send(message): sent.append(message)
        async def meter(*args): pass
        session = VoicePipelineSession(LabConfig(), send, meter)
        session.upstream = Input()
        async def text(value): turns.append(value)
        session.text = text
        await session.audio(b"\x01\x00" * 160)
        await session.end_audio()
        assert base64.b64decode(frames[0]["audio"]["data"]) == b"\x01\x00" * 160
        assert frames[-1] == {"type": "flush"}
        await session.listen()
        assert turns == ["नमस्ते।"]
    asyncio.run(run())


def test_empty_model_answer_reports_error_instead_of_silent_completion():
    async def run():
        messages = []
        async def send(message): messages.append(message)
        async def meter(*args): pass
        class Empty(VoicePipelineSession):
            async def tokens(self, config):
                if False: yield ""
        session = Empty(LabConfig(), send, meter)
        await session.respond("नमस्ते।")
        assert messages[0]["type"] == "response_started"
        assert messages[-1]["type"] == "error"
        assert "no spoken answer" in messages[-1]["message"]
        assert not any(message["type"] == "turn_complete" for message in messages)
    asyncio.run(run())


def test_hybrid_current_model_search_quota_and_configured_vertex_fallback(monkeypatch):
    from types import SimpleNamespace
    from app.voice_lab import providers
    async def run():
        calls, notices, closed = [], [], []
        class Failure(Exception):
            def __init__(self, code): self.code = code
            def __str__(self): return "search quota exhausted" if self.code == 429 else "service unavailable"
        class Models:
            def __init__(self, vertex=False): self.vertex = vertex
            async def generate_content_stream(self, **kwargs):
                calls.append((self.vertex, json.loads(json.dumps(kwargs))))
                if not self.vertex: raise Failure(429 if len(calls) == 1 else 503)
                async def tokens(): yield SimpleNamespace(text="नमस्ते।")
                return tokens()
        def client(vertex=False):
            async def close(): closed.append(vertex)
            return SimpleNamespace(aio=SimpleNamespace(models=Models(vertex), aclose=close))
        monkeypatch.setattr(providers, "gemini_client", lambda: client())
        monkeypatch.setattr(providers, "vertex_client", lambda: client(True))
        monkeypatch.setattr(providers.settings, "gemini_free_models", "gemini-3.8-flash,gemini-3.7-flash")
        async def send(message): notices.append(message)
        result = "".join([text async for text in providers.gemini_tokens(LabConfig(pipeline=4, web_search=True, thinking_budget=1024), [{"role": "user", "content": "नमस्ते।"}], send)])
        assert result == "नमस्ते।"
        assert [vertex for vertex, _ in calls] == [False, False, False, True]
        assert all(call["model"] != "gemini-2.5-flash" for _, call in calls)
        assert calls[0][1]["config"]["thinking_config"] == {"thinking_level": "medium"}
        assert "tools" not in calls[1][1]["config"]
        assert "tools" in calls[-1][1]["config"]
        assert any("without web grounding" in message["message"] for message in notices)
        assert closed == [False, True]
    asyncio.run(run())


def test_gemini_live_search_quota_keeps_voice_available(monkeypatch):
    from types import SimpleNamespace
    from app.voice_lab import session as sessions
    async def run():
        configs, messages = [], []
        class Quota(Exception):
            code = 1011
            def __str__(self): return "You exceeded your current quota"
        class Connection:
            def __init__(self, config): self.config = config
            async def __aenter__(self):
                if "tools" in self.config: raise Quota()
                return SimpleNamespace(receive=self.receive)
            async def receive(self):
                await asyncio.Event().wait()
                if False: yield None
            async def __aexit__(self, *args): pass
        def connect(**kwargs):
            configs.append(kwargs["config"]); return Connection(kwargs["config"])
        async def close(): pass
        monkeypatch.setattr(sessions, "gemini_client", lambda: SimpleNamespace(aio=SimpleNamespace(live=SimpleNamespace(connect=connect), aclose=close)))
        monkeypatch.setattr(sessions, "vertex_client", lambda: None)
        async def send(message): messages.append(message)
        async def meter(*args): pass
        session = sessions.GeminiNativeSession(LabConfig(pipeline=3, web_search=True, speaker="Puck"), send, meter)
        await session.start(); await session.close()
        assert "tools" in configs[0] and "tools" not in configs[1]
        assert messages[0]["type"] == "notice"
        assert "without web grounding" in messages[0]["message"]
    asyncio.run(run())


def test_live_grounded_search_tool_uses_reserved_budget_and_returns_sources(monkeypatch):
    from types import SimpleNamespace
    from app.voice_lab import session as sessions
    from google.genai import types
    async def run():
        responses, metered, messages = [], [], []
        async def send(message): messages.append(message)
        async def meter(kind, amount): metered.append((kind, amount))
        async def lookup(query, client):
            assert query == "Python release"
            return {"result": "उत्तरम्।", "sources": [{"title": "Python", "url": "https://www.python.org/"}]}
        monkeypatch.setattr(sessions, "grounded_search", lookup)
        async def respond(**kwargs): responses.extend(kwargs["function_responses"])
        session = sessions.GeminiNativeSession(LabConfig(pipeline=3, web_search=True), send, meter)
        session.search_client = object()
        session.upstream = SimpleNamespace(send_tool_response=respond)
        await session.search(types.FunctionCall(id="lookup-1", name="web_search", args={"query": "Python release"}))
        assert metered == [("llm_calls", 1), ("gemini_inr", 1)]
        assert responses[0].id == "lookup-1"
        assert responses[0].response["sources"][0]["url"] == "https://www.python.org/"
        assert responses[0].scheduling == types.FunctionResponseScheduling.WHEN_IDLE
        assert messages[0]["type"] == "notice"
    asyncio.run(run())


def test_grounded_search_refuses_a_reply_without_verified_sources(monkeypatch):
    from types import SimpleNamespace
    from app.voice_lab.providers import grounded_search
    async def run():
        async def generate(**kwargs):
            assert kwargs["config"]["tools"] == [{"google_search": {}}]
            return SimpleNamespace(text="unverified answer", candidates=[])
        client = SimpleNamespace(aio=SimpleNamespace(models=SimpleNamespace(generate_content=generate)))
        with pytest.raises(RuntimeError, match="no verified sources"):
            await grounded_search("current facts", client)
    asyncio.run(run())


def test_live_search_fallback_config_has_a_metered_function_instead_of_builtin_search():
    from google.genai.types import LiveConnectConfig
    config = live_config(LabConfig(pipeline=3, web_search=True), search_fallback=True)
    LiveConnectConfig(**config)
    function = config["tools"][0]["function_declarations"][0]
    assert function["name"] == "web_search"
    assert function["behavior"] == "NON_BLOCKING"
    assert "google_search" not in config["tools"][0]


def test_ticket_auth_scope_and_single_use(client, auth_headers):
    assert client.post("/voice-lab/ticket").status_code == 401
    ticket = client.post("/voice-lab/ticket", headers=auth_headers).json()["ticket"]
    assert routes.authenticate(ticket)
    with pytest.raises(Exception):
        routes.authenticate(ticket)


def test_hybrid_filler_order_and_unmodified_transcript():
    async def run():
        sent, spoken = [], []
        async def send(message): sent.append(message)
        async def meter(*args): pass
        class Output:
            async def speak(self, text, config, send): spoken.append(text)
            async def close(self): pass
        class Delayed(VoicePipelineSession):
            async def tokens(self, config):
                await asyncio.sleep(0.4)
                yield "रामः वनं "
                yield "गच्छति।"
        session = Delayed(LabConfig(pipeline=4, thinking_budget=128), send, meter)
        session.tts = Output()
        await session.respond("कुत्र गच्छति?")
        assert spoken == ["एकं क्षणम्, अहं विचारयामि।", "रामः वनं गच्छति।"]
        assert "".join(m["text"] for m in sent if m["type"] == "transcript") == "रामः वनं गच्छति।"
        assert sent[-1]["type"] == "turn_complete"
    asyncio.run(run())


def test_gemini_key_precedence_and_existing_pool(monkeypatch):
    from google import genai
    from app.config import settings
    from app.voice_lab.providers import gemini_client
    monkeypatch.setattr(genai, "Client", lambda api_key: api_key)
    monkeypatch.setattr(settings, "gemini_api_keys", "pool-one,pool-two")
    monkeypatch.setattr(settings, "google_api_key", "")
    monkeypatch.setattr(settings, "gemini_api_key", "")
    assert gemini_client() == "pool-one"
    monkeypatch.setattr(settings, "google_api_key", "google-key")
    assert gemini_client() == "google-key"
    monkeypatch.setattr(settings, "gemini_api_key", "dedicated-key")
    assert gemini_client() == "dedicated-key"
