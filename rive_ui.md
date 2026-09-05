# Sanskritam — Rive Animation Handover

**Audience:** Claude Cowork, driving the Rive MCP against the live editor.
**Written:** 2026-09-03, by Claude Code, from a verified audit of the live file.
**Companion docs:** [`UI_HANDOVER.md`](UI_HANDOVER.md) §6 (mascot identity, state→rig
mapping, U1-3 app contract), [`HANDOVER.md`](HANDOVER.md) (backend — not your lane).

**File:** `Try`, fileId **2548203** — <https://editor.rive.app/file/try/2548203>.
Rename it to `Sanskritam Guru` when convenient; the MCP has no rename-file command,
so it is a manual step in the editor.

---

## 0. The answer to your question

> *"Want me to fill in the empty timelines, or start with rigging the artwork so the
> gaze/mouth/head properties actually have something to drive?"*

**Rig first. Do not fill the empty timelines yet.**

Your audit was correct and the conclusion follows from it. Today the character is
one flat raster plus two vector lids. The only thing a timeline can currently
address is **whole-figure transform** — `x`, `y`, `r`, `sx`, `sy`, `opacity` on
`guru_root`.

So if you fill `speaking`, `thinking`, `listening`, `encouraging` and `patient`
now, all five become variations of *"the whole picture wobbles slightly
differently."* A learner cannot tell them apart, none of them reads as the
emotion it is named after, and every keyframe gets thrown away the moment the
head is rigged.

**That is exactly the cheap result this project is trying not to ship.** Rig
first, then animate against a rig that can actually express something.

---

## 1. What is already good — do not rebuild it

Your audit matches mine exactly. To be explicit about what is **finished and
correct**, so you don't redo it:

| Thing | Id | Status |
|---|---|---|
| ViewModel `GuruInputs`, 12 properties | `0-14` | ✅ Correct. Do not add or rename properties. |
| State machine `TutorSM` | `0-7` | ✅ Keep. **Never create a second one.** |
| Layer 1 — 7 states, Any-State → `state == 0..6` | `0-8` | ✅ Verified by simulation. Do not touch the transitions. |
| Layer `Blink` — `eyesOpen ⇄ blinking` | `0-2281` | ✅ Verified. 250ms exit, trigger-driven. |
| `lidL` / `lidR` vector lids + trimmed lash | `0-2245` / `0-2251` | ✅ Geometry confirmed against the art by screenshot. |
| `guru_root` node at 300/300 | `0-2199` | ✅ The ambient transform anchor. Keep it as the root. |

Everything else in this document is new work.

---

## 2. The quality bar, stated mechanically

The owner's brief is *"the best animation — like Talking Tom, or Duolingo's
Duo."* That is a real target, but it is not reached by adding more keyframes. It
is reached by obeying a specific and small set of mechanics. Duo is the useful
reference here because **Duo is built in Rive**, so everything it does is
reachable with the tools you have. (Talking Tom is 3D and is a reference for
*behaviour*, not technique.)

Eight things separate "alive" from "a picture that moves." Treat them as
requirements, not advice.

### 2.1 Nothing moves alone — overlapping action

When the head turns, the **jaṭā** (hair) follows 3–5 frames later, and the
**rudrākṣa mālā** later still. That lag is the single strongest signal of
production quality. A rig where everything moves on the same frame reads as
cheap no matter how good the artwork is.

This character is unusually well suited to it. It has four natural followers,
and they are the reason it can look expensive:

| Element | Follows | Lag | Notes |
|---|---|---|---|
| **jaṭā** — bun + falling locks | head | 3–5 frames | The loose side locks should lag more than the bun. |
| **rudrākṣa mālā** — bead necklace | torso / nod | 5–8 frames | The best opportunity in the whole design. Swings, then settles with a smaller counter-swing. |
| **uttarīya** — saffron drape | torso | 4–6 frames | Cloth: it never returns to exactly the same place. |
| **beard** | jaw | 2–3 frames | Subtle. Overdo it and he looks underwater. |

### 2.2 Nothing moves linearly

Every keyframe pair gets an ease. `interpolationType: "linear"` between two
poses is the most recognisable marker of amateur work. Use `cubic` almost
everywhere, `elastic` for celebration only, `hold` for viseme swaps.

