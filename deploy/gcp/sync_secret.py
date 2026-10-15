"""Return a concrete Secret Manager version, adding one only for changed bytes.

Values come through stdin or --file, never command-line arguments or logs.
Only enabled versions are candidates for reuse. Read/permission failures abort
instead of being treated as an empty or changed secret.
"""

import argparse
from pathlib import Path
import shutil
import subprocess
import sys


def sync_secret(project: str, secret: str, value: bytes, run=subprocess.run) -> str:
    def gcloud(*args, data=None):
        return run(
            [shutil.which("gcloud") or "gcloud", "secrets", *args, f"--project={project}"],
            input=data, capture_output=True, timeout=120,
        )

    def checked(result, action):
        if result.returncode:
            raise RuntimeError(f"Could not {action} secret {secret}; deployment stopped.")
        return result.stdout

    exists = gcloud("describe", secret, "--format=value(name)")
    if exists.returncode:
        if b"NOT_FOUND" not in exists.stderr:
            checked(exists, "describe")
        checked(gcloud("create", secret), "create")
        version_path = b""
    else:
        version_path = checked(gcloud(
            "versions", "list", secret, "--filter=state=ENABLED",
            "--sort-by=~createTime", "--limit=1", "--format=value(name)",
        ), "list versions of").strip()

    if version_path:
        version = version_path.decode("utf-8").rsplit("/", 1)[-1]
        if not version.isdecimal():
            raise RuntimeError(f"Invalid version returned for secret {secret}.")
        current = checked(gcloud(
            "versions", "access", version, f"--secret={secret}",
        ), "read")
        if current == value:
            return version

    created = checked(gcloud(
        "versions", "add", secret, "--data-file=-", "--format=value(name)", data=value,
    ), "add a version of").decode("utf-8").strip().rsplit("/", 1)[-1]
    if not created.isdecimal():
        raise RuntimeError(f"No numeric version returned for secret {secret}.")
    return created


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("project")
    parser.add_argument("secret")
    parser.add_argument("--file", type=Path)
    args = parser.parse_args()
    try:
        value = args.file.read_bytes() if args.file else sys.stdin.buffer.read()
        if not value:
            raise RuntimeError("Refusing to upload an empty secret.")
        print(sync_secret(args.project, args.secret, value))
    except Exception as error:
        # Never print provider output or file contents.
        if isinstance(error, RuntimeError):
            print(str(error), file=sys.stderr)
        else:
            print("Secret synchronization failed; deployment stopped.", file=sys.stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
