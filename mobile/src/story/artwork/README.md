# Learn story paintings

28 paintings: all 23 canonical images requested by the existing prologue, bible and Vowels content, plus five source-grounded 9:16 act backdrops. Generated with the built-in image_gen tool. Final prompts, edit history and historical original paths are in jobs.json; hashes/dimensions and delivery provenance are in deliveries.json. The complete paintings are contained without cropping.

56 optimized files are retained in delivery/: phone within 768×1536 at WebP q80; tablet within 1536×1536 at q88. No upscale. Total derivative bytes: 12,519,002. All variants use immutable content-hashed public R2 keys under learn/. Both public variants passed status, bytes/hash, dimensions, image MIME and repeat-request CDN HIT verification before source PNG deletion. audit.json is the repeatable post-delivery audit.

Blind OCR never receives the expected strings. It transcribes all lettering and flags pseudo script, then compares actual NFC text with the canonical list, ignoring only line wrapping/whitespace. All 28 pass. Corrections removed unintended lettering and fixed the independent vocalic L glyph using a reference rendered in the app’s Tiro font. See ocr/ for model, digest, transcription and verdict.

The app consumes manifest.json as a canonical-ID delivery overlay. backend-deliveries.json is ready for a separate backend import; no backend file was changed in this task. Current backend release-check completion is not claimed.

Recheck local and public files after temporary originals have been discarded:

    backend/.venv/Scripts/python.exe -X utf8 mobile/src/story/artwork/deliver.py --verify

Do not rerun generation preparation against historical original paths. For a deliberate replacement, generate a versioned temporary original with the built-in tool, retain the previous prompt/hash metadata, verify new derivatives and public URLs, then discard the temporary PNG.

Reviewed: all paintings in contact-sheet.jpg and in-app browser previews. Native-device artwork rendering and scholar approval remain unverified.
