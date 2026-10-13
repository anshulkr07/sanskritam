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
#   DATABASE_URL=postgresql://...   only used with --rotate-database-url
#                                   (first deployment or credential rotation).
#                                   Normal deploys use the last ready revision's
#                                   database secret, ignoring local DATABASE_URL.
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
#   GEMINI_API_KEYS=key1,key2,key3  optional — free-tier Gemini keys, one per
#                                   Google account (AI Studio), tried before paid
#                                   Vertex (services/gemini_pool.py). Stored as the
#                                   secret "gemini-api-keys". Every key must come
#                                   from a project WITHOUT billing: a project that
#                                   AI Studio shows as Tier 1 is billed per call.
#
# Daily content (the word journey and "Do you know", services/daily_content.py):
#   The Vertex service-account key is read from the file vertex_credentials.json
#   at the repo root (gitignored; set VERTEX_CREDENTIALS_FILE to use another
#   path). When the file is there it is stored as the secret
#   "vertex-credentials" and mounted as VERTEX_CREDENTIALS_JSON; without it the
#   pipeline stays off and the app shows what is already stored.
#   A Cloud Scheduler job then calls POST /admin/content/tick every half hour.
#   That needs, once:  gcloud services enable cloudscheduler.googleapis.com
#   and ADMIN_TOKEN in .env.deploy for the run that creates the job.
#
# (No HuggingFace token needed: vidyut's data downloads from GitHub releases,
#  not HF, and nothing else in the codebase reads one — verified 2026-09-02.)
#
# Usage:  bash deploy/gcp/deploy.sh
# Rotate DB credentials: bash deploy/gcp/deploy.sh --rotate-database-url
#   The supplied DATABASE_URL is tested before any cloud secret is changed.
#   Project comes from PROJECT_ID (env or .env.deploy), else the active
#   `gcloud config` project.

set -euo pipefail

REGION="asia-south1"
SERVICE="shabd-api"
ENV_FILE="${ENV_FILE:-.env.deploy}"

# Locate repo root robustly whether invoked from repo root, deploy/gcp, or elsewhere
if [ -f "Dockerfile" ]; then
  : # already at repo root
elif [ -f "$(dirname "$0")/../../Dockerfile" ]; then
  cd "$(dirname "$0")/../.."
elif [ -f "../../Dockerfile" ]; then
  cd ../..
fi

# ── 0. Load secrets from .env.deploy (KEY=VALUE lines) into the environment.
#       Kept out of the repo/history (.gitignore lists .env.deploy).
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

ROTATE_DATABASE_URL=false
for arg in "$@"; do
  case "$arg" in
    --rotate-database-url) ROTATE_DATABASE_URL=true ;;
    *) echo "Unknown argument: $arg" >&2; exit 1 ;;
  esac
done

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
if [ -z "$PROJECT_ID" ]; then
  echo "No project: run 'gcloud config set project <id>' or set PROJECT_ID." >&2
  exit 1
fi
echo "Deploying to project: $PROJECT_ID"

# ── 0b. Normal deploys reuse the last READY revision's DB secret. A stale
#       .env.deploy cannot overwrite it. Credential changes are explicit.
DATABASE_BINDING=""
if [ "$ROTATE_DATABASE_URL" = true ]; then
  if [ -z "${DATABASE_URL:-}" ]; then
    echo "--rotate-database-url requires DATABASE_URL in .env.deploy." >&2
    exit 1
  fi
else
  DATABASE_BINDING=$(python3 deploy/gcp/database_secret_binding.py "$PROJECT_ID" "$REGION" "$SERVICE")
  DB_SECRET_NAME="${DATABASE_BINDING%:*}"
  DB_SECRET_VERSION="${DATABASE_BINDING##*:}"
  DATABASE_URL=$(gcloud secrets versions access "$DB_SECRET_VERSION" --secret="$DB_SECRET_NAME" --project="$PROJECT_ID")
  echo "Reusing database secret $DATABASE_BINDING from the last ready revision."
fi
if [ -z "$DATABASE_URL" ]; then
  echo "Selected database secret is empty. No secrets uploaded." >&2
  exit 1
