"""Find the database secret used by the last ready Cloud Run revision."""

import json
import shutil
import subprocess
import sys


def ready_database_binding(project: str, region: str, service: str, run=subprocess.run) -> str:
    def gcloud(*args):
        result = run([shutil.which("gcloud") or "gcloud", *args, f"--project={project}"], capture_output=True, text=True)
        if result.returncode:
            raise RuntimeError("Could not read the existing Cloud Run configuration.")
        return result.stdout.strip()

    revision = gcloud("run", "services", "describe", service, f"--region={region}",
                      "--format=value(status.latestReadyRevisionName)")
    if not revision:
        raise RuntimeError("No ready revision exists.")
    config = json.loads(gcloud("run", "revisions", "describe", revision,
                              f"--region={region}", "--format=json"))
    for container in config["spec"]["containers"]:
        for item in container.get("env", []):
            if item["name"] != "DATABASE_URL":
                continue
            ref = item.get("valueFrom", {}).get("secretKeyRef", {})
            secret, version = ref.get("name", ""), ref.get("key", "")
            if secret != "shabd-database-url":
                raise RuntimeError("Expected DATABASE_URL to reference shabd-database-url.")
            if version == "latest":
                # Upgrade legacy mounts to a concrete version; preflight still
                # tests this version before the deploy can change anything.
                version = gcloud("secrets", "versions", "describe", "latest",
                                 f"--secret={secret}", "--format=value(name)").rsplit("/", 1)[-1]
            if not version.isdecimal():
                raise RuntimeError("Database secret version is not numeric.")
            return f"{secret}:{version}"
    raise RuntimeError("Ready revision has no database secret mount.")


if __name__ == "__main__":
    try:
        print(ready_database_binding(*sys.argv[1:]))
    except Exception:
        print("Cannot resolve the database secret from the last ready revision. "
              "Check Cloud Run access/configuration. For first deployment or deliberate "
              "credential rotation, use --rotate-database-url with a valid local DATABASE_URL.",
              file=sys.stderr)
        raise SystemExit(1)
