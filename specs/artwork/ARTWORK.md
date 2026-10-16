# Artwork policy

Owner decisions: 2026-10-16, Asia/Calcutta. Applies to future artwork generation
and app integration by any model. Owner instructions in a later conversation
take precedence; update this policy when the owner changes a decision.

## Reader settings

- Preferred layout: a painting behind the full verse page, with selectable live
  text over it. Do not use the earlier half-page layout as the default.
- Offer Illustrated / Plain backgrounds. Plain uses the selected reader theme's
  paper color and does not fetch verse artwork.
- Default **image opacity: 48%** (`0.48`). This applies to the image layer only.
- Default **text opacity: 100%**; default **text color: the reader theme's own
  colors**. Image opacity, text opacity, and text color are independent controls.
- Persist settings across launches using `shabd.read.appearance.v1`. A changed
  default must not overwrite a reader's explicitly saved preference.
- Preserve existing Light/Sepia/Dark themes, five Sanskrit sizes
  `[0.85, 1, 1.15, 1.3, 1.5]`, and Roman transliteration toggle. Do not silently
  scale down text to fit an illustration; allow the page to scroll.
- Sanskrit uses the actual app face, Tiro Devanagari Sanskrit, at the existing
  22px base size and `round(size * 1.75)` line height. Preserve the reader's real
  Roman text, translations, word-by-word and Learn affordances.
- No Sanskrit, Romanization, meaning, table, or UI may be flattened into a
  generated image as a replacement for actual app content.

## Source-grounded generation

1. Read the exact verse, stored transliteration, and existing meaning from the
   app's corpus before authoring a prompt. Never choose generic unrelated art.
2. Deduplicate canonical references before generation. The current corpus has
   duplicate Īśopaniṣad verse 1 rows; use the fullest text, as the reader does.
3. Generate **one original master per verse**, not separate AI pictures for
   phones, tablets, Android, iOS, portrait, or landscape. Multiple delivery
   files are resizes/encodings of that same master.
4. Treat abstract philosophical scenes as interpretive illustrations. Do not
   invent a literal historical event or impose an anthropomorphic deity on a
   formless teaching. Let the actual verse guide any explicitly invoked deity.
5. For the currently approved style, use refined Indian watercolor with
   restrained gouache on warm ivory paper, organic detail, quiet ochre, sage,
   dusty terracotta, and muted indigo. Keep the series visually consistent.
6. Generate no typography, verse numbers, watermark, decorative border, UI,
   fabricated Sanskrit, or printed explanation in the painting.
7. Review for lettering on flags/books and explanatory marks such as red Xs or
   checkmarks. Reject these drafts, including painted sacred syllables; sacred
   text belongs in the app's live text. Correct with a versioned master and an
   exact new prompt record while preserving the rejected draft's provenance.

## Master composition and aspect ratios

- Prefer a **square 1:1 master** for the single-source background system. Request
  2048 × 2048 or the highest genuinely supported native resolution. Record the
  actual returned dimensions. Never claim an upscaled file is a higher native
  generation. The initial Īśopaniṣad set returned **1254 × 1254** masters.
- Keep essential faces, hands, narrative objects, and relationships away from
  edges. Prompt for the main scene inside the central **60% width and 50%
  height**, surrounded by low-detail sky, atmosphere, ground, or paper.
- Inspect the result: prompting alone does not prove the safe region. Record
  the actual normalized safe rectangle for each master after review. Expand
  it when the generated composition needs more room; prefer containing the
  complete image rather than cropping important subjects.
- Store a normalized focal point and safe rectangle with each verse image.
  Initial centered layout uses focal point `[0.5, 0.5]`. A different focal point
  needs matching renderer crop math, not metadata alone.
- Vector/SVG is suitable for genuinely vector-native illustrations and diagrams.
  Wrapping or tracing a watercolor into SVG does not solve aspect-ratio fitting
  and is not part of this pipeline.

## Responsive layout: phones, tablets, portrait, landscape

- Fit against the measured page rectangle, not a list of device model names.
  Account for native safe areas and changing reader controls.
- Never stretch/squash an image. Use proportional `cover` only if the visible
  crop contains the entire authored safe region. Otherwise use `contain`,
  with the reader theme's paper color filling the remaining area.
- Keep text layout independent of the painting. Orientation changes and larger
  accessibility text must not hide Sanskrit, transliteration, or meaning.
