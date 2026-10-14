"""Application configuration via pydantic-settings (env vars + .env)."""

import os
from pathlib import Path

from pydantic_settings import BaseSettings
from pydantic import Field, AliasChoices

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
    gemini_api_key: str = ""
    google_api_key: str = ""
    voice_lab_parler_url: str = ""  # POST {text, description, language}; returns audio/wav or audio/mpeg
    voice_lab_parler_space: str = ""  # Hugging Face owner/space-name (ZeroGPU Gradio API)
    hf_token: str = ""  # Server-only HF token: gated model download + signed-in Space quota
    # Speech-to-text model for every surface. saaras:v4 (2026-09-23): better
    # language ID on the learner's own language and Global English — but on
    # auto-detect it TRANSLATES spoken Sanskrit into English, so Talk never
    # calls it that way alone; see services/learner_stt.py.
    sarvam_stt_model: str = "saaras:v4"
    # Realtime STT websocket endpoint (re-verify against current docs at deploy).
    sarvam_realtime_url: str = ""
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
    # Wider Ask answers with a card (services/explainer.py _WIDE_PROMPT):
    # a title, summary, up to 3 sections and 4 terms need more headroom.
    ask_card_max_tokens: int = 700

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
    quota_tts_chars_per_day: int = 20_000     # ~₹60/day/learner at Bulbul v3's ₹30 per 10K chars
    quota_stt_seconds_per_day: int = 900      # 15 minutes of speech (~₹7.50 at ₹30/hour)
    quota_llm_calls_per_day: int = 400       # LLM edge-router + explain calls
    quota_doc_pages_per_day: int = 30        # photographed writing read by Sarvam Document Intelligence
    quota_window_hours: int = 24

    # Service-wide spend ceiling across ALL learners, same rolling window
    # (owner decision 2026-09-15: ₹300/day). Per-learner quotas do not bound
    # spend on their own — every new install is a new learner with a fresh
    # allowance. 0 disables. Prices are Sarvam list prices on 2026-09-15.
    quota_daily_budget_inr: float = 300.0
    price_tts_inr_per_char: float = 30 / 10_000   # Bulbul v3: ₹30 per 10K characters
    price_stt_inr_per_second: float = 30 / 3_600  # speech-to-text: ₹30 per hour
    # sarvam-105b: ~2K input + ~180 output tokens at ₹29.28 / ₹73.20 per 1M
    # tokens ≈ ₹0.07 a call; rounded up so the ceiling errs early, not late.
    price_llm_inr_per_call: float = 0.10
    # Sarvam Document Digitization: ₹0.5 per page (docs.sarvam.ai/api/getting-started/pricing,
    # 2026-09-30). One photographed letter or word is one page.
    price_doc_inr_per_page: float = 0.5
    # POST /speech/stt on auto-detect runs three Saaras passes over one
    # recording (services/learner_stt.py). The learner's allowance is charged
    # once; the budget above counts all three, because all three are billed.
    stt_auto_detect_passes: int = 3

    # What a verse means (services/verse_study.py): the meaning under the
    # verse of the day and the Ask sheet's answers about a verse. Shown from
    # the database when stored; otherwise written once by Gemini Flash,
    # online, through Vertex AI with the service account below, and stored
    # (owner instruction 2026-10-02). Any Google-billed "name:model" from
    # evals/providers.py works here. With no credentials, a spent budget or a
    # failed call, a verse question falls back to the Sarvam explainer above.
    verse_explain_provider: str = "vertex:gemini-3.8-flash"
    verse_explain_enabled: bool = True
    # One study: meaning and idea in English and Hindi plus key words.
    verse_study_max_tokens: int = 1200
    # One card answering any other question about a verse.
    verse_explain_max_tokens: int = 700
    verse_explain_timeout_s: float = 20.0

    # Ask mode (services/ask_live.py): Talk's Ask switch and the Ask bubble's
    # wider questions, on Gemini Flash through Vertex AI (owner, 2026-10-05).
    # Draws on the Gemini budget below. With no credentials, a spent budget or
    # a failed call, the old Sarvam card (explain_provider) answers instead.
    ask_live_provider: str = "vertex:gemini-3.8-flash"
    ask_live_enabled: bool = True
    # A puja vidhi with its steps and mantras, or a chart reading, is long.
    ask_live_max_tokens: int = 2400
    ask_live_timeout_s: float = 30.0
    # Earlier questions and answers sent with a follow-up (the phone keeps them).
    ask_history_turns: int = 6
    # Seconds one answer may spend opening the pages that check its verses
    # and links (services/ask_sources.py). 0 skips the pages: only verses the
    # app holds are then shown.
    ask_source_check_s: float = 6.0
    # Sites trusted for Ask's links on top of services/page_check.py's list.
    ask_extra_trusted_hosts: str = "drikpanchang.com"
    # Book search for Ask (services/book_search.py): verses from the app's
    # own books, found by reference, by Sanskrit wording and by meaning, are
    # handed to the model with the question. Off until the owner turns it on.
    # The meaning search needs the index built by scripts/build_verse_index.py
    # with the same embedding model and size.
    book_search_enabled: bool = False
    book_search_embed_model: str = "gemini-embedding-001"
    book_search_dims: int = 768
    book_search_top_k: int = 6
    book_search_timeout_s: float = 8.0
    # Where the embedding model is called: the Cloud Run region (deploy.sh).
    # From here the first call to "global" took 12 s, asia-south1 under 1 s.
    book_search_location: str = "asia-south1"

    # Free-tier Gemini in front of the paid Vertex route (services/gemini_pool.py).
    # GEMINI_API_KEYS: AI Studio keys, comma or newline separated, one per Google
    # account. EVERY key must come from a project with NO billing account: a
    # project with billing linked (AI Studio shows "Tier 1" or higher) is a paid
    # service, bills every call, and would be counted here as free. Keep such a
    # key out of this list. Each (key, model) pair has its own quota.
    gemini_api_keys: str = ""
    # Models tried in this order on every key; the free quota is per model.
    gemini_free_models: str = "gemini-3.8-flash,gemini-3.7-flash"
    # Per kind of question (services/ask_route.py), owner decision 2026-10-10: 3.7
    # Flash first where the 60-question test showed it as good as 3.8 (a plain
    # question about a verse the books hold, grammar), 3.8 alone where it was
    # worse (questions of where a verse is from, a verse reference asked, a book
    # the app does not hold, a conversation or calendar context, weak evidence).
    # Paid Vertex is always 3.8. A model named here that is not in
    # gemini_free_models has no slot and is skipped.
    gemini_free_models_simple: str = "gemini-3.7-flash,gemini-3.8-flash"
    gemini_free_models_careful: str = "gemini-3.8-flash"
    gemini_free_enabled: bool = True
    # The free quota as AI Studio showed it for Gemini 3.8 Flash on 2026-10-10:
    # 5 requests a minute, 20 a day (and 250K input tokens a minute). A request
    # past a limit is not sent; a 429 from Google still wins (limits change).
    gemini_free_rpm: int = 5
    gemini_free_rpd: int = 20
    # Free-tier prompts and answers may be read by Google and used to improve
    # its products ("do not submit personal information"). False keeps a request
    # that carries a birth chart or a match on the paid route.
    gemini_free_allow_personal: bool = False
    # Query and index embeddings also try the free keys first. The free quota for
    # embeddings is not known; 0 means "send, and rely on the 429".
    gemini_free_embeddings: bool = True
    gemini_free_embed_rpm: int = 0
    gemini_free_embed_rpd: int = 0
    # How long a learner waits on a free key before the request goes to Vertex:
    # for a streamed answer, until its first piece; otherwise the whole call. The
    # free tier is slower and busier than Vertex (2026-10-10, two keys: 16 to 19 s
    # for a 50-token answer; a third key got 503 "high demand"), so a free key
    # that is slower than this is set aside, for longer each time it repeats.
    gemini_free_timeout_s: float = 12.0

    # Gemini has its own ceiling, apart from the Sarvam one: rupees across ALL
    # learners in the same rolling window (owner decision 2026-10-02: ₹200).
    # 0 disables the ceiling. Every online Gemini call must go through
    # services/quota.py with kind "gemini_inr" so it counts here.
    gemini_daily_budget_inr: float = 200.0
    # One learner's share of it, so a single account cannot drain the pool.
    quota_gemini_inr_per_day: float = 10.0
    # Gemini 3.8 Flash, global, USD per 1M tokens (input, output including
    # reasoning). Read on Google's pricing page 2026-10-02: $0.75 / $3.75
    # through 2026-12-31, then $1.50 / $7.50. services/quota.py switches on
    # the date. OpenRouter's model list showed the same $0.75 / $3.75.
    price_gemini_usd_per_m_input: float = 0.75
    price_gemini_usd_per_m_output: float = 3.75
    price_gemini_usd_per_m_input_2027: float = 1.50
    price_gemini_usd_per_m_output_2027: float = 7.50
    # Rounded up on purpose so the ceiling errs early (about 96 on 2026-10-02).
    usd_inr: float = 100.0

    # POST /speech/tts keeps recent audio in memory, keyed by text, voice and
    # pace, so the verse of the day is synthesised once per instance and not
    # once per tap per learner. A hit costs no vendor call and no quota.
    # 0 turns the cache off.
    tts_cache_max_bytes: int = 32 * 1024 * 1024

    # Public legal pages (/privacy, /delete-account). Google Play requires a
    # privacy policy URL and an account-deletion URL; both name a contact.
    # NOTE: the entity name is a CODE default (not pushed via LEGAL_ENTITY_NAME)
    # because the Windows deploy path forwards --update-env-vars through
    # gcloud.cmd -> cmd.exe, which splits any value containing a space and
    # aborts the deploy. Set a space-free name here or in a non-Windows deploy.
    legal_entity_name: str = "Vedic Valor"
    legal_contact_email: str = ""

    # Reading shelf Plus lock (owner decision 2026-10-09, turned on when
    # buying Plus works). Off by default, so with no environment change
    # nothing is locked for anyone. CANON_PLUS_GATE=true locks every
    # tier=plus paged book to its preview (first chapter; first 5 verses for
    # a one-chapter book) for learners without the canon_plus entitlement.
    canon_plus_gate: bool = False

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

    # POST /writing/photo-check: a photographed letter or word, read by Sarvam
    # Document Intelligence. Sarvam returns text and no confidence, so an EXACT
    # match with the target is reported at the match confidence (above the photo
    # correct floor) and anything else at the miss confidence (below the photo
    # wrong floor): a mismatch is `unsure`, never `wrong`, the same abstention
    # rule as every other recogniser here.
    writing_photo_max_bytes: int = 6 * 1024 * 1024
    writing_photo_match_confidence: float = 0.95
    writing_photo_miss_confidence: float = 0.5
    sarvam_doc_language: str = "sa-IN"

    # Word journey pipeline (handover_language 7.2): Gemini through Vertex AI
    # batch jobs with the service account, and no other way. No OpenRouter
    # and no online (non-batch) Gemini call in this feature.
    vertex_credentials_path: str = "../vertex_credentials.json"
    vertex_project: str = "videos-498005"
    vertex_batch_bucket: str = "videos-498005-batch"
    vertex_batch_prefix: str = "sanskritam-word-origins"
    vertex_location: str = "global"
    word_origins_model: str = "gemini-3.8-flash"
    # The same service-account key as one JSON string, for hosts with no key
    # file: Cloud Run mounts it from Secret Manager as VERTEX_CREDENTIALS_JSON.
    # When set it wins over vertex_credentials_path. Never logged.
    vertex_credentials_json: str = ""

    # Daily content (services/daily_content.py): the word journey and the
    # "Do you know" fact are written by the model, checked by code against a
    # page on a trusted site, and stored in the database. POST
    # /admin/content/tick moves the work one step; a scheduler calls it.
    # Each kind is topped up when fewer than this many future days are filled.
    content_words_stock_days: int = 60
    content_facts_stock_days: int = 30
    # Rupees the pipeline may spend on batch jobs in any 24 hours, by its own
    # token counts at half the list price (batch). 0 turns the ceiling off.
    # It also stays under what is left of gemini_daily_budget_inr.
    content_daily_budget_inr: float = 60.0
    # Hosts trusted as evidence on top of the built-in list
    # (services/page_check.py), comma-separated, for example "example.edu".
    content_extra_trusted_hosts: str = ""

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

    # Audio object store
