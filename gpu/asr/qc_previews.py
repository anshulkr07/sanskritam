"""QC previews: whole-verse CER of each dash preview vs its reference.

Catches join/encode problems before final assembly. Writes preview_qc.jsonl
{verse_uid, source_ref, cer, seconds}. Run alongside the render; GPU-shared.
Usage: ./venv-asr/bin/python asr/qc_previews.py [--limit N]
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--jobs", default="")
    ap.add_argument("--dash", default="")
    ap.add_argument("--out", default="")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--model", default="")
    args = ap.parse_args()

    home = Path.home()
    jobs_p = Path(args.jobs or str(home / "gpu_jobs" / "chant_jobs.jsonl"))
    dash = Path(args.dash or str(home / "gpu_out" / "dash"))
    out_p = Path(args.out or str(home / "gpu_out" / "preview_qc.jsonl"))
    model_p = args.model or str(home / "gpu" / "models" / "sushrota_sanskrit_asr_v13b.nemo")

    from asr import scoring as S
    from asr import sushrota as U

    jobs = [json.loads(l) for l in jobs_p.read_text(encoding="utf-8").splitlines() if l.strip()]
    if args.limit:
        jobs = jobs[: args.limit]
    model = U.load(model_p, device="cuda")

    done = 0
    seen: set[str] = set()
    if out_p.exists():
        for line in out_p.read_text(encoding="utf-8").splitlines():
            if line.strip():
                try:
                    seen.add(json.loads(line).get("verse_uid", ""))
                except Exception:
                    pass
    with open(out_p, "a", encoding="utf-8") as f:
        for j in jobs:
            uid = j["verse_uid"]
            if uid in seen:
                continue
            prev = dash / "audio" / f"{uid}.m4a"
            if not prev.exists():
                continue
            # Skip rows already checked (by uid).
            ref = "\n".join(ln.get("tts", "") for ln in j.get("lines", []))
            try:
                wav = U.to_16k_mono(prev.read_bytes())
                P = U.posteriors(model, wav)
                dec = U.greedy(P, 0, model=model)
                c = S.cer(ref, dec)
                f.write(json.dumps({"verse_uid": uid, "source_ref": j.get("source_ref", ""),
                                    "cer": round(c, 4),
                                    "seconds": round(len(wav) / 16000, 1)}) + "\n")
                f.flush()
                done += 1
                if done % 50 == 0:
                    print(f"{done} previews checked", flush=True)
            except Exception as e:
                print(f"preview failed {uid}: {str(e)[:120]}", flush=True)
    print(f"done: {done} previews", flush=True)


if __name__ == "__main__":
    main()
