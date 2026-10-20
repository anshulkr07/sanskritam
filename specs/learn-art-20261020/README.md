# Learn illustrations · 20 October 2026

Completed: **168 new or replacement paintings**, including **76 with required
writing**. The audit filled 160 missing story pictures and replaced eight older
manuscript/opening images. The current app and backend registries cover all
183 canonical course picture IDs plus five map fallbacks: **188 selections**,
with no missing references.

## Artwork and source integration

Generated with the built-in ChatGPT image generator. Every selected original
was visually reviewed against its complete source brief; every intended written
form was proofread against the lesson. Corrections include the Latin/IAST
script, doubled consonants, long vowels, vocalic L, and final halants. Ambiguous
glyphs were compared with typography rendered using the app's Tiro font.
All 76 text images were checked again after phone WebP optimization.

The owner's text permission supersedes the older no-lettering decisions in
ARTWORK.md, the story handover, implementation guide and bible style. Exact
intended text is recorded in 76 ImageRef lists across 69 YAML files. The
integration script compares parsed content before and after each edit and
confirms teaching material is preserved. Sanskrit, translations, tables and
controls remain live app content. Reader opacity and saved settings are
preserved.

The runtime overlay is mobile/src/story/artwork/manifest.json. The backend
registry is backend/app/curriculum/content/images/deliveries.yaml; its
synchronizer confirms selected URLs, derivative hashes and text verification.
Learn URLs now use the bounded device artwork cache, with checks excluding
private origins, traversal paths and query-bearing URLs.

## Delivery and evidence

- [Jobs and exact generation prompts](jobs.json), [intended text](text-plan.json)
  and [complete regeneration inventory](regeneration-inventory.json).
- [Delivery provenance](deliveries.json): 336 new optimized WebPs, 87,654,470
  bytes in total, retained in [delivery/](delivery/). Phone fits within
  768×1536 at q80; tablet within 1536×1536 at q88. No upscaling or cropping.
- All new public files use immutable, content-hashed R2 keys under learn/.
  [Public audit](audit.json) checks matching local/public bytes, SHA-256,
  dimensions, MIME and repeat-request CDN HIT for every variant. The earlier
  28-image set was also rechecked, including the 20 retained selections.
- [Coverage audit](coverage-audit.json): 168/168 current jobs verified,
  76/76 text jobs verified, 188 runtime selections, zero missing source IDs.
- [Exact-master visual reports](ocr/) record direct Codex proofreading;
  they do not claim an OCR-service result. [Phone audit](phone-audit.json)
  records every final text image's optimized hash. review-*.jpg and matching
  JSON snapshots bind reviews to the actual draft hashes. contact-*.jpg
  provide the full new-set overview; [correction history](rework.json) is resolved.
- Temporary originals were discarded only after verified delivery.
  The task's generation directory contains zero PNGs. Historical prompts and
  hashes are preserved; [cleanup receipts](discarded-temporary-generations.json)
  record discarded superseded/canceled outputs without master backups.

## Validation

[Validation results](validation.json) record passing TypeScript, artwork cache
and fitting checks, story state/practice checks, standalone lesson-art coverage,
curriculum engine validation (zero errors/warnings) and 19 curriculum tests.
One existing Starlette deprecation warning was reported by pytest.

[Browser visual audit](visual-audit.json): 36 production Picture layouts and
text fallback pass across widths 320, 360, 390, 430, 768 and landscape844,
in light and dark themes. The full image frame uses contain fitting, the
phone/tablet URI choice is correct, and live lesson text remains separate.
Representative phone, tablet and landscape screenshots were visually inspected.
The browser harness adapts the native image/cache service; native cache behavior
is tested separately by check-artwork.cjs.

[Native export audit](export-audit.json): Android and iOS source exports pass,
with 174 and 173 bundled assets respectively. Comparing every exported asset's
hash against all 376 selected remote Learn variants confirms zero paintings
were accidentally bundled. Export folders are mobile/.expo/
learn-art-20261020-final-android and learn-art-20261020-final-ios.

This delivers published image assets and source integration. No APK was built
or installed, no OTA/backend deployment was performed, and physical-device
rendering and Sanskrit scholar approval are not claimed.

## Repeatable checks

```powershell
backend/.venv/Scripts/python.exe -X utf8 specs/learn-art-20261020/audit_coverage.py --complete
backend/.venv/Scripts/python.exe -X utf8 specs/learn-art-20261020/deliver.py --verify
backend/.venv/Scripts/python.exe -X utf8 backend/scripts/sync_story_artwork.py --check
backend/.venv/Scripts/python.exe -X utf8 specs/learn-art-20261020/audit_exports.py
```

Do not rerun initial prepare.py against the live manifest. Generation records
contain historical original paths that were deliberately deleted. Future
replacements need a new temporary original, exact text review, versioned WebPs,
public verification, registry synchronization, and original cleanup.
