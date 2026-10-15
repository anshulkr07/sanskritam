# Live Voice Lab

The mobile `VoiceLabTab` sits after Read. Its microphone, playback and settings
are independent of Talk, Reader and Recite. No conversation or audio is written
to disk or the learner's conversation history. Existing usage counters apply.

## Run

Install `backend/requirements.txt`, restart the FastAPI backend, and reload the
Expo 57 app. No database migration or new mobile dependency is required.
Automatic Android voice interruption now requires a rebuilt 1.4.1 app (version
code 8). Its prebuild plugin extends Expo AudioStream with opt-in
VOICE_COMMUNICATION capture, AcousticEchoCanceler and NoiseSuppressor. Run
prebuild before a local Android build; EAS applies the plugin during prebuild.
The installed runtime must report echo-cancelled frames before automatic
interruption is enabled. Other audio capture callers retain their defaults.
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
   New clients also send `capabilities: {playback_feedback: true, barge_in: true}`. The ready
   frame confirms the negotiated capability; older clients remain compatible.
3. Wait for `ready`. Send binary mono PCM16 little-endian microphone frames,
   16000 Hz, at most 64000 bytes each. All settings and media use this one socket.
4. JSON control frames: `config` (partial settings), `text`, `interrupt`,
   `end_audio` (flush microphone input), `stop`, and negotiated
   `playback` (`busy: true/false`, released after the playback echo tail).
   Negotiated `barge_in` cancels provider output; `barge_in_ready` acknowledges
   cancellation before the client releases its held microphone frames.
5. Server frames: `ready`, `config_applied`, `transcript` (role/text/final),
   `audio` (base64 data/codec/sample_rate), `response_started`, `interrupted`, `turn_complete`,
   `notice`, `error`, `fatal`. Invalid settings leave the prior settings active.

Calls end after 10 minutes, tab blur, app backgrounding or transport failure.
The microphone permission screen's temporary inactive/background state does not
cancel startup. Startup waits for the app to return to the foreground before
connecting. The call panel shows startup progress and errors; startup times out
after 30 seconds and can be cancelled or retried.
Pipeline/model/voice/tool changes rebuild the provider session when necessary,
while keeping the client socket. Native Gemini model switches start fresh
provider context. Other settings cancel an active composed turn and apply to
the next utterance. Reconnection after transport failure is an explicit Start.
Calls use speaker-safe turn-taking: microphone frames are replaced with silence
from the first queued audio packet until all playback/decodes have drained and
a 500 ms echo tail has elapsed. Generation completion alone does not reopen the
microphone. Interrupt reply stops playback so the learner can take the next turn.
The backend ignores delayed STT/VAD events during protected output so they cannot
cancel the rest of a sentence. Playback feedback extends protection past provider
generation until the actual audio finishes. The player schedules a short horizon
and waits for space; fast-arriving replies no longer trip a 20-second cutoff.
With echo-cancelled capture, 350 ms of sustained speech above the barge-in
threshold can interrupt automatically; quiet gaps of 200 ms reset the candidate.
Brief sounds are ignored. A rolling 1.2-second prefix retains opening words.
Local playback stops immediately, stale reply audio is discarded, and held PCM
is sent after provider cancellation is acknowledged. Without confirmed echo
cancellation, the manual Interrupt reply button remains available.
For negotiated Gemini calls, manual activity boundaries replace automatic VAD
interruption: ActivityStart cancels output, and ActivityEnd submits the new turn.
An audio level meter shows capture; a 900 ms quiet pause flushes a spoken turn,
and Done speaking also submits it. Soft/leading frames are still sent to STT.

## Deliberate compatibility choices

- Sarvam uses the documented `/speech-to-text/ws` endpoint, Sanskrit pinned,
  with v3 fallback on a v4 model/configuration handshake rejection. Its completed
  segment transcripts are final; Gemini transcriptions arrive incrementally.
- Sarvam LLM uses the project's `sarvam-105b-conversations` model. Composed
  pipelines stream tokens and synthesize punctuation/six-word clauses in order.
  Hybrid sends a filler after 350 ms without a first token when reasoning/search
  is enabled. User speech or Interrupt cancels generation and buffered audio.
- Bulbul's WAV stream sends a header followed by raw PCM fragments. The backend
  parses that header and sends mono PCM16 frames; fragments are never decoded
  as standalone WAV files. The format can persist across clauses on a socket.
  Pitch and gain apply through Web Audio; detune changes playback duration.
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
- Scholar uses Gemini 3.8 Flash with low/medium/high reasoning. Retry before any
  text is emitted can use the configured alternative model and the existing
  Vertex credentials when the Developer API is unavailable. A reply is never
  restarted after partial text. Empty answers and timeouts are explicit errors.
