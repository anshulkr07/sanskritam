# Sanskritam — UI, UX & Motion Handover

**Audience:** an implementing coding agent (DeepSeek-V4-Flash / Hermes).
**Written:** 2026-09-01. **Revised:** 2026-09-08 (ninth pass) — **U15, the
step player, landed** (Lesson rewrite, 7 renderers, Path units, Play-rule
reversal, Home "continue Unit N + due", Piṅgala, Licences, prefs that work);
backend 589, head `c1d2e3f4a5b6`. Still open: P8-0 review (owner), device
passes (hardware), U10-2 (gated on P8-0), P14 pricing, U1 (owner), U3-5 (ask
first).
**Companion docs:** [`HANDOVER.md`](HANDOVER.md) — backend and content.
[`LESSON_OVERHAUL.md`](LESSON_OVERHAUL.md) — **U15, the step player.** Read it
before touching `Lesson.tsx`, `Path.tsx` or `Play.tsx`: U15 rewrites the first,
reorganises the second, and reverses a rule stated at the top of the third.
The two docs are mostly independent, but U9 connects surfaces specified there
as P18, and U9-2's calendar depends on endpoints that already exist.

**Decisions locked by the owner:**

1. **React Native, not Flutter.** The working screens stay — 9,110 LOC now.
2. **Custom dev build, not Expo Go.** Native modules are now permitted.
3. **The guru mascot gets rebuilt as a rigged character — in Rive**, using
   mesh-on-raster so the painted art survives (§6.4).
4. **The Rive MCP server is used to author the rig**, so this does not block on
   hiring an animator. Owner sets it up in U1-0.
5. **Handwriting recognition is Google ML Kit** — Digital Ink on the canvas,
   Text Recognition v2 on photographed writing, **both on-device** (2026-09-05).
   This unblocked U4-2, which had been escalated since 2026-09-01 for want of a
   stroke-order data source. See U12.

---

## Ownership — read this first

Work on this document is **split between two agents.** Stay inside your lane.

| Phase | Owner |
|---|---|
| **U1 — the mascot (the Rive file)** | **Claude**, via the Rive MCP |
| U0, U2, U3, U4, U5, U6, **U7, U8**, U11–U14, **U15** | **DeepSeek / Hermes** |

**If you are DeepSeek: do not touch the Rive file, and do not build a mascot
renderer.** U1-3 (`mobile/src/components/guru/rig.ts`) and U1-4 (the
integration) are the seam. Claude delivers `mobile/assets/guru.riv` (canonical
path per `GURU_RIG_NOTES.md` Export) plus
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

Measured 2026-09-04, re-audited 2026-09-08 (counts below are the audit).
**This section replaces the 2026-09-01 inventory, which described an app
that no longer exists.**

### Inventory

| | 2026-09-01 | now (audited 2026-09-08) |
|---|---|---|
| Screens | 7 | **21** files in `src/screens/` (incl. Pingala, Licences, Writing, Vocab, Reader) |
| Shared components | 5 | **13+** (`derivation/` 3, `steps/` 9 incl. switch+types, `lesson/` 3, `writing/` 3, `guru/` 9) |
| Total | 3,824 LOC | **9,110 LOC** TypeScript (pre-U15 count — re-measure before quoting) |
| Typecheck | 3 errors | **0** |
| Accessibility props in the whole app | **1** | **100+** (`grep accessibility*` already exceeds the old 90) |
| Files using Reanimated | 2 | **27** distinct files (audit `grep reanimated`) |
| Files using legacy RN `Animated` | 3 | **0** |
| Skeleton loaders | 0 | 1 component, **nearly every loading screen uses it** (`Path.tsx` loading text is still a raw `<Text>`, not `Skeleton`) |
| Navigation | 5 flat tabs, 1 `navigate()` call | **6 tabs + drawer**, fully wired |
| Screen transitions | default push | customised |

### What shipped since

**U0 (foundation) — done.** Graphics stack installed (`react-native-svg`,
Skia, Lottie, gesture-handler, `expo-blur`), dev build in place, `motion.ts`
tokens, `useReducedMotion`, and **every legacy `Animated` import is gone.**
Caveat (audited 2026-09-08): Skia/Lottie/`expo-blur` ship in the bundle with
zero runtime imports (`Confetti` notes "since full Skia Canvas",
`AchievementReveal` notes "No Lottie art yet") — bundle cost, no use yet.

**U2 (core loop feel) — done.** `SessionShell`, the rebuilt verdict moment,
`Confetti`, `SessionComplete`, the draggable `WordBank`.

**U3-1, U3-3, U4-1, U4-3, U4-4, U5-3 — done.** The journey path, mastery
rings, the varṇamālā articulation map with `VocalTract`, the code-switch dial
on Progress, the śloka-as-manuscript treatment, and the contrast checker.

**U7 (proof surfaces) — done.** `DerivationPlayer`, `SutraCard`,
`ScansionStrip`, `WordOrder`, `Paradigm` — all backed by live endpoints.

**U8 (information architecture) — done.** Six tabs (Home · Path · Talk · Play ·
Grammar · Progress) plus the left drawer; Home is the daily hub; Play is the
lab; Śloka and Varṇamālā are Home cards. **No screen in the app is unreachable.**

**U15 (the step player) — done 2026-09-08, practice kinds completed same day.**
`Lesson.tsx` is a sequence now
(one step, progress, check, verdict, next — Challenge's vocabulary, no second
one); `components/steps/` holds 10 renderers (grid_fill writable via
engine-drawn choice chips; derive_next with the five dials shown; sandhi both
ways with a join-tree; scan_metre tappable L/G; reorder tap-to-place with the
visible feedback WordOrder was missing; contrast A/B; build/articulate/read
as ungraded practice over WordBank/VocalTract/passage — backend `PRACTICE_
KINDS` no-op); Path renders eleven
units with locked nodes DISABLED; Play rule reversed (sandbox here, graded in
lessons) with Daily-word `built` fixed and Sandhi + Pingala cards; Home shows
"continue Unit N" + honest due count; Piṅgala-as-binary screen (its "try it on
a real verse" is static navigation, no live scan call); Licences
screen rendering `GET /licences`; haptics + reduce-motion prefs drive real
behaviour (`services/prefs`). Pairs with `HANDOVER.md` P23.

### The three real problems now

**U9 closed the connection gap.** Pronunciation has a mic and a violet
`unsure` verdict, Progress reads all four progress endpoints and renders a real
streak calendar, the app resolves its deployed URL, and the last two spinners
are skeletons. **Nothing finished in the backend is unreachable any more.**

**1. The mascot is still a static PNG.** `TutorAvatar.tsx` declares six states
and renders one flat image for all six. **This is the owner's lane** (U1,
`rive_ui.md`, `src/components/guru/`) — do not pick it up.

**2. Accessibility is started, not done — and the app tripled.** 100+
accessibility props (audited 2026-09-08, was 90 across 15 screens) is real progress from 1, but only
`MainTabs.tsx` handles font scale, U5-1/U5-2/U5-4 are open, and the stated
audience is children through elderly paṇḍits. Every screen added since
2026-09-01 was written against §3's rules but **verified against none of them
on a real device.** This is U5, and it gets dearer every week.

