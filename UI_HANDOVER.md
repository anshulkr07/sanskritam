# Shabd — UI, UX & Motion Handover

**Audience:** an implementing coding agent (DeepSeek-V4-Flash / Hermes).
**Written:** 2026-09-01.
**Companion doc:** [`HANDOVER.md`](HANDOVER.md) covers backend/platform phases P0–P5.
This doc covers the client. They are independent — UI tasks below do not block
on P2–P5, and vice versa.

**Decisions locked by the owner:**

1. **React Native, not Flutter.** The 3,824 LOC of working screens stay.
2. **Custom dev build, not Expo Go.** Native modules are now permitted.
3. **The guru mascot gets rebuilt as a rigged character — in Rive**, using
   mesh-on-raster so the painted art survives (§6.4).
4. **The Rive MCP server is used to author the rig**, so this does not block on
   hiring an animator. Owner sets it up in U1-0.

---

## Ownership — read this first

Work on this document is **split between two agents.** Stay inside your lane.

| Phase | Owner |
|---|---|
| **U1 — the mascot (the Rive file)** | **Claude**, via the Rive MCP |
| U0, U2, U3, U4, U5, U6 | **DeepSeek / Hermes** |

**If you are DeepSeek: do not touch the Rive file, and do not build a mascot
renderer.** U1-3 (`mobile/src/components/guru/rig.ts`) and U1-4 (the
integration) are the seam. Claude delivers `mobile/assets/avatar/guru.riv` plus
a `GuruRive.tsx` that already conforms to the `GuruRig` contract in U1-3.
`TutorAvatar` and `TutorFull` keep their current props throughout, so every
screen you build against them works before and after the mascot lands.
**Nothing in U0 or U2–U6 blocks on U1.**

Everything else in this document is yours, including all of §3's invariants —
they apply to every phase, not just the ones you own.

---

## 0. How to use this document

Read §1–§5 completely before writing code. Then work tasks in order.

Task format is identical to `HANDOVER.md`: **Why / Blocked by / Touch /
Contract / Steps / Acceptance / Do not.** Same rules apply:

- **After every task run the verification loop (§10).**
- **One task per commit**, message format `feat(U2-1): motion token system`.
- Never modify a file outside the task's **Touch** list.
- Never weaken an existing test to go green.

**The single most important instruction in this document:** you are not
decorating screens. Every animation below exists to answer a question the
learner is silently asking — *did that work? where am I? is it listening? did
I just get punished?* An animation that answers nothing is noise, and noise on
a 5-year-old phone is worse than nothing. If you cannot name the question a
motion answers, delete it.

---

## 1. Where the UI actually is today

Measured 2026-09-01, not estimated.

### Inventory

| | |
|---|---|
| Screens | 7 (Home, Conversation, Shloka, Varnamala, Profile, Challenge, Login) |
| Shared components | 5 (TutorAvatar, TutorFull, VerdictSheet, WordBank, ui) |
| Total | 3,824 LOC TypeScript |
| Design tokens | `theme.ts` — complete and good |
| Accessibility props in the entire app | **1** |
| Files using Reanimated | **2** (both mascot components) |
| Files using legacy RN `Animated` | 3, including the verdict moment |
| Skeleton loaders | 0 (4 raw `ActivityIndicator`s) |
| Screen transition customisation | none (default stack push) |

### The five real problems

**1. The mascot is a static PNG.** [`TutorAvatar.tsx`](mobile/src/components/TutorAvatar.tsx)
declares six states — `idle | speaking | thinking | listening | celebrating |
encouraging` — and all six render *the same flat image* with different
scale/rotate/translate. He breathes and sways. He cannot blink, emote,
gesture, or open his mouth. This is the ceiling on the entire product's
personality, and it is a hard ceiling: you cannot rig a raster portrait.

**2. Every graphics library is missing.** No `react-native-svg`, no Lottie, no
Rive, no Skia, no `react-native-gesture-handler`, no `expo-blur`. The app has
Reanimated 4.5.1 and `expo-linear-gradient`. That is the whole toolkit.

**3. Two animation systems, and the wrong one owns the most important moment.**
[`VerdictSheet.tsx`](mobile/src/components/VerdictSheet.tsx) — the reward
moment, the thing that decides whether a learner comes back — runs on React
Native's legacy `Animated` API. So do Conversation and Home. Reanimated is
confined to the two mascot files.

**4. One accessibility prop.** `accessibilityRole="button"` in `ui.tsx`, and
nothing else. No labels, no hints, no font-scale handling, no reduced-motion
support, no screen-reader ordering. The stated audience is *children through
elderly pandits*; today an elder running system font at 200% gets a broken
layout and a VoiceOver user gets an unusable app.

**5. Nothing has a sense of place.** Five flat tabs. There is no journey, no
map, no sense of progress through a body of knowledge. Duolingo's path is the
most-copied element in the category for a reason: it answers "where am I?"
before the learner has to ask.

### What is already good — do not rebuild it

- **`theme.ts` is a real design system.** Warm paper (`#FFF8EE`), saffron
  action (`#E85B25`), semantic verdict tones, and the Baloo 2 Devanagari
  pairing solved correctly via the `script()` helper. Extend it; don't replace
  it.
- **`color.unsure` / `unsureBg` (violet) are defined and completely unused.**
  They are waiting for the abstention moment. §7.4 finally uses them.
- **The chunky solid-shadow button** in `ui.tsx` is the right visual language.
- **`haptics.ts` and `sfx.ts`** are clean wrappers with the right five events.
- **The `AvatarState` union is already a state machine.** That is an unusually
  clean migration path to Rive — see §6.

---

## 2. What "world class" means here, concretely

Researched, not assumed:

- **Duolingo runs Rive for Duo** — state machines, real-time reaction,
  modular animation parts combined dynamically — and **thousands of Lottie
  files** for general UI motion.
- **Airlearn** is deliberately minimal, with confetti on words-learned,
  reward-scratch reveals, topic-completion bursts, and league-badge reveals.

Reproducing that is table stakes. **Matching Duolingo is not the goal — a
Sanskrit app that is merely a Duolingo reskin has no reason to exist.** §7 is
the part that matters: five surfaces that are only possible because this is
Sanskrit, and that no competitor can copy without building your grading stack.

Ranked by impact per hour of work:

| Rank | Thing | Why |
|---|---|---|
| 1 | Mascot that reacts | The entire emotional layer. Nothing else moves the needle as much. |
| 2 | Session-complete moment | Where the next session gets sold. |
| 3 | The path / journey map | Answers "where am I?" and creates the pull to continue. |
| 4 | Verdict moment on Reanimated | Highest-frequency moment in the app. |
| 5 | Varṇamālā articulation map (§7.1) | The uniquely-Sanskrit surface nobody else has. |
| 6 | Accessibility | Half your stated audience currently cannot use this. |

---

## 3. UI invariants — never violate these

These sit **alongside** the invariants in `HANDOVER.md` §2, which still apply
in full (frozen modules, abstention principle, no local models, SQLAlchemy
2.0, migrations-only).

### 3.1 Light theme only

Dark mode was explicitly rejected. Never add `useColorScheme`, dark tokens, or
a theme toggle. Never hardcode a hex value in a screen — every colour comes
from `theme.ts`.

### 3.2 Devanagari always uses `script()`

Nunito ships no Devanagari glyphs. Any `<Text>` that may hold Sanskrit or Hindi
spreads the helper:

```tsx
<Text style={[styles.line, script("semibold")]}>{devanagari}</Text>
```

Forgetting this is a silent OS-font fallback that looks broken. **Audit every
new text node you write.**

### 3.3 `unsure` is never red, never a failure

The abstention principle (`HANDOVER.md` §2.2) is a *visual* contract too. When
the verdict is `unsure` or `abstained`:

- Colour is `color.unsure` / `color.unsureBg` (violet). **Never** `bad`/`badBg`.
- Haptic is `haptics.near()`. **Never** `haptics.incorrect()`.
- Copy says the *system* failed to hear, never that the learner failed.
- No streak-break animation, no heart lost, no downward motion.
- The mascot state is `encouraging`. **Never** a disappointed state.

An `unsure` that reads as a mistake is the most damaging bug in this document.

### 3.4 Every animation must survive Reduce Motion

Read the OS setting once at app start and expose it via context. When it is on:
disable all decorative motion (breathing, sway, parallax, confetti, sparkles),
keep functional motion (sheet position, progress fill) but cut durations to
~40%, and never cross-fade more than opacity. §9.4 gives the hook.

### 3.5 60fps or don't ship it

All animation runs through Reanimated worklets on the UI thread. **The legacy
`Animated` API from `react-native` is banned in new code** and gets migrated
out of existing code in U0-3. No `setState` in an animation loop, ever.

### 3.6 Test on a real low-end Android device

