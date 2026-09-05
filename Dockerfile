# Sanskritam API — FastAPI + vidyut on Cloud Run (asia-south1).
# Build context is the repo root (frontend/ is mounted by app.main, so the
# context must include it).  vidyut-data is baked at build time: the
# gitignored ~200MB corpus would otherwise re-download onto Cloud Run's
# ephemeral disk on every revision cold start.

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /srv/shabd

# System deps: nothing exotic needed (vidyut wheels are prebuilt for 3.11).
# curl for the container-level health check convenience during debugging.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /srv/shabd/backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# App code + migrations + Alembic env
COPY backend/app /srv/shabd/backend/app
COPY backend/migrations /srv/shabd/backend/migrations
COPY backend/alembic.ini /srv/shabd/backend/alembic.ini

# Web console — served from the API origin by app.main
COPY frontend /srv/shabd/frontend

# Bake the vidyut data corpus into the image (one download per build, not
# per cold start).  Uses the same ensure_vidyut_data() the runtime uses.
RUN cd backend \
    && python -c "from app.grading.analyzer import ensure_vidyut_data; ensure_vidyut_data()" \
    && rm -rf /root/.cache

# Cloud Run injects PORT; uvicorn binds it.  Single worker: uvicorn is async
# and this traffic level needs no more.  (A threads flag was removed: it is
# a gunicorn option, not uvicorn's — it made the container exit at boot, r3/r4.)
# The app package lives at /srv/shabd/backend/app, so uvicorn must launch from
# backend/ (or use --app-dir) or `app.main:app` cannot be imported.
WORKDIR /srv/shabd/backend
CMD exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1