**3. The content behind the screens is no longer waiting on a review queue.**
264 challenges, **264 approved**; 6 scenarios, **6 approved** (P8-0 cleared
2026-09-08 — was 33/1 and the queue grew weekly). Talk has six dialogues
(P17-2 audio re-render pending for 70 nodes). **No UI work fixes audio
coverage** — but do not read a short session as a client bug, and make sure
an exhausted pool renders as an empty state rather than a spinner (U10-2).

**4. The app is unusable by someone who cannot read Devanagari.** Every screen
assumes the script, and the IAST that would carry a beginner is **wrong on 49%
of challenge rows** (`HANDOVER.md` P7-13). For the audience this product is
aimed at — a Class 6 student who did not choose Sanskrit — that is not a polish
problem, it is the front door. **U12** is the answer and P7-13 gates it.

### What is already good — do not rebuild it

- **`theme.ts` is a real design system.** Warm paper (`#FFF8EE`), saffron
  action (`#E85B25`), semantic verdict tones, and the Baloo 2 Devanagari
  pairing solved correctly via the `script()` helper. Extend it; don't replace.
- **`color.unsure` / `unsureBg` (violet)** are finally in use — the
  pronunciation verdict (U9-1). Every new abstention moment uses them.
- **The chunky solid-shadow button** in `ui.tsx` is the right visual language.
- **`motion.ts` and `useReducedMotion`** are the motion contract now. Use them;
  do not hand-roll durations.
- **`haptics.ts` and `sfx.ts`** are clean wrappers — though only 2 files call
  `sfx` today (U6-2).
- **The `AvatarState` union is already a state machine**, and the Rive rig
  lands behind it without touching a single screen.

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

| Phase | Theme | Status |
|---|---|---|
| **U0** | Foundation — deps, dev build, motion tokens, kill legacy Animated | **done** |
| **U1** | The mascot — Rive rig | **owner's lane, in progress** — do not touch |
| **U2** | Core loop feel — session shell, verdict, complete | **done** |
| **U3** | Navigation & progress — the path, streak, leagues | U3-1, U3-2, U3-3, U3-4 done · U3-5 ask first |
| **U4** | The uniquely-Sanskrit surfaces | U4-1, U4-3, U4-4, U4-5 done · U4-2 → **U12** |
| **U5** | Accessibility — the child→pandit mandate | U5-1 announcements + U5-2 ramp/floor + U5-3 + U5-4 44pt done · static audit 0 issues · **device TalkBack/VoiceOver pass open (needs hardware)** |
| **U6** | Polish & performance | U6-2 sound family + U6-3 asset prep done · **U6-1 device profiling open (needs hardware; submission owner-gated)** |
| **U7** | The proof surfaces — derivation, scansion, word order | **done** |
| **U8** | Information architecture — six tabs, drawer, Home hub, Play | **done** |
| **U9** | Connect what the backend already has | **done** |
| **U10** | What first users need from the client | **U10-1 client done 2026-09-08 (Google + Apple-iOS + Guest; device-verify pending) + U10-3 done** — pairs with `HANDOVER.md` P8 · **U10-2 open (gated on P8-0)** |
| **U11** | Ask anywhere — help on any screen | **done 2026-09-06** — pairs with P19 |
| **U12** | Learning to write Devanagari — ML Kit ink + OCR | U12-1/2/3/4/5 done in code · `expo-camera` installed 2026-09-08 **· ML Kit packages deliberately not installed (seam names 404; real: `react-native-digital-ink` + `@infinitered/react-native-mlkit-text-recognition`) — install+rewire+prebuild+device proof is one later hardware step** |
| **U13** | The reader — tap a word, the engines answer | **U13-1/2/3 done; P21-4 canon filter done 2026-09-08** — pairs with P21 |
| **U14** | Curriculum — Lesson screen, visuals, vocab, graded reading | **U14-1/2/3 + minimal U14-4/5 done 2026-09-07** — pairs with P22 |
| **U15** | The step player — Lesson rewrite, renderers, units, maths, licences | **done 2026-09-08** — pairs with P23 |

⚠ **U5 is still the first thing anyone should pick up.** U9 closed the last
gap between a finished backend surface and a learner reaching it, so most of
what is left in this document is quality, not connection.

**U11, U12 and U13 were the exception** — added 2026-09-05 as new surfaces
rather than polish. **U11 and U13 are done (2026-09-06)**; U12-4 alone still
waits on the ML Kit dev build. U13 reused U11-2's sheet exactly as planned.

**U5** — it is **not** optional or deferrable. It was placed after U2 only
because retrofitting accessibility onto three screens is cheaper than onto
fifteen, and there are fifteen now. 90 accessibility props is a real start and
not the mandate. If schedule pressure appears, cut U6 and U3-5, never U5.

# PHASE U0 — Foundation — DONE 2026-09-01

U0-1 … U0-5 all shipped (commits `7e490fc`, `4f0c4c1`, `d302406`,
`a810029`, `0bdf922`). Baseline is 0 TS errors, the graphics stack is
installed, `motion.ts` and `useReducedMotion` exist, and no file imports
RN's legacy `Animated`. U0-5's last two spinners became skeletons in U9-4.

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

### ⚠ Amendment 2026-09-03 — measured, and most of this step is unnecessary

The premise above ("the source art is one flat *painted* illustration") was
checked against the file and is **wrong in the way that matters.** The portrait
is **flat vector-style art with hard edges and a tight palette** — the shading
is a few soft gradients, not brushwork.

Two consequences:

**1. Rule 1 goes further than the text admits.** Lids and the mouth are not
just "additive" — they do not need to come out of the artwork *at all*. They
are **shapes drawn in Rive with the pen tool**, filled with a colour sampled
from the face. No Krita, no krita-mcp, no `run_python` against local files, no
inpainting, and no community MCP to security-review.

**Proven, not asserted:** `icons/rig/blink-proof.png` composites a drawn lid
over the real art at 0 / 45 / 75 / 100% closure. The 45% frame reads as a
natural eyelid. The 100% frame reads as a slab **because PIL can only draw a
polygon with a flat lower edge** — in Rive that edge is a bézier, which is the
whole reason this belongs in the rig and not in an image editor.

**2. So U1-1 shrinks to three optional cuts** — `brows`, `iris` (gaze), and
`head` (head turn) — none of which block a first rig. **Blink, mouth, breathe,
sway and glow together are most of the perceived life, and they need zero
separation.** Build those first; cut art later, only if the rig proves it is
worth it.

### Measured geometry — portrait

Source: `icons/b3dd0e00-9ff6-4064-859c-8b9ef5d8f240.png`, **1254×1254 RGBA**.
Artboard `GuruPortrait` is 600×600, so **scale = 0.4785**.

