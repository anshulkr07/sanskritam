import asyncio
import base64
import contextlib
import json
import math
import struct
import logging
from urllib.parse import urlencode

from app.config import settings
from .config import LabConfig
from .providers import SpeechOutput, connect_ws, gemini_client, gemini_tokens, live_config, sarvam_tokens, provider_error, search_unavailable, vertex_client, grounded_search
from .sanskrit_phonetics import take_clauses

logger = logging.getLogger("shabd.voice_lab")


async def cancel(task):
    if task:
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError, Exception):
            await task


class VoicePipelineSession:
    """Session interface shared by composed and native audio strategies."""
    def __init__(self, config: LabConfig, send, meter):
        self.config, self._send, self.meter = config, send, meter
        self.history = []
        self.receiver = None
        self.turn = None
        self.upstream = None
        self.tts = SpeechOutput()
        self.last_stt_result = None
        self.playback_feedback = False
        self.playback_busy = False
        self.output_started = False
        self.barge_enabled = False
        self.client_endpointing = False
        self.input_text = []
        self.endpoint_task = None
        self.input_ended = False

    async def send(self, message):
        if message.get("type") == "audio":
            self.output_started = True
            if self.playback_feedback:
                self.playback_busy = True
        await self._send(message)

    async def playback(self, busy):
        self.playback_busy = busy

    async def barge_in(self):
        await self.interrupt()
        await self.send({"type": "barge_in_ready"})

    def protecting_reply(self):
        return self.playback_busy or (self.output_started and self.turn is not None and not self.turn.done())

    async def start(self):
        if not settings.sarvam_api_key:
            raise RuntimeError("Configure SARVAM_API_KEY for this pipeline.")
        if self.config.pipeline == 4:
            client = gemini_client()
            await client.aio.aclose()
        if self.config.pipeline == 2:
            if self.config.open_provider == "edge_tts_prosody":
                import edge_tts  # noqa: F401 — preflight optional dependency
            elif not (settings.voice_lab_parler_url or settings.voice_lab_parler_space):
                raise RuntimeError("Set VOICE_LAB_PARLER_SPACE or VOICE_LAB_PARLER_URL to use Indic-Parler.")
            elif settings.voice_lab_parler_space:
                from .indic_parler import validate_space_id
                validate_space_id(settings.voice_lab_parler_space)
                if not settings.hf_token:
                    raise RuntimeError("Set HF_TOKEN to use your signed-in Hugging Face GPU quota.")
        query = {"language-code": "sa-IN", "model": settings.sarvam_stt_model,
                 "mode": "transcribe", "sample_rate": 16000, "input_audio_codec": "pcm_s16le",
                 "high_vad_sensitivity": "true", "first_turn_min_speech_frames": "2",
                 "vad_signals": "true", "flush_signal": "true"}
        endpoint = settings.sarvam_realtime_url or "wss://api.sarvam.ai/speech-to-text/ws"
        try:
            self.upstream = await connect_ws(endpoint + "?" + urlencode(query))
        except Exception as exc:
            status = getattr(getattr(exc, "response", None), "status_code", getattr(exc, "status_code", None))
            if query["model"] != "saaras:v4" or status not in (400, 404, 422):
                raise
            query["model"] = "saaras:v3"
            self.upstream = await connect_ws(endpoint + "?" + urlencode(query))
            await self.send({"type": "notice", "message": "Saaras v4 unavailable; using Saaras v3 for this call."})
        self.receiver = asyncio.create_task(self.listen())

    async def listen(self):
        try:
            async for raw in self.upstream:
                msg = json.loads(raw)
                data = msg.get("data") or {}
                # VAD/finals from previously buffered input can arrive after
                # output starts. Speaker-safe calls use explicit interruption;
                # stale recognition must not cancel the rest of this reply.
                if msg.get("type") in ("events", "data") and self.protecting_reply():
                    continue
                if msg.get("type") == "events" and data.get("signal_type") == "START_SPEECH":
                    self.last_stt_result = None
                    # The client owns deliberate barge-in. Delayed provider VAD
                    # must not cancel a reply that is still preparing its audio.
                    if not self.barge_enabled:
                        await self.interrupt()
                elif msg.get("type") == "data" and data.get("transcript", "").strip():
                    text = data["transcript"].strip()
                    # Sarvam's request_id identifies the CONNECTION, not a turn.
                    # Only deduplicate identical results for the same audio.
                    result = (data.get("audio_hash") or data.get("request_id"), text)
                    if result == self.last_stt_result:
                        continue
                    self.last_stt_result = result
                    if self.client_endpointing:
                        self.input_text.append(text)
                        if self.input_ended:
                            self.schedule_endpoint()
                    else:
                        await self.send({"type": "transcript", "role": "user", "text": text, "final": True})
                        await self.text(text)
                elif msg.get("type") == "error":
                    raise RuntimeError("Speech recognition rejected the session configuration.")
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.warning("voice_stt_failed pipeline=%s error_type=%s", self.config.pipeline, type(exc).__name__)
            await self.send({"type": "fatal", "message": "Speech provider disconnected. End the call and reconnect."})

    async def audio(self, pcm):
        await self.upstream.send(json.dumps({"audio": {"data": base64.b64encode(pcm).decode(),
                                                       "sample_rate": "16000", "encoding": "audio/wav"}}))

    async def end_audio(self):
        await self.upstream.send(json.dumps({"type": "flush"}))
        if self.client_endpointing:
            self.input_ended = True
            self.schedule_endpoint()

    def schedule_endpoint(self):
        if self.endpoint_task:
            self.endpoint_task.cancel()
        self.endpoint_task = asyncio.create_task(self.finish_input())

    async def finish_input(self):
        # Collect recognition segments for one spoken turn. Flush replies can
        # follow VAD finals; don't start a response to just the first fragment.
        await asyncio.sleep(.45 if self.input_text else 6)
        self.endpoint_task = None
        text = " ".join(self.input_text).strip()
        self.input_text.clear(); self.input_ended = False
        if text:
            await self.send({"type": "transcript", "role": "user", "text": text, "final": True})
            await self.text(text)
        else:
            await self.send({"type": "error", "message": "I couldn't hear that clearly. Please say it again."})

    async def interrupt(self):
        # Release the client immediately; provider cleanup can take seconds.
        self.playback_busy = False; self.output_started = False
        await self.send({"type": "interrupted"})
        await cancel(self.endpoint_task); self.endpoint_task = None
        self.input_text.clear(); self.input_ended = False
        await cancel(self.turn)
        self.turn = None
        await self.tts.close()  # discard old provider audio, including buffered chunks

    async def text(self, text):
        await self.interrupt()
        self.turn = asyncio.create_task(self.respond(text))

    async def update(self, config):
        # Updates apply atomically between utterances; cancel the previous turn.
        await self.interrupt()
        self.config = config

    def tokens(self, config):
        return sarvam_tokens(config, self.history)

    async def respond(self, text):
        c = self.config.model_copy()
        queue = asyncio.Queue(maxsize=16)
        first = asyncio.Event()
        speech = filler = None
        response = ""
        try:
            await self.send({"type": "response_started"})
            await self.meter("llm_calls", 1)
            if c.pipeline == 4:
                # Conservative sandbox reservation; includes search/reasoning.
                from app.services.quota import QuotaExceeded
                try:
                    await self.meter("gemini_inr", 1)
                except QuotaExceeded:
                    c = c.model_copy(update={"pipeline": 1, "web_search": False, "thinking_budget": 0})
                    await self.send({"type": "notice", "message": "The app's daily Gemini allowance is used. Scholar continues with the backup reply service, without web search."})
            self.history.append({"role": "user", "content": text})
            self.history = self.history[-16:]

            async def speak():
                while True:
                    clause = await queue.get()
                    if clause is None:
                        return
                    await self.meter("tts_chars", len(clause))
                    await self.tts.speak(clause, c, self.send)

            async def fill():
                try:
                    await asyncio.wait_for(first.wait(), 0.35)
                except asyncio.TimeoutError:
                    await queue.put("एकं क्षणम्, अहं विचारयामि।")

            speech = asyncio.create_task(speak())
            if c.pipeline == 4 and c.filler_phrases and (c.thinking_budget or c.web_search):
                filler = asyncio.create_task(fill())
            pending = ""
            tokens = sarvam_tokens(c, self.history) if self.config.pipeline == 4 and c.pipeline == 1 else self.tokens(c)
            async for token in tokens:
                first.set()
                response += token
                pending += token
                await self.send({"type": "transcript", "role": "assistant", "text": token, "final": False})
                clauses, pending = take_clauses(pending)
                for clause in clauses:
                    if speech.done():
                        await speech
                    await asyncio.wait_for(queue.put(clause), 35)
            clauses, _ = take_clauses(pending, final=True)
            for clause in clauses:
                if speech.done():
                    await speech
                await asyncio.wait_for(queue.put(clause), 35)
            await cancel(filler)
            if speech.done():
                await speech
            else:
                await asyncio.wait_for(queue.put(None), 35)
                await speech
            if not response.strip():
                raise RuntimeError("The model returned no spoken answer. Try another question.")
            self.history.append({"role": "assistant", "content": response})
            await self.send({"type": "turn_complete"})
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.warning("voice_reply_failed pipeline=%s error_type=%s code=%s", c.pipeline, type(exc).__name__, getattr(exc, "code", None))
            self.playback_busy = False; self.output_started = False
            await self.tts.close()
            await self.send({"type": "interrupted"})
            await self.send({"type": "error", "message": provider_error(exc)})
        finally:
            await cancel(filler)
            await cancel(speech)

    async def close(self):
        await cancel(self.endpoint_task)
        await cancel(self.receiver)
        await cancel(self.turn)
        await self.tts.close()
        if self.upstream:
            await self.upstream.close()


