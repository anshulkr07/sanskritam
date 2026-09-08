"""FastAPI application entry point."""

import logging
import time
import traceback

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings

logger = logging.getLogger("shabd")

# Per-process counter distinguishing otherwise-identical request ids within
# the same millisecond (P8-2).
_request_seq = 0


async def _log_exception(request: Request, exc: Exception) -> None:
    """Persist a crash row: route + stack trace only (P8-2).

    NO learner content: no request body, no transcript, no Devanagari answer —
    those are learner speech and P1-4's retention rule governs them. The write
    must never mask the original error: any failure here is logged and
    swallowed."""
    global _request_seq
    _request_seq += 1
    rid = f"{int(time.time() * 1000):x}-{_request_seq % 0xFFFF:04x}"
    tb = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
    try:
        from app.db import SessionLocal
        from app.models import ErrorLog

        db = SessionLocal()
        try:
            db.add(ErrorLog(
                route=f"{request.method} {request.url.path}"[:128],
                error_type=type(exc).__name__[:128],
                detail=str(exc)[:256],
                traceback=tb[-2000:],
                request_id=rid,
            ))
            db.commit()
        finally:
            db.close()
    except Exception:  # noqa: BLE001 — never mask the original error
        logger.exception("error-log write failed (original error: %s)", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database and seed data on startup."""
    from app.db import init_db
    from app.seeds.seed import run_seed

    init_db()
    run_seed()

    if settings.dev_login_enabled:
        logger.warning("DEV_LOGIN_ENABLED=True — unauthenticated login path is OPEN. Set DEV_LOGIN_ENABLED=false in production.")

    logger.info("Sanskritam backend started successfully")
    yield


def create_app() -> FastAPI:
    """Application factory."""
    app = FastAPI(
        title="Sanskritam API",
        description="Sanskrit learning backend",
        version="0.1.0",
        docs_url="/docs",
        lifespan=lifespan,
    )

    # CORS — wide open for dev
    origins = settings.cors_origins.split(",") if settings.cors_origins != "*" else ["*"]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Request timing middleware + crash log (P8-2)
    @app.middleware("http")
    async def timing_middleware(request: Request, call_next):
        start = time.time()
        try:
            response = await call_next(request)
        except Exception as e:  # noqa: BLE001 — the crash log IS the point (P8-2)
            await _log_exception(request, e)
            raise
        elapsed = time.time() - start
        response.headers["X-Request-Time"] = f"{elapsed:.3f}"
        logger.info(
            "%s %s -> %s (%.3fs)",
            request.method,
            request.url.path,
            response.status_code,
            elapsed,
        )
        return response

    # Register routers
    from app.routers.health import router as health_router
    from app.routers.auth_router import router as auth_router
    from app.routers.me import router as me_router
    from app.routers.challenges import router as challenges_router
    from app.routers.attempts import router as attempts_router
    from app.routers.shlokas import router as shlokas_router
    from app.routers.grammar import router as grammar_router
    from app.routers.admin import router as admin_router
    from app.routers.pipeline import router as pipeline_router
    from app.routers.speech import router as speech_router
    from app.routers.conversation import router as conversation_router
    from app.routers.authoring import router as authoring_router
    from app.routers.pronunciation import router as pronunciation_router
    from app.routers.progress import router as progress_router
    from app.routers.daily_word import router as daily_word_router
    from app.routers.explain import router as explain_router
    from app.routers.writing import router as writing_router
    from app.routers.lessons import router as lessons_router
    from app.routers.vocab import router as vocab_router
    from app.routers.reader import router as reader_router
    from app.routers.notify import router as notify_router
    from app.routers.canon import router as canon_router
    from app.routers.exercises import router as exercises_router
    from app.routers.licences import router as licences_router
    from app.routers.review import router as review_router
    from app.routers.varnamala import router as varnamala_router

    app.include_router(health_router, tags=["Health"])
    app.include_router(auth_router, tags=["Auth"])
    app.include_router(me_router, tags=["Learner"])
    app.include_router(challenges_router, tags=["Challenges"])
    app.include_router(attempts_router, tags=["Attempts"])
    app.include_router(shlokas_router, tags=["Shlokas"])
    app.include_router(grammar_router, tags=["Grammar"])
    app.include_router(admin_router, tags=["Admin"])
    app.include_router(pipeline_router, tags=["Pipeline"])
    app.include_router(speech_router, tags=["Speech"])
    app.include_router(conversation_router, tags=["Conversation"])
    app.include_router(authoring_router, tags=["Authoring"])
    app.include_router(pronunciation_router, tags=["Pronunciation"])
    app.include_router(progress_router, tags=["Progress"])
    app.include_router(daily_word_router, tags=["Daily Word"])
    app.include_router(explain_router, tags=["Explain"])
    app.include_router(writing_router, tags=["Writing"])
    app.include_router(lessons_router, tags=["Lessons"])
    app.include_router(vocab_router, tags=["Vocabulary"])
    app.include_router(reader_router, tags=["Reader"])
    app.include_router(notify_router, tags=["Notify"])
    app.include_router(canon_router, tags=["Canon"])
    app.include_router(exercises_router, tags=["Exercises"])
    app.include_router(licences_router, tags=["Licences"])
    app.include_router(review_router, tags=["Review"])
    app.include_router(varnamala_router, tags=["Varnamala"])

    # Serve pre-rendered audio (/audio/<path>) BEFORE the frontend catch-all
    # mount below so the static WAVs resolve even though the console is mounted
    # at "/". LocalStorage stores under storage/audio and its url() returns
    # /audio/<path>, so the client fetches the audio from this origin (§12 /
    # P17-3). Mount only when the directory exists.
    _audio_dir = Path("storage/audio")
    if _audio_dir.is_dir():
        app.mount("/audio", StaticFiles(directory=str(_audio_dir)), name="audio")

    # Serve the web console (frontend/) from the API's own origin when the
    # directory is present.  Kill CORS entirely for the console and give the
    # deployed API a browsable UI.  Mounted LAST so /api, /docs, /health
    # keep priority; app.js defaults to http://localhost:8000 which is this
    # origin in production, so the console works with zero configuration.
    _frontend_dir = Path(__file__).resolve().parent.parent.parent / "frontend"
    if _frontend_dir.is_dir():
        app.mount("/", StaticFiles(directory=_frontend_dir, html=True), name="frontend")

    return app


# Lazily create on import for uvicorn
_app: FastAPI | None = None


def get_app() -> FastAPI:
    global _app
    if _app is None:
        _app = create_app()
    return _app


app = get_app()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.port, reload=False)
