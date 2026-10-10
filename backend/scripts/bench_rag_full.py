"""Book-search (RAG) comparison, 2026-10-09: the search alone, then the models.

Stage 1, ``retrieval``: every question of scripts/rag_bench_cases.py goes
through the real search (services/book_search.py) on whatever database the
settings point at, and what it found is frozen to a file. Run it once per
embedding index (each index lives in its own copy of the database):

    DB_PATH=<copy>.db DATABASE_URL= .venv/Scripts/python.exe scripts/bench_rag_full.py retrieval --label gemini
    DB_PATH=<copy2>.db DATABASE_URL= BOOK_SEARCH_EMBED_MODEL=text-multilingual-embedding-002 \\
        .venv/Scripts/python.exe scripts/bench_rag_full.py retrieval --label multi

``--lexical`` runs the reference and wording searches only (no embedding).

Nothing here writes to a database. Every paid call is appended to
``ledger.jsonl`` in the output folder with its tokens, so the report can
price each stage.
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
sys.path.insert(0, str(ROOT / "scripts"))

from app.evals.cli_env import force_utf8_stdio, load_dotenv  # noqa: E402

force_utf8_stdio()
load_dotenv()

from app.config import settings  # noqa: E402
from app.db import SessionLocal  # noqa: E402
from app.services import book_search as bs  # noqa: E402
from rag_bench_cases import CASES  # noqa: E402

OUT = ROOT / "results" / "rag_full_20261009"


def ledger(entry: dict) -> None:
    entry = {"at": datetime.now(timezone.utc).isoformat(timespec="seconds"), **entry}
    with open(OUT / "ledger.jsonl", "a", encoding="utf-8") as fh:
        fh.write(json.dumps(entry, ensure_ascii=False) + "\n")


def search_query(c: dict) -> str:
    """What the search is given: the question, after the previous question when
    the learner is following up (a follow-up alone often names nothing), and
    the screen text when the question points at the screen."""
    parts = []
    if c["history"]:
        parts.append(c["history"][-1][0])
    if c["screen_text"]:
        parts.append(c["screen_text"][:400])
    parts.append(c["question"])
    return "\n".join(parts)


def gold_found(c: dict, hits: list[dict]) -> dict:
    found = []
    first_rank = None
    for g in c["gold"]:
        rank = next((i + 1 for i, h in enumerate(hits)
                     if h["ref"] == g["ref"] and (not g.get("contains") or g["contains"] in h["sanskrit"])), None)
        found.append({"ref": g["ref"], "rank": rank})
        if rank and (first_rank is None or rank < first_rank):
            first_rank = rank
    n = sum(1 for f in found if f["rank"])
    if not c["gold"]:
        score = None
    elif c["gold_mode"] == "all":
        score = n / len(c["gold"])
    else:
        score = 1.0 if n else 0.0
    return {"found": found, "score": score, "first_rank": first_rank}


async def retrieval(args) -> None:
    db = SessionLocal()
    k = args.k
    model = settings.book_search_embed_model
    results = []

    async def no_vectors(_q):
        raise RuntimeError("lexical run: meaning search off")

    try:
        idx = bs.index_for(db)
        print(f"index: {len(idx.verses)} verses, {int(idx.has_vec.sum())} with {model} vectors")
        for c in CASES:
            q = search_query(c)
            r = await bs.search(db, q, k=k, embed_question=no_vectors if args.lexical else None)
            hits = [{"n": i + 1, "id": f"B{i + 1}", "shloka_id": h.verse.shloka_id, "ref": h.verse.ref,
                     "book": h.verse.book, "why": h.why, "similarity": round(h.similarity, 4),
                     "sanskrit": h.verse.devanagari[:300], "has_en": bool(h.verse.en)}
                    for i, h in enumerate(r.hits)]
            g = gold_found(c, hits)
            results.append({"id": c["id"], "query": q, "books_named": r.books_named,
                            "refs_asked": [list(x) for x in r.refs_asked], "hits": hits,
                            "block": bs.books_block(r.hits), "gold": g,
                            "embed_tokens": r.embed_tokens, "embed_chars": r.embed_chars,
                            "embed_ms": round(r.embed_ms), "search_ms": round(r.search_ms),
                            "error": "" if args.lexical else r.error})
            if not args.lexical and r.embed_tokens:
                ledger({"stage": "query_embedding", "model": model, "case": c["id"], "label": args.label,
                        "tokens_in": r.embed_tokens, "chars": r.embed_chars})
            mark = "-" if g["score"] is None else f"{g['score']:.2f}"
            print(f"{c['id']} gold {mark:>4} first@{g['first_rank']}  {[h['ref'] for h in hits][:6]}")
    finally:
        db.close()

    scored = [x for x in results if x["gold"]["score"] is not None]
    summary = {
        "label": args.label, "model": None if args.lexical else model, "lexical": args.lexical, "k": k,
        "cases": len(results), "with_gold": len(scored),
        "recall": round(sum(x["gold"]["score"] for x in scored) / len(scored), 3),
        "fully_found": sum(1 for x in scored if x["gold"]["score"] == 1.0),
        "none_found": sum(1 for x in scored if x["gold"]["score"] == 0.0),
        "mrr": round(sum(1 / x["gold"]["first_rank"] for x in scored if x["gold"]["first_rank"]) / len(scored), 3),
        "embed_tokens": sum(x["embed_tokens"] for x in results),
        "median_search_ms": sorted(x["search_ms"] for x in results)[len(results) // 2],
        "max_search_ms": max(x["search_ms"] for x in results),
        "errors": [x["id"] for x in results if x["error"]],
        "by_category": {},
    }
    for cat in sorted({x["id"][0] for x in scored}):
        xs = [x for x in scored if x["id"][0] == cat]
        summary["by_category"][cat] = round(sum(x["gold"]["score"] for x in xs) / len(xs), 3)
    (OUT / f"retrieval_{args.label}.json").write_text(
        json.dumps({"summary": summary, "results": results}, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(summary, indent=1))


def sheet(args) -> None:
    """The questions, keys and what the search found, as one page to review."""
    from rag_bench_cases import CATEGORIES, LANG

    runs = {}
    for label in ("gemini", "multi", "lexical"):
        f = OUT / f"retrieval_{label}.json"
        if f.exists():
            runs[label] = json.loads(f.read_text(encoding="utf-8"))
    found = {r["id"]: r for r in runs.get("gemini", {}).get("results", [])}
    L = ["# Book search test: 60 questions and answer keys", "",
         "Written 2026-10-09 before any chat model saw them. Please check the **Key** of each question: "
         "is anything wrong, missing, or too strict? Say which ids to change.", "",
         "Each key was checked at the source named under *Checked* (the app's own row of the verse, GRETIL's "
         "text of the critical edition, Vedabase, or the app's grammar engine). Where a key goes beyond what I "
         "checked, it says so.", "",
         "## The search alone (no chat model yet)", "",
         "Each question went through the real search on a copy of the local database: 2,200 verses from 20 books, "
         "Plus books included. *Found* is the share of the expected verses that came back in the top 6.", "",
         "| Search | Found | All found | None found | Median time |", "|---|---:|---:|---:|---:|"]
    names = {"gemini": "Reference + wording + meaning (gemini-embedding-001)",
             "multi": "Reference + wording + meaning (text-multilingual-embedding-002)",
             "lexical": "Reference + wording only (no meaning search)"}
    for label, run in runs.items():
        sm = run["summary"]
        L.append(f"| {names[label]} | {sm['recall']:.0%} | {sm['fully_found']}/{sm['with_gold']} | "
                 f"{sm['none_found']} | {sm['median_search_ms']} ms |")
    L += ["", "11 questions have no expected verse (grammar drills, books the app does not hold, traps); they "
          "test whether the model ignores verses that do not help.", "",
          "Twelve questions marked **hard** are asked twice more of every model, to see whether mistakes repeat.", ""]
    for cat, title in CATEGORIES.items():
        L += [f"## {cat}. {title}", ""]
        for c in [x for x in CASES if x["category"] == cat]:
            L.append(f"### {c['id']}{'  (hard)' if c['hard'] else ''}")
            L.append(f"**Question** ({LANG[c['lang']].split(' ')[0]} answer): {c['question']}")
            L.append("")
            if c["history"]:
                L.append(f"*Earlier in the chat:* Q: {c['history'][-1][0]} / A: {c['history'][-1][1]}")
            if c["screen_text"]:
                L.append(f"*On the learner's screen:* {' '.join(c['screen_text'].split())}")
            if c["facts"]:
                L.append("*With the app's calendar FACTS for 9 Oct 2026, New Delhi.*")
            if c["chart"]:
                L.append("*With the app's CHART for a birth on 15 Aug 1995, 06:30, New Delhi.*")
            L.append("")
            gold = ", ".join(g["ref"] for g in c["gold"]) or "none (nothing in the app's books should be needed)"
            L.append(f"**Search should find** ({'all' if c['gold_mode'] == 'all' else 'any one'}): {gold}")
            L.append("")
            r = found.get(c["id"])
            if r:
                hit_refs = []
                for h in r["hits"]:
                    is_gold = any(h["ref"] == g["ref"] for g in c["gold"])
                    hit_refs.append(f"**{h['ref']}**" if is_gold else h["ref"])
                L.append(f"**Search found:** {'; '.join(hit_refs)}")
            L.append("")
            L.append("**Key:** " + "; ".join(c["must"]) + ".")
            L.append("")
            if c["must_not"]:
                L.append("**Fails if:** " + "; ".join(c["must_not"]) + ".")
                L.append("")
            L.append(f"*Checked:* {c['checked']}." + (f" *Note:* {c['note']}" if c["note"] else ""))
            L.append("")
    (OUT / "question_sheet.md").write_text("\n".join(L) + "\n", encoding="utf-8")
    print(OUT / "question_sheet.md")


def main() -> None:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("retrieval")
    r.add_argument("--label", required=True)
    r.add_argument("--k", type=int, default=settings.book_search_top_k)
    r.add_argument("--lexical", action="store_true")
    sub.add_parser("sheet")
    args = ap.parse_args()
    if (settings.database_url or "").strip():
        raise SystemExit("DATABASE_URL is set: this bench reads a local copy only. Unset it.")
    OUT.mkdir(parents=True, exist_ok=True)
    if args.cmd == "retrieval":
        asyncio.run(retrieval(args))
    elif args.cmd == "sheet":
        sheet(args)


if __name__ == "__main__":
    main()
