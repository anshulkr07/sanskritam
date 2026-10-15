"""Provider adapters. Imports stay lazy so missing optional SDKs do not break the app."""
import asyncio
import base64
import json
import contextlib
from urllib.parse import urlencode

import httpx

from app.config import settings
from .config import LabConfig, instruction
from .indic_parler import IndicParlerAdapter
from .sanskrit_phonetics import SanskritPhoneticRouter
from .wav_stream import WavStream


async def connect_ws(url):
    import websockets
    kwargs = {"max_size": 4 * 1024 * 1024, "open_timeout": 15}
    headers = {"Api-Subscription-Key": settings.sarvam_api_key}
    try:
        return await websockets.connect(url, additional_headers=headers, **kwargs)
    except TypeError:  # websockets 12/13
        return await websockets.connect(url, extra_headers=headers, **kwargs)


def search_unavailable(exc):
    """Only degrade search for provider quota/capability failures, never bad auth."""
    detail = str(exc).lower()
    return (getattr(exc, "code", None) == 429 or "quota" in detail or
            (any(word in detail for word in ("google_search", "google search", "grounding")) and
             any(word in detail for word in ("unsupported", "not supported", "not available", "permission"))))


def provider_error(exc):
    from app.services.quota import QuotaExceeded
    if isinstance(exc, QuotaExceeded):
        labels = {"gemini_inr": "Gemini voice and replies", "gemini_budget": "Gemini service", "stt_seconds": "speech recognition", "tts_chars": "spoken replies", "llm_calls": "replies", "daily_budget": "speech service"}
        return f"The app's daily allowance for {labels.get(exc.kind, 'voice')} is used. It refreshes as earlier usage expires."
    code = getattr(exc, "code", None)
    if code == 404:
        return "The selected provider model is unavailable. Update the Voice Lab model configuration."
    if code == 429 or "quota" in str(exc).lower():
        return "Provider quota is exhausted. Try again later or use another companion."
    if code in (401, 403):
        return "The provider account cannot access this model or tool. Check server credentials and account access."
    if code in (500, 503, 504):
        return "The reply service is temporarily unavailable. Try again in a moment."
    return str(exc) if isinstance(exc, RuntimeError) else "Provider request failed. Check the selected model, voice and server configuration."


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


def vertex_client():
    """Reuse the app's already configured paid fallback; caller reserves quota."""
    from app.services.vertex_live import credentials_info
    from google import genai
    from google.oauth2 import service_account
    info = credentials_info()
    if not info:
        return None
    credentials = service_account.Credentials.from_service_account_info(info, scopes=["https://www.googleapis.com/auth/cloud-platform"])
    return genai.Client(vertexai=True, project=settings.vertex_project, location=settings.vertex_location, credentials=credentials)


async def grounded_search(query, client):
    """A real grounded lookup for Live accounts without built-in search quota."""
    async with asyncio.timeout(25):
        answer = await client.aio.models.generate_content(model="gemini-3.8-flash", contents=query, config={
            "system_instruction": "Use Google Search to verify the requested facts. Answer concisely in Sanskrit Devanagari. Never invent a source or present unverified current facts as verified.",
            "tools": [{"google_search": {}}], "thinking_config": {"thinking_level": "low"}, "max_output_tokens": 1600,
        })
    if not answer.text:
        raise RuntimeError("Web search returned no answer.")
    sources = []
    for candidate in answer.candidates or []:
        metadata = candidate.grounding_metadata
        for chunk in (metadata.grounding_chunks or []) if metadata else []:
            if chunk.web and chunk.web.uri:
                sources.append({"title": chunk.web.title or "Source", "url": chunk.web.uri})
    if not sources:
        raise RuntimeError("Web search returned no verified sources.")
    return {"result": answer.text, "sources": sources[:8]}


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


async def gemini_tokens(c, history, send=None):
    client = gemini_client()
    config = {"system_instruction": instruction(c), "temperature": c.temperature,
              "thinking_config": {"thinking_level": "low" if c.thinking_budget < 1024 else "medium" if c.thinking_budget < 2048 else "high"},
              "max_output_tokens": 4600}
    if c.web_search:
        config["tools"] = [{"google_search": {}}]
    contents = [{"role": "model" if m["role"] == "assistant" else "user",
                 "parts": [{"text": m["content"]}]} for m in history]
    try:
        yielded = False
        models = list(dict.fromkeys(["gemini-3.8-flash", *settings.gemini_free_models.split(",")]))
        models = [model.strip() for model in models if model.strip()]
        model_index = 0
        using_vertex = False
        for attempt in range(4):
            try:
                async with asyncio.timeout(30):
                    stream = await client.aio.models.generate_content_stream(model=models[model_index], contents=contents, config=config)
                    async for chunk in stream:
                        if chunk.text:
                            yielded = True
                            yield chunk.text
                if not yielded:
                    raise RuntimeError("The model returned no spoken answer. Try another question.")
                break
            except Exception as exc:
                if not yielded and not using_vertex:
                    if "tools" in config and search_unavailable(exc):
                        config.pop("tools", None)
                        if send:
                            await send({"type": "notice", "message": "Google Search is unavailable for this provider account. This reply continues without web grounding."})
                        continue
                    if attempt < 2 and getattr(exc, "code", None) in (404, 429, 500, 503) and model_index + 1 < len(models):
                        model_index += 1
                        if send:
                            await send({"type": "notice", "message": f"The primary reply model is unavailable; using {models[model_index]} for this reply."})
                        continue
                    if getattr(exc, "code", None) in (404, 429, 500, 503) or isinstance(exc, TimeoutError):
                        fallback = vertex_client()
                        if fallback:
                            await client.aio.aclose()
                            client = fallback; using_vertex = True; model_index = 0
                            if c.web_search:
                                config["tools"] = [{"google_search": {}}]
                            if send:
                                await send({"type": "notice", "message": "The primary reply service is unavailable. Retrying with the configured fallback" + (" and web grounding." if c.web_search else ".")})
                            continue
                if isinstance(exc, TimeoutError):
                    raise RuntimeError("The reply took too long. Try again or use another companion.") from exc
                raise
    finally:
        await client.aio.aclose()


