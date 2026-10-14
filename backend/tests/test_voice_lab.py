"""Offline protocol, cancellation and phonetics tests. No provider requests."""
import asyncio
import base64
import json

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
                    return json.dumps({"type": "audio", "data": {"audio": base64.b64encode(b"wav").decode()}})
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
        assert sent[0]["codec"] == "wav"
        await output.close()
    asyncio.run(run())


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
