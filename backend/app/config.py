"""Application configuration via pydantic-settings (env vars + .env)."""

import os
from pathlib import Path

from pydantic_settings import BaseSettings

# Where .env files are read from, LOWEST priority first — pydantic-settings
# lets a later file override an earlier one, and real environment variables
# override them all.
#
# This used to be just ".env", resolved against the working directory. This
# repo keeps its .env at the REPO ROOT, while start_mob.ps1 and
# .claude/launch.json deliberately run uvicorn from backend/ (the db_path
# comment in start_mob.ps1 says why). So the backend started with no Sarvam
# key and silently served `mode: graph` — the scripted dialogue — to every dev
# build, and none of the LLM tutor was reachable locally. Found 2026-09-22.
#
# Paths are anchored to this file, not the working directory, so the answer
# no longer depends on where the server was launched from:
#   1. ".env" in the working directory — the old behaviour, kept last in
#      priority for any launch path not listed here;
#   2. the repo root — where this repo actually keeps it;
#   3. backend/.env — highest, for a backend-only override.
# Files that do not exist are skipped. The container is unaffected: the
# Dockerfile copies no .env, and deploy secrets arrive as env vars.
#
# SHABD_IGNORE_DOTENV turns every file off. The test suite sets it: before
# this change tests read no .env (there is no backend/.env), and that is the
# guarantee worth keeping — otherwise a key or a DATABASE_URL in the root .env
# would quietly reach them.
_BACKEND_DIR = Path(__file__).resolve().parent.parent


def env_files() -> tuple[str, ...] | None:
    """The .env files to read, lowest priority first — or None for none."""
    if os.environ.get("SHABD_IGNORE_DOTENV"):
        return None
    return (
        ".env",
        str(_BACKEND_DIR.parent / ".env"),
        str(_BACKEND_DIR / ".env"),
    )


_ENV_FILES = env_files()