The stated audience includes people on ₹8,000 phones. The iOS simulator lies
about performance. Any task that adds animation is unverified until it has run
on physical Android hardware.

### 3.7 Never block the learner behind an animation

Every celebration, sheet, and transition is skippable by tapping. A learner who
taps Continue during confetti gets the next screen immediately. Delight that
you cannot dismiss becomes irritation on the twentieth repetition.

### 3.8 The mascot is a teacher, not a pet

Duo is passive-aggressive and it works for Duolingo. **It will not work here.**
This character reads as a guru to a large part of the audience. He is never
sarcastic, never guilt-trips, never shows disappointment, and never uses a
crying or angry expression. His failure state is patience. Copy in his voice is
warm and brief.

---

## 4. The stack

### 4.1 What gets installed

```bash
cd mobile
npx expo install react-native-svg react-native-gesture-handler expo-blur
npx expo install @shopify/react-native-skia lottie-react-native
npm install @rive-app/react-native
```

| Library | Used for | Introduced in |
|---|---|---|
| `react-native-svg` | The path curve, articulation diagrams, stroke-order paths, icons | U0-2 |
| `react-native-gesture-handler` | Draggable word tiles, swipe, pull-to-refresh | U0-2 |
| `@shopify/react-native-skia` | Confetti, particles, waveform, progress rings | U0-2 |
| `lottie-react-native` | One-shot decorative animation: badge reveals, streak flame, empty states | U3 |
| `@rive-app/react-native` | **The rigged mascot** | U1-4 |
| `expo-blur` | Modal scrims, frosted session header | U0-2 |

Note `react-native-svg` is **not** the mascot renderer — Rive is (§6.4). SVG
earns its place on the path curve and the articulation diagrams, and is the
mascot's fallback only if U1-4 measures badly (U1-5).

`react-native-reanimated@4.5.1` and `react-native-worklets@0.10.4` are already
installed and correct. Do not change their versions.

### 4.2 The dev build

Expo Go can no longer run this app after U0-2. That is expected and approved.

```bash
cd mobile
npx expo prebuild --clean
npx expo run:android      # or run:ios
```

After this, `ios/` and `android/` exist. **Add them to `.gitignore`** — they
are generated; regenerate with `prebuild` rather than hand-editing. Anything
that must persist across a prebuild goes in `app.json` plugins, never in the
native folders.

### 4.3 The `SharedValue` type errors are a real bug, not a library gap

`HANDOVER.md` §3 records three pre-existing TS errors as "do not fix". **Two of
them are now in scope and are genuinely wrong code.**

`TutorAvatar.tsx` lines 90 and 152 use `Animated.SharedValue<number>` —
treating `SharedValue` as a namespace member of the default export. In
Reanimated 4 it is a named type export. I verified it is present in
`react-native-reanimated/lib/typescript/index.d.ts`. The fix:

```tsx
import type { SharedValue } from "react-native-reanimated";
// then: (val: SharedValue<number>) => ...
```

The third error (`NodeJS.Timeout` in `services/speech.ts`) is a real typing
gap — replace with `ReturnType<typeof setTimeout>`.

**After U0-1 the mobile baseline is 0 TypeScript errors, and it stays 0.**

---

## 5. Phase overview

| Phase | Theme | Tasks | Depends on |
|---|---|---|---|
| **U0** | Foundation — deps, dev build, motion tokens, kill legacy Animated | U0-1 … U0-5 | nothing |
| **U1** | The mascot — Rive rig | U1-0 … U1-7 | U0-2, U1-0 (owner) |
| **U2** | Core loop feel — session shell, verdict, complete | U2-1 … U2-5 | U0 |
| **U3** | Navigation & progress — the path, streak, leagues | U3-1 … U3-5 | U2 |
| **U4** | The uniquely-Sanskrit surfaces | U4-1 … U4-5 | U1, U2 |
| **U5** | Accessibility — the child→pandit mandate | U5-1 … U5-4 | U2 |
| **U6** | Polish & performance | U6-1 … U6-3 | everything |

U5 is listed fifth and is **not** optional or deferrable. It is placed after
U2 only because retrofitting accessibility onto three screens is cheaper than
onto twelve. If schedule pressure appears, cut U6 and U3-5, never U5.

---

# PHASE U0 — Foundation

## U0-1 · Fix the type errors, set the baseline to zero

**Why:** Everything downstream is verified against "no new TS errors". A
non-zero baseline makes that check meaningless, and two of the three errors are
actual bugs (§4.3).

**Blocked by:** nothing. **Effort:** S

**Touch:** `mobile/src/components/TutorAvatar.tsx`,
`mobile/src/services/speech.ts`

**Steps**

1. In `TutorAvatar.tsx`, add `import type { SharedValue } from
   "react-native-reanimated";` and replace both `Animated.SharedValue<number>`
   usages with `SharedValue<number>`.
2. In `speech.ts` line ~50, replace `NodeJS.Timeout` with
   `ReturnType<typeof setTimeout>`.

**Acceptance**

```bash
cd mobile && npx tsc --noEmit
```
Expected: **no output, exit 0.** This is the new baseline for every later task.

**Do not:** add `@ts-ignore`, loosen `tsconfig.json`, or install `@types/node`.

---

## U0-2 · Install the graphics stack and move to a dev build

**Why:** Native modules are the gate on every remaining task in this document.

**Blocked by:** U0-1. **Effort:** M

**Touch:** `mobile/package.json`, `mobile/app.json`, `mobile/.gitignore`,
`mobile/App.tsx`

**Steps**

1. Install everything in §4.1 except Rive (that lands in U1-4).
2. `react-native-gesture-handler` **must** be imported first in the app entry:
   ```ts
   // mobile/index.ts — very first line, before anything else
   import "react-native-gesture-handler";
   ```
   and `App.tsx` must wrap the tree in `<GestureHandlerRootView style={{flex:1}}>`
   **outside** `SafeAreaProvider`. Getting this order wrong makes gestures
   silently no-op on Android with no error.
3. Add required plugins to `app.json`.
4. `npx expo prebuild --clean`, then add `ios/` and `android/` to
   `mobile/.gitignore`.
5. Build and boot on a real Android device.
6. Update `mobile/README` (create if absent) documenting that Expo Go no longer
   works and how to make a dev build.

**Acceptance**

```bash
cd mobile && npx tsc --noEmit          # still clean
npx expo run:android                    # boots on a physical device
```
App launches, all five tabs render, no redbox.

**Do not:** hand-edit anything under `ios/` or `android/`. Do not commit those
folders. Do not upgrade `react-native-reanimated` or `react-native-worklets`.

---

## U0-3 · The motion token system

**Why:** Right now every duration is a magic number typed inline (`2600`,
`260`, `1500`, `700`). Consistent motion is what separates a designed app from
an animated one, and it cannot happen while every component invents its own
timing.

**Blocked by:** U0-2. **Effort:** M

**Touch:** create `mobile/src/motion.ts`, create
`mobile/src/hooks/useReducedMotion.ts`

**Contract**

```ts
// mobile/src/motion.ts
export const duration = {
  instant: 100,   // state flips that must feel free — chip select
  quick:   180,   // tile pickup, button depress, chip
  base:    260,   // the default: sheets, fades, most transitions
  slow:    400,   // screen transitions, sheet with content
  telling: 650,   // deliberate reveals — a śloka line, a badge
} as const;

export const easing = {
  standard: Easing.bezier(0.2, 0, 0, 1),      // most things
  entrance: Easing.out(Easing.cubic),          // arriving
  exit:     Easing.in(Easing.cubic),           // leaving
  overshoot: Easing.out(Easing.back(1.2)),     // playful arrivals
} as const;

export const spring = {
  snappy: { damping: 20, stiffness: 300, mass: 0.8 },  // UI response
  bouncy: { damping: 10, stiffness: 200, mass: 1.0 },  // celebration
  gentle: { damping: 18, stiffness: 120, mass: 1.0 },  // mascot, ambient
} as const;

/** Stagger delay for list items. Cap the index so long lists don't crawl. */
export const stagger = (i: number, step = 45, max = 6) =>
  Math.min(i, max) * step;
```

```ts
// mobile/src/hooks/useReducedMotion.ts
export function useReducedMotion(): boolean;
/** Scales a duration to 0 when reduce-motion is on and the motion is decorative. */
export function useMotionDuration(base: number, decorative?: boolean): number;
```

**Steps**

1. Write both files. `useReducedMotion` reads
   `AccessibilityInfo.isReduceMotionEnabled()` on mount and subscribes to
   `reduceMotionChanged`.
2. Export from a barrel so screens import one thing.

**Acceptance:** `npx tsc --noEmit` clean. No behaviour change yet.

**Do not:** invent more than the five durations. A sixth means two are wrong.

