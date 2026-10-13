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
working database credentials. Other configured secrets retain their existing
upload behavior and are pinned to the versions created by that deployment.

For the first deployment, or after deliberately changing the database password,
set the new `DATABASE_URL` in the local `.env.deploy` and run:

```bash
bash deploy/gcp/deploy.sh --rotate-database-url
```

Rotation tests the new connection with `SELECT 1` before uploading anything.
If it succeeds, the script creates a new database secret version and pins the
new revision to it. Failed validation aborts without changing cloud secrets.
The deployment also fails if the HTTP health check fails.

Copy the complete repository changes to Cloud Shell before deploying, including
`database_secret_binding.py` and `check_database.py` beside this script. The
working database password no longer needs to be copied into Cloud Shell for
normal deployments. Read access to the service, revision and database secret
is required. If psycopg is unavailable, the script installs it in a temporary
isolated Python environment.

Run the deployment tests without production credentials:

```bash
python -m unittest discover -s deploy/gcp -p 'test_*.py'
bash -n deploy/gcp/deploy.sh
```
