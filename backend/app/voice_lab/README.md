# Live Voice Lab

The mobile `VoiceLabTab` sits after Read. Its microphone, playback and settings
are independent of Talk, Reader and Recite. No conversation or audio is written
to disk or the learner's conversation history. Existing usage counters apply.

## Run

Install `backend/requirements.txt`, restart the FastAPI backend, and reload the
Expo 57 app. No database migration or new mobile dependency is required.
Provider keys remain server-side and use the existing environment loading:

- `SARVAM_API_KEY`: pipelines 1, 2 and 4.
- `GEMINI_API_KEY` or `GOOGLE_API_KEY`: pipelines 3 and 4. If neither is set,
  reuse the first key in the project's existing `GEMINI_API_KEYS` configuration.
  Provider availability and billing tier still govern Live model access.
- `VOICE_LAB_PARLER_URL`: optional pipeline 2 Indic-Parler adapter. POST receives
  `{text, description, language: "sa-IN"}`; return `audio/wav` or `audio/mpeg`.
  Point this at an inference service running `ai4bharat/indic-parler-tts`.
- `VOICE_LAB_PARLER_SPACE`: alternatively set `owner/space-name` for the ZeroGPU
  Gradio service in `deploy/hf-voice-lab`. This takes precedence over the URL.
  `HF_TOKEN` is required on the backend to use your signed-in account quota.
  Choose Pipeline 2 → Indic-Parler → Aryan. Quota errors are shown explicitly;
  there is no automatic paid hardware upgrade or automatic provider switch.

Use an Expo 57 development build for native PCM capture; web capture requires
HTTPS or localhost. Web Audio handles playback inside a WebView on native.
Test full-duplex audio and barge-in on the actual target phone before release.

## Wire protocol

1. Authenticated `POST /voice-lab/ticket` returns a short-lived single-use ticket.
2. Connect `/ws/voice-lab` and send `{ticket, config}` within 10 seconds.
3. Wait for `ready`. Send binary mono PCM16 little-endian microphone frames,
   16000 Hz, at most 64000 bytes each. All settings and media use this one socket.
4. JSON control frames: `config` (partial settings), `text`, `interrupt`,
   `end_audio` (flush microphone input), `stop`.
5. Server frames: `ready`, `config_applied`, `transcript` (role/text/final),
   `audio` (base64 data/codec/sample_rate), `interrupted`, `turn_complete`,
   `notice`, `error`, `fatal`. Invalid settings leave the prior settings active.

Calls end after 10 minutes, tab blur, app backgrounding or transport failure.
Pipeline/model/voice/tool changes rebuild the provider session when necessary,
while keeping the client socket. Native Gemini model switches start fresh
provider context. Other settings cancel an active composed turn and apply to
the next utterance. Reconnection after transport failure is an explicit Start.

## Deliberate compatibility choices

- Sarvam uses the documented `/speech-to-text/ws` endpoint, Sanskrit pinned,
  with v3 fallback on a v4 model/configuration handshake rejection. Its completed
  segment transcripts are final; Gemini transcriptions arrive incrementally.
- Sarvam LLM uses the project's `sarvam-105b-conversations` model. Composed
  pipelines stream tokens and synthesize punctuation/six-word clauses in order.
  Hybrid sends a filler after 350 ms without a first token when reasoning/search
  is enabled. User speech or Interrupt cancels generation and buffered audio.
- Bulbul uses WAV output, supported by the current WebSocket API. Pitch and
  gain apply through Web Audio; detune changes playback duration as well as pitch.
- Edge's MP3 transport fragments are collected **per short clause in memory**
  before decoding; they are not standalone MP3 files. Pace is provider-controlled;
  pitch and gain are playback controls. No temporary audio files are created.
- HF Indic-Parler calls use authenticated `gradio_client` queued jobs, returning
  base64 WAV JSON without downloading audio files. Pending jobs are cancelled
  on interruption; an already running generation may finish and consume quota.
  The Space validates inputs before requesting a GPU, uses a small 1x allocation,
  and encodes WAVs after releasing it. Its deployed model and package pins are
  isolated from the backend; Torch is not installed on your laptop for this path.
- Gemini 3.8 Live omits thinking_config, 3.1 uses minimal/high levels, and the
  legacy 2.5 native audio model uses token budgets. The sandbox explains this.
- Available voice choices depend on model/provider. A custom speaker ID allows
  the current vendor catalogue; the vendor validates it. Sanskrit phonetics are
  experimental, especially the explicit final-vowel hint for Hindi TTS.
- Sandbox Gemini quota reservations are conservative estimates: ₹1 per hybrid
  generation and ₹0.10 per native audio input second, rather than measured
  provider invoices. These coexist with existing speech/LLM/TTS allowances.

## Verification

`python -m pytest tests/test_voice_lab.py -q` verifies the offline wire protocol,
authentication, validation, cancellation, clause flushing and phonetics.
`cd mobile && npx tsc --noEmit` checks the mobile integration.
`cd mobile && node scripts/check-voice-lab.mjs` verifies playback scheduling,
interruption, asynchronous decode cancellation and playback recovery.
Provider availability, speech quality and hardware echo behavior need a live
call; these are not claimed by the offline tests.

Protocol references: [Expo 57 audio](https://docs.expo.dev/versions/v57.0.0/sdk/audio/),
[Sarvam Bulbul WebSocket](https://docs.sarvam.ai/api/api-guides-tutorials/text-to-speech/best-practices),
[Gemini Live](https://ai.google.dev/gemini-api/docs/live-api/capabilities).
