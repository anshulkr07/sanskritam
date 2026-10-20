# Cloud Run deployment

Run from the repository checkout:

```bash
bash deploy/gcp/deploy.sh
```

Normal deployments resolve `DATABASE_URL` from the last ready Cloud Run
revision's Secret Manager reference. They ignore the local `DATABASE_URL`,
test the selected database credentials before any cloud writes, and keep the
database secret pinned to that numeric version. They do not create a database
secret version. This prevents a stale Cloud Shell `.env.deploy` from replacing
working database credentials. Other configured secrets reuse their latest enabled
version when the value matches, and create a new version only when it changes.

For the first deployment, or after deliberately changing the database password,
set the new `DATABASE_URL` in the local `.env.deploy` and run:

```bash
bash deploy/gcp/deploy.sh --rotate-database-url
```

Rotation tests the new connection with `SELECT 1` before uploading anything.
If it succeeds, the script syncs the database secret (reusing an identical value)
and pins the new revision to that version. Failed validation aborts without changing cloud secrets.
The deployment also fails if the HTTP health check fails.

Preflight also checks that this checkout recognizes the database's Alembic
revision. A stale source upload missing an already-applied migration would
otherwise build successfully but crash before opening the HTTP port. Copy the
complete current `backend/migrations` directory before retrying; do not reset or
stamp the database to hide a missing migration. After moving Supabase projects,
use `--rotate-database-url` to select the new pool connection in `.env.deploy`.

Copy the complete repository changes to Cloud Shell before deploying, including
`database_secret_binding.py`, `check_database.py` and `sync_secret.py` beside this script. The
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