# Audio object store (P8-5 — Cloud Run kept, owner decision 2026-09-08).
    # Cloud Run's disk is ephemeral per revision, so pre-rendered WAVs must
    # live in a bucket, not on local disk. "local" = storage/audio (dev);
    # "gcs" = Google Cloud Storage bucket below; "r2" = Cloudflare R2
    # (zero-egress, 2026-09-16). The client is unaffected: LocalStorage.url()
    # returns /audio/<path> while GCS/R2 return the CDN URL — both are opaque
    # strings to the app.
    audio_storage: str = "local"
    gcs_audio_bucket: str = ""  # e.g. "sanskritam-audio"; empty = local
    cdn_base_url: str = ""  # e.g. "https://cdn.sanskritam.app"; empty = bucket URL
    # Cloudflare R2 (audio_storage="r2") — S3-compatible zero-egress store.
    # account_id + the two keys are only needed for WRITES (store/exists);
    # reads are served directly from the bucket's public CDN URL (r2_base_url).
    r2_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket: str = "sanskritam"
    r2_base_url: str = ""  # public read root, e.g. "https://pub-<hash>.r2.dev"
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

    # Parva festivals (handover_festivals 7.2): which page and painting
    # statuses are served, and how far ahead the calendar may be asked for.
    parva_serve_statuses: str = "approved"
    parva_art_serve_statuses: str = "approved"
    parva_max_days: int = 120

    # Recite + competitions (handover_recite 8.1, 11.9).
    env: str = "dev"
    scorer_url: str = ""  # "sarvam": pinned Sanskrit STT; URL: external Su-srota; "fake": dev only.
    scorer_key: str = ""
    scorer_timeout_s: float = 25.0
    scorer_max_seconds: int = 45
    quota_recite_seconds_per_day: int = 900
    chant_voice: str = "vagdhenu-steer-2026-06-17"
    chant_serve_statuses: str = "auto_ok,approved"
    private_storage: str = "local"
    r2_private_bucket: str = ""
    gcs_private_bucket: str = ""
    competition_tz: str = "Asia/Kolkata"
    competition_results_hour: int = 8
    competition_attempts_per_day: int = 10
    competition_audio_days: int = 30
    competition_min_face_ratio: float = 0.9
    competition_min_eyes_closed_ratio: float = 0.85
    competition_max_multi_face_ratio: float = 0.1
    competition_replay_threshold: float = 0.0
    competition_piece_max_ms: int = 35000
    competition_rules_version: str = "2026-10-14"
    # Twice-weekly single-verse events (rules 2026-10-1). Off since the
    # weekly three-verse sets took over on 2026-10-14.
    competition_legacy_events: bool = False
    prize_contact_email: str = ""

    # Play sharing / verified app links (handover_games_daily_multiplayer §11).
    # public_base_url: first-party HTTPS origin that hosts /l/<code> and the
    # landing page. The certificate fingerprints / Apple app ids stay empty
    # until the owner adds the real signing values — the statement files then
    # assert nothing rather than faking verification.
    public_base_url: str = ""
    android_cert_fingerprints: str = ""
    apple_app_ids: str = ""

    # Audio-only community calls; secrets stay on the server.
    stream_api_key: str = Field(
        default="", validation_alias=AliasChoices("STREAM_API_KEY", "NEXT_PUBLIC_STREAM_API_KEY")
    )
    stream_api_secret: str = ""

    model_config = {"env_prefix": "", "env_file": _ENV_FILES, "extra": "ignore"}

    @property
    def is_production(self) -> bool:
        """True when ENV=production, and always on Cloud Run (it sets K_SERVICE
        on every revision), so a deploy that forgets ENV still counts as
        production. Guards the fake scorer and the competition test clock."""
        return self.env.strip().lower() == "production" or bool(os.environ.get("K_SERVICE"))


settings = Settings()