| Part | Source px (x0,y0,x1,y1) | Artboard 600×600 |
|---|---|---|
| eyeL almond | 513, 421, 601, 455 | 245.5, 201.4, 287.6, 217.7 |
| eyeR almond | 661, 421, 749, 455 | 316.3, 201.4, 358.4, 217.7 |
| scleraL | 532, 432, 588, 452 | 254.5, 206.7, 281.3, 216.3 |
| scleraR | 680, 431, 740, 452 | 325.4, 206.2, 354.1, 216.3 |
| browL | 500, 370, 630, 424 | 239.2, 177.0, 301.4, 202.9 |
| browR | 640, 370, 770, 424 | 306.2, 177.0, 368.4, 202.9 |

Iris centres: **L (562,437) r16** → artboard (268.9, 209.1) r7.7 ·
**R (708,437) r16** → artboard (338.8, 209.1) r7.7.

Fills sampled from the art: lid **`#EC771B`** (left) / **`#FA9430`** (right —
the right side of the face is lit warmer, do not use one fill for both) ·
lash **`#1A140D`**.

⚠ The brow sits directly on the lash line — there are only ~3px of visible
upper lid between them. So the closed lid must be filled with **cheek** skin
(the values above, sampled at y≈470), not with a pixel sampled from between
brow and lash, which is shadow and renders muddy brown. This was the first
attempt's actual failure.

Full-body source is `icons/Adobe Express - file.png`, **1024×1536**; artboard
`GuruFull` is 600×900, so its scale is **0.5859**. Its geometry is not measured
yet — do the portrait rig first.

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
8. Export to `mobile/assets/guru.riv` (canonical path). **Budget: under 300KB.**

**Acceptance:** `simulateStateMachine` shows all seven states reachable with no
popping, every input visibly does something, and the exported `.riv` is on
disk under 300KB.

### Build state — what already exists in the Rive file

Built and verified 2026-09-01 by Claude via MCP. **Rive file: `Try`,
`fileId 2548203`, <https://editor.rive.app/file/try/2548203>.** Rename it to
`Sanskritam Guru` in the editor — the MCP has no rename-file command.

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

> **Superseded in implementation (audited 2026-09-08).** The `SharedValue` /
> `useGuruState` contract below was the spec. What shipped is the evolved
> contract in `GURU_RIG_NOTES.md`: `rig.ts` exposes Rive-binding setters
> (`setState/headTurn/gazeX/…/viseme/gesture`), `Guru.tsx`/`GuruScene.tsx`
> are marked RIVE-PATH-DORMANT, and `guru/index.ts` exports only `GuruNative`
> (layered `<Image>`s + Reanimated, no Rive runtime). Screens use `<Guru>` /
> `<GuruNative>`, not this interface. Keep the spec text for history; do not
> build to it.

**Why (original):** The interface between "what the app feels" and "how the character
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

> **Superseded in implementation (audited 2026-09-08).** Export is plan-gated,
> so the app ships `GuruNative.tsx` (layered `mobile/assets/guru/*.png` +
> Reanimated, pixel-equivalent to the .riv per `GURU_RIG_NOTES.md`) instead of
> a Rive runtime. Swap status: Conversation uses `<GuruNative>`; Home and
> SessionComplete still use `<TutorFull>`; `GuruScene` is finished and
> unplaced; `TutorAvatar` has no callers. Single deliverable path is
> `mobile/assets/guru.riv` (see `GURU_RIG_NOTES.md` Export).

**Blocked by (original):** U1-2, U1-3. **Effort:** M

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

# PHASE U2 — Core loop feel — DONE 2026-09-01

U2-1 … U2-5 shipped (commits `916fa52`, `c19977c`): `SessionShell`, the
rebuilt verdict moment, `Confetti`, `SessionComplete`, the draggable
`WordBank`, and screen transitions. **Do not rebuild these** — extend them.

---

# PHASE U3 — Navigation & progress

## U3-1 · The path — DONE 2026-09-01

`screens/Path.tsx` (343 lines), commit `a3db00d`. Reachable since U8-0.
**P7-5 in `HANDOVER.md` re-points it at approved content once that exists.**

## U3-2 · Streak calendar and freeze — DONE 2026-09-04 via U9-2

The 35-day grid, the daily goal and the freeze rule all landed with the
progress endpoints (commit `cff5540`). Colour-then-text, and the freeze is
explained before it fires.

## U3-3 · Progress and mastery visualisation — DONE 2026-09-01

Radial mastery rings per feature group in `screens/Progress.tsx`.
**Still reads `/me` only — the three progress endpoints land in U9-2.**

## U3-4 · Achievements and badge reveals — DONE 2026-09-08

`services/achievements.ts` (5 milestones: prathama-samvada, prathama-sloka,
sparsha-pancaka, sapta-dina, dvivacana-prathama — Sanskrit motifs kamalam /
kalasha / shankha / deepa / yugma, local AsyncStorage bookkeeping, idempotent)
+ `components/AchievementReveal.tsx` (skippable Reanimated sheet, Reduce
Motion instant, sfx.badgeUnlock + haptics) + Progress shelf + events wired in
Conversation / Challenge (dual) / Shloka / Varnamala (sparsha) / Progress
(streak). Lottie lotus/kalasha/conch ART is owner-supplied — the motif renders
as a word-mark until it lands. Original spec below for reference.

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

> Everything above makes Sanskritam as good as Duolingo. **This phase is what makes
> it better** — five surfaces only possible because of the grading stack, and
> which no competitor can copy without rebuilding it.

## U4-1 · The varṇamālā articulation map — DONE 2026-09-01

`VarnaGrid.tsx` + `VocalTract.tsx` + `phonetics.ts`, commit `a3db00d`.
**The mic that makes it a practice surface instead of a reference is U9-1.**

## U4-2 · Devanagari stroke-order writing — UNBLOCKED 2026-09-05, moved to U12

The escalation is resolved. It read: *"stroke-order data does not exist in the
backend — it needs a data source before the UI is worth building."* The owner
has chosen **Google ML Kit Digital Ink** for recognition, which needs no
reference dataset at all, plus authored stroke paths for the demonstration and
for the order feedback ML Kit does not provide.

It also outgrew this phase. **See `PHASE U12`**, and `HANDOVER.md` P20 for the
content and grading contract.

---

## U4-3 · The code-switch dial, made visible — DONE 2026-09-02

Lives on Progress, not in the drawer — a differentiator hidden in a settings
list stops being one. Writes `sanskrit_ratio_setting` only (`HANDOVER.md`
§2.3: the user owns the ceiling, the system owns the value).

## U4-4 · Śloka as an unfurling manuscript — DONE 2026-09-02

`screens/Shloka.tsx` — verse fades in line by line, metre as a rhythm strip.
The corpus behind it is 96 verses since `HANDOVER.md` P7-6b.
Its loading state became a content-shaped skeleton in U9-4.

## U4-5 · Sandhi visualisation — DONE (in code; doc synced 2026-09-07)

`components/derivation/SandhiVisual.tsx` (junction slide + highlight +
cross-fade, rule via reused `SutraCard`, no conjunct path-tweening), consumed
in `screens/Grammar.tsx` from `GET /grammar/sandhi` (P11-2). Original spec
below for reference.

**Blocked by:** U4-4. **Effort:** M

When two words join, animate the junction: the two words slide together, the
final and initial sounds highlight, and the combined form morphs into place with
the rule named beneath. Sandhi is the concept that makes learners quit; seeing
it happen is worth more than any amount of explanation.

