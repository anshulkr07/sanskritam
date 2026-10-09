"""Assemble verses: choose takes, join with gaps, time lines, encode, manifest.

Usage:
    python assemble.py --jobs chant_jobs.jsonl --renders gpu_out/renders.jsonl --qc gpu_out/qc.jsonl --out gpu_out [--no-encode]
"""

from __future__ import annotations

import argparse
import hashlib
import json
import random
import subprocess
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
import config as G  # noqa: E402


def _ends_virama(part: str) -> bool:
    return part.rstrip().endswith("\u094d") or part.rstrip().endswith("्")


def choose_takes(renders: list[dict], qc: dict[tuple, dict]) -> dict[tuple, dict]:
    """Per (uid, li, pj): lowest CER without flags, else lowest CER."""
    by_part: dict[tuple, list[dict]] = {}
    for r in renders:
        key = (r["verse_uid"], r["line_i"], r["part_j"])
        by_part.setdefault(key, []).append(r)
    out: dict[tuple, dict] = {}
    for key, takes in by_part.items():
        def qc_of(t):
            return qc.get((t["verse_uid"], t["line_i"], t["part_j"], t["seed"]), {})
        clean = [t for t in takes if not qc_of(t).get("flags")]
        pool = clean if clean else takes
        pool = sorted(pool, key=lambda t: (qc_of(t).get("cer", 1.0), t.get("seed", 0)))
        out[key] = pool[0]
    return out


