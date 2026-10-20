# Bhagavad Gītā artwork production

Owner request: generate meaning-based backgrounds for all 700 app verse pages.
Policy: [`../artwork/ARTWORK.md`](../artwork/ARTWORK.md).

## Completed — 2026-10-19

All **700/700** canonical Gita verses are generated with the built-in image
tool, visually reviewed and published. No generation worker remains running.
The registry preserves the existing 18 Isha paintings (718 verse entries total).
`audit.json` verifies all 700 source mappings, selected prompt/revision hashes,
delivery dimensions, local WebP hashes and registry coverage. The live corpus
check found no source or preferred-UID drift.

There are **200 portrait paintings** near 9:16 and **500 historical square
paintings**. New generation switched to portrait after image 504; the opening
three verses and 2.47 were also recomposed for phones. Existing square paintings
remain complete through contain fitting. Final chapter manuscript corrections
18.41, 18.42 and 18.70 remove painted pseudo-writing; their exact edit prompts
and reference hashes are in `revisions/`. All Sanskrit and meaning remain live
app text. The default image opacity remains 48%, with Plain and saved settings.

Selected phone WebPs total **103,858,658 bytes**; tablet WebPs total
**293,896,078 bytes** (**397,754,736 bytes**, about 398 MB combined).
The final account inventory in `storage-after.json` reports **834,363,356 bytes**
across all accessible R2 buckets, all 1,400 selected Gita delivery objects
present, and **zero retained Gita/Isha original objects**. Local Gita original
PNGs also number zero. Every publication verified both public delivery files
before discarding the temporary original and matching tool output. Older
immutable optimized URLs remain valid for older clients. One optimized tablet
reference for the 18.70 edit is retained locally; it is not an original backup.

Validation passed: artwork component/cache/settings checks; TypeScript;
12 browser fitting cases across compact phones, tablets and landscape,
plus 320px large-text/dark inspection; Android/iOS exports in
`mobile/.expo/gita-phone-final`; asset inventory (`exports-check.json`),
retaining Tiro and the owner's bundled priority covers/festivals while bundling
zero verse paintings. Sampled repeated public requests return CDN HIT with
immutable cache headers (`cdn-check.json`). These are source/export/browser
checks, not physical-device validation or a newly built/installed APK.

The retained optimized files are in `results/gita-art-20261016/delivery/`.
Prompts are the frozen base set plus `phone-first-jobs.json` overrides and
selected `revisions/`; `deliveries/` records the exact prompt actually used.
The local gallery is `http://127.0.0.1:8769/`. The phone fixture and screenshots
are `phone-fit-preview.html` and `phone-fit-*.png` in this directory.

- `verses.json`: actual app corpus snapshot, deduplicated as the reader does.
- `generation-jobs.json`: 700 per-verse prompts with Sanskrit, stored meaning,
  neighboring context, chapter guidance, style and single-master composition.
- `chapter-counts.json`: canonical expected counts for all 18 chapters.
- `deliveries/`: completed built-in generations, source paths, checksums, native
  dimensions, exact prompt provenance and review status. A prepared prompt is
  not proof that an image has been generated.
- `results/gita-art-20261016/masters/`: temporary inputs only; empty after delivery.

Generate with the built-in image tool. Never substitute SVG placeholders,
duplicate unrelated artwork, or switch to a paid CLI/API path without the
owner's explicit choice. Save each result immediately using `record.py`, and
skip already completed masters when resuming. The three square opening-verse
illustrations from this chat can be reused with explicit provenance; the later
prepared prompt must not be misrepresented as their original prompt.

One square master per verse; derive 768px phone and up to 1536px tablet WebPs
without upscaling. Inspect chapter contact sheets and mark reviewed deliveries
before app integration. Preserve existing Īśopaniṣad entries when extending the
shared verse registry. Publish to content-hashed R2 URLs, publicly verify them,
and retain the reader's persisted settings and 48% default image opacity.

This is a resumable production set. Report actual generated/reviewed/published
counts; do not describe all 700 as complete based only on this job manifest.

`progress.json` and `deliveries/` record actual progress; `errors/` records
unresolved generation failures. A successful retry removes its error record.
The built-in tool orchestrator can resume with `read_jobs.py`, which omits
already saved masters. Do not generate a second image for an existing delivery.
Do not rerun `prepare.py` or edit the frozen job prompts during production.
The delivery's prompt and checksum must continue to describe the actual call.
`plan_batch.py` and `builtin-batch.js` bound each resumable production run to 32
missing masters with four built-in calls in flight. Run the JavaScript only
inside Codex `functions.exec`, where `tools.image_gen__imagegen` is available;
it is not a standalone Node program or a paid API fallback. Inspect the source,
read it via `exec_command`, and `await eval(result.output)`. Repeat after a run
finishes, consulting actual deliveries. Do not launch overlapping batches.
The read-only local progress view is `python specs/gita-art-20261016/serve_progress.py`
at `http://127.0.0.1:8769/`. It distinguishes pending, generated, reviewed and
publicly verified artwork. It does not run generation or schedule background work.

