"""Two ACE-Step lyric-edit experiments guided by the Eleven Music recording.

The supplied reference is an original song generated for this project.
Phonetic lyrics are a pronunciation experiment, not a translated song.
Uses the existing fal queue helper so jobs resume without duplicate submissions.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import os

from dotenv import dotenv_values

import render_ram_fal as fal

PHONETIC = """[Chorus]
Jaya jaya Raama, jaya jaya Raama! Hridaye gunjati tava naama.
Taalam taalam, padam padam! Gaayaami te charitam shubham.
[Verse]
Raamo veerah, Raamo dheerah! Satya-pathe sadaa sthirah.
Lobhaat doorah, krodhaat doorah! Karunaa-poorno Raghuveerah.
Raajyam tyaktam, vachanam rakshitam! Vana-pathe pi nripena hasitam.
Dhanur-haste, dhairyam chitte! Raamasya tejo mamaapi chitte.
Na me lobhah, na me bhayam! Raama-smaranam mama balam param.
Uttishthaami, prachalaami! Satyam vadaami, shubham charaami.
Dvesham tyajaami, prema bhajaami! Sarveshaam hitam-aacharaami.
[Chorus]
Jaya jaya Raama, jaya jaya Raama! Mama jeevane tava naama!
"""


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--variant", choices=["devanagari", "phonetic", "all"], default="all")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    source = fal.BACKEND / "results/ram_song_demo/ram_pathe_sung.mp3"
    source_bytes = source.read_bytes()
    original = fal.payloads()["ace_step"]
    tags = original["tags"]
    # Data URIs are supported by fal. Never print or log the encoded audio.
    audio = "data:audio/mpeg;base64," + base64.b64encode(source_bytes).decode("ascii")
    common = dict(audio_url=audio, edit_mode="lyrics", original_tags=tags,
                  original_lyrics=original["lyrics"], tags=tags,
                  number_of_steps=50, seed=108,
                  lyric_guidance_scale=2.0, tag_guidance_scale=5.0)
    names = ["devanagari", "phonetic"] if args.variant == "all" else [args.variant]
    fal.OUT = fal.BACKEND / "results/ram_ace_reference"
    fal.OUT.mkdir(parents=True, exist_ok=True)
    fal.MODELS = {name: "fal-ai/ace-step/audio-to-audio" for name in names}
    fal.write_json(fal.OUT / "reference.json", {
        "source": str(source), "sha256": hashlib.sha256(source_bytes).hexdigest(),
        "method": "ACE-Step reference-audio lyrics editing, not independent text-to-music generation",
        "estimated_total_cost_usd": round(len(names)*55*.0002, 3),
        "phonetic_note": "Approximate Latin sound spellings for pronunciation comparison; retain Devanagari as authoritative lyrics.",
    })
    values = {}
    for path in (fal.BACKEND.parent / ".env", fal.BACKEND / ".env"):
        if path.exists():
            values.update(dotenv_values(path))
    key = os.environ.get("FAL_KEY") or values.get("FAL_KEY")
    if not key and not args.dry_run:
        raise SystemExit("FAL_KEY is not configured")
    failures = []
    for name in names:
        body = dict(common, lyrics=original["lyrics"] if name == "devanagari" else PHONETIC)
        if args.dry_run:
            preview = dict(body, audio_url=f"<reference audio: {source.name}>")
            fal.write_json(fal.OUT / f"{name}_preview.json", preview)
            print(f"Prepared {name}; no API call made.", flush=True)
            continue
        try:
            fal.generate(name, body, key)
        except Exception as exc:
            # Avoid echoing a validation response that could contain reference base64.
            print(f"{name}: failed ({type(exc).__name__}); saved queue state can be resumed.", flush=True)
            failures.append(name)
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
