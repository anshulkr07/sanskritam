"""Turn production's Cloud Run service description into staging's (2026-11-06).

Reads `gcloud run services describe shabd-api --format=json` on stdin and
writes a service definition for `gcloud run services replace` on stdout:
the same image, settings, secrets and database as production, with

- the name shabd-api-staging and its own revisions;
- purchases, plans and test ads switched on;
- lower shared AI caps;
- staging's own signing key and Play service-account key;
- scale to zero (idle costs nothing), at most three instances. With one,
  Cloud Run once took ten minutes to start a replacement after an idle
  shutdown and refused the app's requests meanwhile (2026-11-06).

Production's description includes plain environment values, so the caller
keeps both files out of logs and deletes them afterwards.
"""
import json
import os
import sys

STAGING = "shabd-api-staging"
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


def staging(service):
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
    env = [e for e in container.get("env", []) if e["name"] not in FLAGS and e["name"] != "COMMERCE_SIGNING_KEY"]
    env += [{"name": k, "value": v} for k, v in FLAGS.items()]
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
    json.dump(staging(json.load(sys.stdin)), sys.stdout, indent=1)
