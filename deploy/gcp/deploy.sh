#!/usr/bin/env bash
# Shabd — one-shot Cloud Run deploy, meant to run in Cloud Shell.
#
# Prereqs (all interactive, done once in Cloud Shell):
#   gcloud auth login && gcloud config set project <PROJECT_ID>
#   gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
#       artifactregistry.googleapis.com secretmanager.googleapis.com
#
# Secrets are read from a local .env.deploy (gitignored) with lines:
#   SARVAM_API_KEY=...
#   OPENROUTER_API_KEY=...
#   ADMIN_TOKEN=...
#   DATABASE_URL=postgresql://...   (Supabase session-pooler string, port 5432)
#
# (No HuggingFace token needed: vidyut's data downloads from GitHub releases,
#  not HF, and nothing else in the codebase reads one — verified 2026-09-02.)
#
# Usage:  PROJECT_ID=<id> bash deploy/gcp/deploy.sh

set -euo pipefail

PROJECT_ID="${PROJECT_ID:?export PROJECT_ID=<your-project-id> first}"
REGION="asia-south1"
SERVICE="shabd-api"
ENV_FILE="${ENV_FILE:-.env.deploy}"

cd "$(dirname "$0")/../.."   # repo root

# ── 0. Load secrets from .env.deploy (KEY=VALUE lines) into the environment.
#       Kept out of the repo/history (.gitignore lists .env.deploy).
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

# ── 1. Upload secrets (idempotent: overwrite existing versions) ──────────
declare -A SECRETS=(
  [sarvam-api-key]=SARVAM_API_KEY
  [openrouter-api-key]=OPENROUTER_API_KEY
  [admin-token]=ADMIN_TOKEN
  [shabd-database-url]=DATABASE_URL
)
for name in "${!SECRETS[@]}"; do
  var="${SECRETS[$name]}"
  val="${!var:-}"
  [ -z "$val" ] && continue
  if gcloud secrets describe "$name" --project="$PROJECT_ID" >/dev/null 2>&1; then
    printf '%s' "$val" | gcloud secrets versions add "$name" --project="$PROJECT_ID" --data-file=-
  else
    printf '%s' "$val" | gcloud secrets create "$name" --project="$PROJECT_ID" --data-file=-
  fi
done

# ── 2. Deploy (buildpacks via --source; Dockerfile in repo root is used
#       automatically when present) ────────────────────────────────────────
gcloud run deploy "$SERVICE" \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --source=. \
  --port=8000 \
  --memory=1Gi \
  --cpu=1 \
  --min-instances=1 \
  --max-instances=2 \
  --timeout=120s \
  --allow-unauthenticated \
  --set-env-vars="ANALYZER=vidyut,LOG_LEVEL=INFO,DEV_LOGIN_ENABLED=false" \
  --set-secrets="SARVAM_API_KEY=sarvam-api-key:latest,OPENROUTER_API_KEY=openrouter-api-key:latest,ADMIN_TOKEN=admin-token:latest,DATABASE_URL=shabd-database-url:latest"

# ── 3. Verify ────────────────────────────────────────────────────────────
URL=$(gcloud run services describe "$SERVICE" --project="$PROJECT_ID" --region="$REGION" --format='value(status.url)')
echo ""
echo "Deployed: $URL"
echo "Health:   $URL/health"
curl -sS "$URL/health" && echo "" && echo "HEALTH OK" || echo "HEALTH CHECK FAILED — check logs: gcloud run services logs read $SERVICE --region $REGION"
