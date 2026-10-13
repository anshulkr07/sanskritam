"""Exercise deployment control flow with fake cloud and network commands."""

import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


BASH = shutil.which("bash")
if os.name == "nt":
    candidate = Path("C:/Program Files/Git/bin/bash.exe")
    BASH = str(candidate) if candidate.exists() else None


@unittest.skipUnless(BASH, "Bash required for deployment integration checks")
class DeployFlowTests(unittest.TestCase):
    def run_deploy(self, database_url, *args):
        with tempfile.TemporaryDirectory(prefix="deploy-flow-") as directory:
            root = Path(directory)
            (root / "Dockerfile").touch()
            target = root / "deploy/gcp"
            target.mkdir(parents=True)
            shutil.copyfile(Path(__file__).with_name("deploy.sh"), target / "deploy.sh")
            # Stub Python to isolate Bash control flow from DB/network tests.
            stubs = {
                "python3": '''#!/bin/bash
case "$1" in
  -c) exit 0 ;;
  *database_secret_binding.py) echo 'shabd-database-url:51' ;;
  *check_database.py)
    if [ "$DATABASE_URL" != 'postgresql://user:good@db/app' ]; then
      echo 'Database preflight FAILED. No secrets uploaded.' >&2
      exit 1
    fi
    echo "$DATABASE_URL" ;;
  *) exit 99 ;;
esac
''',
                "gcloud": '''#!/bin/bash
printf '%s\\n' "$*" >> "$PWD/cloud-calls.log"
case "$*" in
  'secrets versions access '*) echo 'postgresql://user:good@db/app' ;;
  'secrets versions add '*) cat >/dev/null; echo 'projects/p/secrets/s/versions/52' ;;
  'projects describe '*) echo '123' ;;
  'run services describe '*) echo 'https://test.invalid' ;;
esac
''',
                "curl": '#!/bin/bash\necho \'{"status":"ok"}\'\n',
            }
            binary = root / "bin"
            binary.mkdir()
            for name, content in stubs.items():
                path = binary / name
                path.write_text(content, encoding="utf-8", newline="\n")
                path.chmod(0o755)
            (root / ".env.deploy").write_text(
                f"PROJECT_ID=test-project\nDATABASE_URL={database_url}\n",
                encoding="utf-8", newline="\n",
            )
            env = os.environ.copy()
            # Prevent any developer's exported settings reaching the test.
            for key in ("SARVAM_API_KEY", "OPENROUTER_API_KEY", "ADMIN_TOKEN",
                        "GOOGLE_CLIENT_ID", "APPLE_CLIENT_ID", "GEMINI_API_KEYS",
                        "GCS_AUDIO_BUCKET", "AUDIO_STORAGE", "ENV_FILE"):
                env.pop(key, None)
            env["VERTEX_CREDENTIALS_FILE"] = "missing-test-credentials.json"
            command = 'export PATH="$PWD/bin:$PATH"; bash deploy/gcp/deploy.sh "$@"'
            result = subprocess.run([BASH, "-c", command, "deploy-test", *args],
                                    cwd=root, env=env, capture_output=True, text=True)
            log = root / "cloud-calls.log"
            return result, log.read_text() if log.exists() else ""

    def test_normal_deploy_ignores_bad_local_password_and_never_uploads_db_secret(self):
        result, calls = self.run_deploy("postgresql://user:bad@db/app")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("--update-secrets=DATABASE_URL=shabd-database-url:51", calls)
        self.assertNotIn("secrets versions add", calls)
        self.assertNotIn("secrets create", calls)
        self.assertNotIn("bad", calls)

    def test_bad_explicit_rotation_aborts_before_cloud_writes(self):
        result, calls = self.run_deploy("postgresql://user:bad@db/app", "--rotate-database-url")
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(calls, "")

    def test_valid_rotation_uploads_and_pins_new_version(self):
        result, calls = self.run_deploy("postgresql://user:good@db/app", "--rotate-database-url")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("secrets versions add shabd-database-url", calls)
        self.assertIn("--update-secrets=DATABASE_URL=shabd-database-url:52", calls)


if __name__ == "__main__":
    unittest.main()
