"""Prune this app's secret history without reading secret values.

Dry run by default. Keep all traffic/tagged revisions and the three most recent
ready revisions, the two latest enabled versions, aliases, and seven days of
new versions. Older revisions outside this rollback window may stop working.
Run without concurrent deployments or secret rotations.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
import json
import shutil
import subprocess
import time
from urllib.error import HTTPError
from urllib.request import Request, urlopen

MANAGED = {
    "admin-token", "apple-client-id", "apple-key-id", "apple-private-key",
    "apple-team-id", "apple-token-key", "gemini-api-keys", "google-client-id",
    "openrouter-api-key", "sarvam-api-key", "shabd-database-url",
    "stream-api-key", "stream-api-secret", "vertex-credentials",
}


def candidates(versions, protected, now):
    active = [v for v in versions if v["state"] in ("ENABLED", "DISABLED")]
    enabled = sorted((v for v in active if v["state"] == "ENABLED"),
                     key=lambda v: int(v["name"].rsplit("/", 1)[-1]), reverse=True)
    keep = set(protected) | {v["name"].rsplit("/", 1)[-1] for v in enabled[:2]}
    cutoff = now - timedelta(days=7)
    return [v["name"].rsplit("/", 1)[-1] for v in active
            if v["name"].rsplit("/", 1)[-1] not in keep
            and datetime.fromisoformat(v["createTime"].replace("Z", "+00:00")) < cutoff]


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("project")
    p.add_argument("region")
    p.add_argument("service")
    p.add_argument("--apply", action="store_true")
    args = p.parse_args()

    def cloud(*cmd):
        result = subprocess.run([shutil.which("gcloud") or "gcloud", *cmd,
                                 f"--project={args.project}", "--format=json", "--quiet"],
                                capture_output=True, text=True, timeout=180)
        if result.returncode:
            raise RuntimeError(f"Cloud operation failed: {' '.join(cmd[:3])}; cleanup stopped")
        return json.loads(result.stdout or "null")

    def service():
        return cloud("run", "services", "describe", args.service, f"--region={args.region}")

    current = service()
    traffic = current["status"]["traffic"]
    revisions = cloud("run", "revisions", "list", f"--service={args.service}",
                      f"--region={args.region}", "--sort-by=~metadata.creationTimestamp")
    ready = [r for r in revisions if any(c["type"] == "Ready" and c["status"] == "True"
                                         for c in r.get("status", {}).get("conditions", []))]
    retained = {r["metadata"]["name"] for r in ready[:3]}
    retained |= {t["revisionName"] for t in traffic if t.get("percent", 0) or t.get("tag")}
    protected = {s: set() for s in MANAGED}
    for name in retained:
        rev = cloud("run", "revisions", "describe", name, f"--region={args.region}")
        refs = [e["valueFrom"]["secretKeyRef"] for c in rev["spec"]["containers"]
                for e in c.get("env", []) if "secretKeyRef" in e.get("valueFrom", {})]
        for volume in rev["spec"].get("volumes", []):
            if "secret" in volume:
                secret = volume["secret"]
                refs += [{"name": secret["secretName"], "key": i["key"]}
                         for i in secret.get("items", [])]
                if not secret.get("items"):
                    raise RuntimeError("Unversioned secret volume: cleanup stopped")
        for ref in refs:
            name, version = ref["name"], str(ref["key"])
            if name in protected:
                # Resolve aliases from metadata below; never assume latest is pinned.
                protected[name].add(version)

    def plan_secret(name):
        meta = cloud("secrets", "describe", name)
        aliases = {str(v) for v in meta.get("versionAliases", {}).values()}
        versions = cloud("secrets", "versions", "list", name)
        pins = protected[name] | aliases
        if any(not v.isdecimal() and v != "latest" for v in protected[name]):
            unresolved = protected[name] - set(meta.get("versionAliases", {})) - {"latest"}
            if any(not v.isdecimal() for v in unresolved):
                raise RuntimeError("Unresolved secret alias: cleanup stopped")
        remove = candidates(versions, pins, datetime.now(timezone.utc))
        active = sum(v["state"] in ("ENABLED", "DISABLED") for v in versions)
        return name, {"active": active, "keep": active - len(remove), "destroy": remove}

    with ThreadPoolExecutor(max_workers=4) as pool:
        # Optional secrets (Apple revocation, Stream) may not exist until they
        # are configured; an absent one has nothing to prune and must not stop
        # cleanup for the rest. Listing also avoids treating a permission error
        # as an empty secret.
        existing = {item["name"].rsplit("/", 1)[-1]
                    for item in cloud("secrets", "list") or []}
        plan = dict(pool.map(plan_secret, sorted(MANAGED & existing)))
    print(json.dumps({
        "retained_revisions": sorted(retained),
        "missing_secrets": sorted(MANAGED - existing),
        "secrets": plan,
    }, indent=2), flush=True)
    if not args.apply:
        return
    if service()["status"]["traffic"] != traffic:
        raise RuntimeError("Traffic changed while planning; cleanup stopped")
    work = [(s, v) for s, details in plan.items() for v in details["destroy"]]

    # One credential refresh for the batch; never log or persist the token.
    auth = subprocess.run([shutil.which("gcloud") or "gcloud", "auth", "print-access-token"],
                          capture_output=True, text=True, timeout=120)
    if auth.returncode or not auth.stdout.strip():
        raise RuntimeError("Could not authenticate cleanup; no further versions destroyed")
    token = auth.stdout.strip()

    def destroy(item):
        secret, version = item
        url = (f"https://secretmanager.googleapis.com/v1/projects/{args.project}"
               f"/secrets/{secret}/versions/{version}:destroy")
        for attempt in range(5):
            request = Request(url, data=b"{}", method="POST", headers={
                "Authorization": f"Bearer {token}", "Content-Type": "application/json"})
            try:
                with urlopen(request, timeout=60) as response:
                    state = json.load(response).get("state")
                if state != "DESTROYED":
                    raise RuntimeError("Version destruction not confirmed")
                return
            except HTTPError as error:
                if error.code not in (429, 500, 502, 503, 504) or attempt == 4:
                    raise RuntimeError(f"Cleanup failed for {secret}/{version}: HTTP {error.code}") from None
                time.sleep(2 ** attempt)

    with ThreadPoolExecutor(max_workers=6) as pool:
        list(pool.map(destroy, work))
    print(f"Destroyed {len(work)} obsolete versions; preserved {sum(d['keep'] for d in plan.values())}.")


if __name__ == "__main__":
    main()
