# Code to video

Continue video work in this folder. Owner choice, 5 November 2026:
**solid Three.js 3D and illustrated puppets**. Manim is retained only as an
earlier experiment; do not use it for new reels unless requested.

## Start here

- `prahlada/`: editable scenes, story scripts, Sarvam narration, render/export scripts.
- `outputs/prahlada/comparison-30/`: existing 30-second videos, cached voice,
  verification files and `play-with-sound.html` (local, ignored by Git).
- `LEARNINGS.md`: decisions, limits, reference observations and tool comparison.

From this folder:

```powershell
./prahlada/render.ps1 -Style threejs
./prahlada/render.ps1 -Style puppets
```

The wrapper resolves the repository root regardless of the current directory.
Sarvam continues through the existing backend client and project configuration.
This folder is part of the Sanskrit repository, not a standalone repository:
it still needs `../backend`, its virtual environment and existing environment
configuration. No secrets are copied here. Narration is cached by request hash;
new or changed text makes paid Sarvam requests. Both styles share the same audio.

Direct commands from the repository root:

```powershell
backend/.venv/Scripts/python.exe codetovideo/prahlada/narrate.py --short
node codetovideo/prahlada/render-illustrated.mjs --short --3d
node codetovideo/prahlada/render-illustrated.mjs --short
python codetovideo/prahlada/voice-delivery.py
```

The last command exports voice-only stereo copies and an explicit unmuted local
player using existing videos. The wrapper prepares the original animation
timeline and score as well, so use it for a fresh output directory.

Three.js and Puppeteer currently come from the installed video-tool runtime;
FFmpeg, FFprobe, Chrome and Node are also required. Paths can be overridden with
`VIDEO_RUNTIME_NODE_MODULES` and `VIDEO_CHROME`. See the episode README for the
earlier Manim experiments and delivery provenance.

Migration checked on 5 November 2026: both renderers produced ten preview frames
from the new paths; `render.ps1 -PrepareOnly` completed using cached Sarvam audio;
the two voice exports passed full decoding and retained their pre-move hashes.
JavaScript syntax and Python compilation checks passed. All existing local media
was moved into `outputs/`, which is excluded from Git.