### 2.3 Anticipation

Before the head turns right, it moves **left** for 2–3 frames. Before the
celebrate hop, a squash. Motion that starts instantly reads as mechanical.

### 2.4 Overshoot and settle

Motion passes its target and comes back — one overshoot, then one smaller
counter, then rest. A move that stops dead on its target value is a move that
looks like a slider being dragged.

### 2.5 Asymmetry, everywhere

- The two eyes must **not** blink on the same frame. Offset `lidR` by **1–2
  frames** from `lidL`.
- The two brows raise by different amounts — make the viewer's-right brow go
  ~15% higher.
- Head tilt at rest is never exactly 0.

Perfect symmetry is the thing that makes a face look like a mask.

### 2.6 Idle is not stillness

The idle state carries breathing, a slow weight shift, irregular blinks, and
micro gaze drift. **Irregular** is load-bearing: a blink every exactly 4.0s
reads as a machine. Vary the interval (see §7.3).

### 2.7 Volume preservation

⚠ **The existing `idle` timeline has this bug.** It keys `sy` 100 → 101.6 with
**no `sx` compensation**, so the guru inflates rather than breathes. Fix it as
part of §6.1: when `sy` goes up, `sx` goes down, roughly `sx ≈ 2 − sy` around
the rest value.

### 2.8 The eyes lead

In good character animation the eyes reach the target first and the head
follows, by 2–4 frames. Applies to `headTurn` + `gazeX` together: never key
them on the same frames.

---

## 3. Architecture

### 3.1 The three tiers — and why today's is a dead end

| Tier | What it is | Ceiling |
|---|---|---|
| **C — today** | Flat raster + two overlay lids | blink, breathe, sway. **Cannot do gaze, mouth, head turn, or brows at all.** |
| **B** | Raster cut into separate layers, transform-only | Gets all 9 properties moving, but a head turn is a sticker sliding sideways — no deformation, no perspective. |
| **A — the target** | Meshed raster + bones + vector face overlays | Real deformation. Head turn with volume, jaw that opens, secondary motion that lags. |

**Build Tier A.** Tier B is acceptable only as an intermediate state you pass
through, never as a stopping point.

### 3.2 Why mesh-on-raster, not vector tracing

The artwork is flat-vector-style with hard edges, so tracing it is *tempting*.
Do not trace the whole character. The soft gradient shading on the cheeks, the
drape folds and the hair volume are what make it look painted rather than
generic; a flat trace throws all of that away and you end up with a worse
character that happens to deform well.

**The split:**

- **Stays raster + mesh:** head/face base, beard, tilaka, jaṭā, torso, drape,
  mālā. Everything whose value is in its shading.
- **Becomes vector:** the parts that must *appear, disappear, or change shape* —
  lids (done), mouth interior and lip shapes, brows, irises. These have simple
  flat colour anyway, so nothing is lost.

### 3.3 Target hierarchy

```
guru_root (Node)                  ← ambient breathe/sway. Already exists. Keep.
├── glow (vector, radial gradient)      ← glow          [drawn FIRST = behind]
├── jata_back_mesh (Image+mesh)         ← locks behind the head
├── body_mesh (Image+mesh)              ← torso + drape
│   └── bones: spine → shoulderL/R
├── mala_mesh (Image+mesh)              ← rudrākṣa; own bone chain
├── head_group (Node)                   ← headTurn pivots HERE, not on the mesh
│   ├── head_mesh (Image+mesh)          ← face base, beard, tilaka
│   │   └── bones: neck → head → jaw
│   ├── jata_front_mesh (Image+mesh)    ← locks in front; lags head
│   ├── browL / browR (vector)          ← browRaise
│   ├── eyeL_group (Node)
│   │   ├── eyeL_iris (vector)          ← gazeX / gazeY
│   │   └── lidL (vector)               ← blink        [exists]
│   ├── eyeR_group (Node)               ← mirror
│   └── mouth_group (Node)
│       ├── mouth_interior (vector)     ← mouthOpen
│       └── lip_line (vector)           ← smile
└── (draw order: later child renders ON TOP — see §8.4)
```

