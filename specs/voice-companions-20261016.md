# Voice companions release — 16 October 2026

Owner authorized commit, push, deployment and OTA. The release is frontend-only:
no backend code changed in this work, so no backend deployment was made. The
committed commerce backend remains undeployed, as the monetization plan requires
commerce to be enabled on a testing backend first.

## What shipped

- The Voice tab is now a three-step chooser: a hub of eight groups (Guru,
  Friend, Family, Yoga, Āyurveda, Jyotiṣa, Itihāsa, Kathā), a page inside each
  group with its named companions, and the live call with the companion the
  learner picks.
- 27 companions, each with one distinct quality and a call setting inside the
  server's bounds. Every companion has a unique (pipeline, speaker, pace, pitch)
  fingerprint; the backend persona enum is unchanged.
- Portraits are placeholder plates in the group's colour until the paintings
  arrive (`mobile/src/voiceLab/companionImages.ts` is the empty registry).
- Only the last-used companion is stored (`shabd.voice.recent.v1`) for the
  "Talk again with" card.

## Commit and checks

- Commit `61b838a108ee3e9ac5ea892fe0ee0adf86e03702` on `main`, pushed to
  `origin/main`. It also carries the pending checkout work the owner asked to
  include: the Android 1.5.0 (10) build config and native dependencies, the 48%
  reader image default, the R2 artwork registry and manifests, and the isha/gita
  art specs.
- `npx tsc --noEmit` passed. `check-voice-companions.mjs` passed: 27 companions
  across 8 groups, every preset a call the server will accept.
- Contrast, playback, barge-in, call-audio, capture-bridge, artwork and
  lesson-art checks passed.
- Two pre-existing failures are unchanged and unrelated: `check-screen-layout.cjs`
  stops at GroupInfo ("no safe-area owner"), reproduced with this work's
  `App.tsx` stashed, and `check-voice-lab-startup.mjs` fails in its own harness
  because its mock list has no `../services/audioTransport` entry for the
  untouched `useVoiceLab.ts`. The new routes were framed-checked separately.
- Android export passed and contains the new screens. The export now lists 95
  Android assets against the previous 483 because the pending artwork registry
  serves released paintings from R2 with device caching instead of bundling
  them.

## OTA publication

Both channels received the same commit and message, each with the runtime its
builds use. Publication logs are the ignored files
`mobile/.expo/voice-companions-ota-1.4.1.log` and `-1.5.0.log`.

Production branch — Android runtime `1.4.1` (the installed app):

- Update group `6e773895-75fe-47e6-ba00-b7c98c9fc819`, Android update
  `01a145af-c208-7231-8f11-bdf968a6cd92`.
- [EAS dashboard](https://expo.dev/accounts/sanskritam/projects/sanskritam/updates/6e773895-75fe-47e6-ba00-b7c98c9fc819).
- Exported with `app.json` temporarily at version `1.4.1` and then restored, so
  the update matches the installed runtime. `eas update:list` confirms it as the
  latest production-branch update for Android `1.4.1`.

`android-internal` branch — Android runtime `1.5.0` (the 1.5.0 (10) build for
Play internal testing):

- Update group `25e0f102-664f-4bd3-ab5f-e02b1447904b`, Android update
  `01a145b2-512d-7f1b-a071-378d17205f62`.
- [EAS dashboard](https://expo.dev/accounts/sanskritam/projects/sanskritam/updates/25e0f102-664f-4bd3-ab5f-e02b1447904b).
- `eas update:list` confirms it as the latest update on that branch.

The production branch also holds two earlier `1.5.0` updates ("books", "major
changes"). Nothing was published to the production branch for `1.5.0` here,
because no installed build reads that branch at `1.5.0` yet; the same bundle can
be published there when the version leaves internal testing.

## Not verified

Physical-device installation, the look of the three screens, and the call audio
on a handset were not verified in this session. Companion portraits are still
placeholders. Apply the update through Settings → Check for updates → Restart.
