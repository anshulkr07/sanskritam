# Approved Ramapathe music preset

This folder saves the voice and musical performance you approved, the exact original/accepted requests, reference song IDs, seed, lyrics, and local audio backups.

`reference_audio/approved_complete.mp3` is the approved complete recording. `approved_complete.wav` is the lossless assembly master; `original_preview.mp3` is the earlier preview used to guide singing and music. SHA-256 checksums are in `audio_checksums.json`. These audio backups are local project files and are excluded from Git; back up this entire folder to preserve them on another computer.

## Reuse for a new song

Create a UTF-8 text file containing only the new lyrics, one complete lyric line per line. The script uses the opening two lines as a hook, middle lines as verse pairs, and the last line as a closing hook. It uses the saved original verse/hook recordings as musical references, with high context adherence and extra-high conditioning.

From the project root, prepare a request without spending credits:

```powershell
.\backend\.venv\Scripts\python.exe backend\scripts\render_music_from_preset.py --lyrics path\to\new_lyrics.txt --output backend\results\next_song
```

Generate when ready:

```powershell
.\backend\.venv\Scripts\python.exe backend\scripts\render_music_from_preset.py --lyrics path\to\new_lyrics.txt --output backend\results\next_song --generate
```

Credentials are read from `.env`; no secrets are saved in this preset. Existing output audio is preserved, and the script never automatically retries paid calls. The saved provider reference ID is reused by default. If it is unavailable later, explicitly add `--upload-reference` to upload the backed-up original MP3 and save a replacement ID. Uploading and generating can incur provider charges. No API calls were made while creating this preset.

## What is saved, and what it means

- Model: Eleven Music `music_v2_5`.
- Successful ending-edit seed: `20261013`. The original preview used a free-text prompt with no supplied seed.
- Voice: warm male singing, stored in the actual audio reference. No selectable/cloned voice ID was created.
- Music: original performance stored in reference audio; accepted styles describe acoustic guitar arpeggios, soft shaker and peaceful melodic singing. The original prompt requested 92 BPM, tabla, hip-hop drums, bass, plucked strings and harmonium; a prompt describes intent, not a measurement of the resulting instruments or tempo.
- Context adherence: `high`; condition strength: `xhigh`.
- Exact accepted edit request: `accepted_edit_request.json`; original request: `original_request.json`.
- No numeric pitch, emotion, stability or similarity settings were used.

The actual recording is the strongest reference. Reusing the seed/settings/reference aims for a similar voice and musical style; it does not guarantee an identical voice, melody, pronunciation or output with new lyrics. No separate vocal stem or instrumental stem was extracted.
