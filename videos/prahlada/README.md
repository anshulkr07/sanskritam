# Prahlada: Faith without fear

A basic one-minute portrait film built with Manim Community Edition 0.22.0.
All characters, palace architecture, light, movement and transitions are Python
vector geometry. No image generator or video-generation model is used.

Hindi narration uses the existing `backend/app/services/sarvam.py` client,
project configuration, Bulbul v3 and the `aditya` voice. English captions are
burned into the video. A quiet original score is synthesized from sine waves.
The eight scenes share a midnight blue, gold and teal palette. The final scene's
reflection is editorial commentary, not a quotation from scripture.

## Reproduce

From the repository root:

```powershell
./videos/prahlada/render.ps1
```

The script defaults to the installed Manim CE environment under the user's
`.codex/mcp/video-tools/python-ce/` directory. Supply `-ManimPython` to use
another Python with Manim CE 0.22.0, numpy and Pillow. FFmpeg and FFprobe must
be on PATH. Narration runs in the backend's existing virtual environment and
reads the project's Sarvam configuration without copying or printing secrets.

The first run makes eight paid Sarvam TTS calls; subsequent runs reuse WAVs
keyed by the complete request, including text, model, voice and pace. Changing
a narration request regenerates only that clip. The generated track uses a
measured pace adjustment to fit 60 seconds, with a guard against excessive
acceleration. Eight scene durations add up to exactly 1,800 frames at 30 fps.

Outputs are in ignored `results/videos/prahlada/`:

- `prahlada-narasimha-60s.mp4`: 720 × 1280 H.264/AAC delivery.
- `narration.wav`, `score.wav`: separate audio tracks.
- `timeline.json`: measured audio durations and scene timing.
- `subtitles-en.srt`: separate English captions.
- `poster.jpg`, `contact-sheet.jpg`: visual review frames.
- `verification.json`: dimensions, codecs, duration, hash and full decode check.

Generated media is local and excluded from Git. This standalone example does
not change the application, upload to R2, or publish to YouTube.

## Sources and adaptation

Original short Hindi retelling, based on the Bhagavata Purana:

- [7.8.7](https://vedabase.io/en/library/sb/7/8/7/): the divine source of strength.
- [7.8.12–18](https://vedabase.io/en/library/sb/7/8/): the challenge, the strike
  with a fist and the appearance from the pillar.
- [7.8.29](https://vedabase.io/en/library/sb/7/8/29/): the defeat at the doorway;
  the chapter summary also identifies evening.
- [7.9.5–6](https://vedabase.io/en/library/sb/7/9/5/): Prahlada approaches in
  reverence and receives the Lord's grace.

The defeat is represented symbolically by the falling crown. The dialogue is
paraphrased for the short narration, rather than presented as a literal verse
translation. The lion-faced figure is a deliberately simple devotional icon.

## Delivery verification — 4 November 2026

The delivered MP4 is 60.000 seconds, 720 × 1280, 30 fps, 1,800 video frames,
H.264 with 48 kHz AAC audio, and 3,274,700 bytes. A full FFmpeg decode passed.
Audio peak measured -1.3 dBFS. All eight scenes were inspected in a contact
sheet, and the Narasimha frame was also checked at full resolution for framing
and caption readability. Python compilation checks passed for all three scripts.
No human listening review is recorded.

SHA-256: `dfa2ba9521dbff2c857b6e4aba3e0f0cac84f3ce02bf82038d02bc0dbf838d97`.
