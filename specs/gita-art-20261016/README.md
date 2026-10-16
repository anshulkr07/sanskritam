# Bhagavad Gītā artwork production

Owner request: generate meaning-based backgrounds for all 700 app verse pages.
Policy: [`../artwork/ARTWORK.md`](../artwork/ARTWORK.md).

- `verses.json`: actual app corpus snapshot, deduplicated as the reader does.
- `generation-jobs.json`: 700 per-verse prompts with Sanskrit, stored meaning,
  neighboring context, chapter guidance, style and single-master composition.
- `chapter-counts.json`: canonical expected counts for all 18 chapters.
- `deliveries/`: completed built-in generations, source paths, checksums, native
  dimensions, exact prompt provenance and review status. A prepared prompt is
  not proof that an image has been generated.
- `results/gita-art-20261016/masters/`: original PNG masters, outside the APK.

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