**Why `head_group` is a Node and not the mesh itself:** rotating a mesh rotates
its bones' rest transforms and fights the skin solve. Put the pivot on a plain
Node above it, and let the mesh deform *within* a head that is already oriented.

### 3.4 Bones

Bones are **not** created by `mesh_rigging_tool` — its own docs say to use the
component tool, and I could not identify a bone-creation command in the MCP
surface.

⚠ **Resolve this first, before any mesh work.** Either find the command, or
have the owner create the bone chain by hand in the editor — it is roughly a
dozen bones and a few minutes of manual work. Do not start meshing until bones
exist, because `bindBones` needs them.

Minimum chain:

```
spine → neck → head → jaw
spine → shoulderL, shoulderR          (portrait: optional, see §5 armRaise)
head  → jataA → jataB                 (2-bone chain per lock group, for lag)
spine → malaA → malaB → malaC         (3-bone chain; the swing)
```

Keep total bones modest. **`maxInfluences` is hard-capped at 4** per vertex by
the runtime.

---

## 4. Art separation

Meshing needs the parts to be separate images. `guru_art` (`0-2198`, asset
`guru_portrait_base`, 1254×1254) is currently one flat PNG.

### 4.1 The two rules that make this smaller than it looks

**1. Lids, mouth and brows are ADDED, not CUT.** They are vector shapes drawn
over the art. Zero inpainting. The lids are already done and prove the method.

**2. Inpainting is only needed where a layer moves off what it covers**, and
scales with motion range. A head turning ±12° reveals a thin crescent of neck,
not a whole silhouette.

### 4.2 What must actually be cut, in priority order

| # | Layer | Needed for | Inpaint behind? |
|---|---|---|---|
| 1 | `head` (face + beard + tilaka + ears) | headTurn | Yes — neck/shoulder crescent. Small. |
| 2 | `jata_front` / `jata_back` | secondary motion | Yes — behind the front locks. Moderate. |
| 3 | `iris` ×2 | gazeX/Y | No — sclera behind is flat cream, extend it. |
| 4 | `mala` | swing | Yes — chest behind the beads. Fiddly but small. |
| 5 | `body` (remainder) | base | No — it is what's left. |

**If the owner cannot produce cut layers:** ship the reduced rig — blink, brows,
mouth, gaze (irises drawn as vector over the painted ones), breathe, sway, glow.
That is genuinely most of the perceived life and needs **no cutting at all**.
Head turn and secondary motion are the two things that require it. Say so
plainly rather than faking them.

---

## 5. The nine unbound properties

All are declared on `GuruInputs` and drive nothing. Ranges below are the app-side
contract — see `UI_HANDOVER.md` U1-3. **Do not change the property names or
types**; the client binds by name.

| Property | Range | Drives | Mechanism |
|---|---|---|---|
| `mouthOpen` | 0–100 | jaw bone + `mouth_interior` height | Jaw rotates ~6° at 100; interior scales `sy`. Not just a growing ellipse. |
| `smile` | 0–100 | lip corners **+ cheek raise + eye squint** | A real smile narrows the eyes (Duchenne). Mouth-only reads as a smirk. |
| `headTurn` | −100…100 | `head_group.r` + head mesh bones | **Max ±12°.** Beyond that a 2D face breaks. jaṭā follows at 3–5 frames. |
| `gazeX` | −100…100 | iris `x` | **±3.5 artboard units.** Clamp — irises must never touch the eye corner. |
| `gazeY` | −100…100 | iris `y` | **±2 units.** Less than X; vertical eye travel is smaller in real faces. |
| `browRaise` | 0–100 | brow `y` + slight `r` | Asymmetric: viewer's-right brow ~15% higher (§2.5). |
| `armRaise` | 0–100 | shoulder bone | **Portrait has no visible arms — leave unbound here.** Bind on `GuruFull`. |
| `glow` | 0–100 | `glow` opacity + `sx`/`sy` | Radial gradient behind the figure. Scale range 90→108%, opacity 0→70. |
| `intensity` | 0–100 | master amplitude | See below. |