⚠ **Amended 2026-09-02, two changes.** The rule name is no longer
hand-authored — `HANDOVER.md` P9 derives it (`6.1.87 आद्गुणः`) and P11-2
supplies the split. And the animation is **U7-1's** `SutraCard` plus its
diffed-span cross-fade, reused: build those there, consume them here. Do not
write a second morph implementation, and heed U7-1.3 — Devanagari conjuncts
cannot be path-tweened.

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

## U5-3 · Contrast and colour independence — DONE 2026-09-02

Commit `d7c9920`: `*Text` tokens registered in the contrast checker,
decorative fills marked. **The rule stands for every new surface** — colour is
never the only signal, and U9-1/U9-2 both state status in text.

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

## U6-3 · App icon, splash, and store assets — PREP DONE 2026-09-08 (submission owner-gated)

Asset inventory, all wired in `app.json` (validated with `expo config`):
`icon.png`, Android adaptive set (foreground/background/monochrome),
`favicon.png`, and `splash-icon.png` — the splash `image` key was missing and
is now wired to the existing asset. Store submission itself stays owner-gated:
prepare assets, do not submit. Original spec below for reference.

**Blocked by:** U1-5. **Effort:** M

The current icon is a 393KB PNG. Produce a proper icon set from the guru
portrait, an animated splash that transitions into the app rather than cutting,
and store screenshots. ⚠ Store submission itself is owner-gated — prepare
assets, do not submit.

---

# PHASE U7 — The proof surfaces — DONE 2026-09-02

U7-1 … U7-5 shipped (commit `3a3ae32`): `DerivationPlayer`, `SutraCard`,
`ScansionStrip`, `WordOrder`, `Paradigm` — each backed by a live endpoint
(`/grammar/derive`, `/grammar/scansion`, `/grammar/word-order`,
`/grammar/paradigm`). All local computation, ₹0 per call.

⚠ The rule that produced this phase still binds: **anywhere the app
asserts a grammatical fact, it must be able to show the derivation that
proves it.** New surfaces inherit that, and a metre the engine did not
return is never displayed.

---

# PHASE U8 — The information architecture — DONE 2026-09-02

U8-0 … U8-6 shipped (commits `3a3ae32`, `d6b08e2`). Six tabs —
**Home · Path · Talk · Play · Grammar · Progress** — inside a left drawer
holding Settings. Home is the daily hub (Continue, śloka, daily word,
varṇamālā); Play is the lab; Śloka and Varṇamālā are Home cards, not tabs.
**No screen in the app is unreachable.**

⚠ **Six tabs is the decided maximum** and the bar is already at its width
limit (icons-only below 360dp or at font scale ≥1.5). A seventh tab is an
owner decision — see §11.

---

# PHASE U9 — Connect what the backend already has — DONE 2026-09-04

U9-1 … U9-4 shipped (commits `01c867c`, `48aa08d`, `cff5540`, `3f0e506`,
`2a17266`).

- **U9-1** — the pronunciation surface: a mic beside the `VocalTract`
  articulation, permission asked at first record rather than at mount, and a
  verdict that renders `unsure`/`abstained` in **violet** with "no penalty"
  copy. It shows the backend's **contrast class**, not a bare score. §3.3 held.
- **U9-2** — Progress reads `/progress/daily`, `/progress/streak`,
  `/progress/repair`, and a **new `/progress/history`** the calendar needed
  (the existing endpoints carried only the current streak). The 35-day grid is
  colour-**then-text**, never colour alone. The freeze rule is stated before it
  fires. The Sanskrit-ratio dial stayed put.
- **U9-3** — `BASE_URL` resolves per build, LAN in dev, Cloud Run in release,
  and **fails loudly** on an unset release URL.
- **U9-4** — the last two spinners are content-shaped skeletons.

⚠ **U3-2 is satisfied by U9-2** — the streak calendar exists now.

---

# PHASE U10 — What first users need from the client

> Rewritten 2026-09-05. `HANDOVER.md` P8 is the next milestone and it is
> gated on a review queue, not on code — but three of its tasks have a client
> half, and one of them is the first impression a stranger ever gets.

**Blocked by:** nothing, except U10-2 which waits on the review queue.

## U10-1 · The first ninety seconds

**Why:** `config.ts` still auto-logs in as `DEFAULT_LEARNER_NAME = "Sisya"`
through `/auth/dev-login`. That is the developer's path, not a stranger's.
`Login.tsx` (394 lines) is written and `POST /auth/anonymous` exists —
`HANDOVER.md` P8-3 is the backend half of this.

**Effort:** M · **Touch:** `mobile/src/config.ts`,
`mobile/src/store/auth.tsx`, `mobile/src/screens/Login.tsx`

1. A fresh install reaches a usable session **with no typing.** Anonymous
   first; an account is something a learner is offered later, never a gate in
   front of the product.
2. **The dev-login path must be unreachable in a release build.** A named
   auto-login that silently works is how ten testers end up sharing one
   learner row and one mastery map.
3. The first screen a stranger sees should let them **do something in under a
   minute** — not configure. The Sanskrit-ratio dial is a differentiator
   (U4-3) and it is also a question nobody can answer before their first
   session. Ship a default; let them change it after they have felt it.

**Acceptance:** fresh install → usable session, no typing · dev-login
unreachable in release · two devices get two learner rows · 0 TS errors.

## U10-2 · The challenge screen, once the pool is reviewed

**Why:** every challenge now carries `accepted_parses` **derived** from Vidyut
(`HANDOVER.md` P7-4), so U7's proof surface applies to all of them and is
wired to none. And 33 of 249 challenges are approved today — a session will
run short until P8-0 clears the queue.

**Blocked by:** `HANDOVER.md` P8-0. **Effort:** S

1. Reuse `DerivationPlayer` for a case/number/person miss. **Do not build a
   second one**, and do not touch the LLM explainer path (`HANDOVER.md` §6:
   the derivation answers grammar, the LLM answers meaning).
2. **Handle running out of content gracefully.** With 33 approved challenges a
   learner can exhaust the pool. An empty selector must read as "you're ahead
   of us today", never as an error and never as an infinite spinner — §U0-5's
   rule, and `Skeleton` is not the answer for a state that will not resolve.

**Acceptance:** a grammatical miss offers the derivation, a non-grammatical
one does not · an exhausted pool renders a real empty state · 0 TS errors.

## U10-3 · Errors a stranger can survive

**Why:** `HANDOVER.md` P8-2 adds crash reporting. The client half is what the
learner *sees* when something fails, and today a failed request mostly
resolves to a silent `catch` and a permanently empty card — `Home.tsx` does
exactly this for the śloka and daily-word fetches.

**Effort:** M · **Touch:** the screens that fetch — `Home`, `Challenge`,
`Conversation`, `Shloka`, `DailyWord`, `Progress`

1. A failed fetch says so and offers **retry**. A card that is empty forever
   because a promise rejected is indistinguishable from a card with no content
   — the same §2.11 confusion, one layer out.