fi

# Test the exact selected credentials before any cloud writes. Use an
# isolated temporary Python environment if psycopg is absent.
if [ -n "$DATABASE_URL" ]; then
  DB_CHECK_PYTHON=python3
  if ! "$DB_CHECK_PYTHON" -c 'import psycopg' >/dev/null 2>&1; then
    DB_CHECK_DIR=$(mktemp -d)
    trap 'rm -rf -- "$DB_CHECK_DIR"' EXIT
    python3 -m venv "$DB_CHECK_DIR"
    DB_CHECK_PYTHON="$DB_CHECK_DIR/bin/python"
    "$DB_CHECK_PYTHON" -m pip install --quiet 'psycopg[binary]>=3.1,<4'
  fi
  export DATABASE_URL
  DATABASE_URL=$("$DB_CHECK_PYTHON" deploy/gcp/check_database.py)
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
  [google-client-id]=GOOGLE_CLIENT_ID
  [apple-client-id]=APPLE_CLIENT_ID
  [gemini-api-keys]=GEMINI_API_KEYS
)
SECRET_MOUNTS=()
# Only an explicit rotation creates a new database secret version.
if [ "$ROTATE_DATABASE_URL" = true ]; then
  SECRETS[shabd-database-url]=DATABASE_URL
else
  SECRET_MOUNTS+=("DATABASE_URL=${DATABASE_BINDING}")
fi
for name in "${!SECRETS[@]}"; do
  var="${SECRETS[$name]}"
  val="${!var:-}"
  [ -z "$val" ] && continue
  if gcloud secrets describe "$name" --project="$PROJECT_ID" >/dev/null 2>&1; then
    version_path=$(printf '%s' "$val" | gcloud secrets versions add "$name" --project="$PROJECT_ID" --data-file=- --format='value(name)')
  else
    gcloud secrets create "$name" --project="$PROJECT_ID"
    version_path=$(printf '%s' "$val" | gcloud secrets versions add "$name" --project="$PROJECT_ID" --data-file=- --format='value(name)')
  fi
  version="${version_path##*/}"
  [[ "$version" =~ ^[0-9]+$ ]] || { echo "No secret version returned for $name" >&2; exit 1; }
  SECRET_MOUNTS+=("${var}=${name}:${version}")
done

# The Vertex service-account key for the daily-content pipeline: a JSON file,
# so it goes up from the file itself and never through a shell variable. The
# key is for the project that runs the batch jobs, which need not be this one.
VERTEX_CREDENTIALS_FILE="${VERTEX_CREDENTIALS_FILE:-vertex_credentials.json}"
if [ -f "$VERTEX_CREDENTIALS_FILE" ]; then
  if gcloud secrets describe vertex-credentials --project="$PROJECT_ID" >/dev/null 2>&1; then
    version_path=$(gcloud secrets versions add vertex-credentials --project="$PROJECT_ID" --data-file="$VERTEX_CREDENTIALS_FILE" --format='value(name)')
  else
    gcloud secrets create vertex-credentials --project="$PROJECT_ID"
    version_path=$(gcloud secrets versions add vertex-credentials --project="$PROJECT_ID" --data-file="$VERTEX_CREDENTIALS_FILE" --format='value(name)')
  fi
  version="${version_path##*/}"
  [[ "$version" =~ ^[0-9]+$ ]] || { echo "No secret version returned for vertex-credentials" >&2; exit 1; }
  SECRET_MOUNTS+=("VERTEX_CREDENTIALS_JSON=vertex-credentials:${version}")