class PureSarvamSession(VoicePipelineSession):
    pass


class OpenSanskritSession(VoicePipelineSession):
    pass


class HybridSession(VoicePipelineSession):
    def tokens(self, config):
        return gemini_tokens(config, self.history, self.send)


class GeminiNativeSession(VoicePipelineSession):
    async def start(self):
        self.upstream_failure = None
        self.client = gemini_client()
        self.search_client = None
        self.search_tasks = {}
        self.audio_started = False
        self.input_prefix = bytearray()
        self.connection = self.client.aio.live.connect(model=self.config.live_model, config=live_config(self.config, manual_input=self.barge_enabled))
        try:
            self.upstream = await self.connection.__aenter__()
        except Exception as exc:
            if not self.config.web_search or not search_unavailable(exc):
                raise RuntimeError(provider_error(exc)) from exc
            # Keep grounding via the existing Vertex service if the built-in
            # Live search quota is unavailable. No changes to native audio.
            self.search_client = vertex_client()
            config = self.config if self.search_client else self.config.model_copy(update={"web_search": False})
            self.connection = self.client.aio.live.connect(model=config.live_model, config=live_config(config, search_fallback=bool(self.search_client), manual_input=self.barge_enabled))
            try:
                self.upstream = await self.connection.__aenter__()
            except Exception as retry:
                raise RuntimeError(provider_error(retry)) from retry
            message = "Web search is using the configured backup service for this call." if self.search_client else "Google Search is unavailable for this provider account. The voice call continues without web grounding."
            await self.send({"type": "notice", "message": message})
        self.receiver = asyncio.create_task(self.listen())

    async def listen(self):
        try:
            while True:
                async for response in self.upstream.receive():
                    if response.tool_call and self.search_client:
                        for call in response.tool_call.function_calls or []:
                            if call.id not in self.search_tasks:
                                task = asyncio.create_task(self.search(call))
                                self.search_tasks[call.id] = task
                                task.add_done_callback(lambda _, call_id=call.id: self.search_tasks.pop(call_id, None))
                    if response.tool_call_cancellation:
                        for call_id in response.tool_call_cancellation.ids or []:
                            await cancel(self.search_tasks.pop(call_id, None))
                    content = response.server_content
                    if not content:
                        continue
                    if content.interrupted:
                        await self.send({"type": "interrupted"})
                    for role, transcript in (("user", content.input_transcription), ("assistant", content.output_transcription)):
                        if transcript and transcript.text:
                            await self.send({"type": "transcript", "role": role, "text": transcript.text, "final": False})
                    if content.model_turn:
                        for part in content.model_turn.parts:
                            if part.inline_data and part.inline_data.data:
                                await self.send({"type": "audio", "codec": "pcm", "sample_rate": 24000,
                                                 "data": base64.b64encode(part.inline_data.data).decode()})
                    if content.turn_complete:
                        await self.meter("llm_calls", 1)
                        await self.send({"type": "turn_complete"})
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            self.upstream_failure = exc
            logger.warning("voice_native_receive_failed error_type=%s code=%s", type(exc).__name__, getattr(exc, "code", None))
            await self.send({"type": "interrupted"})
            await self.send({"type": "notice", "message": "The native voice connection was lost. Switching to the backup service."})

    async def audio(self, pcm):
        from google.genai import types
        if getattr(self, "upstream_failure", None):
            raise RuntimeError("Native voice connection is unavailable")
        if self.barge_enabled and not self.audio_started:
            self.input_prefix.extend(pcm)
            if len(self.input_prefix) > 8000:
                del self.input_prefix[:-8000]
            samples = len(pcm) // 2
            rms = math.sqrt(sum(value * value for (value,) in struct.iter_unpack("<h", pcm)) / max(1, samples)) / 32768
            if rms < 0.008:
                return
            await self.upstream.send_realtime_input(activity_start=types.ActivityStart())
            self.audio_started = True
            pcm = bytes(self.input_prefix); self.input_prefix.clear()
        await self.upstream.send_realtime_input(audio=types.Blob(data=pcm, mime_type="audio/pcm;rate=16000"))

    async def barge_in(self):
        from google.genai import types
        if self.barge_enabled:
            await self.upstream.send_realtime_input(activity_start=types.ActivityStart())
            self.audio_started = True; self.input_prefix.clear()
            await self.send({"type": "interrupted"})
        else:
            await self.interrupt()
        await self.send({"type": "barge_in_ready"})

    async def search(self, call):
        from google.genai import types
        try:
            query = (call.args or {}).get("query", "")
            if call.name != "web_search" or not isinstance(query, str) or not query.strip() or len(query) > 2000:
                raise RuntimeError("Invalid web search request.")
            await self.meter("llm_calls", 1)
            await self.meter("gemini_inr", 1)
            result = await grounded_search(query, self.search_client)
            await self.send({"type": "notice", "message": f"Web search checked {len(result['sources'])} source pages."})
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            result = {"error": provider_error(exc)}
            await self.send({"type": "notice", "message": "Web search could not complete. The voice call continues."})
        response = types.FunctionResponse(id=call.id, name=call.name, response=result)
        if self.config.live_model.startswith("gemini-3.8"):
            response.scheduling = types.FunctionResponseScheduling.WHEN_IDLE
        with contextlib.suppress(Exception):
            await self.upstream.send_tool_response(function_responses=[response])

    async def end_audio(self):
        from google.genai import types
        if self.barge_enabled:
            if self.audio_started:
                await self.send({"type": "response_started"})
                await self.upstream.send_realtime_input(activity_end=types.ActivityEnd())
                self.audio_started = False; self.input_prefix.clear()
            return
        await self.upstream.send_realtime_input(audio_stream_end=True)

    async def text(self, text):
        await self.send({"type": "response_started"})
        await self.upstream.send_client_content(turns={"role": "user", "parts": [{"text": text}]}, turn_complete=True)

    async def interrupt(self):
        await self.upstream.send_client_content(turns={"role": "user", "parts": [{"text": "Pause and listen to me."}]}, turn_complete=True)
        await self.send({"type": "interrupted"})

    async def update(self, config):
        from .config import instruction
        self.config = config
        await self.upstream.send_client_content(turns={"role": "user", "parts": [{"text": "Voice direction for subsequent replies: " + instruction(config)}]}, turn_complete=False)

    async def close(self):
        await cancel(self.receiver)
        for task in list(getattr(self, "search_tasks", {}).values()):
            await cancel(task)
        if getattr(self, "search_client", None):
            await self.search_client.aio.aclose()
        if getattr(self, "upstream", None):
            await self.connection.__aexit__(None, None, None)
        if getattr(self, "client", None):
            await self.client.aio.aclose()


STRATEGIES = {1: PureSarvamSession, 2: OpenSanskritSession, 3: GeminiNativeSession, 4: HybridSession}
