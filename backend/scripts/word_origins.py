"""Word journey pipeline runner (handover_language 7.1).

Offline, run by the owner. Nothing here is on a request path.

Flow::

    propose   one Vertex batch job: Flash lists candidate English words
    check     for each: read its American Heritage entry, apply the rule, gate the stem
    write     one Vertex batch job: Flash copies the route out of the entry text
    verify    code confirms every copied form is in the entry
    review    a sheet the owner reads
    approve   the owner's yes writes batch-NNNN.json; the next deploy shows it

Usage::

    ./.venv/Scripts/python.exe -m scripts.word_origins propose --live
    ./.venv/Scripts/python.exe -m scripts.word_origins collect --run <id> --step propose --live
    ./.venv/Scripts/python.exe -m scripts.word_origins check --run <id> --live
    ./.venv/Scripts/python.exe -m scripts.word_origins write --run <id> --live
    ./.venv/Scripts/python.exe -m scripts.word_origins collect --run <id> --step write --live
    ./.venv/Scripts/python.exe -m scripts.word_origins verify --run <id>
    ./.venv/Scripts/python.exe -m scripts.word_origins review --run <id>
    ./.venv/Scripts/python.exe -m scripts.word_origins approve --run <id> --live
    ./.venv/Scripts/python.exe -m scripts.word_origins status [--run <id>]
    ./.venv/Scripts/python.exe -m scripts.word_origins selfcheck --live

Every step that spends money or writes outside ``results/`` needs ``--live``,
as ``scripts/challenge_batch.py`` does. Each step reads and writes one
working folder, ``backend/results/word_origins/<run id>/``, so a run can be
picked up after a job that takes hours. ``vertex_credentials.json`` is never
committed, printed or logged.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import date, datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from app.config import settings  # noqa: E402

BACKEND_DIR = Path(__file__).resolve().parent.parent
RESULTS_DIR = BACKEND_DIR / "results" / "word_origins"
SEEDS_WO_DIR = BACKEND_DIR / "app" / "seeds" / "word_origins"
GOLD_PATH = BACKEND_DIR / "tests" / "fixtures" / "word_origins" / "gold.json"


def _resolve_credentials(path_value: str) -> str:
    p = Path(path_value)
    if p.is_absolute():
        return str(p)
    return str((BACKEND_DIR / p).resolve())


def _new_run_id() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def _run_dir(run_id: str) -> Path:
    return RESULTS_DIR / run_id


def _read_json(path: Path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def _write_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")


def _vertex_client():
    from app.services.vertex_batch import VertexBatchClient

    return VertexBatchClient(
        credentials_path=_resolve_credentials(settings.vertex_credentials_path),
        project=getattr(settings, "vertex_project", "videos-498005"),
        bucket=settings.vertex_batch_bucket,
        prefix=settings.vertex_batch_prefix,
        location=settings.vertex_location,
        model=settings.word_origins_model,
    )


# ─── propose ────────────────────────────────────────────────────────────────

def cmd_propose(args) -> int:
    from app.services.vertex_batch import build_request_line, to_jsonl
    from app.services.word_pipeline import (
        PROPOSE_N, build_propose_known, build_propose_user,
        live_words_by_lang, rejected_words_by_lang,
    )

    # The measured prompt, word for word (handover 7.3).
    from scripts.bench_word_origins import B_SYSTEM, B_USER

    is_live = args.live and not args.dry_run
    n = args.n or PROPOSE_N
    run_id = args.run or _new_run_id()
    rundir = _run_dir(run_id)
    rundir.mkdir(parents=True, exist_ok=True)

    live = live_words_by_lang(SEEDS_WO_DIR)
    rejected = rejected_words_by_lang(SEEDS_WO_DIR)
    known = build_propose_known(live, rejected, "en")

    user = build_propose_user(n, known, B_USER)
    line = build_request_line("propose-en-000", B_SYSTEM, user)
    _write_json(rundir / "run.json", {
        "run": run_id, "step": "propose", "lang": "en", "n": n,
        "model": settings.word_origins_model,
        "known_count": len(known),
        "created": datetime.now(timezone.utc).isoformat(),
    })
    (rundir / "propose_input.jsonl").write_text(
        to_jsonl([line]), encoding="utf-8")

    if not is_live:
        print(f"run {run_id}: 1 propose request (en, n={n}), "
              f"{len(known)} words excluded. Dry run: no upload, no job.")
        print("Pass --live to upload and create the Vertex batch job.")
        return 0

    client = _vertex_client()
    from app.services.vertex_batch import gcs_object_name
    obj = gcs_object_name(settings.vertex_batch_prefix, run_id, "propose", "input.jsonl")
    client.upload_input(obj, (rundir / "propose_input.jsonl").read_text(encoding="utf-8"))
    job = client.create_job(run_id, "propose", obj)
    _write_json(rundir / "propose_job.json", job)
    print(f"run {run_id}: job {job.get('name')} created. "
          f"Collect later with: collect --run {run_id} --step propose --live")
    return 0


# ─── collect ────────────────────────────────────────────────────────────────

def cmd_collect(args) -> int:
    from app.services.vertex_batch import parse_predictions_jsonl, sum_tokens
    from app.services.word_pipeline import parse_proposals

    is_live = args.live and not args.dry_run
    if not args.run:
        print("collect needs --run <id>")
        return 2
    rundir = _run_dir(args.run)
    step = args.step or "propose"
    job_file = rundir / f"{step}_job.json"
    if not job_file.is_file():
        print(f"no {job_file}: run propose/write --live first")
        return 2
    if not is_live:
        print(f"run {args.run} step {step}: dry run. Pass --live to poll and download.")
        return 0
    job = _read_json(job_file, {})
    client = _vertex_client()
    final = client.poll_job(str(job.get("name") or ""), interval_s=30.0)
    _write_json(rundir / f"{step}_job.json", final)
    state = str(final.get("state") or "")
    print(f"job {final.get('name')}: {state}")
    try:
        parsed = client.collect_predictions(final)
    except Exception as e:
        print(f"download failed: {e}")
        return 1
    (rundir / f"{step}_output.json").write_text(
        json.dumps({k: {"text": v["text"][:200000], "status": v["status"],
                        "error": v["error"]} for k, v in parsed.items()},
                   ensure_ascii=False, indent=1), encoding="utf-8")
    totals = sum_tokens(parsed)
    print(f"answered {totals['answered']}, failed {totals['failed']}, "
          f"tokens in={totals['prompt_tokens']} out={totals['candidates_tokens']} "
          f"thoughts={totals['thoughts_tokens']}")
    if step == "propose":
        texts = [v["text"] for v in parsed.values() if v.get("status") == "ok"]
        proposals: list[dict] = []
        for text in texts:
            proposals.extend(parse_proposals(text))
        # Deduplicate by lowercased word, first wins.
        seen: set[str] = set()
        uniq = []
        for p in proposals:
            key = str(p.get("word") or "").casefold()
            if key and key not in seen:
                seen.add(key)
                uniq.append(p)
        _write_json(rundir / "proposals.json", {"proposals": uniq})
        print(f"{len(uniq)} proposals saved (expect ~{60}: ~40 survive check).")
    else:
        _write_json(rundir / "writes.json",
                    {"replies": {k: v["text"] for k, v in parsed.items()}})
        print(f"{len(parsed)} write replies saved. Run verify next.")
    return 0


# ─── check ──────────────────────────────────────────────────────────────────

def cmd_check(args) -> int:
    import httpx
    from app.services.word_check import (
        UA, check_word, fetch_with_crossref, load_kosha_stems,
    )

    is_live = args.live and not args.dry_run
    if not args.run:
        print("check needs --run <id>")
        return 2
    rundir = _run_dir(args.run)
    prop_file = rundir / "proposals.json"
    if not prop_file.is_file():
        print(f"no {prop_file}: run collect --step propose first")
        return 2
    proposals = _read_json(prop_file, {}).get("proposals", [])
    if not proposals:
        print("no proposals to check")
        return 0
    if not is_live:
        print(f"run {args.run}: {len(proposals)} proposals. "
              f"Dry run: no dictionary fetch. Pass --live to check.")
        return 0

    entries_path = rundir / "entries.json"
    cached = _read_json(entries_path, {}).get("entries", {})
    try:
        stems = load_kosha_stems()
    except Exception:
        stems = set()
    print(f"kosha stems: {len(stems)}")

    rows: list[dict] = []
    with httpx.Client(headers=UA, timeout=30, follow_redirects=True) as client:
        for i, prop in enumerate(proposals):
            word = str(prop.get("word") or "")
            key = word.casefold()
            if key in cached:
                segs = cached[key].get("segs", [])
                followed = cached[key].get("followed", [])
                entry_url = cached[key].get("url", "")
            else:
                segs, followed = fetch_with_crossref(client, word)
                entry_url = f"https://ahdictionary.com/word/search.html?q={word}"
                cached[key] = {
                    "word": word, "segs": segs, "followed": followed,
                    "url": entry_url,
                    "fetched_at": datetime.now(timezone.utc).isoformat(),
                }
                _write_json(entries_path, {"entries": cached})
                # One request a second at most (plus the cross-ref fetches
                # already made above, which is why the sleep is per word).
                if i < len(proposals) - 1:
                    time.sleep(1.0)
            result = check_word(word, segs, stems)
            result.update({
                "entry_text": " ".join(segs),
                "entry_url": entry_url,
                "followed": followed,
                "proposed_sanskrit": str(prop.get("sanskrit") or ""),
            })
            rows.append(result)
    _write_json(rundir / "check.json", {"rows": rows})
    n_pass = sum(1 for r in rows if r["status"] == "pass")
    n_look = sum(1 for r in rows if r["status"] == "needs_look")
    n_rej = sum(1 for r in rows if r["status"] == "rejected")
    print(f"check: {n_pass} pass, {n_look} needs a look, {n_rej} rejected.")

    # Rejections append to rejected.json with the reason (7.4). This writes
    # outside results/, so it only happens under --live.
    try:
        rej_path = SEEDS_WO_DIR / "rejected.json"
        rej_data = _read_json(rej_path, {"items": []})
        have = {(str(it.get("lang") or "").casefold(),
                 str(it.get("word") or "").casefold()) for it in rej_data.get("items", [])}
        added = 0
        today = date.today().isoformat()
        for r in rows:
            if r["status"] != "rejected":
                continue
            key = ("en", str(r["word"] or "").casefold())
            if key in have:
                continue
            rej_data.setdefault("items", []).append({
                "lang": "en",
                "word": str(r["word"] or ""),
                "verdict": str(r.get("label") or "not from Sanskrit"),
                "what_the_dictionary_says": (r.get("entry_text") or "")[:300],
                "read_in": "ahd",
                "decided_on": today,
            })
            have.add(key)
            added += 1
        if added:
            _write_json(rej_path, rej_data)
            print(f"appended {added} rejections to rejected.json")
    except Exception as e:
        print(f"rejected.json update skipped: {e}")
    return 0


# ─── write ──────────────────────────────────────────────────────────────────

def cmd_write(args) -> int:
    from app.services.vertex_batch import build_request_line, to_jsonl
    from app.services.word_pipeline import build_write_user

    is_live = args.live and not args.dry_run
    if not args.run:
        print("write needs --run <id>")
        return 2
    rundir = _run_dir(args.run)
    check_data = _read_json(rundir / "check.json", {})
    rows = check_data.get("rows", [])
    entries = _read_json(rundir / "entries.json", {}).get("entries", {})
    survivors = [r for r in rows
                 if r.get("status") in ("pass", "needs_look") and r.get("mw_key")]
    if not survivors:
        print("nothing survived check with a stem: nothing to write")
        return 0
    lines = []
    for i, r in enumerate(survivors):
        word = str(r.get("word") or "")
        entry_text = str(r.get("entry_text") or "")
        if not entry_text:
            cached = entries.get(word.casefold(), {})
            entry_text = " ".join(cached.get("segs", []))
        user = build_write_user(word, "English", str(r.get("mw_key") or ""), entry_text)
        from app.services.word_pipeline import WRITE_SYSTEM
        lines.append(build_request_line(f"write-{i:03d}-{word.lower()}", WRITE_SYSTEM, user))
    (rundir / "write_input.jsonl").write_text(to_jsonl(lines), encoding="utf-8")
    _write_json(rundir / "write_manifest.json", {
        "words": [str(r.get("word") or "") for r in survivors],
    })
    if not is_live:
        print(f"run {args.run}: {len(lines)} write requests. Dry run: no job.")
        print("Pass --live to create the second Vertex batch job.")
        return 0
    client = _vertex_client()
    from app.services.vertex_batch import gcs_object_name
    obj = gcs_object_name(settings.vertex_batch_prefix, args.run, "write", "input.jsonl")
    client.upload_input(obj, (rundir / "write_input.jsonl").read_text(encoding="utf-8"))
    job = client.create_job(args.run, "write", obj)
    _write_json(rundir / "write_job.json", job)
    print(f"run {args.run}: job {job.get('name')} created. "
          f"Collect later with: collect --run {args.run} --step write --live")
    return 0


# ─── verify ─────────────────────────────────────────────────────────────────

def cmd_verify(args) -> int:
    from app.services.word_pipeline import parse_write_reply, verify_reply
    from app.services.word_pipeline import (
        live_words_by_lang, rejected_words_by_lang,
    )

    if not args.run:
        print("verify needs --run <id>")
        return 2
    rundir = _run_dir(args.run)
    check_data = _read_json(rundir / "check.json", {})
    rows = {str(r.get("word") or ""): r for r in check_data.get("rows", [])}
    writes = _read_json(rundir / "writes.json", {}).get("replies", {})
    if not writes:
        # collect --step write saves writes.json; a hand-made run may carry
        # write_output.json instead.
        out = _read_json(rundir / "write_output.json", {})
        writes = out if isinstance(out, dict) else {}
    live = live_words_by_lang(SEEDS_WO_DIR).get("en", set())
    rejected = {w for w in rejected_words_by_lang(SEEDS_WO_DIR).get("en", set())}
    # Never ship a word already live or rejected even if the files changed
    # between check and verify: both sets are re-read here.

    out_rows: list[dict] = []
    for key, raw in writes.items():
        # key is write-000-word; recover the word from the manifest or the reply.
        word = ""
        manifest = _read_json(rundir / "write_manifest.json", {}).get("words", [])
        # Keys are write-<i>-<word>: the manifest index gives the word.
        try:
            idx = int(str(key).split("-")[1])
            word = str(manifest[idx]) if idx < len(manifest) else ""
        except Exception:
            word = ""
        reply = parse_write_reply(raw if isinstance(raw, str) else "")
        if not word and isinstance(reply, dict):
            word = ""
        check = rows.get(word, {})
        entry_text = str(check.get("entry_text") or "")
        segs = [entry_text] if entry_text else []
        label = str(check.get("label") or "")
        passed, reasons = verify_reply(
            word, entry_text, segs if segs != [""] else [],
            label, reply,
            rejected_set=rejected, live_set=live,
        )
        out_rows.append({
            "word": word, "key": key, "label": label,
            "mw_key": str(check.get("mw_key") or ""),
            "passed": passed, "reasons": reasons,
            "reply": reply or {},
            "entry_text": entry_text,
            "entry_url": str(check.get("entry_url") or ""),
        })
    _write_json(rundir / "verify.json", {"rows": out_rows})
    n_ok = sum(1 for r in out_rows if r["passed"])
    print(f"verify: {n_ok} of {len(out_rows)} replies pass. "
          f"(This measures the 7.5 prompt.)")
    for r in out_rows:
        if not r["passed"]:
            print(f"  needs a look: {r['word']}: {', '.join(r['reasons'])}")
    return 0


# ─── review ─────────────────────────────────────────────────────────────────

def cmd_review(args) -> int:
    from app.services.word_pipeline import review_markdown

    if not args.run:
        print("review needs --run <id>")
        return 2
    rundir = _run_dir(args.run)
    check_data = _read_json(rundir / "check.json", {}).get("rows", [])
    verify_data = _read_json(rundir / "verify.json", {}).get("rows", [])
    by_word = {str(r.get("word") or ""): r for r in check_data}
    passed: list[dict] = []
    needs: list[dict] = []
    for v in verify_data:
        word = str(v.get("word") or "")
        check = by_word.get(word, {})
        reply = v.get("reply", {}) or {}
        cand = {
            "word": word,
            "gloss": str(reply.get("gloss") or ""),
            "mw_key": str(v.get("mw_key") or check.get("mw_key") or ""),
            "kind": "loan",
            "hops": reply.get("hops") or [],
            "note": str(reply.get("note") or ""),
            "entry_text": str(v.get("entry_text") or check.get("entry_text") or ""),
            "entry_url": str(v.get("entry_url") or check.get("entry_url") or ""),
            "reason": ", ".join(v.get("reasons", [])),
            "label": str(v.get("label") or ""),
        }
        (passed if v.get("passed") else needs).append(cand)
    # Check-level needs-a-look words that never reached write (hedged stem,
    # stem miss) also get a section, after the verify ones.
    wrote = {str(v.get("word") or "") for v in verify_data}
    for c in check_data:
        word = str(c.get("word") or "")
        if word in wrote or c.get("status") == "rejected":
            continue
        if c.get("status") == "needs_look" and not c.get("mw_key"):
            needs.append({
                "word": word, "gloss": "", "mw_key": "",
                "kind": "loan", "hops": [],
                "note": "", "entry_text": str(c.get("entry_text") or ""),
                "entry_url": str(c.get("entry_url") or ""),
                "reason": str(c.get("reason") or c.get("label") or ""),
                "label": str(c.get("label") or ""),
            })
    md = review_markdown(passed, needs)
    (rundir / "review.md").write_text(md, encoding="utf-8")
    print(f"run {args.run}: review.md with {len(passed)} passed, "
          f"{len(needs)} needing a look.")
    return 0


# ─── approve ────────────────────────────────────────────────────────────────

def cmd_approve(args) -> int:
    from app.services.word_pipeline import (
        build_batch_file, build_item, last_scheduled_date, merge_items_by_stem,
        next_batch_name, validate_new_batch,
        live_words_by_lang, rejected_words_by_lang,
    )

    is_live = args.live and not args.dry_run
    if not args.run:
        print("approve needs --run <id>")
        return 2
    rundir = _run_dir(args.run)
    verify_data = _read_json(rundir / "verify.json", {}).get("rows", [])
    check_by_word = {str(r.get("word") or ""): r
                     for r in _read_json(rundir / "check.json", {}).get("rows", [])}

    except_set = {w.strip().casefold() for w in (args.except_ or "").split(",") if w.strip()}
    also_set = {w.strip().casefold() for w in (args.also or "").split(",") if w.strip()}

    picked = []
    for v in verify_data:
        word = str(v.get("word") or "")
        key = word.casefold()
        if key in except_set:
            continue
        if not v.get("passed") and key not in also_set:
            continue
        picked.append(v)
    # --also words that never verified still need a reply to build from.
    if also_set:
        have = {str(v.get("word") or "").casefold() for v in picked}
        for extra in also_set:
            if extra in have:
                continue
            print(f"--also {extra}: not a verified word in this run; skipped")

    if not picked:
        print("nothing to approve")
        return 1

    today = date.today().isoformat()
    singles = []
    for v in picked:
        word = str(v.get("word") or "")
        check = check_by_word.get(word, {})
        reply = v.get("reply", {}) or {}
        mw_key = str(v.get("mw_key") or check.get("mw_key") or "")
        label = str(v.get("label") or check.get("label") or "sanskrit")
        confidence = "probable" if label == "sanskrit_hedged" else "certain"
        try:
            singles.append(build_item(
                mw_key=mw_key, lang="en", lang_name="English", word=word,
                gloss=str(reply.get("gloss") or word),
                sanskrit_gloss=str(reply.get("sanskrit_gloss") or ""),
                note=str(reply.get("note") or ""),
                hops=reply.get("hops") or [],
                lookup=word, checked_on=today, confidence=confidence,
            ))
        except Exception as e:
            print(f"cannot build {word}: {e}")
            return 1
    items = merge_items_by_stem(singles)

    if args.start:
        start = args.start
    else:
        last = last_scheduled_date(SEEDS_WO_DIR)
        if last:
            from datetime import datetime as _dt, timedelta as _td
            start = (_dt.strptime(last, "%Y-%m-%d").date() + _td(days=1)).isoformat()
        else:
            start = today

    name = next_batch_name(SEEDS_WO_DIR)
    live = live_words_by_lang(SEEDS_WO_DIR)
    rejected = rejected_words_by_lang(SEEDS_WO_DIR)
    errors = validate_new_batch(items, start, SEEDS_WO_DIR, rejected, live)
    if errors:
        print("approve refused:")
        for e in errors:
            print(f"  {e}")
        return 1

    data = build_batch_file(items, name, start,
                            maker=f"word pipeline run {args.run}",
                            model=settings.word_origins_model)
    out_path = SEEDS_WO_DIR / name
    if not is_live:
        print(f"run {args.run}: {len(items)} items from {start} would write {name}. "
              f"Dry run: nothing written. Pass --live to write.")
        return 0
    out_path.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"wrote {out_path} with {len(items)} items from {start}. "
          f"Commit and deploy to show it.")

    if args.reject and except_set:
        rej_path = SEEDS_WO_DIR / "rejected.json"
        rej_data = _read_json(rej_path, {"items": []})
        have = {(str(it.get("lang") or "").casefold(),
                 str(it.get("word") or "").casefold()) for it in rej_data.get("items", [])}
        added = 0
        for v in verify_data:
            word = str(v.get("word") or "")
            if word.casefold() not in except_set:
                continue
            if ("en", word.casefold()) in have:
                continue
            rej_data.setdefault("items", []).append({
                "lang": "en", "word": word,
                "verdict": "held back by the owner at approve",
                "what_the_dictionary_says": str(v.get("entry_text") or "")[:300],
                "read_in": "ahd",
                "decided_on": today,
            })
            added += 1
        if added:
            _write_json(rej_path, rej_data)
            print(f"appended {added} held-back words to rejected.json (--reject)")
        else:
            print("--reject: nothing new to ban (a word can be held back without being banned)")
    return 0


# ─── status ─────────────────────────────────────────────────────────────────

def cmd_status(args) -> int:
    from app.services.word_pipeline import run_status

    if args.run:
        info = run_status(_run_dir(args.run))
        print(json.dumps(info, ensure_ascii=False, indent=1))
        return 0
    if not RESULTS_DIR.is_dir():
        print("no runs yet")
        return 0
    for child in sorted(RESULTS_DIR.iterdir()):
        if child.is_dir():
            info = run_status(child)
            print(f"{child.name}: files={sum(1 for v in info['files'].values() if v)} "
                  f"proposals={info.get('n_proposals', '-')} "
                  f"check={info.get('n_pass', '-')}/{info.get('n_check', '-')} "
                  f"verified={info.get('n_verified', '-')}/{info.get('n_verify', '-')}")
    return 0


# ─── selfcheck (7.4 acceptance, free apart from the fetches) ────────────────

def cmd_selfcheck(args) -> int:
    is_live = args.live and not args.dry_run
    if not is_live:
        print("selfcheck fetches the gold English words live. Pass --live (free).")
        return 0
    import httpx
    from app.services.word_check import UA, fetch_with_crossref

    gold = json.loads(GOLD_PATH.read_text(encoding="utf-8"))["items"]
    en = [i for i in gold if i.get("lang") == "en"]
    loans = [i for i in en if i.get("gold") == "loan"]
    others = [i for i in en if i.get("gold") != "loan"]
    print(f"fetching {len(en)} English gold words (one request a second)...")
    labels: dict[str, str] = {}
    with httpx.Client(headers=UA, timeout=30, follow_redirects=True) as client:
        for i, item in enumerate(en):
            word = str(item["word"])
            try:
                segs, _followed = fetch_with_crossref(client, word)
            except Exception as e:
                segs = [f"HTTP error {type(e).__name__}"]
            from app.services.word_check import classify_ahd
            labels[word] = classify_ahd(segs)
            if i < len(en) - 1:
                time.sleep(1.0)
    bad_others = [w for w in others if labels.get(str(w["word"])) == "sanskrit"]
    ok_loans = [w for w in loans if labels.get(str(w["word"])) == "sanskrit"]
    print(f"borrowed labelled sanskrit: {len(ok_loans)} of {len(loans)} (need >= 30)")
    print(f"others labelled sanskrit: {len(bad_others)} (need 0)")
    for w in bad_others:
        print(f"  wrongly sanskrit: {w['word']}")
    for w in loans:
        if labels.get(str(w["word"])) != "sanskrit":
            print(f"  loan not sanskrit: {w['word']} -> {labels.get(str(w['word']))}")
    ok = len(ok_loans) >= 30 and not bad_others
    print("SELFCHECK " + ("PASS" if ok else "FAIL"))
    return 0 if ok else 1


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="step", required=True)

    def _live(p):
        p.add_argument("--live", action="store_true",
                       help="spend money / write outside results/ (default: dry run)")
        p.add_argument("--dry-run", action="store_true", help="force dry run")

    p = sub.add_parser("propose", help="one Vertex batch job listing candidates")
    p.add_argument("--run", default="")
    p.add_argument("--n", type=int, default=0)
    _live(p)
    p.set_defaults(func=cmd_propose)

    p = sub.add_parser("collect", help="poll a batch job and save its output")
    p.add_argument("--run", default="", required=True)
    p.add_argument("--step", default="propose", choices=["propose", "write"])
    _live(p)
    p.set_defaults(func=cmd_collect)

    p = sub.add_parser("check", help="read each AHD entry, apply the rule, gate the stem")
    p.add_argument("--run", default="", required=True)
    _live(p)
    p.set_defaults(func=cmd_check)

    p = sub.add_parser("write", help="one Vertex batch job copying routes from entries")
    p.add_argument("--run", default="", required=True)
    _live(p)
    p.set_defaults(func=cmd_write)

    p = sub.add_parser("verify", help="code-check every copied form against the entry")
    p.add_argument("--run", default="", required=True)
    p.set_defaults(func=cmd_verify)

    p = sub.add_parser("review", help="write review.md for the owner")
    p.add_argument("--run", default="", required=True)
    p.set_defaults(func=cmd_review)

    p = sub.add_parser("approve", help="write the next batch-NNNN.json")
    p.add_argument("--run", default="", required=True)
    p.add_argument("--except", dest="except_", default="")
    p.add_argument("--also", default="")
    p.add_argument("--start", default="")
    p.add_argument("--reject", action="store_true",
                   help="also ban --except words in rejected.json")
    _live(p)
    p.set_defaults(func=cmd_approve)

    p = sub.add_parser("status", help="show working folders")
    p.add_argument("--run", default="")
    p.set_defaults(func=cmd_status)

    p = sub.add_parser("selfcheck", help="acceptance for the check step (free, live fetch)")
    _live(p)
    p.set_defaults(func=cmd_selfcheck)

    args = ap.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
