# Artwork policy

Owner decisions: 2026-10-16, Asia/Calcutta. Applies to future artwork generation
and app integration by any model. Owner instructions in a later conversation
take precedence; update this policy when the owner changes a decision.

## Reader settings

- Owner update 2026-10-20: the reader chooses where the painting goes, in the
  reader's Aa panel (`layout` in the saved appearance):
  - **On top** (`top`, the **default**): the complete painting heads the verse
    page, the live verse text below it; the page scrolls.
  - **Own page** (`pages`): the painting alone on a page, then the verse on the
    next page. Verses without artwork get only the verse page.
  - **No image** (`plain`): the reader theme's paper; no verse artwork is fetched.
  The earlier painting-behind-text layout (with its 48% image opacity) is
  retired. A saved Illustrated choice opens as On top; a saved Plain stays No
  image. `imageOpacity` stays in the saved value but has no control now.
- Verse text style (owner, 2026-10-20): Light and Sepia set the verse in the
  theme's ink (T1); Dark sets it in warm amber `#F2B27A` (T2). Per-section
  color, size and bold controls still override these.
- Default **text opacity: 100%**; default **text color: the reader theme's own
  colors**. Text opacity and text color are independent controls.
- Persist settings across launches using `shabd.read.appearance.v1`. A changed
  default must not overwrite a reader's explicitly saved preference.
- Preserve existing Light/Sepia/Dark themes, five Sanskrit sizes
  `[0.85, 1, 1.15, 1.3, 1.5]`, and Roman transliteration toggle. Owner update
  2026-10-19: Roman defaults to off and its choice persists; offer independent
  color, size and bold controls for verse, Roman, English and Hindi meaning. Do not silently
  scale down text to fit an illustration; allow the page to scroll.
- Sanskrit uses the actual app face, Tiro Devanagari Sanskrit, at the existing
  22px base size and `round(size * 1.75)` line height. Preserve the reader's real
  Roman text, translations, teaching content. Owner update 2026-10-19: remove word-by-word from the
  reading page and highlight the recite action instead (2026-10-20: a small
  square outline button, “Learn & Recite this verse”).
- No Sanskrit, Romanization, meaning, table, or UI may be flattened into a
  generated image as a replacement for actual app content.

## Source-grounded generation

1. Read the exact verse, stored transliteration, and existing meaning from the
   app's corpus before authoring a prompt. Never choose generic unrelated art.
2. Deduplicate canonical references before generation. The current corpus has
   duplicate Īśopaniṣad verse 1 rows; use the fullest text, as the reader does.
3. Generate **one temporary original per verse**, not separate AI pictures for
   phones, tablets, Android, iOS, portrait, or landscape. Multiple delivery
   files are resizes/encodings of that same original. Owner update 2026-10-17:
   do not archive originals. After visual review and verified publication of
   both phone/tablet WebPs, delete the temporary original and its tool-output
   copy. Never upload original PNGs to R2. The generation service necessarily
   returns an original; it is only an intermediate conversion input.
4. Treat abstract philosophical scenes as interpretive illustrations. Do not
   invent a literal historical event or impose an anthropomorphic deity on a
   formless teaching. Let the actual verse guide any explicitly invoked deity.
5. For the currently approved style, use refined Indian watercolor with
   restrained gouache on warm ivory paper, organic detail, quiet ochre, sage,
   dusty terracotta, and muted indigo. Keep the series visually consistent.
6. For verse paintings, generate no typography, verse numbers, watermark, decorative border, UI,
   fabricated Sanskrit, or printed explanation in the painting.
7. For verse paintings, review for lettering on flags/books and explanatory marks such as red Xs or
   checkmarks. Reject these drafts, including painted sacred syllables; sacred
   text belongs in the app's live text. Correct with a versioned master and an
   exact new prompt record while preserving the rejected draft's provenance.

## Master composition and aspect ratios

- Owner update 2026-10-19: prefer **9:16 portrait originals** for new verse
  paintings, with phones primary. Request 1080 × 1920 or the highest genuinely
  supported native portrait resolution close to 9:16. Use the same painting on
  tablets/landscape with proportional contain fitting; no second AI generation.
  Existing square paintings remain complete and uncropped until a separately
  needed extension/regeneration. The owner authorized selective regeneration
  for better phone composition on 2026-10-19; use versioned prompts and preserve
  historical provenance metadata, without retaining original PNG backups. Record the
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

- Owner update 2026-10-19: phones are primary, tablets secondary. Show the
  complete verse painting using `contain` on all reader sizes, with a small
  paper inset. Give the image explicit measured width/height and pass only its
  URI as native source; source pixel dimensions must not become view dimensions.
  Check 320–430px phones before tablet previews. New compositions need a compact
  central narrative grouping and quiet margins, readable at phone width.