class Settings(BaseSettings):
    port: int = 8000
    db_path: str = "app.db"
    database_url: str = ""  # e.g. "postgresql://user:***@host/db" — empty = use db_path (SQLite)
    admin_token: str = "dev-admin"
    analyzer: str = "vidyut"  # "rule" | "vidyut" — vidyut default, graceful fallback to rule if unavailable
    vidyut_data_dir: str = ""  # empty -> backend/vidyut-data (auto-downloaded on first use)
    log_level: str = "INFO"
    cors_origins: str = "*"
    sarvam_api_key: str = ""  # Sarvam AI API subscription key (TTS/STT)
    # Speech-to-text model for every surface. saaras:v4 (2026-09-23): better
    # language ID on the learner's own language and Global English — but on
    # auto-detect it TRANSLATES spoken Sanskrit into English, so Talk never
    # calls it that way alone; see services/learner_stt.py.
    sarvam_stt_model: str = "saaras:v4"
    # Bulbul language code for Sanskrit lines. Bulbul v3 has no public sa-IN:
    # probed 2026-09-23 it still answers 400 "Please request beta access to
    # sa-IN". Until Sarvam support enables it, Sanskrit reads through the Hindi
    # voice. Once granted, setting TTS_SANSKRIT_CODE=sa-IN switches every live
    # Sanskrit line — the app sends sa-IN and the server maps it here, so no
    # app release is needed.
    tts_sanskrit_code: str = "hi-IN"
    # OpenRouter — carries the Gemini route for dual-number content (§2.6:
    # Sarvam false-accuses ~50% of dual-bearing sentences, so duals must not
    # go to Sarvam). Owner chose OpenRouter over a direct Gemini key,
    # 2026-09-01.
    openrouter_api_key: str = ""
    # LLM edge-router for conversation bridge turns. Classifies each learner
    # utterance at a bridge node to one of the node's outgoing edges (or none).
    # Strictly Sarvam conversational (the reasoning variant is banned from
    # request paths — DECISIONS.md; -conversations is the validated one).
    # Ref shape "sarvam:sarvam-105b-conversations" built via build_provider().
    turn_router_provider: str = "sarvam:sarvam-105b-conversations"
    turn_router_enabled: bool = True
    turn_router_max_tokens: int = 64
    # Off-turn-path explainer ("what does that mean?"). §12 allows a live
    # model here because nobody is waiting mid-turn; the turn itself returns
    # before this is ever called. Sarvam by product instruction (2026-08-30),
    # overriding the §12 table row that named Gemini for live diagnosis. Same
    # ban applies: -conversations, never the reasoning variant.
    explain_provider: str = "sarvam:sarvam-105b-conversations"
    explain_enabled: bool = True
    explain_max_tokens: int = 220

    # Free-form conversation tutor (services/tutor.py). This one IS on the
    # turn path — the 2026-09-02 decision traded §12's model-free sub-second
    # turn for a conversation that accepts more than one sentence per
    # question. Same provider ban: -conversations, never the reasoning
    # variant. `tutor_enabled=False` falls the runtime back to the dialogue
    # graph, which is kept working for exactly that reason.
    tutor_provider: str = "sarvam:sarvam-105b-conversations"
    tutor_enabled: bool = True
    # 180 → 3000 (2026-09-22). This reverses the earlier 400 → 180 cut, which
    # was made when a turn was two short lines. A turn is now four fields
    # (read-back, fix, bilingual reply, English explanation) and 180 truncated
    # it outright.
    #
    # The old cut assumed the ceiling drove latency. Measured over ~60 live
    # calls at max_tokens=3000, the model emitted 172–297 tokens and never
    # approached the ceiling: p50 latency 787 ms, p100 1123 ms — indistinguish-
    # able from the 180 ceiling, because generation stops when the model is
    # done, not at the limit. The ceiling is headroom, not a target; raising it
    # costs nothing and truncation costs the whole turn.
    tutor_max_tokens: int = 3000
    # The default 30 s is a p100 of roughly 1.1 s times a 25x safety factor.
    # Generous on purpose: a timeout loses the learner's sentence, and the
    # retry path would double the wait before it degrades.
    tutor_timeout_s: float = 90.0
    # Non-zero: a tutor repeating itself verbatim is the failure this replaced.
    tutor_temperature: float = 0.6

    # Voice quotas — rolling window per learner
    quota_enabled: bool = True
    quota_tts_chars_per_day: int = 20_000     # ~₹20/day/learner at Bulbul rates
    quota_stt_seconds_per_day: int = 900      # 15 minutes of speech
    quota_llm_calls_per_day: int = 400       # LLM edge-router + explain calls
    quota_window_hours: int = 24

    # Writing recognition (P20-3) — thresholds live in config, never in a
    # literal. The photo path biases HARD toward unsure (P20-4): OCR on a
    # beginner's handwriting is materially less reliable than stroke ink, so
    # its floors are higher and its ceiling for `wrong` is lower. When the
    # recogniser and the learner disagree, the recogniser is the one that
    # abstains (§2.2).
    writing_correct_confidence: float = 0.80      # ink: >= this => correct
    writing_photo_correct_confidence: float = 0.92  # photo: much higher floor
    writing_wrong_confidence: float = 0.60        # ink: a confident DIFFERENT letter
    writing_photo_wrong_confidence: float = 0.85  # photo: rarely confident enough to be wrong

    # Dev-login guard — disable in production
    dev_login_enabled: bool = True

    # Google OAuth (Sign in with Google). Comma-separated list of client IDs —
    # one per platform (Android, iOS, Web). Empty => Google login disabled.
    google_client_id: str = ""

    # Sign in with Apple (App Store Guideline 4.8: mandatory if any
    # third-party sign-in is offered). Comma-separated list of client IDs —
    # the app's bundle ID and/or Services ID. Empty => Apple login disabled.
    apple_client_id: str = ""

    # Privacy: raw audio retention opt-in
    retain_raw_audio: bool = False

    # Audio object store (P8-5 — Cloud Run kept, owner decision 2026-09-08).
    # Cloud Run's disk is ephemeral per revision, so pre-rendered WAVs must
    # live in a bucket, not on local disk. "local" = storage/audio (dev);
    # "gcs" = Google Cloud Storage bucket below (production). The client is
    # unaffected: LocalStorage.url() returns /audio/<path> while GCS returns
    # the CDN URL — both are opaque strings to the app.
    audio_storage: str = "local"
    gcs_audio_bucket: str = ""  # e.g. "sanskritam-audio"; empty = local
    cdn_base_url: str = ""  # e.g. "https://cdn.sanskritam.app"; empty = bucket URL

    # Synthesise the tutor's line inside /conversation/turn and return it as
    # base64, instead of letting the client make a separate /speech/tts call.
    #
    # Default OFF (text fast, voice late): inline removes one client round trip
    # from the wait for the VOICE, but the text bubble then waits for TTS too —
    # LLM (2–6s) + Bulbul (2–5s) serially before anything renders. With this
    # off the turn returns as soon as the words exist; the client renders text
    # immediately and fetches audio in the background via its existing
    # playTutorAudio fallback (no new endpoint, same quota path). Flip on only
    # for a coupled A/B against the `[perf] turn` lines the client logs.
    conversation_inline_audio: bool = False

    model_config = {"env_prefix": "", "env_file": _ENV_FILES, "extra": "ignore"}


settings = Settings()