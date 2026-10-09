"""Scorer service (venv-asr): POST /score over Su-srota.

Run: uvicorn asr.server:app --host 0.0.0.0 --port 8090
Env: SCORER_KEY, MODEL_PATH, DEVICE.
"""

from __future__ import annotations

import logging
import os
import time

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import JSONResponse

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import config as G  # noqa: E402

log = logging.getLogger("scorer")
app = FastAPI(title="Sushrota scorer")
_MODEL = None
_REF_CACHE: dict[str, bytes] = {}


def _model():
    global _MODEL
    if _MODEL is None:
        from asr import sushrota as U
        path = os.environ.get("MODEL_PATH", G.SUSHROTA_FILE)
        device = os.environ.get("DEVICE", "cuda")
        _MODEL = U.load(path, device=device)
    return _MODEL


@app.get("/health")
def health():
    return {"ok": True, "model": G.SUSHROTA_FILE, "revision": G.SUSHROTA_HF_REVISION,
            "device": os.environ.get("DEVICE", "cuda")}


@app.post("/score")
async def score(
    file: UploadFile = File(...),
    reference: str = Form(""),
    mode: str = Form("strict"),
    ref_audio_url: str = Form(""),
    x_scorer_key: str = Header("", alias="X-Scorer-Key"),
):
    want = os.environ.get("SCORER_KEY", "")
    if want and x_scorer_key != want:
        raise HTTPException(status_code=401, detail="Bad scorer key")
    data = await file.read()
    if len(data) > 2 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Audio too large")
    from asr import scoring as S
    from asr import sushrota as U

    t0 = time.time()
    try:
        wav = U.to_16k_mono(data)
    except Exception:
        raise HTTPException(status_code=422, detail="Could not decode audio")
    dur_ms = int(len(wav) / 16000 * 1000)
    if len(wav) > G.MAX_SECONDS * 16000:
        raise HTTPException(status_code=413, detail="Audio too long")
    model = _model()
    P = U.posteriors(model, wav, max_seconds=G.MAX_SECONDS)
    decodes = [U.greedy(P, b, model=model) for b in (0, 3, 6)]
    strict = (mode or "strict") != "liberal"
    ref_lines = (reference or "").split("\n")
    res = S.score(ref_lines, decodes, strict=strict)
    replay = None
    if ref_audio_url:
        try:
            replay = _replay_similarity(data, ref_audio_url)
        except Exception:
            replay = None
    ms = int((time.time() - t0) * 1000)
    log.info("score dur_ms=%d ms=%d status=%s", dur_ms, ms, res.get("status"))
    return {"ok": True, "status": res["status"], "lines": res["lines"],
            "percent_strict": res["percent_strict"], "percent_liberal": res["percent_liberal"],
            "n": res["n"], "heard": res["heard"], "duration_ms": dur_ms,
            "replay_similarity": replay, "model": "sushrota-v13b"}


def _replay_similarity(upload_bytes: bytes, ref_url: str) -> float | None:
    import numpy as np
    try:
        import librosa
    except Exception:
        return None
    from asr import sushrota as U
    if ref_url not in _REF_CACHE:
        import urllib.request
        with urllib.request.urlopen(ref_url, timeout=20) as r:
            _REF_CACHE[ref_url] = r.read()
    a = U.to_16k_mono(upload_bytes)
    b = U.to_16k_mono(_REF_CACHE[ref_url])
    # Log-mel + DTW on cosine distance; mean similarity along path.
    ma = librosa.feature.melspectrogram(y=a, sr=16000, n_mels=40)
    mb = librosa.feature.melspectrogram(y=b, sr=16000, n_mels=40)
    la = np.log(ma + 1e-6)
    lb = np.log(mb + 1e-6)
    # Cosine distance.
    def norm(x):
        n = np.linalg.norm(x, axis=0, keepdims=True) + 1e-9
        return x / n
    na, nb = norm(la), norm(lb)
    C = 1.0 - na.T @ nb
    D, wp = librosa.sequence.dtw(C=C)
    sims = []
    for i, j in wp:
        sims.append(1.0 - float(C[i, j]))
    return float(sum(sims) / len(sims)) if sims else None
