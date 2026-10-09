# GPU folder: chant rendering (Vagdhenu) + scoring (Su-srota)

Runbook copy of handover_recite.md section 14, kept current.

## 1. Machine
GB10 already rented (`ssh spark`). 235 GB free, needs about 30 GB.
GPU shared with ComfyUI. Run Phase 0 alongside it. Start full render when
ComfyUI batch is done. Never pip install into system Python. Never stop ComfyUI.

## 2. Copy
Copy repo `gpu/` and `chant_jobs.jsonl` (from `python -m scripts.chant_export`)
to the machine. Never copy `.env` or keys.

```
cd backend && PYTHONUTF8=1 python -m scripts.chant_export --out ../gpu_jobs/chant_jobs.jsonl
python -m scripts.chant_export --out ../gpu_jobs/chant_jobs_sample.jsonl --sample 20
scp -r gpu chant_jobs.jsonl spark:~/
```

## 3. Setup
`bash gpu/setup_vast.sh` (20 to 40 min, not verified).

## 4. Phase 0
```
python gpu/phase0.py --jobs chant_jobs_sample.jsonl --out gpu_out
```
Needs renders first for the sample:
```
venv-tts/bin/python gpu/tts/render_jobs.py --jobs chant_jobs_sample.jsonl --out gpu_out
venv-asr/bin/python gpu/asr/qc_renders.py --renders gpu_out/renders.jsonl --jobs chant_jobs_sample.jsonl --out gpu_out/qc.jsonl
```
Send `gpu_out/phase0.json` back. Listen in `gpu_out/review.html`
(`cd gpu_out && python -m http.server`).

## 5. Render everything (tmux)
```
venv-tts/bin/python gpu/tts/render_jobs.py --jobs chant_jobs.jsonl --out gpu_out
venv-asr/bin/python gpu/asr/qc_renders.py --renders gpu_out/renders.jsonl --jobs chant_jobs.jsonl --out gpu_out/qc.jsonl
venv-tts/bin/python gpu/tts/render_jobs.py --jobs chant_jobs.jsonl --out gpu_out --reseed gpu_out/qc.jsonl
venv-asr/bin/python gpu/asr/qc_renders.py --renders gpu_out/renders.jsonl --jobs chant_jobs.jsonl --out gpu_out/qc.jsonl
venv-asr/bin/python gpu/assemble.py --jobs chant_jobs.jsonl --renders gpu_out/renders.jsonl --qc gpu_out/qc.jsonl --out gpu_out
```
Estimate: 3.5 to 4.5 h chant, 4.5 to 5.5 GPU-h for one take, plus reseeds.

## 6. Review and import: see handover section 14 step 6.

## 7. Scorer
Run `gpu/asr/server.py` (or Dockerfile.gpu) on a datacenter GPU host, or
Dockerfile.cpu on CPU if fast enough. HTTPS in front (Cloudflare Tunnel).
Never expose 8090 openly. Set SCORER_URL + SCORER_KEY in backend deploy env.

## Tests (CPU only)
`python -m pytest -q tests` in a scratch venv with only numpy, soundfile, pytest.
Must not need torch, NeMo or GPU.