After visual inspection of a complete chapter's contact sheet:

```powershell
python specs/gita-art-20261016/process.py --contact 1
# Inspect the sheet before marking the chapter reviewed.
python specs/gita-art-20261016/process.py --reviewed 1
python specs/gita-art-20261016/process.py --publish
python specs/gita-art-20261016/audit.py
# Require all 700 generated, reviewed and published at final handoff:
python specs/gita-art-20261016/audit.py --complete
python specs/gita-art-20261016/verify_live_sources.py
python specs/gita-art-20261016/storage_report.py
```

Reviewed Gita deliveries conservatively preserve the full master rectangle.
This prevents portrait/landscape crops from clipping figures near the edges.
The paper area around a contained painting remains the selected reader theme.

Quality corrections use versioned `revisions/KEY-vN.json` prompts and sibling
master filenames. Generate that prompt with the built-in tool, then use
`record.py --key KEY --revision N --source GENERATED_PATH`. The former delivery
is retained in `history/`; the active delivery, thumbnail, contact sheet and
full-resolution preview select the new master. Do not edit the original frozen
prompt to pretend it produced a revised image. Verse 2.47 is an example: its
second painting removes annotation crosses and lettering from the first draft.

## Historical quota stop — 2026-10-17

On October 17, generation reached 463 of 700 selected masters before the built-in
service returned HTTP 429 `usage_limit_reached`. At that historical stop, the
remaining 237 had prepared source jobs but no generated artwork. They were
subsequently completed on October 19. The reported reset was 2026-10-17
13:53:34 UTC / 19:23:34 IST. No generation worker remains running after handoff.
Check `progress.json`, `audit.json` and the actual deliveries before resuming.
Resume with the built-in batch runner; it skips saved masters. Do not switch
to CLI/API generation without the owner's explicit choice.

For a partial chapter, `--contact N` saves both the sheet and a fingerprinted
snapshot. After inspecting it, `--reviewed-sheet N` marks only those exact
masters reviewed; `--exclude KEY,KEY` can withhold rejected pictures. The normal
`--reviewed N` still requires a complete chapter. This prevents publishing an
unseen replacement or a newly arrived image under an earlier review.


## Owner storage update — 2026-10-17

Original PNGs are temporary generation/conversion inputs only. Keep optimized phone and tablet WebPs; after visual review and verified publication, discard the original and its tool-output copy. Do not upload masters to R2 or keep master backups. Historical master paths, hashes, dimensions and prompts remain provenance records, not retained image files. The existing reading URLs and responsive fitting are unchanged. specs/artwork/master-removal-report.json records removal evidence.

The Gita publisher follows this policy automatically for future verses. Contact sheets and full-size gallery previews use the retained tablet WebP after original removal.

Removal verified: 481 R2 originals deleted (1,576,959,414 bytes), 962 reading WebPs retained (277,525,192 bytes). Local originals and matching tool-output copies removed: 974 files / 3,194,155,980 bytes, including superseded drafts. Account storage after removal: 700,135,024 bytes (approximately 700 MB). Gita source/delivery audit and artwork cache/fitting/settings checks pass.


## Phone-first continuation — 2026-10-19

Phones take priority over tablets. The reader uses explicit measured image dimensions and contain fitting with a small paper inset; passing source pixel dimensions as view sizing caused clipping on native phones. Existing illustrations remain usable without regeneration. New pending prompts are in phone-first-jobs.json, loaded through job_policy.py by generation, recording and audit; historical prompts remain unchanged. The 237 pending jobs use a compact central grouping and quiet margins for 320–430px reading. Keep default opacity 48% and independently scrolling live text. The no-master-retention policy still applies.

The owner subsequently requested 9:16 phone artwork and authorized regeneration
where needed. Generation workers drained safely at 504 images, then all 196
remaining jobs changed to genuine portrait compositions. The first portrait,
13.16, returned native 941 × 1672 pixels, was reviewed and published, and its
original was discarded. New portrait phone copies fit within 768 × 1536px;
tablet copies fit within 1536 × 1536px, with no upscaling. Existing delivered
square images stay uncropped. Versioned regeneration is available when the
phone composition needs replacement; do not silently rewrite their provenance.

Phone fitting validation: component-prop and geometry checks pass on Android/iOS
for narrow phones, landscape and tablets; source descriptors contain URI only
and image view sizes are explicit. TypeScript and both native exports pass.
Export inspection finds no bundled remote paintings and retains the Tiro font.
The browser fixture uses actual background component props and the app's real
verse content/font; 12 phone/tablet/landscape cases pass, including complete
paintings and reachable scrolling text. Screenshots also cover 320px large-text
dark mode. No physical-device test or new APK installation is claimed.
