# Cloud Run deployment

Run from the repository checkout:

```bash
bash deploy/gcp/deploy.sh
```

Cloud Run scales to zero when idle (both service and revision minimums are zero).
This avoids paying to keep an unused instance warm; the first request after idle
can take longer while the application starts. CPU and memory remain 1 CPU / 2 GiB
for requests that need them.

The cloud source archive and Docker context allow only the Dockerfile, backend
application/migrations/configuration, and served frontend files. Local database
backups, environment files, credentials, mobile sources, and generated media are
not deployment input. Check the archive with `gcloud meta list-files-for-upload`
when changing these rules.

Normal deployments resolve `DATABASE_URL` from the last ready Cloud Run
revision's Secret Manager reference. They ignore the local `DATABASE_URL`,
test the selected database credentials before any cloud writes, and keep the
database secret pinned to that numeric version. They do not create a database
secret version. This prevents a stale Cloud Shell `.env.deploy` from replacing
working database credentials. Other configured secrets reuse their latest enabled
version when the value matches, and create a new version only when it changes.

After the new revision passes its health check, `retain_secrets.py` automatically
destroys obsolete versions of the ten app-managed secrets. It preserves references
from every revision receiving traffic or carrying a tag, the three newest ready
revisions, the two newest enabled versions of each secret, all alias targets, and
versions created in the last seven days. Older revisions outside this rollback
window may no longer work. Do not run deployments/rotations concurrently with
cleanup. Disabled versions still incur storage charges; only destruction removes
that charge. The helper uses metadata and never reads credential payloads.

Preview the retention plan without changing anything:

```bash
python deploy/gcp/retain_secrets.py PROJECT_ID asia-south1 shabd-api
```

Add `--apply` to execute that freshly calculated plan. Cloud read failures abort
cleanup, and traffic is checked again before any versions are destroyed.

For the first deployment, or after deliberately changing the database password,
set the new `DATABASE_URL` in the local `.env.deploy` and run:

```bash
bash deploy/gcp/deploy.sh --rotate-database-url
```

Rotation tests the new connection with `SELECT 1` before uploading anything.
If it succeeds, the script syncs the database secret (reusing an identical value)
and pins the new revision to that version. Failed validation aborts without changing cloud secrets.
The deployment also fails if the HTTP health check fails.
After building, it explicitly routes traffic to the newly created revision. This
avoids reporting a healthy previous revision as a successful release when the
service was pinned to a named revision or canary.

Preflight also checks that this checkout recognizes the database's Alembic
revision. A stale source upload missing an already-applied migration would
otherwise build successfully but crash before opening the HTTP port. Copy the
complete current `backend/migrations` directory before retrying; do not reset or
stamp the database to hide a missing migration. After moving Supabase projects,
use `--rotate-database-url` to select the new pool connection in `.env.deploy`.

Copy the complete repository changes to Cloud Shell before deploying, including
`database_secret_binding.py`, `check_database.py`, `sync_secret.py` and
`retain_secrets.py` beside this script. The
working database password no longer needs to be copied into Cloud Shell for
normal deployments. Read access to the service, revision and database secret
is required. The database check reuses the backend's Linux or Windows `.venv`
when psycopg and Alembic are installed there, including Windows Python invoked through WSL.
Otherwise it tries system Python, then installs both in a temporary isolated
environment. If that system cannot create virtual environments, install its
`python3-venv` package once, or restore the backend environment before retrying.

Run the deployment tests without production credentials:

```bash
python -m unittest discover -s deploy/gcp -p 'test_*.py'
bash -n deploy/gcp/deploy.sh
```