- Friend's built-in search quota can be separate from Live audio access. When
  that quota is unavailable, its web_search function uses the already configured
  Vertex search route, requires grounded source metadata, and returns sources
  to Live. Search cancellation ends the lookup. Without Vertex configuration,
  voice still connects with a clear notice that grounding is unavailable.
- Available voice choices depend on model/provider. A custom speaker ID allows
  the current vendor catalogue; the vendor validates it. Sanskrit phonetics are
  experimental, especially the explicit final-vowel hint for Hindi TTS.
- Sandbox Gemini quota reservations are conservative estimates: ₹1 per hybrid
  generation and ₹0.10 per native audio input second, rather than measured
  provider invoices. These coexist with existing speech/LLM/TTS allowances.
  Each Friend fallback search reserves one extra LLM call and ₹1 Gemini usage.

## Verification

### Conversation recovery (2026-10-15)

Sarvam reuses `request_id` across a connection. Deduplicate by audio hash and
transcript, resetting at new speech; never discard a new utterance just because
the request ID repeats. The `client_endpointing` capability collects STT segments
until the client's `end_audio`, allowing a 450 ms flush grace period. Provider VAD
cannot cancel a response on clients that negotiate explicit barge-in.

Echo-cancelled capture now requires 350 ms of sustained speech to interrupt.
The client retains the initial words, stops local playback immediately, and bounds
the cancellation acknowledgement wait. Suppressed speaker audio is not sent to
STT. Input quota is reserved in five-second blocks; unused credit is refunded.

Android must acquire communication mode before creating the recorder and its
AEC effect. Expo's default `setAudioModeAsync` selects media mode, even when
`allowsRecording` is true. Voice Lab now starts the already shipped
`StreamInCallManager` native session after Expo configuration, verifies
`MODE_IN_COMMUNICATION`, and only then creates `AudioStream`. The SDK owns the
speaker/connected-device route and the Android communication-mode keep-alive.
The public Stream `callManager.start()` only stores configuration until a Stream
call joins; Voice Lab does not join a Stream call, so it uses the installed native
module directly. Stop/failure releases both capture and the call session. No new
native API is added. `node scripts/check-voice-call-audio.mjs` verifies ordering,
asynchronous mode activation, cleanup and the iOS guard. The live mic meter is
no longer forced to zero during playback. Unconfirmed AEC still does not enable
automatic speakerphone interruption; this is distinct from microphone capture.

App allowance failures are distinct from vendor quota failures. At the Gemini
allowance, Friend and Scholar continue on the metered Sarvam service with an
explicit notice that web search is unavailable. Mother uses a Sarvam backup if
Edge speech fails or times out. Native connection failure also selects the backup.
The companion persona stays the same; the voice may change. Budget caps remain.

Cloud Run must allow the 600-second call plus cleanup: deploy with `--timeout=660s`.
Production exceeded 1 GiB during scheduled work, so use `--memory=2Gi`.

`python scripts/check_voice_conversation.py --cloud-project PROJECT --conversations`
loads provider credentials in memory, sends synthetic speech for two successive
turns per companion, and interrupts a reply before checking the next answer.
It never records microphone audio or prints credentials/transcripts. `--stt`
checks upstream segmentation; `--quota` reads the latest voice learner's aggregate
usage without printing identity. These are provider/transport checks; Android
speaker echo quality still needs testing on the actual handset.

`python -m pytest tests/test_voice_lab.py -q` verifies the offline wire protocol,
authentication, validation, cancellation, clause flushing and phonetics.
`cd mobile && npx tsc --noEmit` checks the mobile integration.
`cd mobile && node scripts/check-voice-lab.mjs` verifies playback scheduling,
interruption, asynchronous decode cancellation and playback recovery.
It also checks a fast-arriving 30-second reply plays completely and that an
explicit interruption cancels packets waiting for scheduling room.
`cd mobile && node scripts/check-voice-lab-startup.mjs` verifies permission-sheet
focus changes, startup timeouts, cancellation, retry, microphone cleanup,
automatic turn finalization and speaker-echo suppression through playback drain.
`cd mobile && node scripts/check-voice-barge.mjs` checks sustained speech, noise
rejection, pre-roll, the echo-cancellation capability guard and the SDK-specific
native patch. These checks do not compile Kotlin or certify handset echo removal.
`cd backend && python scripts/check_voice_lab_live.py --search --stt` exercises
all four providers, Friend's real grounded lookup and synthetic Sanskrit STT.
It uses configured provider billing, prints only counts/status, and saves no
audio or transcripts. The optional STT check requires ffmpeg.
Provider availability, speech quality and hardware echo behavior need a live
call; these are not claimed by the offline tests.

Protocol references: [Expo 57 audio](https://docs.expo.dev/versions/v57.0.0/sdk/audio/),
[Sarvam Bulbul WebSocket](https://docs.sarvam.ai/api/api-guides-tutorials/text-to-speech/best-practices),
[Gemini Live](https://ai.google.dev/gemini-api/docs/live-api/capabilities).
