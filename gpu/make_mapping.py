"""Write mapping.json for a finished run and check the run is whole.

Usage:
    python make_mapping.py OUT          # OUT holds manifest.jsonl and audio/

mapping.json says, for every chanted verse, which file is its audio and the
storage key `chant_import` gives it, so the run can be kept (Drive, a laptop,
R2) and imported later without guessing:

    {"voice": ..., "storage_prefix": "chant/<voice>/",
     "counts": {"verses": n, "auto_ok": n, "needs_listen": n},
     "verses": {"<verse_uid>": {"source_ref", "file", "key", "bytes",
                                "duration_ms", "qc_status", "qc_reasons"}}}

Exits 1 (and writes nothing) when the run is not whole: an audio file missing
or empty, two verses on one file, a verse twice, a line outside its audio.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path


def build(out: Path) -> tuple[dict, list[str]]:
    manifest = out / "manifest.jsonl"
    rows = [json.loads(l) for l in manifest.read_text(encoding="utf-8").splitlines() if l.strip()]
    problems: list[str] = []
    verses: dict[str, dict] = {}
    files: dict[str, str] = {}
    voice = ""
    for r in rows:
        uid = r.get("verse_uid", "")
        name = r.get("file", "")
        voice = voice or r.get("voice", "")
        if not uid or not name:
            problems.append(f"row without verse_uid or file: {r.get('source_ref')!r}")
            continue
        if uid in verses:
            problems.append(f"verse_uid twice: {uid} ({r.get('source_ref')})")
            continue
        if name in files:
            problems.append(f"file on two verses: {name} ({files[name]} and {uid})")
            continue
        files[name] = uid
        path = out / "audio" / name
        size = path.stat().st_size if path.exists() else 0
        if size == 0:
            problems.append(f"audio missing or empty: {name} ({r.get('source_ref')})")
        lines = r.get("lines") or []
        dur = int(r.get("duration_ms", 0))
        if lines and (lines[-1].get("end_ms", 0) > dur + 100 or any(
                lines[i].get("end_ms", 0) > lines[i + 1].get("start_ms", 0) for i in range(len(lines) - 1))):
            problems.append(f"line times outside or overlapping the audio: {r.get('source_ref')}")
        verses[uid] = {
            "source_ref": r.get("source_ref", ""),
            "file": name,
            "key": f"chant/{r.get('voice', voice)}/{name}",
            "bytes": size,
            "duration_ms": dur,
            "qc_status": r.get("qc_status", ""),
            "qc_reasons": r.get("qc_reasons", []),
        }
    extra = sorted(p.name for p in (out / "audio").glob("*.m4a") if p.name not in files) if (out / "audio").exists() else []
    if extra:
        problems.append(f"{len(extra)} audio file(s) no manifest row names, e.g. {extra[:3]}")
    counts = {"verses": len(verses)}
    for v in verses.values():
        counts[v["qc_status"]] = counts.get(v["qc_status"], 0) + 1
    mapping = {"voice": voice, "storage_prefix": f"chant/{voice}/", "counts": counts, "verses": verses}
    return mapping, problems


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print(__doc__)
        return 2
    out = Path(argv[1])
    mapping, problems = build(out)
    if problems:
        print(f"make_mapping: {len(problems)} problem(s), mapping.json NOT written:")
        for p in problems[:30]:
            print("  ", p)
        return 1
    (out / "mapping.json").write_text(json.dumps(mapping, ensure_ascii=False, indent=1), encoding="utf-8")
    total = sum(v["bytes"] for v in mapping["verses"].values())
    print(f"make_mapping: {mapping['counts']} {total / 1e6:.1f} MB -> {out / 'mapping.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