**`intensity` deserves a real answer, not a stub.** It means *how emphatic the
guru is right now* — the same emotion played small or large. The correct Rive
mechanism is a **1D blend state**: author each expressive timeline twice
(`_subtle` and `_strong`), and blend between them on `intensity`. Do this
**last**, after the six timelines exist in one version. Do not fake it by
multiplying values in one timeline.

---

## 6. The timelines

Durations are what the state machine already expects — do not change them
without updating Layer 1.

### 6.1 `idle` (exists, 1.0s, loop) — fix, don't rebuild

Keep the breathe and sway. Three corrections:

1. **Add `sx` compensation** to the `sy` breathe (§2.7). This is a real bug.
2. **Offset the sway from the breathe** so they don't share a period — if both
   are 1.0s the figure pulses like a metronome. Make the sway 1.6s against a
   1.0s breath so they drift in and out of phase.
3. **Add a weight shift**: a slow ±0.6 unit `x` drift, longer period again.

### 6.2 `speaking` (1.0s, loop)

Jaw opens and closes on the syllable, but **not as a metronome** — vary the
cycle so consecutive opens differ in depth (100, 70, 90, 60…). Brows lift on
emphasis. A small head bob, `y` −1.5u, on stressed beats only. Mouth cycles
through visemes with `hold` interpolation — visemes **snap**, they do not tween.

⚠ This one is easy to make bad. A perfectly regular jaw flap is the single most
"cheap mobile game" thing you can build. Irregularity is the whole job.

### 6.3 `thinking` (2.0s, loop)

Stillness with micro-motion. Gaze drifts up and to the viewer's left and
**stays** — thinking is looking away, and holding it. Head tilts ~6°. One brow
higher than the other. Blinks are slower than normal (close over 6 frames, not
4). Almost no body motion; the contrast with `speaking` is the point.

### 6.4 `listening` (2.0s, loop)

Head tilts ~4° **toward** the learner. Brows slightly raised and held. Gaze
steady on camera — no drift; that is what attention looks like. Slightly more
frequent blinks. A faint forward lean, `sy` +0.5%, held rather than cycling.

### 6.5 `encouraging` (1.5s)

Warm: `smile` up, brows up, and **two nods — the second smaller than the
first** (§2.4). The mālā swings on the first nod and counter-swings on the
second. This is the state that has to feel generous, so give it the most
follow-through of any timeline.

### 6.6 `patient` (2.0s, loop)

⚠ **Read `UI_HANDOVER.md` §7 before writing a single keyframe here.** This plays
when the learner is stuck. It must read as *nothing is wrong*: slow breath,
longer and less frequent blinks, one small weight shift per cycle. **No
sighing, no looking away, no head shake, no impatience of any kind.** Getting
this wrong makes the product feel like it is judging the learner, which is a
product-level failure, not an animation note.

### 6.7 `celebrating` (1.2s, exists)

The hop is there. Add the secondary motion it is missing: mālā swing with a
counter, jaṭā bounce lagging the head, and a squash on landing. Currently the
whole figure moves as one rigid object.

---

## 7. Timing reference

At **60fps**. `createLinearAnimations` takes `duration` in **seconds**;
keyframes are addressed in **frames**.

### 7.1 Standard durations

| Motion | Frames | Notes |
|---|---|---|
| Blink close | 4 | Fast |
| Blink hold | 2 | |
| Blink open | 7 | Slower than close — always |
| Slow/thoughtful blink | 6 / 3 / 9 | For `thinking`, `patient` |
| Head turn to target | 12–16 | Plus 2–3 anticipation |
| Anticipation | 2–3 | Opposite direction |
| Overshoot | 4–6 | ~15% past target |
| Settle | 6–8 | Back to target |
| Brow raise | 6–8 | |
| Jaw open (speech) | 3–5 | |
| Secondary lag | 3–8 | Per §2.1 table |

### 7.2 Easing

| Use | Type | Params |
|---|---|---|
| General motion | `cubic` | `x1:0.4 y1:0 x2:0.2 y2:1` |
| Fast out (blink close) | `cubic` | `x1:0.4 y1:0 x2:1 y2:1` |
| Slow in (blink open) | `cubic` | `x1:0 y1:0 x2:0.6 y2:1` |
| Celebration only | `elastic` | Nowhere else. |
| Viseme swap | `hold` | Never tween a mouth shape. |
| Anything else | **never `linear`** | §2.2 |

