# Story course audio (Sarvam Bulbul → R2 → the lesson pack → the app)

Owner approved the Sarvam spend on 2026-10-20 ("cost is fine, implement everything").
Labels: **run** (measured), **read** (at the source), **estimate**, **not verified**.

## What exists now

| Part | Where | State |
| --- | --- | --- |
| Which strings get a clip, what the voice reads, clip names, deliveries, mp3 length | `backend/app/curriculum/audio.py` | built, 27 tests |
| Renderer: Sarvam → mp3 → R2 → deliveries | `backend/scripts/render_story_audio.py` | built; **run: all 2,874 clips rendered** (see Numbers) |
| Deliveries file | `backend/app/curriculum/content/audio/deliveries.json` | written by the renderer |
| Pack: lesson `audio` (text → url) and card `audio` (urls, reading order) | `pack.py` (`story_audio.attach`) | built; only for delivered clips |
| App: speaker beside Sanskrit lines, tap-to-hear table cells, letter sounds in the mouth map | `mobile/src/story/audio.tsx`, `cards/content.tsx`, `widgets/MouthMap.tsx` | built; browser-run, not on a phone |
| App: the buffering rule (card on screen + 3 ahead + 3 behind) | `story/audioWindow.ts`, `useAudioWindow.ts`, `holdClips` in `services/speech.ts` | built; browser-run with stand-in clips, not on a phone |
| Coverage report | `python -m app.curriculum audio [--missing]` | built |
| Release check | `check --release` warns when a letter or dialogue string has no clip | built |

## How it works

- **A clip is named by what it says and how it was made:** `sha1(rules|NFC text|voice|language|pace|codec)[:16]`.
  Change a sentence and it gets a new name, so a phone never plays old audio for new words; a re-render in another
  voice or pace sits beside the first and the old files simply stop being attached.
- **What the voice reads** (`speakable`): page separators (`+ = → · /`) become a pause, suffix hyphens, ellipses and
  line breaks are dropped. Strings with Roman letters or digits, and bare vowel signs, are not rendered.
- **Which strings** (`card_sources`): story dialogue and quoted verses, teach terms, rows, steps, examples and their
  words, summary lines, reading sentences and words, revision examples, table cells, mouth-map letters. **Practice
  cards have none:** hearing an option would give the answer away.
- **Voice:** Bulbul v3, `sa-IN`, speaker `aditya`, pace 1.0, 22,050 Hz, mp3 (the constants at the top of `audio.py`).
  One voice for every character. Nobody has listened to the clips (see "Listen first").
- **Storage:** R2 bucket `sanskritam`, key `audio/learn/<hash>.mp3`, public at `https://cdn.vedicvalor.com/audio/learn/<hash>.mp3`,
  `Cache-Control: public, max-age=31536000, immutable` (run: set by `R2Storage.store`, seen on a fetched clip).
- **Order of work:** letters, dialogue, sentences, words, table cells, so a run that stops early has done the most
  useful clips. Rate: 2.1 s between requests (Starter allows 30 a minute on bulbul:v3, read at docs.sarvam.ai), a 429
  or 5xx is retried after 5, 15, 30, 60, 120 s, and a limit that outlasts them stops the run; rerun to continue.
- **In the app:** with a lesson open, each Sanskrit line that has a clip shows a small speaker; tap to play, tap again
  to stop; moving to another card stops it. In a table, a cell with a clip is tap-to-hear ("Tap a form to hear it.").
  Choosing a letter on the mouth map sounds it. The clips of the card on screen and of three cards each way are
  buffered, so a swipe never waits on the network. No clip, no button.

## Numbers

Price read at sarvam.ai/api-pricing on 2026-10-20: Bulbul v3 ₹3.00 per 1,000 characters pay-as-you-go. The run
spoke about 29,400 characters, so about **₹88** at that price (the owner's Startup Program credits may have covered it).

Run 2026-10-20 (Bulbul v3, `sa-IN`, `aditya`, pace 1.0, mp3 22,050 Hz): **2,874 of 2,874 strings have a clip, none failed.**

| Tier | Clips | Median length | Longest |
| --- | ---: | ---: | ---: |
| letter | 99 | 0.65 s | 1.9 s |
| dialogue | 114 | 2.4 s | 17.0 s |
| sentence | 829 | 2.0 s | 10.3 s |
| word | 691 | 1.1 s | 2.8 s |
| cell | 1,141 | 1.1 s | 10.2 s |
| **all** | **2,874** | | **73 min of audio, 70.4 MB** |

Checked (run): every one of the 2,874 URLs returns 200 `audio/mpeg` from `cdn.vedicvalor.com` with the byte count the
renderer recorded and `Cache-Control: public, max-age=31536000, immutable`. In the built pack, 189 of 238 lessons carry
`audio` (4,050 text → clip entries) and 684 cards carry a clip list; every key is in the form the app looks up
(NFC, one space), and every card clip is in its lesson's map. `check --engine --release`: 0 errors, 0 warnings.
Full backend suite: 2,165 passed, 16 skipped.

How the run went: the first background run was killed after about 20 minutes with no error (the tool stops
background jobs when the turn ends), a second detached run died silently after about 16 minutes, and the rest was done
in foreground blocks of about 9 minutes. The renderer saves every 20 clips and skips what exists, so a stop costs
nothing but time. Requests are now paced between starts (2.2 s, 27 a minute, no 429 in the whole run).

## Listen first

Run on the owner's key: `sa-IN` answered 200 on 2026-10-20 but answered 400 on 2026-10-08, and the Sarvam docs
page still lists no Sanskrit (read), so treat it as a beta that can change. Bulbul is not a Sanskrit-native voice: a
lone letter may be read as its name, and Sanskrit stress and metre are not its strength. **No one has listened to the
clips.** Samples: `results/story_audio_samples/clips/` (19 clips across the tiers, git-ignored) and any clip on the CDN. To change voice, speaker or
pace, edit the constants in `audio.py` and run the renderer again (about ₹88).

## Extending

- New or changed Sanskrit: run `python -m app.curriculum audio` (what is missing, what is stale), then
  `python -m scripts.render_story_audio --live` (it renders only what has no clip).
- A sample: `--tier letter --limit 20`. A different pace between requests: `--pace 3`.
- Practice-card audio, widget readouts beyond the mouth map (form explorer, sandhi mixer, word factory) and the
  per-character voices are not built.
