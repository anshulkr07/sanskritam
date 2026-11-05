# Framework comparison â€” Prahlada, 30 seconds

Requested comparison: PixiJS + Spine, Babylon.js, Remotion + React Three Fiber.
The owner confirmed no Spine Editor license and chose **PixiJS without Spine**.
No Spine runtime or assets are included. This does not test Spine's rig authoring,
IK, mesh deformation or animation mixing.

All treatments use the same original project characters, blocking, source story,
shortened English captions and cached Sarvam Hindi narrator. They are 720 x 1280,
30 fps, 30 seconds. These are comparisons of implementation/workflow, not a claim
that one engine automatically produces better art. No new generated images or
creator assets are used. The earlier art policy and source provenance remain in
`../prahlada/README.md` and `../LEARNINGS.md`.

## Implementation

- **PixiJS 8** actually renders 125 textured meshes. The original Three.js puppet
  scene is used as an asset/rig and projection helper, with no Three.js WebGL
  renderer. Projected quads, texture uploads and compositing are native PixiJS.
  This is a bridge comparison, not a wholly independent PixiJS rigging system.
- **Babylon.js 9** actually renders 182 native Babylon meshes. Shared procedural
  geometry and joint poses are translated into Babylon VertexData, TransformNodes
  and PBR materials, with a native Babylon camera and lights. The prototype does
  not yet use Babylon skeletal clips, physics or the original Three.js shadow setup.
- **Remotion 4 + React Three Fiber 9** uses ThreeCanvas and an R3F primitive scene,
  a frame-driven layout effect, JSX overlays and Remotion Audio. Remotion CLI exports
  it. It uses the same original procedural Three.js scene, not a video texture or
  previously rendered MP4. This is a retained-scene integration; a full declarative
  JSX character library would be further work.

The shared scene factories are snapshots adapted from `../prahlada/` by removing
its renderer, DOM playback and overlays. `shared.mjs` maps each shortened speech
scene onto the corresponding original animation interval. Keep these snapshots
aligned deliberately if the original character designs change.

## Reproduce

From this folder (Node, Chrome, FFmpeg and FFprobe required):

```powershell
npm ci
npm run prepare
npm run studio
# In another terminal:
npm run stills:pixi
npm run stills:babylon
npm run pixi
npm run babylon
npm run render:remotion
& "$env:USERPROFILE/.codex/mcp/video-tools/python-ce/Scripts/python.exe" verify.py
```

`prepare` copies existing cached Sarvam audio into ignored `public/sarvam.m4a`;
no new TTS requests are made. If it is missing, run the preparation workflow in
`../README.md` first. Babylon/Pixi copy the AAC voice stream into the final MP4.
Remotion uses it as an Audio component and encodes its output audio.

Outputs and render logs: `../outputs/framework-tests/`. The finishing check fully
decodes every video, checks duration/frame count and audio levels, creates eight
story frames per treatment, records hashes, and writes `play-with-sound.html`.
Do not commit generated audio, media, node_modules or build caches.

## Decision criteria

- For regular illustrated reels, direct Three.js puppets or PixiJS can both work.
  The prototype reuses the same rig, so it does not establish an authoring-speed
  advantage for a new PixiJS/Spine asset workflow.
- Babylon's engine features may help if physics, game-like interactions or its
  authoring tools become concrete requirements. This scene alone cannot compare
  those features or establish a performance winner.
- Remotion/R3F preserves Three.js visual capability and adds a video composition
  workflow for durations, audio, text and exports. It is complementary to Three.js.
- Artwork, reusable rigs, actions and scene data matter more than changing the
  renderer. These examples reuse the existing limited acting and do not demonstrate
  lip sync, production facial rigs or complex choreography.

Official references:

- https://pixijs.com/
- https://esotericsoftware.com/spine-editor-license (Spine runtime integration terms)
- https://www.babylonjs.com/specifications/
- https://www.remotion.dev/docs/three

## Delivery verification — 5 November 2026

All three outputs passed a full FFmpeg decode and checks for 720 x 1280,
30 fps and 900 video frames. Eight story frames per treatment were visually
reviewed. Each AAC narration track measured mean -18.1 dBFS, peak -1.9 dBFS.
No new TTS requests were made; no human listening review is recorded. Remotion
reports 30.016 seconds at the container level due to audio padding; its 900
video frames are exactly 30 seconds. JavaScript syntax and Python compilation
checks passed, as did the cached-audio preparation command.

- `prahlada-pixi-30s.mp4`: 14,149,295 bytes; SHA-256 `5729c3edbc1a99cb37672b29bcc1b40034049ac269f442bdbfc1b179ecded8f7`.
- `prahlada-babylon-30s.mp4`: 11,243,170 bytes; SHA-256 `38dd0ca2b054e399f758304d455a2107fcf74cf2cda0ded7b39682f60dcb1c86`.
- `prahlada-remotion-r3f-30s.mp4`: 17,522,082 bytes; SHA-256 `573046473d1c317ccfe43bdb4885b704ffc416b3007a7a86b113e05c32ede3cf`.