2. **Never lose a learner's spoken attempt to a network error.** If STT or the
   pronunciation upload fails, say the network failed — do not let it read as
   a wrong answer. §3.3 and `HANDOVER.md` §2.2 both forbid that.
3. Offline is a normal state on the target hardware, not an exception.

**Acceptance:** every fetching screen has a visible, retryable failure state ·
no `catch` that silently leaves a permanent skeleton · a network failure during
an attempt never renders as a verdict.

---

# PHASE U11 — Ask anywhere — DONE 2026-09-06 (backend P19 same day)

The button and the sheet exist. `src/ask/AskProvider.tsx` is the app-wide
provider owning a floating ≥44pt trigger above the tab bar — never a seventh
tab — that hides during verdicts (Challenge suppresses it) and under Reduce
Motion loses only its entrance. Screens register what they are showing via
`useAsk().setContext` (Grammar: the submitted word · Shloka: the verse ·
Challenge: the target sentence), so the learner never types context.
`components/AskSheet.tsx` is the bottom sheet (U11-2): the subject stays
visible while reading; an ENGINE answer renders U7-1's `SutraCard` steps
(badged "authoritative", no second derivation renderer), a MODEL answer is
prose badged "Explanation"; scansion shows syllables + G/L and never a metre
name the engine did not return (U11-3). Engine path has no spinner; errors
are retryable, never a silent empty sheet; the quota-spent fallback
(`engine_fallback`) is announced plainly and still shows the subject.

# PHASE U12 — Learning to write Devanagari — MOSTLY DONE 2026-09-06

Owner decision stands: recognition is on-device ML Kit only; the recogniser
seam (`services/inkRecogniser.ts`) require()s the native module and, until
the dev build ships, says so honestly instead of faking a verdict. Cloud
recognition is deliberately absent (§2.16 reverses, not reroutes).

- **U12-1 done** — `components/writing/StrokePathPlayer.tsx` animates P20-2's
  ordered strokes with pen-travel direction, reference letterform beside the
  drawing, replay + "Show all" always available (never a gate), Reduce Motion
  shows the finished letter immediately.
- **U12-2 done** — `components/writing/WritingCanvas.tsx`: pan-gesture ink on
  SVG, reference ghost at low opacity, the śirorekhā drawn beneath every
  letter, undo/clear, no timer anywhere (§U5-4).
- **U12-3 done** — `screens/Writing.tsx` renders the backend's three-valued
  verdict (P20-3): correct soft green · unsure VIOLET (`color.unsureBg`) with
  "I couldn't read that — no penalty" and the reference + player offered
  again · wrong only a confident different letter. The client never grades.
- **U12-5 done** — Writing is Varṇamālā's practice mode: a stack screen
  reached from a "Write these letters" CTA on the Varṇamālā screen. Not a
  seventh tab.
- **U12-4 open** — the paper path needs the ML Kit Text Recognition dev
  build (camera viewfinder, on-device OCR, discard). The backend contract
  (`source: "photo"`, biased thresholds, per-source abstention metrics) is
  already live.

> A learner stuck on the Sandhi screen has nowhere to ask. **The backend that
> answers them already exists** — `HANDOVER.md` P19 makes it callable without a
> conversation; this phase is the surface.

**Blocked by:** P19-1 (the session-free endpoint). U11-1 can be prototyped
against the existing session-bound endpoint on the Talk screen first.

## U11-1 · The button

**Effort:** M

A persistent, small, always-reachable affordance. Not a chat tab — a **way to
ask about what is on screen right now**, which means it carries context the
learner never has to type: the surface, and the thing they are looking at.

Design constraints, all of them existing invariants rather than new ones:

- **≥44×44pt** and reachable one-handed (§U5-4). It sits above the tab bar,
  never over the answer input, and never over the verdict.
- **It moves out of the way.** Not present during a verdict animation, and it
  never blocks the learner (§3.7).
- **Never a seventh tab** (U8-1, §11). Six is the decided maximum.
- **Reduce Motion** removes its entrance, not its existence (§3.4).

## U11-2 · The answer sheet

**Effort:** M

A bottom sheet, not a new screen — the learner must still see the thing they
are asking about while they read the answer. Losing the sandhi pair behind a
full-screen modal defeats the feature.

**The answer has two shapes and they must not look alike.** An engine answer is
a derivation: ordered steps with sūtra numbers, and it is authoritative. A
model answer is prose, and it is help. Reuse **U7-1's `SutraCard`** for the
first — do not write a second derivation renderer — and mark the second plainly
as an explanation. A learner should never have to wonder which one they are
reading.

⚠ Show the scansion, never a metre name the engine did not return (§11).

## U11-3 · Latency and the empty case

**Effort:** S

