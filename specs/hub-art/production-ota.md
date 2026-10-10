# Production OTA release

Published directly to the production channel on 9 October 2026 at 14:52 IST, as requested. No new native build was created.

- Project: `sanskritam/sanskritam`.
- Channel and branch: `production`.
- Platform: Android.
- Runtime: `1.1.0`, matching the latest finished production build and existing production updates.
- Update group: `bfb2bee1-0d2d-4612-9ea0-8a7f7bc2c1e9`.
- Update ID: `01a11ff9-02ec-7794-884d-160cfc32935b`.
- Message: `Painted artwork for Path, Play and Grammar cards`.
- Uploaded 94 new assets (60 Path, 34 Play/Grammar); reused 102 existing assets.

[EAS update dashboard](https://expo.dev/accounts/sanskritam/projects/sanskritam/updates/bfb2bee1-0d2d-4612-9ea0-8a7f7bc2c1e9)

An isolated checkout of `d4e7dec` was used for the release, with the artwork screens, registry components, and image assets copied in. TypeScript and the Android production OTA bundle passed. `eas update:list` confirmed this group as the latest update on the production branch; the production channel points to that branch.

The main workspace retains pending 1.2.0 work. New native dependencies, Recite/Competition feature integration, and other unrelated uncommitted changes were excluded from the 1.1.0 OTA. Their generated paintings are bundled but those new feature cards will appear when the corresponding features ship. Existing games, practice rows, daily challenge, Grammar chapters/tools/Continue, and Path cards use the artwork immediately after the update is applied.

The production EAS environment supplies the Google sign-in client IDs. The backend uses the existing Cloud Run fallback URL. Publication result, asset map, and bundle metadata were copied to the main workspace's ignored `mobile/.expo/artwork-ota-*.json` files.

Users can apply the release through Settings → Check for updates → Restart, or allow the normal launch/download/restart cycle. Device installation and adoption have not been measured; publication and channel routing are verified.

Previous production group for rollback reference: `3b54ac2d-19c7-44ae-a48e-2e1c55ff1eee` (Place search, runtime 1.1.0).
