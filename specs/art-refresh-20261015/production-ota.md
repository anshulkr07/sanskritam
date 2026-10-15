# Production artwork release — 15 October 2026

Published on 15 October 2026 at 14:35 IST to the existing production channel.

- Project: `sanskritam/sanskritam`.
- Channel and branch: `production` (channel routing confirmed before publication).
- Platform: Android; runtime: `1.4.1`, matching the latest finished production build.
- Update group: `637d5c58-b2cd-47d4-b021-c1e5d6743f7f`.
- Update ID: `01a13ecf-990b-7b1d-8995-0542d354fcf4`.
- Message: `Refresh Read watercolor covers, Play game art, social cards and Learn illustrations`.
- Uploaded one app bundle and 55 new assets; reused 428 assets.
- Previous production group: `5d417b72-80f8-47bb-9a08-540889e97606`.

[EAS update dashboard](https://expo.dev/accounts/sanskritam/projects/sanskritam/updates/637d5c58-b2cd-47d4-b021-c1e5d6743f7f)

## Validation

- TypeScript `npx tsc --noEmit` passed.
- Existing trail checks passed: 5 stages, 21 units, 97 lessons, 105 topics and
  49 graded lessons.
- Android Expo export passed with 482 listed assets; its asset map contains
  every one of the 55 new images. The export is in `mobile/.expo/art-refresh-export/`.
- That exact checked export was published with `eas update --skip-bundler`,
  using the production EAS environment. No native build was required.
- All 55 selected PNG masters match their ImageGen sources byte for byte.
  All optimized images decode, all static image references resolve, and all
  54 Read shelf books have watercolor covers. Optimized new assets total 7.40 MiB.
- The browser preview loaded all 57 registered covers, all 14 Play image
  placements and all four new Learn thumbnails without failures. Checked phone
  layouts at 390 px and 320 px, title readability, clipping, decorative image
  semantics, and Quick match / game navigation callbacks.
- Scoped Git whitespace validation passed.

Publication JSON and logs are preserved in the ignored files
`mobile/.expo/art-refresh-update.json` and `mobile/.expo/art-refresh-update.log`.
The CLI completed fingerprint computation and reported successful publication.
`eas update:list` then confirmed this group as the latest production update
for Android runtime 1.4.1.

Apply through Settings → Check for updates → Restart, or the normal app update
download/restart cycle. Publication is verified; installation on a physical
device and adoption are not measured here. Existing unrelated backend and
corpus-import edits were left intact.
