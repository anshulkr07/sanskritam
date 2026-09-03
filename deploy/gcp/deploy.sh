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

# ── 0b. Normalize DATABASE_URL: percent-encode the password component.
#       Supabase console URLs carry raw special chars (e.g. '@') in the
#       password; SQLAlchemy splits user:pass@host on the FIRST '@', which
#       corrupts the host and crashes the app at first connect.  urlsplit
#       splits on the LAST '@' so it decodes correctly, and requoting makes
#       this idempotent (already-encoded URLs pass through unchanged).
if [ -n "${DATABASE_URL:-}" ]; then
  DATABASE_URL=$(python3 -c '
import sys
from urllib.parse import quote, unquote
url = sys.argv[1]
if "://" in url:
    scheme, rest = url.split("://", 1)
else:
    scheme, rest = "postgresql", url
userinfo, _, hostport = rest.rpartition("@")
user, _, pw = userinfo.partition(":")
# UNQUOTE to true characters, then QUOTE exactly once: idempotent by
# construction — safe to run on raw or already-encoded URLs.
# (Quoted components are built as plain variables — no quotes inside the
# f-string expression, which Python < 3.12 forbids.)
q_user = quote(unquote(user), safe="")
q_pw = quote(unquote(pw), safe="")
print(scheme + "://" + q_user + ":" + q_pw + "@" + hostport)
' "$DATABASE_URL")
  export DATABASE_URL
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

# ── 1b. Let Cloud Run's default runtime SA read the secrets (idempotent).
#       Without roles/secretmanager.secretAccessor the revision is rejected
#       with "Permission denied on secret".  Tolerated to fail silently:
#       if the caller lacks IAM rights AND secrets are unreadable, the
#       deploy itself fails loudly at revision creation.
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" >/dev/null 2>&1 || true

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
