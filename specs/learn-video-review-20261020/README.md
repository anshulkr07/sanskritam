# Course video review

Prepared 20 October 2026, Asia/Calcutta. The review workbook has all 44 stable
unit IDs, 41 distinct video suggestions and additional alternatives.
The owner's preferred publisher is **The Sanskrit Channel**
(https://www.youtube.com/c/TheSanskritChannel). Its public catalog was searched
for relevant lessons: 1,041 video records across 35 catalog pages, plus targeted
topic searches. The shortlist uses that channel for 12 units and topic-specific
alternatives for 32. Partial matches are identified, including pronouns versus
number inflection and individual conjunct sounds. No suitable match was
identified for some topics; that does not establish that the channel has never
covered them. Four inspected course videos required membership and were
excluded. The two metre workshops need short clip selection.

All 41 selected links returned YouTube oEmbed title and publisher metadata.
All 10 distinct preferred-channel selections also returned publicly playable,
embeddable player metadata. The 42 earlier selections remain alternatives or
research provenance; metadata returned for all 52 distinct current/prior links.
This verifies metadata availability, not playback, captions, spoken language,
instructional accuracy, age suitability or exact clip boundaries. Search and
publisher descriptions informed the editorial choices. Partial coverage and
weaker matches are identified in each row. On 20 October 2026 the owner explicitly
approved all 44 current Chosen selections. They are now imported into the local
course. See `approval.json` for the exact approved rows. Blank clip bounds were
preserved, so full videos play, including the two long workshops. This sign-off
does not establish native phone playback. No deployment was performed.
The post-approval public player metadata check returned `OK` with embedding
allowed for all 41 distinct videos (`playability-after-approval.json`).

## Review once

Open the live sheet beside the chat or `outputs/learn-video-review-20261020/videos.xlsx`.
The amber cells are editable. Watch the suggested videos, check teaching
language, pronunciation, examples, captions and playback, and edit **Chosen
URL**, **Chosen title** and **Chosen channel** to replace any suggestion. Use
whole seconds for optional clip boundaries. Blank times play the full video.
In particular, the Kathāsaritsāgara suggestion is background in English, not
the Sanskrit close reading the unit needs; replacement is preferred.

All current decisions are **Approved** following the owner's sign-off. For
future changes, set **Decision** to **Approved** for the final choices. Pending, Replace and
Reject rows are excluded. A row marked Replace is still excluded even if its
URL has been edited. Chosen fields remain independent of the original
suggestion. Initial suggestions started Pending. The status column checks required
fields; the importer additionally validates YouTube IDs and clip bounds.

Export the reviewed sheet to XLSX or UTF-8 CSV. The checked-in/exported XLSX
is a snapshot, not a live connection to the app or to later sheet edits.
Re-export the live sheet after edits.

## Import after review

From `backend/`:

```powershell
.venv/Scripts/python.exe -X utf8 scripts/import_course_videos.py ../outputs/learn-video-review-20261020/videos.xlsx
.venv/Scripts/python.exe -X utf8 scripts/import_course_videos.py reviewed.xlsx --apply
.venv/Scripts/python.exe -X utf8 -m app.curriculum check --engine
```

The first command is a dry run. Only explicit Approved choices change unit
YAML, keyed by Unit ID rather than worksheet order. Unknown or duplicated IDs,
invalid URLs, formula inputs, negative/fractional times, invalid end bounds and
unconfirmed publisher placeholders fail before writing. Reimporting unchanged
choices is idempotent. Rejected rows do not delete an existing unit video.
No database or deployment is performed by this tool.

After backend deployment, refresh the course index (reopen Learn or foreground
the app). Unit videos use the existing optional, no-XP panel after completion
of a unit. A changed video changes the index version. Verify playback on a
phone after importing the final selections. Watching is never rewarded.

## Research and verification files

- `candidates.json`: suggestions, fit notes, alternatives and search method.
- `metadata.json`: actual publisher names/titles returned on the research date.
- `verify_metadata.py`: repeat the metadata check without downloading media.
- `unit-titles.json`: source unit titles used in the workbook.
- `preferred-channel-catalog.json`: public catalog title index, not downloaded media.
- `preferred-channel-details.json`: publisher descriptions, durations and public
  player availability for 17 inspected candidates, including membership limits.
- `prefer_channel.py`: repeatable channel-preference selection and review notes.
- `approval.json`: owner-approved chosen fields imported into all 44 units.
- `approval-validation.json`: content-hash, workbook/import parity and final check results.

The workbook was visually checked and its approval formula was exercised with
incomplete fields, completed fields and restoration to Pending. All rows in
the exported XLSX were read by the importer; the initial dry run changed zero
units. After approval all 44 unit videos were imported, and reimporting the
same workbook changes zero units. Importer tests cover approval, replacement, invalid input, stable IDs,
preservation of other content and repeat imports. These do not substitute for
manual video viewing or native device playback.
