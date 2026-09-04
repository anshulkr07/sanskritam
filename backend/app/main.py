"""FastAPI application entry point."""

import logging
import time

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings

logger = logging.getLogger("shabd")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database and seed data on startup."""
    from app.db import init_db
    from app.seeds.seed import run_seed

    init_db()
    run_seed()

    if settings.dev_login_enabled:
        logger.warning("DEV_LOGIN_ENABLED=True — unauthenticated login path is OPEN. Set DEV_LOGIN_ENABLED=false in production.")

    logger.info("Shabd backend started successfully")
    yield


def create_app() -> FastAPI:
    """Application factory."""
    app = FastAPI(
        title="Shabd API",
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

    # Request timing middleware
    @app.middleware("http")
    async def timing_middleware(request: Request, call_next):
        start = time.time()
        response = await call_next(request)
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