---

## U0-4 · Migrate off the legacy `Animated` API

**Why:** §3.5. The verdict moment — the highest-frequency emotional beat in the
app — currently animates on the JS thread. Everything else built on top of it
inherits that jank.

**Blocked by:** U0-3. **Effort:** M

**Touch:** `mobile/src/components/VerdictSheet.tsx`,
`mobile/src/screens/Conversation.tsx`, `mobile/src/screens/Home.tsx`

**Steps**

1. Replace `new Animated.Value()` → `useSharedValue()`,
   `Animated.timing(...).start()` → `withTiming(...)`, and
   `Animated.View` from `react-native` → from `react-native-reanimated`.
2. Use the U0-3 tokens: the verdict sheet is `duration.base` with
   `easing.overshoot` — this preserves the existing `Easing.out(Easing.back(1.1))`
   feel, which is already right.
3. Keep every existing haptic and sfx call exactly where it is. **The timing of
   haptic-relative-to-visual is already correct; do not "improve" it.**

**Acceptance**

```bash
cd mobile && grep -rn 'Animated' src/ | grep 'from "react-native"'
```
Expected: **no matches.** Plus `npx tsc --noEmit` clean, and the verdict sheet
still slides, chimes, and buzzes identically on a device.

**Do not:** change any copy, colour, or haptic in this task. It is a pure
mechanical port; a behaviour change here is a bug.

---

## U0-5 · Skeleton loaders and a real empty-state language

**Why:** Four raw `ActivityIndicator`s. A spinner says "wait"; a skeleton says
"here is what is coming". On a slow Indian mobile connection — the actual
target network — this is the difference between a fast app and a broken one.

**Blocked by:** U0-3. **Effort:** M

**Touch:** `mobile/src/components/Skeleton.tsx` (create),
`mobile/src/components/ui.tsx`, all screens with a loading state

**Contract**

```tsx
<Skeleton width="100%" height={24} radius={8} />
<SkeletonGroup count={3} gap={12} />   // staggered shimmer
```

**Steps**

1. Shimmer is a Reanimated loop translating a `LinearGradient` across a
   `surfaceMuted` block. **Respect reduce-motion** — render a static block.
2. Replace every `ActivityIndicator` with a skeleton shaped like the real
   content. The Home screen skeleton should have a mascot-sized block, a
   stat-pill row, and a card.
3. Upgrade `EmptyState` in `ui.tsx` to take an optional illustration slot and
   give each empty state a line in the tutor's voice.

**Acceptance:** no `ActivityIndicator` remains except the app-boot font gate in
`App.tsx`. Skeletons visible when throttling the network to Slow 3G.

---

# PHASE U1 — The mascot

> Highest-impact phase in the document. Read §6 in full before starting.
>
> **Revised 2026-09-01 after the owner corrected me: Rive has an official MCP
> server.** An agent can drive the Rive desktop editor directly — creating
> artboards, shapes, meshes, bones, animations, state machines, states,
> transitions, and keyframes. This phase is therefore Rive-first, not
> SVG-first, and U1-4 is no longer blocked on hiring an animator. See §6.4 for
> the tool evaluation.

## U1-0 · Connect the Rive MCP server

**Why:** Gate on everything in this phase.

**Blocked by:** nothing. **Effort:** S. ⚠ **Owner action required — an agent
cannot do this step.**

**Steps (owner)**

1. Install the **Rive desktop editor** (Early Access build) — Windows and macOS
   only. The MCP server is bundled inside it; there is no separate install.
2. Enable the MCP server from within the editor. It listens on
   `http://127.0.0.1:9791/mcp`.
3. Connect Claude Code:
   ```bash
   claude mcp add --transport http rive http://127.0.0.1:9791/mcp
   ```
4. **The Rive editor must stay open** for the whole of U1-2/U1-3. The MCP
   server dies with the app.

**Acceptance:** `mcp__rive__session_info` returns successfully.

**Verified working 2026-09-01** — connected via
`npx -y mcp-remote http://127.0.0.1:9791/mcp`, editor BETA 0.8.5673. The tool
surface includes `mesh_rigging_tool` (generateMesh / bindBones / autoWeight),
`animation_editor` (state machines, transitions, conditions, keyframes,
`simulateStateMachine`), `upload_asset`, and `export_file`. Everything U1-2
needs is exposed.

⚠ **`export_file` IS plan-gated on this workspace** — confirmed by test, not
assumed. See the box at the top of U1-2: build free, upgrade only to export.

---

## U1-1 · Split the source art into layers

**Why:** A rig needs separately transformable parts. The source art is one flat
painted illustration. **This is the only step in the entire phase that an agent
cannot do well**, because separating a limb means inpainting whatever was
behind it.

**Blocked by:** nothing (can run parallel with U0). **Effort:** M.
**Owner installs Krita + krita-mcp (free); Claude then does the separation.**

### The separation is smaller than it looks — two rules

**1. Eyes and mouth are ADDED, not CUT.** A blink is not "cut the eye out and
reconstruct the socket behind it" — it is "draw a lid shape over the eye and
scale it down." The mouth is an overlay that covers the painted one. Additive
layers need **zero inpainting**, and they cover most of the expression system.

**2. Inpainting is only needed where a layer moves off what it covers**, and
the area scales with motion range. `armR` rotating ~15° reveals a thin wedge of
torso, not the whole arm's footprint. `armRaise` is one input of twelve — **v1
may skip arm motion entirely** and lose very little.

So the genuinely hard sub-problem (reconstructing occluded paint) reduces to
two small wedges, and is deferrable.

### Tooling — the free path (owner's choice, 2026-09-01)

