# Card lessons production release — 15 October 2026

Owner authorization: commit and push all current work, including Claude's
changes, deploy the backend and publish the production OTA. No additional test
suites were run for this release.

Application commit: `cefb86b2703e9e9d54c0ba16fb5bb7823541a6fe`, pushed to
`origin/main`.

## Included work

- Complete Learn lessons use the shared swipeable card player from both Home
  and Learn, preserving examples, tables, quizzes and source details.
- Sanskrit display prioritizes Devanagari, with Roman transliteration as
  secondary support. Future lesson requirements are recorded in `mobile/AGENTS.md`.
- Includes the existing community, legal-page and floating-audio changes in
  the checkout, together with the removed temporary group preview files.

## Android production OTA

- Published at `2026-10-15T15:05:04.438Z` (20:35 IST).
- Channel and branch: `production`; runtime `1.4.1`; platform Android.
- Update group: `4fa6857c-6f87-49fe-9c82-634e8c660c18`.
- Update ID: `01a14018-6ab6-7013-b384-b063f80f504b`.
- [EAS update dashboard](https://expo.dev/accounts/sanskritam/projects/sanskritam/updates/4fa6857c-6f87-49fe-9c82-634e8c660c18).
- EAS exported the current application with the production environment,
  uploaded its bundle, computed the fingerprint and reported publication.
- Export: ignored `mobile/.expo/card-lessons-release-20261015/`.
- Publication output: ignored `results/beta-20261015/card-lessons-ota.json`
  and `card-lessons-ota.log`.

Apply through **Settings → Check for updates → Restart**.

## Backend deployment

- Project: `gen-lang-client-0232760726`; region: `asia-south1`;
  service: `shabd-api`.
- Cloud Build: `a88c4ad4-f9c0-4bf6-ab03-bde80d8b6658`.
- Deployed revision: `shabd-api-00079-wcj`, serving 100% of traffic.
- [Production backend](https://shabd-api-829757572630.asia-south1.run.app).
- The deployment helper exited successfully and its required health request
  returned `{"status":"ok","version":"0.1.0"}`.
- Reused database secret `shabd-database-url:51`; no database credential rotation.
- Existing scheduler jobs were retained because the local deployment environment
  does not set `ADMIN_TOKEN`.
- Deployment log: ignored `results/beta-20261015/card-lessons-backend-deploy.log`.
