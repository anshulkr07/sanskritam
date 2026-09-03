"""Application configuration via pydantic-settings (env vars + .env)."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    port: int = 8000
    db_path: str = "app.db"
    database_url: str = ""  # e.g. "postgresql://user:pass@host/db" — empty = use db_path (SQLite)
    admin_token: str = "dev-admin"
    analyzer: str = "vidyut"  # "rule" | "vidyut" — vidyut default, graceful fallback to rule if unavailable
    vidyut_data_dir: str = ""  # empty -> backend/vidyut-data (auto-downloaded on first use)
    log_level: str = "INFO"
    cors_origins: str = "*"
    sarvam_api_key: str = ""  # Sarvam AI API subscription key (TTS/STT)
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
    tutor_max_tokens: int = 400
    # Non-zero: a tutor repeating itself verbatim is the failure this replaced.
    tutor_temperature: float = 0.6

    # Voice quotas — rolling window per learner
    quota_enabled: bool = True
    quota_tts_chars_per_day: int = 20_000     # ~₹20/day/learner at Bulbul rates
    quota_stt_seconds_per_day: int = 900      # 15 minutes of speech
    quota_llm_calls_per_day: int = 400       # LLM edge-router + explain calls
    quota_window_hours: int = 24

    # Dev-login guard — disable in production
    dev_login_enabled: bool = True

    # Privacy: raw audio retention opt-in
    retain_raw_audio: bool = False

    model_config = {"env_prefix": "", "env_file": ".env", "extra": "ignore"}


settings = Settings()