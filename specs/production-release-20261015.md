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

Publication identifiers and health checks will be appended after completion.
