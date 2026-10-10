"""Render chant jobs with Vagdhenu (venv-tts, needs CUDA + the clone).

Usage:
    python tts/render_jobs.py --jobs chant_jobs.jsonl --out gpu_out [--reseed gpu_out/qc.jsonl] [--limit N]
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import config as G  # noqa: E402


def _load_renderer():
    here = Path(__file__).resolve().parent.parent
    sys.path.insert(0, str(here / "vagdhenu" / "src"))
    sys.path.insert(0, str(here / "Vagdhenu" / "src"))
    sys.path.insert(0, str(here / "BigVGAN"))
    sys.path.insert(0, str(here))
    # torchaudio 2.9 removed its soundfile dispatcher: ta.load() now demands
    # torchcodec, which has no build for this container's torch. Vagdhenu only
    # needs (Tensor[C, T], sr) for short reference clips, so route load()
    # through soundfile in OUR wrapper (his clone is untouched).
    try:
        import torchaudio

        _orig_load = torchaudio.load

        def _sf_load(path, *a, **k):
            import soundfile as sf
            import torch

            data, sr = sf.read(str(path), dtype="float32", always_2d=True)
            return torch.from_numpy(data.T.copy()), sr

        torchaudio.load = _sf_load
    except Exception:
        pass
    import render_core  # type: ignore

    r = render_core.Renderer(
        "models/voice_steer_ema_2026-06-17.pt",
        "models/voc_bigvgan_EMA_2026-06-11.pth",
        "vagdhenu/src/reference_bank/bank.json",
        device="cuda",
    )
    bank = json.loads(Path("vagdhenu/src/reference_bank/bank.json").read_text(encoding="utf-8"))
    return render_core, r, bank


def _bank_lookup(bank: dict, meter: str) -> float:
    lut = _build_lut(bank)
    e = lut.get((meter or "").lower())
    try:
        return float(e["sec_per_syll"])
    except Exception:
        return 0.33


def _build_lut(bank: dict) -> dict:
    """Mirror render_core's bank LUT: JSON keys AND wav stems, lowercased.

    The detector returns ASCII names ('anushtubh') while the JSON keys carry
    diacritics ('anuṣṭubh'); the LUT's wav-stem aliases ('anushtubh') are what
    resolve them. Checking membership against the raw keys alone falls back
    for every verse (caught 2026-10-09 after the first full run).
    """
    lut: dict = {}
    for k, v in bank.items():
        if k.startswith("_") or not isinstance(v, dict) or "wav" not in v:
            continue
        lut[k.lower()] = v
        lut[str(v["wav"]).replace(".wav", "").lower()] = v
    return lut


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--jobs", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--reseed", default="")
    ap.add_argument("--reseed-seeds", default="",
                    help="comma-separated seeds to try instead of config RESEEDS (fresh ones once those are used up)")
    ap.add_argument("--reseed-flags", default="",
                    help="comma-separated QC flags worth a new seed (default: any flag)")
    ap.add_argument("--force-meter", default="",
                    help="render with this reference metre instead of the detected one (a verse whose metre "
                         "is not recognised stays marked unknown_meter; the take records meter_forced)")
    ap.add_argument("--limit", type=int, default=0)
    args = ap.parse_args()

    import soundfile as sf

    render_core, renderer, bank = _load_renderer()
    jobs = [json.loads(l) for l in Path(args.jobs).read_text(encoding="utf-8").splitlines() if l.strip()]
    if args.limit:
        jobs = jobs[: args.limit]

    wanted: set[tuple] | None = None
    reseed_seeds: dict[tuple, list[int]] = {}
    if args.reseed:
        from tts.plan import plan_reseeds
        only = {f.strip() for f in args.reseed_flags.split(",") if f.strip()} or None
        seeds_to_try = [int(x) for x in args.reseed_seeds.split(",") if x.strip()] or G.RESEEDS
        plan = plan_reseeds(args.reseed, seeds_to_try, only)
        wanted = set(plan.keys())
        reseed_seeds = plan

    out = Path(args.out)
    renders_dir = out / "renders"
    renders_dir.mkdir(parents=True, exist_ok=True)
    renders_log = out / "renders.jsonl"

    done = 0
    audio_s = 0.0
    wall_s = 0.0
    n = 0
    for job in jobs:
        uid = job["verse_uid"]
        lines = job.get("lines", [])
        verse_tts = "\n".join(ln["tts"] for ln in lines if ln.get("kind") == "verse") or "\n".join(
            ln["tts"] for ln in lines)
        try:
            meter = render_core.detect_meter_key(verse_tts) or ""
        except Exception:
            meter = ""
        lut = _build_lut(bank)
        fallback = False
        if not meter or meter.lower() not in lut:
            meter = "vasantatilaka"
            fallback = True
        forced = False
        if args.force_meter:
            fm = args.force_meter.strip().lower()
            if fm not in lut:
                raise SystemExit(f"--force-meter {args.force_meter!r} is not in the reference bank")
            meter, forced = fm, True      # `fallback` stays as detected: the metre is still not recognised
        sps = _bank_lookup(bank, meter)
        for ln in lines:
            li = ln["i"]
            for pj, part in enumerate(ln.get("parts", [])):
                key = (uid, li, pj)
                seeds = reseed_seeds.get(key, [G.FIRST_SEED]) if wanted is not None else [G.FIRST_SEED]
                if wanted is not None and key not in wanted:
                    continue
                for seed in seeds:
                    path = renders_dir / uid / f"{li}_{pj}_s{seed}.wav"
                    if path.exists():
                        continue
                    t0 = time.time()
                    try:
                        sr, audio = renderer.render_one([part], meter, seed=G.FIRST_SEED if seed == G.FIRST_SEED else seed)
                    except Exception as e:
                        print(f"render failed {uid} {li}/{pj} s{seed}: {e}")
                        continue
                    wall = time.time() - t0
                    path.parent.mkdir(parents=True, exist_ok=True)
                    sf.write(str(path), audio, 24000)
                    secs = len(audio) / 24000.0
                    audio_s += secs
                    wall_s += wall
                    n += 1
                    syl = ln.get("syllables", 0)
                    rec = {"verse_uid": uid, "line_i": li, "part_j": pj, "seed": seed,
                           "meter": meter, "meter_fallback": fallback, "path": str(path),
                           "seconds": secs, "syllables": syl, "sec_per_syll": sps}
                    if forced:
                        rec["meter_forced"] = True
                    with open(renders_log, "a", encoding="utf-8") as f:
                        f.write(json.dumps(rec) + "\n")
                    if n % 20 == 0:
                        rtf = wall_s / audio_s if audio_s else 0
                        print(f"{n} renders audio={audio_s:.1f}s wall={wall_s:.1f}s rtf={rtf:.2f}")
    if audio_s:
        print(f"done renders={n} audio_s={audio_s:.1f} rtf={wall_s / audio_s:.2f}")


if __name__ == "__main__":
    main()
