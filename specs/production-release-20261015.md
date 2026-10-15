# Production release — 15 October 2026

Owner authorization: commit, push, deploy and OTA after the implementation review.

Release scope includes native Sanskrit speech, shared audio controls, the daily
learning loop, progress synchronization and offline reading; it preserves the
pending artwork, community and corpus changes already in this checkout.

## Preflight

- Branch: `main`, synchronized with `origin/main` before the release commit.
- Focused backend and community suites: 182 passed.
- Deployment helper suite: 25 passed; deployment shell syntax checked.
- Mobile TypeScript, playback, learning-progress and offline-reading checks passed.
- Earlier recitation, browser audio/UI and web-export checks are recorded in
  [model results](beta-model-results-20261015.md).
- Four existing corpus/catalogue test failures remain documented there. This
  deployment does not run the offline import scripts or replace corpus rows.
- Native dependencies/configuration are unchanged; Android production build 8
  and OTA channel use runtime `1.4.1`. No native build is needed for this update.
- Cloud project verified against production project number `829757572630`:
  `gen-lang-client-0232760726`, region `asia-south1`, service `shabd-api`.
- Previous backend ready revision: `shabd-api-00077-8c8`.
- Deployment reuses the live numeric database secret version (51), validates its
  connection first, and runs additive migration `20261015_learning_state` during
  startup. No database credential rotation is requested.
- Credential JSONs and local env files are excluded from deployment uploads.

## Background autoplay added to the release

The owner additionally requested background autoplay before OTA publication.
Playback modes now explicitly enable background audio and leave recording mode.
Managed native players register media controls before playing and hand those
controls over without letting stale player cleanup unregister the new owner.

Background reading reuses its existing player with `replace`, preserving the
Android media service across verses. It skips the foreground-only 800 ms gap;
an AppState transition flushes any waiting gap before timers can be suspended.
Explicit pause, stop, repeat and end-of-chapter behavior are retained.

TypeScript and playback regressions passed; recitation now passes 117 checks,
including background handoff without new players, timer-free advancement, pause
preservation, stop cleanup, and backgrounding during an existing foreground gap.
No connected Android device was available for a physical screen-lock check.

[Expo SDK 57 background audio requirements](https://docs.expo.dev/versions/v57.0.0/sdk/audio/#playing-audio-in-the-background)
were checked against the installed package. The native plugin/dependencies did
not change; this fix can use the existing Android runtime 1.4.1 OTA channel.

Application commit `67aeab9` was pushed to `origin/main` before this added fix.
Publication identifiers and health checks will be appended after completion.