def join_verse(line_parts: list[list[tuple]], sr: int = 24000):
    """Join parts with GAP_S / virama extra. Returns (audio, boundaries)."""
    import numpy as np
    gap = int(G.GAP_S * sr)
    extra = int(G.GAP_HALANT_EXTRA_S * sr)
    lead = int(G.LEAD_S * sr)
    tail = int(G.TAIL_S * sr)
    chunks: list = [np.zeros(lead, dtype=np.float32)]
    bounds: list[tuple[int, int]] = []
    pos = lead
    # line_parts: per line, list of (audio, part_text)
    for li, parts in enumerate(line_parts):
        start = pos
        for pi, (aud, text) in enumerate(parts):
            if pi > 0 or li > 0 or len(chunks) > 1 or pos > lead:
                # Gap before every part except the very first.
                if not (li == 0 and pi == 0):
                    prev_text = line_parts[li][pi - 1][1] if pi > 0 else line_parts[li - 1][-1][1]
                    g = gap + (extra if prev_text.rstrip().endswith("्") else 0)
                    chunks.append(np.zeros(g, dtype=np.float32))
                    pos += g
            chunks.append(np.asarray(aud, dtype=np.float32))
            pos += len(aud)
        # Gap between lines handled as the next line's leading gap; record end.
        end = pos
        bounds.append((start, end))
        # Add inter-line gap now (plus virama extra) unless last line.
        if li < len(line_parts) - 1:
            prev_text = parts[-1][1]
            g = gap + (extra if prev_text.rstrip().endswith("्") else 0)
            chunks.append(np.zeros(g, dtype=np.float32))
            pos += g
    chunks.append(np.zeros(tail, dtype=np.float32))
    audio = np.concatenate(chunks) if chunks else np.zeros(lead + tail, dtype=np.float32)
    return audio, bounds


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--jobs", required=True)
    ap.add_argument("--renders", required=True)
    ap.add_argument("--qc", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--no-encode", action="store_true")
    args = ap.parse_args()

    import numpy as np
    import soundfile as sf

    jobs = [json.loads(l) for l in Path(args.jobs).read_text(encoding="utf-8").splitlines() if l.strip()]
    renders = [json.loads(l) for l in Path(args.renders).read_text(encoding="utf-8").splitlines() if l.strip()]
    qc_rows = [json.loads(l) for l in Path(args.qc).read_text(encoding="utf-8").splitlines() if l.strip()]
    qc = {(r["verse_uid"], r["line_i"], r["part_j"], r["seed"]): r for r in qc_rows}
    takes = choose_takes(renders, qc)

    out = Path(args.out)
    audio_dir = out / "audio"
    audio_dir.mkdir(parents=True, exist_ok=True)
    manifest = out / "manifest.jsonl"

    # Cache wavs.
    wav_cache: dict[str, np.ndarray] = {}

    def load_wav(p: str):
        if p not in wav_cache:
            wav, _ = sf.read(p, dtype="float32")
            wav_cache[p] = np.asarray(wav, dtype=np.float32)
        return wav_cache[p]

    manifest_rows: list[dict] = []
    for job in jobs:
        uid = job["verse_uid"]
        lines = job.get("lines", [])
        # All parts done?
        ready = True
        for ln in lines:
            for pj in range(len(ln.get("parts", []))):
                if (uid, ln["i"], pj) not in takes:
                    ready = False
        if not ready:
            continue
        line_parts: list[list[tuple]] = []
        reasons: list[str] = []
        meter = ""
        fallback = False
        for ln in lines:
            parts = []
            for pj, part in enumerate(ln.get("parts", [])):
                t = takes[(uid, ln["i"], pj)]
                meter = t.get("meter", meter)
                fallback = fallback or bool(t.get("meter_fallback"))
                q = qc.get((uid, ln["i"], pj, t.get("seed")), {})
                if q.get("flags"):
                    reasons.append(f"part_{ln['i']}_{pj}:" + "+".join(q["flags"]))
                parts.append((load_wav(t["path"]), part))
            line_parts.append(parts)
        audio, bounds = join_verse(line_parts)
        # Timings.
        timed = []
        for ln, (s, e) in zip(lines, bounds):
            timed.append({"i": ln["i"], "text": ln.get("text", ""), "kind": ln.get("kind", "verse"),
                          "start_ms": int(round(s / 24000 * 1000)), "end_ms": int(round(e / 24000 * 1000))})
        duration_ms = int(round(len(audio) / 24000 * 1000))
        # Encode.
        if args.no_encode:
            fname = f"{uid}-test.wav"
            sf.write(str(audio_dir / fname), audio, 24000)
            file_bytes = Path(audio_dir / fname).read_bytes()
        else:
            p = subprocess.run(
                ["ffmpeg", "-y", "-f", "f32le", "-ar", "24000", "-ac", "1", "-i", "pipe:0",
                 "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "24000", "-ac", "1",
                 "-c:a", "aac", "-b:a", "64k",
                 "-f", "mp4", "-movflags", "frag_keyframe+empty_moov", "pipe:1"],
                input=audio.astype(np.float32).tobytes(), capture_output=True)
            if p.returncode != 0:
                print(f"encode failed {uid}: {p.stderr[-500:]}")
                continue
            file_bytes = p.stdout
            fname = f"{uid}-{hashlib.sha256(file_bytes).hexdigest()[:12]}.m4a"
            (audio_dir / fname).write_bytes(file_bytes)
        # qc_status.
        qc_reasons = list(reasons)
        if fallback:
            qc_reasons.append("unknown_meter")
        if job.get("vedic"):
            qc_reasons.append("vedic")
        if lines and lines[0].get("kind") == "speaker":
            qc_reasons.append("speaker_first")
        status = "needs_listen" if qc_reasons else "auto_ok"
        manifest_rows.append({"verse_uid": uid, "source_ref": job.get("source_ref", ""),
                              "voice": G.VOICE, "meter": meter + (" (fallback)" if fallback else ""),
                              "file": fname, "duration_ms": duration_ms, "lines": timed,
                              "qc_status": status, "qc_reasons": qc_reasons,
                              "vedic": bool(job.get("vedic")), "source_commit": G.SOURCE_COMMIT})

    with open(manifest, "w", encoding="utf-8") as f:
        for r in manifest_rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    # review.html
    rng = random.Random(7)
    auto = [r for r in manifest_rows if r["qc_status"] == "auto_ok"]
    sample = set(rng.sample([r["verse_uid"] for r in auto], max(0, int(len(auto) * 0.05)))) if auto else set()
    shown = [r for r in manifest_rows if r["qc_status"] == "needs_listen" or r["verse_uid"] in sample]
    rows_html = []
    for r in shown:
        lines_html = "".join(
            f"<li>{ln['i']}: {ln['text']} ({ln['start_ms']}..{ln['end_ms']} ms)</li>" for ln in r["lines"])
        rows_html.append(
            f"<div class='row' data-uid='{r['verse_uid']}'><h3>{r['source_ref']} "
            f"<small>{r['verse_uid']} {r['qc_status']} {','.join(r['qc_reasons'])}</small></h3>"
            f"<audio controls src='audio/{r['file']}'></audio><ul>{lines_html}</ul>"
            f"<button onclick=\"decide('{r['verse_uid']}','approved')\">Approve</button> "
            f"<button onclick=\"decide('{r['verse_uid']}','rejected')\">Reject</button> "
            f"<span id='s-{r['verse_uid']}'></span></div>")
    html = ("<!doctype html><html><head><meta charset='utf-8'><title>Chant review</title>"
            "<style>body{font-family:system-ui;margin:2rem}.row{border:1px solid #ccc;padding:1rem;margin:1rem 0}</style></head><body>"
            "<h1>Chant review</h1><button onclick='download()'>Download decisions</button>"
            "<div id='rows'>" + "".join(rows_html) + "</div>"
            "<script>var D=JSON.parse(localStorage.getItem('chant_decisions')||'{}');"
            "function decide(u,v){D[u]=v;localStorage.setItem('chant_decisions',JSON.stringify(D));"
            "document.getElementById('s-'+u).textContent=v;}"
            "for(var u in D){var e=document.getElementById('s-'+u);if(e)e.textContent=D[u];}"
            "function download(){var b=new Blob([JSON.stringify(D)],{type:'application/json'});"
            "var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='decisions.json';a.click();}"
            "</script></body></html>")
    (out / "review.html").write_text(html, encoding="utf-8")
    print(f"manifest: {len(manifest_rows)} verses, review rows: {len(shown)}")


if __name__ == "__main__":
    main()
