"""Turn production's Cloud Run service description into staging's (2026-11-06).

Reads `gcloud run services describe shabd-api --format=json` on stdin and
writes a service definition for `gcloud run services replace` on stdout:
the same image, settings, secrets and database as production, with

- the name shabd-api-staging and its own revisions;
- purchases, plans and test ads switched on;
- lower shared AI caps;
- staging's own signing key and Play service-account key;
- the same database via Supabase's transaction pooler;
- scale to zero (idle costs nothing), at most three instances. With one,
  Cloud Run once took ten minutes to start a replacement after an idle
  shutdown and refused the app's requests meanwhile (2026-11-06).

Production's description includes plain environment values, so the caller
keeps both files out of logs and deletes them afterwards.
"""
import json
import os
import shutil
import subprocess
import sys
from urllib.parse import urlsplit

from sync_secret import sync_secret

STAGING = "shabd-api-staging"
DATABASE_SECRET = "shabd-staging-database-url"
FLAGS = {
    "COMMERCE_ENABLED": "true",
    "COMMERCE_HYBRID_ENABLED": "true",
    "COMMERCE_SALES_ENABLED": "true",
    "COMMERCE_ADS_ENABLED": "true",
    "COMMERCE_STORE_ENVIRONMENT": "Sandbox",
    "COMMERCE_GOOGLE_CREDENTIALS_PATH": "/secrets/play/play.json",
    "QUOTA_DAILY_BUDGET_INR": "100",
    "GEMINI_DAILY_BUDGET_USD": "0.5",
}
KEEP_ANNOTATIONS = {"run.googleapis.com/ingress", "run.googleapis.com/launch-stage"}


def transaction_pooler_url(url: str) -> str:
    parsed = urlsplit(url.strip())
    if (parsed.scheme not in {"postgres", "postgresql"}
            or not (parsed.hostname or "").endswith(".pooler.supabase.com")
            or parsed.port not in {5432, 6543}):
        raise ValueError("Expected a Supabase shared-pooler database URL.")
    authority = parsed.netloc.rsplit(":", 1)[0]
    return parsed._replace(netloc=f"{authority}:6543").geturl()


def staging_database_version(service, project):
    env = service["spec"]["template"]["spec"]["containers"][0]["env"]
    ref = next(item["valueFrom"]["secretKeyRef"] for item in env if item["name"] == "DATABASE_URL")
    source = subprocess.run(
        [shutil.which("gcloud") or "gcloud", "secrets", "versions", "access", ref["key"],
         f"--secret={ref['name']}", f"--project={project}"],
        capture_output=True, check=True, timeout=120,
    )
    url = transaction_pooler_url(source.stdout.decode("utf-8"))
    return sync_secret(project, DATABASE_SECRET, url.encode("utf-8"))


def staging(service, database_version):
    meta = service["metadata"]
    out = {
        "apiVersion": service["apiVersion"],
        "kind": service["kind"],
        "metadata": {
            "name": STAGING,
            "namespace": meta.get("namespace"),
            "labels": {k: v for k, v in (meta.get("labels") or {}).items() if k == "cloud.googleapis.com/location"},
            "annotations": {k: v for k, v in (meta.get("annotations") or {}).items() if k in KEEP_ANNOTATIONS},
        },
        "spec": {"template": service["spec"]["template"], "traffic": [{"latestRevision": True, "percent": 100}]},
    }
    template = out["spec"]["template"]
    template_meta = template.setdefault("metadata", {})
    template_meta.pop("name", None)  # revision names must start with the new service's name
    annotations = template_meta.setdefault("annotations", {})
    annotations.pop("autoscaling.knative.dev/minScale", None)
    annotations["autoscaling.knative.dev/maxScale"] = "3"
    template_meta["labels"] = {}

    container = template["spec"]["containers"][0]
    staging_env_names = FLAGS.keys() | {"COMMERCE_SIGNING_KEY", "DATABASE_URL"}
    env = [e for e in container.get("env", []) if e["name"] not in staging_env_names]
    env += [{"name": k, "value": v} for k, v in FLAGS.items()]
    env.append({"name": "DATABASE_URL",
                "valueFrom": {"secretKeyRef": {"name": DATABASE_SECRET, "key": database_version}}})
    # Staging's own owner key (its SHA-256, from deploy-staging.sh): marks books
    # paid and sets commerce settings such as media_origins, without
    # production's admin token. The database is shared, so its writes are real.
    if os.environ.get("STAGING_ADMIN_SHA"):
        env = [e for e in env if e["name"] != "COMMERCE_ADMIN_KEYS_JSON"]
        env.append({"name": "COMMERCE_ADMIN_KEYS_JSON", "value": json.dumps({os.environ["STAGING_ADMIN_SHA"]: "owner"})})
    env.append({"name": "COMMERCE_SIGNING_KEY",
                "valueFrom": {"secretKeyRef": {"name": "shabd-staging-signing-key", "key": "latest"}}})
    container["env"] = env
    mounts = [m for m in container.get("volumeMounts", []) if m.get("name") != "play"]
    container["volumeMounts"] = mounts + [{"name": "play", "mountPath": "/secrets/play"}]
    volumes = [v for v in template["spec"].get("volumes", []) if v.get("name") != "play"]
    template["spec"]["volumes"] = volumes + [{
        "name": "play", "secret": {"secretName": "shabd-staging-play-account", "items": [{"key": "latest", "path": "play.json"}]}}]
    return out


if __name__ == "__main__":
    service = json.load(sys.stdin)
    try:
        database_version = staging_database_version(service, sys.argv[1])
    except Exception:
        sys.exit("Could not configure staging's transaction-pooler database secret.")
    json.dump(staging(service, database_version), sys.stdout, indent=1)