An engine answer is instant and local. A model answer is measured at
**1.3–3.0 s** and can fail. So: no spinner at all on the engine path, a
content-shaped skeleton (U9-4's pattern) on the model path, and a **retryable
error state, never a silent empty sheet** — the U10-3 rule, which exists
because `Home.tsx` used to swallow fetch failures into permanently blank cards.

When the daily LLM quota is spent the sheet says so plainly and still shows the
engine answer (P19-3). It does not pretend the button is broken.

---

# PHASE U12 — Learning to write Devanagari

> The app assumes you can already read the script. **For the audience that
> makes this app matter — a Class 6 student who did not choose Sanskrit — that
> assumption is the entire barrier.** This is the on-ramp, and it does not
> exist.

**Backend:** `HANDOVER.md` **P20** — the corpus, the grading contract, the
privacy rule. **Blocked by:** P7-13 (every screen here shows IAST beneath the
Devanagari and 49% of it is currently wrong) and P20-1/P20-2 (the items and the
stroke paths).

**Owner decision 2026-09-05:** recognition is **ML Kit Digital Ink** on the
canvas and **ML Kit Text Recognition v2** for photographed handwriting. Both
on-device. This is what unblocked U4-2.

### What is already installed — do not add dependencies for this

`@shopify/react-native-skia` 2.6.2 and `react-native-gesture-handler` 2.32.0
are both in `package.json`. **The canvas is a solved problem here** — a Skia
path fed by a pan gesture is the whole drawing surface. What is new is the
native recognition module, which needs a config plugin and a dev build; U0-2
already established that Expo Go does not work on this project, so that cost is
paid.

## U12-1 · The demonstration

**Effort:** M

Each akṣara animates stroke by stroke — SVG path `strokeDashoffset`, driven by
P20-2's ordered paths. This was the original U4-2 idea and it is still the
right one: it is how children actually learn a script, and it is the honest
answer to *"how do I use this app with my 8-year-old"*.

Replayable, pausable, and **never a gate** (§3.7). A learner who wants to skip
straight to writing must always be able to.

## U12-2 · The canvas

**Effort:** L

Skia + gesture-handler. A guide box holding the reference letter at low opacity
behind the stroke, and a baseline — the **śirorekhā**, the headline every
Devanagari letter hangs from. It is the thing beginners most often get wrong,
and no Latin-script writing app ever has to teach it.

Undo the last stroke, clear, try again. **No timer anywhere** (§U5-4: a learner
who needs thirty seconds is not failing).

Strokes go to ML Kit on-device and **never leave the device**
(`HANDOVER.md` §2.16). What the client sends the server is a recognised string
and a confidence — never the stroke array.

## U12-3 · Feedback that abstains

**Effort:** M. **The most important task in this phase.**

§3.3 is an invariant — `unsure` is never red, never a failure — and this is the
surface most likely to break it. A beginner's letterforms are exactly what a
recogniser handles worst, so **most early attempts will be uncertain, and the
recogniser is the one that yields.**

- **Recognised** — the guru approves; the letter settles into place.
- **Unsure** — the reference appears beside what they drew, the animation is
  offered again, and the invitation is to try once more. **Not amber as a soft
  red.** It should read as *"let me show you again"*, which is what a teacher
  does.
- **Wrong** — only when the recogniser is *confident* it saw a *different*
  letter. Rare by design.

Two distinct claims live here and the UI must not conflate them: *"that is the
letter आ"* — which ML Kit answers — and *"that is how आ is written"*, which only
P20-2's stroke data answers. A learner who drew a correct-looking आ in four
backwards strokes has done one thing right and one wrong, and telling them so
is the entire value of the feature.

## U12-4 · The paper path — DONE in code 2026-09-08 (dev build still required to RUN)

`services/photoRecogniser.ts` (on-device OCR seam, dynamic-require, honest
unavailable adapter — mirrors `inkRecogniser.ts`, no cloud fallback) +
`components/writing/PhotoCapture.tsx` (single-letter viewfinder + framing
guide, denied-state copy, photo discarded immediately after recognition —
nothing retained, nothing uploaded) + `Writing.tsx` ink/photo mode switch
(same `POST /writing/attempt` pipeline with `source: "photo"`, biased
thresholds server-side per P20-4). Without the ML Kit Text Recognition dev
build both layers render the honest unavailable card. Original spec below for
reference.

**Effort:** M. Owner decision: **included** (`HANDOVER.md` P20-4).

Write on paper, photograph it, get feedback. The camera view frames a single
letter or word — not a page — which improves recognition and, more importantly,
keeps a child's name and the rest of their exercise book **out of frame**.

The photo is processed on-device and discarded. It never uploads, never lands
in a log, never enters a crash report (§2.16).

Because OCR on beginner handwriting is materially less reliable than stroke
recognition, this path **biases hard toward `unsure`**: an unreadable photo
shows the reference beside the crop and asks the learner to compare. Never a
bare rejection — that is a teacher handing back a bad photocopy, and it is
honest about which of the two actually failed.

## U12-5 · Where it lives

**Effort:** S

**Not a seventh tab** (U8-1, §11). Varṇamālā is already a Home card and this is
its practice mode — the same relationship U9-1's mic has to U4-1's articulation
map. A learner who cannot yet read the script must reach it from the first
screen, without navigating a product written in a script they cannot read.

⚠ **This changes what the first ninety seconds mean** (U10-1). A learner who
cannot read Devanagari currently meets a challenge screen they cannot parse.
Coordinate with U10-1 rather than bolting an onboarding branch on afterwards.

---

# PHASE U13 — The reader — DONE 2026-09-06

> **The catalogue is not the product.** archive.org has had these texts for
> twenty years. What nothing else has is *tap any word and four engines
> answer*.

`mobile/src/screens/Reader.tsx` (a stack screen, not a seventh tab) ships
U13-1/2/3. Backend companion `HANDOVER.md` P21-1/2 (`GET /shlokas`). Entry
point: a "Read" card at the top of the Grammar tab.

## U13-1 · The verse index + page-turn reading

`Reader.tsx` has TWO postures, one screen:
- **Index** — a vertical scroll of collapsed verse cards (the contents page,
  *not* a pager; U13-1). Uses U9-4's pattern — content-shaped skeleton, a
  U10-3 retryable error state, and an honest empty state. Corpus comes from the
  new `GET /shlokas` endpoint (date-ordered, auth-bound).
- **Reading** — tapping a card opens that verse as a full page. *(Superseded
  2026-09-15 — the book, below.)*

**The book (2026-09-15, replaces `PageFlip`/`BookFlip`).** A book's contents
open with its cover (`components/book/BookCover.tsx`) and an **Open book** /
**Continue · 5.35** button; the chapter list stays below. Open book, or any
verse row, opens the book at that verse: the cover turns away, then every
verse is a page that **curls like paper** under the finger
(`components/book/PageCurlBook.tsx`) — forward and back, a diagonal pull
lifting a corner, the sheet's back and its shadow showing.
- The resting page is a live view (words tap, the gloss opens). A turn draws
  a Skia snapshot of it (`makeImageFromView`) bent round a cylinder by an SkSL
  shader (`book/curlMath.ts`) over the live neighbour page. Snapshots are
  taken at rest and re-shot when a page changes — never on touch-down.
- Previous/Next, the slider and a contents jump turn ONE leaf, never a riffle;
  a tap finishes any automatic turn (§3.7).
- Reduce Motion swaps pages instantly, swipe included (§3.4). So does web:
  Skia cannot snapshot RN views there, and `CurlLayer.tsx` (the web twin of
  `CurlLayer.native.tsx`) keeps Skia out of that bundle.
- While a book is open the drawer's edge swipe is off (it would steal a page
  turned back from the spine) and Android back returns to the contents.
- No horizontal pager: the index stays a scroll; the book is a reading
  posture, not the primary browse.

## U13-2 · Tap a word

Words render from `word_breakdown` (NOT split from the verse text — sandhi
fuses boundaries and the breakdown is the trustworthy tokeniser). A tap:
- expands an inline gloss card — word, meaning, feature chips (₹0, instant);
- and opens U11's `AskSheet` with `{surface:"shloka", subject:word}` context,
  so the engine path (`parse`/`split`/`scansion` via P19) and the model
  explanation are one tap away. The learner never types context.

Tapped word is highlighted (saffron tint) so the reading position is visible.

## U13-3 · Reading, not drilling

No verdict, no streak, no score, no meter — the reader is a reference posture.
A "Ask about this verse" affordance routes to the same AskSheet at verse
granularity. Per P21 the list never triggers TTS (audio goes only on what is
studied).

---

# PHASE U14 — Curriculum: the learning surface — DONE minimal 2026-09-07

> Backend phase `HANDOVER.md` P22 is DONE minimal. `Lesson.tsx` (U14-1),
> `VisualGrid/Tree/StateMachine` (U14-2, presentational over pre-computed
> `visual_data`), Path `has_lesson` split button (U14-3), `Vocab.tsx` from a
> Play card (U14-4 minimal), graded tiers inside `Reader.tsx` (U14-5 minimal,
> same tap-a-word page, no new screen, no verdict/score). Full spec below for
> reference; what remains is content depth (Units 4–11, full 500-word vocab,
> full DCS graded reading — all licence/content work, not client work).

> The backend phase is `HANDOVER.md` P22. The app has a world-class engine with
> no lesson content. The Path goes straight to a challenge. U14 builds the
> surface that sits between the two — a Lesson screen, visual renderers, a
> progressive vocabulary screen, and a graded reading path. Full strategy:
> [`CURRICULUM.md`](CURRICULUM.md).

