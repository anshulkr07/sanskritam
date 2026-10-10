"""Merge render runs into one final set: the newest audio per verse.

Usage:
    python -m scripts.chant_merge --out ../chant_runs/final \
        main=../chant_runs/main:../chant_runs/decisions.json \
        mbh_bori=../chant_runs/mbh_bori:../chant_runs/decisions.json \
        paged=../chant_runs/paged:../chant_runs/decisions.json \
        fix1=../chant_runs/fix1:../chant_runs/fix1_decisions.json

Each argument is NAME=RUN_DIR[|DECISIONS_FILE], oldest first (quote the | in a shell). A verse that is in
more than one run takes its row from the LAST run that has it (a fix run holds
newer audio for verses an earlier run rendered). Its decision is read only from
the decisions file of the run that supplied the row: an approval of the old
audio never carries over to new audio nobody has heard.

Writes OUT/manifest.jsonl (rows verbatim, plus "run"), OUT/audio/ (only the
files that are used: superseded audio is left behind), OUT/decisions.json and
OUT/merge_report.json, then OUT/mapping.json through gpu/make_mapping.py's checks.
Refuses (writes nothing) when a file is missing or two verses share a file.
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path


def merge(runs: list[tuple[str, Path, Path | None]], out: Path) -> dict:
    rows: dict[str, dict] = {}
    decisions: dict[str, str] = {}
    superseded: list[dict] = []
    for name, run_dir, dec_path in runs:
        dec: dict[str, str] = {}
        if dec_path is not None:
            raw = json.loads(dec_path.read_text(encoding="utf-8"))
            dec = raw.get("decisions", raw) if isinstance(raw, dict) else {}
        for line in (run_dir / "manifest.jsonl").read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            m = json.loads(line)
            uid = m["verse_uid"]
            if uid in rows:
                superseded.append({"verse_uid": uid, "source_ref": m.get("source_ref", ""),
                                   "replaced_run": rows[uid]["run"], "by_run": name,
                                   "old_file": rows[uid]["file"], "new_file": m["file"]})
                decisions.pop(uid, None)
            audio = run_dir / "audio" / m["file"]
            if not audio.exists() or audio.stat().st_size == 0:
                raise SystemExit(f"{name}: audio missing or empty for {m.get('source_ref')}: {audio}")
            rows[uid] = dict(m, run=name, _src=str(audio))
            if uid in dec:
                decisions[uid] = dec[uid]
    files: dict[str, str] = {}
    for uid, m in rows.items():
        if m["file"] in files:
            raise SystemExit(f"one audio file on two verses: {m['file']} ({files[m['file']]} and {uid})")
        files[m["file"]] = uid
    (out / "audio").mkdir(parents=True, exist_ok=True)
    with open(out / "manifest.jsonl", "w", encoding="utf-8") as f:
        for uid, m in rows.items():
            src = Path(m.pop("_src"))
            dst = out / "audio" / m["file"]
            if not dst.exists() or dst.stat().st_size != src.stat().st_size:
                shutil.copy2(src, dst)
            f.write(json.dumps(m, ensure_ascii=False) + "\n")
    (out / "decisions.json").write_text(
        json.dumps({"decisions": decisions, "note": "effective decisions for the merged set"}, indent=1), encoding="utf-8")
    counts: dict[str, int] = {}
    for uid, m in rows.items():
        status = decisions.get(uid, m.get("qc_status", ""))
        counts[status] = counts.get(status, 0) + 1
    report = {"verses": len(rows), "by_run": {n: sum(1 for m in rows.values() if m["run"] == n) for n, _, _ in runs},
              "superseded": superseded, "effective_status": counts}
    (out / "merge_report.json").write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    return report


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("runs", nargs="+", help="NAME=RUN_DIR[|DECISIONS_FILE], oldest first")
    args = ap.parse_args(argv)
    runs = []
    for spec in args.runs:
        name, rest = spec.split("=", 1)
        run_dir, _, dec = rest.partition("|")
        runs.append((name, Path(run_dir), Path(dec) if dec else None))
    out = Path(args.out)
    report = merge(runs, out)
    print(json.dumps({k: report[k] for k in ("verses", "by_run", "effective_status")}, ensure_ascii=False))
    print(f"superseded rows: {len(report['superseded'])}")
    # the wholeness checks the archive step uses (sizes, line times, no shared files)
    sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "gpu"))
    import make_mapping  # type: ignore

    mapping, problems = make_mapping.build(out)
    if problems:
        print("merge: problems, mapping.json NOT written:")
        for p in problems[:20]:
            print("  ", p)
        return 1
    (out / "mapping.json").write_text(json.dumps(mapping, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"mapping.json written: {mapping['counts']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
