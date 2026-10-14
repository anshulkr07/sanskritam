"""Provider adapters. Imports stay lazy so missing optional SDKs do not break the app."""
import asyncio
import base64
import json
from urllib.parse import urlencode

import httpx

from app.config import settings
from .config import LabConfig, instruction
from .indic_parler import IndicParlerAdapter
from .sanskrit_phonetics import SanskritPhoneticRouter


async def connect_ws(url):
    import websockets
    kwargs = {"max_size": 4 * 1024 * 1024, "open_timeout": 15}
    headers = {"Api-Subscription-Key": settings.sarvam_api_key}
    try:
        return await websockets.connect(url, additional_headers=headers, **kwargs)
    except TypeError:  # websockets 12/13
        return await websockets.connect(url, extra_headers=headers, **kwargs)


def gemini_client():
    from google import genai
    key = settings.gemini_api_key or settings.google_api_key
    if not key:
        # Reuse the project's configured keys without changing the text-model
        # pool or its routing. Dedicated voice credentials take precedence.
        from app.services.gemini_pool import parse_keys
        keys = parse_keys(settings.gemini_api_keys)
        key = keys[0] if keys else ""
    if not key:
        raise RuntimeError("Configure GEMINI_API_KEY, GOOGLE_API_KEY or GEMINI_API_KEYS for this pipeline.")
    return genai.Client(api_key=key)


async def sarvam_tokens(c, history):
    async with httpx.AsyncClient(timeout=60) as client:
        async with client.stream("POST", "https://api.sarvam.ai/v1/chat/completions",
                                 headers={"api-subscription-key": settings.sarvam_api_key},
                                 json={"model": "sarvam-105b-conversations", "stream": True,
                                       "messages": [{"role": "system", "content": instruction(c)}, *history],
                                       "temperature": c.temperature, "max_tokens": 600}) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if data == "[DONE]":
                    break
                choices = json.loads(data).get("choices", [])
                if choices:
                    token = choices[0].get("delta", {}).get("content")
                    if token:
                        yield token


async def gemini_tokens(c, history):
    client = gemini_client()
    config = {"system_instruction": instruction(c), "temperature": c.temperature,
              "thinking_config": {"thinking_budget": c.thinking_budget}, "max_output_tokens": 4600}
    if c.web_search:
        config["tools"] = [{"google_search": {}}]
    contents = [{"role": "model" if m["role"] == "assistant" else "user",
                 "parts": [{"text": m["content"]}]} for m in history]
    try:
        stream = await client.aio.models.generate_content_stream(model="gemini-2.5-flash", contents=contents, config=config)
        async for chunk in stream:
            if chunk.text:
                yield chunk.text
    finally:
        await client.aio.aclose()


class SpeechOutput:
    def __init__(self):
        self.socket = None
        self.model = None
        self.parler = IndicParlerAdapter()

    async def close(self):
        await self.parler.close()
        if self.socket:
            await self.socket.close()
            self.socket = None

    async def speak(self, text: str, c: LabConfig, send):
        if c.pipeline == 2 and c.open_provider == "ai4bharat_indic_parler":
            await self.parler.speak(text, c, send)
            return
        routed = SanskritPhoneticRouter.transform(text, c.language, c.visarga_expansion, c.schwa_fix, c.transliterate)
        if c.pipeline == 2 and c.open_provider == "edge_tts_prosody":
            import edge_tts
            # MP3 transport fragments aren't independently decodable; concatenate
            # one short clause in memory, then send it as one playable buffer.
            rate = f"{round((c.pace - 1) * 100):+d}%"
            voice = c.speaker
            audio = bytearray()
            async for chunk in edge_tts.Communicate(routed, voice, rate=rate).stream():
                if chunk["type"] == "audio":
                    audio.extend(chunk["data"])
            await send({"type": "audio", "codec": "mp3", "data": base64.b64encode(audio).decode(), "sample_rate": 24000})
            return
        if self.model != c.tts_model:
            await self.close()
        if self.socket is None:
            self.socket = await connect_ws("wss://api.sarvam.ai/text-to-speech/ws?" + urlencode({"model": c.tts_model, "send_completion_event": "true"}))
            self.model = c.tts_model
        await self.socket.send(json.dumps({"type": "config", "data": {
            "speaker": c.speaker, "language_code": c.language, "pace": c.pace,
            "temperature": c.temperature, "speech_sample_rate": 24000,
            "output_audio_codec": "wav", "min_buffer_size": 30, "max_chunk_length": 150}}))
        await self.socket.send(json.dumps({"type": "text", "data": {"text": routed}}))
        await self.socket.send(json.dumps({"type": "flush"}))
        while True:
            message = json.loads(await asyncio.wait_for(self.socket.recv(), 30))
            kind, data = message.get("type"), message.get("data") or {}
            if kind == "audio":
                await send({"type": "audio", "codec": "wav", "data": data["audio"], "sample_rate": 24000})
            elif kind in ("event", "events") and data.get("event_type") == "final":
                break
            elif kind == "error":
                raise RuntimeError("Sarvam TTS rejected the configuration. Check model, speaker and language.")


def live_config(c):
    result = {"response_modalities": ["AUDIO"], "system_instruction": instruction(c),
              "input_audio_transcription": {}, "output_audio_transcription": {},
              "temperature": c.temperature,
              "speech_config": {"voice_config": {"prebuilt_voice_config": {"voice_name": c.speaker}}}}
    # Current 3.8 Live explicitly forbids thinking_config. The older 2.5
    # native audio accepts budgets; 3.1 accepts levels rather than token budgets.
    if c.live_model.startswith("gemini-2.5"):
        result["thinking_config"] = {"thinking_budget": c.thinking_budget}
    elif c.live_model.startswith("gemini-3.1"):
        result["thinking_config"] = {"thinking_level": "minimal" if c.thinking_budget == 0 else "high"}
    if c.web_search:
        result["tools"] = [{"google_search": {}}]
    return result