**Blocked by:** P22-1 (the Lesson content type and endpoint). U14-1/2/3 are
the client half of P22-1/4. U14-4/5 depend on P22-5/6.

**What already exists:** the `SandhiVisual` (U4-5), the `DerivationPlayer`
(U7-1) with `SutraCard`, the `ParadigmScreen` (U7-5), the `ScansionStrip`
(U4-4), and the `AskProvider`/`AskSheet` (U11). These are the *explanation*
components — U14 wraps them in a lesson structure.

## U14-1 · The Lesson screen

**Effort:** M · **Touch:** create `mobile/src/screens/Lesson.tsx`, extend
`navigation/types.ts`, `api/client.ts`, tests

A new screen reached from a Path node when `has_lesson` is true. Shows the
lesson `body` (markdown → formatted text), the `examples` (2–3 sentences,
each tapable — opens the ask-anywhere sheet with the word as subject), and
the `visual_type` area (U14-2). A "Practice" button at the bottom routes to the
Challenge screen.

Use `script()` for Devanagari text, `color`/`space`/`radius`/`font` tokens
from `theme.ts`, and `motion.ts` for entrance animations. Stick to the
existing component vocabulary — `SessionShell`, `Button`, `Skeleton` for
loading, and the U10-3 retryable error pattern for failures.

**Acceptance:** a node with a lesson opens the Lesson screen before the
Challenge · empty lesson body gracefully degrades to the examples · 404
from the backend shows the honest "no lesson yet" state · `tsc --noEmit` clean.

## U14-2 · The visual renderers

**Effort:** M · **Touch:** create `mobile/src/components/lesson/VisualGrid.tsx`,
`lesson/VisualTree.tsx`, `lesson/VisualStateMachine.tsx`, tests

Three renderers, one per `visual_type`:

- **`grid`** — a declension table or varṇa matrix. Reuses the `ParadigmScreen`
  cell pattern (vibhakti × vacana grid). The varṇa 5×5 grid shows place of
  articulation as column headers and effort as a row label.
- **`tree`** — a sandhi or derivation tree. Reuses `SandhiVisual`'s
  layout (already built for junction display) and `DerivationPlayer`'s
  `SutraCard` for step-by-step derivation.
- **`state_machine`** — verb conjugation as a state diagram. Shows the 10
  lakāras as states and the transformations as transitions. Do not build a
  custom SVG renderer; use the existing `DerivationPlayer` step list with
  lakāra labels as a first pass, and revisit when the pedagogy demands it.

**Do not render a visual from scratch client-side.** The `visual_data` JSON
comes pre-computed from the backend (P22-1). The client is a presentational
wrapper. This keeps the expensive computation server-side and makes the
visuals consistent across devices.

**Acceptance:** each visual type renders from the JSON the backend sends · grid
cells are tapable (tap a cell → ask-anywhere) · tree steps are numbered · the
derivation engine is never called client-side · `tsc --noEmit` clean.

## U14-3 · Path → Lesson → Challenge flow

**Effort:** S · **Touch:** `mobile/src/screens/Path.tsx`, `navigation/types.ts`,
`api/client.ts`

Modify `Path.tsx` `onStartUnit` and the sheet to check `has_lesson` before
routing. The flow: tap a node → sheet opens → "Start unit" becomes "Learn"
(if `has_lesson`) + "Practice" (always). "Learn" → `Lesson` screen. "Practice"
→ existing `Challenge` screen. The Lesson screen's "Practice" button also
navigates to Challenge.

**Acceptance:** nodes with a lesson show the split button · nodes without
show the existing single button · back-navigation from Lesson returns to Path ·
`tsc --noEmit` clean.

## U14-4 · The Vocabulary screen

**Effort:** M · **Touch:** create `mobile/src/screens/Vocab.tsx`, extend
`navigation/types.ts`, `api/client.ts`, tests

**Blocked by:** P22-5 (the `/vocab/{topic}` endpoint).

A screen reachable from the Play tab (add a card to `Play.tsx`'s grid) or from
Home. Topic selector — the 10 situation slugs from `briefs.py` (greeting,
family, food, market, travel, routine, weather, school, health, festivals) —
with a frequency-ordered word list below. Each word card: Devanagari + IAST
(large), gloss, gender, stem, tap-to-hear (pre-rendered audio URL). Tap a word
opens the ask-anywhere sheet.

Not a seventh tab (U8-1). Use the existing Play card pattern.

**Acceptance:** topic selector loads the word list · frequency ordering is
preserved · audio plays from the pre-rendered URL · empty state for a topic
with no words yet · `tsc --noEmit` clean.

## U14-5 · The Graded Reading surface

**Effort:** M · **Touch:** create or extend `mobile/src/screens/Reader.tsx`,
`api/client.ts`, tests

**Blocked by:** P22-6 (the `/reader/{tier}` endpoint).

Extend the Reader screen (U13) with a graded tier selector: three levels —
Simple (Units 2–3), Sandhi (Unit 6), Compounds (Unit 10). Each level loads
from `/reader/{tier}`. Uses the same tap-a-word pattern as U13-2 — the word
breakdown + ask-anywhere sheet. Reading, not drilling (U13-3): no verdict, no
streak, no score.

**Acceptance:** tier selector loads the correct tier · word tap works (same
pattern as U13-2) · empty tier returns the honest empty state · `tsc --noEmit`
clean.

---

# PHASE U15 — The step player — DONE 2026-09-08

> The lesson stops being a page and becomes a sequence. `Lesson.tsx` was 207
> lines of prose with one interaction (open the Ask sheet); it is now a step
> player with seven gradable renderers, and `Path.tsx` renders eleven units
> instead of a flat tag list. Backend phase: `HANDOVER.md` P23. Full audit:
> [`LESSON_OVERHAUL.md`](LESSON_OVERHAUL.md).

## U15-1 · `Lesson.tsx` becomes a step player — DONE

One step at a time, `ProgressBar` + "n/N", `VerdictSheet`, `haptics.*`,
`announceForAccessibility` on every verdict (inside the sheet) — Challenge's
loop vocabulary, no second one. Entry by `lessonId` (new) or `featureId`
(legacy). The `body` survives as a collapsible summary. Completion routes to
Practice. A network failure on submit keeps the step with inputs intact —
never a verdict.

## U15-2 · One renderer per step kind — DONE

`mobile/src/components/steps/`: `ExplainStep`, `GridFillStep` (blanks as
engine-drawn choice chips — no Devanagari keyboard needed),
`DeriveNextStep` (hidden step + sūtra options + the five dials shown),
`SandhiStep` (split/join choices + a join-tree), `ScanMetreStep` (tappable L/G
with text labels, never colour alone), `ReorderStep` (tap-to-place),
`ContrastStep` (A/B). Every Pressable carries role + label (audit 0 issues).

## U15-3 · Path becomes units — DONE

`GET /units` → eleven expandable units with per-unit progress. Locked nodes
are `disabled`, announced as locked, and never navigate (were opacity-0.5 and
still pressable). Lesson sheet: Learn (step player, by id) + Practice.

## U15-4 · Reverse the Play rule — DONE

Same components grade inside lessons; Play keeps every card as an ungraded
sandbox door. Header copy says so honestly. Daily-word `built: false` fixed
(the screen exists); Sandhi + Pingala cards added.

## U15-5 · Home routes into the lesson — DONE

Primary CTA is "continue Unit N" with the honest `GET /review/due` count
("· N due today") once reviews exist; falls back to Practice with no units.

## U15-6 · The mathematics layer — DONE (first slice)

5×5 coordinate caption on Varṇamālā (row = where, column = how); five dials
shown on every derive step; sandhi join-tree; **Piṅgala screen** (binary
enumeration 2^n + mātrāmeru → Fibonacci, one screen, no reviewer, engine
check behind "try it on a real verse"). Compounds-as-trees waits on the
analyzer (no samāsa exercises — owner decision stands).

## U15-7 · Licences and credits — DONE

`Settings.tsx`'s dead row navigates (via the drawer parent) to the new
`Licences` screen, which renders `GET /licences` and nothing else — name,
taken, exact licence, verbatim credit. Gated on P23-4a only; the release
gate (attributed content ships only with this screen in the build) is a
checklist line, not a task edge. Bonus in the same touch: `services/prefs`
makes the haptics + reduce-motion toggles drive real behaviour
(`useReducedMotion` ORs the override; `loadPrefs` runs at boot).

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

> **Deliverable:** `mobile/assets/guru.riv` (canonical path). Two artboards — `GuruPortrait`
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
3. `cd backend && ./.venv/Scripts/python.exe -m pytest -q` → at or above
   **650** (`HANDOVER.md` §3, 2026-09-08 build). A UI task should not move it at all.
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
- **A seventh bottom tab** (U8-1). Six is the decided maximum and the bar is
  already at its width limit.
- **Any retry cap, heart, or meter on the pronunciation surface** (U9-1) —
  same standing ruling as hearts; there is no version of this to negotiate.
- **A learner's handwriting image or raw strokes leaving the device** (U12,
  `HANDOVER.md` §2.16). On-device recognition is why ML Kit was chosen over
  Cloud Vision; routing around it for accuracy reverses an owner decision.
