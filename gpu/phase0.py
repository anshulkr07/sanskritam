"""Phase 0 measurements (runs on the GPU host).

Usage (from the repo root copied to the host):
    venv-asr/bin/python gpu/phase0.py --jobs chant_jobs_sample.jsonl --out gpu_out
Writes gpu_out/phase0.json.

Verified 2026-10-09 on the GB10: decoder CER 4.47% vs author's 4.36%
(within 0.5pp); GPU 60s in 0.49s; CPU/4-threads 60s in 3.33s.

Notes baked in from experience:
- the dataset must be read via parquet + soundfile (datasets' audio decode
  wants torchcodec, whose native lib does not load against container torch);
- model load needs gpu/asr/sushrota.py's AI4Bharat compat patches.
"""

from __future__ import annotations

import argparse
import io
import json
import time
from pathlib import Path


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--jobs", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import config as G
    from asr import scoring as S
    from asr import sushrota as U

    result: dict = {}

    # Renders (render_jobs already ran).
    rj = out / "renders.jsonl"
    renders = []
    if rj.exists():
        renders = [json.loads(l) for l in rj.read_text(encoding="utf-8").splitlines() if l.strip()]
    result["renders"] = {
        "parts": len(renders),
        "audio_s": round(sum(r.get("seconds", 0) for r in renders), 1),
    }

    # Model (patched load).
    import os
    model_path = os.environ.get("MODEL_PATH", "models/" + G.SUSHROTA_FILE)
    model = U.load(model_path, device="cuda")

    # Decoder check on in_the_wild_test via parquet (see module docstring).
    from huggingface_hub import hf_hub_download
    pq = hf_hub_download(repo_id="prathoshap/sushrota-sanskrit-asr-data",
                         filename="data/in_the_wild_test-00000-of-00001.parquet",
                         repo_type="dataset")
    import pyarrow.parquet as papq
    t = papq.read_table(pq)
    import numpy as np
    import soundfile as sf
    cers: list[float] = []
    for n in range(t.num_rows):
        text = t.column("text")[n].as_py() if "text" in t.column_names else ""
        a = t.column("audio")[n].as_py()
        raw = a["bytes"] if isinstance(a, dict) else bytes(a)
        wav, sr = sf.read(io.BytesIO(raw), dtype="float32")
        if getattr(wav, "ndim", 1) > 1:
            wav = wav.mean(axis=1).astype(np.float32)
        if sr != 16000:
            import librosa
            wav = librosa.resample(np.asarray(wav, dtype=np.float32), orig_sr=sr,
                                   target_sr=16000).astype(np.float32)
        P = U.posteriors(model, np.asarray(wav, dtype=np.float32), max_seconds=G.MAX_SECONDS)
        dec = U.greedy(P, 0, model=model)
        cers.append(S.cer(text or "", dec))
    mean_cer = sum(cers) / len(cers) if cers else None
    result["decoder"] = {"n": len(cers), "mean_cer": mean_cer, "target": 0.0436,
                         "within_0.5pp": (abs(mean_cer - 0.0436) <= 0.005) if mean_cer is not None else False}

    # Latency on GPU.
    lat: dict = {}
    for secs in (10, 30, 45, 60):
        x = np.zeros(secs * 16000, dtype=np.float32)
        t0 = time.time()
        P = U.posteriors(model, x, max_seconds=60)
        _ = [U.greedy(P, b, model=model) for b in (0, 3, 6)]
        lat[f"{secs}s"] = round(time.time() - t0, 2)
    result["latency_gpu"] = lat
    (out / "phase0.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result, indent=2)[:2000])


if __name__ == "__main__":
    main()
