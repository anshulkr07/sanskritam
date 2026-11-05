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

## Three 30-second comparisons

The owner selected three complete 30-second versions of the same incident on
5 November 2026. They share fresh Hindi Sarvam Bulbul v3 / aditya narration,
English captions and an original quiet score. The shortened script plays at
natural speed (1.0), with pauses bringing it to exactly 30 seconds.

The [devanshu.motion Samudra Manthan reel](https://www.instagram.com/devanshu.motion/reel/De5e8wKSjsd/)
was inspected in the owner's logged-in Instagram browser. Its description names
Tholu Bommalata shadow puppets. Jointed patterned figures, layered scenery and
glows create depth. The exact libraries used for that reel are unverified.
No creator artwork, footage or audio is copied.

- `three-dimensional.mjs`: Three.js 0.186.1 solid mesh characters, articulated
  joints, walking, pointing, recoil, a splitting pillar, falling crown, kneeling,
  camera shots, lighting and shadows. Repeated geometry is batched inside joints.
- `illustrated.mjs`: original patterned cutout puppets on a layered Three.js stage,
  inspired by the reference's broad visual approach. This is 2.5D, not solid 3D.
- `manim_3d.py`, `Prahlada30`: Manim ThreeDScene, faceted geometric figures,
  an orbiting perspective camera and an animated palace scene.

These are basic style prototypes, not production character rigs. There is no
phoneme lip sync, cloth simulation or motion capture. The king's defeat is
symbolized by his retreat and a falling crown, without graphic violence.

### Reproduce the comparison

FFmpeg and FFprobe must be on PATH. Use the existing backend virtual environment
for Sarvam and a Manim CE environment with Pillow for rendering and finishing.
The Three.js renderer uses installed `three`, `puppeteer-core` and Chrome;
override `VIDEO_RUNTIME_NODE_MODULES` and `VIDEO_CHROME` if needed.

```powershell
backend/.venv/Scripts/python.exe videos/prahlada/narrate.py --short
# The original narration establishes the source animation timeline; cached on repeat runs.
backend/.venv/Scripts/python.exe videos/prahlada/narrate.py
& "$env:USERPROFILE/.codex/mcp/video-tools/python-ce/Scripts/python.exe" videos/prahlada/finish.py --score-only
node videos/prahlada/render-illustrated.mjs --short --3d
node videos/prahlada/render-illustrated.mjs --short
& "$env:USERPROFILE/.codex/mcp/video-tools/python-ce/Scripts/python.exe" -m manim render --renderer cairo --fps 15 -r 720,1280 --media_dir results/videos/prahlada/comparison-30/manim -o manim-raw.mp4 videos/prahlada/manim_3d.py Prahlada30
& "$env:USERPROFILE/.codex/mcp/video-tools/python-ce/Scripts/python.exe" videos/prahlada/finish-comparison.py
```

Each narration request is cached by its content hash. The two Three.js treatments
map each shortened scene to the corresponding original animation interval,
preserving the sequence and replacing captions with the shorter script. Outputs
are 720 x 1280, 15 fps H.264/AAC in ignored
`results/videos/prahlada/comparison-30/`:

- `prahlada-threejs-3d-30s.mp4`
- `prahlada-shadow-puppets-30s.mp4`
- `prahlada-manim-3d-30s.mp4`

The finishing script fully decodes each output, records duration, dimensions,
codecs and SHA-256 hashes, and creates eight-frame contact sheets for review.
No media is uploaded or integrated into the app.

Three.js suits these character scenes; Manim suits geometric explanations.
For a future quality step involving richer anatomy, facial rigs and cloth,
[Blender's animation tools](https://www.blender.org/features/animation/) would be
appropriate. Blender is not used in these prototypes.

### Comparison delivery verification — 5 November 2026

All three deliveries are exactly 30.000 seconds, 720 x 1280, 15 fps / 450
frames, H.264 with AAC audio. Full FFmpeg decodes passed. Eight story frames
per treatment were visually reviewed; the Manim floor was changed to a wireframe
after a preview revealed Cairo depth-sorting occlusion. JavaScript syntax and
Python compilation checks passed. No human listening review is recorded.

- `prahlada-threejs-3d-30s.mp4`: 13,353,969 bytes; SHA-256 `a7884831365e6032249864be5199b768352807d09a861c36b777fbee165c063b`.
- `prahlada-shadow-puppets-30s.mp4`: 9,217,589 bytes; SHA-256 `62daf233226563aa6a435c3c7a2527cf3f5d83d13d1fd5e8485224a5a6a2f923`.
- `prahlada-manim-3d-30s.mp4`: 2,247,173 bytes; SHA-256 `4a87401f0b885879e0ca6537e10271aacc1c055250f615e19a7b2ec48e533f92`.
