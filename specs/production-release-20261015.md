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
The background autoplay fix is committed and pushed as `16706ec`.

## Backend publication verified

- Cloud Build: `21ba193a-f27b-4bb6-9183-838b15c9953d`, SUCCESS.
- Ready revision: `shabd-api-00078-5p2`, serving 100% of production traffic.
- [Production health](https://shabd-api-829757572630.asia-south1.run.app/health):
  HTTP 200. Latest created and latest ready revision agree.
- Live TTS setting and public request-schema default both verified as `sa-IN`.
- `/me/learning-state` exists and returns HTTP 401 without authentication.
- Read-only database verification confirmed Alembic head
  `20261015_learning_state` and the `learners.learning_state` column.
- Database secret remains pinned to version 51; no credential rotation occurred.
- Existing scheduler jobs were retained (this local env does not set ADMIN_TOKEN).
- Local logs: ignored `results/beta-20261015/backend-deploy.log`.

## Android OTA export

- Export ran with the EAS production environment after commit `16706ec`.
- All 482 exported asset references resolve. Hermes bundle size: 10,752,042 bytes.
- Bundle SHA-256:
  `0e25766bdf3400f8d22d47f5869c125520b71259cd5165e0d99e208d515be634`.
- The checked export is `mobile/.expo/production-release-20261015/` (ignored).
- Publication uses `--skip-bundler`, so EAS uploads that exact checked bundle.

## Android production OTA published

- Published: 15 October 2026, 14:17:57 UTC (19:47:57 IST).
- Channel and branch: `production`; runtime `1.4.1`, platform Android.
- Source commit: `16706ec14a8909e755e87ad8ee21a61ef27cbe35`.
- Update group: `7a80621c-3ee0-4714-9d7d-fb8a8458fd0e`.
- Update ID: `01a13fed-4666-7fc9-b2d3-bd594d749546`.
- [EAS update dashboard](https://expo.dev/accounts/sanskritam/projects/sanskritam/updates/7a80621c-3ee0-4714-9d7d-fb8a8458fd0e).
- EAS uploaded the checked app bundle and reused existing assets. Fingerprint
  computation completed. The CLI exited successfully and reported publication.
- `eas update:list` independently confirmed this as the latest production-branch
  update for Android runtime 1.4.1.
- Previous production group remains
  `637d5c58-b2cd-47d4-b021-c1e5d6743f7f` (earlier artwork release).
- Publication JSON, logs and confirmation are in ignored
  `results/beta-20261015/production-ota*` files.

Apply through **Settings → Check for updates → Restart**, or the normal
download/restart cycle. Publication and backend operation are verified; device
installation, adoption and physical screen-lock playback were not measured.