### 7.3 Irregular blinking

Do not key blinks into the looping timelines at a fixed interval. Drive the
`blink` trigger from the app at a randomised 2–6s interval (this is the client's
job — `UI_HANDOVER.md` U1-3). Your side only needs the blink to be
**re-triggerable at any time**, which it already is.

---

## 8. Rive API notes — measured, and each one cost a wrong build

These are not in Rive's docs. All verified in this file on 2026-09-03.

### 8.1 `exitTime` is in **milliseconds**

Not frames, not percent. Setting `160` (exittime) to `15` exited after **1
frame**; `100` exited after ~6 frames; `250` gives the full 15-frame blink.
The `exitTimeIsPercentage` flag bit is neither 16 nor 32 — I stopped guessing
and used ms. **Use milliseconds and verify with `simulateStateMachine`.**

### 8.2 Transition `flags` bitfield (key 152)

Decoded by experiment: `1` disabled · `2` durationIsPercentage · `4`
enableExitTime · `8` pauseOnExit · `32` enableEarlyExit. Bit 16 is *not*
exitTimeIsPercentage as I first assumed. **`flags: 4` + ms exitTime is the
combination that works.**

### 8.3 `addPaints` silently ignores `thickness`

Passing `{paintType:"stroke", color:"#1A140D", thickness:2.2}` creates the
stroke with thickness **1.0**. Set property key **47** afterwards. It fails
silently — no error, no warning.

### 8.4 Draw order

Later child renders **on top** (confirmed: the artboard's background `Fill`
is its first child). But `sendToBack` on `guru_art` returned success while the
reported `children` array **did not change order**, and `childOrder` (key 6) is
not readable via `query_property_values`. **Verify draw order visually — do not
trust the API's reported order.**

### 8.5 Replacing a path preserves keyframes

Keyframes live on the **Shape's** `sy` (key 17), not on the path. So
`delete_objects` on the path + `addPaths` a new one **keeps the animation
intact**. This is the safe way to reshape something already keyed — I used it
twice on the lids.

### 8.6 `transformaffectsstroke` (key 50) defaults **true**

So a stroke scales with its shape. Useful: the lid's lash thickness goes to 0
as `sy` → 0, so it vanishes with the lid instead of leaving a line across an
open eye. Rely on it, but re-verify if you ever set it false.

### 8.7 Auto-weight overlapping shapes in ONE call

Per the tool's own docs: shapes that overlap and share bones must be passed
together in a single `autoWeight` via `targetIds`. Weighting them separately
gives mismatched weights at the seam and **the artwork tears apart when the
joint bends.** This will bite on jaw/beard and head/neck.

### 8.8 `maxInfluences` is capped at 4

Runtime limit, per vertex. Not a suggestion.

---

## 9. Measured geometry

Source asset `guru_portrait_base` is **1254×1254**; `guru_art` sits at 45% scale
with a centred origin inside `guru_root` at (300,300). So:

```
artboard = 300 + (source_px − 627) × 0.45
```

Verified positions (artboard space, 600×600):

| Part | Source px (x0,y0,x1,y1) | Artboard |
|---|---|---|
| eyeL almond | 513, 421, 601, 455 | 248.7, 207.3, 288.3, 222.6 |
| eyeR almond | 661, 421, 749, 455 | 315.3, 207.3, 354.9, 222.6 |
| browL | 500, 370, 630, 424 | 242.9, 184.4, 301.4, 208.7 |
| browR | 640, 370, 770, 424 | 305.9, 184.4, 364.4, 208.7 |

Iris centres: **L (562,437) r16** → artboard (270.8, 214.5) r7.2 ·
**R (708,437) r16** → artboard (336.5, 214.5) r7.2.

Sampled fills: lid L **`#EE7F22`**, lid R **`#F79030`** (the right side of the
face is lit warmer — **do not use one fill for both**), lash **`#1A140D`**.

