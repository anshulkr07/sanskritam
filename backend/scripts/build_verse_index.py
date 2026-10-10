"""Build or refresh the vectors behind Ask's book search (services/book_search.py).

Embeds every verse whose text changed since it was last embedded, or that
has no vector yet, with the model and size in settings (BOOK_SEARCH_EMBED_MODEL,
BOOK_SEARCH_DIMS), through Vertex AI with the service account. Verses with
an unchanged text are left alone, so running it again after an import costs
only the new verses.

    .venv/Scripts/python.exe scripts/build_verse_index.py --dry-run
    .venv/Scripts/python.exe scripts/build_verse_index.py
    .venv/Scripts/python.exe scripts/build_verse_index.py --model text-multilingual-embedding-002

It writes to whatever database the settings point at (DB_PATH or
DATABASE_URL). The table comes from the Alembic migration b9c0d1e2f3a4.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.evals.cli_env import force_utf8_stdio, load_dotenv  # noqa: E402

force_utf8_stdio()
load_dotenv()

import httpx  # noqa: E402
from sqlalchemy import inspect  # noqa: E402

from app.config import settings  # noqa: E402
from app.db import SessionLocal, engine  # noqa: E402
from app.models import VerseVector  # noqa: E402
from app.services import book_search as bs  # noqa: E402


async def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--model", default=settings.book_search_embed_model)
    ap.add_argument("--dims", type=int, default=settings.book_search_dims)
    ap.add_argument("--batch", type=int, default=16, help="verses per request")
    ap.add_argument("--concurrency", type=int, default=4)
    ap.add_argument("--limit", type=int, default=0, help="embed at most this many (0 = all)")
    ap.add_argument("--dry-run", action="store_true", help="count what would be embedded, call nothing")
    ap.add_argument("--report", default="", help="write a JSON summary (tokens, characters, timing) here")
    args = ap.parse_args()

    if "verse_vectors" not in inspect(engine).get_table_names():
        print("verse_vectors is missing: run the Alembic migrations first (alembic upgrade head).")
        return 2

    db = SessionLocal()
    try:
        verses = bs.load_verses(db)
        have = {
            r.shloka_id: r.text_hash
            for r in db.query(VerseVector.shloka_id, VerseVector.text_hash)
            .filter(VerseVector.model == args.model, VerseVector.dims == args.dims).all()
        }
        todo = []
        for v in verses:
            text = bs.document_text(v)
            h = bs.text_hash(text)
            if have.get(v.shloka_id) != h:
                todo.append((v, text, h))
        if args.limit:
            todo = todo[: args.limit]
        print(f"{len(verses)} verses; {len(verses) - len(todo)} up to date; {len(todo)} to embed "
              f"with {args.model} at {args.dims} numbers ({sum(len(t) for _, t, _ in todo):,} characters).")
        if args.dry_run or not todo:
            return 0

        sem = asyncio.Semaphore(args.concurrency)
        totals = {"tokens": 0, "chars": 0, "requests": 0, "verses": 0, "failed": 0}
        started = time.perf_counter()

        async with httpx.AsyncClient(timeout=60) as client:
            async def one(chunk):
                async with sem:
                    for attempt in range(4):
                        try:
                            return chunk, await bs.embed([t for _, t, _ in chunk], "RETRIEVAL_DOCUMENT",
                                                         model=args.model, dims=args.dims, client=client,
                                                         timeout=60)
                        except Exception as exc:  # noqa: BLE001 — retried, then counted
                            if attempt == 3:
                                print(f"  batch failed: {str(exc)[:200]}")
                                return chunk, None
                            await asyncio.sleep(2 ** attempt * 2)

            chunks = [todo[i:i + args.batch] for i in range(0, len(todo), args.batch)]
            done = 0
            for coro in asyncio.as_completed([one(c) for c in chunks]):
                chunk, got = await coro
                totals["requests"] += 1
                if got is None:
                    totals["failed"] += len(chunk)
                    continue
                totals["tokens"] += got.tokens
                totals["chars"] += got.chars
                now = datetime.now(timezone.utc)
                for (v, _text, h), vec in zip(chunk, got.vectors):
                    raw = bs.unit(vec).astype("<f4").tobytes()
                    row = db.get(VerseVector, v.shloka_id)
                    if row is None:
                        row = VerseVector(shloka_id=v.shloka_id)
                        db.add(row)
                    row.model, row.dims, row.text_hash, row.vec, row.updated_at = args.model, args.dims, h, raw, now
                    totals["verses"] += 1
                db.commit()
                done += 1
                if done % 20 == 0:
                    print(f"  {totals['verses']} embedded, {totals['tokens']:,} tokens")
        totals["seconds"] = round(time.perf_counter() - started, 1)
        totals.update(model=args.model, dims=args.dims, location=settings.vertex_location,
                      at=datetime.now(timezone.utc).isoformat(timespec="seconds"))
        print(json.dumps(totals, indent=2))
        if args.report:
            Path(args.report).write_text(json.dumps(totals, indent=2), encoding="utf-8")
        return 1 if totals["failed"] else 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