fi
# --set-secrets is passed only when at least one secret is set (SARVAM_API_KEY
# and DATABASE_URL are required in practice, so this is never empty on a real
# deploy — the guard is against `set -u` on an empty expansion, not a config).
SECRET_FLAGS=()
if [ "${#SECRET_MOUNTS[@]}" -gt 0 ]; then
  # --update-secrets, never --set-secrets: --set-secrets REPLACES the whole
  # mount list, so a run whose .env.deploy holds only GOOGLE_CLIENT_ID leaves
  # only that secret mounted. Seen 2026-09-15: revision 00027 lost DATABASE_URL,
  # SARVAM_API_KEY, OPENROUTER_API_KEY and ADMIN_TOKEN, and production fell
  # back to an in-container SQLite with the default admin token. Updating
  # mounts what this file has and keeps everything already mounted.
  SECRET_FLAGS=(--update-secrets="$(IFS=,; echo "${SECRET_MOUNTS[*]}")")
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
elif [ "${AUDIO_STORAGE:-}" = "r2" ]; then
  # Cloudflare R2 (2026-09-16) — zero-egress object store. Account id + S3
  # keys are WRITE-only creds; reads are served directly from R2_BASE_URL.
  # Env holds them; Optional: promote account/keys to a Secret Manager secret
  # named "r2-credentials" later if you want them out of plain env.
  AUDIO_ENV=",AUDIO_STORAGE=r2,R2_ACCOUNT_ID=${R2_ACCOUNT_ID:-},R2_ACCESS_KEY_ID=${R2_ACCESS_KEY_ID:-},R2_SECRET_ACCESS_KEY=${R2_SECRET_ACCESS_KEY:-},R2_BUCKET=${R2_BUCKET:-sanskritam},R2_BASE_URL=${R2_BASE_URL:-}"
else
  AUDIO_ENV=""
fi

# ── 1d. Optional plain settings, passed only when set in .env.deploy:
#       LEGAL_CONTACT_EMAIL, LEGAL_ENTITY_NAME   shown on /privacy and
#                                   /delete-account (Play requires both pages)
#       QUOTA_DAILY_BUDGET_INR       Sarvam rupees/day ceiling across all
#                                   learners (code default 300; 0 disables)
#       GEMINI_DAILY_BUDGET_INR      online Gemini rupees/day ceiling across
#                                   all learners (code default 200; 0 disables)
#       CONTENT_WORDS_STOCK_DAYS, CONTENT_FACTS_STOCK_DAYS   how many future
#                                   days of each daily card to keep filled
#                                   (code defaults 60 and 30)
#       CONTENT_DAILY_BUDGET_INR     rupees/day the pipeline may spend on
#                                   batch jobs (code default 60; 0 disables)
#       SCORER_URL, SCORER_KEY       "sarvam" or external Su-srota URL (recite);
#       SARVAM_STT_MODEL             saaras:v4 for pinned Sanskrit scoring;
#                                   R2_PRIVATE_BUCKET, GCS_PRIVATE_BUCKET
#                                   private competition recordings
#       ENV                          dev|production (fake scorer refused in prod)
#       PRIZE_CONTACT_EMAIL          monthly prize contact shown to winner
#       BOOK_SEARCH_ENABLED          true: Ask searches the app's books and hands
#                                   the verses to the model (needs the verse_vectors
#                                   index: scripts/build_verse_index.py)
#       GEMINI_FREE_ENABLED          false turns the free-key route off
#       GEMINI_FREE_ALLOW_PERSONAL   true lets birth-chart and match requests use the
#                                   free keys too (default false: Google may read them)
EXTRA_ENV=""
for var in LEGAL_CONTACT_EMAIL LEGAL_ENTITY_NAME QUOTA_DAILY_BUDGET_INR GEMINI_DAILY_BUDGET_INR            CONTENT_WORDS_STOCK_DAYS CONTENT_FACTS_STOCK_DAYS CONTENT_DAILY_BUDGET_INR SCORER_URL SCORER_KEY SARVAM_STT_MODEL R2_PRIVATE_BUCKET GCS_PRIVATE_BUCKET ENV PRIZE_CONTACT_EMAIL BOOK_SEARCH_ENABLED GEMINI_FREE_ENABLED GEMINI_FREE_ALLOW_PERSONAL; do
  if [ -n "${!var:-}" ]; then
    EXTRA_ENV="${EXTRA_ENV},${var}=${!var}"
  fi
done

