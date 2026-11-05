#!/usr/bin/env bash
# Sanskritam — the TEST backend: Cloud Run service "shabd-api-test", with
# purchases, plans and test ads switched on, on its own database (2026-11-06).
#
# It never touches production:
#   - its own service (shabd-api-test), so shabd-api's revisions and traffic
#     are not changed;
#   - its own secrets, all named shabd-test-*; production's API-key secrets are
#     only mounted (read), never written;
#   - its own database: TEST_DATABASE_URL must differ from production's. The
#     app upgrades its database on every start, so pointing a newer test build
#     at production's database would break production's next restart.
#
# Needs a local .env.test (gitignored; see .env.test.example):
#   TEST_DATABASE_URL=postgresql://...     an EMPTY Postgres database
#   PLAY_SERVICE_ACCOUNT_FILE=mobile/service-account-key.json   (optional)
#       a Google Cloud service-account key with access to the Play Console
#       app, so the backend can verify test purchases.
#
# Usage, from the repo root:
#   CLOUDSDK_CORE_DISABLE_PROMPTS=1 PROJECT_ID=gen-lang-client-0232760726 bash deploy/gcp/deploy-test.sh
# Then once, to copy books, verses and chants (never accounts) from production:
#   python deploy/gcp/copy_test_content.py

set -euo pipefail

REGION="asia-south1"
SERVICE="shabd-api-test"
ENV_FILE="${ENV_FILE:-.env.test}"

if [ -f "Dockerfile" ]; then :; elif [ -f "$(dirname "$0")/../../Dockerfile" ]; then cd "$(dirname "$0")/../.."; fi
[ -f "$ENV_FILE" ] || { echo "Missing $ENV_FILE (copy .env.test.example)." >&2; exit 1; }
set -a; source <(sed 's/\r$//' "$ENV_FILE"); set +a

PROJECT_ID="${PROJECT_ID:?Set PROJECT_ID=gen-lang-client-0232760726 (the local gcloud default is a different project)}"
[ -n "${TEST_DATABASE_URL:-}" ] || { echo "TEST_DATABASE_URL is empty in $ENV_FILE." >&2; exit 1; }

# Refuse production's database (compared without printing either URL).
PROD_BINDING=$(python3 deploy/gcp/database_secret_binding.py "$PROJECT_ID" "$REGION" shabd-api)
PROD_URL=$(gcloud secrets versions access "${PROD_BINDING##*:}" --secret="${PROD_BINDING%:*}" --project="$PROJECT_ID")
if python3 - "$PROD_URL" "$TEST_DATABASE_URL" <<'PY'
import sys, urllib.parse as u
a, b = (u.urlparse(x) for x in sys.argv[1:3])
same = (a.hostname, a.port, a.path, (a.username or "").split(".")[0]) == (b.hostname, b.port, b.path, (b.username or "").split(".")[0])
sys.exit(0 if same else 1)
PY
then
  echo "TEST_DATABASE_URL points at production's database and login. Use a separate database." >&2
  exit 1
fi
unset PROD_URL

secret() {  # name value-or-file [file]
  if [ "${3:-}" = file ]; then
    python3 deploy/gcp/sync_secret.py "$PROJECT_ID" "$1" --file "$2"
  else
    printf '%s' "$2" | python3 deploy/gcp/sync_secret.py "$PROJECT_ID" "$1"
  fi
}

MOUNTS=("DATABASE_URL=shabd-test-database-url:$(secret shabd-test-database-url "$TEST_DATABASE_URL")")
# A signing key made once for the test service and reused afterwards.
if ! gcloud secrets describe shabd-test-signing-key --project="$PROJECT_ID" >/dev/null 2>&1; then
  secret shabd-test-signing-key "$(python3 -c 'import secrets; print(secrets.token_urlsafe(48))')" >/dev/null
fi
MOUNTS+=("COMMERCE_SIGNING_KEY=shabd-test-signing-key:latest")
# Production's API keys, mounted read-only when they exist.
for pair in SARVAM_API_KEY=sarvam-api-key OPENROUTER_API_KEY=openrouter-api-key GOOGLE_CLIENT_ID=google-client-id GEMINI_API_KEYS=gemini-api-keys; do
  if gcloud secrets describe "${pair#*=}" --project="$PROJECT_ID" >/dev/null 2>&1; then MOUNTS+=("${pair}:latest"); fi
done
PLAY_ENV=""
PLAY_FILE="${PLAY_SERVICE_ACCOUNT_FILE:-mobile/service-account-key.json}"
if [ -f "$PLAY_FILE" ]; then
  secret shabd-test-play-account "$PLAY_FILE" file >/dev/null
  MOUNTS+=("/secrets/play/play.json=shabd-test-play-account:latest")
  PLAY_ENV=",COMMERCE_GOOGLE_CREDENTIALS_PATH=/secrets/play/play.json"
else
  echo "No Play service-account file: test purchases cannot be verified until one is added."
fi

PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" >/dev/null 2>&1 || true

# Chant audio is served straight from R2 by URL; the test service only needs
# the public base URL, never production's R2 write keys.
R2_ENV=""
[ -n "${R2_BASE_URL:-}" ] && R2_ENV=",AUDIO_STORAGE=r2,R2_BASE_URL=${R2_BASE_URL}"

gcloud run deploy "$SERVICE" \
  --project="$PROJECT_ID" --region="$REGION" --source=. --port=8000 \
  --memory=2Gi --cpu=1 --min-instances=0 --max-instances=1 --timeout=660s \
  --allow-unauthenticated \
  --set-env-vars="ANALYZER=vidyut,LOG_LEVEL=INFO,DEV_LOGIN_ENABLED=false,TTS_SANSKRIT_CODE=sa-IN,ENV=production,COMMERCE_ENABLED=true,COMMERCE_HYBRID_ENABLED=true,COMMERCE_SALES_ENABLED=true,COMMERCE_ADS_ENABLED=true,COMMERCE_STORE_ENVIRONMENT=Sandbox,QUOTA_DAILY_BUDGET_INR=100,GEMINI_DAILY_BUDGET_USD=0.5${PLAY_ENV}${R2_ENV}" \
  --set-secrets="$(IFS=,; echo "${MOUNTS[*]}")"

URL=$(gcloud run services describe "$SERVICE" --project="$PROJECT_ID" --region="$REGION" --format='value(status.url)')
echo "Deployed: $URL"
curl --fail --silent --show-error --max-time 60 "$URL/health" && echo && echo "HEALTH OK"
