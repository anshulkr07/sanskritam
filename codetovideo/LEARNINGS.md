# Decisions and learnings — 5 November 2026

## Chosen direction

Keep solid Three.js 3D and illustrated puppet animation. Both prototypes use
Three.js; these are two visual approaches rather than competing engines.
Manim was tried and the owner prefers the other two. Preserve its old examples,
but exclude it from the default production workflow.

For frequent illustrated mythology/history reels, puppets are the easier starting
point. For action, changes in viewpoint and a larger range of visual treatments,
solid 3D has the higher ceiling. This is a production judgment, not a benchmark.

| Need | Illustrated puppets | Solid 3D |
| --- | --- | --- |
| Setup and new episodes | Simpler illustrated parts and joint hierarchies | More work on models, rigs, poses and lighting |
| Action | Gestures, walking, bows and stylized combat work well | Better freedom for turns, complex staging and camera movement |
| Characters | Reuse drawing parts, costumes and rigs | Reuse meshes, materials, rigs and animation clips |
| Color changes | Easy for separate tinted parts; baked textures need editing | Material colors are directly editable; textures may still need edits |
| Many camera angles | Needs extra artwork for side/back views | One complete model supports many angles |
| Consistency across reels | Strong when using the same art and rig library | Strong when using the same model and rig library |
| Editing | Code, art layers and timing are editable | Code, models, materials, poses and timing are editable |
| Rendering | Usually lighter for a comparable simple scene | Lighting, shadows and detailed geometry add cost |

Consistency comes from reusing approved assets, not simply choosing an engine.
Before scaling up, create a character library with stable proportions, costume
colors, approved views, expressions and reusable actions. Keep story text,
scene timing, palettes, asset IDs and camera shots in data. The current scene
files still contain much episode-specific code; this library/data refactor is
future work, not already implemented. New scripts currently require editing
their animation blocking as well as narration.

## Reference and quality limits

The owner supplied Instagram account `devanshu.motion`. Its Samudra Manthan reel
was inspected in the owner's logged-in browser. The reel describes code-made
Tholu Bommalata shadow puppets. We observed patterned jointed figures, layered
scenery, glows and movement. Its exact implementation stack is unverified.
No creator assets were copied; our puppets are original procedural drawings.

Our 30-second examples are prototypes: 720 x 1280 at 15 fps. They are not evidence
of production-quality rigging, facial acting, lip sync, cloth or physics. Target
30 fps for future finished reels and use short previews before expensive renders.
Moving a rig's limbs is possible now; natural acting still needs deliberately
authored poses and timing. More characters and actions are possible in both styles,
but require assets and choreography rather than a switch that creates quality.

## Audio and playback

- Sarvam Bulbul v3, aditya, hi-IN through the project's backend client.
- Eight shortened narration clips play at natural speed and are padded to 30s.
- Cached request hashes avoid repeat TTS charges. Preserve the local audio cache.
- Narrative timing follows measured speech durations; narration and captions use
  an original paraphrase of Bhagavata Purana Canto 7, not a literal verse quote.
- Both styles use the same narrator. Sarvam audio is independent of the renderer.
- A synthesized drone/bell score was made locally, not by Sarvam. No public
  Sarvam music-generation API was found in the reviewed model catalog.
- User reported silent inline previews. The MP4s contain AAC speech: extracting
  the Three.js audio and transcribing through Sarvam recovered all eight sentences.
  This verifies the file's speech, not the device speakers or the cause of silence.
- Voice-only stereo exports are available, with a default Hindi audio track;
  measured mean -18.1 dBFS and peak -1.9 dBFS. The local player explicitly unmutes
  on a user click. Do not treat an audio stream's mere existence as listening QA.

## Other tools worth considering

- **PixiJS + Spine**: a focused 2D puppet workflow with reusable skeletal animation.
  Spine authoring/runtime licensing needs checking before adopting it.
  https://esotericsoftware.com/spine-pixi
- **Blender**: visual modeling, rigging and animation authoring for richer 3D.
  Can supply animated glTF assets to Three.js; it has Python automation.
  https://www.blender.org/features/animation/
- **Blender Grease Pencil**: drawing and cutout animation in a 3D scene.
  https://www.blender.org/features/story-artist/
- **Babylon.js**: another web 3D engine, with animation, physics and particles.
  https://www.babylonjs.com/specifications/
- **Remotion + React Three Fiber**: frame-based video composition around Three.js
  scenes; useful for reusable reel templates, captions and audio sequencing.
  https://www.remotion.dev/docs/three
- **Motion Canvas**: TypeScript animation with a preview editor; useful for 2D
  motion graphics and explanatory sequences.
  https://motioncanvas.io/docs/

Three.js supports skeletal animation, morph targets, transforms and material
properties: https://threejs.org/manual/pages/animation-system.html
These capabilities exist in the engine; the prototype does not implement all of them.

Recommended next step: keep the current Three.js renderer for both looks, build
reusable rigs/actions, and introduce Blender-authored models when the art and
acting need it. Avoid changing engines before identifying a concrete limitation.

## Additional framework evaluation

The owner requested 30-second PixiJS/Spine, Babylon.js and Remotion/R3F examples.
They confirmed no Spine Editor license and selected PixiJS-only for now. Do not
describe this example as a Spine demonstration. Sources, implementation limits
and reproduction commands are in `framework-tests/README.md`; generated media
and verification artifacts are in `outputs/framework-tests/`.

These examples deliberately reuse the existing story, character assets, rig
poses and Sarvam narration. PixiJS renders projected textured quads from the
shared puppet scene. Babylon.js renders native geometry/materials translated
from the shared solid scene. Remotion/R3F embeds the shared solid Three.js scene
through ThreeCanvas and an R3F primitive, with JSX captions and a Remotion Audio
component. The factories still use Three.js for asset/pose preparation in all
three; only Babylon/Pixi use a different rendering engine. This is a renderer
and composition integration comparison, not three independently authored rigs.

Do not infer a framework performance ranking from these runs: 2D and 3D have
different workloads, the jobs ran concurrently, and software rendering, shader
compilation, disk activity and memory pressure affect timing. The Babylon demo
does not reproduce the original shadow rig. None of these tests establish the
ceiling of its engine or measure advanced skeletal animation/physics features.

Working recommendation for this series: Remotion/R3F is a useful composition and
export layer for the preferred Three.js 3D look; direct Three.js remains viable.
Keep PixiJS as an option for a dedicated 2D puppet library. A switch to Babylon
would be better motivated by a specific engine feature than by the appearance
of this prototype. Future quality work should prioritize rigs, expressions,
reusable actions and data-driven storyboarding.
