#!/usr/bin/env bash
# Sanskritam — one-shot Cloud Run deploy, meant to run in Cloud Shell.
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
#   GCS_AUDIO_BUCKET=sanskritam-audio   pre-rendered WAVs live here, not on
#                                   Cloud Run's ephemeral disk (P8-5). Omit to
#                                   stay on local disk (dev only).
#   CDN_BASE_URL=https://cdn.example.com  served in audio URLs; omit to use
#                                   raw storage.googleapis.com URLs.
#   GOOGLE_CLIENT_ID=...            optional — comma-separated Google OAuth
#                                   client IDs (Android,iOS,Web) for /auth/google.
#                                   Omit to disable Google login in prod.
#   APPLE_CLIENT_ID=...             optional — bundle ID and/or Services ID for
#                                   /auth/apple (Guideline 4.8: mandatory if
#                                   Google login is offered). Omit to disable.
#
# (No HuggingFace token needed: vidyut's data downloads from GitHub releases,
#  not HF, and nothing else in the codebase reads one — verified 2026-09-02.)
#
# Usage:  bash deploy/gcp/deploy.sh
#   Project comes from PROJECT_ID (env or .env.deploy), else the active
#   `gcloud config` project.

set -euo pipefail

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

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
if [ -z "$PROJECT_ID" ]; then
  echo "No project: run 'gcloud config set project <id>' or set PROJECT_ID." >&2
  exit 1
fi
echo "Deploying to project: $PROJECT_ID"

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
#       Only secrets with a value are uploaded AND mounted. Mounting a
#       referenced-but-nonexistent secret (e.g. apple-client-id when
#       APPLE_CLIENT_ID is omitted, which the header documents as "omit to
#       disable") fails the revision with SecretsAccessCheckFailed while
#       traffic silently stays on the previous revision (2026-09-09: Path,
#       Words and Reader 404ing on stale code with a green deploy log).
declare -A SECRETS=(
  [sarvam-api-key]=SARVAM_API_KEY
  [openrouter-api-key]=OPENROUTER_API_KEY
  [admin-token]=ADMIN_TOKEN
  [shabd-database-url]=DATABASE_URL
  [google-client-id]=GOOGLE_CLIENT_ID
  [apple-client-id]=APPLE_CLIENT_ID
)
SECRET_MOUNTS=()
for name in "${!SECRETS[@]}"; do
  var="${SECRETS[$name]}"
  val="${!var:-}"
  [ -z "$val" ] && continue
  if gcloud secrets describe "$name" --project="$PROJECT_ID" >/dev/null 2>&1; then
    printf '%s' "$val" | gcloud secrets versions add "$name" --project="$PROJECT_ID" --data-file=-
  else
    printf '%s' "$val" | gcloud secrets create "$name" --project="$PROJECT_ID" --data-file=-
  fi
  SECRET_MOUNTS+=("${var}=${name}:latest")
done
# --set-secrets is passed only when at least one secret is set (SARVAM_API_KEY
# and DATABASE_URL are required in practice, so this is never empty on a real
# deploy — the guard is against `set -u` on an empty expansion, not a config).
SECRET_FLAGS=()
if [ "${#SECRET_MOUNTS[@]}" -gt 0 ]; then
  SECRET_FLAGS=(--set-secrets="$(IFS=,; echo "${SECRET_MOUNTS[*]}")")
fi

# ── 1b. Let Cloud Run's default runtime SA read the secrets (idempotent).
#       Without roles/secretmanager.secretAccessor the revision is rejected
#       with "Permission denied on secret".  Tolerated to fail silently:
#       if the caller lacks IAM rights AND secrets are unreadable, the
#       deploy itself fails loudly at revision creation.
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" >/dev/null 2>&1 || true

# ── 1c. Audio object store (P8-5 — Cloud Run kept, owner decision
#       2026-09-08). Pre-rendered audio is an owned asset (§14.2) and Cloud
#       Run's disk is ephemeral per revision, so production audio lives in
#       GCS. All idempotent; skipped entirely when GCS_AUDIO_BUCKET is unset
#       (dev stays on local disk). Audio content is public (P14-2 gates
#       nothing the reader/listener touches), so the bucket is public-read
#       behind the CDN; the runtime SA gets objectAdmin for uploads.
if [ -n "${GCS_AUDIO_BUCKET:-}" ]; then
  gcloud storage buckets create "gs://${GCS_AUDIO_BUCKET}" \
    --project="$PROJECT_ID" --location="$REGION" \
    --uniform-bucket-level-access >/dev/null 2>&1 || true
  gcloud storage buckets add-iam-policy-binding "gs://${GCS_AUDIO_BUCKET}" \
    --project="$PROJECT_ID" \
    --member=allUsers --role=roles/storage.objectViewer >/dev/null 2>&1 || true
  gcloud storage buckets add-iam-policy-binding "gs://${GCS_AUDIO_BUCKET}" \
    --project="$PROJECT_ID" \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role=roles/storage.objectAdmin >/dev/null 2>&1 || true
  AUDIO_ENV=",AUDIO_STORAGE=gcs,GCS_AUDIO_BUCKET=${GCS_AUDIO_BUCKET},CDN_BASE_URL=${CDN_BASE_URL:-}"
else
  AUDIO_ENV=""
fi

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
  --set-env-vars="ANALYZER=vidyut,LOG_LEVEL=INFO,DEV_LOGIN_ENABLED=false${AUDIO_ENV}" \
  "${SECRET_FLAGS[@]}"

# ── 3. Verify ────────────────────────────────────────────────────────────
URL=$(gcloud run services describe "$SERVICE" --project="$PROJECT_ID" --region="$REGION" --format='value(status.url)')
echo ""
echo "Deployed: $URL"
echo "Health:   $URL/health"
curl -sS "$URL/health" && echo "" && echo "HEALTH OK" || echo "HEALTH CHECK FAILED — check logs: gcloud run services logs read $SERVICE --region $REGION"
