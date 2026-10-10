"""QC every render: duration, pause, recogniser CER, repeats (venv-asr).

Usage:
    python asr/qc_renders.py --renders gpu_out/renders.jsonl --jobs chant_jobs.jsonl --out gpu_out/qc.jsonl
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np


def _rms_pause(wav: np.ndarray, sr: int = 24000) -> bool:
    win = int(0.02 * sr)
    if len(wav) < win:
        return False
    n = len(wav) // win
    rms = np.sqrt(np.mean(wav[: n * win].reshape(n, win) ** 2, axis=1))
    # Ignore first/last 0.15 s.
    skip = int(0.15 / 0.02)
    core = rms[skip: n - skip] if n > 2 * skip else rms
    if len(core) == 0:
        return False
    # Run of windows below 0.012 lasting >= 0.25 s (>= 13 windows).
    run = 0
    for v in core:
        if v < 0.012:
            run += 1
            if run * 0.02 >= 0.25:
                return True
        else:
            run = 0
    return False


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--renders", required=True)
    ap.add_argument("--jobs", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--model", default="sushrota_sanskrit_asr_v13b.nemo")
    args = ap.parse_args()

    import soundfile as sf

    from asr import qc_rules as R
    from asr import scoring as S
    from asr import sushrota as U

    jobs = {}
    for line in Path(args.jobs).read_text(encoding="utf-8").splitlines():
        if line.strip():
            j = json.loads(line)
            jobs[j["verse_uid"]] = j
    renders = [json.loads(l) for l in Path(args.renders).read_text(encoding="utf-8").splitlines() if l.strip()]

    model = U.load(args.model, device="cuda")
    out = Path(args.out)
    qc_path = out if out.suffix else out / "qc.jsonl"
    if qc_path.suffix:
        qc_path.parent.mkdir(parents=True, exist_ok=True)
    else:
        out.mkdir(parents=True, exist_ok=True)
    seen: set[tuple] = set()
    if qc_path.exists():
        for line in qc_path.read_text(encoding="utf-8").splitlines():
            if line.strip():
                r = json.loads(line)
                seen.add((r.get("verse_uid"), r.get("line_i"), r.get("part_j"), r.get("seed")))

    with open(qc_path, "a", encoding="utf-8") as f:
        for r in renders:
            key = (r.get("verse_uid"), r.get("line_i"), r.get("part_j"), r.get("seed"))
            if key in seen:
                continue
            flags: list[str] = []
            seconds = float(r.get("seconds", 0))
            # The record's syllables are the whole line's; a part is its share
            # of the line (qc_rules.py says why: every split line used to flag).
            line_parts: list[str] = []
            for ln in jobs.get(r.get("verse_uid"), {}).get("lines", []):
                if ln.get("i") == r.get("line_i"):
                    line_parts = ln.get("parts", [])
            expected = R.expected_seconds(
                float(r.get("syllables", 0)), float(r.get("sec_per_syll", 0.33)),
                [len(S.aksharas(p)) for p in line_parts], int(r.get("part_j", 0)))
            length = R.length_flag(seconds, expected)
            if length:
                flags.append(length)
            # Pause.
            try:
                wav, sr = sf.read(r["path"], dtype="float32")
                if _rms_pause(np.asarray(wav, dtype=np.float32), sr):
                    flags.append("pause")
            except Exception:
                flags.append("unreadable")
                wav = np.zeros(16000, dtype=np.float32)
            # Repeats: akshara repeated > 4 in a row in the part text.
            part_tts = ""
            job = jobs.get(r.get("verse_uid"), {})
            for ln in job.get("lines", []):
                if ln.get("i") == r.get("line_i"):
                    parts = ln.get("parts", [])
                    if 0 <= r.get("part_j", 0) < len(parts):
                        part_tts = parts[r["part_j"]]
            aks = S.aksharas(part_tts)
            run = 1
            for i in range(1, len(aks)):
                if aks[i] == aks[i - 1]:
                    run += 1
                    if run > 4:
                        flags.append("repeats")
                        break
                else:
                    run = 1
            # Recogniser CER.
            c = 1.0
            if "repeats" not in flags and "unreadable" not in flags:
                try:
                    import librosa
                    y = librosa.resample(np.asarray(wav, dtype=np.float32), orig_sr=24000, target_sr=16000)
                    P = U.posteriors(model, y)
                    dec = U.greedy(P, 0, model=model)
                    c = S.cer(part_tts, dec)
                    if c > 0.10:
                        flags.append("cer")
                except Exception:
                    flags.append("asr_error")
            f.write(json.dumps({"verse_uid": r.get("verse_uid"), "line_i": r.get("line_i"),
                                "part_j": r.get("part_j"), "seed": r.get("seed"),
                                "flags": flags, "cer": c, "seconds": seconds}) + "\n")


if __name__ == "__main__":
    main()
