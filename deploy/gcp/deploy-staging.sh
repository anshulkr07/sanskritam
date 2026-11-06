#!/usr/bin/env bash
# Sanskritam — staging: Cloud Run service "shabd-api-staging" (2026-11-06).
#
# Staging is production's exact image, settings, secrets and database, with
# purchases, plans and test ads switched on (deploy/gcp/staging_spec.py). Only
# the internal-testing app build points at it.
#
# Order matters: the backend upgrades its database at start, and both services
# share production's database. Deploy production first (deploy.sh, features
# off); this script then copies production's CURRENT image, so the two always
# run the same code and the same database version.
#
# Low cost: no build of its own (it reuses production's image), scale to zero,
# three instances at most, no scheduler jobs (production runs them), lower AI caps.
#
# Usage, from the repo root:
#   CLOUDSDK_CORE_DISABLE_PROMPTS=1 PROJECT_ID=gen-lang-client-0232760726 bash deploy/gcp/deploy-staging.sh
# Optional: PLAY_SERVICE_ACCOUNT_FILE (default mobile/service-account-key.json),
# the Google Cloud key Play Console lets verify purchases.

set -euo pipefail

REGION="asia-south1"
PROD="shabd-api"
STAGING="shabd-api-staging"
PROJECT_ID="${PROJECT_ID:?Set PROJECT_ID=gen-lang-client-0232760726 (the local gcloud default is a different project)}"

if [ -f "Dockerfile" ]; then :; elif [ -f "$(dirname "$0")/../../Dockerfile" ]; then cd "$(dirname "$0")/../.."; fi

# Staging's own secrets: a signing key made once, and the Play key.
if ! gcloud secrets describe shabd-staging-signing-key --project="$PROJECT_ID" >/dev/null 2>&1; then
  python3 -c 'import secrets; print(secrets.token_urlsafe(48), end="")' | python3 deploy/gcp/sync_secret.py "$PROJECT_ID" shabd-staging-signing-key >/dev/null
fi
PLAY_FILE="${PLAY_SERVICE_ACCOUNT_FILE:-mobile/service-account-key.json}"
[ -f "$PLAY_FILE" ] || { echo "Missing $PLAY_FILE: staging needs a Play service-account key to verify purchases." >&2; exit 1; }
python3 deploy/gcp/sync_secret.py "$PROJECT_ID" shabd-staging-play-account --file "$PLAY_FILE" >/dev/null

# Staging's owner admin key: STAGING_ADMIN_TOKEN in the gitignored
# .env.deploy. Only its SHA-256 goes into staging's settings.
STAGING_ADMIN_TOKEN=$(sed -n 's/\r$//; s/^STAGING_ADMIN_TOKEN=//p' "${ENV_FILE:-.env.deploy}" 2>/dev/null | tail -1)
if [ -n "$STAGING_ADMIN_TOKEN" ]; then
  export STAGING_ADMIN_SHA=$(printf '%s' "$STAGING_ADMIN_TOKEN" | sha256sum | cut -d' ' -f1)
fi

# Production's description holds plain settings: keep it in a private temp dir.
WORK=$(mktemp -d)
trap 'rm -rf -- "$WORK"' EXIT
gcloud run services describe "$PROD" --project="$PROJECT_ID" --region="$REGION" --format=json > "$WORK/prod.json"
python3 deploy/gcp/staging_spec.py < "$WORK/prod.json" > "$WORK/staging.yaml"
rm -f "$WORK/prod.json"
gcloud run services replace "$WORK/staging.yaml" --project="$PROJECT_ID" --region="$REGION" >/dev/null
gcloud run services add-iam-policy-binding "$STAGING" --project="$PROJECT_ID" --region="$REGION" \
  --member=allUsers --role=roles/run.invoker >/dev/null

URL=$(gcloud run services describe "$STAGING" --project="$PROJECT_ID" --region="$REGION" --format='value(status.url)')
echo "Staging: $URL"
curl --fail --silent --show-error --max-time 120 "$URL/health" && echo && echo "HEALTH OK"