- Fit against the measured page rectangle, not a list of device model names.
  Account for native safe areas and changing reader controls.
- Never stretch/squash or crop a verse painting to fill the page. Use `contain`,
  with the reader theme's paper color filling the remaining area. This owner's
  phone-first update supersedes the previous optional safe-region `cover` rule.
- Keep text layout independent of the painting. Orientation changes and larger
  accessibility text must not hide Sanskrit, transliteration, or meaning.
- Derive phone WebP at **768px longest edge**, quality **80**, and tablet WebP
  at **up to 1536px longest edge**, quality **88**, from the original master.
  Preserve aspect ratio and never upscale a smaller master. The initial tablet
  copies therefore remain 1254 × 1254.
- For new portrait artwork, the phone copy instead fits within **768 × 1536px**
  (up to 768px width), quality 80. Tablet stays within 1536 × 1536px, quality 88.
  Preserve actual native proportions, never upscale. Keep important subjects in
  a compact central grouping, away from all four edges; no cropping to force a
  particular phone model's ratio. Preserve live text.
- Current resolution selection uses the tablet copy when the shorter window
  dimension is at least 600 logical pixels; orientation must not unexpectedly
  switch a phone into a large download. Revisit only with measured evidence.
- Check compact 320px phones, typical 360–430px phones, tablets of 768px or more,
  and landscape. Test maximum text size and both image modes. These browser and
  bundle checks do not substitute for native Android/iOS device testing.

## Storage, delivery, and app size

- Keep launch icons, splash artwork, small tutor/avatar assets and useful
  fallbacks bundled. Keep fonts and essential app text offline.
- Owner update 2026-10-19: bundle festival paintings and book/audiobook covers
  for instant offline display. These priority assets supersede the earlier R2-only
  rule. Other large game/lesson/path/hub paintings and verse artwork remain in
  the public R2 bucket behind `https://cdn.vedicvalor.com`.
- Use immutable, content-hashed object keys and
  `Cache-Control: public, max-age=31536000, immutable`, with correct image MIME.
  Do not overwrite a different image at a cached public URL.
- Database/JSON registries hold URLs, dimensions, byte sizes, canonical verse
  references, focal points, safe regions and provenance. They must not contain
  base64 image payloads intended for the shipped app.
- Retain only the optimized phone/tablet WebPs, both locally and in R2. Do not
  retain master PNG backups. Preserve source text, prompts, original hashes and
  dimensions, review/provenance metadata and delivery manifests under `specs/`.
  Delete originals only after both delivery URLs pass byte/hash/dimension checks.
  Mark provenance `master_retained: false`; old paths/hashes are historical,
  not downloadable assets. Never store credentials in these artifacts or client code.
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
# Generate with the built-in tool; originals are temporary until verified delivery.
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

## Learn story course pictures

Owner decisions 2026-10-19, for the story course ("The Burnt Book",
`specs/learn-story/IMPLEMENTATION.md` section 9). They change this policy for
Learn story pictures only; verse artwork keeps every rule above.

- Generated in **ChatGPT** (the owner's choice of method).
- Owner update **2026-10-20**: Learn illustrations **may contain text**. This
  supersedes the earlier ban on writing and the restriction that an empty
  `text_in_image` list forbids all lettering. Use exact Sanskrit or other text
  from the lesson source when writing helps the scene or teaching. Record the
  intended strings in generation/provenance metadata (and `text_in_image`
  when authoring content). Verify all visible writing at the end against those
  strings, using NFC Devanagari; correct or regenerate mismatches before final
  delivery. Do not accept invented script, unintended lettering or watermarks.
- The same Sanskrit is always also live text on the card: a picture never
  replaces app content.
- Ratios come from the content: story cards 4:3, portraits 1:1, leaves 3:4,
  map backdrops 9:16 (map backdrops carry no text). Phone-first composition,
  contain fitting, no cropping or stretching.
- Delivery as above: phone WebP within 768 × 1536 (q80), tablet within
  1536 × 1536 (q88), content-hashed R2 keys under `learn/`, immutable
  caching, verified public URLs, originals deleted after verification. The
  registry is `backend/app/curriculum/content/images/deliveries.yaml`.
- No picture-choice exercises in Learn (owner, 2026-10-19).

## Release evidence

Before completion, inspect every master in a contact sheet, verify each canonical
reference and derivative dimensions, verify remote URLs, run the cache/fitting
checks and TypeScript, inspect native export asset inventories, and save the
results in the generation set's README. State native-device testing limitations
and distinguish source integration from building/installing a new APK.