⚠ The brow sits ~3px above the lash. Sample lid skin from the **cheek** (y≈470),
not from between brow and lash — that region is shadow and renders muddy brown.

---

## 10. Acceptance

A rig is done when all of these hold. They are deliberately visual, because the
failure modes here are visual.

1. **The 3-second test.** Watch 3 seconds of `idle` with no context. If it could
   be a still image, it fails.
2. **The tilaka test.** At `headTurn` = ±100, does the tilaka distort or slide
   off the forehead? If yes, the mesh weights are wrong. It is a rigid marking
   on a deforming surface, which makes it the fastest weight-quality check you
   have. Use it after every weighting pass.
3. **The tear test.** At max `headTurn` and max `mouthOpen` together, does the
   beard separate from the jaw, or the head from the neck? See §8.7.
4. **The symmetry test.** Step through a blink frame by frame. If both lids hit
   the same value on the same frame, fix it (§2.5).
5. **The metronome test.** Watch `speaking` for 10 seconds. If you can predict
   the next jaw open, it fails (§6.2).
6. **Every state is distinguishable.** Show `thinking`, `listening` and
   `patient` side by side with no labels. If they are not obviously different,
   the rig is being under-used.
7. **60fps on a physical low-end Android**, measured — not on a simulator
   (`UI_HANDOVER.md` §3.6). Report the number.
8. **Reduce Motion has a static fallback** for every state (`UI_HANDOVER.md`
   §3.4). A state that only exists as motion breaks for those users.
9. `simulateStateMachine` still reaches all 7 states of Layer 1, and the blink
   layer still round-trips.

---

## 11. Do not

- ❌ **Do not fake head turn** by skewing or `sx`-squashing the whole image. It
  is instantly recognisable and it is the exact cheapness this doc exists to
  prevent.
- ❌ **Do not animate on `linear`.** Anywhere.
- ❌ **Do not blink both eyes on the same frame.**
- ❌ **Do not give the six timelines the same duration or the same period.**
- ❌ **Do not fill empty timelines with whole-figure wobble** — §0.
- ❌ **Do not vector-trace the whole character.** §3.2.
- ❌ **Do not key `sy` without `sx`.** §2.7.
- ❌ **Do not make an idle loop exactly periodic.**
- ❌ **Do not exceed 4 bone influences per vertex.**
- ❌ **Do not create a second state machine or ViewModel.**
- ❌ **Do not touch Layer 1's 7 states or their conditions.** They are verified.
- ❌ **Do not rename or retype any `GuruInputs` property.** The client binds by
  name (`UI_HANDOVER.md` U1-3).
- ❌ **Do not add impatience to `patient`.** §6.6.
- ❌ **Do not export.** `.riv` export is plan-gated (Cadet, $9/mo) and is the
  owner's call, not yours.

---

## 12. Sequence

Each step should leave the file in a working state.

| # | Step | Gate |
|---|---|---|
| 1 | **Resolve bone creation** (§3.4). Find the command or get the owner to make the chain by hand. | Blocks everything. |
| 2 | Fix `idle`'s volume bug + de-phase the sway (§6.1). | Small, independent, ships value immediately. |
| 3 | Vector brows + irises over the painted ones; bind `browRaise`, `gazeX/Y`. | **No art cutting needed.** Biggest expression gain per hour. |
| 4 | Vector mouth group; bind `mouthOpen`, `smile`. | No cutting needed. |
| 5 | `glow` shape; bind `glow`. | Trivial. |
| 6 | Author `thinking`, `listening`, `patient` — the three that need no head turn. | Now they have something to drive. |
| 7 | **Art separation** (§4) — head, jaṭā, iris, mālā. | Owner-dependent. |
| 8 | Mesh + bind + weight; bind `headTurn`. Tilaka test after every pass. | Needs 1 and 7. |
| 9 | Secondary motion on jaṭā/mālā/drape; upgrade `celebrating` and `encouraging`. | Needs 8. |
| 10 | `intensity` blend states (§5). | Last. |

**Steps 2–6 need no artwork cutting at all** and cover five of the nine unbound
properties. Start there — it de-risks the whole phase, because if art separation
stalls you still have a character that blinks, looks around, raises its brows,
smiles and speaks.
