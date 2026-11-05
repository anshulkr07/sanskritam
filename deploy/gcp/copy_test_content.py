"""Copy books, verses, chants and daily cards from production into the TEST
database (2026-11-06). Never accounts, progress, purchases or messages: only
the tables in CONTENT below, which hold no personal data.

Reads production read-only. Writes only to TEST_DATABASE_URL from .env.test,
and refuses to run if that is production's database. Rows already in the test
database (the app seeds some at start) are kept; the rest are inserted.

Run after deploy-test.sh has started the test service once (it creates the
tables):
    PROJECT_ID=gen-lang-client-0232760726 python deploy/gcp/copy_test_content.py
"""
import os
import pathlib
import subprocess
import sys
import urllib.parse

from sqlalchemy import MetaData, create_engine, select
from sqlalchemy.dialects.postgresql import insert

CONTENT = ["canon_texts", "shlokas", "verse_audio", "daily_words", "fact_cards", "word_origins",
           "parva_pages", "parva_art", "content_sources"]


def env_file(path=".env.test"):
    values = {}
    for line in pathlib.Path(path).read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            key, value = line.split("=", 1)
            values[key.strip()] = value.strip()
    return values


def production_url(project):
    binding = subprocess.run([sys.executable, "deploy/gcp/database_secret_binding.py", project, "asia-south1", "shabd-api"],
                             capture_output=True, text=True, check=True).stdout.strip()
    name, version = binding.rsplit(":", 1)
    return subprocess.run(["gcloud", "secrets", "versions", "access", version, f"--secret={name}", f"--project={project}"],
                          capture_output=True, text=True, check=True, shell=os.name == "nt").stdout.strip()


def same_database(a, b):
    a, b = urllib.parse.urlparse(a), urllib.parse.urlparse(b)
    return (a.hostname, a.port, a.path, (a.username or "").split(".")[0]) == (b.hostname, b.port, b.path, (b.username or "").split(".")[0])


def engine(url):
    return create_engine(url.replace("postgresql://", "postgresql+psycopg://", 1), pool_pre_ping=True)


def main():
    project = os.environ.get("PROJECT_ID") or sys.exit("Set PROJECT_ID=gen-lang-client-0232760726")
    test_url = env_file().get("TEST_DATABASE_URL") or sys.exit("TEST_DATABASE_URL is missing from .env.test")
    prod_url = production_url(project)
    if same_database(prod_url, test_url):
        sys.exit("TEST_DATABASE_URL is production's database. Nothing copied.")
    source, target = engine(prod_url), engine(test_url)
    have, want = MetaData(), MetaData()
    have.reflect(source, only=CONTENT)
    want.reflect(target, only=CONTENT)
    with source.connect() as read, target.begin() as write:
        for name in CONTENT:
            columns = [c.name for c in want.tables[name].columns if c.name in have.tables[name].columns]
            rows = [dict(r._mapping) for r in read.execute(select(*[have.tables[name].c[c] for c in columns]))]
            for start in range(0, len(rows), 1000):
                write.execute(insert(want.tables[name]).values(rows[start:start + 1000]).on_conflict_do_nothing())
            print(f"{name}: {len(rows)} rows offered")


if __name__ == "__main__":
    main()