**Krita 5.2+** and **[SanSaSane/krita-mcp](https://github.com/SanSaSane/krita-mcp)**,
31 tools. The two that make it viable:

- `run_python` — arbitrary Python with full **libkis** access. A complete
  escape hatch, so a missing tool never blocks the work.
- `get_image` — renders the canvas back as a PNG, so the separation is done
  with visual feedback rather than blind coordinate guessing.

⚠ **Community project, not in Anthropic's MCP registry — unvetted, and
`run_python` is arbitrary code execution against local files.** Review before
installing.

⚠ **No generative inpainting.** Krita has no Generative Fill. The two arm
wedges get clone/smudge, which will read as adequate rather than invisible.
The paid alternative is Photoshop + `photoshop-mcp`'s
`photoshop_generative_fill`; not chosen, and not needed unless the arms
disappoint.

**Deliverable:** `icons/layers/` — **one transparent PNG per layer**, named
exactly as below.

⚠ **Not a PSD.** Verified against the live MCP on 2026-09-01: `upload_asset`
accepts one png/jpeg/webp/svg/font/audio at a time and has **no PSD import**.
It does accept an absolute local path on localhost, so files under
`D:\Projects\Shabd\icons\layers\` upload directly with no base64 step.

Layer files:

```
jata          hair bun + locks           (behind head)
halo          empty layer, glow drawn in Rive
torso         body + shoulders + neck
drape         saffron uttarīya
dhoti         white lower garment        (full-body only)
mala          rudrākṣa beads
armL          left arm + hand + book     (separate from torso)
book          संस्कृतम् volume
armR          right arm + abhaya hand    (separate from torso)
head          face base + ears           (no features)
beard         moustache + beard
tilaka        tripuṇḍra + bindu
brows         both brows
eyeL / eyeR   white + iris, iris on its own sub-layer
lidL / lidR   closed-lid shape for blinking
nose
mouth         neutral closed mouth
```

**Steps**

1. Start from `icons/Adobe Express - file.png` (full body) and
   `icons/b3dd0e00-...png` (portrait) — the higher-resolution originals, not
   the downscaled copies in `mobile/assets/avatar/`.
2. Behind each moving part, inpaint what it occludes: torso behind both arms,
   face behind the beard, eye sockets behind the lids. Motion range is limited
   by how much you inpaint — a few degrees of arm rotation needs only a small
   patch.
3. Keep layers at source resolution; Rive downsamples on export.

**Do not:** flatten, crop, or recolour. Rive imports PSDs with layers
preserved, which is the entire point of this step.

**If no image editor is available:** ship a reduced rig — head, eyes, lids,
brows, mouth, and torso only, with the arms baked into the torso. That still
gets blinking, gaze, head turn, and speech, which is ~80% of the perceived
life. Add arms later.

---

## U1-2 · Build the Rive rig

**Why:** This is the character. Everything else in the phase is plumbing.

**Blocked by:** U1-0, U1-1, **and two owner actions** (bone creation, step 3;
plan upgrade at export, step 8). **Effort:** L. **Driven by the Rive MCP.**

### What the MCP can and cannot do — tested live, 2026-09-01

| Step | Tool | Status |
|---|---|---|
| Upload layer PNGs | `upload_asset` | ✅ works, plain local path |
| Place on artboard | `assets_tool addImageInstance` | ✅ works |
| Auto-trace a mesh | `mesh_rigging_tool generateMesh` | ✅ works — mind the density (step 2) |
| **Create bones** | — | ❌ **no tool exists; owner does this by hand** |
| Bind + auto-weight | `mesh_rigging_tool bindBones` / `autoWeight` | ✅ available once bones exist |
| State machine, states, transitions, conditions, keyframes | `animation_editor` | ✅ full surface |
| Headless verification | `animation_editor simulateStateMachine` | ✅ available |
| **Export `.riv`** | `export_file` | ❌ **plan-gated — see box above** |

Everything between "bones exist" and "ready to export" is fully automatable.
The two gaps are both short owner actions, not blockers.

**Steps**

### ⚠ Export is plan-gated on this workspace — tested 2026-09-01

`export_file` with `format: "riv"` was refused:

> `exportRiv is not available on this workspace's plan. Tell the user exporting
> (.riv and .rev) requires a plan upgrade in Rive. Do not retry, and do not try
> the other export format — both are gated on this workspace.`

**This does not block U1-2.** Rive's plans (2026): Free $0, **Cadet $9/mo
annual or $17/mo month-to-month** with unlimited `.riv` export, Voyager $32,
Enterprise $120. Critically, Rive states there is **no runtime fee — exported
files do not phone home and keep working forever, with or without an active
subscription.**

**So the sequence is: build the whole rig on the free plan, verify it with
`simulateStateMachine`, and upgrade only at the moment of export.** One
month-to-month cycle (~$17 / ~₹1,500) covers the export; the `.riv` is yours
permanently afterwards. Budget a second month if U1-6 (festival skins) needs a
re-export.

**Do not** spend anything until the rig is built and simulating correctly. If
the owner declines the upgrade, fall back to **U1-5 (SVG)** — every hour spent
on U1-1 and U1-3 still counts, because the layer separation and the rig
contract are renderer-agnostic.

1. `upload_asset` each PNG from `icons/layers/`, then `assets_tool
   addImageInstance` to place them on the artboard. Z-order per the layer list.
   ✅ **Verified working** — `upload_asset` accepts a plain Windows absolute
   path (`D:\...\tutor-portrait.png`); no data-URI or base64 step needed.
2. **Mesh the deformable layers.** `mesh_rigging_tool generateMesh` with
   `trace: true` (this is Auto Trace) on `head`, `drape`, `armR`, `armL`,
   `jata`. Non-deforming layers (`book`, `tilaka`, `mala`, `nose`) do not need
   a mesh — parent them to bones instead.

   ✅ **Verified working, and the density parameters matter enormously.**
   Measured on the real portrait art:

   | `detail` | `subdivisions` | vertices | verdict |
   |---|---|---|---|
   | 0.5 | 3 | **1,919** | far too heavy — one layer alone blew a 187KB hierarchy dump |
   | 0.3 | 1 | **121** | ✅ **use this as the starting point** |
   | 0.12 | 0 | 31 | too coarse to deform smoothly |

   **Budget: ~120 vertices per deformable layer, ~600 for the whole character.**
   Default parameters will silently produce 15× that and tank frame rate on the
   low-end Android devices this product targets.
3. **Rig with nested groups and transforms — not bones.**

   Each layer goes in a `group_editor` group, and expression is keyframed on
   group transforms (`x` 13, `y` 14, `r` 15, `sx` 16, `sy` 17, `opacity` 18).
   **This is fully automatable and requires nothing from the owner:**

   | Expression | Mechanism | Bones? |
   |---|---|---|
   | blink | `sy` on `lid` group | no |
   | mouthOpen | `sy` on `mouth` group | no |
   | gazeX / gazeY | `x`/`y` on `iris` groups | no |
   | browRaise | `y` on `brows` group | no |
   | smile | `mouth` swap or `y` offset | no |
   | armRaise | `r` on `armR` group about its pivot | no |
   | headTurn | `x` + slight `sx` on `head` group | no |
   | glow | `opacity` on `halo` | no |
   | breathe / sway / hop | already on `guru_root` | no |

   ⚠ **Bones cannot be created through the MCP.** Verified: `bindBones`
   against a non-existent bone returns `"No bones found to bind"`, and nothing
   in the 39-tool surface creates one — `component_editor` makes reusable
   Components, `group_editor` makes Nodes, neither is a Bone. Rive's Luau
   scripting is a *runtime* drawing API (`init`/`advance`/`draw`), not editor
   automation, so it is not a way round this either. **Both checked, not
   assumed.**

   This does not block anything, because **bones buy polish, not
   expression** — smooth cloth on the drape and a pseudo-3D head turn. See
   **U1-7**, which is optional and owner-gated.

   ⚠ **The gotcha that will cost you a day:** when several overlapping layers
   bind to the *same* bones — an arm split into upper arm and forearm — they
   must be auto-weighted in **one** `autoWeight` call using `targetIds`, so
   they solve as a single surface. Weighting them in separate calls produces
   mismatched weights at the overlap and **the artwork tears apart when the
   joint bends.**
4. Build **two artboards** sharing one state machine: `GuruPortrait` (head and
   shoulders, for the circular conversation badge) and `GuruFull`.
5. State machine `TutorSM` with exactly the inputs in §6.3. **Reuse the
   defaults** — a new artboard already ships one timeline named `Timeline` and
   one default state machine with Entry already wired. Rename that timeline to
   your first state; only create additional ones after that. Never leave a
   stale `Timeline` beside your named animations.
6. Author the seven states in §6.2 as timelines with blended transitions —
   `idle → speaking` must not pop.
7. Verify with `animation_editor simulateStateMachine`, driving `state` 0→6 and
   sweeping `mouthOpen`. This runs headless, so it catches a broken transition
   before the app ever loads the file.
8. Export to `mobile/assets/avatar/guru.riv`. **Budget: under 300KB.**

**Acceptance:** `simulateStateMachine` shows all seven states reachable with no
popping, every input visibly does something, and the exported `.riv` is on
disk under 300KB.

### Build state — what already exists in the Rive file

Built and verified 2026-09-01 by Claude via MCP. **Rive file: `Try`,
`fileId 2548203`, <https://editor.rive.app/file/try/2548203>.** Rename it to
`Shabd Guru` in the editor — the MCP has no rename-file command.

| Thing | Id | Status |
|---|---|---|
| Artboard `GuruPortrait` | `0-2` | ✅ 600×600, VM bound |
| Artboard `GuruFull` | `0-2118` | ⬜ 600×900, empty — needs art + VM bind |
| ViewModel `GuruInputs` | `0-14` | ✅ all 12 properties |
| VM instance `GuruInputsDefault` | `0-2130` | ✅ bound to `GuruPortrait` |
| State machine `TutorSM` | `0-7` | ✅ default SM, layer `0-8` |
| Group `guru_root` | `0-2199` | ✅ ambient keyframes live here |
| Image `guru_art` | `0-2198` | ⬜ placeholder flat PNG at 45% — replaced by layers in U1-1 |

**ViewModel property ids** — the app binds to these by *name*, but the ids are
needed for `createConditions`:

```
state 0-2094   mouthOpen 0-2096  headTurn 0-2098  gazeX 0-2100
gazeY 0-2102   browRaise 0-2104  smile 0-2106     armRaise 0-2108
glow  0-2110   intensity 0-2112  blink 0-2114 (trigger)
celebrate 0-2116 (trigger)
```

**States and their `state` value**, all reached from Any State by an
`equal` condition on `state`:

| value | state | animation id | state id | transition id |
|---|---|---|---|---|
| 0 | `idle` | `0-6` | `0-12` | `0-2155` |
| 1 | `speaking` | `0-2143` | `0-2149` | `0-2156` |
| 2 | `thinking` | `0-2144` | `0-2150` | `0-2157` |
| 3 | `listening` | `0-2145` | `0-2151` | `0-2158` |
| 4 | `celebrating` | `0-2146` | `0-2152` | `0-2159` |
| 5 | `encouraging` | `0-2147` | `0-2153` | `0-2160` |
| 6 | `patient` | `0-2148` | `0-2154` | `0-2161` |

**Architecture note — why Any State.** All seven transitions originate from Any
State rather than being wired state-to-state. One `equal` condition each on
`state` makes every state reachable from every other with 7 transitions
instead of 42, and adding an eighth state later costs one transition.

**Verified by simulation:** driving `state` 0→6 produced
`transitionsObserved: 7` with every state entered in order; a
`idle → celebrating → idle` round-trip also passes.

**Keyframes so far** (all on `guru_root`, so they survive the U1-1 layer swap):
- `idle` — breathe (`sy` 100→101.6→100) + sway (`r` −1.1→1.1→−1.1), 60f cubic loop
- `celebrating` — hop (`y` 0→−22→0→−9→0) with a squash/stretch settle on `sx`/`sy`

**Still empty:** `speaking`, `thinking`, `listening`, `encouraging`, `patient`
have states and transitions but no keyframes — they need the separated layers
from U1-1 before they can do anything beyond whole-figure transforms.

### Property keys (Rive integer keys, for `modifyKeyFrames`)

```
x 13   y 14   r 15 (degrees)   sx 16   sy 17   opacity 18   (0-100 scale)
```

**Do not:** vector-trace the artwork into flat shapes. The art is *painted*;
tracing it flat destroys the shading that makes it good. Rive's docs note
vector gives more deformation control — that matters for a Duo-style flat
character, and it is the wrong trade here. Mesh-on-raster is the correct
technique for this art (§6.4).

---

## U1-3 · The app-side rig contract

**Why:** The interface between "what the app feels" and "how the character
moves". Defined independently of the renderer so U1-4 and U1-5 are
interchangeable.

**Blocked by:** U0-3. **Effort:** M

**Touch:** create `mobile/src/components/guru/rig.ts`

**Contract**

```ts
export interface GuruRig {
  breathe:   SharedValue<number>;  // 0..1  torso scale
  sway:      SharedValue<number>;  // -1..1 gentle lateral tilt
  headTurn:  SharedValue<number>;  // -1..1 toward/away from learner
  headNod:   SharedValue<number>;  // -1..1 pitch
  blink:     SharedValue<number>;  // 0..1  lid closure
  gazeX:     SharedValue<number>;  // -1..1 iris offset
  gazeY:     SharedValue<number>;
  browRaise: SharedValue<number>;  // 0..1  interest / surprise
  smile:     SharedValue<number>;  // 0..1  mouth corner lift
  mouthOpen: SharedValue<number>;  // 0..1  speech aperture
  armRaise:  SharedValue<number>;  // 0..1  abhaya mudrā lift
  glow:      SharedValue<number>;  // 0..1  celebration halo
}

export function useGuruRig(): GuruRig;

/** Drives the rig from a semantic state. The ONLY public entry point. */
export function useGuruState(state: AvatarState, opts?: {
  speaking?: boolean;
  amplitude?: SharedValue<number>;  // live TTS level, when available
}): GuruRig;
```

**Steps**

1. Ambient loops in every state: `breathe` (2600ms, matching the existing
   feel), `sway` (3400ms), and a **stochastic blink** — every 3–7 seconds,
   randomised, occasionally a double-blink. Irregular blink timing is the
   cheapest thing that makes a character feel alive.
2. Per-state overrides per §6.2.
3. `mouthOpen` while speaking: follow a live amplitude signal if one exists,
   otherwise a pseudo-random flutter at 6–9 Hz with varied aperture.
   **Never a regular sine wave** — regular reads as a puppet, irregular reads
   as speech.
4. All ambient motion gated on `useReducedMotion()`.

**Do not:** put `setState` or any JS-thread work in the animation path.

---

## U1-4 · Integrate Rive into the app

**Blocked by:** U1-2, U1-3. **Effort:** M

**Touch:** `mobile/package.json`, `mobile/app.json`, create
`mobile/src/components/guru/GuruRive.tsx`, edit `TutorAvatar.tsx`,
`TutorFull.tsx`

**Steps**

1. `npm install @rive-app/react-native`, add its config plugin to `app.json`
   (it uses `withPodfileProperties`/`withGradleProperties` to pin runtime
   versions), then `npx expo prebuild --clean`.
2. `GuruRive.tsx` maps each `GuruRig` shared value onto its state-machine
   input by name. Drive inputs from a Reanimated reaction, not from React
   state.
3. Rewrite `TutorAvatar` and `TutorFull` to render it — **keeping their
   existing public props exactly** (`state`, `size`, `height`, `celebrate`).
   No calling screen changes in this task.
4. Keep `SpeakingRings` and the sparkle burst; they read well and are already
   Reanimated.

**Acceptance:** Conversation, Home, and Challenge render the rigged guru with
zero changes to those screens. `npx tsc --noEmit` clean. **Frame rate measured
on a physical low-end Android device and recorded in the commit message.**

**Do not:** change the prop signatures. Nothing downstream may know which
renderer is active.

---

## U1-5 · SVG fallback (only if Rive underperforms)

**Why:** Escape hatch. Rive benchmarks at ~60fps in React Native on Android —
far better than Lottie's ~17fps in the same test — so this will probably not be
needed. Build it only if U1-4's measured frame rate on real low-end hardware
disappoints.

**Blocked by:** U1-4 measurement. **Effort:** L. **Skip by default.**

Layered `react-native-svg` paths driven by the same `GuruRig`, selected behind
one flag in `guru/index.ts`. Because U1-3 defined the contract renderer-
agnostically, this is an additive file, not a rewrite.

**Do not** build this pre-emptively. It is real work that Rive probably makes
unnecessary.

---

## U1-6 · Expression variants and festival skins

**Why:** A character seen hundreds of times needs variety or it becomes
wallpaper. This is where the product earns affection.

**Blocked by:** U1-4. **Effort:** M

**Steps**

1. **Expression presets** as named state-machine poses: `neutral`, `warm`,
   `curious`, `proud`, `patient`, `sleepy` (long absence), `blessing` (session
   complete).
2. **Festival skins** — a `skin` input swapping accent colours and revealing
   one small prop layer: Diwali (a diyā, warm glow), Holi (colour dust motes),
   Guru Pūrṇimā (fuller halo), Makara Saṅkrānti (a kite). Date-driven,
   automatic, never announced with a modal.
3. **Register variants**: in `classical` the halo is subtly stronger and the
   palette cooler; in `laukika` he is warmer and more casual. This makes the
   register distinction *felt* rather than labelled.

**Do not:** add any variant that changes his identity — no different person, no
cartoon animal, no gender swap. Variants are wardrobe, not casting.

---

## U1-7 · Bone deformation (optional polish)

**Why:** The U1-2 rig moves layers as rigid pieces. Bones with mesh weighting
add what rigid transforms cannot: **cloth that flows** on the saffron drape and
jaṭā, and a **head turn with real dimension** instead of a flat slide.

**Blocked by:** U1-4 shipping and looking flat enough to bother.
**Effort:** M. ⚠ **Owner action required — bones cannot be created via MCP.**

**Skip this by default.** It changes no behaviour, adds no state, and touches
no app code. Do it only if the rigid cutout reads as stiff in the real app on a
real device.

**Steps**

1. **Owner** draws the bone chain by hand in the Rive editor: `head`, `jaw`,
   `armR`, `armL`, `torso`, `drape`, `jata`. A few minutes of manual work.
2. Agent meshes the deformable layers (`generateMesh`, `trace: true`, density
   per the table in U1-2 step 2 — **~120 vertices per layer**).
3. `bindBones` → `autoWeight`. `maxInfluences` caps at **4**; `blend` 0..1,
   0 rigid, 1 widest falloff.
4. ⚠ **Overlapping layers on shared bones must be auto-weighted in ONE
   `autoWeight` call** via `targetIds` — see the tear-apart warning in U1-2.
5. Re-export. **This costs another export cycle**, so batch it with U1-6
   rather than paying twice.

**Do not:** mesh layers that do not deform (`book`, `tilaka`, `mala`, `nose`).
Parent them to a bone instead — a mesh you never bend is pure cost.

---

# PHASE U2 — Core loop feel

## U2-1 · The session shell

**Why:** Duolingo's lesson chrome — top progress bar, close X, the check button
pinned under the thumb — is load-bearing UX. `Challenge.tsx` currently renders
a `ProgressBar` inline with no consistent shell, and Conversation has different
chrome again.

**Blocked by:** U0-4. **Effort:** L

**Touch:** create `mobile/src/components/SessionShell.tsx`; edit
`Challenge.tsx`, `Conversation.tsx`

**Contract**

```tsx
<SessionShell
  progress={0.375}          // animated, springs to new value
  onQuit={() => ...}        // confirms before discarding progress
  hearts={undefined}        // omit → no hearts (see Do not)
>
  {children}
</SessionShell>
```

**Steps**

1. Top bar: close X (left), animated progress track, optional streak pill.
2. Progress fills with `spring.snappy` and a brief overshoot. **Never jump.**
3. Quit shows a confirm sheet in the tutor's voice, not a system `Alert`.
4. The primary action is pinned to the bottom safe area, full width, and
   **disabled-but-visible** until an answer exists — never hidden.

**Do not** add a hearts/lives system without asking the owner. Duolingo's
hearts punish failure, and §3.3 plus the abstention principle mean this product
takes the opposite stance. The prop exists for a future decision; leave it
unset.

---

## U2-2 · Verdict moment, rebuilt

**Why:** The most-repeated emotional beat in the app. It currently slides a
coloured sheet with a text title. Duolingo-class means the sheet, the sound,
the haptic, the mascot reaction, and the particles land as *one* event.

**Blocked by:** U0-4, U1-3. **Effort:** L

**Touch:** `mobile/src/components/VerdictSheet.tsx`, create
`mobile/src/components/Confetti.tsx`

**Steps**

1. **`correct`**: sheet springs up (`spring.bouncy`), Skia confetti burst from
   the check button in saffron/gold/green, mascot → `celebrating`, existing
   success haptic + chime. Confetti is ~40 particles with gravity and rotation,
   auto-stopping after 1.4s. **Skipped entirely under reduce-motion.**
2. **`off_by_one`**: sheet in `warn` tones, gentle horizontal shake on the
   answer (±6px, 3 oscillations, `duration.quick`), mascot → `encouraging`.
3. **`incorrect`**: sheet in `bad` tones, target revealed with a soft
   `duration.telling` fade — **no shake, no red flash, no downward motion.**
   Mascot → `patient`, never disappointed (§3.8).
4. **`unsure`**: violet `unsureBg`, mascot → `encouraging`, copy *"I couldn't
   hear that clearly — no penalty. Try once more?"*, `haptics.near()`. **A soft
   upward drift, not a drop.** This is the moment that proves the product's
   ethics; get it right (§3.3).
5. Tapping anywhere dismisses immediately (§3.7).

**Acceptance:** all four verdicts distinguishable with the sound off, and with
the screen off (haptics alone). Verified on a physical device.

---

## U2-3 · Session-complete celebration

**Why:** Second-highest-impact surface in the app. It is where the *next*
session is sold, and it currently does not exist as a designed moment.

**Blocked by:** U2-1, U1-3. **Effort:** L

**Touch:** create `mobile/src/screens/SessionComplete.tsx`

**Steps**

1. Sequence, staggered — never all at once:
   - Guru enters with `blessing` pose + halo bloom (`duration.telling`)
   - Headline in Sanskrit + gloss (साधु! / "Well done!")
   - **XP counter rolls up** from 0 with decelerating easing — do not just print
     the number
   - Stat row springs in staggered: accuracy, new words, time
   - Streak flame with day count; if a freeze was consumed, a distinct
     "streak saved" beat with its own copy
   - Two actions: "One more" (primary) and "Done"
2. Confetti on entry, gated on reduce-motion.
3. If a personal best was hit, a badge reveal (Lottie, U3).

**Do not:** show a full-screen ad-style upsell here. If monetisation lands
later that is a separate, owner-approved decision.

---

## U2-4 · Draggable word bank

**Why:** `WordBank.tsx` is tap-to-select. Drag-and-drop with real physics is
what makes Duolingo's exercise feel tactile, and it is now possible because
gesture-handler is installed.

**Blocked by:** U0-2. **Effort:** L

**Touch:** `mobile/src/components/WordBank.tsx`

**Steps**

1. Tiles lift on press (scale 1.06, shadow deepens, `haptics.tap()`).
2. Drag with `Gesture.Pan()`; the answer row opens a gap under the pointer.
3. Release snaps with `spring.snappy`; an invalid drop returns home.
4. **Keep tap-to-select working.** Dragging is an addition, never a
   replacement — it is harder for children, elderly users, and anyone with a
   motor impairment.
5. Tiles carry Devanagari: every tile label uses `script()` (§3.2).

**Do not:** remove the tap path. Do not make drop targets smaller than 44×44pt.

---

## U2-5 · Screen transitions and shared elements

**Why:** Default stack push says "a new screen appeared". A considered
transition says "you moved somewhere".

**Blocked by:** U0-3. **Effort:** M

**Touch:** `mobile/App.tsx`, `mobile/src/navigation/MainTabs.tsx`

**Steps**

1. Entering a session: modal-style slide-up, tab bar hidden (already correct in
   `App.tsx` — keep that comment's reasoning).
2. Tab switches: cross-fade + 8px rise, `duration.quick`. No horizontal slide
   between tabs.
3. Session → SessionComplete: fade through warm paper, not a push.
4. All transitions shortened under reduce-motion.

---

# PHASE U3 — Navigation & progress

## U3-1 · The path

**Why:** The most recognisable element in the category, and the answer to
"where am I?". Five flat tabs give no sense of journey through a body of
knowledge — which, for Sanskrit, is exactly the wrong feeling.

**Blocked by:** U2-1. **Effort:** L

**Touch:** create `mobile/src/screens/Path.tsx`,
`mobile/src/components/PathNode.tsx`

**Steps**

1. A vertically scrolling winding path of nodes. Each node is a unit —
   mapped to the **feature bands** from `HANDOVER.md` P2-1, so the path and the
   content taxonomy are the same structure.
2. Node states: `locked` (muted, no shadow), `available` (saffron, gentle
   pulse), `current` (larger, mascot standing beside it), `complete` (gold ring
   showing mastery), `mastered` (filled gold).
3. The path is drawn with `react-native-svg` as a single curved path; nodes
   position along it.
4. Tapping a node opens a small sheet: unit name in Devanagari + gloss, the
   features it teaches, and a Start button.
5. Progress along the path derives from `Learner.feature_mastery` — already
   populated by the backend and currently displayed nowhere.

**Do not:** invent a new content taxonomy. The path visualises the feature
bands that already exist.

---

## U3-2 · Streak calendar and freeze

**Blocked by:** U3-1, and backend `HANDOVER.md` **P4-1/P4-2** (`DailyActivity`).
**Effort:** M

A month grid of activity, flame animation scaled by streak length, freeze count
as shield icons, and a distinct "streak saved" moment when a freeze is
consumed. ⚠ Render against the **learner's local date** — P4-1 warns that a
UTC-based streak breaking at 5:30am local is the most enraging bug in this
category, and the UI must not reintroduce it by formatting in UTC.

---

## U3-3 · Progress and mastery visualisation

**Blocked by:** U3-1. **Effort:** M

`Learner.feature_mastery` is a populated dict that nothing displays. Build a
mastery heat map over the feature taxonomy, grouped by kind (case / number /
tense / voice). Skia radial rings for per-category mastery. Tapping a feature
shows what it is, in plain language, in the tutor's voice.

---

## U3-4 · Achievements and badge reveals

**Blocked by:** U3-2. **Effort:** M

Lottie badge reveals for milestones that suit *this* product: first
conversation completed, first śloka memorised, all 5×5 sparśa consonants
pronounced, 7-day streak, first dual-number sentence. Badge art should use
Sanskrit visual motifs — lotus, kalasha, conch — not generic trophy icons.

---

## U3-5 · Leagues (optional, ask first)

**Blocked by:** U3-4. **Effort:** L

⚠ **Escalate before building.** Leaderboards drive Duolingo's retention hard,
but a competitive ranking sits awkwardly with a reverent guru-śiṣya framing, and
your audience includes elderly scholars who may find it distasteful. This is a
product-identity decision, not a UI one. **Do not build without an explicit
owner decision.**

---

# PHASE U4 — The uniquely-Sanskrit surfaces

> Everything above makes Shabd as good as Duolingo. **This phase is what makes
> it better** — five surfaces only possible because of the grading stack, and
> which no competitor can copy without rebuilding it.

## U4-1 · The varṇamālā articulation map

**Why:** The 5×5 sparśa matrix is not an arbitrary grid — it is a **physical map
of the mouth**, ordered by place of articulation from throat to lips. Every
other alphabet chart in every other app is a list of glyphs. This one can teach
you *where your tongue goes*. Architecture §13 already calls varṇamālā the
first real surface; this is what makes it worth being first.

**Blocked by:** U0-2. **Effort:** L

**Touch:** `mobile/src/screens/Varnamala.tsx`, create
`mobile/src/components/MouthDiagram.tsx`

**Steps**

1. Render the true 5×5 matrix (rows = place, columns = voicing/aspiration).
   The backend already returns `place` on every character — the data is there
   and the current screen throws it away by rendering flat lists.
2. Tapping a character opens a practice sheet with an **animated sagittal
   mouth cross-section** in SVG: tongue position morphs to the articulation
   point, the contact point pulses, and airflow animates for aspirates.
   `kanthya` → throat, `talavya` → palate, `murdhanya` → curled retroflex,
   `dantya` → teeth, `oshthya` → lips.
3. Colour-code the five rows by place, and use the same colours everywhere
   place is referenced in the app.
4. Wire the record-and-grade loop from `HANDOVER.md` **P3-4** into this sheet.
5. Show the minimal pair: tapping त offers "compare with ट" and animates
   between the two tongue positions. **That single interaction teaches the
   hardest contrast in Sanskrit for English speakers.**

**Do not:** invent articulation data. Use the `place` values the API returns.

---

## U4-2 · Devanagari stroke-order writing

**Blocked by:** U4-1. **Effort:** L

Animate each akṣara being written, stroke by stroke, with SVG path
`strokeDashoffset`. Then a trace mode: the learner draws with a gesture and gets
per-stroke feedback on order and direction. This is how children actually learn
a script, and it is the single best answer to "how do I use this app with my
8-year-old".

⚠ Stroke-order data does not exist in the backend. **Escalate** — it needs a
data source before the UI is worth building.

---

## U4-3 · The code-switch dial, made visible

**Why:** `sanskrit_ratio` is the product's most distinctive idea — the learner
owns a ceiling, the system drifts beneath it — and it is currently a percentage
in a pill on Home.

**Blocked by:** U2-1. **Effort:** M

Make the mix *visible*: a horizontal bar showing bridge-language vs Sanskrit
share that animates as it shifts, with the learner's ceiling marked as a line
the system's fill approaches but never crosses. In conversation, tint each
message bubble by language so the learner can *see* themselves crossing over
week by week. Nothing else on the market visualises this because nothing else
models it.

⚠ Respect the two-writer rule (`HANDOVER.md` §2.3): the slider writes
`sanskrit_ratio_setting` via `PATCH /me` only. The system's effective ratio is
display-only in the UI.

---

## U4-4 · Śloka as an unfurling manuscript

**Blocked by:** U2-5. **Effort:** M

The daily śloka currently renders as text. Make it an event: the verse fades in
line by line at `duration.telling`, each word tappable to expand its
`word_breakdown` (already returned by the API and currently unused), with the
metre visualised as a rhythm strip of long/short syllables that pulses in time
with the recitation audio. Palette and paper texture evoke a manuscript
without becoming a skeuomorphic gimmick.

---

## U4-5 · Sandhi visualisation

**Blocked by:** U4-4. **Effort:** M

When two words join, animate the junction: the two words slide together, the
final and initial sounds highlight, and the combined form morphs into place with
the rule named beneath. Sandhi is the concept that makes learners quit; seeing
it happen is worth more than any amount of explanation.

---

# PHASE U5 — Accessibility

> **Not optional. Not deferrable.** The stated audience is children through
> elderly pandits. Today the app has **one** accessibility prop and is unusable
> with a screen reader.

## U5-1 · Screen reader support

**Blocked by:** U2-2. **Effort:** L

Every interactive element gets `accessibilityRole`, `accessibilityLabel`, and
`accessibilityState`. Devanagari text needs an `accessibilityLabel` with the
IAST transliteration **and** an English gloss — a screen reader will not
pronounce Devanagari usefully. Verdicts announce via
`AccessibilityInfo.announceForAccessibility`. Decorative animation gets
`accessibilityElementsHidden`. Verify with TalkBack on Android and VoiceOver on
iOS — actually run them, do not assume.

## U5-2 · Dynamic type and elder mode

**Blocked by:** U5-1. **Effort:** M

Every layout must survive system font scaling to 200%. Audit every fixed
`height` on a text container and replace with `minHeight`. Add an explicit
**"Larger text" setting** in Profile that scales the app's own type ramp
independently of the OS — many older users never discover the OS setting.
Devanagari needs a *larger* minimum size than Latin to stay legible: conjuncts
lose resolution fast. Set a floor of 18pt for Sanskrit body text.

## U5-3 · Contrast and colour independence

**Why:** I measured every token in `theme.ts` against the `bg` `#FFF8EE` paper.
**Seven of nine fail WCAG AA for body text, including every semantic verdict
colour.** These are the colours carrying the app's most important words.

**Blocked by:** U5-1. **Effort:** M

**Touch:** `mobile/src/theme.ts`, plus any screen using a failing token for
body-size text

**Measured, 2026-09-01** (contrast against `#FFF8EE`):

| Token | Current | Ratio | Verdict | Suggested | New ratio |
|---|---|---|---|---|---|
| `ink` | `#3B2E25` | 12.42:1 | ✅ AA | keep | — |
| `inkSoft` | `#7A6A5C` | 4.92:1 | ✅ AA | keep | — |
| `inkFaint` | `#B4A28E` | **2.34:1** | ❌ fail | `#846F57` | 4.53:1 |
| `saffron` | `#E85B25` | 3.34:1 | ⚠ large only | `#CA4715` | 4.50:1 |
| `ok` | `#2FA84F` | **2.91:1** | ❌ fail | `#25833E` | 4.53:1 |
| `warn` | `#F0A01F` | **2.04:1** | ❌ fail | `#9D650B` | 4.63:1 |
| `bad` | `#E0453A` | 3.92:1 | ⚠ large only | `#D92E22` | 4.56:1 |
| `unsure` | `#8E7DF0` | 3.14:1 | ⚠ large only | `#6F59EC` | 4.61:1 |
| `gold` | `#F2B33D` | **1.76:1** | ❌ fail | `#99680A` | 4.59:1 |

**Steps**

1. **Split each semantic colour into two tokens** rather than darkening
   wholesale — the current bright values are correct for *fills* (button
   backgrounds, the flame, progress bars) and wrong only for *text*:

   ```ts
   ok:     "#2FA84F",   // fills, icons, large display type — unchanged
   okText: "#25833E",   // any text at body size on paper
   ```
   Do this for `ok`, `warn`, `bad`, `unsure`, `saffron`, and `gold`.
   `inkFaint` has no fill use — **darken it in place to `#846F57`.**
2. Audit every screen: text at `font.sizes.base` or smaller on `bg`/`surface`
   must use the `*Text` variant. Large display type (≥`font.sizes.lg` bold) may
   keep the bright value.
3. `gold` at 1.76:1 is the worst offender and is used for the streak flame
   count — a number learners check daily. Fix it first.
4. **No state may be communicated by colour alone.** Every verdict already has
   an icon and a distinct sound; make sure neither is ever dropped. Roughly 1
   in 12 men has a colour vision deficiency and your green/red verdict pair is
   exactly that axis.

**Acceptance**

```bash
cd mobile && node scripts/check-contrast.mjs
```

Expected: `All tokens pass.`, exit 0. The script ships in the repo and
currently exits 1 with **4 failures**. Note it holds fill-only tokens to the
easier 3:1 bar and `ok`, `warn`, `gold`, and `inkFaint` **still fail even
there** — `gold` at 1.76:1 is barely distinguishable from the paper. Register
each new `*Text` token in the script's `TOKENS` array as you add it.

Also verify the four verdict states remain distinguishable in a greyscale
screenshot.

**Do not:** darken the fill values. A muddy saffron button would trade one
problem for a worse one — that is why this task splits the tokens instead.

## U5-4 · Motor accessibility

**Blocked by:** U2-4. **Effort:** S

Every touch target ≥44×44pt. Tap alternatives for every gesture (§2-4 already
requires this). No interaction requiring a long press without a tap
equivalent. No time-limited interactions anywhere — a learner who needs 30
seconds to type Devanagari must never be timed out.

---

# PHASE U6 — Polish and performance

## U6-1 · Performance pass on real hardware

**Blocked by:** everything. **Effort:** M

Profile on a physical low-end Android device. Targets: 60fps sustained during
the verdict + confetti moment, <2s cold start, <100ms tab switch. Memoise the
guru SVG layers aggressively — re-rendering 400 path nodes per frame will
destroy frame rate. Measure and record the numbers in the commit.

## U6-2 · Sound design

**Blocked by:** U2-3. **Effort:** M

Four `.wav` files exist (`correct`, `incorrect`, `near`, `tap`). Extend to a
family: session start, streak extend, badge unlock, tile pickup/drop, path node
unlock. Consider tuning them to Indian classical intervals rather than generic
UI blips — a sā-pa drone under the session-complete moment would be
distinctive and appropriate. **Every sound respects the silent switch and a
user-facing sound toggle.**

## U6-3 · App icon, splash, and store assets

**Blocked by:** U1-5. **Effort:** M

The current icon is a 393KB PNG. Produce a proper icon set from the guru
portrait, an animated splash that transitions into the app rather than cutting,
and store screenshots. ⚠ Store submission itself is owner-gated — prepare
assets, do not submit.

---

## 6. The mascot, specified

### 6.1 Identity — non-negotiable elements

Every variant, expression, and skin preserves: the **jaṭā bun**, the
**rudrākṣa mālā**, the **tripuṇḍra + bindu** forehead marks, the **saffron
uttarīya**, and the **संस्कृतम् book**. These are what make him read as a
Sanskrit teacher rather than generic fantasy-monk stock art.

### 6.2 State → rig mapping

| State | Rig behaviour | Used when |
|---|---|---|
| `idle` | breathe, sway, stochastic blink, occasional slow gaze drift | default |
| `speaking` | + `mouthOpen` irregular flutter, small `headNod` per phrase, `headTurn` toward learner | TTS playing |
| `thinking` | `gazeY` up-left, `browRaise` 0.4, one slow head tilt, hand-to-chin if rigged | awaiting grading |
| `listening` | `headTurn` toward learner, `browRaise` 0.6, still torso, blink rate down | mic open |
| `celebrating` | `armRaise` 1.0, `smile` 1.0, `glow` bloom, two bounces `spring.bouncy` | verdict `correct` |
| `encouraging` | `smile` 0.6, slow single nod, open-palm gesture, `glow` 0.2 | `off_by_one` **and `unsure`** |
| `patient` | `smile` 0.3, neutral brows, slow blink | verdict `incorrect` |

**There is deliberately no disappointed, sad, or angry state.** §3.8.

### 6.3 Rive state machine brief

Build this in U1-2 via the Rive MCP. It doubles as the spec to hand a human
animator if that route is ever preferred.

> **Deliverable:** `mobile/assets/avatar/guru.riv`. Two artboards — `GuruPortrait`
> (head + shoulders crop) and `GuruFull` — sharing one state machine `TutorSM`.
>
> **Inputs:**
> - `state` — Number 0–6: 0 idle, 1 speaking, 2 thinking, 3 listening,
>   4 celebrating, 5 encouraging, 6 patient
> - `mouthOpen` — Number 0–1, driven per frame by the app
> - `headTurn`, `gazeX`, `gazeY` — Number −1..1
> - `browRaise`, `smile`, `armRaise`, `glow` — Number 0–1
> - `blink` — Trigger
> - `celebrate` — Trigger
> - `intensity` — Number 0–1, scales reaction size
>
> **Bones required:** `head`, `jaw`, `armR`, `armL`, `torso`, `drape`, `jata`.
> **Meshed layers:** `head`, `drape`, `armR`, `armL`, `jata`.
>
> **Source art:** `icons/guru-layered.psd` (from U1-1), traced back to
> `icons/Adobe Express - file.png` and `icons/b3dd0e00-...png`.
>
> **Constraints:** under 300KB. 60fps on a 4-year-old mid-range Android.
> Warm and dignified, never comic — he is a teacher, not a pet. **No sad,
> angry, or disappointed expression exists in any state.**

### 6.4 Tools evaluated, and why Rive

| Tool | Verdict | Reasoning |
|---|---|---|
| **Rive** | ✅ **chosen** | What Duolingo actually runs for Duo. Official React Native runtime. State-machine driven, which maps onto the existing `AvatarState` union. Benchmarks ~60fps in RN on Android vs Lottie's ~17fps, and files are 10–15× smaller. Imports layered PSDs, meshes raster images, supports bones with vertex weighting — so the *painted* art survives. And it has an official MCP server, so an agent can author the rig. |
| **Lottie** | ⚠ **partial** | Keep for one-shot decorative animation — badge reveals, empty states, the streak flame (U3). Cannot do interactive state-driven characters, and measurably slower. Wrong tool for the mascot, right tool for U3-4. |
| **Spline** | ❌ rejected | 3D, and web-first. A 3D guru carries real GPU cost on the ₹8,000 Android phones in the target audience, and the art is 2D painted — rebuilding it in 3D means discarding it and losing the illustration's character. Where it *would* have fit is the U4-1 mouth model, but a 2D sagittal cross-section teaches articulation more clearly than a rotatable 3D head, so it loses there too. |
| **Live2D Cubism** | ❌ rejected | Genuinely the best-looking option for exactly this art style — it exists to turn painted 2D illustrations into characters with pseudo-3D head turns. **But there is no official React Native runtime.** Only a Web SDK with React wrappers, which on mobile means a WebView: bad performance, bad integration, another rendering surface to fight. Ruled out on integration, not on quality. |
| **Skia / hand-coded** | ⚠ fallback | Maximum control, maximum work, and every expression change becomes an engineering ticket rather than an art change. This is U1-5, and only if Rive disappoints on measurement. |
| **Static PNG + effects** | ❌ status quo | What exists today. Caps at roughly 30% of Duolingo. |

**The load-bearing insight:** this guru is *painted*, not flat-vector. Duo is
flat because Duo was designed flat. Vector-tracing this art to make it riggable
would throw away the shading and warmth that make it good. Rive's
mesh-on-raster with bone weighting keeps the painting and adds the deformation —
that is why U1-2 forbids tracing.

### 6.5 Outsourcing instead of using the MCP

If the Rive MCP route stalls, §6.3 is already a complete animator brief — hand
it over verbatim along with `icons/guru-layered.psd`. Nothing else changes: the
app-side contract (U1-3) and the integration (U1-4) are identical whether the
`.riv` came from an agent or a human.

---

## 7. Copy and voice

The tutor speaks briefly, warmly, and never sarcastically.

| Situation | Say | Never say |
|---|---|---|
| Correct | "साधु! / Well done." | "Nice job, human." |
| Off by one | "So close — one ending to fix." | "Wrong!" |
| Incorrect | "Not yet. Here it is —" | "You failed." |
| **Unsure** | "I couldn't hear that clearly — no penalty." | anything implying learner error |
| Streak lost | "We begin again. That's how it works." | guilt, sad mascot, shaming |
| Long absence | "It's good to see you." | "You've been gone 12 days!" |

Devanagari first, gloss second, in that order, everywhere.

---

## 8. Motion reference

Use `motion.ts` tokens exclusively (U0-3). Quick rules:

- **Entrances** rise 8–16px + fade, `easing.entrance`, `duration.base`
- **Exits** are faster than entrances — `duration.quick`, `easing.exit`
- **Celebration** uses `spring.bouncy`; **UI response** uses `spring.snappy`;
  **the mascot** uses `spring.gentle`
- **Stagger lists** at 45ms, capped at 6 items
- **Never animate `width`/`height`/`top`/`left`** — use `transform` and
  `opacity`, which stay on the UI thread
- **Nothing decorative loops forever** except mascot breathing and the current
  path node's pulse

---

## 9. Definition of done

A UI task is done when **all** hold:

1. Its **Acceptance** command/check passes.
2. `cd mobile && npx tsc --noEmit` → **zero errors** (new baseline after U0-1).
3. `cd backend && ./.venv/Scripts/python.exe -m pytest -q` → at or above the
   count `HANDOVER.md` states for the current backend phase.
4. Verified on a **physical low-end Android device**, not just a simulator.
5. Verified with **Reduce Motion on** — nothing breaks, nothing spins forever.
6. Verified at **200% system font** — no clipping, no overlap.
7. Every new Devanagari text node uses `script()`.
8. No colour hardcoded outside `theme.ts`.
9. No file outside the task's **Touch** list modified.
10. Committed with the task ID in the message.

---

## 10. Verification loop

```bash
# Mobile typecheck — baseline is ZERO after U0-1
cd mobile && npx tsc --noEmit

# Run on a real device (Expo Go no longer works after U0-2)
cd mobile && npx expo run:android

# Backend must stay green
cd backend && ./.venv/Scripts/python.exe -m pytest -q
```

---

## 11. When to stop and escalate

- **U1-0 (Rive MCP setup)** — owner installs the Rive desktop editor, enables
  its MCP server, and runs `claude mcp add`. An agent cannot do this. The
  editor must stay open for U1-2.
- **U1-1 (layer separation)** — needs an image editor and inpainting. If no
  tool is available, ship the reduced rig described in the task and say so.
- **U1-5 (SVG fallback)** — do not build unless U1-4's measured frame rate on
  real low-end hardware is bad. Report the number and ask.
- **U3-5 (Leagues)** — product-identity decision about competition versus a
  guru-śiṣya framing. Do not build unasked.
- **U4-2 (Stroke order)** — needs a stroke-order data source that does not
  exist in the backend.
- **Hearts / lives** (U2-1) — contradicts the abstention stance; owner decision.
- **Any change that makes `unsure` look like failure** — §3.3. If a task seems
  to require it, the task is wrong.
- **Store submission** (U6-3) — owner-gated.
- **Replacing tap interactions with gesture-only ones** — an accessibility
  regression, never acceptable.

---

## 12. Quick reference

```
Install (U0-2):
  npx expo install react-native-svg react-native-gesture-handler expo-blur
  npx expo install @shopify/react-native-skia lottie-react-native
  npx expo prebuild --clean && npx expo run:android

Phase order:  U0 → U1 → U2 → U3 → U4 → U5 → U6
Never cut:    U5 (accessibility)
Cut first:    U6, U3-5

Design tokens:   mobile/src/theme.ts
Motion tokens:   mobile/src/motion.ts   (created in U0-3)
Mascot:          mobile/src/components/guru/
Source art:      icons/*.png
```