class SpeechOutput:
    def __init__(self):
        self.socket = None
        self.model = None
        self.wav = None
        self.parler = IndicParlerAdapter()
        self.edge_failed = False

    async def close(self):
        await self.parler.close()
        if self.socket:
            socket = self.socket
            self.socket = None
            with contextlib.suppress(Exception):
                await asyncio.wait_for(socket.close(), 2)
        self.wav = None

    async def speak(self, text: str, c: LabConfig, send):
        if c.pipeline == 2 and c.open_provider == "ai4bharat_indic_parler":
            await self.parler.speak(text, c, send)
            return
        routed = SanskritPhoneticRouter.transform(text, c.language, c.visarga_expansion, c.schwa_fix, c.transliterate)
        if c.pipeline == 2 and c.open_provider == "edge_tts_prosody":
            if self.edge_failed:
                await self.speak(text, c.model_copy(update={"pipeline": 1, "tts_model": "bulbul:v3", "speaker": "priya"}), send)
                return
            import edge_tts
            # MP3 transport fragments aren't independently decodable; concatenate
            # one short clause in memory, then send it as one playable buffer.
            rate = f"{round((c.pace - 1) * 100):+d}%"
            voice = c.speaker
            audio = bytearray()
            try:
                async with asyncio.timeout(12):
                    async for chunk in edge_tts.Communicate(routed, voice, rate=rate).stream():
                        if chunk["type"] == "audio":
                            audio.extend(chunk["data"])
                if not audio:
                    raise RuntimeError("No speech audio returned")
                await send({"type": "audio", "codec": "mp3", "data": base64.b64encode(audio).decode(), "sample_rate": 24000})
            except Exception:
                self.edge_failed = True
                await send({"type": "notice", "message": "Mother's usual voice is unavailable. Using the backup voice for this reply."})
                await self.speak(text, c.model_copy(update={"pipeline": 1, "tts_model": "bulbul:v3", "speaker": "priya"}), send)
            return
        if self.model != c.tts_model:
            await self.close()
        if self.socket is None:
            self.socket = await connect_ws("wss://api.sarvam.ai/text-to-speech/ws?" + urlencode({"model": c.tts_model, "send_completion_event": "true"}))
            self.model = c.tts_model
            self.wav = WavStream()
        await self.socket.send(json.dumps({"type": "config", "data": {
            "speaker": c.speaker, "language_code": c.language, "pace": c.pace,
            "temperature": c.temperature, "speech_sample_rate": 24000,
            "output_audio_codec": "wav", "min_buffer_size": 30, "max_chunk_length": 150}}))
        await self.socket.send(json.dumps({"type": "text", "data": {"text": routed}}))
        await self.socket.send(json.dumps({"type": "flush"}))
        wav = self.wav
        wav.begin_turn()
        while True:
            message = json.loads(await asyncio.wait_for(self.socket.recv(), 30))
            kind, data = message.get("type"), message.get("data") or {}
            if kind == "audio":
                pcm = wav.feed(base64.b64decode(data["audio"]))
                if pcm:
                    await send({"type": "audio", "codec": "pcm", "data": base64.b64encode(pcm).decode(), "sample_rate": wav.sample_rate})
            elif kind in ("event", "events") and data.get("event_type") == "final":
                wav.finish()
                break
            elif kind == "error":
                raise RuntimeError("Sarvam TTS rejected the configuration. Check model, speaker and language.")


def live_config(c, search_fallback=False, manual_input=False):
    result = {"response_modalities": ["AUDIO"], "system_instruction": instruction(c),
              "input_audio_transcription": {}, "output_audio_transcription": {},
              "temperature": c.temperature,
              "speech_config": {"voice_config": {"prebuilt_voice_config": {"voice_name": c.speaker}}}}
    if manual_input:
        result["realtime_input_config"] = {"automatic_activity_detection": {"disabled": True}}
    # Current 3.8 Live explicitly forbids thinking_config. The older 2.5
    # native audio accepts budgets; 3.1 accepts levels rather than token budgets.
    if c.live_model.startswith("gemini-2.5"):
        result["thinking_config"] = {"thinking_budget": c.thinking_budget}
    elif c.live_model.startswith("gemini-3.1"):
        result["thinking_config"] = {"thinking_level": "minimal" if c.thinking_budget == 0 else "high"}
    if c.web_search and search_fallback:
        function = {"name": "web_search", "description": "Verify current events and other facts on the web. Always use this tool when the user requests a web search or asks for current information.",
                    "parameters": {"type": "OBJECT", "properties": {"query": {"type": "STRING"}}, "required": ["query"]}}
        if c.live_model.startswith("gemini-3.8"):
            function["behavior"] = "NON_BLOCKING"
        result["tools"] = [{"function_declarations": [function]}]
    elif c.web_search:
        result["tools"] = [{"google_search": {}}]
    return result