- **A recogniser verdict of `wrong` where `unsure` belongs** (U12-3, §3.3). A
  first attempt at an unfamiliar script is the worst place in this product to
  be confidently wrong at someone.
- **Stroke-order charts copied from a textbook** (U12-1, P20-2). Frequently
  copyrighted — author them or use a freely-licensed source, and record which.
- **A toggle between the two reader layouts** (U13-1). Pick one; the pager is
  for the daily verse and the list is for study.
- **A second derivation renderer** (U11-2). `SutraCard` exists — U7-1.
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

Done:         U0 · U2 · U3-1 · U3-2 · U3-3 · U3-4 · U4-1 · U4-3 · U4-4 · U4-5
              · U5-1-announce · U5-2-ramp · U5-3 · U5-4-44pt · U5-audit-0 · U6-2-sounds
              · U6-3-prep · U7 · U8 · U9 · U10-1-gated · U10-3 · U11 · U12-1/2/3/4/5-code
              · U13 · U14-minimal
In progress:  U1 (the Rive rig) — OWNER'S LANE, do not touch
Start here:   U10-2 once P8-0 clears (derivation on miss + empty-pool state)
              then device passes: TalkBack/VoiceOver (§U5-1) + U6-1 profiling
Then:         U6-3 submission (owner-gated) → U3-5 only if owner approves
Static audit: node scripts/a11y-audit.js → 0 issues (report-only; the device
              pass is still required)
Never cut:    U5 (accessibility)
Cut first:    U6-1 profiling depth, U3-5
Ask first:    U3-5 (leagues)
Unblocked:    U4-2 → now U12 (ML Kit Digital Ink, owner decision 2026-09-05)

New surfaces, 2026-09-15 — the Grammar tab rebuild (bilingual guide):
  Grammar.tsx         hub: EN | हिन्दी toggle, search (topics + glossary; a
                      Devanagari query offers Word Lab), New-here / Continue
                      cards, level chips, 18 collapsible chapters, tools, glossary
  GrammarTopic.tsx    one idea per page: term, one-liner, blocks, go deeper,
                      quick check, see-it-proved, key terms, lesson/practice
                      (never [staged]), mark as understood, prev/next
  WordLab.tsx         GET /grammar/lookup names the typed form first (each
                      reading engine re-derived); build / all-forms / sandhi
  components/grammar/ BlockRenderer · InlineText (** and {{}}) · QuickCheck ·
                      ProofPanel · GlossarySheet · LangToggle · Collapsible ·
                      LevelPill · AudioButton
  prefs.guideLang     one persisted language for hub, topic, glossary, Word Lab
  grammarGuide.ts     read marks, last topic, last-good guide cache (offline)
  AudioButton         renders only when a node carries audio_url; every guide
                      Sanskrit string has a clip (1,662, rendered 2026-09-15)

New surfaces, 2026-09-08 — P23's client half, the LIVE phase:
  U15  the step player   Lesson.tsx stops being an article and becomes a
                         sequence of gradable steps. Full spec, contracts and
                         invariants: LESSON_OVERHAUL.md §7.
  U15-1 step player · U15-2 one renderer per step kind (mostly wiring —
  Paradigm, DerivationPlayer, SandhiVisual, WordBank, VocalTract,
  ScansionStrip already exist) · U15-3 Path becomes units · U15-4 reverse the
  Play rule · U15-5 Home routes into the lesson · U15-6 the mathematics layer
  · U15-7 Licences and credits — renders GET /licences (P23-4a).
  U15-1/2 gated on P23-2/3; U15-7 on P23-4a. U15-7 does NOT block any backend
  task — it gates the RELEASE of attributed content, not the import that
  produces it (LESSON_OVERHAUL.md §6, P23-4a). Ship it early anyway: it is the
  cheapest item here and it is owed for content we already ship today.

  ⚠ U14's premise is superseded. Its Lesson screen was built to spec and the
  spec was the problem: prose + a static visual + one Ask sheet, nothing
  answered. U14-4/5 (vocab, graded reading) stand.

New surfaces, 2026-09-07 — P22's client half, the learning layer:
  U14  curriculum        the Lesson screen, visuals, vocab, graded reading
  U14-1/2/3 unblocked once P22-1 ships; U14-4/5 gated on P22-5/6

New surfaces, 2026-09-05 — the rest of this doc is polish, these are not:
  U11  ask anywhere      backend mostly exists (P19) — cheapest
  U12  learning to write largest new audience (P20); gated on P7-13's IAST
  U13  the reader        reuses U11-2's sheet (P21); do not start it first

No new dependencies needed for U12's canvas: Skia 2.6.2 and
gesture-handler 2.32.0 are already installed. ML Kit needs a config
plugin and a dev build — Expo Go was already ruled out in U0-2.

Design tokens:   mobile/src/theme.ts
Motion tokens:   mobile/src/motion.ts   (created in U0-3)
Mascot:          mobile/src/components/guru/
Source art:      icons/*.png
```