- Derive phone WebP at **768px longest edge**, quality **80**, and tablet WebP
  at **up to 1536px longest edge**, quality **88**, from the original master.
  Preserve aspect ratio and never upscale a smaller master. The initial tablet
  copies therefore remain 1254 × 1254.
- Current resolution selection uses the tablet copy when the shorter window
  dimension is at least 600 logical pixels; orientation must not unexpectedly
  switch a phone into a large download. Revisit only with measured evidence.
- Check compact 320px phones, typical 360–430px phones, tablets of 768px or more,
  and landscape. Test maximum text size and both image modes. These browser and
  bundle checks do not substitute for native Android/iOS device testing.

## Storage, delivery, and app size

- Keep launch icons, splash artwork, small tutor/avatar assets and useful
  fallbacks bundled. Keep fonts and essential app text offline.
- Store large book/festival/game/lesson/path/hub paintings and verse artwork in
  the public R2 bucket behind `https://cdn.vedicvalor.com`.
- Use immutable, content-hashed object keys and
  `Cache-Control: public, max-age=31536000, immutable`, with correct image MIME.
  Do not overwrite a different image at a cached public URL.
- Database/JSON registries hold URLs, dimensions, byte sizes, canonical verse
  references, focal points, safe regions and provenance. They must not contain
  base64 image payloads intended for the shipped app.
- Retain masters locally under ignored `results/` as recovery copies and archive
  them in R2. Keep prompts, sources, delivery manifest and decisions under
  trackable `specs/`. Never store credentials in these artifacts or client code.
- `ArtworkImage` adds a bounded 100 MiB device disk cache for managed public
  artwork; downloads are deduplicated with at most three in flight. Private
  user media must not enter this public-art cache. Cache is evictable and is
  not a promise of permanent offline book artwork.
- Prefetch the current and next two verse paintings when illustrations are on.
  Text must render immediately on paper and remain usable if images fail.
- Verify public URLs before switching references. Check a repeat public image
  request for a CDN `HIT`; a successful object upload alone is insufficient.
- Removing static references excludes paintings from the native bundle; local
  source copies can remain for recovery. Confirm with Android/iOS export asset
  inventories. Do not claim exact APK savings from the source-folder size.

## Current implementation and reproducible commands

- Reader: `mobile/src/screens/Book.tsx`.
- Defaults/persistence: `mobile/src/services/readingAppearance.ts`.
- Settings: `mobile/src/components/artwork/ReadingAppearanceSettings.tsx`.
- Fitting/selection: `VerseArtworkBackground.tsx`, `verseArtwork.ts`.
- Remote registries: `remoteManifest.json`, `verseManifest.json` in that directory.
- Device cache: `mobile/src/services/artworkCache.ts`; display: `ArtworkImage.tsx`.
- Initial 18-verse sources/prompts: `specs/isha-art-20261016/verses.json` and
  `generation-jobs.json`; per-result provenance is in `deliveries/`.
- Bhagavad Gītā production: `specs/gita-art-20261016/` contains the 700 actual
  source pages, exact per-verse prompts, saved deliveries, chapter contact
  sheets and resumable progress. Consult its README and actual delivery counts
  before continuing. A job file is not a completed painting. Reviewed Gītā
  entries preserve the complete master with a full-frame safe rectangle unless
  a later per-image crop review explicitly authorizes a tighter rectangle.
- Use the imagegen skill and built-in image generator by default. CLI/API
  generation requires the owner's explicit choice; credentials already being
  present is not authorization to switch generation methods.

```powershell
python specs/isha-art-20261016/prepare.py
# Generate the 18 jobs with the built-in tool; preserve each original master.
python specs/isha-art-20261016/publish_isha.py --upload
python specs/isha-art-20261016/migrate_artwork.py --upload --integrate
cd mobile
node scripts/check-artwork.cjs
npx tsc --noEmit
npx expo export --platform android --output-dir .expo/r2-art-android
npx expo export --platform ios --output-dir .expo/r2-art-ios
```

After regenerating lesson asset maps with older authoring scripts, rerun the
verified migration step: those generators must not restore static `require()`
references to paintings already migrated. Future generators should consult the
remote registry for known artwork and publish new deliveries before integration.

## Release evidence

Before completion, inspect every master in a contact sheet, verify each canonical
reference and derivative dimensions, verify remote URLs, run the cache/fitting
checks and TypeScript, inspect native export asset inventories, and save the
results in the generation set's README. State native-device testing limitations
and distinguish source integration from building/installing a new APK.
