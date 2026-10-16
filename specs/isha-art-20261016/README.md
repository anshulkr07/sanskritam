# Īśopaniṣad artwork and R2 migration

Completed 2026-10-16. Owner-approved policy for future models:
[`../artwork/ARTWORK.md`](../artwork/ARTWORK.md), discoverable from both root and
mobile `AGENTS.md`.

## Deliverables

- Exactly 18 verse-specific masters generated with the built-in image generator.
  Each master is 1254 × 1254 native pixels, the tool's returned square resolution.
  The request asked for 2048 or the highest supported native square; no file was
  upscaled or represented as a native 2048px generation.
- One master per verse, with 768px phone WebP and 1254px tablet WebP derived from
  it. Phone delivery total: **2,260,084 bytes**. Tablet total: **7,957,052 bytes**.
  Original PNG master total: **58,125,874 bytes**.
- All 18 masters and 36 derivatives uploaded and publicly verified on R2.
  Local masters/deliveries remain under ignored `results/isha-art-20261016/`.
- The 431 existing larger artwork files (98,483,192 source bytes) were uploaded,
  verified, and their static app references replaced with versioned public URLs.
  Startup icons, splash assets, tutor layers, avatars, fonts, and small native
  fallbacks remain bundled. Original source files were preserved.
- Reader integration: full-page background, Plain option, independent image and
  text opacity, custom text color, existing fonts/transliteration/meanings. New
  reader default: **48% image opacity**, 100% text opacity, theme text colors.
  Explicit saved preferences are preserved.
- Safe fitting uses measured page dimensions and conservative reviewed safe
  rectangles (central 84% for this initial set); unsafe portrait/landscape crops
  use `contain` on the theme paper. A future set can record tighter per-scene
  rectangles after visual review.
- Public-art cache: 100 MiB target, deduplicated downloads, at most three in
  flight, cleanup of failed partial downloads, native Image error behavior,
  and prefetching current/next two verses. This evictable cache is separate from
  permanent offline book downloads and excludes private user media.

## Review and provenance

- `gallery.html`: interactive 18-verse review using the app's actual Sanskrit,
  Roman transliteration and existing English meanings, with 48% initial opacity.
- `contact-sheet.jpg`: all 18 paintings.
- `verses.json`: exact source corpus snapshot, duplicate verse 1 resolved using
  the fullest text. No new translation was invented or inserted into the app.
- `generation-jobs.json`: full prompts and per-verse scene decisions.
- `deliveries/verse-NN.json`: returned generation path, saved master, and prompt.
- `artwork-manifest.json`: master and derivative URLs, actual dimensions/bytes.
- `migration-manifest.json`: checksums, URLs and dimensions for existing artwork.
- `storage-after.json`: post-upload R2 inventory snapshot.

## Validation

- Contact sheet visually inspected for all 18 scenes, including abstract verses,
  the golden disk, returning breath/ashes, and the final prayer to Agni.
- Public HEAD checks passed for migrated artwork and all 54 Īśopaniṣad objects.
- A 152,482-byte phone painting returned HTTP 200 / `image/webp`: first GET
  1,945 ms (`MISS`), repeats 509 ms and 330 ms (`HIT`). These are desktop-network
  samples, not promised mobile latency.
- `node mobile/scripts/check-artwork.cjs` (from `mobile/`, omit `mobile/`): passed
  cache deduplication/restart reuse, concurrency, failed partial cleanup,
  eviction, private URL exclusion, safe cropping and preference validation.
- TypeScript `npx tsc --noEmit`: passed after the remote-source type migration.
- Android and iOS Expo production exports passed. Export inventories contain
  tutor layers, fonts, audio and native UI icons; no migrated cover, festival,
  lesson, path, hub, or game paintings are bundled.
- Gallery browser checks passed for all 18 reference/meaning mappings, 48%
  initial opacity, Plain/theme/orientation controls, and 320, 360, 393, 430, 768,
  and 1024px widths. `gallery-desktop.jpg` is the review screenshot.
- Scope: source integration and R2 publication. Native-device testing and a new
  APK/IPA build/install were not performed in this chat.

Regeneration commands and the migration order are in the shared artwork policy.
Older lesson-generation scripts can still emit static references; rerun the
verified migration after regenerating those registries, as required by AGENTS.


## Owner storage update — 2026-10-17

Original PNGs are temporary generation/conversion inputs only. Keep optimized phone and tablet WebPs; after visual review and verified publication, discard the original and its tool-output copy. Do not upload masters to R2 or keep master backups. Historical master paths, hashes, dimensions and prompts remain provenance records, not retained image files. The existing reading URLs and responsive fitting are unchanged. specs/artwork/master-removal-report.json records removal evidence.

The Gita publisher follows this policy automatically for future verses. Contact sheets and full-size gallery previews use the retained tablet WebP after original removal.

Removal verified: 481 R2 originals deleted (1,576,959,414 bytes), 962 reading WebPs retained (277,525,192 bytes). Local originals and matching tool-output copies removed: 974 files / 3,194,155,980 bytes, including superseded drafts. Account storage after removal: 700,135,024 bytes (approximately 700 MB). Gita source/delivery audit and artwork cache/fitting/settings checks pass.
