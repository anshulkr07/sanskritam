> **SUPERSEDED 2026-08-30 — do not implement §2 or §3 of this spec.**
>
> Sanskritam is **API-only: no local models, anywhere** (architecture.md §1). The app ships to phones and
> we run no inference servers, no GPU box and no local batch. That removes the Parler batch renderer
> (§2) and the Vāgdhenu wrapper (§3) from the design entirely.
>
> - **§1 ASR latency bench — still valid**, and extended: bench `saaras:v4` against `saaras:v3` on
>   real code-mixed audio, including the silence case (v3 returned `अस्तु अस्तु` on 1 s of digital
>   silence; v4 returned empty).
> - **§2 Parler batch renderer — cancelled.** `app/services/parler.py` and `scripts/render_parler.py`
>   are dead code to be deleted, along with their tests. Sanskrit synthesis is Bulbul `sa-IN`
>   (architecture.md §4.1); the equivalent renderer is `scripts/render_sarvam.py`, which already exists.
> - **§3 Vāgdhenu wrapper — cancelled.** `app/services/vagdhenu.py` to be deleted. Chant has no hosted
>   engine; see architecture.md §4.1 for the three ways out.
>
> §1 below is live. §2 and §3 are struck in place — they say what to delete, not what to build.

# Spec B — Speech bench harnesses (build order step 2)

## Context

Sanskritam (D:\Projects\Shabd) backend, FastAPI + SQLAlchemy, Python 3.11, Windows/git-bash, venv `backend/.venv`. Sarvam key exists in `backend/.env` as `SARVAM_API_KEY`. Existing client: `backend/app/services/sarvam.py` (async httpx wrapper, `SarvamClient.text_to_speech` / `speech_to_text`, config via `app.config.settings`).

Architecture doc (architecture.md): build-order step 2 = **Saaras ASR latency bench** (p50/p95 on code-mixed audio; "the entire live budget" for conversation per §12: target 600–900 ms/turn, so ASR must be ≲500-800 ms). The former step 1 (a local batch-TTS throughput spike) is cancelled — synthesis is Bulbul `sa-IN`, a hosted API.

This is an offline measurement tool, NOT request-path code. It must run with no API key present: graceful skip with a clear message.

## Build

### 1. ASR latency bench — `backend/scripts/bench_asr.py`

CLI: `python scripts/bench_asr.py [--n 10] [--seconds 4] [--out results/bench_asr.json] [--synthetic]`

- Generates/loads test audio: option A `--synthetic` — synthesize test WAVs offline with numpy (sine/noise shaped, 16 kHz mono — no network needed) — this is the DEFAULT so the bench always runs; option B: use files in `results/audio/` if present.
- For each of n iterations: time a full round trip of `SarvamClient.speech_to_text` (bytes → transcript) using asyncio.run. Record per-call latency ms + transcript length.
- Report p50/p95/mean/min/max in ms, print a table, write JSON to `--out`.
- Print a verdict line comparing against the budget: `PASS: p50 ≤ 800ms fits §12 turn budget` or `FAIL: p50 Xms exceeds 800ms budget — live conversation at risk`.
- Handle SarvamError / network failure with a clean message and non-zero exit. Key missing → exit with "SARVAM_API_KEY not configured".
- Concurrency note: run calls sequentially (matches turn-taking reality); note in docstring that concurrent-mode is future work.

### 2. ~~Parler batch renderer~~ — **CANCELLED 2026-08-30**

Sanskritam is API-only: **no local models, anywhere** (architecture.md §1). Sanskrit synthesis is Bulbul
`sa-IN`, and the equivalent renderer already exists as `backend/scripts/render_sarvam.py`.

**Action for whoever picks this up: delete, do not build.** `backend/app/services/parler.py`,
`backend/scripts/render_parler.py`, `backend/scripts/build_render_items.py`'s Parler paths, and the
Parler tests in `backend/tests/test_speech_bench.py` are dead code. Remove `results/parler/` too.

### 3. ~~Vāgdhenu wrapper~~ — **CANCELLED 2026-08-30**

Same reason. **Delete `backend/app/services/vagdhenu.py`** and its tests.

Chant is now an open product question rather than an engineering task: no hosted API synthesises
metre-aware Sanskrit chant, so daily śloka ships as spoken recitation unless we buy licensed human
recordings. See architecture.md §4.1.

### 4. Tests — `backend/tests/test_speech_bench.py`

- `bench_asr.py` `--synthetic --n 2` path with Sarvam client MOCKED (monkeypatch `SarvamClient.speech_to_text` with an async stub returning fake transcript + sleeping 10ms): asserts the JSON output has p50/p95 and the PASS/FAIL verdict logic works (test both sides of the threshold by parametrizing the stub sleep).
- `render_sarvam.py --dry-run` on a 3-item plan passes and on a duplicate-id plan fails.
- Use tmp_path fixtures; do not write into the repo except `results/` (add `results/` to .gitignore if not already).

## Constraints

- Do NOT touch routers, main.py, models, grading, existing sarvam.py (import it, don't modify).
- Windows/git-bash: no shell-only tricks; pure Python subprocess where needed.
- numpy: check requirements.txt — add nothing to requirements.txt. **No model or GPU dependencies at all** (architecture.md §1).

## Output

Report: files created, bench JSON structure, dry-run outputs, pytest result for the new test file.
