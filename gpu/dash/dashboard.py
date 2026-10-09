"""Live render dashboard: text + audio per verse, auto-refresh.

Usage:
    ./venv-asr/bin/python dash/dashboard.py --jobs ~/gpu_jobs/chant_jobs.jsonl --out ~/gpu_out
Writes ~/gpu_out/dash/index.html (+ audio/<uid>.m4a previews for completed
verses). Run alongside the render; it never touches the render's files except
by reading. Serve: cd ~/gpu_out/dash && python -m http.server
"""

from __future__ import annotations

import argparse
import html
import json
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


def read_jsonl(p: Path) -> list[dict]:
    rows = []
    try:
        with open(p, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    rows.append(json.loads(line))
                except Exception:
                    break  # writer mid-append; take what parses
    except FileNotFoundError:
        pass
    return rows


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--jobs", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--loop", type=int, default=0, help="re-run every N seconds")
    args = ap.parse_args()
    out = Path(args.out)
    dash = out / "dash"
    (dash / "audio").mkdir(parents=True, exist_ok=True)

    while True:
        try:
            build(Path(args.jobs), out, dash)
        except Exception as e:  # never kill the watcher
            print("dash error:", str(e)[:200], flush=True)
        if not args.loop:
            break
        time.sleep(args.loop)


def build(jobs_path: Path, out: Path, dash: Path) -> None:
    import numpy as np
    import soundfile as sf
    from assemble import join_verse

    jobs = [json.loads(l) for l in jobs_path.read_text(encoding="utf-8").splitlines() if l.strip()]
    renders = read_jsonl(out / "renders.jsonl")
    qc_rows = read_jsonl(out / "qc.jsonl")

    by_part: dict[tuple, list[dict]] = {}
    for r in renders:
        by_part.setdefault((r.get("verse_uid"), r.get("line_i"), r.get("part_j")), []).append(r)
    qc: dict[tuple, dict] = {}
    for r in qc_rows:
        qc[(r.get("verse_uid"), r.get("line_i"), r.get("part_j"), r.get("seed"))] = r

    total_parts = sum(len(ln.get("parts", [])) for j in jobs for ln in j.get("lines", []))
    done_parts = sum(1 for k in by_part)
    cards = []
    for j in jobs:
        uid = j["verse_uid"]
        meters = {r.get("meter", "?") for k, rs in by_part.items() if k[0] == uid for r in rs}
        fb = any(r.get("meter_fallback") for k, rs in by_part.items() if k[0] == uid for r in rs)
        n_done = sum(1 for k in by_part if k[0] == uid)
        n_all = sum(len(ln.get("parts", [])) for ln in j.get("lines", []))
        flags = sorted({f for (u, li, pj, s), q in qc.items() if u == uid for f in (q.get("flags") or [])})
        complete = n_all > 0 and n_done >= n_all
        prev = dash / "audio" / f"{uid}.m4a"
        if complete and not prev.exists():
            try:
                line_parts = []
                for ln in j.get("lines", []):
                    parts = []
                    for pj, part in enumerate(ln.get("parts", [])):
                        takes = by_part.get((uid, ln.get("i"), pj), [])
                        if not takes:
                            raise KeyError("missing")
                        t = sorted(takes, key=lambda x: x.get("seconds", 0))[0]
                        w, _ = sf.read(t["path"], dtype="float32")
                        parts.append((np.asarray(w, dtype=np.float32), part))
                    line_parts.append(parts)
                audio, _ = join_verse(line_parts)
                p = subprocess.run(
                    ["ffmpeg", "-y", "-v", "error", "-f", "f32le", "-ar", "24000", "-ac", "1",
                     "-i", "pipe:0", "-ar", "24000", "-ac", "1", "-c:a", "aac", "-b:a", "64k",
                     "-f", "mp4", "-movflags", "frag_keyframe+empty_moov", "pipe:1"],
                    input=np.asarray(audio, dtype=np.float32).tobytes(), capture_output=True)
                if p.returncode == 0:
                    prev.write_bytes(p.stdout)
            except Exception:
                complete = False
        lines_html = "".join(
            f"<div class='ln'>{html.escape(ln.get('text', ''))}</div>" for ln in j.get("lines", []))
        audio_html = (f"<audio controls preload='none' src='audio/{uid}.m4a'></audio>"
                      if complete and prev.exists() else "<span class='mut'>rendering</span>")
        meter = next(iter(meters), "?") if meters else "?"
        cards.append(
            f"<div class='card'><div class='hd'><b>{html.escape(j.get('source_ref', ''))}</b>"
            f"<span>{n_done}/{n_all} parts · {html.escape(str(meter))}"
            f"{' · fallback' if fb else ''}"
            f"{' · ' + html.escape(','.join(flags)) if flags else ''}</span></div>"
            f"{lines_html}{audio_html}</div>")

    page = ("<!doctype html><html><head><meta charset='utf-8'>"
            "<meta http-equiv='refresh' content='60'>"
            "<title>Chant render dashboard</title>"
            "<style>body{font-family:system-ui;margin:1rem auto;max-width:60rem;background:#FFF8EE;color:#2B2118}"
            ".card{border:1px solid #D9C9AE;border-radius:10px;padding:.7rem;margin:.6rem 0;background:#fff}"
            ".hd{display:flex;justify-content:space-between;gap:1rem;font-size:.85rem;color:#6B5B4B}"
            ".ln{font-size:1.15rem;line-height:1.9}.mut{color:#999}audio{width:100%;margin-top:.4rem}</style>"
            "</head><body>"
            f"<h1>Chant render dashboard</h1><p>{done_parts}/{total_parts} parts · "
            f"updated {time.strftime('%H:%M:%S UTC', time.gmtime())} · refreshes every 60 s</p>"
            + "".join(cards) + "</body></html>")
    (dash / "index.html").write_text(page, encoding="utf-8")
    print(f"dash: {done_parts}/{total_parts} parts", flush=True)


if __name__ == "__main__":
    main()