# ── 2. Deploy (buildpacks via --source; Dockerfile in repo root is used
#       automatically when present). --update-env-vars for the same reason as
#       --update-secrets above: --set-env-vars would wipe every variable this
#       run doesn't mention, such as the audio bucket settings. ──────────────
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
  --update-env-vars="ANALYZER=vidyut,LOG_LEVEL=INFO,DEV_LOGIN_ENABLED=false${AUDIO_ENV}${EXTRA_ENV}" \
  "${SECRET_FLAGS[@]}"

# ── 3. Verify ────────────────────────────────────────────────────────────
URL=$(gcloud run services describe "$SERVICE" --project="$PROJECT_ID" --region="$REGION" --format='value(status.url)')
echo ""
echo "Deployed: $URL"
echo "Health:   $URL/health"
if ! curl --fail --silent --show-error --max-time 30 "$URL/health"; then
  echo "HEALTH CHECK FAILED — check logs: gcloud run services logs read $SERVICE --region $REGION" >&2
  exit 1
fi
echo ""
echo "HEALTH OK"

# ── 4. Daily content: Cloud Scheduler calls the tick every half hour ──────
#       The tick is a job, not a request path. A call with nothing to do costs
#       two small queries; a call with work to do stops opening pages after
#       75 seconds, inside the 120s request limit above. The admin token is
#       stored in the job as a header, so anyone who can view Scheduler jobs
#       in this project can read it. Skipped, with a line saying so, when
#       ADMIN_TOKEN is not in this run's environment or Scheduler is not
#       enabled; nothing else in the deploy depends on it.
TICK_JOB="sanskritam-content-tick"
if [ -z "${ADMIN_TOKEN:-}" ]; then
  echo "Daily content: ADMIN_TOKEN is not set in this run, so the scheduler job was left as it is."
else
  if gcloud scheduler jobs describe "$TICK_JOB" --project="$PROJECT_ID" --location="$REGION" >/dev/null 2>&1; then
    TICK_VERB=(update http "$TICK_JOB" --update-headers="X-Admin-Token=${ADMIN_TOKEN}")
  else
    TICK_VERB=(create http "$TICK_JOB" --headers="X-Admin-Token=${ADMIN_TOKEN}")
  fi
  if gcloud scheduler jobs "${TICK_VERB[@]}"       --project="$PROJECT_ID"       --location="$REGION"       --schedule="*/30 * * * *"       --time-zone="Etc/UTC"       --uri="${URL}/admin/content/tick"       --http-method=POST       --attempt-deadline=150s >/dev/null; then
    echo "Daily content: scheduler job $TICK_JOB calls $URL/admin/content/tick every 30 minutes."
  else
    echo "Daily content: could not set up the scheduler job. Enable it once with:"
    echo "  gcloud services enable cloudscheduler.googleapis.com --project=$PROJECT_ID"
    echo "then run this script again. Until then no new daily cards are made."
  fi
fi

# ── 5. Competitions: tick every 15 minutes (open, close, publish, monthly, purge).
COMP_TICK_JOB="sanskritam-competition-tick"
if [ -z "${ADMIN_TOKEN:-}" ]; then
  echo "Competitions: ADMIN_TOKEN is not set in this run, so the scheduler job was left as it is."
else
  if gcloud scheduler jobs describe "$COMP_TICK_JOB" --project="$PROJECT_ID" --location="$REGION" >/dev/null 2>&1; then
    COMP_VERB=(update http "$COMP_TICK_JOB" --update-headers="X-Admin-Token=${ADMIN_TOKEN}")
  else
    COMP_VERB=(create http "$COMP_TICK_JOB" --headers="X-Admin-Token=${ADMIN_TOKEN}")
  fi
  if gcloud scheduler jobs "${COMP_VERB[@]}"       --project="$PROJECT_ID"       --location="$REGION"       --schedule="*/15 * * * *"       --time-zone="Etc/UTC"       --uri="${URL}/admin/competitions/tick"       --http-method=POST       --attempt-deadline=150s >/dev/null; then
    echo "Competitions: scheduler job $COMP_TICK_JOB calls $URL/admin/competitions/tick every 15 minutes."
  else
    echo "Competitions: could not set up the scheduler job."
  fi
fi
